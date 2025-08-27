import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ChannelType,
  ChatInputCommandInteraction,
  Collection,
  GuildMember,
  GuildTextBasedChannel,
  MessageFlags,
} from "discord.js";
import { SuggestionConfigModel, SuggestionModel } from "models/Suggestion";

import { CustomApplicationCommand } from "lib/core/command";
import { DsuClient } from "lib/core/DsuClient";
import DefaultClientUtilities from "lib/util/defaultUtilities";
import { PermissionLevels } from "types/commands";
import { Times } from "types/index";
import { SuggestionUtility } from "../../utilities/suggestions";
import { TimeParserUtility } from "../../utilities/timeParser";

export default class SuggestionsCommand extends CustomApplicationCommand {
  constructor(client: DsuClient) {
    super("suggestions", client, {
      type: ApplicationCommandType.ChatInput,
      description: "Configure or send suggestions",
      permissionLevel: PermissionLevels.USER,
      defaultMemberPermissions: "Administrator",
      applicationData: [
        {
          name: "config",
          description: "Setup configuration for suggestions.",
          type: ApplicationCommandOptionType.Subcommand,
          level: PermissionLevels.BOT_OWNER,
          options: [
            {
              name: "channel",
              description: "The channel to link suggestions to",
              type: ApplicationCommandOptionType.Channel,
              channel_types: [ChannelType.GuildText],
              required: true,
            },
            {
              name: "cooldown",
              description:
                "The cooldown (eg, 1m, 1M, 5d, etc.) to apply to suggestion author.",
              type: ApplicationCommandOptionType.String,
              required: true,
            },
          ],
        },
        {
          name: "create",
          description: "Send in a suggestion.",
          type: ApplicationCommandOptionType.Subcommand,
          level: PermissionLevels.USER,
          options: [
            {
              name: "suggestion",
              description: "The suggestion content.",
              type: ApplicationCommandOptionType.String,
              required: true,
            },
          ],
        },
        {
          name: "ban",
          level: PermissionLevels.HELPER,
          description: "Ban a user from submitting suggestions.",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "user",
              description: "The user to ban.",
              type: ApplicationCommandOptionType.User,
              required: true,
            },
          ],
        },
        {
          name: "unban",
          level: PermissionLevels.HELPER,
          description: "Unban a user from submitting suggestions.",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "user",
              description: "The user to unban.",
              type: ApplicationCommandOptionType.User,
              required: true,
            },
          ],
        },
        {
          name: "author",
          level: PermissionLevels.HELPER,
          description: "Find the author of a suggestion via message ID.",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: "message_id",
              description: "The suggestion message ID.",
              type: ApplicationCommandOptionType.String,
              required: true,
            },
          ],
        },
      ],
    });
  }

  async run(interaction: ChatInputCommandInteraction) {
    const subcommand = interaction.options.getSubcommand();

    const permLevel = this.client.getPermLevel(
      undefined,
      interaction.member as GuildMember,
    );
    const helperCmds = ["ban", "unban", "author"];
    if (permLevel < 2 && helperCmds.includes(subcommand)) {
      return await interaction.reply({
        embeds: [
          {
            title: "Insufficient Permissions",
            description: "Must be perm level 2 (Helper) to use this command.",
          },
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    switch (subcommand) {
      case "config":
        return this.handleConfig(interaction);
      case "create":
        return this.handleCreate(interaction, permLevel);
      case "ban":
        return this.handleBan(interaction);
      case "unban":
        return this.handleUnban(interaction);
      case "author":
        return this.handleGetAuthor(interaction);
    }
  }

  private async handleGetAuthor(interaction: ChatInputCommandInteraction) {
    const messageId = interaction.options.getString("message_id", true);
    const suggestion = await SuggestionModel.findOne({ messageId });

    if (!suggestion) {
      return interaction.reply({
        embeds: [
          DefaultClientUtilities.generateEmbed("error", {
            title: "Not Found",
            description: `No suggestion found with message ID \`${messageId}\`.`,
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    return interaction.reply({
      embeds: [
        DefaultClientUtilities.generateEmbed("general", {
          title: "Suggestion Author",
          description: `User ID: \`${suggestion.userId}\``,
        }),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  private parseCooldown(input: string): number | null {
    const match = input.match(/^(\d+)([smhdwMy])$/);
    if (!match) return null;

    const [, amountStr, unit] = match;
    const amount = Number(amountStr);

    const unitMap: Record<string, number> = {
      s: Times.SECOND,
      m: Times.MINUTE,
      h: Times.HOUR,
      d: Times.DAY,
      w: Times.WEEK,
      M: Times.MONTH,
      y: Times.YEAR,
    };

    return unitMap[unit] ? amount * unitMap[unit] : null;
  }

  private async handleConfig(interaction: ChatInputCommandInteraction) {
    const defaultUtility = DefaultClientUtilities;
    const channel = interaction.options.getChannel("channel", true);
    const cooldownInput = interaction.options.getString("cooldown", true);
    const cooldown = this.parseCooldown(cooldownInput);

    if (!cooldown) {
      return interaction.reply({
        embeds: [
          defaultUtility.generateEmbed("error", {
            title: "Invalid cooldown format",
            description: "Format must be like `10s`, `5m`, `2y`, etc.",
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    await SuggestionConfigModel.updateOne(
      { guildId: interaction.guildId },
      {
        $set: {
          channelId: channel.id,
          cooldown,
        },
      },
      { upsert: true },
    );

    await SuggestionUtility.createDeniedSuggestionThread(
      channel as GuildTextBasedChannel,
    );

    await interaction.reply({
      embeds: [
        defaultUtility.generateEmbed("success", {
          title: "Suggestion system configured",
          description: `Cooldown set to ${TimeParserUtility.parseDurationToString(
            cooldown,
          )} for channel <#${channel.id}>.`,
        }),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  private async handleCreate(interaction: ChatInputCommandInteraction, permLevel: PermissionLevels) {
    const defaultUtility = DefaultClientUtilities;

    const content = interaction.options.getString("suggestion", true);
    const cooldowns = this.client.applicationCommandLoader.cooldowns;
    const commandName = interaction.commandName;
    const config = await SuggestionConfigModel.findOne({
      guildId: interaction.guildId,
    });

    if (!config) {
      return interaction.reply({
        embeds: [
          defaultUtility.generateEmbed("error", {
            title: "No configuration found",
            description: "Please run `/suggestions config` first.",
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    const isBanned = config.bannedUsers.find((v) => v.userId === interaction.user.id);

    if (isBanned) {
      return interaction.reply({
        embeds: [
          defaultUtility.generateEmbed("error", {
            title: "Banned",
            description: `You are banned from submitting suggestions in this server.\nReason: \`${isBanned.reason ?? "No reason specified"}\``,
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (!cooldowns.has(commandName)) {
      cooldowns.set(commandName, new Collection());
    }

    // only if permlevel is under mod
    if (permLevel < PermissionLevels.MODERATOR) {
      const timestamps = cooldowns.get(commandName)!;
      const now = Date.now();
      const cooldownAmount = config.cooldown;

      const expirationTime = timestamps.get(interaction.user.id) ?? 0;

      if (now < expirationTime) {
        const timeLeft = Math.ceil((expirationTime - now) / 1000);
        return interaction.reply({
          embeds: [
            defaultUtility.generateEmbed("error", {
              title: "You're on cooldown!",
              description: `Please wait **${timeLeft}s** before using this again.`,
            }),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }

      timestamps.set(interaction.user.id, now + cooldownAmount);
    }

    await interaction.deferReply({ flags: "Ephemeral" });

    await SuggestionUtility.sendAnonymousSuggestion(interaction, content, config);

    interaction.editReply({
      embeds: [
        defaultUtility.generateEmbed("success", {
          title: "Suggestion sent!",
          description: `View your suggestion in <#${config.channelId}>!`,
        }),
      ],
    });
    return;
  }

  private async handleBan(interaction: ChatInputCommandInteraction) {
    const defaultUtility = DefaultClientUtilities;
    const user = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason") ?? "No reason specified";

    const config = await SuggestionConfigModel.findOne({
      guildId: interaction.guildId,
      "bannedUsers.userId": user.id,
    });

    if (config) {
      return interaction.reply({
        embeds: [
          defaultUtility.generateEmbed("error", {
            title: "Already Banned",
            description: `${user.tag} is already banned from submitting suggestions.\nReason: \`${config.bannedUsers.find((u) => u.userId === user.id)?.reason ?? "No reason specified"}\``,
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    await SuggestionConfigModel.updateOne(
      { guildId: interaction.guildId },
      { $addToSet: { bannedUsers: { userId: user.id, reason } } },
      { upsert: true },
    );

    return interaction.reply({
      embeds: [
        defaultUtility.generateEmbed("success", {
          title: "User Banned",
          description: `${user.tag} has been banned from submitting suggestions.\nReason: \`${reason}\``,
        }),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  private async handleUnban(interaction: ChatInputCommandInteraction) {
    const defaultUtility = DefaultClientUtilities;
    const user = interaction.options.getUser("user", true);

    const config = await SuggestionConfigModel.findOne({
      guildId: interaction.guildId,
      "bannedUsers.userId": user.id,
    });

    if (!config) {
      return interaction.reply({
        embeds: [
          defaultUtility.generateEmbed("error", {
            title: "Not Banned",
            description: `${user.tag} is not currently banned from submitting suggestions.`,
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    await SuggestionConfigModel.updateOne(
      { guildId: interaction.guildId },
      { $pull: { bannedUsers: { userId: user.id } } },
    );

    return interaction.reply({
      embeds: [
        defaultUtility.generateEmbed("success", {
          title: "User Unbanned",
          description: `${user.tag} has been unbanned from submitting suggestions.`,
        }),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }
}
