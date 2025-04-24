import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ChatInputCommandInteraction,
  ModalBuilder,
  PermissionsBitField,
} from "discord.js";
import { CustomApplicationCommand } from "lib/core/command";
import { DsuClient } from "lib/core/DsuClient";
import { staffAppCustomId, staffAppQuestions } from "lib/util/questions";

export default class StaffApplicationCommand extends CustomApplicationCommand {
  constructor(client: DsuClient) {
    super("staff", client, {
      description: "apply for staff",
      type: ApplicationCommandType.ChatInput,
      permissionLevel: "USER",
      applicationData: [
        {
          type: ApplicationCommandOptionType.Subcommand,
          name: "apply",
          description: "apply for staff",
        },
      ],
      defaultMemberPermissions: new PermissionsBitField("Administrator"),
    });
  }

  async run(interaction: ChatInputCommandInteraction) {
    const modal = new ModalBuilder()
      .setCustomId(staffAppCustomId)
      .setTitle("Staff App");

    modal.addComponents(staffAppQuestions.map((q) => q.toActionRow()));

    await interaction.showModal(modal);
    return {};
  }
}
