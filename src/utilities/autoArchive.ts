import { EmbedBuilder, ForumChannel, ThreadChannel } from "discord.js";
import { DsuClient } from "lib/core/DsuClient";
import { ClientUtilities } from "lib/core/ClientUtilities";
import {
  AutoArchiveForumBlacklistModel,
  AutoArchiveForumModel,
} from "models/AutoArchive";
import { Times } from "../types/index";

export class AutoArchiveUtility extends ClientUtilities {
  constructor(client: DsuClient) {
    super(client);
  }

  async fetchAllThreads(channel: ForumChannel, archived = false) {
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

  async autoArchiveInForum(channel: ForumChannel, expireDuration: number) {
    const blacklist = await AutoArchiveForumBlacklistModel.findOne({
      guildId: channel.guildId,
    });
    const blacklistedThreads = blacklist?.threads || [];

    const activeThreads = await this.fetchAllThreads(channel);
    const archivedThreads = await this.fetchAllThreads(channel, true);
    const threads = [...activeThreads, ...archivedThreads];

    const threadCount = threads.length;
    const logPercentage = 10;
    let currentThread = 0;

    this.client.logger.info("Auto-Archive", {
      action: "Run",
      message: `Checking ${threadCount} threads in channel (${channel.id})`,
    });

    let nearestThreadLock = Times.DAY;
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
        this.client.logger.info("Auto-Archive", {
          action: "Progress",
          message: `Checked ${currentThread} of ${threadCount} threads in channel (${channel.id})`,
        });
      }

      if (ageInMs > expireDuration) {
        try {
          const embed = new EmbedBuilder()
            .setTitle(`Post Locked`)
            .setDescription(
              `This post has been automatically locked due to inactivity.`
            )
            .setColor("Red");

          await thread.send({ embeds: [embed] });
        } catch (error) {
          this.client.logger.warn(
            `Failed to send lock embed for thread (${thread.id}) in channel (${channel.id})`,
            error as Error
          );
        }

        await thread.setLocked(
          true,
          `Auto-Lock after ${this.client.utils
            .getUtility("timeParser")
            .parseDurationToString(ageInMs)} of inactivity.`
        );

        await thread.setArchived(true);
      }

      const timeLeft = expireDuration - ageInMs;

      if (timeLeft < nearestThreadLock) {
        nearestThreadLock = timeLeft;

        if (nearestThreadLock < Times.MINUTE * 10) {
          nearestThreadLock = Times.MINUTE * 10;
        } else if (nearestThreadLock > Times.DAY) {
          nearestThreadLock = Times.DAY;
        }
      }

      if (thread !== threads[threads.length - 1])
        await new Promise((resolve) => setTimeout(resolve, Times.SECOND * 20));
    }

    setTimeout(() => {
      this.autoArchiveInForum(channel, expireDuration);
    }, nearestThreadLock);
  }

  async handleAutoArchiveChannels(guildId: string) {
    const config = await AutoArchiveForumModel.findOne({ guildId });

    if (!config) return;

    for (const channelConfig of config.channels) {
      const { channelId, expireDuration } = channelConfig;

      const channel = await this.client.channels.fetch(channelId);

      if (!channel || !channel.isThreadOnly()) {
        continue;
      }

      await this.autoArchiveInForum(channel as ForumChannel, expireDuration);
    }
  }

  async handleAutoArchive() {
    for (const guild of this.client.guilds.cache.values()) {
      await this.handleAutoArchiveChannels(guild.id);
    }
  }
}
