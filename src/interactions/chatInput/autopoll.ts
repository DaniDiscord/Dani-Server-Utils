import {
  ApplicationCommandOptionType,
  CacheType,
  ChatInputCommandInteraction,
  CommandInteraction,
  PermissionsBitField,
} from "discord.js";
import {
  CustomInteractionReplyOptions,
  InteractionCommand,
} from "../../classes/CustomInteraction";

import { ApplicationCommandType } from "discord-api-types/v10";
import { CustomClient } from "lib/client";

const add = "add";
const remove = "remove";
const channel = "channel";
const role = "role";

export default class SlashCommand extends InteractionCommand {
  /**
   *
   */
  constructor(client: CustomClient) {
    super(client, {
      type: ApplicationCommandType.ChatInput,
      name: "autopoll",
      description: "Set up automatic polls",
      options: [
        {
          description: "Add a channel",
          name: add + channel,
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              description: "Channel",
              name: channel,
              type: ApplicationCommandOptionType.Channel,
              required: true,
            },
          ],
        },
        {
          description: "Add a role",
          name: add + role,
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              description: "Role",
              name: role,
              type: ApplicationCommandOptionType.Role,
              required: true,
            },
          ],
        },
        {
          description: "Remove a channel",
          name: remove + channel,
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              description: "Channel",
              name: channel,
              type: ApplicationCommandOptionType.Channel,
              required: true,
            },
          ],
        },
        {
          description: "Remove a role",
          name: remove + role,
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              description: "Role",
              name: role,
              type: ApplicationCommandOptionType.Role,
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
      return { content: "Internal Error", eph: true };
    }
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    let channelId;
    let roleId;
    switch (subcommand) {
      case add + channel:
        channelId = interaction.options.get(channel, true)?.value;
        if (typeof channelId !== "string") {
          return { content: "Internal Error (Type mismatch)", eph: true };
        }
        await this.client.addAutoPollChannel(guildId, channelId);
        break;
      case remove + channel:
        channelId = interaction.options.get(channel, true)?.value;
        if (typeof channelId !== "string") {
          return { content: "Internal Error (Type mismatch)", eph: true };
        }
        await this.client.removeAutoPollChannel(guildId, channelId);
        break;
      case add + role:
        roleId = interaction.options.get(role, true)?.value;
        if (typeof roleId !== "string") {
          return { content: "Internal Error (Type mismatch)", eph: true };
        }
        await this.client.addClosePollRole(guildId, roleId);
        break;
      case remove + role:
        roleId = interaction.options.get(role, true)?.value;
        if (typeof roleId !== "string") {
          return { content: "Internal Error (Type mismatch)", eph: true };
        }
        await this.client.removeClosePollRole(guildId, roleId);
        break;
      default:
        return { content: "Internal Error (Command not recognized)", eph: true };
    }
    return { content: "Successfully updated Autopoll", eph: true };
  }
}
