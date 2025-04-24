import {
  ApplicationCommandType,
  MessageContextMenuCommandInteraction,
  MessageFlags,
  ModalBuilder,
  TextInputStyle,
} from "discord.js";
import { CustomApplicationCommand } from "lib/core/command";
import { DsuClient } from "lib/core/DsuClient";
import { Question } from "lib/util/questions";

export default class Codeblock extends CustomApplicationCommand {
  constructor(client: DsuClient) {
    super("Deny Suggestion", client, {
      type: ApplicationCommandType.Message,
      permissionLevel: "USER",
      defaultMemberPermissions: null,
    });
  }

  async run(interaction: MessageContextMenuCommandInteraction) {
    const suggestionUtility = this.client.utils.getUtility("suggestions");
    const isSuggestion = await suggestionUtility.isSuggestionMessage(
      interaction.targetMessage
    );
    if (!isSuggestion) {
      return interaction.reply({
        embeds: [
          this.client.utils.getUtility("default").generateEmbed("error", {
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
      TextInputStyle.Paragraph
    );

    suggestionUtility.modalContextCache.set(
      interaction.user.id,
      interaction.targetMessage.id
    );

    modal.addComponents(submissionDenialQuestion.toActionRow());

    await interaction.showModal(modal);
  }
}
