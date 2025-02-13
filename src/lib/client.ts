import {
  ApplicationCommandType,
  Client,
  ClientOptions,
  Collection,
  EmbedBuilder,
  GuildMember,
  Message,
} from "discord.js";
import { AutoSlowCache, AutoSlowManager } from "./autoslow";
import { join, resolve } from "path";

import { AutoPingModel } from "models/AutoPing";
import { AutoSlowModel } from "models/AutoSlow";
import { Command } from "types/command";
import { CommandCooldownModel } from "models/CommandCooldown";
import { CounterModel } from "models/Counter";
import { EmojiSuggestions } from "./emojiSuggestions";
import { EmojiSuggestionsModel } from "models/EmojiSuggestions";
import { IAutoPing } from "types/mongodb";
import { InteractionCommand } from "classes/CustomInteraction";
import { NameModel } from "../models/Name";
import { TimeoutHandler } from "classes/TimeoutHandler";
import _ from "lodash";
/* eslint-disable @typescript-eslint/no-var-requires */
import { promisify } from "util";
import { readdir } from "fs/promises";

export class CustomClient extends Client {
  emojiEventCache: Map<string, EmojiSuggestions>;

  unloadCommands = false;
  dirtyCooldownHandler: TimeoutHandler;

  constructor(options: ClientOptions) {
    super(options);

    this.emojiEventCache = new Map();
    this.embColor = "ea05ec";
    this.dirtyCooldownHandler = new TimeoutHandler();
    // `await client.wait(1000);` to "pause" for 1 second.

    // These 2 process methods will catch exceptions and give *more details* about the error and stack trace.
    process.on("uncaughtException", (err) => {
      if (err.stack) {
        const errorMsg = err.stack.replace(new RegExp(`${__dirname}/`, "g"), "./");
        console.error("Uncaught Exception: ", errorMsg);
      }

      // Always best practice to let the code crash on uncaught exceptions.
      // Because you should be catching them anyway.
      process.exit(1);
    });

    process.on("unhandledRejection", (err) => {
      console.error("Uncaught Promise Error: ", err);
    });

    this.slashCommands = new Collection();

    this.once("ready", async () => {
      this.loadSlashCommands();
    });
  }

  errEmb(errnum = 0, extra?: string): EmbedBuilder {
    let out: EmbedBuilder;

    switch (errnum) {
      case 0:
        out = new EmbedBuilder()
          .setTitle("Error")
          .setColor("Red")
          .setDescription(`${extra ?? "Unknown error"}`);
        break;
      case 1:
        out = new EmbedBuilder()
          .setTitle("Error")
          .setColor("Red")
          .setDescription(`Not given enough arguments${extra ? `\n${extra}` : ""}`);
        break;
      case 2:
        out = new EmbedBuilder()
          .setTitle("Error")
          .setColor("Red")
          .setDescription(`Argument invalid${extra ? `\n${extra}` : ""}`);
        break;
      default:
        out = new EmbedBuilder()
          .setTitle("Error")
          .setColor("Red")
          .setDescription("Base level error handler");
        break;
    }

    return out;
  }

  permlevel(message?: Message, member?: GuildMember): number {
    let permlvl = 0;

    if (!member && !message) return 0;

    // let log = message.author.id == '405109496143282187'
    if (member) {
      const settings = this.settings.get(member.guild.id);
      if (settings) member.settings = settings;
    }

    const permOrder = this.config.permLevels
      .slice(0)
      .sort((p, c) => (p.level < c.level ? 1 : -1));

    while (permOrder.length > 0) {
      const currentLevel = permOrder.shift();

      if (currentLevel === undefined) break;

      if ((message?.guild || member?.guild) && currentLevel.guildOnly) {
        continue;
      }

      if (currentLevel.check(message, member)) {
        permlvl = currentLevel.level;
        break;
      }
    }
    return permlvl;
  }

  gradient(start_color: string, end_color: string, steps = 10): string[] {
    // strip the leading # if it's there
    start_color = start_color.replace(/^\s*#|\s*$/g, "");
    end_color = end_color.replace(/^\s*#|\s*$/g, "");

    // convert 3 char codes --> 6, e.g. `E0F` --> `EE00FF`
    if (start_color.length == 3) {
      start_color = start_color.replace(/(.)/g, "$1$1");
    }

    if (end_color.length == 3) {
      end_color = end_color.replace(/(.)/g, "$1$1");
    }

    // get colors
    const start_red = parseInt(start_color.substr(0, 2), 16);
    const start_green = parseInt(start_color.substr(2, 2), 16);
    const start_blue = parseInt(start_color.substr(4, 2), 16);

    const end_red = parseInt(end_color.substr(0, 2), 16);
    const end_green = parseInt(end_color.substr(2, 2), 16);
    const end_blue = parseInt(end_color.substr(4, 2), 16);

    // calculate new color
    const diff_red = end_red - start_red;
    const diff_green = end_green - start_green;
    const diff_blue = end_blue - start_blue;

    const p = 1 / (steps - 1);
    const diff = [`#${start_color}`];

    for (let i = 0; i < steps - 1; i++) {
      const d = [
        (diff_red * p * (i + 1) + start_red).toString(16).split(".")[0],
        (diff_green * p * (i + 1) + start_green).toString(16).split(".")[0],
        (diff_blue * p * (i + 1) + start_blue).toString(16).split(".")[0],
      ];

      diff.push(`#${d.map((v) => `${v.length > 1 ? `${v}` : "0" + v}`).join("")}`);
    }

    return diff;
  }

  /*
    COMMAND LOAD AND UNLOAD
  */
  loadCommand(
    category: string,
    commandName: string
  ): { err: string; res?: undefined } | { res: boolean; err?: undefined } {
    try {
      const req = require(join(__dirname, "..", "commands", category, commandName));
      const props: Command = req.default;

      if (props.init) {
        props.init(this);
      }

      if (category) {
        props.help.category = category;
      }

      this.commands.set(props.help.name, props);

      props.conf.aliases.forEach((alias) => {
        this.aliases.set(alias, props.help.name);
      });

      return {
        res: true,
      };
    } catch (e) {
      console.error(e);

      return {
        err: `Unable to load command ${commandName} in ${category}: ${e}`,
      };
    }
  }

  async setMemberName(member: GuildMember, newName: string): Promise<void> {
    const oldName = member.nickname ?? member.user.username;
    await this.setNameInMemory(member.id, member.guild.id, newName);
    await member.setNickname(newName).catch(async (e) => {
      console.error(e);
      await this.setNameInMemory(member.id, member.guild.id, oldName);
      return;
    });
  }

  async getNameFromMemory(userId: string, guildId: string): Promise<string> {
    const res = await NameModel.findOne({
      userId: userId,
      guildId: guildId,
    });
    if (res === null) {
      return "";
    }
    return res.name;
  }

  async setNameInMemory(userId: string, guildId: string, name: string): Promise<void> {
    const filter = {
      userId: userId,
      guildId: guildId,
    };
    await NameModel.findOneAndUpdate(
      filter,
      {
        name: name,
      },
      {
        upsert: true,
      }
    );
  }

  async getNextCounter(id: string): Promise<number> {
    const res = await CounterModel.findOneAndUpdate(
      {
        _id: id,
      },
      {
        $inc: {
          index: 1,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );
    return res.index;
  }

  async addAutoSlow(
    channelId: string,
    min: number,
    max: number,
    targetMsgsPerSec: number,
    minChange: number,
    minChangeRate: number,
    enabled: boolean
  ): Promise<AutoSlowManager> {
    const autoSlow = new AutoSlowManager(
      min,
      max,
      targetMsgsPerSec,
      minChangeRate,
      minChange,
      enabled
    );
    AutoSlowCache.addAutoSlow(channelId, autoSlow);
    await AutoSlowModel.findOneAndUpdate(
      {
        channelId: channelId,
      },
      {
        min: min,
        max: max,
        targetMsgsPerSec: targetMsgsPerSec,
        minChange: minChange,
        minChangeRate: minChangeRate,
        enabled: enabled,
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );
    return autoSlow;
  }

  async removeAutoSlow(channelId: string): Promise<void> {
    AutoSlowCache.removeAutoSlow(channelId);
    await AutoSlowModel.deleteOne({ channelId: channelId });
  }

  async getAutoSlow(channelId: string): Promise<AutoSlowManager | null> {
    let autoSlow = AutoSlowCache.getAutoSlow(channelId);
    if (autoSlow === null) {
      const autoSlowConfig = await AutoSlowModel.findOne({ channelId: channelId });
      if (autoSlowConfig === null) {
        return null;
      }
      autoSlow = new AutoSlowManager(
        autoSlowConfig.min,
        autoSlowConfig.max,
        autoSlowConfig.targetMsgsPerSec,
        autoSlowConfig.minChangeRate,
        autoSlowConfig.minChange,
        autoSlowConfig.enabled
      );
      AutoSlowCache.addAutoSlow(channelId, autoSlow);
    }
    return autoSlow;
  }

  async setEmojiSuggestions(config: EmojiSuggestions): Promise<void> {
    this.emojiEventCache.set(config.guildId, config);
    const filter = {
      guildId: config.guildId,
    };
    await EmojiSuggestionsModel.findOneAndUpdate(filter, config, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    });
  }

  async getEmojiSuggestions(guildId: string): Promise<EmojiSuggestions | null> {
    const cacheValue = this.emojiEventCache.get(guildId);
    if (cacheValue !== undefined) {
      return cacheValue;
    }
    const dbValue = await EmojiSuggestionsModel.findOne({ guildId: guildId });
    if (dbValue !== null) {
      this.emojiEventCache.set(guildId, dbValue);
    }
    return dbValue;
  }

  async removeEmojiSuggestions(guildId: string): Promise<EmojiSuggestions | null> {
    this.emojiEventCache.delete(guildId);
    return await EmojiSuggestionsModel.findOneAndDelete({ guildId: guildId });
  }

  async registerCommandUsage(
    guildId: string,
    commandId: string,
    userId: string
  ): Promise<void> {
    const filter = { guildId: guildId, commandId: commandId, userId: userId };
    await CommandCooldownModel.findOneAndUpdate(
      filter,
      {
        guildId: guildId,
        commandId: commandId,
        userId: userId,
        lastUse: Date.now(),
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }

  async banFromCommand(
    guildId: string,
    commandId: string,
    userId: string,
    reason: string
  ): Promise<void> {
    const filter = { guildId: guildId, commandId: commandId, userId: userId };
    await CommandCooldownModel.findOneAndUpdate(
      filter,
      {
        guildId: guildId,
        commandId: commandId,
        userId: userId,
        banned: true,
        reason: reason,
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }

  async unbanFromCommand(
    guildId: string,
    commandId: string,
    userId: string
  ): Promise<void> {
    const filter = { guildId: guildId, commandId: commandId, userId: userId };
    await CommandCooldownModel.findOneAndUpdate(
      filter,
      {
        banned: false,
        reason: undefined,
      },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }

  async banReason(
    guildId: string,
    commandId: string,
    userId: string
  ): Promise<string | undefined> {
    const filter = { guildId: guildId, commandId: commandId, userId: userId };
    const command = await CommandCooldownModel.findOne(filter);
    if (command === null || !command.banned) {
      return undefined;
    }
    return command.reason;
  }

  async getLastCommandUse(
    guildId: string,
    commandId: string,
    userId: string
  ): Promise<number | null> {
    const filter = { guildId: guildId, commandId: commandId, userId: userId };
    const command = await CommandCooldownModel.findOne(filter);
    return command?.lastUse ?? null;
  }

  async addAutoPing(
    guildId: string,
    roleId: string,
    forumId: string,
    tag: string,
    targetChannelId: string
  ): Promise<void> {
    const value = {
      guildId: guildId,
      roleId: roleId,
      forumId: forumId,
      tag: tag,
      targetChannelId: targetChannelId,
    };
    await AutoPingModel.replaceOne(value, value, { upsert: true });
  }

  async getAutoPing(guildId: string, forumId: string): Promise<IAutoPing[]> {
    return await AutoPingModel.find({
      guildId: guildId,
      forumId: forumId,
    });
  }

  async removeAutoPings(
    guildId: string,
    roleId: string | undefined,
    forumId: string | undefined,
    tag: string | undefined,
    targetChannelId: string | undefined
  ): Promise<void> {
    type Filter = { [key: string]: string };
    const filter: Filter = {};
    filter.guildId = guildId;
    if (roleId) filter.roleId = roleId;
    if (forumId) filter.forumId = forumId;
    if (tag) filter.tag = tag;
    if (targetChannelId) filter.targetChannelId = targetChannelId;
    await AutoPingModel.deleteMany(filter);
  }

  async getAllAutoPing(guildId: string): Promise<IAutoPing[]> {
    return await AutoPingModel.find({
      guildId: guildId,
    });
  }

  private async loadSlashCommands() {
    const folders = await readdir(resolve(__dirname, "..", "interactions"));
    const commands = await this.application?.commands.fetch();
    let loaded = 0;
    let total = 0;
    for (const folder of folders) {
      const files = await readdir(resolve(__dirname, "..", "interactions", folder));
      for (const file of files) {
        try {
          // logger.info(`Loading slash command ${file}`);
          const path = resolve(__dirname, "..", "interactions", folder, file);
          if (!path.endsWith("ts") && !path.endsWith("js")) continue;
          const CustomInteractionClass = (await import(path))
            .default as typeof InteractionCommand;
          if (!CustomInteractionClass) continue;
          total++;
          const custInteraction = new CustomInteractionClass(this);
          const opts = custInteraction.options;

          // const existing = this.application?.commands.cache.find(
          //   (o) => o.type === ApplicationCommandType.ChatInput && o.name === opts.name
          // );
          // if (existing) {
          //   console.log(
          //     "(opts as ChatInputApplicationCommandData).options",
          //     (opts as ChatInputApplicationCommandData).options
          //   );
          //   console.log("existing.options", existing.options);
          //   if (
          //     !_.isEqual(
          //       (opts as ChatInputApplicationCommandData).options,
          //       existing.options
          //     )
          //   ) {
          //     console.log("edited cmd");
          //     await this.application?.commands.edit(existing.id, opts);
          //   }
          // } else {
          //   await this.application?.commands.create(opts).catch((e) => {
          //     console.error(e);
          //   });
          // }
          await this.application?.commands.create(opts).catch((e) => {
            console.error(e);
          });
          if (
            custInteraction.autocompleteOptions &&
            opts.type === ApplicationCommandType.ChatInput
          ) {
            this.autocompleteOptions.set(opts.name, custInteraction.autocompleteOptions);
          }

          this.slashCommands.set(`${opts.type ?? 1}-${opts.name}`, custInteraction);
          loaded++;
        } catch (error) {
          console.error(error);
        }
      }
    }

    if (
      this.unloadCommands &&
      commands &&
      commands.filter((c) => !this.slashCommands.has(`${c.type ?? 1}-${c.name}`)).size > 0
    ) {
      const slashCommands = commands.filter(
        (c) => !this.slashCommands.has(`${c.type ?? 1}-${c.name}`)
      );
      log.debug("Command sync", {
        action: "Unload",
        message: `Unloading a total of ${
          Array.from(slashCommands).length
        } existing slash commands`,
      });
      for (const command of slashCommands.values()) {
        await command.delete();
      }
    }
    log.debug("Command sync", {
      action: "Load",
      message: `Loaded a total of ${loaded}/${total} slash commands`,
    });
  }

  wait = promisify(setTimeout);
}
