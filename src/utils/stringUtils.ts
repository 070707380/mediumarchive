export function getSortableTitle(title: string): string {
  if (!title) return '';
  const str = typeof title === 'string' ? title : String(title);
  const trimmed = str.trim();
  const stripped = trimmed
    .replace(/^["'“‘«»]\s*/, '')
    .replace(/^the\s+/i, '')
    .trim();
  return stripped || trimmed;
}

export function getAlphabetGroupChar(title: string): string {
  const clean = getSortableTitle(title).toUpperCase();
  if (!clean || clean.length === 0) return '#';
  const firstChar = clean[0];
  if (firstChar >= 'A' && firstChar <= 'Z') {
    return firstChar;
  }
  return '#';
}

export function normalizeFormat(fmt?: string): string {
  if (!fmt) return '';
  const s = fmt.toLowerCase().trim();
  if (s.includes('comic') || s.includes('manga')) return 'comic';
  if (s.includes('board')) return 'boardgame';
  if (s.includes('movie') || s.includes('film')) return 'film';
  if (s.includes('tv') || s.includes('anime') || s.includes('show')) return 'tv';
  if (s.includes('book') || s.includes('novel')) return 'book';
  if (s.includes('music') || s.includes('album') || s.includes('track')) return 'music';
  if (s.includes('game')) return 'game';
  return s;
}

const ROMAN_NUMERALS_MAP: Record<string, string> = {
  xx: '20',
  xix: '19',
  xviii: '18',
  xvii: '17',
  xvi: '16',
  xv: '15',
  xiv: '14',
  xiii: '13',
  xii: '12',
  xi: '11',
  x: '10',
  ix: '9',
  viii: '8',
  vii: '7',
  vi: '6',
  v: '5',
  iv: '4',
  iii: '3',
  ii: '2',
};

/**
 * Converts Roman numerals in title to Arabic numerals (e.g. VII -> 7, IV -> 4)
 */
export function convertRomanNumeralsToNumbers(text: string): string {
  if (!text) return '';
  let result = text;
  for (const [roman, arabic] of Object.entries(ROMAN_NUMERALS_MAP)) {
    const regex = new RegExp(`\\b${roman}\\b`, 'gi');
    result = result.replace(regex, arabic);
  }
  // Convert Roman 'I' when preceded by series markers (Part I -> Part 1, Episode I -> Episode 1)
  result = result.replace(/\b(part|episode|vol|volume|chapter|act)\s+i\b/gi, '$1 1');
  return result;
}

// Legitimate titles that officially end in "1" or "1st"
const LEGITIMATE_TRAILING_ONE_TITLES = new Set([
  'battlefield 1',
  'mortal kombat 1',
  'formula 1',
  'f 1',
  'f1',
  'player 1',
  'number 1',
  'no 1',
  'day 1',
  'tier 1',
  'zone 1',
  'area 1',
  '1',
]);

/**
 * Strips artificial trailing "1", "1st", or Roman "I" from titles that were unnumbered at release,
 * e.g. "Half Life 1" -> "Half Life", "Final Fantasy 1" -> "Final Fantasy", "Max Payne 1" -> "Max Payne".
 * Preserves titles where "1" is legitimately part of the name (e.g. "Battlefield 1", "Mortal Kombat 1", "Formula 1")
 * or where preceded by division keywords (e.g. "Kill Bill Vol 1", "Dune Part 1").
 */
export function stripArtificialTrailingOne(title: string): string {
  if (!title) return '';
  const trimmed = title.trim();
  const lower = trimmed.toLowerCase();

  // If the whole title is legitimate or literally just "1", preserve it
  if (LEGITIMATE_TRAILING_ONE_TITLES.has(lower) || lower === '1') {
    return trimmed;
  }

  // Check if title ends with " 1" or " 1st"
  const trailingOneMatch = trimmed.match(/^(.*?)\s+(?:1|1st)$/i);
  if (trailingOneMatch) {
    const prefix = trailingOneMatch[1].trim();
    // If preceded by series division keywords, preserve it (e.g. "Part 1", "Vol 1", "Chapter 1", "Episode 1")
    if (/\b(part|vol|volume|chapter|episode|act|book|season)\b$/i.test(prefix)) {
      return trimmed;
    }
    // Artificial "1" detected (e.g. "Half Life 1", "Final Fantasy 1", "Max Payne 1") -> strip it
    return prefix;
  }

  // Check if title ends with trailing Roman numeral " I" (e.g. "Final Fantasy I", "Half Life I")
  const trailingIMatch = trimmed.match(/^(.*?)\s+i$/i);
  if (trailingIMatch) {
    const prefix = trailingIMatch[1].trim();
    if (/\b(part|vol|volume|chapter|episode|act|book|season)\b$/i.test(prefix)) {
      return `${prefix} 1`;
    }
    // Pronoun exception: "The King and I", "Me and I", "You and I"
    if (/\b(and|or|with|you|me)\b$/i.test(prefix)) {
      return trimmed;
    }
    return prefix;
  }

  return trimmed;
}

/**
 * Sanitizes titles to the user's specific writing style:
 * 1. NO colons (':') and NO hyphens/dashes ('-', '–', '—', '−') — replaced with space
 * 2. NO Roman numerals — converts to standard Arabic numbers
 * 3. NO artificial "1" or "I" on unnumbered franchise debuts (e.g. "Half Life", NOT "Half Life 1")
 * 4. Cleans whitespace and quotes
 */
export function sanitizeBingoTitleStyle(title: string): string {
  if (!title) return '';
  let clean = title.trim();
  // Strip colons and hyphens/dashes, replacing them with a space
  clean = clean.replace(/[:\-–—−]+/g, ' ');
  // Convert Roman numerals
  clean = convertRomanNumeralsToNumbers(clean);
  // Remove surrounding quotation marks
  clean = clean.replace(/^["'“‘«\s]+|["'”’»\s]+$/g, '');
  // Collapse whitespace
  clean = clean.replace(/\s+/g, ' ').trim();
  // Strip artificial trailing 1 / I (unless legitimate like Battlefield 1)
  clean = stripArtificialTrailingOne(clean);
  return clean;
}

/**
 * Produces a canonical fuzzy comparison key for detecting duplicates:
 * Treats "Final Fantasy: VII", "Final Fantasy 7", "The Final Fantasy VII" as the exact same key.
 * Also normalizes artificial 1s so "Half Life 1" and "Half Life" are treated as the same item.
 */
export function canonicalCompareKey(title: string): string {
  if (!title) return '';
  let s = title.toLowerCase();
  // Remove diacritics / accents
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // Remove leading articles
  s = s.replace(/^(the|a|an)\s+/i, '');
  // Convert Roman numerals
  s = convertRomanNumeralsToNumbers(s);
  // Strip artificial trailing 1 or I so "Half Life 1" matches "Half Life" as duplicate
  s = stripArtificialTrailingOne(s);
  // Strip all punctuation and symbols (including colons, hyphens, quotes, brackets)
  s = s.replace(/[^\w\s]/g, ' ');
  // Collapse whitespace
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

