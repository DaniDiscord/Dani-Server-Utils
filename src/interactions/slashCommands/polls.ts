import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
} from "discord.js";
import { CustomApplicationCommand } from "lib/core/command";
import { DsuClient } from "lib/core/DsuClient";
import { SettingsModel } from "models/Settings";

export default class PollsCommand extends CustomApplicationCommand {
  constructor(client: DsuClient) {
    super("polls", client, {
      type: ApplicationCommandType.ChatInput,
      description: "Enable/disable polls in channels",
      permissionLevel: "USER",
      applicationData: [
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

  async run(interaction: ChatInputCommandInteraction) {
    const permLevel = this.client.getPermLevel(
      undefined,
      interaction.member as GuildMember
    );

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
          interaction.settings._id as string,
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
          embeds: [
            this.client.utils.getUtility("default").generateEmbed("error", {
              title: "Invalid Arguments",
              description: "Polls are already enabled.",
            }),
          ],
        });
      }
    } else if (subcmd == "disable") {
      if (interaction.settings.pollsAllowed.includes(channel.id)) {
        this.client.settings.set(
          interaction.settings._id as string,
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
          embeds: [
            this.client.utils.getUtility("default").generateEmbed("error", {
              title: "Invalid Arguments",
              description: "Polls are already disabled.",
            }),
          ],
        });
      }
    }

    return {};
  }
}
