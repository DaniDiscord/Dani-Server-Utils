import {
  ApplicationCommandType,
  Collection,
  EmbedBuilder,
  MessageContextMenuCommandInteraction,
  MessageFlags,
} from "discord.js";

import { CustomApplicationCommand } from "lib/core/command";
import { DsuClient } from "lib/core/DsuClient";
import { PermissionLevels } from "types/commands";

export default class Codeblock extends CustomApplicationCommand {
  constructor(client: DsuClient) {
    super("Convert to Codeblock", client, {
      type: ApplicationCommandType.Message,
      permissionLevel: PermissionLevels.USER,
      defaultMemberPermissions: null,
    });
  }

  async run(interaction: MessageContextMenuCommandInteraction) {
    const cdsKey = `Codeblock-${interaction.user.id}`;
    const cooldowns = this.client.applicationCommandLoader.cooldowns;

    if (!cooldowns.has(this.name)) {
      cooldowns.set(this.name, new Collection<string, number>());
    }

    const now = Date.now();
    const timestamps = cooldowns.get(this.name)!;
    const cooldownAmount = 20000;

    if (timestamps.has(cdsKey)) {
      const expirationTime = timestamps.get(cdsKey)! + cooldownAmount;

      if (now < expirationTime) {
        return interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setColor("Red")
              .setDescription(
                `That command will be available again <t:${Math.floor(
                  expirationTime / 1000,
                )}:R>.`,
              ),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    let content = interaction.targetMessage.content.trim();
    let begin;
    for (begin = 0; begin < content.length; begin++) {
      if (content[begin] != "`") {
        break;
      }
    }
    let end;
    for (end = content.length - 1; end >= begin; end--) {
      if (content[end] != "`") {
        break;
      }
    }

    content = "```\n" + content.substring(begin, end + 1) + "```";

    timestamps.set(cdsKey, now);
    setTimeout(() => timestamps.delete(cdsKey), cooldownAmount);

    return interaction.reply(content);
  }
}
