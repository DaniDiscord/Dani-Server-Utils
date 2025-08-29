import {
  APIEmbed,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  AttachmentBuilder,
  ChatInputCommandInteraction,
} from "discord.js";

import { CustomApplicationCommand } from "lib/core/command";
import { DsuClient } from "lib/core/DsuClient";
import { PermissionLevels } from "types/commands";
import { TimeParserUtility } from "../../utilities/timeParser";
import XpManager from "lib/core/XpManager";
import { XpModel } from "models/Xp";
import { generateXpCard } from "lib/util/xpCard";

const BOT_COMMANDS_CHANNEL = "594178859453382696";

export default class XpCommand extends CustomApplicationCommand {
  constructor(client: DsuClient) {
    super("xp", client, {
      type: ApplicationCommandType.ChatInput,
      description: "Check xp",
      permissionLevel: PermissionLevels.USER,
      applicationData: [
        {
          type: ApplicationCommandOptionType.Subcommand,
          name: "get",
          description: "Show your own or someone else's current xp level!",
          level: PermissionLevels.USER,
          options: [
            {
              name: "user",
              description: "The user to check the XP level for.",
              type: ApplicationCommandOptionType.User,
              required: false,
            },
          ],
        },
        {
          type: ApplicationCommandOptionType.Subcommand,
          name: "leaderboard",
          description: "Show the XP leaderboard!",
          level: PermissionLevels.USER,
          options: [
            {
              name: "limit",
              description: "The max amount of leaderboard positions to show.",
              type: ApplicationCommandOptionType.Number,
              min_value: 1,
              max_value: 25,
            },
          ],
        },
        {
          type: ApplicationCommandOptionType.Subcommand,
          name: "calc",
          description: "Calculate time needed to reach a level!",
          level: PermissionLevels.USER,
          options: [
            {
              name: "level",
              description: "Target level to calculate",
              type: ApplicationCommandOptionType.Number,
              min_value: 1,
              required: true,
            },
            {
              name: "user",
              description: "The user to check the XP level for.",
              type: ApplicationCommandOptionType.User,
              required: false,
            },
          ],
        },
      ],
    });
  }

  async run(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    switch (subcommand) {
      case "get": {
        const user = interaction.options.getUser("user") ?? interaction.user;
        const xpModel = await this.getOrCreateXpModel(interaction.guildId!, user.id);
        const xpManager = new XpManager(xpModel.expAmount);

        const rank =
          (await XpModel.countDocuments({
            guildId: interaction.guildId,
            expAmount: { $gt: xpModel.expAmount },
          })) + 1;

        const buf = await generateXpCard({
          username: user.displayName,
          avatarURL: user.displayAvatarURL({ extension: "png", size: 256 }),
          level: xpManager.level,
          xp: xpManager.exp,
          xpNeeded: xpManager.next,
          rank,
        });

        const attachment = new AttachmentBuilder(buf, { name: "xp_card.png" });

        if (interaction.channelId !== BOT_COMMANDS_CHANNEL) {
          await interaction.reply({ files: [attachment], flags: "Ephemeral" });
        } else {
          await interaction.reply({ files: [attachment] });
        }
        break;
      }
      case "leaderboard": {
        const limit = Math.min(interaction.options.getNumber("limit") ?? 10, 25);
        const topUsers = await XpModel.find({ guildId: interaction.guildId })
          .select("userId expAmount")
          .sort({ expAmount: -1 })
          .limit(limit);

        if (topUsers.length === 0) {
          return interaction.reply({
            embeds: [
              {
                color: this.client.config.colors.error,
                description: "No XP data available for this server yet.",
              },
            ],
            ephemeral: true,
          });
        }

        const leaderboardEntries = topUsers.map((user, index) => {
          const xpManager = new XpManager(user.expAmount);
          return {
            rank: index + 1,
            user: user.userId,
            level: xpManager.level,
            totalExp: user.expAmount,
          };
        });

        const leaderboardText = leaderboardEntries
          .map(
            (entry) =>
              `**${entry.rank}${this.getSuffix(entry.rank)}**, at level **${entry.level}** (${entry.totalExp.toLocaleString()} total exp) - <@${entry.user}>`,
          )
          .join("\n");

        const embed = {
          title: `${interaction.guild?.name}'s XP Leaderboard`,
          description: leaderboardText,
          color: this.client.config.colors.primary,
          footer: {
            text: `Total participants: ${await XpModel.countDocuments({ guildId: interaction.guildId })}`,
          },
        };
        if (interaction.channelId !== BOT_COMMANDS_CHANNEL) {
          await interaction.reply({ embeds: [embed], flags: "Ephemeral" });
        } else {
          await interaction.reply({ embeds: [embed] });
        }
        break;
      }

      case "calc": {
        const targetLevel = interaction.options.getNumber("level", true);
        const user = interaction.options.getUser("user") ?? interaction.user;
        const xpModel = await XpModel.findOne({
          guildId: interaction.guildId,
          userId: user.id,
        });
        const currentXp = xpModel?.expAmount ?? 0;

        const xpManager = new XpManager(currentXp);
        const result = xpManager.calculateProgress(targetLevel);

        if (result.surpassed) {
          return interaction.reply({
            embeds: [
              {
                title: `XP Calculation for Level ${targetLevel}`,
                color: this.client.config.colors.error,
                description: "Already Surpassed",
                fields: [
                  {
                    name: "Current Level",
                    value: `${result.currentLevel}`,
                    inline: true,
                  },
                  { name: "XP Progress", value: result.xpProgress, inline: true },
                ],
              } as APIEmbed,
            ],
          });
        }

        return interaction.reply({
          embeds: [
            {
              title: `Xp Calculation for Level ${targetLevel}`,
              fields: [
                { name: "Current Level", value: `${result.currentLevel}`, inline: true },
                { name: "Xp Progress", value: `${result.xpProgress}`, inline: true },
                { name: "XP Needed", value: `${result.xpNeeded}`, inline: true },
                {
                  name: "Time Investment (Total)",
                  value:
                    TimeParserUtility.parseDurationToString(result.totalTimeMs, {
                      allowedUnits: ["day", "hour", "minute"],
                    }) || "0 minutes",
                  inline: true,
                },
                {
                  name: "Time Spent",
                  value:
                    TimeParserUtility.parseDurationToString(result.timeSpentMs, {
                      allowedUnits: ["day", "hour", "minute"],
                    }) || "0 minutes",
                  inline: true,
                },
                {
                  name: "Time Left",
                  value:
                    TimeParserUtility.parseDurationToString(result.timeLeftMs, {
                      allowedUnits: ["day", "hour", "minute"],
                    }) || "0 minutes",
                  inline: true,
                },
              ],
            } as APIEmbed,
          ],
        });
      }
    }
  }

  private async getOrCreateXpModel(guildId: string, userId: string) {
    return await XpModel.findOneAndUpdate(
      { guildId, userId },
      { $setOnInsert: { expAmount: 0, messageCount: 0 } },
      { upsert: true, new: true },
    );
  }

  private getSuffix(num: number): string {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return "st";
    if (j === 2 && k !== 12) return "nd";
    if (j === 3 && k !== 13) return "rd";
    return "th";
  }
}
