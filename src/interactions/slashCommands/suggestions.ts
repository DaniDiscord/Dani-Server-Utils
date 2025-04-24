import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ChannelType,
  ChatInputCommandInteraction,
  Collection,
  GuildTextBasedChannel,
  MessageFlags,
} from "discord.js";
import { CustomApplicationCommand } from "lib/core/command";
import { DsuClient } from "lib/core/DsuClient";
import { SuggestionConfigModel } from "models/Suggestion";
import { Times } from "types/index";

export default class SuggestionsCommand extends CustomApplicationCommand {
  constructor(client: DsuClient) {
    super("suggestions", client, {
      type: ApplicationCommandType.ChatInput,
      description: "Configure or send suggestions",
      permissionLevel: "USER",
      defaultMemberPermissions: "Administrator",
      applicationData: [
        {
          name: "config",
          description: "Setup configuration for suggestions.",
          type: ApplicationCommandOptionType.Subcommand,
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
          options: [
            {
              name: "suggestion",
              description: "The suggestion content.",
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
    if (subcommand === "config") return this.handleConfig(interaction);
    if (subcommand === "create") return this.handleCreate(interaction);
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
    const suggestionUtility = this.client.utils.getUtility("suggestions");
    const defaultUtility = this.client.utils.getUtility("default");
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
      { upsert: true }
    );

    await suggestionUtility.createDeniedSuggestionThread(
      channel as GuildTextBasedChannel
    );

    await interaction.reply({
      embeds: [
        defaultUtility.generateEmbed("success", {
          title: "Suggestion system configured",
          description: `Cooldown set to ${this.client.utils
            .getUtility("timeParser")
            .parseDurationToString(cooldown)} for channel <#${channel.id}>.`,
        }),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  private async handleCreate(interaction: ChatInputCommandInteraction) {
    const defaultUtility = this.client.utils.getUtility("default");
    const suggestionUtility = this.client.utils.getUtility("suggestions");

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

    if (!cooldowns.has(commandName)) {
      cooldowns.set(commandName, new Collection());
    }

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

    await suggestionUtility.sendAnonymousSuggestion(
      interaction,
      content,
      config
    );

    interaction.reply({
      embeds: [
        defaultUtility.generateEmbed("success", {
          title: "Suggestion sent!",
          description: `View your suggestion in <#${config.channelId}>!`,
        }),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }
}
