import { EmbedBuilder, Message, TextChannel, codeBlock } from "discord.js";

import DefaultClientUtilities from "lib/util/defaultUtilities";

const chainStops = ["muck"];
const chainIgnoredChannels = ["594178859453382696", "970968834372698163"];
const CHAIN_STOPS_ONLY = false;
const CHAIN_DELETE_MESSAGE_THRESHOLD = 3;
const CHAIN_WARN_THRESHOLD = 4;
const CHAIN_DELETION_LOG_CHANNEL_ID = "989203228749099088";
const FUZZY_THRESHOLD = 90;

interface MessageRecord {
  content: string;
  timestamp: number;
}

export class ChainHandler {
  private windowSize: number;
  private timeout: number;
  private channelMessages: Map<string, Map<string, MessageRecord[]>>;

  constructor(windowSize = 20, timeoutSeconds = 10) {
    this.windowSize = windowSize;
    this.timeout = timeoutSeconds * 1000;
    this.channelMessages = new Map();
  }

  private normalize(content: string): string {
    return content
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .trim();
  }
  private isSimilarWord(a: string, b: string, maxDistance = 1) {
    if (a === b) return true;
    if (Math.abs(a.length - b.length) > maxDistance) return false;

    const distance = this.levenshtein(a, b);
    return distance <= maxDistance;
  }

  private levenshtein(a: string, b: string): number {
    const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
      Array(b.length + 1).fill(0),
    );
    for (let i = 0; i <= a.length; i++) dp[i][0] = i;
    for (let j = 0; j <= b.length; j++) dp[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + 1);
        }
      }
    }
    return dp[a.length][b.length];
  }

  public async handleMessage(message: Message): Promise<boolean> {
    if (message.author.bot || !message.content?.trim()) return false;

    const normalized = this.normalize(message.content);
    const channelId = message.channelId;
    const userId = message.author.id;

    if (chainIgnoredChannels.includes(channelId)) return false;

    if (!this.channelMessages.has(channelId))
      this.channelMessages.set(channelId, new Map());
    const channelMap = this.channelMessages.get(channelId)!;
    if (!channelMap.has(userId)) channelMap.set(userId, []);
    const userMessages = channelMap.get(userId)!;

    const now = Date.now();
    while (userMessages.length && now - userMessages[0].timestamp > this.timeout) {
      userMessages.shift();
    }

    const isExactChain =
      (!CHAIN_STOPS_ONLY || chainStops.includes(normalized)) &&
      userMessages.some((m) => m.content === normalized);

    const isProgressiveChain =
      !isExactChain &&
      userMessages.some(
        (m) => normalized.startsWith(m.content) && normalized.length > m.content.length,
      );

    const maxDistance = 1;
    const isDistanceChain = userMessages.some((m) =>
      this.isSimilarWord(normalized, m.content, maxDistance),
    );

    const isChain = isExactChain || isProgressiveChain || isDistanceChain;

    userMessages.push({ content: normalized, timestamp: now });
    if (userMessages.length > this.windowSize) userMessages.shift();

    if (isChain) {
      const count = userMessages.filter(
        (m) =>
          m.content === normalized ||
          normalized.startsWith(m.content) ||
          DefaultClientUtilities.fuzzyMatch(normalized, m.content) >= FUZZY_THRESHOLD,
      ).length;

      if (count >= CHAIN_DELETE_MESSAGE_THRESHOLD && message.deletable) {
        setTimeout(async () => {
          try {
            await message.delete();
          } catch {}

          if (count === CHAIN_WARN_THRESHOLD) {
            try {
              const warning = await (message.channel as TextChannel).send({
                embeds: [
                  DefaultClientUtilities.generateEmbed("error", {
                    title: "Please stop chaining.",
                  }),
                ],
              });
              if (warning?.deletable) {
                setTimeout(async () => {
                  try {
                    await warning.delete();
                  } catch {}
                }, 5000);
              }
            } catch {}
          }

          if (CHAIN_DELETION_LOG_CHANNEL_ID) {
            try {
              const logCh = message.guild?.channels.cache.get(
                CHAIN_DELETION_LOG_CHANNEL_ID,
              ) as TextChannel | undefined;
              if (logCh?.isTextBased()) {
                const emb = new EmbedBuilder()
                  .setAuthor({
                    name: `@${message.author.username}`,
                    iconURL: message.author.displayAvatarURL(),
                  })
                  .setColor("Red")
                  .setDescription(`Chain detection in <#${message.channelId}>`)
                  .addFields(
                    { name: "Channel", value: `<#${message.channelId}>` },
                    { name: "User ID", value: codeBlock("st", message.author.id) },
                    { name: "Message ID", value: codeBlock("st", message.id) },
                    {
                      name: "Content",
                      value:
                        message.content.length > 1024
                          ? message.content.slice(0, 1024)
                          : message.content,
                    },
                    {
                      name: "Timestamp",
                      value: `<t:${Math.floor(message.createdTimestamp / 1000)}:F>`,
                    },
                  );
                await logCh
                  .send({ embeds: [emb] })
                  .catch(() => console.error("Failed to log chain"));
              }
            } catch {}
          }
        }, 100);
      }

      return true;
    }

    return false;
  }
}
