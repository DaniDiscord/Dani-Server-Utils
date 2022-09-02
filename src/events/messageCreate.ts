import { Collection, GuildChannel, Message, MessageEmbed, TextChannel } from "discord.js";

import { Command } from "types/command";
import { CustomClient } from "../lib/client";
import { ICommand } from "types/mongodb";
import { SettingsModel } from "../models/Settings";

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

    client.log("Fetch", `Database -> Client (${message.guild.id.red})`);

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
  if (autoSlowManager !== null && level < 0 && message.channel instanceof TextChannel) {
    autoSlowManager.messageSent();
    autoSlowManager.setOptimalSlowMode(message.channel);
  }

  // Do whatever message filtering here
  if (level == -1) {
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
          if (logCh && logCh.guild != null && (logCh.isText() || logCh.isThread())) {
            const emb = new MessageEmbed()
              .setAuthor(
                `${message.author.username}#${message.author.discriminator} ${
                  message.member?.nickname ? `(${message.member.nickname})` : ""
                }`,
                message.author.avatarURL() ??
                  "https://cdn.discordapp.com/embed/avatars/0.png"
              )
              .setColor("RANDOM")
              .setDescription(`Chain detection in <#${message.channelId}>`)
              .addField(
                "Channel",
                `<#${message.channel.id}> (${
                  (message.channel as GuildChannel)?.name ?? "Unknown"
                })`
              )
              .addField(
                "ID",
                `\`\`\`ini\nUser = ${message.author.id}\nMessage = ${message.id}\`\`\``
              )
              .addField("Date", new Date(message.createdTimestamp).toString());

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
              emb.addField(i === 0 ? "Content" : "Continued", chunk);
            });
            await logCh.send({ embeds: [emb] }).catch(() => {});
          }
        }
      } else {
        if (chMessages.length == CHAIN_DETECTION_LENGTH) chMessages.pop();
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

  // Only called if the command pipeline was interrupted and the bot was ready to handle it
  const next = async () => {
    // Lets first check if the message is in one of the mentor roles' channels
    if (
      message.settings.mentorRoles
        .map((mR) => mR.assignedChannels)
        .flat(1)
        .includes(message.channel.id)
    ) {
      // Yep. I guess we look for thanks now
      const thanks = ["ty", "thanks", "thank you", "tyvm", "tysm", "thank"];
      const thanksRegex = new RegExp(`(?:^| )(${thanks.join("|")})(?:$| )`, "gi");

      if (message.content.match(thanksRegex)) {
        /**
         * They did have a thanks in there somewhere
         *
         * Parsing the intent behind a message is too much hassle.
         * We'll only give the user a "thank" if there is no ambiguity.
         *
         * In this case, no ambiguity means they either pinged only that user, or replied to that user and didn't ping anyone
         */

        let hasPing = false;
        let hasReply = false;

        // eslint-disable-next-line max-len
        if (message.reference && message.reference.channelId === message.channel.id)
          hasReply = true;

        if (message.mentions.members?.size == 1) {
          hasPing = true;
        } else if ((message.mentions.members?.size ?? 0) > 1) {
          return;
        }

        if (hasPing !== hasReply) {
          // bitwise XOR, very nice
          // There is no ambiguity!
          if (hasPing && message.mentions.members) {
            // This is easy. Just give a thanks to the first message.mentions.members
            client.emit("newThank", {
              message,
              thankedMember: message.mentions.members.first(),
            });
          } else if (message.reference && message.reference.messageId) {
            // Fetch the referenced message
            const refd = await message.channel.messages.fetch(
              message.reference.messageId
            );

            if (!refd) {
              return; // Referenced message wasn't found. It's deleted already lmao
            }

            client.emit("newThank", { message, thankedMember: refd.member });
          }
        }
      }
    }
  };

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
          {
            color: client.randomColor(),
            description: message.settings.commands.filter(filter)[0].content,
          },
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
