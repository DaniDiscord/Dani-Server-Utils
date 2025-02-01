import {
  ApplicationCommandOptionType,
  CacheType,
  ChatInputCommandInteraction,
  CommandInteraction,
  EmbedBuilder,
  PermissionsBitField,
  TextChannel,
} from "discord.js";
import {
  CustomInteractionReplyOptions,
  InteractionCommand,
} from "../../classes/CustomInteraction";
import { parseDuration, parseDurationToString } from "lib/timeParser";

import { AnchorModel } from "../../models/Anchor";
import { ApplicationCommandType } from "discord-api-types/v10";

export default class SlashCommand extends InteractionCommand {
  constructor(client: any) {
    super(client, {
      type: ApplicationCommandType.ChatInput,
      name: "anchor",
      description: "Manage anchored messages",
      options: [
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
      defaultMemberPermissions: new PermissionsBitField("Administrator"),
    });
  }

  async execute(
    interaction: CommandInteraction<CacheType>
  ): Promise<CustomInteractionReplyOptions> {
    if (!(interaction instanceof ChatInputCommandInteraction)) {
      return { content: "Internal error" };
    }

    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    if (!guildId) {
      return { content: "This command can only be used in a server" };
    }

    switch (subcommand) {
      case "add": {
        const messageLink = interaction.options.getString("message", true);

        // Parse the message link (expected format: /channels/<guildId>/<channelId>/<messageId>)
        const regex = /\/channels\/(\d+)\/(\d+)\/(\d+)/;
        const match = messageLink.match(regex);
        if (!match) {
          return { content: "Invalid message link format" };
        }
        const [, guildIdFromLink, originalChannelId, originalMessageId] = match;
        if (guildIdFromLink !== guildId) {
          return {
            content: "The message link does not belong to this server",
          };
        }

        let originalChannel;
        try {
          originalChannel = await interaction.client.channels.fetch(originalChannelId);
        } catch (err) {
          return { content: "Unable to fetch the original channel" };
        }

        if (!(originalChannel instanceof TextChannel)) {
          return { content: "The original channel is not a text channel" };
        }

        let originalMessage;
        try {
          originalMessage = await originalChannel.messages.fetch(originalMessageId);
        } catch (err) {
          return { content: "Unable to fetch the original message" };
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
            timeThreshold: parseDuration(timeThreshold),
            inactivityThreshold: parseDuration(inactivityThreshold),
          },
        });

        try {
          await anchorDoc.save();
        } catch (err) {
          return { content: "Failed to add the anchor" };
        }
        return { content: `Anchor added with ID \`${anchorDoc._id}\`` };
      }

      case "list": {
        const anchors = await AnchorModel.find({ guildId });
        if (anchors.length === 0) {
          return { content: "No anchors set up for this server" };
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
              `\tTime Threshold: ${parseDurationToString(
                anchor.config.timeThreshold
              )}\n` +
              `\tInactivity Threshold: ${parseDurationToString(
                anchor.config.inactivityThreshold
              )}`,
          });
        });
        return { embeds: [embed] };
      }

      case "remove": {
        const anchorId = interaction.options.getString("anchor_id", true);
        const result = await AnchorModel.deleteOne({ _id: anchorId, guildId });
        if (result.deletedCount === 0) {
          return { content: "Anchor not found or already removed" };
        }
        return { content: "Anchor removed successfully" };
      }

      default:
        return { content: "Unknown subcommand" };
    }
  }
}
