import {
  APIEmbedField,
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ChatInputCommandInteraction,
  MessageFlags,
  PermissionsBitField,
} from "discord.js";

import { AutoSlowModel } from "models/AutoSlow";
import { AutoSlowUtility } from "../../utilities/autoSlow";
import { CustomApplicationCommand } from "lib/core/command";
import DefaultClientUtilities from "lib/util/defaultUtilities";
import { DsuClient } from "lib/core/DsuClient";
import { PermissionLevels } from "types/commands";

const MIN = "min";
const MAX = "max";
const FREQUENCY = "frequency";
const MAX_CHANGE = "maxchange";
const RATE_OF_CHANGE = "rateofchange";
const ENABLED = "enabled";

const CONFIG = "config";
const GET = "get";
const REMOVE = "remove";

export default class AutoSlow extends CustomApplicationCommand {
  constructor(client: DsuClient) {
    super("autoslow", client, {
      type: ApplicationCommandType.ChatInput,
      description: "Automatic Slow mode",
      permissionLevel: PermissionLevels.USER,
      applicationData: [
        {
          name: CONFIG,
          description: "Configure autoslow",
          type: ApplicationCommandOptionType.Subcommand,
          level: PermissionLevels.MODERATOR,
          options: [
            {
              name: MIN,
              description: "Minimum value for slow mode (1 second at least)",
              type: ApplicationCommandOptionType.Number,
              min_value: 1,
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
              min_value: 0,
            },
            {
              name: MAX_CHANGE,
              description:
                "The default maximum amount slowmode is allowed to change by. (suggested: 5)",
              type: ApplicationCommandOptionType.Number,
              min_value: 0,
            },
            {
              name: RATE_OF_CHANGE,
              description:
                "The amount slowmode is allowed to change, proportional to current slow mode. (suggested: 2)",
              type: ApplicationCommandOptionType.Number,
              min_value: 0,
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
          level: PermissionLevels.MODERATOR,

          description:
            "Removes autoslow from the channel entirely (Prefer disabling instead)",
          type: ApplicationCommandOptionType.Subcommand,
        },
        {
          name: GET,
          level: PermissionLevels.HELPER,
          description: "Gets autoslow parameters for channel",
          type: ApplicationCommandOptionType.Subcommand,
        },
      ],
      defaultMemberPermissions: new PermissionsBitField("Administrator"),
    });
  }
  getParamsForEmbed(autoSlow: AutoSlowUtility) {
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

  async run(interaction: ChatInputCommandInteraction) {
    const subCommand = interaction.options.getSubcommand();
    if (subCommand === REMOVE) {
      await this.removeAutoSlow(interaction.channelId);
      return interaction.reply({
        content: "Autoslow removed successfully",
        flags: MessageFlags.Ephemeral,
      });
    }

    const currentAutoSlow = await AutoSlowUtility.getAutoSlow(interaction.channelId);

    const commandMin = interaction.options.getNumber(MIN);
    const commandMax = interaction.options.getNumber(MAX);
    const commandFreq = interaction.options.getNumber(FREQUENCY);
    const commandMinChange = interaction.options.getNumber(MAX_CHANGE);
    const commandRateOfChange = interaction.options.getNumber(RATE_OF_CHANGE);
    const commandEnabled = interaction.options.getBoolean(ENABLED);

    if (subCommand === GET) {
      if (!currentAutoSlow) {
        return interaction.reply({
          embeds: [
            DefaultClientUtilities.generateEmbed("error", {
              title: "Autoslow does not exist in this channel.",
            }),
          ],
        });
      }
      let params: APIEmbedField[] = this.getParamsForEmbed(currentAutoSlow);
      const embed = DefaultClientUtilities.generateEmbed("general", {
        title: "Autoslow Parameters",
      }).addFields(params);
      return interaction.reply({
        embeds: [embed],
        flags: MessageFlags.Ephemeral,
      });
    }

    const min = commandMin ?? currentAutoSlow?.minSlow;
    const max = commandMax ?? currentAutoSlow?.maxSlow;
    const freq = commandFreq ?? currentAutoSlow?.targetMsgsPerSec;
    const minChange = commandMinChange ?? currentAutoSlow?.minAbsoluteChange;
    const minChangeRate = commandRateOfChange ?? currentAutoSlow?.minChangeRate;
    const enabled = commandEnabled ?? currentAutoSlow?.enabled;

    if (
      !interaction.channelId ||
      min === undefined ||
      max === undefined ||
      freq === undefined ||
      minChange === undefined ||
      minChangeRate === undefined ||
      enabled === undefined
    ) {
      await interaction.reply({
        embeds: [
          DefaultClientUtilities.generateEmbed("error", {
            title: "Missing parameters",
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (minChange < 0.5 && min * minChangeRate < 0.5) {
      await interaction.reply({
        embeds: [
          DefaultClientUtilities.generateEmbed("error", {
            title: "Values Too Small",
            description: "Minimum Change and Change Rate is too small.",
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const autoSlow = await this.addAutoSlow(
      interaction.channelId,
      min,
      max,
      freq,
      minChange,
      minChangeRate,
      enabled,
    );

    const params = this.getParamsForEmbed(autoSlow);

    return await interaction.reply({
      embeds: [
        DefaultClientUtilities.generateEmbed("success", {
          title: "Slow Mode Setup Successful",
          fields: params,
        }),
      ],
      flags: MessageFlags.Ephemeral,
    });

    return;
  }

  /**
   * Adds autoslow data to given channel and DB.
   * @param channelId The id of the channel to add autoslow to
   * @param min The minimum seconds autoslow should use
   * @param max The maximum seconds autoslow should use
   * @param targetMsgsPerSec The frequency of messages
   * @param minChange The lowest change
   * @param minChangeRate How many times it should change
   * @param enabled Whether auto slow is enabled
   * @returns Promise\<AutoslowUtility\>
   */
  private async addAutoSlow(
    channelId: string,
    min: number,
    max: number,
    targetMsgsPerSec: number,
    minChange: number,
    minChangeRate: number,
    enabled: boolean,
  ) {
    let autoSlow = AutoSlowUtility.cache.get(channelId);

    if (!autoSlow) {
      autoSlow = new AutoSlowUtility();
      AutoSlowUtility.cache.set(channelId, autoSlow);
    }

    autoSlow.setAutoSlowParams(
      min,
      max,
      targetMsgsPerSec,
      minChange,
      minChangeRate,
      enabled,
    );

    await AutoSlowModel.findOneAndUpdate(
      { channelId },
      { min, max, targetMsgsPerSec, minChange, minChangeRate, enabled },
      { upsert: true, new: true },
    );

    return autoSlow;
  }
  /**
   * Remove autoslow data from given channel and DB.
   * @param channelId the channel the autoslow is in.
   * @returns Promise\<void\>
   */
  private async removeAutoSlow(channelId: string): Promise<void> {
    AutoSlowUtility.cache.delete(channelId);
    await AutoSlowModel.deleteOne({ channelId: channelId });
  }
}
