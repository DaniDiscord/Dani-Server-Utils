import { Command, PermissionLevels } from "types/command";
import { EmbedBuilder, TextChannel } from "discord.js";

const chaindetection: Command = {
  run: async (client, message, [func, ...content]) => {
    try {
      if (!func) return message.channel.send({ embeds: [client.errEmb(1)] });
      if (!message.guildId)
        return message.channel.send({
          embeds: [client.errEmb(0, "guildid not found")],
        });

      if (func.toLowerCase() == "list") {
        const emb = new EmbedBuilder().setTitle(`Chain detection ignore list`);
        const arr = (message.settings.chains?.ignored ?? []).map((o) => `\`${o}\``);

        const max_length = 1024;
        const separator = ", ";

        let temp = "";
        const out = [];
        for (const word of arr) {
          if (`${temp}${separator}${word}`.length > max_length) {
            out.push(temp);
            temp = "";
          } else {
            temp += temp ? `${separator}${word}` : word;
          }
        }
        if (temp) out.push(temp);

        out.forEach((chunk, i) => {
          emb.addFields({ name: i === 0 ? "Content" : "Continued", value: chunk });
        });
        return message.channel.send({ embeds: [emb] });
      } else if (func.toLowerCase() == "ignore") {
        if (!content) return message.channel.send({ embeds: [client.errEmb(1)] });
        const setting = client.settings.get(message.guildId);
        if (!setting)
          return message.channel.send({
            embeds: [client.errEmb(0, "settings not found")],
          });
        if (!setting.chains) {
          setting.chains = { ignored: [] };
        }
        const match = message.content.match(
          new RegExp(`${message.settings.prefix}${chaindetection.help.name} +ignore`, "i")
        );
        if (!match)
          return message.channel.send({
            embeds: [client.errEmb(0, "Can't understand command")],
          });
        // console.log(match);
        const msgContent = message.content.slice(match[0].length).toLowerCase().trim();
        if (!setting.chains.ignored.includes(msgContent)) {
          setting.chains.ignored.push(msgContent);
          setting.toUpdate = true;
          return message.channel.send({
            content: `Now ignoring \`${msgContent}\``,
          });
        } else {
          return message.channel.send({
            content: `Already ignoring \`${msgContent}\``,
          });
        }
      }
      return message.channel.send({ embeds: [client.errEmb(1)] });
    } catch (e) {
      log.error("!chaindetection command", e as Error);
    }
  },
  conf: {
    aliases: [],
    permLevel: PermissionLevels.BOT_OWNER,
  },
  help: {
    name: "chaindetection",
    description: `Sets roles :)`,
  },
};

export default chaindetection;
