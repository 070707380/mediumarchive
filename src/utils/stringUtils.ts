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

/**
 * Sanitizes titles to the user's specific writing style:
 * 1. NO colons (':') — replaces with space
 * 2. NO Roman numerals — converts to standard Arabic numbers
 * 3. Cleans whitespace and quotes
 */
export function sanitizeBingoTitleStyle(title: string): string {
  if (!title) return '';
  let clean = title.trim();
  // Strip colons and replace with a space
  clean = clean.replace(/:+/g, ' ');
  // Convert Roman numerals
  clean = convertRomanNumeralsToNumbers(clean);
  // Remove surrounding quotation marks
  clean = clean.replace(/^["'“‘«\s]+|["'”’»\s]+$/g, '');
  // Collapse whitespace
  clean = clean.replace(/\s+/g, ' ').trim();
  return clean;
}

/**
 * Produces a canonical fuzzy comparison key for detecting duplicates:
 * Treats "Final Fantasy: VII", "Final Fantasy 7", "The Final Fantasy VII" as the exact same key.
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
  // Strip all punctuation and symbols (including colons, hyphens, quotes, brackets)
  s = s.replace(/[^\w\s]/g, ' ');
  // Collapse whitespace
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

