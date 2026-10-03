import {
  ChannelType,
  ComponentType,
  MessageFlags,
  ModalSubmitInteraction,
} from "discord.js";
import { ServerEventConfigModel, ServerEventModel } from "models/ServerEvent";
import { DsuClient } from "lib/core/DsuClient";
import { Modal } from "lib/core/command";
import { PermissionLevels } from "types/commands";
import { ServerEventSubmissionModel } from "models/ServerEventSubmission";
import { ServerEventUtility } from "../../utilities/serverEvent";

export default class EventSubmitModal extends Modal {
  constructor(client: DsuClient) {
    super("event-submit", client, {
      permissionLevel: PermissionLevels.USER,
    });
  }

  async run(interaction: ModalSubmitInteraction) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const eventId = interaction.customId.slice("event-submit-".length);
    const event = await ServerEventModel.findById(eventId);

    if (!event || event.guildId !== interaction.guildId) {
      await interaction.editReply("That event no longer exists.");
      return;
    }

    if (!event.started || (event.endAt && event.endAt.valueOf() <= Date.now())) {
      await ServerEventUtility.finish(this.client, event.id, false).catch(() => {});
      await interaction.editReply("This event is not running.");
      return;
    }

    if (event.bannedUsers.some((ban) => ban.userId === interaction.user.id)) {
      await interaction.editReply("You are banned from submitting to this event.");
      return;
    }

    const used = await ServerEventSubmissionModel.countDocuments({
      eventId: event._id,
      userId: interaction.user.id,
      status: { $in: ["pending", "approved"] },
    });

    if (used >= event.maxUserSubmissions) {
      await interaction.editReply(
        "You have reached the submission limit for this event.",
      );
      return;
    }

    const rawFields = event.fields as unknown as {
      label: string;
      component: { type: ComponentType; customId?: string; custom_id?: string };
    }[];

    const entries = rawFields.map((field) => {
      const fieldId = field.component.customId ?? field.component.custom_id ?? "";
      if (field.component.type === ComponentType.FileUpload) {
        const files = interaction.fields.getUploadedFiles(fieldId);
        return {
          label: field.label,
          customId: fieldId,
          kind: "file" as const,
          fileUrls: files ? [...files.values()].map((file) => file.url) : [],
        };
      }

      let text = "";
      try {
        text = interaction.fields.getTextInputValue(fieldId);
      } catch {}
      return {
        label: field.label,
        customId: fieldId,
        kind: "text" as const,
        text,
      };
    });

    const submission = await ServerEventSubmissionModel.create({
      guildId: event.guildId,
      eventId: event._id,
      userId: interaction.user.id,
      status: "pending",
      entries,
    });

    const config = await ServerEventConfigModel.findOne({ guildId: event.guildId });
    const staffChannel = config?.staffApprovalChannelId
      ? await interaction.guild?.channels
          .fetch(config.staffApprovalChannelId)
          .catch(() => null)
      : null;

    if (
      !staffChannel ||
      staffChannel.type !== ChannelType.GuildText ||
      !staffChannel.isSendable()
    ) {
      await submission.deleteOne();
      await interaction.editReply("Submissions are not configured for this event yet.");
      return;
    }

    let staffMessage;
    try {
      staffMessage = await staffChannel.send({
        content: `New submission for \`${event.name}\` from <@${interaction.user.id}>`,
        embeds: [ServerEventUtility.submissionEmbed(event, submission)],
        files: ServerEventUtility.submissionFiles(submission),
        components: [ServerEventUtility.staffRow(submission.id)],
      });
    } catch {
      await submission.deleteOne();
      await interaction.editReply("Couldn't post your submission for review.");
      return;
    }

    submission.staffMessageId = staffMessage.id;
    await submission.save();

    await interaction.editReply(`Submitted to \`${event.name}\`.`);
  }
}
