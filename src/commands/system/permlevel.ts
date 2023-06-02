import { Command, PermissionLevels } from "types/command";

import { EmbedBuilder } from "discord.js";

const permlevel: Command = {
  run: async (client, message, [member]) => {
    try {
      const ID = member.match(/\d{17,19}/)![0];
      const gMember = await message.guild!.members.fetch(ID).catch(() => {});
      message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor("Green")
            .setDescription(
              gMember ? client.permlevel(undefined, gMember).toString() : "N/A"
            ),
        ],
      });
    } catch (e: any) {
      log.error("!permlevel command", e as Error);

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
