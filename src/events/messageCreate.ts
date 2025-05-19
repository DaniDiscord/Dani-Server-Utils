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

import { DsuClient } from "lib/core/DsuClient";
import { EventLoader } from "lib/core/loader/EventLoader";
import { PhraseMatcherModel } from "models/PhraseMatcher";
import { SettingsModel } from "models/Settings";
import { TriggerModel } from "models/Trigger";

const chainStops = ["muck"];
const chainIgnoredChannels = ["594178859453382696", "970968834372698163"];
const CHAIN_STOPS_ONLY = false;
const CHAIN_DETECTION_LENGTH = 5;
const CHAIN_DELETE_MESSAGE_THRESHOLD = 2;
const CHAIN_WARN_THRESHOLD = 3;
const CHAIN_DELETION_LOG_CHANNEL_ID = "989203228749099088";
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
      if (content.match(/discord\.gg\/([a-zA-Z0-9]+)/g)) {
        const matches = [...content.matchAll(/discord\.gg\/([a-zA-Z0-9]+)/g)];

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
            const embed = this.client.utils.getUtility("default").generateEmbed("error", {
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
    const defaultUtility = this.client.utils.getUtility("default");

    const level = this.client.getPermLevel(message, message.member!);

    const autoSlowManager = await defaultUtility.getAutoSlow(message.channelId);

    if (autoSlowManager != null && level < 1 && message.channel instanceof TextChannel) {
      autoSlowManager.messageSent();
      autoSlowManager.setOptimalSlowMode(message.channel);
    }

    const emojiUtility = this.client.utils.getUtility("emoji");

    await emojiUtility.countEmoji(message);
    if (level == -1) {
      return;
    }
    const linkUtility = this.client.utils.getUtility("linkHandler");
    const hasLink = linkUtility.parseMessageForLink(message.content);

    const canSendLinks = await linkUtility.checkLinkPermissions(
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

    await this.client.utils.getUtility("anchors").handleAnchor(message);

    // Chain deletion
    const chMessages = this.client.channelMessages.get(message.channelId);
    const trimMsg = (str: string) => str.toLowerCase().trim();

    if (
      message.content != "" &&
      !message.settings.chains?.ignored?.includes(trimMsg(message.content))
    ) {
      if (chMessages && !chainIgnoredChannels.includes(message.channelId)) {
        if (
          ((CHAIN_STOPS_ONLY && chainStops.some((o) => o == trimMsg(message.content))) ||
            !CHAIN_STOPS_ONLY) &&
          chMessages.some((o) => o.word == trimMsg(message.content)) &&
          message.deletable &&
          level < 2
        ) {
          const chMsg = chMessages.find((o) => o.word == trimMsg(message.content));
          if (!chMsg) return;
          chMsg.count++;
          if (chMsg.count >= CHAIN_DELETE_MESSAGE_THRESHOLD) {
            await message
              .delete()
              .catch(() => this.client.logger.error("Failed to delete chain message"));
            if (chMsg.count == CHAIN_WARN_THRESHOLD) {
              const msg = await message.channel
                .send({ content: `Please stop chaining.` })
                .catch(() =>
                  this.client.logger.error("Failed to send chain warning message"),
                );
              if (msg && msg.deletable)
                setTimeout(async () => {
                  if (msg && msg.deletable)
                    await msg
                      .delete()
                      .catch(() =>
                        this.client.logger.error(
                          "Failed to delete chain warning message",
                        ),
                      );
                }, 5000);
            }
            const logCh = message.guild.channels.cache.get(CHAIN_DELETION_LOG_CHANNEL_ID);
            if (
              logCh &&
              logCh.guild != null &&
              (logCh.type === ChannelType.GuildText || logCh.isThread())
            ) {
              try {
                const member = await message.guild.members.fetch({
                  user: message.author.id,
                });
                const emb = new EmbedBuilder()
                  .setAuthor({
                    name: `${message.author.username}#${
                      message.author.discriminator
                    } ${member.nickname ? `(${member.nickname})` : ""}`,
                    iconURL:
                      message.author.avatarURL() ??
                      "https://cdn.discordapp.com/embed/avatars/0.png",
                  })
                  .setColor("Random")
                  .setDescription(`Chain detection in <#${message.channelId}>`)
                  .addFields(
                    {
                      name: "Channel",
                      value: `<#${message.channel.id}> (${
                        (message.channel as GuildChannel)?.name ?? "Unknown"
                      })`,
                    },
                    {
                      name: "ID",
                      value: `\`\`\`ini\nUser = ${message.author.id}\nMessage = ${message.id}\`\`\``,
                    },
                    {
                      name: "Date",
                      value: new Date(message.createdTimestamp).toString(),
                    },
                  );
                const messageChunks = [];
                if (message.content) {
                  if (message.content.length > 1024) {
                    messageChunks.push(
                      message.content
                        .replace(/\"/g, '"')
                        .replace(/`/g, "")
                        .substring(0, 1023),
                    );
                    messageChunks.push(
                      message.content
                        .replace(/\"/g, '"')
                        .replace(/`/g, "")
                        .substring(1024, message.content.length),
                    );
                  } else {
                    messageChunks.push(message.content);
                  }
                } else {
                  messageChunks.push("None");
                }
                messageChunks.forEach((chunk, i) => {
                  emb.addFields({
                    name: i === 0 ? "Content" : "Continued",
                    value: chunk,
                  });
                });
                await logCh
                  .send({ embeds: [emb] })
                  .catch(() =>
                    this.client.logger.error(
                      "Failed to send chain message to log channel",
                    ),
                  );
              } catch (_) {
                this.client.logger.error("Failed resolving chaining GuildMember.");
                logCh.send({
                  embeds: [
                    defaultUtility.generateEmbed("error", {
                      description: `Chain messages found in ${message.channel}, but failed to resolve culprit.`,
                    }),
                  ],
                });
              }
            }
          }
        } else {
          if (chMessages.length == CHAIN_DETECTION_LENGTH) chMessages.shift();
          chMessages.push({ word: trimMsg(message.content), count: 0 });
          this.client.channelMessages.set(message.channel.id, chMessages);
        }
      } else {
        this.client.channelMessages.set(message.channel.id, [
          {
            word: trimMsg(message.content),
            count: 0,
          },
        ]);
      }
    }
    message.author.permLevel = level;

    const foundPhrases = await PhraseMatcherModel.find();

    for (const { phrases, logChannelId } of foundPhrases) {
      for (const { content, matchThreshold } of phrases) {
        const matches = defaultUtility.fuzzyMatch(message.content, content);
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

            if (defaultUtility.isColor(trigger.message.color)) {
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

    this.client.textCommandLoader.handle(message);
  }
}
