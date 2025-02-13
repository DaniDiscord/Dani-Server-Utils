import { Command, PermissionLevels } from "types/command";
import { EmbedBuilder, TextChannel } from "discord.js";

import axios from "axios";

const gKey = process.env.GOOGLE_KEY ?? "";
const csx = process.env.GOOGLE_CSX ?? "";

const search = async (query: string) => {
  const { data } = await axios.get("https://www.googleapis.com/customsearch/v1", {
    params: {
      key: gKey,
      cx: csx,
      safe: "off",
      q: query,
    },
  });

  if (!data.items) return null;
  return data.items[0];
};

const google: Command = {
  run: async (client, message, args) => {
    try {
      if (!gKey || !csx) return message.reply("Either the googleKey or CSX are missing.");
      if (args.length == 0) {
        return message.channel.send({ embeds: [client.errEmb(1)] });
      }

      const match = args[0].match(/^\d{17,19}$/);
      let query;

      if (!match) {
        query = args.join(" ");
      } else {
        query = await message.channel.messages.fetch(match[0]);

        if (!query) {
          return message.channel.send({
            embeds: [client.errEmb(2, "Please enter your search term!")],
          });
        } else {
          query = query.content;
        }
      }

      if (!query) {
        return message.channel.send({
          embeds: [client.errEmb(2, "Please enter your search term!")],
        });
      }

      const href = await search(query);

      if (!href) {
        return message.channel.send({
          embeds: [client.errEmb(2, "Unknown Search.")],
        });
      }

      const embed = new EmbedBuilder()
        .setTitle(`Here's what i found for \`${query}\``)
        .setDescription(href.snippet)
        .setURL(href.link)
        .setColor("#2eabff");

      message.channel.send({ embeds: [embed] });
    } catch (e) {
      log.error("!google command", e as Error);
    }
  },
  conf: {
    aliases: ["g"],
    permLevel: PermissionLevels.USER,
  },
  help: {
    name: "google",
    description: `Generate a link to google!`,
  },
};

export default google;
