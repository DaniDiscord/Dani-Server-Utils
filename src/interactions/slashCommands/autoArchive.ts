import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ForumChannel,
  PermissionsBitField,
} from "discord.js";
import {
  AutoArchiveForumBlacklistModel,
  AutoArchiveForumModel,
} from "models/AutoArchive";

import { CustomApplicationCommand } from "lib/core/command";
import { DsuClient } from "lib/core/DsuClient";
import { PermissionLevels } from "types/commands";
import { TimeParserUtility } from "../../utilities/timeParser";

export default class AutoArchive extends CustomApplicationCommand {
  constructor(client: DsuClient) {
    super("autoarchive", client, {
      type: ApplicationCommandType.ChatInput,
      permissionLevel: PermissionLevels.HELPER,
      description: "Manage auto-archiving for forum channels.",
      applicationData: [
        {
          name: "add",
          type: ApplicationCommandOptionType.Subcommand,
          description:
            "Add a channel to the auto-archive list with an expiration duration.",
          level: PermissionLevels.HELPER,
          options: [
            {
              name: "channel",
              description: "The forum channel to add.",
              required: true,
              type: ApplicationCommandOptionType.Channel,
              channel_types: [ChannelType.GuildForum],
            },
            {
              name: "expire_duration",
              description:
                "The expiration duration (1M is 1 month, 1y is 1 year, etc..).",
              required: true,
              type: ApplicationCommandOptionType.String,
            },
          ],
        },
        {
          name: "remove",
          type: ApplicationCommandOptionType.Subcommand,
          description: "Remove a channel from the auto-archive list.",
          level: PermissionLevels.HELPER,
          options: [
            {
              name: "channel",
              description: "The forum channel to remove.",
              required: true,
              type: ApplicationCommandOptionType.Channel,
              channel_types: [ChannelType.GuildForum],
            },
          ],
        },
        {
          name: "list",
          type: ApplicationCommandOptionType.Subcommand,
          description:
            "List all auto-archiving channels with their expiration durations.",
          level: PermissionLevels.HELPER,
        },
        {
          name: "edit",
          type: ApplicationCommandOptionType.Subcommand,
          description:
            "Edit the expiration duration of an existing auto-archive configuration.",
          level: PermissionLevels.HELPER,
          options: [
            {
              name: "channel",
              description: "The forum channel to edit.",
              required: true,
              type: ApplicationCommandOptionType.Channel,
              channel_types: [ChannelType.GuildForum],
            },
            {
              name: "expire_duration",
              description:
                "The new expiration duration (1M is 1 month, 1y is 1 year, etc..).",
              required: true,
              type: ApplicationCommandOptionType.String,
            },
          ],
        },
        {
          name: "blacklist",
          type: ApplicationCommandOptionType.SubcommandGroup,
          level: PermissionLevels.HELPER,
          description: "Manage blacklisted threads from auto-archiving",
          options: [
            {
              name: "add",
              type: ApplicationCommandOptionType.Subcommand,
              description: "Add a thread to the auto-archive blacklist",
              options: [
                {
                  name: "thread_id",
                  description: "The ID of the thread to blacklist",
                  required: true,
                  type: ApplicationCommandOptionType.String,
                },
              ],
            },
            {
              name: "remove",
              type: ApplicationCommandOptionType.Subcommand,
              description: "Remove a thread from the auto-archive blacklist",
              options: [
                {
                  name: "thread_id",
                  description: "The ID of the thread to remove from blacklist",
                  required: true,
                  type: ApplicationCommandOptionType.String,
                },
              ],
            },
          ],
        },
      ],
      defaultMemberPermissions: new PermissionsBitField("Administrator"),
    });
  }
  async run(interaction: ChatInputCommandInteraction) {
    const subcommandGroup = interaction.options.getSubcommandGroup();
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const embed = new EmbedBuilder().setTitle("Auto-Archive Management");

    if (subcommandGroup === "blacklist") {
      switch (subcommand) {
        case "add": {
          const threadId = interaction.options.getString("thread_id", true);

          const thread = await interaction.guild?.channels.fetch(threadId);
          if (!thread?.isThread()) {
            return await interaction.reply({
              embeds: [
                embed
                  .setTitle("Invalid Thread")
                  .setDescription("Could not find a thread with that ID")
                  .setColor("Red"),
              ],
            });
          }

          await AutoArchiveForumBlacklistModel.findOneAndUpdate(
            { guildId },
            { $addToSet: { threads: threadId } },
            { upsert: true, new: true },
          );

          return await interaction.reply({
            embeds: [
              embed
                .setDescription(
                  `Thread ${thread.toString()} (ID: \`${threadId}\`) has been blacklisted`,
                )
                .setColor("Green"),
            ],
          });
        }

        case "remove": {
          const threadId = interaction.options.getString("thread_id", true);

          const result = await AutoArchiveForumBlacklistModel.findOneAndUpdate(
            { guildId, threads: threadId },
            { $pull: { threads: threadId } },
            { new: true },
          );

          if (!result) {
            return await interaction.reply({
              embeds: [
                embed
                  .setDescription(`Thread ID \`${threadId}\` is not in the blacklist`)
                  .setColor("Red"),
              ],
            });
          }

          if (result.threads.length === 0) {
            await AutoArchiveForumBlacklistModel.deleteOne({ guildId });
          }

          return await interaction.reply({
            embeds: [
              embed
                .setDescription(
                  `Thread ID \`${threadId}\` has been removed from the blacklist`,
                )
                .setColor("Green"),
            ],
          });
        }

        default:
          return await interaction.reply({
            embeds: [
              embed.setDescription("Invalid blacklist subcommand").setColor("Red"),
            ],
          });
      }
    }

    switch (subcommand) {
      case "add": {
        const channel: ForumChannel = interaction.options.getChannel("channel", true);
        const expireDuration = interaction.options.getString("expire_duration", true);

        if (!channel.isThreadOnly()) {
          return await interaction.reply({
            embeds: [
              embed
                .setTitle("Invalid Channel")
                .setDescription("The selected channel is not a forum channel.")
                .setColor("Red"),
            ],
          });
        }

        let config = await AutoArchiveForumModel.findOne({ guildId });
        if (!config) {
          config = new AutoArchiveForumModel({ guildId, channels: [] });
        }

        const existingChannel = config.channels.find((ch) => ch.channelId === channel.id);
        if (existingChannel) {
          return await interaction.reply({
            embeds: [
              embed
                .setDescription(`Channel ${channel} is already in the list.`)
                .setColor("Red"),
            ],
          });
        }

        config.channels.push({
          channelId: channel.id,
          expireDuration: TimeParserUtility.parseDuration(expireDuration.toString()),
        });
        await config.save();

        return await interaction.reply({
          embeds: [
            embed
              .setDescription(
                `Channel ${channel} has been added to the auto-archive list with an expiration duration of ${expireDuration}.`,
              )
              .setColor("Green"),
          ],
        });
      }

      case "remove": {
        const channel: ForumChannel = interaction.options.getChannel("channel", true);

        if (!channel.isThreadOnly()) {
          return await interaction.reply({
            embeds: [
              embed
                .setTitle("Invalid Channel")
                .setDescription("The selected channel is not a forum channel.")
                .setColor("Red"),
            ],
          });
        }

        const config = await AutoArchiveForumModel.findOne({ guildId });
        if (!config) {
          return await interaction.reply({
            embeds: [
              embed
                .setDescription("No auto-archive configuration found for this guild.")
                .setColor("Red"),
            ],
          });
        }

        const channelIndex = config.channels.findIndex(
          (ch) => ch.channelId === channel.id,
        );
        if (channelIndex === -1) {
          return await interaction.reply({
            embeds: [
              embed
                .setDescription(`Channel ${channel} is not in the auto-archive list.`)
                .setColor("Red"),
            ],
          });
        }

        config.channels.splice(channelIndex, 1);
        await config.save();

        return await interaction.reply({
          embeds: [
            embed
              .setDescription(
                `Channel ${channel} has been removed from the auto-archive list.`,
              )
              .setColor("Green"),
          ],
        });
      }

      case "list": {
        const config = await AutoArchiveForumModel.findOne({ guildId });
        if (!config || !config.channels.length) {
          return await interaction.reply({
            embeds: [
              embed
                .setDescription("There are no channels configured for auto-archive.")
                .setColor("Red"),
            ],
          });
        }

        const channelsList = config.channels
          .map(
            (ch) =>
              `<#${
                ch.channelId
              }> - Expire after ${TimeParserUtility.parseDurationToString(
                ch.expireDuration,
              )}`,
          )
          .join("\n");

        return await interaction.reply({
          embeds: [
            embed
              .setDescription(`List of auto-archive channels:\n${channelsList}`)
              .setColor("Blue"),
          ],
        });
      }

      case "edit": {
        const channel: ForumChannel = interaction.options.getChannel("channel", true);
        const expireDuration = interaction.options.getString("expire_duration", true);

        if (!channel.isThreadOnly()) {
          return await interaction.reply({
            embeds: [
              embed
                .setTitle("Invalid Channel")
                .setDescription("The selected channel is not a forum channel.")
                .setColor("Red"),
            ],
          });
        }

        const config = await AutoArchiveForumModel.findOne({ guildId });
        if (!config) {
          return await interaction.reply({
            embeds: [
              embed
                .setDescription("No auto-archive configuration found for this guild.")
                .setColor("Red"),
            ],
          });
        }

        const existingChannel = config.channels.find((ch) => ch.channelId === channel.id);

        if (!existingChannel) {
          return await interaction.reply({
            embeds: [
              embed
                .setDescription(`Channel ${channel} is not in the auto-archive list.`)
                .setColor("Red"),
            ],
          });
        }

        existingChannel.expireDuration = TimeParserUtility.parseDuration(
          expireDuration.toString(),
        );
        await config.save();

        return await interaction.reply({
          embeds: [
            embed
              .setDescription(
                `Channel ${channel} has been updated with a new expiration duration of ${expireDuration}.`,
              )
              .setColor("Green"),
          ],
        });
      }

      default:
        return await interaction.reply({
          embeds: [
            embed.setDescription("Invalid subcommand. Please try again.").setColor("Red"),
          ],
          flags: "Ephemeral",
        });
    }
  }
}
