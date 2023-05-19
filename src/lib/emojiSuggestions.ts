import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  Interaction,
  MessageActionRowComponentBuilder,
  MessageReaction,
  TextChannel,
  User,
} from "discord.js";
import { approve, approveId, deny, denyId } from "interactions/chatInput/emoji";

import { CustomClient } from "./client";
import axios from "axios";
import { emojiSuffix } from "interactions/chatInput/emojiSuggest";

const confirmationTimeoutPeriod = 15000;

export class EmojiSuggestions {
  guildId: string;
  sourceId: string;
  voteId: string;
  threshold: number;
  bias: number;
  emojiCap: number;

  constructor(
    guildId: string,
    sourceId: string,
    voteId: string,
    threshold: number,
    bias: number,
    emojiCap: number
  ) {
    if (sourceId === voteId) {
      throw new Error("Source channel cannot be the same as the Vote channel ");
    }
    if (threshold <= 0 || threshold >= 1) {
      throw new Error("Selection threshold should be > 0 and < 1");
    }
    if (bias <= 0) {
      throw new Error("Bias should be positive");
    }
    this.guildId = guildId;
    this.sourceId = sourceId;
    this.voteId = voteId;
    this.threshold = threshold;
    this.bias = bias;
    this.emojiCap = emojiCap;
  }
}

export async function onInteraction(client: CustomClient, interaction: Interaction) {
  if (!interaction.isButton()) {
    return;
  }
  const guildId = interaction.guildId;
  if (guildId === null) {
    return;
  }
  const emojiSuggestionsConfig = await client.getEmojiSuggestions(guildId);
  if (emojiSuggestionsConfig === null) {
    return;
  }
  if (interaction.customId !== approveId && interaction.customId !== denyId) {
    return;
  }
  if (interaction.channelId === emojiSuggestionsConfig.sourceId) {
    const confirmLabel =
      interaction.customId === approveId
        ? "Send Emoji to Voting"
        : "Remove Emoji from Voting";
    const confirmStyle =
      interaction.customId === approveId ? ButtonStyle.Primary : ButtonStyle.Danger;
    const confirmMessage =
      interaction.customId === approveId
        ? "Directing Emoji to Voting"
        : "Removing Emoji from Channel";

    const confirmationId = "confirm";
    const cancelId = "cancel";
    const confirm = new ButtonBuilder()
      .setLabel(confirmLabel)
      .setCustomId(confirmationId)
      .setStyle(confirmStyle);
    const cancel = new ButtonBuilder()
      .setLabel("Cancel")
      .setCustomId(cancelId)
      .setStyle(ButtonStyle.Secondary);
    const row = new ActionRowBuilder<MessageActionRowComponentBuilder>().setComponents([
      confirm,
      cancel,
    ]);

    const response = await interaction.reply({ components: [row], ephemeral: true });
    let confirmed = false;
    try {
      const confirmation = await response.awaitMessageComponent({
        time: confirmationTimeoutPeriod,
      });
      if (confirmation.customId == confirmationId) {
        await confirmation.update({
          content: confirmMessage,
          components: [],
        });
        confirmed = true;
      } else if (confirmation.customId == cancelId) {
        await confirmation.update({
          content: "Cancelling",
          components: [],
        });
      }
    } catch (e) {
      await interaction.editReply({
        content: "Confirmation not received, cancelling",
        components: [],
      });
    }

    if (confirmed && interaction.customId == denyId) {
      interaction.message.delete();
    } else if (!confirmed) {
      return;
    }

    if (interaction.message.partial) {
      await interaction.message.fetch();
    }
    const message = interaction.message;
    const voteChannel = message.guild?.channels.cache.get(emojiSuggestionsConfig.voteId);
    if (voteChannel === undefined || !(voteChannel instanceof TextChannel)) {
      await message.channel.send("Error initiating vote");
      return;
    }

    // Attachment is an iterator and destructuring etc. risks crashes
    let attachment;
    for (attachment of message.attachments.values()) {
      break;
    }
    // attachment = message.attachments.values().next().value;
    if (attachment === undefined) {
      await message.channel.send("Error accessing emoji");
      return;
    }
    const voteMessage = await voteChannel.send({
      content: message.content,
      files: [{ attachment: attachment.proxyURL }],
    });
    await voteMessage.react(approve);
    await voteMessage.react(deny);
    await message.delete();
  }
}

export async function onReactionEvent(
  client: Client,
  reaction: MessageReaction,
  user: User
): Promise<void> {
  if (user.bot) {
    return;
  }
  const message = reaction.message;
  const guildId = message.guildId;
  if (guildId === null) {
    return;
  }
  const emojiSuggestionsConfig = await client.getEmojiSuggestions(guildId);
  if (emojiSuggestionsConfig === null) {
    return;
  }
  const voteChannelId = emojiSuggestionsConfig.voteId;
  const threshold = emojiSuggestionsConfig.threshold;
  const bias = emojiSuggestionsConfig.bias;

  const guild = message.guild;
  if (guild === null) {
    return;
  }
  const emojiLimitFull = guild.emojis.cache.size >= emojiSuggestionsConfig.emojiCap;
  if (message.channelId === voteChannelId && !emojiLimitFull) {
    if (reaction.partial) {
      await reaction.fetch();
    }
    let thumbsUp = message.reactions.cache.get(approve)?.count ?? 1;
    let thumbsDown = message.reactions.cache.get(deny)?.count ?? 1;

    // The bot already has 1 reaction for each.
    thumbsUp -= 1;
    thumbsDown -= 1;

    const denom = thumbsUp + thumbsDown + bias;
    const pass = thumbsUp / denom > threshold;
    const fail = thumbsDown / denom > threshold;
    if (fail) {
      message.reactions.removeAll();
      await message.react("😔");
    }
    if (pass) {
      // Let the user now their emoji passed the vote
      await message.reactions.removeAll();
      await message.react("✨");

      const emojiName = message.content;
      let attachment;
      for (attachment of message.attachments.values()) {
        break;
      }
      const guild = message.guild;
      if (guild === null || attachment === undefined || emojiName === null) {
        return;
      }
      if (guild.emojis.cache.size >= emojiSuggestionsConfig.emojiCap - 1) {
        await message.channel.send(
          `With this emoji, the allocated quota has been filled.
          Next votes will include which emoji you want to replace.`
        );
      }
      const emoji = await axios.get(attachment.proxyURL, {
        responseType: "arraybuffer",
      });
      if (!(emoji.data instanceof Buffer)) {
        // It is guaranteed that it is a buffer
        throw new Error("Axios did not return Buffer");
      }

      const emojiCreate = {
        attachment: Buffer.from(emoji.data),
        name: emojiName + emojiSuffix,
      };
      await guild.emojis.create(emojiCreate);
    }
  }
}
