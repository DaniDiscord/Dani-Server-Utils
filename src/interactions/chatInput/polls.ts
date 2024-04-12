import {
  ApplicationCommandOptionType,
  CacheType,
  ChannelType,
  ChatInputCommandInteraction,
  CommandInteraction,
  EmbedBuilder,
} from "discord.js";
import {
  CustomInteractionReplyOptions,
  InteractionCommand,
} from "../../classes/CustomInteraction";

import { ApplicationCommandType } from "discord-api-types/v10";
import { CustomClient } from "lib/client";
import { SettingsModel } from "models/Settings";

export default class SlashCommand extends InteractionCommand {
  constructor(client: CustomClient) {
    super(client, {
      type: ApplicationCommandType.ChatInput,
      name: "polls",
      description: "Enable/disable polls in channels.",
      options: [
        {
          name: "enable",
          description: "Enable polls in a channel.",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "channel",
              description: "The channel.",
              required: true,
              type: ApplicationCommandOptionType.Channel,
              channelTypes: [
                ChannelType.GuildText,
                ChannelType.GuildVoice,
                ChannelType.GuildForum,
                ChannelType.GuildAnnouncement,
                ChannelType.PublicThread,
              ],
            },
          ],
        },
        {
          name: "disable",
          description: "Disable polls in a channel.",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "channel",
              description: "The channel.",
              required: true,
              type: ApplicationCommandOptionType.Channel,
              channelTypes: [
                ChannelType.GuildText,
                ChannelType.GuildVoice,
                ChannelType.GuildForum,
                ChannelType.GuildAnnouncement,
                ChannelType.PublicThread,
              ],
            },
          ],
        },
      ],
      defaultMemberPermissions: "Administrator",
    });
  }

  async execute(
    interaction: CommandInteraction<CacheType>
  ): Promise<CustomInteractionReplyOptions> {
    if (!(interaction instanceof ChatInputCommandInteraction)) {
      return { content: "Internal Error", eph: true };
    }

    const permLevel = this.client.permlevel(undefined, interaction.member);

    if (permLevel < 4) {
      return { content: "Insufficient Permissions", eph: true };
    }

    const subcmd = interaction.options.getSubcommand();
    const channel = interaction.options.getChannel("channel", true, [
      ChannelType.GuildText,
      ChannelType.GuildVoice,
      ChannelType.GuildForum,
      ChannelType.GuildAnnouncement,
      ChannelType.PublicThread,
    ]);

    if (subcmd == "enable") {
      if (!interaction.settings.pollsAllowed.includes(channel.id)) {
        this.client.settings.set(
          interaction.settings._id,
          await SettingsModel.findOneAndUpdate(
            { _id: interaction.settings._id },
            { $push: { pollsAllowed: channel.id }, toUpdate: true },
            { upsert: true, setDefaultsOnInsert: true, new: true }
          )
        );

        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(`Enabled polls in ${channel}`)
              .setColor("Green"),
          ],
        });
      } else {
        await interaction.reply({
          embeds: [this.client.errEmb(2, `Polls are already enabled in ${channel}`)],
        });
      }
    } else if (subcmd == "disable") {
      if (interaction.settings.pollsAllowed.includes(channel.id)) {
        this.client.settings.set(
          interaction.settings._id,
          await SettingsModel.findOneAndUpdate(
            { _id: interaction.settings._id },
            { $pull: { pollsAllowed: channel.id }, toUpdate: true },
            { upsert: true, setDefaultsOnInsert: true, new: true }
          )
        );

        await interaction.reply({
          embeds: [
            new EmbedBuilder()
              .setDescription(`Disabled polls in ${channel}`)
              .setColor("Green"),
          ],
        });
      } else {
        await interaction.reply({
          embeds: [this.client.errEmb(2, `Polls are already disabled in ${channel}`)],
        });
      }
    }

    return {};
  }
}
