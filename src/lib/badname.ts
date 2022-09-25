const seed = 130873;

const mulberry32 = (a: number) => {
  return () => {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const generateAll = (combinations: string[][]) => {
  return genRecursive(combinations, 0, "");
};

const genRecursive = (comb: string[][], index: number, current: string) => {
  if (index === comb.length - 1) {
    return comb[index].map((name) => `${current} ${name}`);
  }

  let names: string[] = [];

  for (let i = 0; i < comb[index].length; i++) {
    names = names.concat(genRecursive(comb, index + 1, current + " " + comb[index][i]));
  }

  return names;
};

const postProcess = (generated_names: string[]) => {
  const rng = mulberry32(seed);

  return generated_names
    .filter(
      (name) => !(name.length > 27 || (name.includes("Orange") && name.includes("Juice")))
    )
    .map((name) => ({ name, sort: rng() }))
    .sort((a, b) => a.sort - b.sort)
    .map((a) => a.name.trim());
};

export class BadNamer {
  private names: string[];

  constructor(combinations: string[][]) {
    this.names = postProcess(generateAll(combinations));
  }

  get(index: number): string {
    const nameIndex = index % this.names.length;
    const number = Math.floor(index / this.names.length);
    return `${this.names[nameIndex]}${number > 0 ? `#${number}` : ""}`;
  }
}
