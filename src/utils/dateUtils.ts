export function extractReleaseYear(releaseDateStr: string | undefined | null): number | null {
  if (!releaseDateStr) return null;
  const str = releaseDateStr.trim();

  // Check for BCE / BC notation e.g. "500 BCE", "c. 450 BC", "380 BCE"
  if (/BCE?/i.test(str) || /\bBC\b/i.test(str)) {
    const m = str.match(/\d+/);
    if (m) return -parseInt(m[0], 10);
  }

  // Check for negative year e.g. "-500"
  if (/^-\d+/.test(str)) {
    const m = str.match(/-\d+/);
    if (m) return parseInt(m[0], 10);
  }

  const isoMatch = str.match(/^(\d{1,4})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    if (year >= 0 && year <= 2100) return year;
  }

  const match = str.match(/\b\d{1,4}\b/);
  if (match) {
    const year = parseInt(match[0], 10);
    if (year >= 0 && year <= 2100) return year;
  }

  return null;
}

export function formatReleaseYear(releaseDateStr: string | undefined | null): string {
  if (!releaseDateStr) return 'N/A';
  const year = extractReleaseYear(releaseDateStr);
  if (year !== null) {
    if (year < 0) return `${Math.abs(year)} BCE`;
    return String(year);
  }
  return releaseDateStr.substring(0, 4) || 'N/A';
}

export function getDecadeFromYear(year: number): string {
  if (year < 0) return 'BCE';
  if (year < 1000) return '0-999';
  if (year < 1500) return '1000-1499';
  if (year < 1600) return '1500s';
  if (year < 1700) return '1600s';
  if (year < 1800) return '1700s';
  if (year < 1900) return '1800s';
  const startDecade = Math.floor(year / 10) * 10;
  return `${startDecade}s`;
}

export const ALL_DECADE_OPTIONS = [
  'BCE',
  '0-999',
  '1000-1499',
  '1500s',
  '1600s',
  '1700s',
  '1800s',
  '1900s',
  '1910s',
  '1920s',
  '1930s',
  '1940s',
  '1950s',
  '1960s',
  '1970s',
  '1980s',
  '1990s',
  '2000s',
  '2010s',
  '2020s',
];
