import { Command, PermissionLevels } from "../../types/command";

const goodname: Command = {
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

    await client.setMemberName(member, member.user.username);

    return { description: `Successfully changed ${member}'s nickname` };
  },
  conf: {
    aliases: ["goodboi"],
    permLevel: PermissionLevels.HELPER,
  },
  help: {
    name: "goodname",
    description: `Changes name back to the original user name`,
  },
};

export default goodname;
