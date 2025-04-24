import { DsuClient } from "lib/core/DsuClient";
import { ClientUtilities } from "lib/core/ClientUtilities";
import { Mutex } from "async-mutex";
import {
  ChannelType,
  EmbedBuilder,
  Message,
  MessageReaction,
  User,
} from "discord.js";
import { EmojiSuggestionsModel } from "models/EmojiSuggestions";
import { CommandCooldownModel } from "models/CommandCooldown";
import axios from "axios";
import { emojiSuffix } from "../interactions/slashCommands/emojiSuggest";
import { EMOJI_APPROVE, EMOJI_DENY } from "types/constants/emoji";
import { EmojiUsageModel } from "models/EmojiUsage";
export class SynchronizeById {
  private lock: Mutex;
  private lockMap: Map<string, Mutex>;

  constructor() {
    this.lock = new Mutex();
    this.lockMap = new Map();
  }
  async doSynchronized(id: string, fn: () => Promise<void>): Promise<void> {
    const release = await this.lock.acquire();
    let lock = this.lockMap.get(id);
    if (lock === undefined) {
      lock = new Mutex();
      this.lockMap.set(id, lock);
    }
    release();
    if (lock.isLocked()) {
      return;
    }
    const mapRelease = await lock.acquire();

    // If we fail here, we don't want to deadlock
    try {
      await fn();
    } catch (error) {
      console.log(error);
    } finally {
      this.lockMap.delete(id);
      mapRelease();
    }
  }
}

export const approveSync = new SynchronizeById();

export enum SuggestionAction {
  Approve,
  Deny,
  Ban,
}

export class EmojiSuggestions {
  guildId: string;
  sourceId: string;
  voteId: string;
  threshold: number;
  bias: number;
  emojiCap: number;
  cooldown: number;

  constructor(
    guildId: string,
    sourceId: string,
    voteId: string,
    threshold: number,
    bias: number,
    emojiCap: number,
    cooldown: number
  ) {
    if (sourceId === voteId) {
      throw new Error("Source channel cannot be the same as the Vote channel ");
    }
    if (threshold <= 0 || threshold >= 1) {
      throw new Error("Selection threshold should be > 0 and < 1");
    }
    if (bias <= 0) {
      throw new Error("Bias should be positive");
    }
    if (cooldown < 0) {
      throw new Error("Cooldown should be postiive");
    }
    this.guildId = guildId;
    this.sourceId = sourceId;
    this.voteId = voteId;
    this.threshold = threshold;
    this.bias = bias;
    this.emojiCap = emojiCap;
    this.cooldown = cooldown;
  }
}
const reactionSync = new SynchronizeById();

export class EmojiSuggestionsUtility extends ClientUtilities {
  constructor(client: DsuClient) {
    super(client);
  }

  // TODO

  generateEmojiEmbed(
    actionType: SuggestionAction,
    userId: string,
    emojiUrl: string,
    creatorId: string
  ) {
    let action;
    switch (actionType) {
      case SuggestionAction.Approve:
        action = `<@${creatorId}>'s emoji approved`;
        break;
      case SuggestionAction.Deny:
        action = `<@${creatorId}>'s emoji denied`;
        break;
      case SuggestionAction.Ban:
        action = `<@${creatorId}> banned from suggestions`;
        break;
    }

    const time = Math.floor(Date.now() / 1000);
    const embed = new EmbedBuilder()
      .addFields([
        { name: "Reviewed", value: `${action} by <@${userId}>` },
        { name: "Time", value: `<t:${time}:f>` },
      ])
      .setThumbnail(emojiUrl);
    return embed;
  }

  // async onInteraction(interaction: ButtonInteraction) {
  //   const guildId = interaction.guildId;

  //   if (!guildId) {
  //     return;
  //   }

  //   const emojiSuggestionsConfig = await this.getEmojiSuggestions(guildId);

  //   if (!emojiSuggestionsConfig) return;
  // }

  async getEmojiSuggestions(guildId: string) {
    const cacheValue = this.client.emojiEventCache.get(guildId);
    if (cacheValue !== undefined) {
      return cacheValue;
    }
    const dbValue = await EmojiSuggestionsModel.findOne({ guildId });
    if (dbValue) {
      this.client.emojiEventCache.set(guildId, dbValue);
    }
    return dbValue;
  }

  async banFromSuggestion(
    guildId: string,
    commandId: string,
    userId: string,
    reason: string
  ) {
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

  async unbanFromSuggestion(
    guildId: string,
    commandId: string,
    userId: string
  ) {
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

  async setEmojiSuggestions(config: EmojiSuggestions): Promise<void> {
    this.client.emojiEventCache.set(config.guildId, config);
    const filter = {
      guildId: config.guildId,
    };
    await EmojiSuggestionsModel.findOneAndUpdate(filter, config, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    });
  }

  async removeEmojiSuggestions(
    guildId: string
  ): Promise<EmojiSuggestions | null> {
    this.client.emojiEventCache.delete(guildId);
    return await EmojiSuggestionsModel.findOneAndDelete({ guildId: guildId });
  }

  async getBanReason(guildId: string, commandId: string, userId: string) {
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

  async onReaction(reaction: MessageReaction, user: User): Promise<void> {
    if (user.bot) {
      return;
    }
    const message = reaction.message;
    const guildId = message.guildId;
    if (guildId === null) {
      return;
    }
    const emojiSuggestionsConfig = await this.getEmojiSuggestions(guildId);
    if (emojiSuggestionsConfig === null) {
      return;
    }
    const voteChannelId = emojiSuggestionsConfig.voteId;
    const threshold = emojiSuggestionsConfig.threshold;
    const bias = emojiSuggestionsConfig.bias;

    const guild = message.guild;
    if (guild === null) {
      return;
    }
    const emojiLimitFull =
      guild.emojis.cache.size >= emojiSuggestionsConfig.emojiCap;
    if (message.channelId === voteChannelId && !emojiLimitFull) {
      if (reaction.partial) {
        await reaction.fetch();
      }
      let thumbsUp = message.reactions.cache.get(EMOJI_APPROVE)?.count ?? 1;
      let thumbsDown = message.reactions.cache.get(EMOJI_DENY)?.count ?? 1;

      // The bot already has 1 reaction for each.
      thumbsUp -= 1;
      thumbsDown -= 1;

      const denom = thumbsUp + thumbsDown + bias;
      const pass = thumbsUp / denom > threshold;
      const fail = thumbsDown / denom > threshold;
      await reactionSync.doSynchronized(message.id, async () => {
        if (fail) {
          message.reactions.removeAll();
          await message.react("😔");
        }
        if (pass) {
          // Let the user now their emoji passed the vote
          await message.reactions.removeAll();
          await message.react("✨");

          const emojiName = message.content?.split(" ")[0];
          const attachment = Array.from(message.attachments.values())[0];
          const guild = message.guild;
          if (
            guild === null ||
            attachment === undefined ||
            emojiName === undefined ||
            message.channel.type !== ChannelType.GuildText
          ) {
            return;
          }
          if (guild.emojis.cache.size >= emojiSuggestionsConfig.emojiCap - 1) {
            await message.channel.send(
              `With this emoji, the allocated quota has been filled.
            Next votes will include which emoji you want to replace.`
            );
          }
          const emoji = await axios.get(attachment.proxyURL, {
            responseType: "arraybuffer",
          });
          if (!(emoji.data instanceof Buffer)) {
            // It is guaranteed that it is a buffer
            throw new Error("Axios did not return Buffer");
          }

          const emojiCreate = {
            attachment: Buffer.from(emoji.data),
            name: emojiName + emojiSuffix,
          };
          await guild.emojis.create(emojiCreate);
        }
      });
    }
  }

  async countEmoji(message: Message): Promise<void> {
    const regex = new RegExp(`:[a-zA-Z1-9_]+${emojiSuffix}:`, "g");
    if (message.guildId === null) {
      return;
    }

    const matches = message.content.match(regex);
    const emojis = await message.guild?.emojis.fetch();
    if (!matches || !emojis) {
      return;
    }

    for (const match of matches) {
      const emojiName = match.substring(1, match.length - 1);

      if (emojis.find((value) => value.name === emojiName) === undefined) {
        console.log(`emoji not found: ${emojiName}`);
        continue;
      }

      await this.addEmoji(message.guildId, emojiName);
    }
  }

  async addEmoji(guildId: string, name: string): Promise<void> {
    const time = Date.now();

    const emojiUsage = await EmojiUsageModel.findOneAndUpdate(
      {
        guildId,
        name,
      },
      {
        $setOnInsert: {
          guildId: guildId,
          name: name,
          count: 0,
          lastUsage: time,
        },
      },
      {
        returnOriginal: false,
        upsert: true,
      }
    );

    emojiUsage.count++;

    emojiUsage.lastUsage = new Date(time);
    await emojiUsage.save();
  }
}
