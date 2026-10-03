import { ButtonInteraction, MessageFlags } from "discord.js";
import { ServerEventConfigModel, ServerEventModel } from "models/ServerEvent";
import { Button } from "lib/core/command";
import { DsuClient } from "lib/core/DsuClient";
import { PermissionLevels } from "types/commands";
import { ServerEventSubmissionModel } from "models/ServerEventSubmission";

export default class EventDeny extends Button {
  constructor(client: DsuClient) {
    super("event-deny", client, {
      permissionLevel: PermissionLevels.MODERATOR,
      global: true,
    });
  }

  public async run(interaction: ButtonInteraction) {
    const submissionId = interaction.customId.slice("event-deny-".length);
    const submission = await ServerEventSubmissionModel.findById(submissionId);

    if (!submission || submission.status !== "pending") {
      await interaction.reply({
        content: "That submission has already been handled.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const event = await ServerEventModel.findById(submission.eventId);

    if (!event) {
      await interaction.reply({
        content: "That event no longer exists.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const config = await ServerEventConfigModel.findOne({ guildId: event.guildId });
    if (!config || interaction.channelId !== config.staffApprovalChannelId) return;

    submission.status = "denied";
    await submission.save();

    await interaction.message
      .edit({
        content: `${interaction.message.content}\nDenied by <@${interaction.user.id}>`,
        components: [],
      })
      .catch(() => {});

    await interaction.reply({
      content: "Submission denied.",
      flags: MessageFlags.Ephemeral,
    });
  }
}
