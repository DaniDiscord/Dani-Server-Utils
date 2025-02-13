import {
  AutoArchiveForumBlacklistModel,
  AutoArchiveForumModel,
} from "models/AutoArchive";
import { Client, EmbedBuilder, ForumChannel, ThreadChannel } from "discord.js";
import { DAY, MINUTE, SECOND, parseDurationToString } from "./timeParser";

async function fetchAllThreads(channel: ForumChannel, archived = false) {
  let threads: ThreadChannel[] = [];
  let cursor: string | undefined;

  while (true) {
    const fetched = archived
      ? await channel.threads.fetchArchived({ limit: 100, before: cursor })
      : await channel.threads.fetchActive();

    threads = [...threads, ...fetched.threads.values()];

    if (archived && fetched.threads.size === 100) {
      cursor = fetched.threads.last()?.id;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } else {
      break;
    }
  }

  return threads;
}

export async function autoArchiveInForum(channel: ForumChannel, expireDuration: number) {
  const blacklist = await AutoArchiveForumBlacklistModel.findOne({
    guildId: channel.guildId,
  });
  const blacklistedThreads = blacklist?.threads || [];

  const activeThreads = await fetchAllThreads(channel);
  const archivedThreads = await fetchAllThreads(channel, true);
  const threads = [...activeThreads, ...archivedThreads];

  const threadCount = threads.length;
  const logPercentage = 10;
  let currentThread = 0;

  log.info("Auto-Archive", {
    action: "Run",
    message: `Checking ${threadCount} threads in channel (${channel.id})`,
  });

  let nearestThreadLock = DAY;
  for (const thread of threads) {
    currentThread++;
    if (blacklistedThreads.includes(thread.id)) continue;
    if (thread.locked) continue;

    const messages = await thread.messages.fetch({ limit: 1 });
    const lastMessage = messages.first();
    if (!lastMessage) continue;

    const lastMessageAt = lastMessage?.createdAt;
    if (!lastMessageAt) continue;

    const ageInMs = Date.now() - lastMessageAt.getTime();

    if (currentThread % Math.floor(threadCount / logPercentage) === 0) {
      log.info("Auto-Archive", {
        action: "Progress",
        message: `Checked ${currentThread} of ${threadCount} threads in channel (${channel.id})`,
      });
    }

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
