import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  Collection,
  ColorResolvable,
  EmbedBuilder,
  GuildChannel,
  Message,
  TextChannel,
} from "discord.js";
import { canUserSendLinks, readMsgForLink } from "lib/linkHandler";

import { Command } from "types/command";
import { CustomClient } from "../lib/client";
import { ICommand } from "types/mongodb";
import { SettingsModel } from "../models/Settings";
import { TriggerModel } from "models/Trigger";
import { isColor } from "lib/utils";

const chainStops = ["muck"];
const CHAIN_STOPS_ONLY = false; // Only triggers on chainStops
const chainIgnoredChannels = ["594178859453382696", "970968834372698163"];
const CHAIN_DETECTION_LENGTH = 5;
const CHAIN_DELETE_MESSAGE_THRESHOLD = 2;
const CHAIN_WARN_THRESHOLD = 3;
const CHAIN_DELETION_LOG_CHANNEL_ID = "989203228749099088";

export default async (client: CustomClient, message: Message): Promise<void> => {
  client.reactionHandler.onNewMessage(message);
  if (message.author.bot) return;
  if (!message.guild) return;
  if (message.guild && !client.settings.has((message.guild || {}).id)) {
    // We don't have the settings for this guild, find them or generate empty settings
    const s = await SettingsModel.findOneAndUpdate(
      { _id: message.guild.id },
      { toUpdate: true },
      {
        upsert: true,
        setDefaultsOnInsert: true,
        new: true,
      }
    )
      .populate("mentorRoles")
      .populate("commands");

    log.debug("Setting sync", {
      action: "Fetch",
      message: `Database -> Client (${message.guild.id})`,
    });

    client.settings.set(message.guild.id, s);
    message.settings = s;
  } else {
    const s = client.settings.get(message.guild ? message.guild.id : "default");
    if (!s) return;
    message.settings = s;
  }

  const level = client.permlevel(message, message!.member!);

  /*
  Auto Slow will go here
  */
  const autoSlowManager = await client.getAutoSlow(message.channelId);
  if (autoSlowManager !== null && level < 1 && message.channel instanceof TextChannel) {
    autoSlowManager.messageSent();
    autoSlowManager.setOptimalSlowMode(message.channel);
  }

  // Do whatever message filtering here
  if (level == -1) {
    return;
  }
  // Check for link.
  const hasLink = readMsgForLink(message.content);

  const canSendLinks = await canUserSendLinks(
    message.guildId ?? "",
    message.channelId,
    message.author.id,
    message.member?.roles.cache.map((role) => role.id) ?? []
  );

  if (!canSendLinks && hasLink.hasUrls) {
    await message.delete();
    return;
  }

  if (!client.channelMessages) client.channelMessages = new Collection();
  const chMessages = client.channelMessages.get(message.channel.id);
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
        // Just fucking delete the message
        let chMsg = chMessages.find((o) => o.word == trimMsg(message.content))!;
        chMsg.count++;
        if (chMsg.count >= CHAIN_DELETE_MESSAGE_THRESHOLD) {
          await message.delete().catch(() => {});
          if (chMsg.count == CHAIN_WARN_THRESHOLD) {
            const msg = await message.channel
              .send({ content: `Please stop chaining.` })
              .catch(() => {});
            if (msg && msg.deletable)
              setTimeout(async () => {
                if (msg && msg.deletable) await msg.delete().catch(() => {});
              }, 5000);
          }
          const logCh = message.guild.channels.cache.get(CHAIN_DELETION_LOG_CHANNEL_ID);
          if (
            logCh &&
            logCh.guild != null &&
            (logCh.type === ChannelType.GuildText || logCh.isThread())
          ) {
            const emb = new EmbedBuilder()
              .setAuthor({
                name: `${message.author.username}#${message.author.discriminator} ${
                  message.member?.nickname ? `(${message.member.nickname})` : ""
                }`,
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
                { name: "Date", value: new Date(message.createdTimestamp).toString() }
              );
            const messageChunks = [];
            if (message.content) {
              if (message.content.length > 1024) {
                messageChunks.push(
                  message.content.replace(/\"/g, '"').replace(/`/g, "").substring(0, 1023)
                );
                messageChunks.push(
                  message.content
                    .replace(/\"/g, '"')
                    .replace(/`/g, "")
                    .substring(1024, message.content.length)
                );
              } else {
                messageChunks.push(message.content);
              }
            } else {
              messageChunks.push("None");
            }
            messageChunks.forEach((chunk, i) => {
              emb.addFields({ name: i === 0 ? "Content" : "Continued", value: chunk });
            });
            await logCh.send({ embeds: [emb] }).catch(() => {});
          }
        }
      } else {
        if (chMessages.length == CHAIN_DETECTION_LENGTH) chMessages.shift();
        chMessages.push({ word: trimMsg(message.content), count: 0 });
        client.channelMessages.set(message.channel.id, chMessages);
      }
    } else {
      client.channelMessages.set(message.channel.id, [
        {
          word: trimMsg(message.content),
          count: 0,
        },
      ]);
    }
  }

  message.author.permLevel = level;

  // Keyword triggering
  // Basically, if all of the keywords subarrays have at least one
  // word that matches in the message content, it'll send the trigger message
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

    if (!client.dirtyCooldownHandler.has(id)) {
      let matched: string[] = [];
      let allMatch =
        trigger.keywords.length != 0 &&
        trigger.keywords.every((keywordArr) =>
          keywordArr
            .map((v) => new RegExp(v.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1"), "i"))
            .some((k) => message.content.match(k) && matched.push(k.source))
        );

      if (allMatch) {
        const button = new ActionRowBuilder<ButtonBuilder>().setComponents(
          new ButtonBuilder()
            .setCustomId(id)
            .setLabel("Don't remind me again")
            .setStyle(ButtonStyle.Primary)
        );

        let reply: {
          content?: string;
          embeds?: EmbedBuilder[];
          components: ActionRowBuilder<ButtonBuilder>[];
        };

        if (trigger.message.embed) {
          let color: ColorResolvable = "Red";

          let footer = `Matched: ${matched.map((m) => `"${m}"`).join(", ")}`;

          if (isColor(trigger.message.color)) {
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
            client.dirtyCooldownHandler.set(id, trigger.cooldown * 1000);
          })
          .catch();

        break; // Don't want multiple triggers on a single message
      }
    }
  }

  // Only called if the command pipeline was interrupted and the bot was ready to handle it
  const next = async () => {};

  if (!message.content.startsWith(client.prefix)) {
    return next();
  }

  const args = message.content.slice(client.prefix.length).trim().split(/ +/g);
  const command = args?.shift()?.toLowerCase();

  if (!command) return;

  let tempCmd: string | Command | undefined = client.commands.get(command);
  if (!tempCmd) {
    tempCmd = client.aliases.get(command);
    if (!tempCmd) return;
    tempCmd = client.commands.get(tempCmd);
    if (!tempCmd) return;
  }
  const cmd = tempCmd;

  // If the command is undefined, lets see if it exists in message settings
  if (!cmd && level > 0) {
    // Uhhhhhhh..... Lets see if we have a command with that trigger
    // Just making this to get under 80 chars in 1 line :)
    const filter = (c: ICommand) => c.trigger == command;
    if (message.settings.commands.filter(filter).length == 1) {
      // We just send an embed with the c content
      message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor("Random")
            .setDescription(message.settings.commands.filter(filter)[0].content),
        ],
      });
      return;
    }
  }

  if (!cmd) {
    return next();
  }

  // Check if the user's permlevel is high enough to run the command
  if (level < client.levelCache[cmd.conf.permLevel.toString()]) {
    return next();
  }
  const ret = await cmd.run(client, message, args);

  if (ret && ret.description) {
    await message.channel.send({ embeds: [ret] });
  }

  next();
};
