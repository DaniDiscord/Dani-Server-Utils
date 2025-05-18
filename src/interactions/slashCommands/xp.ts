import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  AttachmentBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";

import { CustomApplicationCommand } from "lib/core/command";
import { DsuClient } from "lib/core/DsuClient";
import XpManager from "lib/core/XpManager";
import { XpModel } from "models/Xp";
import { generateXpCard } from "lib/util/xpCard";

export default class XpCommand extends CustomApplicationCommand {
  constructor(client: DsuClient) {
    super("xp", client, {
      type: ApplicationCommandType.ChatInput,
      description: "Check xp",
      permissionLevel: "USER",
      applicationData: [
        {
          type: ApplicationCommandOptionType.Subcommand,
          name: "get",
          description: "Show your current xp level!",
        },
        {
          type: ApplicationCommandOptionType.Subcommand,
          name: "leaderboard",
          description: "Show the XP leaderboard!",
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
          name: "calcxp",
          description: "Calculate time needed to reach a level!",
          options: [
            {
              name: "level",
              description: "Target level to calculate",
              type: ApplicationCommandOptionType.Number,
              min_value: 1,
              required: true,
            },
          ],
        },
      ],
    });
  }

  async run(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();
    switch (subcommand) {
      case "get":
        const user = interaction.options.getUser("user") ?? interaction.user;
        const xpModel = await this.getOrCreateXpModel(interaction.guildId!, user.id);
        const xpManager = new XpManager(xpModel.expAmount);

        const rank =
          (await XpModel.countDocuments({
            guildId: interaction.guildId,
            expAmount: { $gt: xpModel.expAmount },
          })) + 1;

        const buf = await generateXpCard({
          username: user.username,
          avatarURL: user.displayAvatarURL({ extension: "png", size: 256 }),
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

        const leaderboardEntries = await Promise.all(
          topUsers.map(async (user, index) => {
            const xpManager = new XpManager(user.expAmount);

            let id = user.userId;

            return {
              rank: index + 1,
              user: id,
              level: xpManager.level,
              totalExp: user.expAmount,
            };
          }),
        );

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
      case "calcxp":
        const targetLevel = interaction.options.getNumber("level", true);
        const xpEmbed = await this.generateXpCalculation(targetLevel, interaction);
        await interaction.reply({ embeds: [xpEmbed], flags: "Ephemeral" });

        break;
    }
  }

  private async generateXpCalculation(
    targetLevel: number,
    interaction: ChatInputCommandInteraction,
  ) {
    const xpManager = new XpManager(0);

    let totalXp = 0;
    let nextXp = 0;

    for (let lvl = 0; lvl < targetLevel; lvl++) {
      nextXp = xpManager.formula(lvl);
      totalXp += nextXp;
    }

    const minutesRequired = totalXp / 3;
    const days = Math.floor(minutesRequired / 1440);
    const hours = Math.floor((minutesRequired % 1440) / 60);
    const minutes = Math.round(minutesRequired % 60);

    const timeString = [
      days > 0 ? `${days} day${days !== 1 ? "s" : ""}` : "",
      hours > 0 ? `${hours} hour${hours !== 1 ? "s" : ""}` : "",
      minutes > 0 ? `${minutes} minute${minutes !== 1 ? "s" : ""}` : "",
    ]
      .filter(Boolean)
      .join(" ");

    const xpModel = await XpModel.findOne({
      guildId: interaction.guildId,
      userId: interaction.user.id,
    });

    const currentLevel = xpModel ? new XpManager(xpModel.expAmount).level : 0;
    const xpNeeded = totalXp - (xpModel?.expAmount || 0);

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
        { name: "Time Investment", value: timeString || "0 minutes", inline: true },
        {
          name: "Next Level",
          value: `Requires: ${nextXp.toLocaleString()} XP`,
          inline: true,
        },
        {
          name: "Current Progress",
          value: `You're level ${currentLevel} (${xpModel?.expAmount || 0} XP)`,
          inline: true,
        },
      );
    return embed;
  }

  private async getOrCreateXpModel(guildId: string, userId: string) {
    let xpModel = await XpModel.findOne({ guildId, userId });

    if (!xpModel) {
      xpModel = await XpModel.create({
        guildId,
        userId,
        expAmount: 0,
        messageCount: 0,
      });
    }

    return xpModel;
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
