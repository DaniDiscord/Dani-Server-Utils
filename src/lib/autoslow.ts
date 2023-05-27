import { TextChannel } from "discord.js";

const BASE = 0.95;

export class AutoSlowManager {
  minSlow: number;
  maxSlow: number;
  targetMsgsPerSec: number;
  minChangeRate: number;
  minAbsoluteChange: number;
  enabled: boolean;

  msgBalance: number;

  lastTime: number | null;

  lastSlowSet: number | null;

  constructor(
    minSlow: number,
    maxSlow: number,
    targetMsgsPerSec: number,
    minChangeRate: number,
    minAbsoluteChange: number,
    enabled: boolean
  ) {
    this.minSlow = minSlow;
    this.maxSlow = maxSlow;
    this.targetMsgsPerSec = targetMsgsPerSec;
    this.minChangeRate = minChangeRate;
    this.minAbsoluteChange = minAbsoluteChange;
    this.enabled = enabled;
    this.msgBalance = 0;
    this.lastTime = null;
    this.lastSlowSet = null;
  }

  private decay(deltaTime: number): number {
    return Math.pow(BASE, deltaTime);
  }

  private expectedBalance(msgsPerSecond: number): number {
    return msgsPerSecond / (1 - BASE);
  }

  private messageBalance(): number {
    if (this.lastTime === null) {
      return 0;
    }
    const now = Date.now() / 1000;
    return this.msgBalance * this.decay(now - this.lastTime);
  }

  /**
   * Call this method whenever a message is sent in the managed channel
   */
  messageSent(): void {
    // Convert to seconds
    const now = Date.now() / 1000;
    if (this.lastTime === null) {
      this.lastTime = now;
      this.msgBalance = 1;
      return;
    }
    this.msgBalance *= Math.pow(BASE, now - this.lastTime);
    this.msgBalance += 1;
    this.lastTime = now;
  }

  /**
   * Calculates optimal slow mode for a given channel. It is recommended to
   * only change the actual slow mode if the returned value is noticeable different
   * than the current slow mode.
   * @param slowMode Current Slow Mode on the managed channel
   * @returns Optimal slow mode value, this will be a float, will need rounding
   */
  private getOptimalSlowMode(slowMode: number): number {
    if (this.lastTime === null) {
      return slowMode;
    }
    const targetBalance = this.expectedBalance(this.targetMsgsPerSec);
    const currentBalance = this.messageBalance();
    if (currentBalance === 0) {
      return slowMode;
    } else {
      const optimal = (Math.max(slowMode, 1) * currentBalance) / targetBalance;
      const upwardsChange = Math.max(
        this.minAbsoluteChange,
        slowMode * this.minChangeRate
      );
      const downwardsChange = Math.max(
        this.minAbsoluteChange,
        slowMode / (1 + this.minChangeRate)
      );

      const min = Math.max(this.minSlow, slowMode - downwardsChange);
      const max = Math.min(this.maxSlow, slowMode + upwardsChange);
      return Math.min(Math.max(optimal, min), max);
    }
  }

  setOptimalSlowMode(channel: TextChannel): void {
    if (!this.enabled) {
      return;
    }
    const now = Date.now() / 1000;
    if (this.lastSlowSet !== null && now - this.lastSlowSet < 15) {
      return;
    }
    this.lastSlowSet = now;

    const oldSlow = channel.rateLimitPerUser;
    const newSlow = Math.round(this.getOptimalSlowMode(oldSlow));
    if (Math.abs(newSlow - oldSlow) < 0.1) {
      return;
    }
    channel.setRateLimitPerUser(newSlow, "Stabilizing Chat Flow");
  }
}

class CachedAutoSlow {
  managers: Map<string, AutoSlowManager>;

  constructor() {
    this.managers = new Map();
  }

  addAutoSlow(channelId: string, autoSlow: AutoSlowManager): void {
    this.managers.set(channelId, autoSlow);
  }

  removeAutoSlow(channelId: string): void {
    this.managers.delete(channelId);
  }

  getAutoSlow(channelId: string): AutoSlowManager | null {
    return this.managers.get(channelId) ?? null;
  }
}

export const AutoSlowCache = new CachedAutoSlow();
