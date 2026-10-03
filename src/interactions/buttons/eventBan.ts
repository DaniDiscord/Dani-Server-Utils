import {
  ButtonInteraction,
  LabelBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { ServerEventConfigModel, ServerEventModel } from "models/ServerEvent";
import { Button } from "lib/core/command";
import { DsuClient } from "lib/core/DsuClient";
import { PermissionLevels } from "types/commands";
import { ServerEventSubmissionModel } from "models/ServerEventSubmission";
import { Times } from "types/index";

export default class EventBan extends Button {
  constructor(client: DsuClient) {
    super("event-ban", client, {
      permissionLevel: PermissionLevels.MODERATOR,
      global: true,
    });
  }

  public async run(interaction: ButtonInteraction) {
    const submissionId = interaction.customId.slice("event-ban-".length);
    const submission = await ServerEventSubmissionModel.findById(submissionId);

    if (!submission) {
      await interaction.reply({
        content: "That submission no longer exists.",
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

    if (event.bannedUsers.some((ban) => ban.userId === submission.userId)) {
      await interaction.reply({
        content: "That user is already banned from this event.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const reasonId = "ban-reason";
    const modalId = `event-ban-${submission.id}`;
    const modal = new ModalBuilder()
      .setCustomId(modalId)
      .setTitle(`Ban from ${event.name.slice(0, 36)}`)
      .addLabelComponents(
        new LabelBuilder({ label: "Reason" }).setTextInputComponent(
          new TextInputBuilder()
            .setCustomId(reasonId)
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true),
        ),
      );

    await interaction.showModal(modal);

    const submitted = await interaction
      .awaitModalSubmit({
        time: Times.MINUTE,
        filter: (i) => i.user.id === interaction.user.id && i.customId === modalId,
      })
      .catch(() => null);

    if (!submitted) return;

    await submitted.deferReply({ flags: MessageFlags.Ephemeral });

    const reason = submitted.fields.getTextInputValue(reasonId);

    event.bannedUsers.push({ userId: submission.userId, reason });
    await event.save();

    await ServerEventSubmissionModel.updateMany(
      { eventId: event._id, userId: submission.userId, status: "pending" },
      { status: "denied" },
    );

    const member = await interaction.guild?.members
      .fetch(submission.userId)
      .catch(() => null);
    await member
      ?.send(`You were banned from \`${event.name}\`: ${reason}`)
      .catch(() => {});

    await interaction.message
      .edit({
        content:
          `${interaction.message.content}\n` +
          `<@${submission.userId}> banned by <@${interaction.user.id}>: ${reason}`,
        components: [],
      })
      .catch(() => {});

    await submitted.editReply(
      `<@${submission.userId}> banned from \`${event.name}\`: ${reason}`,
    );
  }
}
