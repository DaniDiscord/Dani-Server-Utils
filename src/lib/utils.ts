import { ColorResolvable, Colors } from "discord.js";

export function unicode2Ascii(name: string): string {
  const asciiNameNfkd = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  const finalNameNfkd = eliminateUnicode(asciiNameNfkd);
  if (finalNameNfkd.length > 2) {
    return finalNameNfkd;
  }
  return "";
}

function eliminateUnicode(name: string): string {
  let finalName = "";
  for (let char = 0; char < name.length; char++) {
    if (name.charCodeAt(char) < 128) {
      finalName += name[char];
    }
  }
  return finalName;
}

export function isColor(value: any): value is ColorResolvable {
  if (value == null || value == undefined) {
    return false;
  }

  if (value in Colors) {
    return true;
  }

  if (typeof value === "string" && /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(value)) {
    return true;
  }

  if (value === "Random") {
    return true;
  }

  if (typeof value === "number") {
    return true;
  }

  if (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every((num) => typeof num === "number")
  ) {
    return true;
  }

  return false;
}

export function fuzzyMatch(message: string, phrase: string): number {
  const msg = message.toLowerCase();
  const phr = phrase.toLowerCase();

  const lenA = msg.length;
  const lenB = phr.length;

  if (lenA === 0) return lenB === 0 ? 100 : 0;
  if (lenB === 0) return 0;

  if (msg.includes(phr)) {
    return (lenB / lenA) * 100;
  }

  const dp = Array.from({ length: lenA + 1 }, () => Array(lenB + 1).fill(0));

  for (let i = 1; i <= lenA; i++) {
    for (let j = 1; j <= lenB; j++) {
      const areSimilar = isSimilar(msg[i - 1], phr[j - 1]);

      const cost = msg[i - 1] === phr[j - 1] ? 0 : areSimilar ? 0.5 : 1;

      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }

  const editDistance = dp[lenA][lenB];

  const maxLen = Math.max(lenA, lenB);
  const similarity = ((maxLen - editDistance) / maxLen) * 100;

  return Math.max(0, similarity);
}

const isSimilar = (a: string, b: string) => {
  const similarPairs = [
    ["rn", "m"],
    ["0", "o"],
    ["1", "l"],
    ["5", "s"],
    ["2", "z"],
    ["ph", "f"],
    ["c", "k"],
    ["v", "w"],
    ["u", "v"],
    ["3", "e"],
    ["4", "a"],
  ];

  return similarPairs.some(
    ([x, y]) => (a === x[0] && b === x[1]) || (a === y[0] && b === y[1])
  );
};
