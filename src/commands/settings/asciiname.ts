import { Command } from "types/command";
import { unicode2Ascii } from "lib/utils";

const asciiname: Command = {
  run: async (client, message, args) => {
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
      return client.errEmb(0, `You don't have permission to badname that person.`);
    }
    if (!member) {
      return client.errEmb(0, `Did you provide me with an invalid user ID?`);
    }
    if (!member.manageable) {
      return client.errEmb(0, `I don't have permission to manage that user.`);
    }

    const unicodeName = member.user.username;
    const name = unicode2Ascii(unicodeName);
    if (name.length < 3) {
      return client.errEmb(0, `This name cannot be converted to ascii.`);
    }
    await client.setMemberName(member, name);

    return { description: `Successfully changed ${member}'s nickname` };
  },
  conf: {
    aliases: ["ascii"],
    permLevel: "Helper",
  },
  help: {
    name: "asciiname",
    description: `Makes the user name ASCII`,
  },
};

export default asciiname;
