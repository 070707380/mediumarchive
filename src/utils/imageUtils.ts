/**
 * Formats and normalizes image URLs so they load reliably across all sizes,
 * formats (JPG, PNG, WebP, AVIF, SVG, GIF, Data URIs), and origins.
 *
 * Automatically converts Google Drive share links, Wikipedia File pages,
 * Google Image search redirects, GitHub blob links, Dropbox links, and Imgur page links
 * into direct renderable image stream URLs.
 */
export function formatImageUrl(url: string | undefined | null): string {
  if (!url) return '';
  let trimmed = url.trim();
  if (!trimmed) return '';

  // Remove surrounding quotes or angle brackets if pasted accidentally
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
    trimmed = trimmed.slice(1, -1).trim();
  }

  // Handle data URIs and blob URIs directly
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed;
  }

  // Handle protocol-relative URLs (e.g. //upload.wikimedia.org/...)
  if (trimmed.startsWith('//')) {
    trimmed = `https:${trimmed}`;
  }

  // Handle missing protocol (e.g. images.unsplash.com/... or i.imgur.com/...)
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }

  try {
    const urlObj = new URL(trimmed);

    // 1. Handle Google Image Search redirect URLs (e.g., google.com/imgres?imgurl=...)
    if (urlObj.hostname.includes('google.') && urlObj.pathname.includes('/imgres')) {
      const imgurl = urlObj.searchParams.get('imgurl');
      if (imgurl) {
        return formatImageUrl(decodeURIComponent(imgurl));
      }
    }

    // 2. Handle Google Drive links
    // e.g. https://drive.google.com/file/d/1ABC123/view?usp=sharing
    // or https://drive.google.com/open?id=1ABC123
    if (urlObj.hostname.includes('drive.google.com')) {
      let fileId = urlObj.searchParams.get('id');
      if (!fileId) {
        const match = urlObj.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (match) {
          fileId = match[1];
        }
      }
      if (fileId) {
        return `https://lh3.googleusercontent.com/d/${fileId}`;
      }
    }

    // 3. Handle Wikipedia / Wikimedia Commons File: pages
    // e.g. https://commons.wikimedia.org/wiki/File:Solaris.jpg or https://en.wikipedia.org/wiki/File:Solaris.jpg
    if (urlObj.hostname.includes('wikipedia.org') || urlObj.hostname.includes('wikimedia.org')) {
      const match = urlObj.pathname.match(/\/wiki\/(File|Image):(.+)$/i);
      if (match) {
        const fileName = decodeURIComponent(match[2]);
        return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}`;
      }
    }

    // 4. Handle GitHub web blob links
    // e.g. https://github.com/user/repo/blob/main/path/image.png
    if (urlObj.hostname === 'github.com' && urlObj.pathname.includes('/blob/')) {
      const rawPath = urlObj.pathname.replace('/blob/', '/');
      return `https://raw.githubusercontent.com${rawPath}`;
    }

    // 5. Handle Dropbox share links
    // e.g. https://www.dropbox.com/s/xyz/photo.jpg?dl=0
    if (urlObj.hostname.includes('dropbox.com')) {
      urlObj.searchParams.set('raw', '1');
      return urlObj.toString();
    }

    // 6. Handle Imgur page links
    // e.g. https://imgur.com/a/ABC1234 or https://imgur.com/ABC1234
    if (urlObj.hostname === 'imgur.com' || urlObj.hostname === 'm.imgur.com') {
      const match = urlObj.pathname.match(/\/(?:a|gallery)?\/([a-zA-Z0-9]+)/);
      if (match) {
        return `https://i.imgur.com/${match[1]}.jpg`;
      }
    }
  } catch (e) {
    // If URL parsing fails, return trimmed as best effort
  }

  return trimmed;
}

/**
 * In-memory & localStorage cache for Wikipedia image lookup
 */
const wikiImageCache = new Map<string, string>();

/**
 * Checks whether a given string is a Wikipedia article URL
 */
export function isWikipediaArticleUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  try {
    const trimmed = url.trim();
    if (!trimmed.includes('wikipedia.org')) return false;
    const urlObj = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const match = urlObj.pathname.match(/\/wiki\/([^#?]+)/);
    if (!match) return false;
    const rawTitle = match[1];
    return !rawTitle.startsWith('File:') && !rawTitle.startsWith('Image:') && !rawTitle.startsWith('Special:');
  } catch {
    return false;
  }
}

/**
 * Automatically fetches the main lead image / thumbnail from Wikipedia REST API summary or Action API
 * given a Wikipedia URL (e.g. https://en.wikipedia.org/wiki/Quentin_Tarantino) or creator title/name.
 */
export async function fetchWikipediaImage(wikiUrlOrTitle: string | undefined | null): Promise<string | null> {
  if (!wikiUrlOrTitle) return null;
  let trimmed = wikiUrlOrTitle.trim();
  if (!trimmed) return null;

  // Clean creator suffix if present (e.g. "Quentin Tarantino / Director" -> "Quentin Tarantino")
  if (trimmed.includes('/') && !trimmed.startsWith('http')) {
    trimmed = trimmed.split('/')[0].trim();
  }

  if (wikiImageCache.has(trimmed)) {
    return wikiImageCache.get(trimmed) || null;
  }

  // Try retrieving from localStorage cache
  try {
    const cachedLocally = localStorage.getItem(`wiki_img_cache_${trimmed}`);
    if (cachedLocally) {
      wikiImageCache.set(trimmed, cachedLocally);
      return cachedLocally;
    }
  } catch {
    // Ignore localStorage errors
  }

  let title = trimmed;
  let lang = 'en';

  if (trimmed.includes('wikipedia.org')) {
    try {
      const urlObj = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
      const langMatch = urlObj.hostname.match(/^([a-z]{2,3})\.wikipedia\.org$/i);
      if (langMatch) {
        lang = langMatch[1];
      }
      const match = urlObj.pathname.match(/\/wiki\/([^#?]+)/);
      if (match) {
        title = decodeURIComponent(match[1]).replace(/_/g, ' ');
      }
    } catch {
      // Fallback to raw string title
    }
  }

  // Strip file/image prefix if present
  if (title.startsWith('File:') || title.startsWith('Image:')) {
    const fileName = title.replace(/^(File|Image):/i, '');
    const directUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}`;
    wikiImageCache.set(trimmed, directUrl);
    return directUrl;
  }

  // Clean up title for search/lookup
  const cleanTitle = title.replace(/_/g, ' ').trim();

  // Strategy 1: Wikipedia REST API Summary
  try {
    const apiUrl = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanTitle)}`;
    const res = await fetch(apiUrl);
    if (res.ok) {
      const data = await res.json();
      const imgUrl = data.thumbnail?.source || data.originalimage?.source || null;
      if (imgUrl) {
        wikiImageCache.set(trimmed, imgUrl);
        try {
          localStorage.setItem(`wiki_img_cache_${trimmed}`, imgUrl);
        } catch {
          // Ignore storage quota
        }
        return imgUrl;
      }
    }
  } catch {
    // Continue to Action API
  }

  // Strategy 2: Wikipedia Action API with PageImages and Redirects
  try {
    const actionUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(
      cleanTitle
    )}&prop=pageimages&pithumbsize=600&redirects=1&format=json&origin=*`;
    const res = await fetch(actionUrl);
    if (res.ok) {
      const data = await res.json();
      const pages = data.query?.pages;
      if (pages) {
        const pageId = Object.keys(pages)[0];
        if (pageId && pageId !== '-1') {
          const imgUrl = pages[pageId].thumbnail?.source || null;
          if (imgUrl) {
            wikiImageCache.set(trimmed, imgUrl);
            try {
              localStorage.setItem(`wiki_img_cache_${trimmed}`, imgUrl);
            } catch {}
            return imgUrl;
          }
        }
      }
    }
  } catch {
    // Continue to Search API
  }

  // Strategy 3: Wikipedia Generator Search API (if direct title didn't match exactly)
  try {
    const searchUrl = `https://${lang}.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
      cleanTitle
    )}&gsrlimit=1&prop=pageimages&pithumbsize=600&format=json&origin=*`;
    const res = await fetch(searchUrl);
    if (res.ok) {
      const data = await res.json();
      const pages = data.query?.pages;
      if (pages) {
        const firstPage = Object.values(pages)[0] as any;
        const imgUrl = firstPage?.thumbnail?.source || null;
        if (imgUrl) {
          wikiImageCache.set(trimmed, imgUrl);
          try {
            localStorage.setItem(`wiki_img_cache_${trimmed}`, imgUrl);
          } catch {}
          return imgUrl;
        }
      }
    }
  } catch (err) {
    console.warn('Failed to fetch Wikipedia lead image for:', trimmed, err);
  }

  return null;
}

/**
 * Returns a high-speed CDN image proxy URL (wsrv.nl / weserv.nl) that bypasses CORS,
 * anti-hotlinking headers, referrer checks, and optimizes image formats.
 */
export function getProxyImageUrl(url: string): string {
  const formatted = formatImageUrl(url);
  if (!formatted || formatted.startsWith('data:') || formatted.startsWith('blob:')) {
    return formatted;
  }
  return `https://wsrv.nl/?url=${encodeURIComponent(formatted)}`;
}

export const DEFAULT_FALLBACK_IMAGE = '';
