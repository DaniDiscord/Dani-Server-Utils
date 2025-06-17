import {
  ApplicationCommandType,
  GuildMember,
  MessageFlags,
  PermissionsBitField,
  UserContextMenuCommandInteraction,
} from "discord.js";

import { BadNameUtility } from "../../utilities/badName";
import { CustomApplicationCommand } from "lib/core/command";
import { DsuClient } from "lib/core/DsuClient";
import { PermissionLevels } from "types/commands";

export default class ResetDisplay extends CustomApplicationCommand {
  constructor(client: DsuClient) {
    super("Reset to Display Name", client, {
      type: ApplicationCommandType.User,
      permissionLevel: PermissionLevels.HELPER,
      defaultMemberPermissions: new PermissionsBitField("Administrator"),
    });
  }

  public async run(interaction: UserContextMenuCommandInteraction) {
    if (!(interaction.targetMember instanceof GuildMember)) {
      return interaction.reply({
        content: "Reset name only works on guild members",
        flags: MessageFlags.Ephemeral,
      });
    }
    if (this.client.getPermLevel(undefined, interaction.targetMember) >= 2) {
      return interaction.reply({
        content: "Helper and above cannot be nicknamed",
        flags: MessageFlags.Ephemeral,
      });
    }
    await BadNameUtility.setMemberName(
      interaction.targetMember,
      interaction.targetUser.displayName,
    );
    return interaction.reply({
      content: "Nickname reset successfully",
      flags: MessageFlags.Ephemeral,
    });
  }
}
