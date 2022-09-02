import { Command } from "types/command";
import { MessageEmbed } from "discord.js";

const run: Command = {
  run: async (client, message, args) => {
    try {
      // Eval the code
      let e = await eval(args.join(" "));

      if (typeof e == "object") {
        e = JSON.stringify(e);
      } else if (typeof e != "string") {
        e = e.toString();
      }

      message.channel.send({ embeds: [new MessageEmbed({ description: e })] });
    } catch (e) {
      client.log("err", e);
    }
  },
  conf: {
    aliases: ["r"],
    permLevel: "Bot Owner",
  },
  help: {
    name: "run",
    description: `Evals code`,
  },
};

export default run;
