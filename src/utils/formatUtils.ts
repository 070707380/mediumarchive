import { MediaFormat, ALL_MEDIA_FORMATS } from '../types';

export const STANDARD_FORMAT_MAP: Record<string, MediaFormat> = {
  'film': 'Film',
  'movie': 'Film',
  'movie / film': 'Film',
  'cinema': 'Film',
  'video game': 'Video Game',
  'game': 'Video Game',
  'videogame': 'Video Game',
  'music album': 'Music Album',
  'music': 'Music Album',
  'album': 'Music Album',
  'soundtrack': 'Music Album',
  'ost': 'Music Album',
  'tv show': 'TV Show',
  'tv series': 'TV Show',
  'tv series / anime': 'TV Show',
  'anime': 'TV Show',
  'television': 'TV Show',
  'comic/manga series': 'Comic/Manga Series',
  'manga / comic': 'Comic/Manga Series',
  'manga': 'Comic/Manga Series',
  'comic': 'Comic/Manga Series',
  'comics': 'Comic/Manga Series',
  'book': 'Book',
  'novel': 'Book',
  'literature': 'Book',
  'painting': 'Painting',
  'art': 'Painting',
  'artwork': 'Artwork',
  'board game': 'Board Game',
  'tabletop': 'Board Game',
};

/**
 * Normalizes any format string (case-insensitive, handles aliases) to canonical MediaFormat.
 */
export function normalizeMediaFormat(formatStr?: string): { canonicalFormat: MediaFormat; isCustom: boolean } {
  if (!formatStr) {
    return { canonicalFormat: 'Video Game', isCustom: false };
  }

  const raw = formatStr.trim().toLowerCase();

  if (
    raw === 'custom category' ||
    raw === 'custom' ||
    raw === 'others' ||
    raw === 'other' ||
    raw === 'extra reviews'
  ) {
    return { canonicalFormat: 'Custom Category', isCustom: true };
  }

  if (STANDARD_FORMAT_MAP[raw]) {
    return { canonicalFormat: STANDARD_FORMAT_MAP[raw], isCustom: false };
  }

  // Check if case-insensitive match with any defined MediaFormat
  for (const fmt of ALL_MEDIA_FORMATS) {
    if (fmt.toLowerCase() === raw) {
      if (fmt === 'Custom Category') {
        return { canonicalFormat: 'Custom Category', isCustom: true };
      }
      return { canonicalFormat: fmt, isCustom: false };
    }
  }

  // Unknown format string -> Treated as a named custom category
  return { canonicalFormat: formatStr as MediaFormat, isCustom: true };
}
