import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageFlags,
  PermissionsBitField,
} from "discord.js";
import { CustomApplicationCommand } from "lib/core/command";
import { DsuClient } from "lib/core/DsuClient";
import { EmojiSuggestions } from "../../utilities/emojiSuggestions";
import { EmojiUsageModel } from "models/EmojiUsage";
import { IEmojiUsage } from "types/mongodb";

const EMOJI = "emoji";
const LIST = "list";
const CONFIG = "config";
const GET = "get";
const REMOVE = "remove";

const UNBAN = "unban";

const USER = "user";
const APPROVAL = "approval";
const VOTE = "vote";
const COOLDOWN = "cooldown";
const THRESHOLD = "threshold";
const BIAS = "bias";
const CAP = "cap";

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

export default class EmojiSuggestion extends CustomApplicationCommand {
  constructor(client: DsuClient) {
    super(EMOJI, client, {
      type: ApplicationCommandType.ChatInput,
      permissionLevel: "USER",
      description: "Emoji suggestions!",
      applicationData: [
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
              description: "Per-user cooldown in seconds",
              name: COOLDOWN,
              type: ApplicationCommandOptionType.Number,
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
          description: "List top 10 most popular server emojis.",
          name: LIST,
          type: ApplicationCommandOptionType.Subcommand,
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
        {
          description: "Unban user from suggesting emojis",
          name: UNBAN,
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              description: "User to unban from suggestions",
              name: USER,
              type: ApplicationCommandOptionType.User,
              required: true,
            },
          ],
        },
      ],
      defaultMemberPermissions: new PermissionsBitField("Administrator"),
    });
  }

  async run(interaction: ChatInputCommandInteraction) {
    const emojiUtility = this.client.utils.getUtility("emoji");
    const subcommand = interaction.options.getSubcommand();
    if (!interaction.guild) return;

    const emojiSuggestionsConfig = await emojiUtility.getEmojiSuggestions(
      interaction.guild.id
    );

    switch (subcommand) {
      case GET:
        if (emojiSuggestionsConfig === null) {
          return interaction.reply({
            content: "Emoji suggestions are not setup",
            flags: MessageFlags.Ephemeral,
          });
        }

        return interaction.reply({
          embeds: [getEmbed(emojiSuggestionsConfig)],
          flags: MessageFlags.Ephemeral,
        });
      case REMOVE:
        await emojiUtility.removeEmojiSuggestions(interaction.guild.id);
        return interaction.reply({
          content: "Emoji suggestions removed successfully",
          flags: MessageFlags.Ephemeral,
        });
      case CONFIG:
        const sourceId =
          interaction.options.get(APPROVAL)?.value ??
          emojiSuggestionsConfig?.sourceId;
        const voteId =
          interaction.options.get(VOTE)?.value ??
          emojiSuggestionsConfig?.voteId;
        const threshold =
          interaction.options.get(THRESHOLD)?.value ??
          emojiSuggestionsConfig?.threshold ??
          thresholdDefault;
        const bias =
          interaction.options.get(BIAS)?.value ??
          emojiSuggestionsConfig?.bias ??
          biasDefault;
        const cap =
          interaction.options.get(CAP)?.value ??
          emojiSuggestionsConfig?.emojiCap;
        const cooldown =
          interaction.options.get(COOLDOWN)?.value ??
          emojiSuggestionsConfig?.cooldown;

        if (
          typeof sourceId !== "string" ||
          typeof voteId !== "string" ||
          typeof threshold !== "number" ||
          typeof bias !== "number" ||
          typeof cap !== "number" ||
          typeof cooldown !== "number"
        ) {
          return interaction.reply({
            content: "Missing input or wrong datatype inputted",
            flags: MessageFlags.Ephemeral,
          });
        }
        const newEmojiSuggestions = new EmojiSuggestions(
          interaction.guild.id,
          sourceId,
          voteId,
          threshold,
          bias,
          cap,
          cooldown
        );
        await emojiUtility.setEmojiSuggestions(newEmojiSuggestions);
        return interaction.reply({
          embeds: [getEmbed(newEmojiSuggestions)],
          flags: MessageFlags.Ephemeral,
        });
      case UNBAN:
        const user = interaction.options.getUser(USER, true);
        await emojiUtility.unbanFromSuggestion(
          interaction.guild.id,
          "emojisuggest",
          user.id
        );
        return interaction.reply({
          content: `<@${user.id}> unbanned`,
          flags: MessageFlags.Ephemeral,
        });
      case LIST:
        const usages = await EmojiUsageModel.find({
          guildId: interaction.guild.id,
        });

        const sorted = usages
          .sort((a, b) => {
            return b.count - a.count;
          })
          .slice(0, 10);

        const emojiFormat = (pageItems: IEmojiUsage[], page: number) => {
          return pageItems
            .map(
              (emoji, index) =>
                `${page * 5 + index + 1}. **${emoji.name}** (used **${
                  emoji.count
                }** times)
                  last used <t:${Math.floor(
                    emoji.lastUsage.getTime() / 1000
                  )}:D>`
            )
            .join("\n");
        };
        console.log(usages.map((v) => v));
        this.client.utils
          .getUtility("default")
          .buildPagination(interaction, sorted, 2, 0, 5, emojiFormat);

        break;
      default:
        return interaction.reply({
          content: "Internal Error",
          flags: MessageFlags.Ephemeral,
        });
    }
  }
}
