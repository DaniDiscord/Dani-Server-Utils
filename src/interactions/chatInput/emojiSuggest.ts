import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ButtonStyle,
  CacheType,
  ChatInputCommandInteraction,
  CommandInteraction,
  EmbedBuilder,
  MessageActionRowComponentBuilder,
  PermissionsBitField,
  TextChannel,
} from "discord.js";
import {
  CustomInteractionReplyOptions,
  InteractionCommand,
} from "../../classes/CustomInteraction";
import { approve, approveId, ban, banId, deny, denyId } from "./emoji";

import { ApplicationCommandType } from "discord-api-types/v10";
import { CustomClient } from "lib/client";

export const commandId = "emojisuggest";
const NAME = "name";
const FILE = "file";

const SUGGEST = "suggest";
export const emojiSuffix = "_c";
const maxEmojiNameLength = 32 - emojiSuffix.length;
const emojiNameGuidelines = `Emoji names have to be longer than 2 characters, shorter than ${maxEmojiNameLength} characters and may only contain alphanumeric characters or underscores.`;

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
      name: SUGGEST,
      description: "Suggest an emoji",
      options: [
        {
          description: "Suggest an emoji",
          name: "emoji",
          type: ApplicationCommandOptionType.Subcommand,
          options: [
            {
              description: "The emoji's name",
              name: NAME,
              type: ApplicationCommandOptionType.String,
              required: true,
            },
            {
              description: "The emoji's .png file (128x128 largest)",
              name: FILE,
              type: ApplicationCommandOptionType.Attachment,
              required: true,
            },
          ],
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

    const emojiSuggestionsConfig = await this.client.getEmojiSuggestions(
      interaction.guildId
    );
    if (emojiSuggestionsConfig === null) {
      return {
        content: "Emoji suggestions are currently closed",
        eph: true,
      };
    }
    if (interaction.guild.emojis.cache.size >= emojiSuggestionsConfig.emojiCap) {
      return {
        content: "Emoji cap has been hit, wait for updates",
        eph: true,
      };
    }

    const banReason = await this.client.banReason(
      interaction.guildId,
      commandId,
      interaction.user.id
    );
    console.log(banReason);
    if (banReason !== undefined) {
      const banEmbed = new EmbedBuilder().addFields([
        {
          name: "You were banned from suggesting emojis for:",
          value: `${banReason}`,
        },
      ]);
      return { embeds: [banEmbed], eph: true };
    }
    const lastUse = await this.client.getLastCommandUse(
      interaction.guildId,
      commandId,
      interaction.user.id
    );
    if (lastUse !== null) {
      const deltaTime = Date.now() - lastUse;
      // Convert cooldown to millis as we work in seconds
      const cooldownMillis = emojiSuggestionsConfig.cooldown * 1000;
      if (deltaTime < cooldownMillis) {
        const reuseTime = Math.floor((lastUse + cooldownMillis) / 1000);
        const timeLeft = new EmbedBuilder().addFields([
          {
            name: "Command cooldown",
            value: `you can use this command again <t:${reuseTime}:R>`,
          },
        ]);
        return { embeds: [timeLeft], eph: true };
      }
    }

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
    // TODO: Check File Size
    const png = interaction.options.get(FILE, true);
    const content = png.attachment;
    if (content === undefined) {
      return { content: "File Error", eph: true };
    }
    if (content.width === null || content.height === null) {
      return { content: "Unrecognized File Type", eph: true };
    }
    if (content.contentType !== "image/png") {
      return { content: "Please only send PNG files", eph: true };
    }
    if (content.width > 128 || content.height > 128) {
      return {
        content:
          "Please limit emoji size to 128x128 as this is the maximum discord can support",
        eph: true,
      };
    }

    const approvalChannel = await interaction.guild.channels.cache.get(
      emojiSuggestionsConfig.sourceId
    );
    if (approvalChannel === undefined) {
      return { content: "Approval channel can't be found", eph: true };
    }
    if (!(approvalChannel instanceof TextChannel)) {
      return { content: "Approval channel is not a text channel", eph: true };
    }

    const approveButton = new ButtonBuilder()
      .setEmoji(approve)
      .setCustomId(approveId)
      .setStyle(ButtonStyle.Primary);
    const denyButton = new ButtonBuilder()
      .setEmoji(deny)
      .setCustomId(denyId)
      .setStyle(ButtonStyle.Primary);
    const banButton = new ButtonBuilder()
      .setEmoji(ban)
      .setCustomId(banId)
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().setComponents([
      approveButton,
      denyButton,
      banButton,
    ]);

    await approvalChannel.send({
      content: `${name} from <@${interaction.user.id}>`,
      files: [{ attachment: content.proxyURL }],
      components: [row],
    });

    await this.client.registerCommandUsage(
      interaction.guildId,
      commandId,
      interaction.user.id
    );

    return {
      content: `Submission successful for ${name}`,
      eph: true,
    };
  }
}
