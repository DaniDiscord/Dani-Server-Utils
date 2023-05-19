import {
  ApplicationCommandOptionType,
  CacheType,
  ChatInputCommandInteraction,
  CommandInteraction,
  TextChannel,
} from "discord.js";
import {
  CustomInteractionReplyOptions,
  InteractionCommand,
} from "../../classes/CustomInteraction";

import { ApplicationCommandType } from "discord-api-types/v10";
import { CustomClient } from "lib/client";

const EMOJI = "emoji";

const NAME = "name";
const FILE = "file";

const SUGGEST = "suggest";
const SETUP = "setup";

const APPROVAL = "approval";
const VOTE = "vote";

export const emojiSuffix = "_c";
const maxEmojiNameLength = 32 - emojiSuffix.length;

const emojiNameGuidelines = `Emoji names have to be longer than 2 characters, shorter than ${maxEmojiNameLength} characters and may only contain alphanumeric characters or underscores.`;

export const approvalChannelId = "787154722209005629";
export const voteChannelId = "787113270291988503";

export const approve = "👍";
export const deny = "👎";

export const threshold = 0.8;
export const bias = 5;

function isValidEmojiName(name: string) {
  return /^[a-zA-Z0-9_]+$/.test(name);
}

export default class SlashCommand extends InteractionCommand {
  /**
   *
   */
  constructor(client: CustomClient) {
    super(client, {
      type: ApplicationCommandType.ChatInput,
      name: EMOJI,
      description: "Emoji suggestions!",
      options: [
        {
          description: "Suggest an emoji",
          name: SUGGEST,
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              description: "The emoji's name",
              name: NAME,
              type: ApplicationCommandOptionType.String,
              required: true,
            },
            {
              description: "A media link for the emoji",
              name: FILE,
              type: ApplicationCommandOptionType.Attachment,
              required: true,
            },
          ],
        },
        {
          description: "Setup emoji suggestions",
          name: SETUP,
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
          ],
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
    switch (subcommand) {
      case SUGGEST:
        const name = interaction.options.get(NAME, true).value;
        if (typeof name !== "string") {
          return {
            content: emojiNameGuidelines,
            eph: true,
          };
        }
        if (name.length < 2 || name.length > 30) {
          return {
            content: emojiNameGuidelines,
            eph: true,
          };
        }
        if (!isValidEmojiName(name)) {
          return {
            content: emojiNameGuidelines,
            eph: true,
          };
        }
        const png = interaction.options.get(FILE, true);
        const content = png.attachment?.attachment;
        if (content === undefined) {
          return { content: "File Error", eph: true };
        }

        const approvalChannel = await interaction.guild.channels.cache.get(
          approvalChannelId
        );
        if (approvalChannel === undefined) {
          return { content: "Approval channel can't be found" };
        }
        if (!(approvalChannel instanceof TextChannel)) {
          return { content: "Approval channel is not a text channel" };
        }

        const message = await approvalChannel.send({
          content: name,
          files: [{ attachment: content }],
        });

        await message.react(approve);
        await message.react(deny);
        await this.client.reactionHandler.onNewMessage(message);

        return {
          content: `Submission successful for ${name} with file ${png.name}`,
          eph: true,
        };
      default:
        return { content: "Internal Error", eph: true };
    }
  }
}
