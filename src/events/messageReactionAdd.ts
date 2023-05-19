import { Client, GuildMember, MessageReaction, TextChannel, User } from "discord.js";
import {
  approvalChannelId,
  approve,
  bias,
  deny,
  emojiSuffix,
  threshold,
  voteChannelId,
} from "interactions/chatInput/emoji";

import internal from "stream";

const delay = async (ms: number) => new Promise((res) => setTimeout(res, ms));

const EMOJI_LIMIT = 150;

export default async (
  client: Client,
  reaction: MessageReaction,
  user: User
): Promise<void> => {
  if (user.bot) {
    return;
  }
  const message = reaction.message;
  if (message.channelId === approvalChannelId) {
    if (reaction.partial) {
      await reaction.fetch();
    }
    const thumbsUp = message.reactions.cache.get(approve)?.count;
    const thumbsDown = message.reactions.cache.get(deny)?.count;
    if (thumbsUp === undefined || thumbsDown === undefined) {
      await message.channel.send("Error counting reactions");
      return;
    }
    if (thumbsDown > 1) {
      await delay(5000);
      const newThumbsDown = message.reactions.cache.get(deny)?.count;
      if (newThumbsDown == 1) {
        return;
      }
      await message.delete();
    } else if (thumbsUp > thumbsDown) {
      await delay(5000);
      // Give 5 second period to fix any misclicks
      const newThumbsUp = message.reactions.cache.get(approve)?.count;
      const newThumbsDown = message.reactions.cache.get(deny)?.count;
      if (newThumbsUp !== thumbsUp) {
        return;
      }
      if (newThumbsDown !== undefined && newThumbsDown > 1) {
        return;
      }

      const voteChannel = message.guild?.channels.cache.get(voteChannelId);
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
        files: [{ attachment: attachment.attachment }],
      });
      await voteMessage.react(approve);
      await voteMessage.react(deny);
      await message.delete();
      // voteChannel.send({ attachments: . });
    }
  }
  const guild = message.guild;
  if (guild === null) {
    return;
  }
  const emojiLimitFull = guild.emojis.cache.size >= EMOJI_LIMIT;
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
      if (guild.emojis.cache.size >= EMOJI_LIMIT - 1) {
        await message.channel.send(
          `With this emoji, the allocated quota has been filled.
          Next votes will include which emoji you want to replace.`
        );
      }
      const emojiFile = attachment.attachment;
      if (emojiFile instanceof internal.Stream) {
        return;
      }
      const emojiCreate = {
        attachment: emojiFile,
        name: emojiName + emojiSuffix,
      };
      await guild.emojis.create(emojiCreate);
    }
  }
};
