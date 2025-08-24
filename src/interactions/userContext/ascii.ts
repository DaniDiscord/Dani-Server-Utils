import {
  ApplicationCommandType,
  GuildMember,
  MessageFlags,
  PermissionsBitField,
  UserContextMenuCommandInteraction,
} from "discord.js";

import { BadNameUtility } from "../../utilities/badName";
import { CustomApplicationCommand } from "lib/core/command";
import DefaultClientUtilities from "lib/util/defaultUtilities";
import { DsuClient } from "lib/core/DsuClient";
import { PermissionLevels } from "types/commands";

export default class AsciiName extends CustomApplicationCommand {
  constructor(client: DsuClient) {
    super("ASCII Name", client, {
      type: ApplicationCommandType.User,
      permissionLevel: PermissionLevels.HELPER,
      defaultMemberPermissions: new PermissionsBitField("Administrator"),
    });
  }

  public async run(interaction: UserContextMenuCommandInteraction) {
    if (!(interaction.targetMember instanceof GuildMember)) {
      return interaction.reply({
        content: "ASCII name only works on guild members",
        flags: MessageFlags.Ephemeral,
      });
    }
    if (this.client.getPermLevel(undefined, interaction.targetMember) >= 2) {
      return interaction.reply({
        content: "Helper and above cannot be nicknamed",
        flags: MessageFlags.Ephemeral,
      });
    }
    const unicodeName = interaction.targetMember.user.username;
    const name = DefaultClientUtilities.unicodeToAscii(unicodeName);
    if (name.length < 3) {
      return interaction.reply({
        content: "Name couldn't be converted to ASCII",
        flags: MessageFlags.Ephemeral,
      });
    }
    await BadNameUtility.setMemberName(interaction.targetMember, name);
    return interaction.reply({
      content: "User renamed successfully",
      flags: MessageFlags.Ephemeral,
    });
  }
}
