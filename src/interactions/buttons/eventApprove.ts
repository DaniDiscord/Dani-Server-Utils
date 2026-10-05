import { ButtonInteraction, ChannelType, MessageFlags } from "discord.js";
import { ServerEventConfigModel, ServerEventModel } from "models/ServerEvent";
import { Button } from "lib/core/command";
import { DsuClient } from "lib/core/DsuClient";
import { EMOJI_APPROVE, EMOJI_DENY } from "types/constants/emoji";
import { PermissionLevels } from "types/commands";
import { ServerEventSubmissionModel } from "models/ServerEventSubmission";
import { ServerEventUtility } from "../../utilities/serverEvent";

export default class EventApprove extends Button {
  constructor(client: DsuClient) {
    super("event-approve", client, {
      permissionLevel: PermissionLevels.MODERATOR,
      global: true,
    });
  }

  public async run(interaction: ButtonInteraction) {
    const submissionId = interaction.customId.slice("event-approve-".length);
    const submission = await ServerEventSubmissionModel.findById(submissionId);

    if (!submission || submission.status !== "pending") {
      await interaction.reply({
        content: "That submission has already been handled.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const event = await ServerEventModel.findById(submission.eventId);

    if (!event || !event.started) {
      await interaction.reply({
        content: "That event is not running.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const config = await ServerEventConfigModel.findOne({ guildId: event.guildId });
    if (!config || interaction.channelId !== config.staffApprovalChannelId) return;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const voteChannel = config.votingChannelId
      ? await interaction.guild?.channels.fetch(config.votingChannelId).catch(() => null)
      : null;

    if (
      !voteChannel ||
      voteChannel.type !== ChannelType.GuildText ||
      !voteChannel.isSendable()
    ) {
      await interaction.editReply("Voting channel is not set up.");
      return;
    }

    const voteMessage = await voteChannel.send({
      content: `<@${submission.userId}>'s submission for \`${event.name}\``,
      embeds: [ServerEventUtility.submissionEmbed(event, submission)],
      files: ServerEventUtility.submissionFiles(submission),
    });

    await voteMessage.react(EMOJI_APPROVE);
    await voteMessage.react(EMOJI_DENY);

    submission.status = "approved";
    submission.voteMessageId = voteMessage.id;
    await submission.save();

    await interaction.message
      .edit({
        content: `${interaction.message.content}\nApproved by <@${interaction.user.id}>`,
        components: [],
      })
      .catch(() => {});

    await interaction.editReply("Sent to voting.");
  }
}
