import { Command, PermissionLevels } from "types/command";

const template: Command = {
  run: async (client, _message, _args) => {
    return Promise.resolve().then(async () => {
      try {
      } catch (e) {
        log.error("Short message", {
          action: template.help.name,
          message: "Longer message",
        });
      }
    });
  },
  conf: {
    aliases: ["Aliases here"],
    permLevel: PermissionLevels.USER,
  },
  help: {
    name: "template",
    description: `Some description of the command`,
  },
};

export default template;
