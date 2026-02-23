import {
  APIEmbed,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  AttachmentBuilder,
  ChatInputCommandInteraction,
} from "discord.js";

import { CustomApplicationCommand } from "lib/core/command";
import DefaultClientUtilities from "lib/util/defaultUtilities";
import { DsuClient } from "lib/core/DsuClient";
import { PermissionLevels } from "types/commands";
import { SettingsModel } from "models/Settings";
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
          name: "transfer",
          description: "Transfer XP to another user.",
          level: PermissionLevels.ADMINISTRATOR,
          options: [
            {
              name: "old_account",
              description: "The user to remove XP from.",
              type: ApplicationCommandOptionType.User,
              required: true,
            },
            {
              name: "new_account",
              description: "The user the XP will transfer to.",
              type: ApplicationCommandOptionType.User,
              required: true,
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
        {
          type: ApplicationCommandOptionType.Subcommand,
          name: "addrole",
          description: "Add an XP role to the server!",
          level: PermissionLevels.ADMINISTRATOR,
          options: [
            {
              name: "role",
              description: "The role to add to the XP roles!",
              type: ApplicationCommandOptionType.Role,
              required: true,
            },
            {
              name: "level",
              description: "The level to add the role to!",
              type: ApplicationCommandOptionType.Number,
              required: true,
              min_value: 1,
              max_value: 100,
            },
          ],
        },
        {
          type: ApplicationCommandOptionType.Subcommand,
          name: "removerole",
          description: "Remove an XP role from the server!",
          level: PermissionLevels.ADMINISTRATOR,
          options: [
            {
              name: "role",
              description: "The role to remove from the XP roles!",
              type: ApplicationCommandOptionType.Role,
              required: true,
            },
          ],
        },
        {
          type: ApplicationCommandOptionType.Subcommand,
          name: "listroles",
          description: "List all XP roles for the server!",
          level: PermissionLevels.ADMINISTRATOR,
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

        console.log(xpManager.next);
        const buf = await generateXpCard({
          username: user.displayName,
          avatarURL: user.displayAvatarURL({ extension: "png", size: 256 }),
          level: xpManager.level,
          xp: xpManager.exp,
          xpNeeded: xpManager.exp + xpManager.next,
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

        if (!xpModel) {
          return interaction.reply({
            embeds: [
              {
                color: this.client.config.colors.error,
                description: "User has no XP data yet.",
              },
            ],
            ephemeral: true,
          });
        }

        const xpManager = new XpManager(xpModel.expAmount);
        const targetResult = xpManager.digestLevel(targetLevel);
        const currentResult = xpManager.digestExp(xpModel.expAmount);
        const xpNeeded = targetResult.totalExp - currentResult.totalExp;
        const messagesNeeded = Math.ceil(xpNeeded / XpManager.EXP_PER_MESSAGE);
        const timeLeftMs = messagesNeeded * XpManager.EXP_COOLDOWN;

        const totalMessages = Math.ceil(
          (xpManager.totalExp + xpNeeded) / XpManager.EXP_PER_MESSAGE,
        );
        const totalTimeMs = totalMessages * XpManager.EXP_COOLDOWN;
        const messagesSoFar = Math.ceil(xpManager.totalExp / XpManager.EXP_PER_MESSAGE);
        const timeSpentMs = messagesSoFar * XpManager.EXP_COOLDOWN;

        const timeString = TimeParserUtility.parseDurationToString(totalTimeMs, {
          allowedUnits: ["day", "hour", "minute"],
        });
        const timeSpent = TimeParserUtility.parseDurationToString(timeSpentMs, {
          allowedUnits: ["day", "hour", "minute"],
        });
        const timeLeft = TimeParserUtility.parseDurationToString(timeLeftMs, {
          allowedUnits: ["day", "hour", "minute"],
        });

        return interaction.reply({
          embeds: [
            {
              title: `Xp Calculation for Level ${targetLevel}`,
              color: this.client.config.colors.primary,
              fields: [
                {
                  name: "Current Level",
                  value: `${currentResult.level}`,
                  inline: true,
                },
                {
                  name: "Current XP Progress",
                  value: `${currentResult.totalExp.toLocaleString()} total XP`,
                  inline: true,
                },
                {
                  name: "XP Needed for Target",
                  value: `${(targetResult.totalExp - currentResult.totalExp).toLocaleString()} XP`,
                  inline: true,
                },
                {
                  name: "Target Level Total XP",
                  value: `${targetResult.totalExp.toLocaleString()} XP`,
                  inline: true,
                },
                {
                  name: "XP Progress to Target",
                  value: `${currentResult.totalExp.toLocaleString()} / ${targetResult.totalExp.toLocaleString()} XP`,
                  inline: true,
                },
                {
                  name: "Time Investment (Total)",
                  value: timeString || "0 minutes",
                },
                { name: "Time Spent", value: timeSpent || "0 minutes" },
                { name: "Time Left", value: timeLeft || "0 minutes" },
              ],
            } as APIEmbed,
          ],
          ephemeral: true,
        });
      }

      case "addrole": {
        const role = interaction.options.getRole("role", true);
        const level = interaction.options.getNumber("level", true);
        const settings = await SettingsModel.findOne({ _id: interaction.guildId });
        if (settings) {
          settings.xpRoles.push({ roleId: role.id, level });
          await settings.save();

          return await interaction.reply({
            embeds: [
              {
                color: this.client.config.colors.primary,
                description: `Added XP role ${role} to level ${level}.`,
              },
            ],
          });
        }
      }

      case "removerole": {
        const role = interaction.options.getRole("role", true);
        const settings = await SettingsModel.findOne({ _id: interaction.guildId });
        if (settings) {
          settings.xpRoles = settings.xpRoles.filter((r) => r.roleId !== role.id);
          await settings.save();
          return await interaction.reply({
            embeds: [
              {
                color: this.client.config.colors.primary,
                description: `Removed XP role ${role}.`,
              },
            ],
          });
        }
      }

      case "listroles": {
        const settings = await SettingsModel.findOne({ _id: interaction.guildId });
        if (settings) {
          return await interaction.reply({
            embeds: [
              {
                color: this.client.config.colors.primary,
                description: `XP roles for this server:\n${settings.xpRoles.map((r) => `**${r.level}**: <@&${r.roleId}>`).join("\n")}`,
              },
            ],
          });
        }
      }
      case "transfer": {
        const oldAccount = interaction.options.getUser("old_account", true);
        const newAccount = interaction.options.getUser("new_account", true);
        const oldTable = await XpModel.findOne({ userId: oldAccount.id });

        if (!oldTable) {
          return await interaction.followUp({
            flags: "Ephemeral",
            embeds: [
              DefaultClientUtilities.generateEmbed("error", {
                title: "Failed to locate user.",
                description: `Could not find existing XP entry for user: ${oldAccount.username}`,
              }),
            ],
          });
        }

        let newTable = await this.getOrCreateXpModel(interaction.guildId!, newAccount.id);

        await newTable.updateOne({
          $set: {
            lastXpTimestamp: oldTable.lastXpTimestamp,
            expAmount: oldTable.expAmount,
          },
        });

        await oldTable.updateOne({ $set: { expAmount: 0 } });

        return await interaction.followUp({
          flags: "Ephemeral",
          embeds: [
            DefaultClientUtilities.generateEmbed("error", {
              title: "Transferred XP.",
              description: `Moved ${oldAccount}'s XP data to ${newAccount}.`,
            }),
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
