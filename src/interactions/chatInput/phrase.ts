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
  PermissionsBitField,
} from "discord.js";
import {
  CustomInteractionReplyOptions,
  InteractionCommand,
} from "../../classes/CustomInteraction";

import { CustomClient } from "lib/client";
import { PhraseMatcherModel } from "models/PhraseMatcher";

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
        {
          name: "list",
          description: "List all phrases.",
          type: ApplicationCommandOptionType.Subcommand,
        },
      ],
      // defaultMemberPermissions: new PermissionsBitField("Administrator"),
    });
  }

  async execute(
    interaction: CommandInteraction<CacheType>
  ): Promise<CustomInteractionReplyOptions> {
    if (!(interaction instanceof ChatInputCommandInteraction)) {
      return { content: "Internal error" };
    }

    const subcommandGroup = interaction.options.getSubcommandGroup();
    const subcommand = interaction.options.getSubcommand();
    if (subcommandGroup === "set") {
      if (subcommand === "phrase") {
        const content = interaction.options.getString("content", true);
        const threshold = interaction.options.getInteger("threshold", true);
        const phraseId = Math.random().toString(16).substring(2, 12);
        try {
          await PhraseMatcherModel.findOneAndUpdate(
            { guildId: interaction.guildId },
            {
              $push: {
                phrases: { content, matchThreshold: threshold, phraseId },
              },
            },
            { upsert: true, new: true }
          );

          return {
            content: `Phrase added: "${content}" with threshold ${threshold}%.`,
          };
        } catch (error) {
          console.error("Failed to add phrase:", error);
          return {
            content: "An error occurred while adding the phrase.",
          };
        }
      } else if (subcommand === "log_channel") {
        const channel = interaction.options.getChannel("channel", true);

        try {
          await PhraseMatcherModel.findOneAndUpdate(
            { guildId: interaction.guildId },
            { logChannelId: channel.id },
            { upsert: true }
          );

          return {
            content: `Log channel set to <#${channel.id}>.`,
          };
        } catch (error) {
          console.error("Failed to set log channel:", error);
          return {
            content: "An error occurred while setting the log channel.",
          };
        }
      }
    } else if (subcommand === "remove") {
      const phraseId = interaction.options.getString("phrase_id", true);

      try {
        const phraseMatcher = await PhraseMatcherModel.findOneAndUpdate(
          { guildId: interaction.guildId },
          {
            $pull: {
              phrases: { phraseId },
            },
          },
          { new: true }
        );

        if (phraseMatcher) {
          return {
            content: `Phrase with ID ${phraseId} removed.`,
          };
        } else {
          return {
            content: `Phrase with ID ${phraseId} not found.`,
          };
        }
      } catch (error) {
        console.error("Failed to remove phrase:", error);
        return {
          content: "An error occurred while removing the phrase.",
        };
      }
    } else if (subcommand === "list") {
      const phraseModel = await PhraseMatcherModel.findOne({
        guildId: interaction.guildId,
      });

      if (!phraseModel) {
        return {
          embeds: [
            {
              title: "Error",
              description: "Failed to find configured phrases for guild",
            },
          ],
        };
      }

      const embed = new EmbedBuilder();
      embed.setTitle("Phrases").addFields(
        phraseModel.phrases.length > 0
          ? phraseModel?.phrases.map((phrase) => {
              return {
                name: `"${phrase.content}" | ${phrase.phraseId}`,
                value: `Threshold: ${phrase.matchThreshold}%`,
              };
            })
          : [
              {
                name: "No configured phrases",
                value: "Add one with /phrase set",
              },
            ]
      );

      return {
        embeds: [embed],
      };
    } else {
      return {
        content: "Invalid subcommand",
      };
    }
    return {
      content: "Internal error",
    };
  }
}
