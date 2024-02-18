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
