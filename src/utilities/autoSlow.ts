import { TextChannel } from "discord.js";
import { DsuClient } from "lib/core/DsuClient";
import { ClientUtilities } from "lib/core/ClientUtilities";

const BASE = 0.95;

export class AutoSlowUtility extends ClientUtilities {
  // Instance-specific properties
  minSlow: number = 0;
  maxSlow: number = 0;
  targetMsgsPerSec: number = 0;
  minChangeRate: number = 0;
  minAbsoluteChange: number = 0;
  enabled: boolean = false;

  msgBalance: number = 0;
  lastTime: number | null = null;
  lastSlowSet: number | null = null;

  // Static-like cache accessible through instance
  private static _cache: Map<string, AutoSlowUtility> = new Map();

  constructor(client: DsuClient) {
    super(client);
  }

  get cache(): Map<string, AutoSlowUtility> {
    return AutoSlowUtility._cache;
  }

  addToCache(channelId: string): void {
    AutoSlowUtility._cache.set(channelId, this);
  }

  removeFromCache(channelId: string): void {
    AutoSlowUtility._cache.delete(channelId);
  }

  static add(channelId: string, instance: AutoSlowUtility): void {
    instance.addToCache(channelId);
  }

  static remove(channelId: string): void {
    const instance = AutoSlowUtility._cache.get(channelId);
    if (instance) {
      instance.removeFromCache(channelId);
    }
  }

  static get(channelId: string): AutoSlowUtility | null {
    return AutoSlowUtility._cache.get(channelId) ?? null;
  }

  setAutoSlowParams(
    min: number,
    max: number,
    targetMsgsPerSec: number,
    minChange: number,
    minChangeRate: number,
    enabled: boolean
  ): void {
    this.minSlow = min;
    this.maxSlow = max;
    this.targetMsgsPerSec = targetMsgsPerSec;
    this.minChangeRate = minChangeRate;
    this.minAbsoluteChange = minChange;
    this.enabled = enabled;
  }

  private _decay(deltaTime: number) {
    return Math.pow(BASE, deltaTime);
  }

  private _expectedBalance(msgsPerSecond: number): number {
    return msgsPerSecond / (1 - BASE);
  }

  private _messageBalance(): number {
    if (this.lastTime === null) return 0;
    const now = Date.now() / 1000;
    return this.msgBalance * this._decay(now - this.lastTime);
  }

  messageSent(): void {
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

  private getOptimalSlowMode(slowMode: number): number {
    if (this.lastTime === null) return slowMode;

    const targetBalance = this._expectedBalance(this.targetMsgsPerSec);
    const currentBalance = this._messageBalance();
    if (currentBalance === 0) return slowMode;

    const optimal = (Math.max(slowMode, 1) * currentBalance) / targetBalance;
    const upwardsChange = Math.max(
      this.minAbsoluteChange,
      slowMode * this.minChangeRate
    );
    const downwardsChange = Math.max(
      this.minAbsoluteChange,
      slowMode / this.minChangeRate
    );

    const min = Math.max(this.minSlow, slowMode - downwardsChange);
    const max = Math.min(this.maxSlow, slowMode + upwardsChange);
    return Math.min(Math.max(optimal, min), max);
  }

  setOptimalSlowMode(channel: TextChannel): void {
    if (!this.enabled) return;

    const now = Date.now() / 1000;
    if (this.lastSlowSet !== null && now - this.lastSlowSet < 15) return;

    this.lastSlowSet = now;

    const oldSlow = channel.rateLimitPerUser;
    const newSlow = Math.round(this.getOptimalSlowMode(oldSlow));

    if (Math.abs(newSlow - oldSlow) < 0.1 || Number.isNaN(newSlow)) return;

    channel.setRateLimitPerUser(newSlow, "Stabilizing Chat Flow");
  }
}
