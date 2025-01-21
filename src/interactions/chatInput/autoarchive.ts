import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ChannelType,
} from "discord-api-types/v10";
import {
  CacheType,
  ChatInputCommandInteraction,
  CommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { parseDuration, parseDurationToString } from "lib/timeParser";

import { AutoArchiveForumModel } from "models/AutoArchive";
import { CustomClient } from "lib/client";
import { InteractionCommand } from "classes/CustomInteraction";

export default class SlashCommand extends InteractionCommand {
  constructor(client: CustomClient) {
    super(client, {
      type: ApplicationCommandType.ChatInput,
      name: "autoarchive",
      description: "Manage auto-archiving for forum channels.",
      options: [
        {
          name: "add",
          type: ApplicationCommandOptionType.Subcommand,
          description:
            "Add a channel to the auto-archive list with an expiration duration.",
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
        },
        {
          name: "edit",
          type: ApplicationCommandOptionType.Subcommand,
          description:
            "Edit the expiration duration of an existing auto-archive configuration.",
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
      ],
    });
  }

  async execute(interaction: CommandInteraction<CacheType>) {
    if (!(interaction instanceof ChatInputCommandInteraction)) {
      return { content: "Internal Error", eph: true };
    }

    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    const embed = new EmbedBuilder().setTitle("Auto-Archive Management");

    switch (subcommand) {
      case "add": {
        const channel = interaction.options.getChannel("channel", true);
        const expireDuration = interaction.options.getString("expire_duration", true);

        if (!channel.isThreadOnly()) {
          return {
            embeds: [
              embed
                .setTitle("Invalid Channel")
                .setDescription("The selected channel is not a forum channel.")
                .setColor("Red"),
            ],
          };
        }

        let config = await AutoArchiveForumModel.findOne({ guildId });
        if (!config) {
          config = new AutoArchiveForumModel({ guildId, channels: [] });
        }

        const existingChannel = config.channels.find((ch) => ch.channelId === channel.id);
        if (existingChannel) {
          return {
            embeds: [
              embed
                .setDescription(`Channel ${channel} is already in the list.`)
                .setColor("Red"),
            ],
          };
        }

        config.channels.push({
          channelId: channel.id,
          expireDuration: parseDuration(expireDuration.toString()),
        });
        await config.save();

        return {
          embeds: [
            embed
              .setDescription(
                `Channel ${channel} has been added to the auto-archive list with an expiration duration of ${expireDuration}.`
              )
              .setColor("Green"),
          ],
        };
      }

      case "remove": {
        const channel = interaction.options.getChannel("channel", true);

        if (!channel.isThreadOnly()) {
          return {
            embeds: [
              embed
                .setTitle("Invalid Channel")
                .setDescription("The selected channel is not a forum channel.")
                .setColor("Red"),
            ],
          };
        }

        const config = await AutoArchiveForumModel.findOne({ guildId });
        if (!config) {
          return {
            embeds: [
              embed
                .setDescription("No auto-archive configuration found for this guild.")
                .setColor("Red"),
            ],
          };
        }

        const channelIndex = config.channels.findIndex(
          (ch) => ch.channelId === channel.id
        );
        if (channelIndex === -1) {
          return {
            embeds: [
              embed
                .setDescription(`Channel ${channel} is not in the auto-archive list.`)
                .setColor("Red"),
            ],
          };
        }

        config.channels.splice(channelIndex, 1);
        await config.save();

        return {
          embeds: [
            embed
              .setDescription(
                `Channel ${channel} has been removed from the auto-archive list.`
              )
              .setColor("Green"),
          ],
        };
      }

      case "list": {
        const config = await AutoArchiveForumModel.findOne({ guildId });
        if (!config || !config.channels.length) {
          return {
            embeds: [
              embed
                .setDescription("There are no channels configured for auto-archive.")
                .setColor("Red"),
            ],
          };
        }

        const channelsList = config.channels
          .map(
            (ch) =>
              `<#${ch.channelId}> - Expire after ${parseDurationToString(
                ch.expireDuration
              )}`
          )
          .join("\n");

        return {
          embeds: [
            embed
              .setDescription(`List of auto-archive channels:\n${channelsList}`)
              .setColor("Blue"),
          ],
        };
      }

      case "edit": {
        const channel = interaction.options.getChannel("channel", true);
        const expireDuration = interaction.options.getString("expire_duration", true);

        if (!channel.isThreadOnly()) {
          return {
            embeds: [
              embed
                .setTitle("Invalid Channel")
                .setDescription("The selected channel is not a forum channel.")
                .setColor("Red"),
            ],
          };
        }

        const config = await AutoArchiveForumModel.findOne({ guildId });
        if (!config) {
          return {
            embeds: [
              embed
                .setDescription("No auto-archive configuration found for this guild.")
                .setColor("Red"),
            ],
          };
        }

        const existingChannel = config.channels.find((ch) => ch.channelId === channel.id);

        if (!existingChannel) {
          return {
            embeds: [
              embed
                .setDescription(`Channel ${channel} is not in the auto-archive list.`)
                .setColor("Red"),
            ],
          };
        }

        existingChannel.expireDuration = parseDuration(expireDuration.toString());
        await config.save();

        return {
          embeds: [
            embed
              .setDescription(
                `Channel ${channel} has been updated with a new expiration duration of ${expireDuration}.`
              )
              .setColor("Green"),
          ],
        };
      }

      default:
        return {
          embeds: [
            embed.setDescription("Invalid subcommand. Please try again.").setColor("Red"),
          ],
          eph: true,
        };
    }
  }
}
