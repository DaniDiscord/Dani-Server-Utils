import {
  ApplicationCommandType,
  MessageContextMenuCommandInteraction,
  MessageFlags,
  ModalBuilder,
  TextInputStyle,
} from "discord.js";

import { CustomApplicationCommand } from "lib/core/command";
import DefaultClientUtilities from "lib/util/defaultUtilities";
import { DsuClient } from "lib/core/DsuClient";
import { PermissionLevels } from "types/commands";
import { Question } from "lib/util/questions";
import { SuggestionUtility } from "../../utilities/suggestions";

export default class DenySuggestion extends CustomApplicationCommand {
  constructor(client: DsuClient) {
    super("Deny Suggestion", client, {
      type: ApplicationCommandType.Message,
      permissionLevel: PermissionLevels.MODERATOR,
      defaultMemberPermissions: null,
    });
  }

  async run(interaction: MessageContextMenuCommandInteraction) {
    const suggestion = await SuggestionUtility.isSuggestionMessage(
      interaction.targetMessage,
    );
    if (!suggestion.exists) {
      return interaction.reply({
        embeds: [
          DefaultClientUtilities.generateEmbed("error", {
            title: "Command cannot be used.",
            description: "This command can only be ran on suggestion messages.",
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }
    const modal = new ModalBuilder()
      .setCustomId("denysubmission")
      .setTitle("Deny Submission");

    const submissionDenialQuestion = new Question(
      "reason",
      "Reason for denial",
      false,
      TextInputStyle.Paragraph,
    );

    SuggestionUtility.modalContextCache.set(
      interaction.user.id,
      interaction.targetMessage.id,
    );

    modal.addComponents(submissionDenialQuestion.toActionRow());

    await interaction.showModal(modal);
  }
}
