import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ColorResolvable,
  ContainerBuilder,
  EmbedBuilder,
  GuildChannel,
  MediaGalleryBuilder,
  Message,
  MessageFlags,
  MessageType,
  TextChannel,
  TextDisplayBuilder,
} from "discord.js";

import { AnchorUtility } from "../utilities/anchor";
import { AutoSlowUtility } from "../utilities/autoSlow";
import { ChainHandler } from "lib/core/ChainHandler";
import DefaultClientUtilities from "lib/util/defaultUtilities";
import { DsuClient } from "lib/core/DsuClient";
import { EmojiSuggestionsUtility } from "../utilities/emojiSuggestions";
import { EventLoader } from "lib/core/loader/EventLoader";
import { LinkHandlerUtility } from "../utilities/linkHandler";
import { PhraseMatcherModel } from "models/PhraseMatcher";
import { SettingsModel } from "models/Settings";
import { TriggerModel } from "models/Trigger";
import XpManager from "lib/core/XpManager";
import { XpModel } from "models/Xp";

const chainHandler = new ChainHandler();

export default class MessageCreate extends EventLoader {
  constructor(client: DsuClient) {
    super(client, "messageCreate");
  }

  override async run(message: Message) {
    if (message.type == MessageType.AutoModerationAction) {
      let content = message.embeds[0].description;
      if (!content) {
        return this.client.logger.error(
          "Internal error: data does not exist inside automod message;",
        );
      }

      const DISCORD_INVITE_PATTERNS =
        /(?:https?:\/\/)?(?:discord\.gg|discord(?:app)?\.com\/invite)\/([\w-]+)/gi;
      if (content.match(DISCORD_INVITE_PATTERNS)) {
        const matches = [...content.matchAll(DISCORD_INVITE_PATTERNS)];
        matches.forEach(async (match) => {
          const code = match[1];
          try {
            const server = await this.client.fetchInvite(code);
            if (!server.guild) return;

            const container = new ContainerBuilder()
              .addTextDisplayComponents(
                new TextDisplayBuilder({
                  content: `# Resolved Guild\n Name: ${server.guild.name}\n Server Avatar:`,
                }),
              )
              .addMediaGalleryComponents(
                new MediaGalleryBuilder().addItems({
                  media: {
                    url: `${server.guild?.iconURL() || "https://cdn.discordapp.com/embed/avatars/0.png"}`,
                  },
                  spoiler: true,
                }),
              );
            await message.reply({
              flags: MessageFlags.IsComponentsV2,
              components: [container],
            });
          } catch (_) {
            const embed = DefaultClientUtilities.generateEmbed("error", {
              title: "Failed to resolve guild",
              description: `Guild may be banned, deleted, or the invite expired.`,
            });
            message.reply({ embeds: [embed] });
          }
        });
      }
    }
    if (message.author.bot) return;
    if (!message.guild) return;
    if (
      message.channel.type !== ChannelType.GuildText &&
      message.channel.type !== ChannelType.GuildVoice
    )
      return; // prevent running in dms, and use as guard clause
    if (message.guild && !this.client.settings.has((message.guild || {}).id)) {
      // We don't have the settings for this guild, find them or generate empty settings
      const s = await SettingsModel.findOneAndUpdate(
        { _id: message.guild.id },
        { toUpdate: true },
        {
          upsert: true,
          setDefaultsOnInsert: true,
          new: true,
        },
      )
        .populate("mentorRoles")
        .populate("commands");

      this.client.logger.info(
        `Setting sync: Fetch Database -> Client (${message.guild.id})`,
      );

      this.client.settings.set(message.guild.id, s);
      message.settings = s;
    } else {
      const s = this.client.settings.get(message.guild ? message.guild.id : "default");
      if (!s) return;
      message.settings = s;
    }

    const level = this.client.getPermLevel(message, message.member!);

    const autoSlowManager = await AutoSlowUtility.getAutoSlow(message.channelId);

    if (autoSlowManager != null && level < 1 && message.channel instanceof TextChannel) {
      autoSlowManager.messageSent();
      autoSlowManager.setOptimalSlowMode(message.channel);
    }

    await EmojiSuggestionsUtility.countEmoji(message);

    if (level == -1) {
      return;
    }
    const hasLink = LinkHandlerUtility.parseMessageForLink(message.content);

    const canSendLinks = await LinkHandlerUtility.checkLinkPermissions(
      message.guildId ?? "",
      message.channelId,
      message.author.id,
      message.member?.roles.cache.map((role) => role.id) ?? [],
    );

    if (!canSendLinks && hasLink.hasUrls && level < 3) {
      await message
        .delete()
        .catch(() => this.client.logger.error("Failed to delete message with link"));
      return;
    }

    await AnchorUtility.handleAnchor(this.client, message);

    await chainHandler.handleMessage(message);
    this.client.logger.info(chainHandler.getMetrics());
    message.author.permLevel = level;

    const foundPhrases = await PhraseMatcherModel.find();

    for (const { phrases, logChannelId } of foundPhrases) {
      for (const { content, matchThreshold } of phrases) {
        const matches = DefaultClientUtilities.fuzzyMatch(message.content, content);
        if (matches >= matchThreshold) {
          const logChannel = message.guild.channels.cache.get(logChannelId);
          if (
            logChannel &&
            logChannel.guild != null &&
            (logChannel.type === ChannelType.GuildText || logChannel.isThread())
          ) {
            const embed = new EmbedBuilder()
              .setTitle("Matched message")
              .setColor(matches === 100 ? "Green" : "Yellow")
              .setDescription(`[Jump to message](${message.url})`)
              .setFields([
                {
                  name: `Message`,
                  value: message.content,
                },
                {
                  name: "Phrase",
                  value: content,
                },
                {
                  name: "Author",
                  value: message.author.id,
                },
                {
                  name: "Threshold match (%)",
                  value: `${Math.round(matches)}%`,
                },
              ]);
            await logChannel.send({ embeds: [embed] });
          }
        }
      }
    }

    const triggers = message.settings.triggers.filter((t) => t.enabled);
    for (const trigger of triggers) {
      const id = `trigger-${trigger.id}`;
      const optedOut = await TriggerModel.exists({
        guildId: message.guild.id,
        userId: message.author.id,
        triggerId: id,
      });
      if (optedOut) {
        continue;
      }

      if (!this.client.dirtyCooldownHandler.has(id)) {
        const matched: string[] = [];
        const allMatch =
          trigger.keywords.length !== 0 &&
          trigger.keywords.every((keywordArr) =>
            keywordArr
              .map((v) => new RegExp(v.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1"), "i"))
              .some((regex) => {
                const match = message.content.match(regex);
                if (match) {
                  const matchedStr = match[0];

                  // Skip if the matched string is part of a custom emoji name
                  const isInCustomEmoji = Array.from(
                    message.content.matchAll(/<a?:([a-zA-Z0-9_]+):\d+>/g),
                  ).some(
                    ([, emojiName]) =>
                      emojiName.toLowerCase() === matchedStr.toLowerCase(),
                  );

                  if (!isInCustomEmoji) {
                    matched.push(regex.source);
                    return true;
                  }
                }
                return false;
              }),
          );
        if (allMatch) {
          const button = new ActionRowBuilder<ButtonBuilder>().setComponents(
            new ButtonBuilder()
              .setCustomId(id)
              .setLabel("Don't remind me again")
              .setStyle(ButtonStyle.Primary),
          );

          let reply: {
            content?: string;
            embeds?: EmbedBuilder[];
            components: ActionRowBuilder<ButtonBuilder>[];
          };

          if (trigger.message.embed) {
            let color: ColorResolvable = "Red";

            const footer = `Matched: ${matched.map((m) => `"${m}"`).join(", ")}`;

            if (DefaultClientUtilities.isColor(trigger.message.color)) {
              color = trigger.message.color;
            }

            reply = {
              embeds: [
                new EmbedBuilder()
                  .setTitle(trigger.message.title)
                  .setDescription(trigger.message.description)
                  .setColor(color)
                  .setFooter({ text: footer }),
              ],
              components: [button],
            };
          } else {
            reply = {
              content: trigger.message.content,
              components: [button],
            };
          }

          message
            .reply(reply)
            .then(() => {
              this.client.dirtyCooldownHandler.set(id, trigger.cooldown * 1000);
            })
            .catch();

          break; // Don't want multiple triggers on a single message
        }
      }
    }

    const result = await XpModel.findOneAndUpdate(
      {
        guildId: message.guild.id,
        userId: message.author.id,
        $or: [
          { lastXpTimestamp: { $exists: false } },
          { lastXpTimestamp: { $lt: Date.now() - XpManager.EXP_COOLDOWN } },
        ],
      },
      {
        $inc: {
          messageCount: 1,
          expAmount: XpManager.EXP_PER_MESSAGE,
        },
        $set: {
          lastXpTimestamp: Date.now(),
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      },
    );

    if (!result) {
      return;
    }

    this.client.textCommandLoader.handle(message);
  }
}
