import {
  ApplicationCommandOptionType,
  CacheType,
  ChatInputCommandInteraction,
  CommandInteraction,
  EmbedBuilder,
} from "discord.js";
import {
  CustomInteractionReplyOptions,
  InteractionCommand,
} from "../../classes/CustomInteraction";

import { ApplicationCommandType } from "discord-api-types/v10";
import { CustomClient } from "lib/client";
import { EmojiSuggestions } from "lib/emojiSuggestions";

const EMOJI = "emoji";

const CONFIG = "config";
const GET = "get";
const REMOVE = "remove";

const APPROVAL = "approval";
const VOTE = "vote";
const THRESHOLD = "threshold";
const BIAS = "bias";
const CAP = "cap";

export const approve = "👍";
export const deny = "👎";

export const approveId = "approve";
export const denyId = "deny";

export const thresholdDefault = 0.75;
export const biasDefault = 3;
function getEmbed(emojiConfig: EmojiSuggestions): EmbedBuilder {
  const percentage = emojiConfig.threshold * 100;
  const epsilon = emojiConfig.bias;
  return new EmbedBuilder().addFields([
    { name: "Approval Channel", value: `<#${emojiConfig.sourceId}>` },
    { name: "Voting Channel", value: `<#${emojiConfig.voteId}>` },
    { name: "Threshold", value: `${percentage.toFixed(1)}%` },
    { name: "Epsilon", value: `${epsilon.toFixed(2)}` },
  ]);
}

export default class SlashCommand extends InteractionCommand {
  /**
   *
   */

  // TODO: Add per-user cooldown
  constructor(client: CustomClient) {
    super(client, {
      type: ApplicationCommandType.ChatInput,
      name: EMOJI,
      description: "Emoji suggestions!",
      options: [
        {
          description: "Setup emoji suggestions",
          name: CONFIG,
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              description: "Channel to approve/deny emojis",
              name: APPROVAL,
              type: ApplicationCommandOptionType.Channel,
            },
            {
              description: "Channel to vote for emojis",
              name: VOTE,
              type: ApplicationCommandOptionType.Channel,
            },
            {
              description: "Amount of emojis to stop taking suggestions at",
              name: CAP,
              type: ApplicationCommandOptionType.Number,
            },
            {
              description: `Emoji accept/reject threshold (0 < x < 1)
              default: ${thresholdDefault}`,
              name: THRESHOLD,
              type: ApplicationCommandOptionType.Number,
            },
            {
              description: `Higher the bias, the more votes are needed to reach threshold.
              default: ${biasDefault}`,
              name: BIAS,
              type: ApplicationCommandOptionType.Number,
            },
          ],
        },
        {
          description: "Get the details of the Emoji Event",
          name: GET,
          type: ApplicationCommandOptionType.Subcommand,
        },
        {
          description: "End emoji suggestions event",
          name: REMOVE,
          type: ApplicationCommandOptionType.Subcommand,
        },
      ],
      // defaultMemberPermissions: "Administrator",
    });
  }

  async execute(
    interaction: CommandInteraction<CacheType>
  ): Promise<CustomInteractionReplyOptions> {
    if (!(interaction instanceof ChatInputCommandInteraction)) {
      return { content: "Internal Error", eph: true };
    }
    const subcommand = interaction.options.getSubcommand();
    const emojiSuggestionsConfig = await this.client.getEmojiSuggestions(
      interaction.guildId
    );
    switch (subcommand) {
      case GET:
        if (emojiSuggestionsConfig === null) {
          return {
            content: "Emoji suggestions are not setup",
            eph: true,
          };
        }

        return { embeds: [getEmbed(emojiSuggestionsConfig)], eph: true };
      case REMOVE:
        await this.client.removeEmojiSuggestions(interaction.guildId);
        return {
          content: "Emoji suggestions removed successfully",
          eph: true,
        };
      case CONFIG:
        const sourceId =
          interaction.options.get(APPROVAL)?.value ?? emojiSuggestionsConfig?.sourceId;
        const voteId =
          interaction.options.get(VOTE)?.value ?? emojiSuggestionsConfig?.voteId;
        const threshold =
          interaction.options.get(THRESHOLD)?.value ??
          emojiSuggestionsConfig?.threshold ??
          thresholdDefault;
        const bias =
          interaction.options.get(BIAS)?.value ??
          emojiSuggestionsConfig?.bias ??
          biasDefault;
        const cap =
          interaction.options.get(CAP)?.value ?? emojiSuggestionsConfig?.emojiCap;

        if (
          typeof sourceId !== "string" ||
          typeof voteId !== "string" ||
          typeof threshold !== "number" ||
          typeof bias !== "number" ||
          typeof cap !== "number"
        ) {
          return { content: "Missing input or wrong datatype inputted", eph: true };
        }
        const newEmojiSuggestions = new EmojiSuggestions(
          interaction.guildId,
          sourceId,
          voteId,
          threshold,
          bias,
          cap
        );
        await this.client.setEmojiSuggestions(newEmojiSuggestions);
        return { embeds: [getEmbed(newEmojiSuggestions)], eph: true };

      default:
        return { content: "Internal Error", eph: true };
    }
  }
}
