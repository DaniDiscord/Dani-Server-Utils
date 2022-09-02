import { Command } from "types/command";

const autoslow: Command = {
  run: async (client, message, args) => {
    if (!args[0]) return client.errEmb(1);

    const action = args[0].toLowerCase();
    const channel = message.channelId;
    if (action === "add") {
      if (args.length < 4) {
        return client.errEmb(1, "!autoslow add <min> <max> <target messages per second>");
      }
      client.addAutoSlow(
        channel,
        parseInt(args[1]),
        parseInt(args[2]),
        parseFloat(args[3])
      );
      return { description: "Successfully setup Auto Slow" };
    } else if (action === "rm") {
      client.removeAutoSlow(channel);
      return { description: "Successfully removed Auto Slow" };
    }
  },
  conf: {
    aliases: [],
    permLevel: "Helper",
  },
  help: {
    name: "autoslow",
    description: `Adjusts auto slow settings`,
  },
};

export default autoslow;
