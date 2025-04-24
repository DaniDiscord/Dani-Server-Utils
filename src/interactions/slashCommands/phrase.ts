import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { CustomApplicationCommand } from "lib/core/command";
import { DsuClient } from "lib/core/DsuClient";
import { PhraseMatcherModel } from "models/PhraseMatcher";

export default class PhraseCommand extends CustomApplicationCommand {
  constructor(client: DsuClient) {
    super("phrase", client, {
      permissionLevel: "USER",
      type: ApplicationCommandType.ChatInput,
      description: "Set, configure, or block phrases.",
      applicationData: [
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

      defaultMemberPermissions: "Administrator",
    });
  }

  async run(interaction: ChatInputCommandInteraction) {
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

          await interaction.reply({
            content: `Phrase added: "${content}" with threshold ${threshold}%.`,
          });
          return;
        } catch (error) {
          console.error("Failed to add phrase:", error);
          await interaction.reply({
            content: "An error occurred while adding the phrase.",
          });
          return;
        }
      } else if (subcommand === "log_channel") {
        const channel = interaction.options.getChannel("channel", true);

        try {
          await PhraseMatcherModel.findOneAndUpdate(
            { guildId: interaction.guildId },
            { logChannelId: channel.id },
            { upsert: true }
          );

          await interaction.reply({
            content: `Log channel set to <#${channel.id}>.`,
          });
          return;
        } catch (error) {
          console.error("Failed to set log channel:", error);
          await interaction.reply({
            content: "An error occurred while setting the log channel.",
          });
          return;
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
          await interaction.reply({
            content: `Phrase with ID ${phraseId} removed.`,
          });
        } else {
          await interaction.reply({
            content: `Phrase with ID ${phraseId} not found.`,
          });
        }
        return;
      } catch (error) {
        console.error("Failed to remove phrase:", error);
        await interaction.reply({
          content: "An error occurred while removing the phrase.",
        });
        return;
      }
    } else if (subcommand === "list") {
      const phraseModel = await PhraseMatcherModel.findOne({
        guildId: interaction.guildId,
      });

      if (!phraseModel) {
        await interaction.reply({
          embeds: [
            {
              title: "Error",
              description: "Failed to find configured phrases for guild",
            },
          ],
        });
        return;
      }

      const embed = new EmbedBuilder().setTitle("Phrases").addFields(
        phraseModel.phrases.length > 0
          ? phraseModel.phrases.map((phrase) => ({
              name: `"${phrase.content}" | ${phrase.phraseId}`,
              value: `Threshold: ${phrase.matchThreshold}%`,
            }))
          : [
              {
                name: "No configured phrases",
                value: "Add one with /phrase set",
              },
            ]
      );

      await interaction.reply({ embeds: [embed] });
      return;
    } else {
      await interaction.reply({
        content: "Invalid subcommand",
      });
      return;
    }

    await interaction.reply({
      content: "Internal error",
    });
  }
}
