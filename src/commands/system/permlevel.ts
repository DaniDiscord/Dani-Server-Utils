import { Command, PermissionLevels } from "types/command";

import { EmbedBuilder } from "discord.js";

const permlevel: Command = {
  run: async (client, message, [member]) => {
    try {
      const ID = member.match(/\d{17,19}/)![0];
      const gMember = await message.guild!.members.fetch(ID);

      message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor("Green")
            .setDescription(client.permlevel(undefined, gMember).toString()),
        ],
      });
    } catch (e: any) {
      client.log("err", e);

      message.channel.send({
        embeds: [new EmbedBuilder().setColor("Red").setDescription(e.toString())],
      });
    }
  },
  conf: {
    aliases: ["pl"],
    permLevel: PermissionLevels.BOT_OWNER,
  },
  help: {
    name: "permlevel",
    description: `Calculates someone's perm level`,
  },
};

export default permlevel;
