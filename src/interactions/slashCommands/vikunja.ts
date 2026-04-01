import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ChannelType,
  ChatInputCommandInteraction
} from "discord.js";

import { CustomApplicationCommand } from "lib/core/command";
import { DsuClient } from "lib/core/DsuClient";
import { PermissionLevels } from "types/commands";
import { SettingsModel } from "models/Settings.ts";
import { ISettings } from "types/mongodb.ts";

export default class Vikunja extends CustomApplicationCommand {
  constructor(client: DsuClient) {
    super("vikunja", client, {
      description: "Manage connection to Vikunja.",
      type: ApplicationCommandType.ChatInput,
      permissionLevel: PermissionLevels.ADMINISTRATOR,
      applicationData: [
        {
          name: "parent",
          description: "Configure the parent channel",
          type: ApplicationCommandOptionType.Subcommand,
          level: PermissionLevels.ADMINISTRATOR,
          options: [
            {
              name: "set",
              description: "Set the parent channel for the client.",
              type: ApplicationCommandOptionType.Channel,
              channel_types: [ChannelType.GuildForum],
              required: true,
            },
          ],
        },
      ],
    });
  }

  async run(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();


    switch(subcommand) {
      case "parent": {
        const channel = interaction.options.getChannel('set', true, [ChannelType.GuildForum])
        await this.updateVikunja(interaction, this.client, { forumChannelId: channel.id });
        await interaction.reply(`Updated parent forum channel to ${channel.name}`)
        return;
      }
      default: {
        await interaction.reply({ content: "No option" })
        return;
      }
    }
  }


  private async updateVikunja(
    interaction: ChatInputCommandInteraction,
    client: DsuClient,
    newSettings: ISettings["vikunja"],
  ): Promise<void> {
    const guildId = interaction.guildId!;
    await SettingsModel.findByIdAndUpdate(
      guildId,
      { $set: { vikunja: newSettings } },
      { upsert: true },
    );

    const settings = client.settings.get(guildId);
    if (settings) {
      settings.vikunja = newSettings;
      client.settings.set(guildId, settings);
    }
  }
}
