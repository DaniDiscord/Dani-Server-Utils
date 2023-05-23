import {
  APIEmbedField,
  ApplicationCommandOptionType,
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

import { ApplicationCommandType } from "discord-api-types/v10";
import { AutoSlowManager } from "lib/autoslow";
import { CustomClient } from "lib/client";

const MIN = "min";
const MAX = "max";
const FREQUENCY = "frequency";
const MIN_CHANGE = "minchange";
const RATE_OF_CHANGE = "rateofchange";
const ENABLED = "enabled";

const CONFIG = "config";
const GET = "get";
const REMOVE = "remove";

export default class SlashCommand extends InteractionCommand {
  /**
   *
   */
  constructor(client: CustomClient) {
    super(client, {
      type: ApplicationCommandType.ChatInput,
      name: "autoslow",
      description: "Automatic Slow Mode",
      options: [
        {
          name: CONFIG,
          description: "Configure autoslow",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              name: MIN,
              description: "Minimum value for slow mode (1 second at least)",
              type: ApplicationCommandOptionType.Number,
            },
            {
              name: MAX,
              description: "Maximum value for slow mode",
              type: ApplicationCommandOptionType.Number,
            },
            {
              name: FREQUENCY,
              description: "Chat message frequency (suggested: 0.25)",
              type: ApplicationCommandOptionType.Number,
            },
            {
              name: MIN_CHANGE,
              description:
                "Minimum amount slow mode is allowed to change by (suggested: 5)",
              type: ApplicationCommandOptionType.Number,
            },
            {
              name: RATE_OF_CHANGE,
              description:
                "Maximum rate of change allowed for slow mode at higher values (suggested: 2)",
              type: ApplicationCommandOptionType.Number,
            },
            {
              name: ENABLED,
              description: "Autoslow enabled/disabled",
              type: ApplicationCommandOptionType.Boolean,
            },
          ],
        },
        {
          name: REMOVE,
          description:
            "Removes autoslow from the channel entirely (Prefer disabling instead)",
          type: ApplicationCommandOptionType.Subcommand,
        },
        {
          name: GET,
          description: "Gets autoslow parameters for channel",
          type: ApplicationCommandOptionType.Subcommand,
        },
      ],
      defaultMemberPermissions: new PermissionsBitField("Administrator"),
    });
  }

  paramEmbed(autoSlow: AutoSlowManager): APIEmbedField[] {
    const min = Math.floor(autoSlow.minSlow);
    const max = Math.floor(autoSlow.maxSlow);
    const freq = autoSlow.targetMsgsPerSec.toFixed(2);
    const minChange = autoSlow.minAbsoluteChange.toFixed(2);
    const rateOfChange = (autoSlow.minChangeRate * 100).toFixed(0);
    const enabled = autoSlow.enabled ? "enabled" : "disabled";
    return [
      { name: "min", value: `${min}s` },
      { name: "max", value: `${max}s` },
      { name: "freq", value: `${freq} msg/s` },
      { name: "min change", value: `${minChange}s` },
      { name: "min rate of change", value: `${rateOfChange}%` },
      { name: "state", value: enabled },
    ];
  }

  async execute(
    interaction: CommandInteraction<CacheType>
  ): Promise<CustomInteractionReplyOptions> {
    if (!(interaction instanceof ChatInputCommandInteraction)) {
      return { content: "Internal Error", eph: true };
    }

    const subCommand = interaction.options.getSubcommand();
    if (subCommand === REMOVE) {
      await this.client.removeAutoSlow(interaction.channelId);
      return {
        content: "Autoslow removed successfully",
        eph: true,
      };
    }

    const currentAutoSlow = await this.client.getAutoSlow(interaction.channelId);

    const commandMin = interaction.options.get(MIN)?.value;
    const commandMax = interaction.options.get(MAX)?.value;
    const commandFreq = interaction.options.get(FREQUENCY)?.value;
    const commandMinChange = interaction.options.get(MIN_CHANGE)?.value;
    const commandRateOfChange = interaction.options.get(RATE_OF_CHANGE)?.value;
    const commandEnabled = interaction.options.get(ENABLED)?.value;

    if (subCommand === GET) {
      let title = "Autoslow doesn't exist in this channel";
      let params: APIEmbedField[] = [];
      if (currentAutoSlow !== null) {
        title = "Autoslow parameters";
        params = this.paramEmbed(currentAutoSlow);
      }
      const embed = new EmbedBuilder().setTitle(title).addFields(params);
      return {
        embeds: [embed],
        eph: true,
      };
    }

    const min = commandMin ?? currentAutoSlow?.minSlow;
    const max = commandMax ?? currentAutoSlow?.maxSlow;
    const freq = commandFreq ?? currentAutoSlow?.targetMsgsPerSec;
    const minChange = commandMinChange ?? currentAutoSlow?.minAbsoluteChange;
    const minChangeRate = commandRateOfChange ?? currentAutoSlow?.minChangeRate;
    const enabled = commandEnabled ?? currentAutoSlow?.enabled;

    if (
      typeof min !== "number" ||
      typeof max !== "number" ||
      typeof freq !== "number" ||
      typeof minChange !== "number" ||
      typeof minChangeRate !== "number" ||
      typeof enabled !== "boolean"
    ) {
      return { content: "Missing parameters", eph: true };
    }

    if (freq <= 0) {
      return {
        content: "Error: Frequency has to be a positive value",
        eph: true,
      };
    }

    if (min < 1) {
      return {
        content: "Error: Minimum slow mode can't be lower than 1 second.",
        eph: true,
      };
    }
    if (minChange < 0) {
      return {
        content: "Error: Minimum Change cannot be negative",
        eph: true,
      };
    }
    if (minChangeRate < 0) {
      return {
        content: "Error: Minimum Change Rate cannot be negative",
        eph: true,
      };
    }
    if (minChange < 0.5 && min * minChangeRate < 0.5) {
      return {
        content: "Error: Minimum Change and Change Rate is too small",
        eph: true,
      };
    }

    const autoSlow = await this.client.addAutoSlow(
      interaction.channelId,
      min,
      max,
      freq,
      minChange,
      minChangeRate,
      enabled
    );
    const params = this.paramEmbed(autoSlow);
    const embed = new EmbedBuilder()
      .setTitle("Success: Setup slow mode")
      .addFields(params);
    return {
      embeds: [embed],
      eph: true,
    };
  }
}
