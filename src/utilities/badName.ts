import { badNameCombinations, nameSeed } from "../types/constants/names";

import DefaultClientUtilities from "lib/util/defaultUtilities";
import { GuildMember } from "discord.js";

export class BadNameUtility {
  public static getName(index: number) {
    const names = this.generateNames();
    const nameIndex = index % names.length;
    const number = Math.floor(index / names.length);
    return `${names[nameIndex]}${number > 0 ? `#${number}` : ""}`;
  }

  private static generateNames() {
    return this.postProcess(this.generateAll(badNameCombinations));
  }

  private static genMulberrySeed(a: number) {
    return () => {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  private static generateAll(combinations: string[][]) {
    return this.generateRecursive(combinations, 0, "");
  }

  private static generateRecursive(combinations: string[][], idx: number, curr: string) {
    if (idx === combinations.length - 1) {
      return combinations[idx].map((name) => `${curr} ${name}`);
    }

    let names: string[] = [];

    for (let i = 0; i < combinations[idx].length; i++) {
      names = names.concat(
        this.generateRecursive(combinations, idx + 1, curr + " " + combinations[idx][i]),
      );
    }

    return names;
  }

  private static postProcess(generated_names: string[]) {
    const rng = this.genMulberrySeed(nameSeed);

    return generated_names
      .filter(
        (name) =>
          !(name.length > 27 || (name.includes("Orange") && name.includes("Juice"))),
      )
      .map((name) => ({ name, sort: rng() }))
      .sort((a, b) => a.sort - b.sort)
      .map((a) => a.name.trim());
  }

  public static async setMemberName(member: GuildMember, newName: string): Promise<void> {
    const oldName = member.nickname ?? member.user.username;
    await DefaultClientUtilities.setNameInMemory(member.id, member.guild.id, newName);
    await member.setNickname(newName).catch(async (e) => {
      console.error(e);
      await DefaultClientUtilities.setNameInMemory(member.id, member.guild.id, oldName);
      return;
    });
  }
}
