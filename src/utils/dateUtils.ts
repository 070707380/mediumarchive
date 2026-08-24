export function extractReleaseYear(releaseDateStr: string | undefined | null): number | null {
  if (!releaseDateStr) return null;
  const str = releaseDateStr.trim();

  if (/BCE?/i.test(str)) {
    const m = str.match(/\d+/);
    if (m) return -parseInt(m[0], 10);
  }

  const isoMatch = str.match(/^(\d{1,4})/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    if (year > 0 && year <= 2100) return year;
  }

  const match = str.match(/\b\d{3,4}\b/);
  if (match) {
    const year = parseInt(match[0], 10);
    if (year > 0 && year <= 2100) return year;
  }

  return null;
}

export function getDecadeFromYear(year: number): string {
  if (year < 1800) return 'Pre-1800s';
  if (year < 1900) return '1800s';
  const startDecade = Math.floor(year / 10) * 10;
  return `${startDecade}s`;
}

export const ALL_DECADE_OPTIONS = [
  'Pre-1800s',
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
