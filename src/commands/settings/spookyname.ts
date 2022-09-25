import { BadNamer } from "lib/badname";
import { Client } from "discord.js";
import { Command } from "types/command";
import { halloween } from "lib/combinations";

const spookyNamer = new BadNamer(halloween);

const spookyname: Command = {
  run: async (client: Client, message, args) => {
    if (!args[0]) return client.errEmb(1);
    if (!/\d{17,19}/.test(args[0])) return client.errEmb(2);

    let id;

    try {
      id = args[0].match(/\d{17,19}/)![0];
    } catch (e) {
      return client.errEmb(0, `Something went wrong 🤷♂️`);
    }

    // Fetch the user mentioned
    const member = await message.guild!.members.fetch(id).catch();

    if (client.permlevel(message) <= client.permlevel(undefined, member)) {
      return client.errEmb(0, `You don't have permission to spookyname that person.`);
    }

    if (!member) {
      return client.errEmb(0, `Did you provide me with an invalid user ID?`);
    }

    if (!member.manageable) {
      return client.errEmb(0, `I don't have permission to manage that user.`);
    }

    const num = await client.getNextCounter("Spookyname");
    const name = spookyNamer.get(num);

    await client.setMemberName(member, name);

    return { description: `Successfully changed ${member}'s nickname` };
  },
  conf: {
    aliases: [],
    permLevel: "Helper",
  },
  help: {
    name: "spookyname",
    description: `Gives a random but spooky name`,
  },
};

export default spookyname;
