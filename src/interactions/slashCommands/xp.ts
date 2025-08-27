import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  AttachmentBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder
} from "discord.js";

import { CustomApplicationCommand } from "lib/core/command";
import { DsuClient } from "lib/core/DsuClient";
import XpManager from "lib/core/XpManager";
import { generateXpCard } from "lib/util/xpCard";
import { XpModel } from "models/Xp";
import { PermissionLevels } from "types/commands";
import { Times } from "types/index";
import { TimeParserUtility } from "../../utilities/timeParser";

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
            }
          ],
        },
      ],
    });
  }

  async run(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    switch (subcommand) {
      case "get":
        const getUser = interaction.options.getUser("user") ?? interaction.user;
        const xpModel = await this.getOrCreateXpModel(interaction.guildId!, getUser.id);
        const xpManager = new XpManager(xpModel.expAmount);

        const rank =
          (await XpModel.countDocuments({
            guildId: interaction.guildId,
            expAmount: { $gt: xpModel.expAmount },
          })) + 1;

        const buf = await generateXpCard({
          username: getUser.username,
          avatarURL: getUser.displayAvatarURL({ extension: "png", size: 256 }),
          level: xpManager.level,
          xp: xpManager.exp,
          xpNeeded: xpManager.next,
          rank,
        });

        const attachment = new AttachmentBuilder(buf, { name: "xp_card.png" });
        await interaction.reply({ files: [attachment] });
        break;

      case "leaderboard":
        const limit = Math.min(interaction.options.getNumber("limit") ?? 10, 25);
        const topUsers = await XpModel.find({ guildId: interaction.guildId })
          .select("userId expAmount")
          .sort({ expAmount: -1 })
          .limit(limit);

        if (topUsers.length === 0) {
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor("#ff0000")
                .setDescription("No XP data available for this server yet."),
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

        const embed = new EmbedBuilder()
          .setTitle(`${interaction.guild?.name}'s XP Leaderboard`)
          .setDescription(leaderboardText)
          .setColor("#00ff00")
          .setFooter({
            text: `Total participants: ${await XpModel.countDocuments({ guildId: interaction.guildId })}`,
          });

        await interaction.reply({ embeds: [embed] });
        break;

      case "calc":
        const targetLevel = interaction.options.getNumber("level", true);
        const user = interaction.options.getUser("user") ?? interaction.user;

        const xpEmbed = await this.generateXpCalculation(targetLevel, user.id, interaction.guildId);
        await interaction.reply({ embeds: [xpEmbed], flags: "Ephemeral" });
        break;
    }
  }

  private async generateXpCalculation(
    targetLevel: number,
    userId: string,
    guildId: string | null
  ) {
    const xpManager = new XpManager(0);

    let totalXp = 0;
    let nextXp = 0;

    for (let lvl = 0; lvl < targetLevel; lvl++) {
      nextXp = xpManager.formula(lvl);
      totalXp += nextXp;
    }

    const minutesRequired = totalXp / XpManager.EXP_PER_MESSAGE;
    const timeString = TimeParserUtility.parseDurationToString(minutesRequired * Times.MINUTE, {
      allowedUnits: ["day", "hour", "minute"],
    });

    const xpModel = await XpModel.findOne({
      guildId: guildId,
      userId: userId,
    });

    const currentXp = xpModel?.expAmount || 0;
    const currentLevel = xpModel ? new XpManager(currentXp).level : 0;
    const xpNeeded = totalXp - currentXp;

    const timeSpentMinutes = currentXp / XpManager.EXP_PER_MESSAGE;
    const timeSpent = TimeParserUtility.parseDurationToString(timeSpentMinutes * Times.MINUTE, {
      allowedUnits: ["day", "hour", "minute"],
    });

    const timeDiffMinutes = Math.abs(xpNeeded) / XpManager.EXP_PER_MESSAGE;
    const timeDiff = TimeParserUtility.parseDurationToString(timeDiffMinutes * Times.MINUTE, {
      allowedUnits: ["day", "hour", "minute"],
    });

    const timeLeft = xpNeeded > 0 ? timeDiff : `Surpassed by ${timeDiff}`;

    const embed = new EmbedBuilder()
      .setTitle(`XP Calculation for Level ${targetLevel}`)
      .setColor("#0099ff")
      .addFields(
        { name: "Total XP Required", value: totalXp.toLocaleString(), inline: true },
        {
          name: "XP Needed",
          value: xpNeeded > 0 ? xpNeeded.toLocaleString() : "Already reached",
          inline: true,
        },
        {
          name: "Current Progress",
          value: `Level ${currentLevel} (${currentXp} XP)`,
          inline: true,
        },
        { name: "Time Investment (Total)", value: timeString || "0 minutes", inline: true },
        {
          name: "Time Spent",
          value: timeSpent || "0 minutes",
          inline: true,
        },
        {
          name: "Time Left",
          value: timeLeft || "0 minutes",
          inline: true,
        },
      );
    return embed;
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
