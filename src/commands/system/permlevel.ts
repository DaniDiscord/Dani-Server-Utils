import { Command } from "types/command";
import { MessageEmbed } from "discord.js";

const permlevel: Command = {
  run: async (client, message, [member]) => {
    try {
      const ID = member.match(/\d{17,19}/)![0];
      const gMember = await message.guild!.members.fetch(ID);

      message.channel.send({
        embeds: [
          new MessageEmbed()
            .setColor("GREEN")
            .setDescription(client.permlevel(undefined, gMember).toString()),
        ],
      });
    } catch (e: any) {
      client.log("err", e);

      message.channel.send({
        embeds: [new MessageEmbed().setColor("RED").setDescription(e.toString())],
      });
    }
  },
  conf: {
    aliases: ["pl"],
    permLevel: "Bot Owner",
  },
  help: {
    name: "permlevel",
    description: `Calculates someone's perm level`,
  },
};

export default permlevel;
