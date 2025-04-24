import {
  ApplicationCommandType,
  GuildMember,
  MessageFlags,
  PermissionsBitField,
  UserContextMenuCommandInteraction,
} from "discord.js";
import { CustomApplicationCommand } from "lib/core/command";
import { DsuClient } from "lib/core/DsuClient";

export default class ResetDisplay extends CustomApplicationCommand {
  constructor(client: DsuClient) {
    super("Reset to User Name", client, {
      type: ApplicationCommandType.User,
      permissionLevel: "USER",
      defaultMemberPermissions: new PermissionsBitField("Administrator"),
    });
  }

  public async run(interaction: UserContextMenuCommandInteraction) {
    const badNameUtility = this.client.utils.getUtility("badName");
    if (!(interaction.targetMember instanceof GuildMember)) {
      return interaction.reply({
        content: "Reset to username only works on guild members",
        flags: MessageFlags.Ephemeral,
      });
    }
    if (this.client.getPermLevel(undefined, interaction.targetMember) >= 2) {
      return interaction.reply({
        content: "Helper and above cannot be nicknamed",
        flags: MessageFlags.Ephemeral,
      });
    }
    const tag = interaction.targetUser.tag;
    const newName = `${tag.replace(/#\d+$/, "").substring(0, 31)}*`;

    await badNameUtility.setMemberName(interaction.targetMember, newName);
    return interaction.reply({
      content: "Nickname reset successfully",
      flags: MessageFlags.Ephemeral,
    });
  }
}
