import { Command, PermissionLevels } from "types/command";
import { EmbedBuilder, TextChannel } from "discord.js";

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

      message.channel.send({
        embeds: [new EmbedBuilder({ description: e })],
      });
    } catch (e) {
      console.error(e);
      log.error("!run command", e as Error);
    }
  },
  conf: {
    aliases: ["r"],
    permLevel: PermissionLevels.BOT_OWNER,
  },
  help: {
    name: "run",
    description: `Evals code`,
  },
};

export default run;
