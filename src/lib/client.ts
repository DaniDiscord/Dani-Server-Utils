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

import { AutoSlowModel } from "models/AutoSlow";
import { Command } from "types/command";
import { CounterModel } from "models/Counter";
import { InteractionCommand } from "classes/CustomInteraction";
import { NameModel } from "../models/Name";
import _ from "lodash";
/* eslint-disable @typescript-eslint/no-var-requires */
import { promisify } from "util";
import { readdir } from "fs/promises";

export class CustomClient extends Client {
  constructor(options: ClientOptions) {
    super(options);

    this.embColor = "ea05ec";
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
      console.log(e);

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
    targetMsgsPerSec: number
  ): Promise<void> {
    const autoSlow = new AutoSlowManager(min, max, targetMsgsPerSec);
    AutoSlowCache.addAutoSlow(channelId, autoSlow);
    await AutoSlowModel.findOneAndUpdate(
      {
        channelId: channelId,
      },
      {
        min: min,
        max: max,
        targetMsgsPerSec: targetMsgsPerSec,
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );
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
        autoSlowConfig.targetMsgsPerSec
      );
      AutoSlowCache.addAutoSlow(channelId, autoSlow);
    }
    return autoSlow;
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
      commands &&
      commands.filter((c) => !this.slashCommands.has(`${c.type ?? 1}-${c.name}`)).size > 0
    ) {
      log.debug("Command sync", {
        action: "Unload",
        message: `Unloading a total of ${commands.filter(
          (c) => !this.slashCommands.has(c.name)
        )} existing slash commands`,
      });
      for (const command of commands
        .filter((c) => !this.slashCommands.has(c.name))
        .values()) {
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
