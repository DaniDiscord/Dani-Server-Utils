import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ChannelType,
} from "discord-api-types/v10";
import {
  CacheType,
  ChatInputCommandInteraction,
  CommandInteraction,
  PermissionsBitField,
} from "discord.js";
import {
  CustomInteractionReplyOptions,
  InteractionCommand,
} from "../../classes/CustomInteraction";

import { CustomClient } from "lib/client";

export default class PhraseCommand extends InteractionCommand {
  /**
   *
   */
  constructor(client: CustomClient) {
    super(client, {
      type: ApplicationCommandType.ChatInput,
      name: "phrase",
      description: "Set, configure, or block phrases.",
      options: [
        {
          name: "set",
          description: "Configure phrase settings",
          type: ApplicationCommandOptionType.SubcommandGroup,
          options: [
            {
              name: "phrase",
              description: "The phrase to append",
              type: ApplicationCommandOptionType.Subcommand,
              options: [
                {
                  name: "content",
                  description: "The content of the phrase",
                  type: ApplicationCommandOptionType.String,
                  required: true,
                },
                {
                  name: "threshold",
                  description:
                    "A percentage amount the message content must match the phrase.",
                  type: ApplicationCommandOptionType.Integer,
                  required: true,
                  min_value: 0,
                  max_value: 100,
                },
              ],
            },
            {
              name: "log_channel",
              description: "The channel to log to.",
              type: ApplicationCommandOptionType.Subcommand,
              options: [
                {
                  name: "channel",
                  description: "The channel to log to",
                  type: ApplicationCommandOptionType.Channel,
                  channel_types: [ChannelType.GuildText],
                  required: true,
                },
              ],
            },
          ],
        },
        {
          name: "remove",
          description: "Remove a phrase from the blacklist.",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "phrase_id",
              description: "The phrase id to remove",
              required: true,
              type: ApplicationCommandOptionType.String,
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
    const setSubcommand = interaction.options.getSubcommandGroup();

    return {
      content: "Hello world",
    };
  }
}
