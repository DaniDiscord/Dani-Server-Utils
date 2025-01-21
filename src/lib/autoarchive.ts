import {
  AutoArchiveForumBlacklistModel,
  AutoArchiveForumModel,
} from "models/AutoArchive";
import { Client, EmbedBuilder, ForumChannel } from "discord.js";
import { DAY, MINUTE, SECOND, parseDurationToString } from "./timeParser";

export async function autoArchiveInForum(channel: ForumChannel, expireDuration: number) {
  const blacklist = await AutoArchiveForumBlacklistModel.findOne({
    guildId: channel.guildId,
  });
  const blacklistedThreads = blacklist?.threads || [];

  const activeThreads = await channel.threads.fetchActive();
  const archivedThreads = await channel.threads.fetchArchived();
  const threads = [
    ...activeThreads.threads.values(),
    ...archivedThreads.threads.values(),
  ];

  let nearestThreadLock = DAY;
  for (const thread of threads) {
    if (blacklistedThreads.includes(thread.id)) continue;
    if (thread.locked) continue;

    const messages = await thread.messages.fetch({ limit: 1 });
    const lastMessage = messages.first();
    if (!lastMessage) continue;

    const lastMessageAt = lastMessage?.createdAt;
    if (!lastMessageAt) continue;

    const ageInMs = Date.now() - lastMessageAt.getTime();

    if (ageInMs > expireDuration) {
      try {
        const embed = new EmbedBuilder()
          .setTitle(`Post Locked`)
          .setDescription(`This post has been automatically locked due to inactivity.`)
          .setColor("Red");

        await thread.send({ embeds: [embed] });
      } catch (error) {
        log.warn(
          `Failed to send lock embed for thread (${thread.id}) in channel (${channel.id})`,
          error as Error
        );
      }

      await thread.setLocked(
        true,
        `Auto-Lock after ${parseDurationToString(ageInMs)} of inactivity.`
      );

      await thread.setArchived(true);
    }

    const timeLeft = expireDuration - ageInMs;

    if (timeLeft < nearestThreadLock) {
      nearestThreadLock = timeLeft;

      if (nearestThreadLock < MINUTE * 10) {
        nearestThreadLock = MINUTE * 10;
      } else if (nearestThreadLock > DAY) {
        nearestThreadLock = DAY;
      }
    }

    if (thread !== threads[threads.length - 1])
      await new Promise((resolve) => setTimeout(resolve, SECOND * 20));
  }

  setTimeout(() => {
    autoArchiveInForum(channel, expireDuration);
  }, nearestThreadLock);
}

export async function handleAutoArchiveChannels(client: Client, guildId: string) {
  const config = await AutoArchiveForumModel.findOne({ guildId });

  if (!config) return;

  for (const channelConfig of config.channels) {
    const { channelId, expireDuration } = channelConfig;

    const channel = await client.channels.fetch(channelId);

    if (!channel || !channel.isThreadOnly()) {
      continue;
    }

    await autoArchiveInForum(channel as ForumChannel, expireDuration);
  }
}

export async function handleAutoArchive(client: Client) {
  for (const guild of client.guilds.cache.values()) {
    await handleAutoArchiveChannels(client, guild.id);
  }
}
