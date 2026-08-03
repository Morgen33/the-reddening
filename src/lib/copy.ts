export const COPY = {
  emptyCast: "No one has been made yet.",
  beginFirstTurning: "Begin the first turning",
  setInInk: "Set in ink",
  sealChapter: "Seal this chapter",
  originUnrecorded: "Origin unrecorded",
  againDifferently: "Again, differently",
  keepDraft: "Keep as draft",
  noChapters: "The chronicle waits for its first turning.",
  writeInvite: "The page is blank. Name who was turned.",
} as const;

export function toRoman(num: number): string {
  if (num <= 0) return "—";
  const map: [number, string][] = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let n = num;
  let out = "";
  for (const [v, s] of map) {
    while (n >= v) {
      out += s;
      n -= v;
    }
  }
  return out;
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}
