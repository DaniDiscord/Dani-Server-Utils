import { Command, PermissionLevels } from "types/command";

import { EmbedBuilder } from "discord.js";
import { SettingsModel } from "models/Settings";

const rolesAvailable = Object.keys(SettingsModel.schema.paths)
  .filter((s) => s.startsWith("roles."))
  .map((c) => c.substring(6));

const setrole: Command = {
  run: async (client, message, [roleName, roleID]) => {
    try {
      if (!roleName) return message.channel.send({ embeds: [client.errEmb(1)] });
      if (!rolesAvailable.includes(roleName.toLowerCase())) {
        return message.channel.send({
          embeds: [
            client.errEmb(
              2,
              `Use one of the following: \`${rolesAvailable.join("`, `")}\``
            ),
          ],
        });
      }

      // Now lets parse the roleID
      const match = roleID.match(/\d{17,19}/);
      if (!match) {
        return message.channel.send({
          embeds: [
            client.errEmb(
              2,
              `Argument 2 (\`${roleID}\`) was not found to be a valid @role or roleID!`
            ),
          ],
        });
      }

      const role = match[0];
      if (!message.guild!.roles.cache.has(role)) {
        return message.channel.send({
          embeds: [
            client.errEmb(
              2,
              `Argument 2 (\`${roleID}\`) was not found to be a valid @role or roleID!`
            ),
          ],
        });
      }

      client.settings.get(message.guild!.id)!.roles = {
        ...(client.settings.get(message.guild!.id)!.roles || {}),
        [roleName.toLowerCase()]: role,
      };

      client.settings.get(message.guild!.id)!.updatedAt = Date.now();

      message.channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor("Green")
            .setDescription(
              `Set everyone with role <@&${role}> to be considered \`${roleName.toLowerCase()}\``
            ),
        ],
      });
    } catch (e) {
      log.error("!setrole command", e as Error);
    }
  },
  conf: {
    aliases: [],
    permLevel: PermissionLevels.BOT_OWNER,
  },
  help: {
    name: "setrole",
    description: `Sets roles :)`,
  },
};

export default setrole;
