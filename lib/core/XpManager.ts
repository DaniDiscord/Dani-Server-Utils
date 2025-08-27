type DigestResult = {
  totalExp: number;
  exp: number;
  level: number;
  next: number;
};

export default class XpManager {
  public formula: (levelIndex: number) => number;
  public totalExp = 0;
  public exp = 0;
  public level = 1;
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

  private digestExp(total: number): DigestResult {
    const ret: DigestResult = { totalExp: total, exp: total, level: 1, next: 100 };

    for (let i = 0; ret.exp >= ret.next; i++, ret.level++) {
      ret.exp -= ret.next;
      ret.next = this.formula(i);
    }

    return ret;
  }

  public digestLevel(levelNumber: number): DigestResult {
    const ret: DigestResult = { totalExp: 0, exp: 0, level: levelNumber, next: 100 };

    for (let i = 0; i < levelNumber; i++) {
      ret.totalExp += ret.next;
      ret.next = this.formula(i);
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
