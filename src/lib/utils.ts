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
