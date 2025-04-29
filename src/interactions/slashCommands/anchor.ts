import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionsBitField,
  TextChannel,
} from "discord.js";

import { AnchorModel } from "models/Anchor";
import { CustomApplicationCommand } from "lib/core/command";
import { DsuClient } from "lib/core/DsuClient";
import { PermissionLevels } from "types/commands";

export default class AnchorCommand extends CustomApplicationCommand {
  constructor(client: DsuClient) {
    super("anchor", client, {
      type: ApplicationCommandType.ChatInput,
      description: "Manage anchored messages",
      applicationData: [
        {
          name: "add",
          description: "Add a new anchor",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "message",
              description:
                "The message link to anchor (https://discord.com/channels/<guild>/<channel>/<message>)",
              type: ApplicationCommandOptionType.String,
              required: true,
            },
            {
              name: "message_threshold",
              description:
                "How many messages must be sent before re-anchoring (default: 1)",
              type: ApplicationCommandOptionType.Number,
              required: false,
            },
            {
              name: "time_threshold",
              description: "Minimum minutes before re-anchoring (ex: 5m, 1h, 2d)",
              type: ApplicationCommandOptionType.String,
              required: false,
            },
            {
              name: "inactivity_threshold",
              description:
                "Minimum minutes of chat inactivity before re-anchoring (ex: 5m, 1h, 2d)",
              type: ApplicationCommandOptionType.String,
              required: false,
            },
          ],
        },
        {
          name: "list",
          description: "List all anchors for this server",
          type: ApplicationCommandOptionType.Subcommand,
        },
        {
          name: "remove",
          description: "Remove an anchor",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "anchor_id",
              description: "The database ID of the anchor to remove",
              type: ApplicationCommandOptionType.String,
              required: true,
            },
          ],
        },
      ],
      permissionLevel: PermissionLevels.USER,
      defaultMemberPermissions: new PermissionsBitField("Administrator"),
    });
  }

  async run(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;

    const timeParserUtility = this.client.utils.getUtility("timeParser");
    switch (subcommand) {
      case "add": {
        const messageLink = interaction.options.getString("message", true);

        const regex = /\/channels\/(\d+)\/(\d+)\/(\d+)/;
        const match = messageLink.match(regex);
        if (!match) {
          await interaction.reply({ content: "Invalid message link format" });
          return;
        }
        const [, guildIdFromLink, originalChannelId, originalMessageId] = match;
        if (guildIdFromLink !== guildId) {
          await interaction.reply({
            content: "The message link does not belong to this server",
          });
          return;
        }

        let originalChannel;
        try {
          originalChannel = await interaction.client.channels.fetch(originalChannelId);
        } catch (_err) {
          await interaction.reply({
            content: "Unable to fetch the original channel",
          });
          return;
        }

        if (!(originalChannel instanceof TextChannel)) {
          await interaction.reply({
            content: "The original channel is not a text channel",
          });
          return;
        }

        let originalMessage;
        try {
          originalMessage = await originalChannel.messages.fetch(originalMessageId);
        } catch (_) {
          await interaction.reply({
            content: "Unable to fetch the original message",
          });
          return;
        }

        const targetChannelId = originalChannel.id;

        const content = originalMessage.content;
        const embeds =
          originalMessage.embeds.length > 0
            ? originalMessage.embeds.map((e) => e.toJSON())
            : [];

        const messageThreshold = interaction.options.getNumber("message_threshold") ?? 1;
        const timeThreshold = interaction.options.getString("time_threshold") ?? "0s";
        const inactivityThreshold =
          interaction.options.getString("inactivity_threshold") ?? "0s";

        const anchorDoc = new AnchorModel({
          guildId,
          channelId: targetChannelId,
          originalMessageId,
          originalChannelId,
          content,
          embeds,
          config: {
            messageThreshold,
            timeThreshold: timeParserUtility.parseDuration(timeThreshold),
            inactivityThreshold: timeParserUtility.parseDuration(inactivityThreshold),
          },
        });

        try {
          await anchorDoc.save();
        } catch (_) {
          await interaction.reply({ content: "Failed to add the anchor" });
          return;
        }
        await interaction.reply({
          content: `Anchor added with ID \`${anchorDoc._id}\``,
        });
        return;
      }

      case "list": {
        const anchors = await AnchorModel.find({ guildId });
        if (anchors.length === 0) {
          await interaction.reply({
            content: "No anchors set up for this server",
          });
          return;
        }

        const embed = new EmbedBuilder().setTitle("Anchors");
        anchors.forEach((anchor) => {
          embed.addFields({
            name: `ID: ${anchor._id}`,
            value:
              `**Target Channel:** <#${anchor.channelId}>\n` +
              `**Original Message:** [Jump Link](https://discord.com/channels/${guildId}/${anchor.originalChannelId}/${anchor.originalMessageId})\n` +
              `**Config:**\n` +
              `Message Threshold: ${anchor.config.messageThreshold} message\n` +
              `\tTime Threshold: ${timeParserUtility.parseDurationToString(
                anchor.config.timeThreshold,
              )}\n` +
              `\tInactivity Threshold: ${timeParserUtility.parseDurationToString(
                anchor.config.inactivityThreshold,
              )}`,
          });
        });
        await interaction.reply({ embeds: [embed] });
        return;
      }

      case "remove": {
        const anchorId = interaction.options.getString("anchor_id", true);
        const result = await AnchorModel.deleteOne({ _id: anchorId, guildId });
        if (result.deletedCount === 0) {
          await interaction.reply({
            content: "Anchor not found or already removed",
          });
          return;
        }
        await interaction.reply({ content: "Anchor removed successfully" });
        return;
      }

      default: {
        await interaction.reply({ content: "Unknown subcommand" });
        return;
      }
    }
  }
}
