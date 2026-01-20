import { EmbedBuilder, Message, TextChannel, codeBlock } from "discord.js";
import DefaultClientUtilities from "lib/util/defaultUtilities";

const CONFIG = {
  chainStops: new Set(["muck"]),
  ignoredChannels: new Set(["594178859453382696", "970968834372698163"]),
  chainStopsOnly: false,
  deleteThreshold: 3,
  warnThreshold: 4,
  logChannelId: "989203228749099088",
  similarityThreshold: 0.85,
  timeWindowMs: 10_000,
  maxWindowSize: 20,
  rateWindowMs: 5000,
  rateThreshold: 5,
  shortMsgLength: 3,
};

interface Fingerprint {
  hash: number;
  content: string;
  timestamp: number;
  trigrams: Set<string>;
  sorted: string;
  chars: Map<string, number>;
}

interface UserState {
  messages: Fingerprint[];
  writeIndex: number;
  count: number;
  chainStreak: number;
  lastChainHash: number;
}

export class ChainHandler {
  private userStates = new Map<string, UserState>();
  private lastCleanup = Date.now();

  private hash(str: string): number {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  private normalize(content: string): string {
    return content.toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  private getTrigrams(str: string): Set<string> {
    const t = new Set<string>();
    const p = `  ${str} `;
    for (let i = 0; i < p.length - 2; i++) t.add(p.slice(i, i + 3));
    return t;
  }

  private getCharFreq(str: string): Map<string, number> {
    const m = new Map<string, number>();
    for (const c of str) m.set(c, (m.get(c) || 0) + 1);
    return m;
  }

  private charFreqSimilarity(a: Map<string, number>, b: Map<string, number>): number {
    if (!a.size && !b.size) return 1;
    if (!a.size || !b.size) return 0;
    let match = 0,
      total = 0;
    const all = new Set([...a.keys(), ...b.keys()]);
    for (const c of all) {
      const av = a.get(c) || 0,
        bv = b.get(c) || 0;
      match += Math.min(av, bv);
      total += Math.max(av, bv);
    }
    return match / total;
  }

  private similarity(a: Set<string>, b: Set<string>): number {
    if (!a.size && !b.size) return 1;
    if (!a.size || !b.size) return 0;
    const [s, l] = a.size <= b.size ? [a, b] : [b, a];
    let i = 0;
    for (const t of s) if (l.has(t)) i++;
    return i / (a.size + b.size - i);
  }

  private isProgressive(curr: string, prev: string): boolean {
    if (curr.length <= prev.length || !curr.startsWith(prev)) return false;
    const add = curr.slice(prev.length);
    return prev.includes(add) || add.includes(prev);
  }

  private getState(userId: string, channelId: string): UserState {
    const key = `${channelId}:${userId}`;
    let state = this.userStates.get(key);
    if (!state) {
      state = {
        messages: new Array(CONFIG.maxWindowSize),
        writeIndex: 0,
        count: 0,
        chainStreak: 0,
        lastChainHash: 0,
      };
      this.userStates.set(key, state);
    }
    return state;
  }

  private *validMessages(state: UserState, now: number): Generator<Fingerprint> {
    const cutoff = now - CONFIG.timeWindowMs;
    for (let i = 0; i < state.count; i++) {
      const idx =
        (state.writeIndex - 1 - i + CONFIG.maxWindowSize) % CONFIG.maxWindowSize;
      const msg = state.messages[idx];
      if (msg?.timestamp >= cutoff) yield msg;
    }
  }

  private detectChain(fp: Fingerprint, state: UserState, now: number) {
    if (CONFIG.chainStopsOnly && !CONFIG.chainStops.has(fp.content)) {
      return { isChain: false, matchCount: 0 };
    }

    let matchCount = 0;
    let isChain = false;

    const rateCutoff = now - CONFIG.rateWindowMs;
    let rateCount = 0;
    for (const prev of this.validMessages(state, now)) {
      if (prev.timestamp >= rateCutoff) {
        rateCount += prev.content.length <= CONFIG.shortMsgLength ? 2 : 1;
      }
    }
    if (rateCount >= CONFIG.rateThreshold) {
      return { isChain: true, matchCount: rateCount };
    }

    for (const prev of this.validMessages(state, now)) {
      const isExact = fp.hash === prev.hash && fp.content === prev.content;
      const isAnagram = fp.sorted === prev.sorted && fp.content.length > 2;
      const isCharSimilar = this.charFreqSimilarity(fp.chars, prev.chars) >= 0.75;
      const isTrigramSimilar =
        this.similarity(fp.trigrams, prev.trigrams) >= CONFIG.similarityThreshold;
      const isProg = this.isProgressive(fp.content, prev.content);

      if (isExact || isAnagram || isCharSimilar || isTrigramSimilar || isProg) {
        matchCount++;
        isChain = true;
      }
    }

    return { isChain, matchCount };
  }

  private cleanup(): void {
    const now = Date.now();
    if (now - this.lastCleanup < 60_000) return;
    this.lastCleanup = now;

    const cutoff = now - CONFIG.timeWindowMs * 2;
    for (const [key, state] of this.userStates) {
      let valid = false;
      for (let i = 0; i < state.count; i++) {
        const idx =
          (state.writeIndex - 1 - i + CONFIG.maxWindowSize) % CONFIG.maxWindowSize;
        if (state.messages[idx]?.timestamp >= cutoff) {
          valid = true;
          break;
        }
      }
      if (!valid) this.userStates.delete(key);
    }
  }

  private async warn(channel: TextChannel): Promise<void> {
    const warning = await channel
      .send({
        embeds: [
          DefaultClientUtilities.generateEmbed("error", {
            title: "Please stop chaining.",
          }),
        ],
      })
      .catch(() => null);
    if (warning?.deletable) setTimeout(() => warning.delete().catch(() => {}), 5000);
  }

  private async log(message: Message): Promise<void> {
    if (!CONFIG.logChannelId) return;
    const ch = message.guild?.channels.cache.get(CONFIG.logChannelId) as
      | TextChannel
      | undefined;
    if (!ch?.isTextBased()) return;

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `@${message.author.username}`,
        iconURL: message.author.displayAvatarURL(),
      })
      .setColor("Red")
      .setDescription(`Chain detection in <#${message.channelId}>`)
      .addFields(
        { name: "Channel", value: `<#${message.channelId}>`, inline: false },
        { name: "User ID", value: codeBlock("st", message.author.id), inline: false },
        { name: "Message ID", value: codeBlock("st", message.id), inline: false },
        { name: "Content", value: message.content.slice(0, 1024) || "*empty*" },
        {
          name: "Timestamp",
          value: `<t:${Math.floor(message.createdTimestamp / 1000)}:F>`,
        },
      )
      .setTimestamp();

    await ch.send({ embeds: [embed] }).catch(() => {});
  }

  public async handleMessage(message: Message): Promise<boolean> {
    if (message.author.bot || !message.content?.trim()) return false;
    if (CONFIG.ignoredChannels.has(message.channelId)) return false;

    this.cleanup();

    const normalized = this.normalize(message.content);
    const fp: Fingerprint = {
      hash: this.hash(normalized),
      content: normalized,
      timestamp: Date.now(),
      trigrams: this.getTrigrams(normalized),
      sorted: [...normalized].sort().join(""),
      chars: this.getCharFreq(normalized),
    };

    const state = this.getState(message.author.id, message.channelId);
    const { isChain, matchCount } = this.detectChain(fp, state, fp.timestamp);

    if (isChain && fp.hash === state.lastChainHash) {
      state.chainStreak++;
    } else if (isChain) {
      state.chainStreak = matchCount;
      state.lastChainHash = fp.hash;
    } else {
      state.chainStreak = 0;
    }

    state.messages[state.writeIndex] = fp;
    state.writeIndex = (state.writeIndex + 1) % CONFIG.maxWindowSize;
    state.count = Math.min(state.count + 1, CONFIG.maxWindowSize);

    if (isChain && state.chainStreak >= CONFIG.deleteThreshold) {
      if (message.deletable) await message.delete().catch(() => {});
      if (state.chainStreak === CONFIG.warnThreshold)
        await this.warn(message.channel as TextChannel);
      await this.log(message);
      return true;
    }

    return false;
  }
}
