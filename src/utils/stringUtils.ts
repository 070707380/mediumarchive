export function getSortableTitle(title: string): string {
  if (!title) return '';
  const str = typeof title === 'string' ? title : String(title);
  return str.trim().replace(/^the\s+/i, '').trim();
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

