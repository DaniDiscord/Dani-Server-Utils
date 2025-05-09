import {
  ActionRowBuilder,
  ApplicationCommandOptionType,
  ButtonBuilder,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  MessageActionRowComponentBuilder,
  PermissionsBitField,
  TextChannel,
} from "discord.js";
import { ApplicationCommandType, MessageFlags } from "discord-api-types/v10";
import { EMOJI_APPROVE, EMOJI_BAN, EMOJI_DENY } from "types/constants/emoji";

import { CustomApplicationCommand } from "lib/core/command";
import { DsuClient } from "lib/core/DsuClient";

export const commandId = "emojisuggest";
const NAME = "name";
const FILE = "file";
export const emojiSuffix = "_c";
const maxEmojiNameLength = 32 - emojiSuffix.length;
const emojiNameGuidelines = `Emoji names have to be longer than 2 characters, shorter than ${maxEmojiNameLength} characters and may only contain alphanumeric characters or underscores.`;

function isValidEmojiName(name: string) {
  return /^[a-zA-Z0-9_]+$/.test(name);
}

export default class EmojiSuggestion extends CustomApplicationCommand {
  constructor(client: DsuClient) {
    super("suggest", client, {
      type: ApplicationCommandType.ChatInput,
      description: "Suggest an emoji",
      permissionLevel: "USER",
      applicationData: [
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

  async run(interaction: ChatInputCommandInteraction) {
    const emojiUtility = this.client.utils.getUtility("emoji");
    if (!interaction.guild) return;
    const emojiSuggestionsConfig = await emojiUtility.getEmojiSuggestions(
      interaction.guildId ?? "",
    );

    if (emojiSuggestionsConfig === null) {
      return interaction.reply({
        content: "Emoji suggestions are currently closed",
        flags: MessageFlags.Ephemeral,
      });
    }
    if (interaction.guild.emojis.cache.size >= emojiSuggestionsConfig.emojiCap) {
      return interaction.reply({
        content: "Emoji cap has been hit, wait for updates",
        flags: MessageFlags.Ephemeral,
      });
    }

    const banReason = await emojiUtility.getBanReason(
      interaction.guild.id,
      commandId,
      interaction.user.id,
    );
    console.log(banReason);
    if (banReason !== undefined) {
      const banEmbed = new EmbedBuilder().addFields([
        {
          name: "You were banned from suggesting emojis for:",
          value: `${banReason}`,
        },
      ]);
      return interaction.reply({ embeds: [banEmbed], flags: MessageFlags.Ephemeral });
    }
    const lastUse = await emojiUtility.getLastCommandUse(
      interaction.guild.id,
      commandId,
      interaction.user.id,
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
        return interaction.reply({
          embeds: [timeLeft],
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    const name = interaction.options.get(NAME, true).value;
    if (typeof name !== "string") {
      return interaction.reply({
        content: emojiNameGuidelines,
        flags: MessageFlags.Ephemeral,
      });
    }
    if (name.length < 2 || name.length > 30) {
      return interaction.reply({
        content: emojiNameGuidelines,
        flags: MessageFlags.Ephemeral,
      });
    }
    if (!isValidEmojiName(name)) {
      return interaction.reply({
        content: emojiNameGuidelines,
        flags: MessageFlags.Ephemeral,
      });
    }
    // TODO: Check File Size
    const png = interaction.options.get(FILE, true);
    const content = png.attachment;
    if (content === undefined) {
      return interaction.reply({
        content: "File Error",
        flags: MessageFlags.Ephemeral,
      });
    }
    if (content.width === null || content.height === null) {
      return interaction.reply({
        content: "Unrecognized File Type",
        flags: MessageFlags.Ephemeral,
      });
    }
    if (content.contentType !== "image/png") {
      return interaction.reply({
        content: "Please only send PNG files",
        flags: MessageFlags.Ephemeral,
      });
    }
    if (content.width > 128 || content.height > 128) {
      return interaction.reply({
        content:
          "Please limit emoji size to 128x128 as this is the maximum discord can support",
        flags: MessageFlags.Ephemeral,
      });
    }

    const approvalChannel = await interaction.guild.channels.cache.get(
      emojiSuggestionsConfig.sourceId,
    );
    if (approvalChannel === undefined) {
      return interaction.reply({
        content: "Approval channel can't be found",
        flags: MessageFlags.Ephemeral,
      });
    }
    if (!(approvalChannel instanceof TextChannel)) {
      return interaction.reply({
        content: "Approval channel is not a text channel",
        flags: MessageFlags.Ephemeral,
      });
    }

    const approveButton = new ButtonBuilder()
      .setEmoji(EMOJI_APPROVE)
      .setCustomId("approve")
      .setStyle(ButtonStyle.Primary);
    const denyButton = new ButtonBuilder()
      .setEmoji(EMOJI_DENY)
      .setCustomId("deny")
      .setStyle(ButtonStyle.Primary);
    const banButton = new ButtonBuilder()
      .setEmoji(EMOJI_BAN)
      .setCustomId("ban")
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

    return interaction.reply({
      content: `Submission successful for ${name}`,
      flags: MessageFlags.Ephemeral,
    });
  }
}
