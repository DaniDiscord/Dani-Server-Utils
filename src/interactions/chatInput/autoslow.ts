import {
  ApplicationCommandOptionType,
  CacheType,
  ChatInputCommandInteraction,
  CommandInteraction,
  PermissionsBitField,
} from "discord.js";
import {
  CustomInteractionReplyOptions,
  InteractionCommand,
} from "../../classes/CustomInteraction";

import { ApplicationCommandType } from "discord-api-types/v10";
import { CustomClient } from "lib/client";

const MIN = "min";
const MAX = "max";
const FREQUENCY = "frequency";
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
    const commandEnabled = interaction.options.get(ENABLED)?.value;

    if (subCommand === GET) {
      let content = "Autoslow doesn't exist in this channel";
      if (currentAutoSlow !== null) {
        content = `Current autoslow parameters:
        min: ${currentAutoSlow.minSlow}s
        max: ${currentAutoSlow.maxSlow}s
        freq: ${currentAutoSlow.targetMsgsPerSec} msg/s
        enabled: ${currentAutoSlow.enabled}`;
      }
      return {
        content: content,
        eph: true,
      };
    }

    const min = commandMin ?? currentAutoSlow?.minSlow;
    const max = commandMax ?? currentAutoSlow?.maxSlow;
    const freq = commandFreq ?? currentAutoSlow?.targetMsgsPerSec;
    const enabled = commandEnabled ?? currentAutoSlow?.enabled;

    if (
      typeof min !== "number" ||
      typeof max !== "number" ||
      typeof freq !== "number" ||
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

    this.client.addAutoSlow(interaction.channelId, min, max, freq, enabled);
    return {
      content: `Success: Setup slow mode
       min: ${min}s
       max: ${max}s
       freq: ${freq}
       enabled: ${enabled}`,
      eph: true,
    };
  }
}
