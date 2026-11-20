interface Craft {
  key: string;
  label: string;
}

type Rule = readonly [
  key: string,
  label: string,
  test: (text: string) => boolean,
];

const has = (pattern: RegExp) => (text: string) => pattern.test(text);

const FEMALE = /actress|female|\bwomen\b/;
const MALE = /\bactor\b|\bmale\b/;
const SUPPORT = /support/;

const CATEGORY_RULES: readonly Rule[] = [
  ["ensemble", "Ensemble", has(/ensemble|\bcast\b/)],
  [
    "supporting-actress",
    "Supporting Actress",
    (text) => SUPPORT.test(text) && FEMALE.test(text),
  ],
  [
    "supporting-actor",
    "Supporting Actor",
    (text) => SUPPORT.test(text) && MALE.test(text),
  ],
  ["supporting", "Supporting Role", has(SUPPORT)],
  ["lead-actress", "Lead Actress", has(FEMALE)],
  ["lead-actor", "Lead Actor", has(MALE)],
  ["performance", "Performance", has(/performance/)],
  ["director", "Director", has(/direct/)],
  ["adapted-screenplay", "Adapted Screenplay", has(/adapted/)],
  ["original-screenplay", "Original Screenplay", has(/original screenplay/)],
  ["screenplay", "Screenplay", has(/screenplay|writing|written|\bwriter/)],
  ["song", "Song", has(/\bsong/)],
  ["score", "Score", has(/score|music|composer/)],
  ["sound", "Sound", has(/sound/)],
  ["editing", "Editing", has(/edit/)],
  ["cinematography", "Cinematography", has(/cinematograph|photography/)],
  [
    "production-design",
    "Production Design",
    has(/production design|d[ée]cor|art direction|set decoration/),
  ],
  ["costume", "Costume Design", has(/costume/)],
  ["makeup", "Makeup & Hair", has(/make ?-?up|hair/)],
  ["effects", "Visual Effects", has(/visual effects|\bvfx\b/)],
  ["casting", "Casting", has(/casting/)],
  ["animated", "Animated", has(/animat/)],
  ["documentary", "Documentary", has(/documentar|nonfiction/)],
  ["international", "International", has(/foreign|international|non-english/)],
  ["debut", "Debut", has(/first feature|debut|breakthrough|newcomer/)],
];

const ORGANIZATION_RULES: readonly (readonly [string, RegExp])[] = [
  ["production-design", /art director|\badg\b|set decorat|\bsdsa\b/],
  ["costume", /costume/],
  ["casting", /casting|artios/],
  ["editing", /editor|eddie|\bbfe\b|\bace\b/],
  ["score", /\bscl\b|composer|music/],
  ["cinematography", /cinematograph|\basc\b|camerimage/],
  ["screenplay", /writers|\bwga\b/],
  ["director", /directors guild|\bdga\b/],
  ["sound", /sound|\bmpse\b|\bcas\b/],
  ["effects", /visual effects|\bves\b/],
  ["makeup", /make-?up|hair/],
];

const WORK =
  /picture|\bfilm|feature|series|program|movies? of the year|top (?:films|ten)|producer/;

const LABELS = new Map(CATEGORY_RULES.map(([key, label]) => [key, label]));

const OTHER: Craft = { key: "other", label: "Other honors" };

export function craftOf(category: string, organization: string): Craft {
  const text = category.toLowerCase();
  for (const [key, label, test] of CATEGORY_RULES)
    if (test(text)) return { key, label };
  const guild = organization.toLowerCase();
  for (const [key, pattern] of ORGANIZATION_RULES)
    if (pattern.test(guild)) return { key, label: LABELS.get(key)! };
  if (WORK.test(text))
    return {
      key: "work",
      label: /series|program/.test(text) ? "Series" : "Picture",
    };
  return OTHER;
}

export const CRAFT_ORDER = [
  "work",
  "director",
  "lead-actor",
  "lead-actress",
  "supporting-actor",
  "supporting-actress",
  "supporting",
  "ensemble",
  "performance",
  "original-screenplay",
  "adapted-screenplay",
  "screenplay",
  "cinematography",
  "editing",
  "score",
  "song",
  "sound",
  "production-design",
  "costume",
  "makeup",
  "effects",
  "casting",
  "international",
  "animated",
  "documentary",
  "debut",
  "other",
];

const PRESTIGE = [
  /academy awards|\boscars?\b/,
  /bafta/,
  /golden globe/,
  /emmy/,
  /actor awards|screen actors|\bsag\b/,
  /critics choice(?! super)/,
  /cannes/,
  /venice/,
  /berlin/,
  /directors guild|\bdga\b/,
  /producers guild/,
  /writers guild/,
  /independent spirit/,
  /gotham/,
];

export function prestigeOf(organization: string): number {
  const name = organization.toLowerCase();
  const at = PRESTIGE.findIndex((pattern) => pattern.test(name));
  return at < 0 ? PRESTIGE.length : at;
}

const SHORT_NAMES: readonly (readonly [RegExp, string])[] = [
  [/^academy awards$/i, "Oscars"],
  [/^bafta/i, "BAFTA"],
  [/^golden globes?/i, "Globes"],
  [/^emmy/i, "Emmys"],
  [/^actor awards$/i, "Actor Awards"],
  [/^producers guild/i, "PGA"],
  [/^writers guild/i, "WGA"],
  [/^directors guild/i, "DGA"],
  [/independent spirit/i, "Spirit"],
  [/^gotham television/i, "Gotham TV"],
  [/^critics choice super/i, "CC Super"],
];

const NAME_LIMIT = 15;

export function shortName(organization: string): string {
  for (const [pattern, name] of SHORT_NAMES)
    if (pattern.test(organization)) return name;
  const bare = organization
    .replace(/\b(?:film )?(?:awards?|prize)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  if (bare && bare.length <= NAME_LIMIT) return bare;
  const initials = (bare || organization)
    .split(/\s+/)
    .filter((word) => /^[A-Z]/.test(word))
    .map((word) => (/^[A-Z]{2,}$/.test(word) ? word : word[0]))
    .join("");
  return initials || organization;
}
