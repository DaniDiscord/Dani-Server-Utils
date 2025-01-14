import { Command, PermissionLevels } from "types/command";
import { EmbedBuilder, TextChannel } from "discord.js";

import { CommandModel as DBCommand } from "../../models/Command";
import { SettingsModel } from "models/Settings";

const addcmd: Command = {
  run: async (client, message, [command, ...content]) => {
    try {
      if (!command || content.length == 0) {
        return (message.channel as TextChannel).send({ embeds: [client.errEmb(1)] });
      }

      console.log(message.settings.commands);
      console.log(
        message.settings.commands.filter((c) => c.trigger == command.toLowerCase())
      );
      console.log(
        message.settings.commands.filter((c) => c.trigger == command.toLowerCase()).length
      );

      if (
        message.settings.commands.filter((c) => c.trigger == command.toLowerCase())
          .length >= 1
      ) {
        return (message.channel as TextChannel).send({
          embeds: [
            client.errEmb(2, `Command \`${command.toLowerCase()}\` is already defined.`),
          ],
        });
      }

      // I guess I just add the command into commands?
      const cmd = await new DBCommand({
        trigger: command.toLowerCase(),
        content: content.join(" "),
        guild: message.settings._id,
      }).save();

      client.settings.set(
        message.settings._id,
        await SettingsModel.findOneAndUpdate(
          { _id: message.settings._id },
          { $push: { commands: cmd._id }, toUpdate: true },
          { upsert: true, setDefaultsOnInsert: true, new: true }
        )
          .populate("mentorRoles")
          .populate("commands")
      );

      return (message.channel as TextChannel).send({
        embeds: [
          new EmbedBuilder()
            .setColor("Green")
            .setDescription(`Successfully added command ${command.toLowerCase()}`),
        ],
      });
    } catch (e) {
      log.error("!addcmd command", e as Error);
    }
  },
  conf: {
    aliases: ["addcommand"],
    permLevel: PermissionLevels.ADMINISTRATOR,
  },
  help: {
    name: "addcmd",
    description: `Add custom command`,
  },
};

export default addcmd;
