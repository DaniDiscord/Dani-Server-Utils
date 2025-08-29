import { Times } from "types/index";

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

  private MAX_LEVEL = 100;
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

  public calculateDigest(currentExp: number, inputLevel: number): DigestResult {
    const targetLevel = Math.min(inputLevel, this.MAX_LEVEL);
    const totalExp = this.totalExpForLevel(targetLevel);

    return {
      totalExp,
      exp: currentExp,
      level: targetLevel,
      next: Math.max(totalExp - currentExp, 0),
    };
  }

  public digestExp(exp: number): DigestResult {
    if (exp <= 0) {
      return { totalExp: 0, exp: 0, level: 0, next: this.formula(1) };
    }

    let level = 0;

    let low = 0;
    let high = this.MAX_LEVEL;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const midTotal = this.totalExpForLevel(mid);
      const nextTotal = this.totalExpForLevel(mid + 1);

      if (exp >= midTotal && exp < nextTotal) {
        level = mid;
        break;
      } else if (exp < midTotal) {
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }

    if (level === 0 && exp >= this.totalExpForLevel(this.MAX_LEVEL)) {
      level = this.MAX_LEVEL;
    }

    const currentLevelTotal = this.totalExpForLevel(level);
    const nextLevelTotal =
      level < this.MAX_LEVEL ? this.totalExpForLevel(level + 1) : currentLevelTotal;
    const nextExp = level >= this.MAX_LEVEL ? 0 : nextLevelTotal - exp;

    level += 1;
    return {
      totalExp: exp,
      exp: exp - currentLevelTotal,
      level,
      next: nextExp,
    };
  }

  public digestLevel(level: number): DigestResult {
    const cappedLevel = Math.min(level, this.MAX_LEVEL);
    const totalExp = this.totalExpForLevel(cappedLevel);
    const nextLevelTotal =
      cappedLevel < this.MAX_LEVEL ? this.totalExpForLevel(cappedLevel + 1) : totalExp;
    const nextExp = cappedLevel >= this.MAX_LEVEL ? 0 : nextLevelTotal - totalExp;

    return {
      totalExp,
      exp: 0,
      level: cappedLevel,
      next: nextExp,
    };
  }

  private applyDigest(result: DigestResult): void {
    this.totalExp = result.totalExp;
    this.exp = result.exp;
    this.level = result.level;
    this.next = result.next;
  }

  private totalExpForLevel(level: number): number {
    if (level <= 0) return 0;

    const m = level;
    const cumulative = (5 * m * (m + 1) * (2 * m + 1)) / 6 + 25 * m * (m + 1) + 100 * m;

    return cumulative - 55;
  }
}
