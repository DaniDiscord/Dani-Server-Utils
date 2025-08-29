import { EmbedBuilder } from "discord.js";
import { TimeParserUtility } from "../../src/utilities/timeParser";
import { Times } from "types/index";
import { XpModel } from "models/Xp";
import { clientConfig } from "lib/config/ClientConfig";

type DigestResult = {
  totalExp: number;
  exp: number;
  level: number;
  next: number;
};

export default class XpManager {
  public static EXP_PER_MESSAGE = 3;
  public static EXP_COOLDOWN = Times.MINUTE;
  public formula: (levelIndex: number) => number;
  public totalExp = 0;
  public exp = 0;
  public level = 0;
  public next = 100;
  public levelUp = false;
  public levelDown = false;

  constructor(
    initialExp: number,
    customLeveling: (levelIndex: number) => number = (i) =>
      5 * (i + 1) ** 2 + 50 * (i + 1) + 100,
  ) {
    this.formula = customLeveling;
    this.applyDigest(this.digestExp(initialExp));
  }

  public add(expAmount: number): this {
    const result = this.digestExp(this.totalExp + expAmount);
    if (result.level > this.level) this.levelUp = true;
    this.applyDigest(result);
    return this;
  }

  public sub(expAmount: number): this {
    const result = this.digestExp(this.totalExp - expAmount);
    if (result.level < this.level) this.levelDown = true;
    this.applyDigest(result);
    return this;
  }

  public update(expAmount: number): this {
    const result = this.digestExp(expAmount);
    if (result.level > this.level) this.levelUp = true;
    else if (result.level < this.level) this.levelDown = true;
    this.applyDigest(result);
    return this;
  }

  public calculateProgress(target: number) {
    const currentLevel = this.level;
    const currentTotalXp = this.totalExp;

    const targetLevel = Math.min(target, 100);

    if (targetLevel <= currentLevel) {
      return {
        surpassed: true,
        currentLevel,
        xpProgress: `${this.exp.toLocaleString()} / ${this.next.toLocaleString()} XP`,
        xpNeeded: 0,
        totalTimeMs: 0,
        timeSpentMs: 0,
        timeLeftMs: 0,
      };
    }

    let xpProgressDisplay: string;
    let xpNeeded: number;

    if (targetLevel === currentLevel + 1) {
      xpProgressDisplay = `${this.exp.toLocaleString()} / ${this.next.toLocaleString()} XP`;
      xpNeeded = this.next - this.exp;
    } else {
      let totalXpToTarget =
        (5 * targetLevel * (targetLevel + 1) * (2 * targetLevel + 1)) / 6 +
        25 * targetLevel * (targetLevel + 1) +
        100 * targetLevel;
      xpProgressDisplay = `${currentTotalXp.toLocaleString()} / ${totalXpToTarget.toLocaleString()} XP`;
      xpNeeded = Math.max(0, totalXpToTarget - currentTotalXp);
    }

    const messagesNeeded = Math.ceil(xpNeeded / XpManager.EXP_PER_MESSAGE);
    const timeLeftMs = messagesNeeded * XpManager.EXP_COOLDOWN;

    const totalMessages = Math.ceil(
      (currentTotalXp + xpNeeded) / XpManager.EXP_PER_MESSAGE,
    );
    const totalTimeMs = totalMessages * XpManager.EXP_COOLDOWN;

    const messagesSoFar = Math.ceil(currentTotalXp / XpManager.EXP_PER_MESSAGE);
    const timeSpentMs = messagesSoFar * XpManager.EXP_COOLDOWN;

    return {
      surpassed: false,
      currentLevel,
      xpProgress: xpProgressDisplay,
      xpNeeded,
      totalTimeMs,
      timeSpentMs,
      timeLeftMs,
    };
  }

  public digestExp(total: number): DigestResult {
    const ret: DigestResult = {
      totalExp: total,
      exp: total,
      level: 0,
      next: this.formula(0),
    };

    while (ret.exp >= ret.next) {
      ret.exp -= ret.next;
      ret.next = this.formula(ret.level);
      ret.level++;
    }

    return ret;
  }

  private applyDigest(result: DigestResult): void {
    this.totalExp = result.totalExp;
    this.exp = result.exp;
    this.level = result.level;
    this.next = result.next;
  }
}
