/**
 * Utility functions for URL query parameter synchronization, deep linking,
 * and shareable links for catalog entries, pages, creators, and tags.
 */

export interface ParsedRouteParams {
  itemId: string | null;
  view: 'archive' | 'hornets' | 'rating_scale' | 'similar' | 'creators' | 'about' | 'donate' | null;
  creator: string | null;
  tag: string | null;
}

export function parseUrlRoute(): ParsedRouteParams {
  if (typeof window === 'undefined') {
    return { itemId: null, view: null, creator: null, tag: null };
  }

  const searchParams = new URLSearchParams(window.location.search);
  
  // Support both ?item=... and ?media=...
  const rawItem = searchParams.get('item') || searchParams.get('media') || null;
  const rawView = searchParams.get('view') || null;
  const rawCreator = searchParams.get('creator') || null;
  const rawTag = searchParams.get('tag') || null;

  const validViews = ['archive', 'hornets', 'rating_scale', 'similar', 'creators', 'about', 'donate'] as const;
  const view = validViews.find((v) => v === rawView) || null;

  return {
    itemId: rawItem ? decodeURIComponent(rawItem) : null,
    view,
    creator: rawCreator ? decodeURIComponent(rawCreator) : null,
    tag: rawTag ? decodeURIComponent(rawTag) : null,
  };
}

export function updateUrlRoute(
  updates: {
    item?: string | null;
    view?: 'archive' | 'hornets' | 'rating_scale' | 'similar' | 'creators' | 'about' | 'donate' | null;
    creator?: string | null;
    tag?: string | null;
  },
  replace: boolean = false
): void {
  if (typeof window === 'undefined') return;

  const searchParams = new URLSearchParams(window.location.search);

  // Update or delete itemId
  if (updates.item !== undefined) {
    if (updates.item) {
      searchParams.set('item', updates.item);
      searchParams.delete('media'); // clean up legacy param
    } else {
      searchParams.delete('item');
      searchParams.delete('media');
    }
  }

  // Update or delete view
  if (updates.view !== undefined) {
    if (updates.view && updates.view !== 'archive') {
      searchParams.set('view', updates.view);
    } else {
      searchParams.delete('view');
    }
  }

  // Update or delete creator
  if (updates.creator !== undefined) {
    if (updates.creator) {
      searchParams.set('creator', updates.creator);
    } else {
      searchParams.delete('creator');
    }
  }

  // Update or delete tag
  if (updates.tag !== undefined) {
    if (updates.tag) {
      searchParams.set('tag', updates.tag);
    } else {
      searchParams.delete('tag');
    }
  }

  const newSearch = searchParams.toString();
  const newUrl = `${window.location.pathname}${newSearch ? `?${newSearch}` : ''}${window.location.hash || ''}`;

  if (replace) {
    window.history.replaceState({ path: newUrl }, '', newUrl);
  } else {
    // Only pushState if the URL is actually different to avoid redundant history entries
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash || ''}`;
    if (currentUrl !== newUrl) {
      window.history.pushState({ path: newUrl }, '', newUrl);
    }
  }
}

export function getItemShareableUrl(itemId: string): string {
  if (typeof window === 'undefined') return `/?item=${encodeURIComponent(itemId)}`;
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  return `${origin}${pathname}?item=${encodeURIComponent(itemId)}`;
}
