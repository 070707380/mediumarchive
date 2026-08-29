import { MediaItem } from '../types';
import { INITIAL_MEDIA_ITEMS } from '../data/initialData';
import { normalizeMediaFormat } from '../utils/formatUtils';

const STORAGE_KEY = 'medium_archive_items_v2';
const PASSCODE_KEY = 'medium_archive_admin_passcode_v1';
const DELETED_ITEMS_KEY = 'medium_archive_deleted_ids_v1';

const URL_KEYS = new Set([
  'cover',
  'coverurl',
  'photourl',
  'customcover',
  'thumbnailurl',
  'imageurl',
  'avatar',
  'avatarurl',
  'image',
  'url',
  'link',
  'wikiurl',
  'src',
  'href',
  'mediaformat',
  'format',
  'id',
  'linkedarchiveid'
]);

function isUrlOrImageString(str: string): boolean {
  if (!str) return false;
  const s = str.trim();
  if (
    s.startsWith('http://') ||
    s.startsWith('https://') ||
    s.startsWith('data:') ||
    s.startsWith('blob:') ||
    s.startsWith('//') ||
    s.includes('://')
  ) {
    return true;
  }
  return false;
}

export function deepLowercaseStrings<T>(val: T): T {
  if (typeof val === 'string') {
    if (isUrlOrImageString(val)) {
      return val as unknown as T;
    }
    return val.toLowerCase() as unknown as T;
  }
  if (Array.isArray(val)) {
    return val.map((item) => deepLowercaseStrings(item)) as unknown as T;
  }
  if (val !== null && typeof val === 'object') {
    const res: any = {};
    for (const key of Object.keys(val)) {
      const propVal = (val as any)[key];
      if (typeof propVal === 'string') {
        if (URL_KEYS.has(key.toLowerCase()) || isUrlOrImageString(propVal)) {
          res[key] = propVal;
        } else {
          res[key] = propVal.toLowerCase();
        }
      } else {
        res[key] = deepLowercaseStrings(propVal);
      }
    }
    return res as T;
  }
  return val;
}

/**
 * Helper to record recently deleted item IDs so stale server caches don't resurrect them
 */
function recordDeletedId(id: string): void {
  try {
    const raw = localStorage.getItem(DELETED_ITEMS_KEY);
    const map: Record<string, number> = raw ? JSON.parse(raw) : {};
    map[id] = Date.now();
    localStorage.setItem(DELETED_ITEMS_KEY, JSON.stringify(map));
  } catch (e) {
    console.warn('Error recording deleted id:', e);
  }
}

function getDeletedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_ITEMS_KEY);
    if (!raw) return new Set();
    const map: Record<string, number> = JSON.parse(raw);
    const now = Date.now();
    const active = new Set<string>();
    const cleanedMap: Record<string, number> = {};
    // Keep tombstones for 7 days
    for (const [id, time] of Object.entries(map)) {
      if (now - time < 7 * 24 * 60 * 60 * 1000) {
        active.add(id);
        cleanedMap[id] = time;
      }
    }
    localStorage.setItem(DELETED_ITEMS_KEY, JSON.stringify(cleanedMap));
    return active;
  } catch {
    return new Set();
  }
}

/**
 * Intelligently reconciles server items with local storage items so newly created/edited items are never lost on reload
 */
function reconcileItems(serverItems: MediaItem[], localItems: MediaItem[]): { merged: MediaItem[]; hasLocalChanges: boolean } {
  const deletedIds = getDeletedIds();
  const serverMap = new Map<string, MediaItem>();

  serverItems.forEach((item) => {
    if (item && item.id && !deletedIds.has(item.id)) {
      serverMap.set(item.id, item);
    }
  });

  let hasLocalChanges = false;
  const mergedMap = new Map<string, MediaItem>(serverMap);

  localItems.forEach((localItem) => {
    if (!localItem || !localItem.id) return;
    if (deletedIds.has(localItem.id)) return;

    if (!mergedMap.has(localItem.id)) {
      // Item exists locally but not yet on server (created recently before sync completed)
      mergedMap.set(localItem.id, localItem);
      hasLocalChanges = true;
    } else {
      const serverItem = mergedMap.get(localItem.id)!;
      const serverTime = serverItem.updatedAt ? new Date(serverItem.updatedAt).getTime() : 0;
      const localTime = localItem.updatedAt ? new Date(localItem.updatedAt).getTime() : 0;
      if (localTime > serverTime + 500) {
        // Local edit is newer than server copy
        mergedMap.set(localItem.id, localItem);
        hasLocalChanges = true;
      }
    }
  });

  return {
    merged: Array.from(mergedMap.values()),
    hasLocalChanges,
  };
}

export function sanitizeItemFormats(items: MediaItem[]): MediaItem[] {
  if (!Array.isArray(items)) return [];
  return items.map((item) => {
    if (!item) return item;
    const formatToCheck = item.customCategoryName || item.mediaFormat;
    const { canonicalFormat, isCustom } = normalizeMediaFormat(formatToCheck);

    if (!isCustom) {
      return {
        ...item,
        mediaFormat: canonicalFormat,
        isCustomCategory: false,
        customCategoryName: undefined,
      };
    }

    return {
      ...item,
      mediaFormat: item.customCategoryName || item.mediaFormat || 'Custom Category',
      isCustomCategory: true,
      customCategoryName: item.customCategoryName || item.mediaFormat || 'Custom Category',
    };
  });
}

export const storageService = {
  /**
   * Fetch archive data live from the API endpoint or raw URL, reconciling with local storage
   */
  async fetchArchiveData(): Promise<{ items: MediaItem[] }> {
    let rawData: any = null;

    // 1. Try fetching live from the /api/get-archive endpoint
    try {
      const response = await fetch('/api/get-archive?t=' + Date.now(), {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });
      if (response.ok) {
        rawData = await response.json();
      }
    } catch (err) {
      console.warn('Could not fetch /api/get-archive, trying fallback:', err);
    }

    // 2. Try fetching directly from raw GitHub URL
    if (!rawData || (Array.isArray(rawData) && rawData.length === 0) || (typeof rawData === 'object' && Array.isArray(rawData.items) && rawData.items.length === 0)) {
      const rawUrls = [
        'https://raw.githubusercontent.com/070707380/hornet-s-medium-archive/main/public/archive.json?t=' + Date.now(),
        'https://raw.githubusercontent.com/070707380/hornet-s-medium-archive/main/archive.json?t=' + Date.now(),
      ];
      for (const rawUrl of rawUrls) {
        try {
          const rawRes = await fetch(rawUrl, { cache: 'no-store' });
          if (rawRes.ok) {
            const data = await rawRes.json();
            if (data) {
              rawData = data;
              break;
            }
          }
        } catch (err) {
          console.warn(`Could not fetch raw GitHub URL (${rawUrl}):`, err);
        }
      }
    }

    // 3. Fallback to static /archive.json
    if (!rawData || (Array.isArray(rawData) && rawData.length === 0) || (typeof rawData === 'object' && Array.isArray(rawData.items) && rawData.items.length === 0)) {
      try {
        const response = await fetch('/archive.json?t=' + Date.now(), {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
          },
        });
        if (response.ok) {
          rawData = await response.json();
        }
      } catch (err) {
        console.warn('Could not fetch /archive.json, falling back to cached storage:', err);
      }
    }

    let serverItems: MediaItem[] = [];

    if (Array.isArray(rawData)) {
      serverItems = rawData;
    } else if (rawData && typeof rawData === 'object') {
      if (Array.isArray(rawData.items)) serverItems = rawData.items;
    }

    const localItems = this.getMediaItems();
    let finalItems: MediaItem[];

    if (serverItems.length > 0) {
      const { merged, hasLocalChanges } = reconcileItems(serverItems, localItems);
      finalItems = sanitizeItemFormats(deepLowercaseStrings(merged));
      this.saveAllMediaItems(finalItems);

      // If local storage had newer items not yet on the server, push them to the server in background
      if (hasLocalChanges) {
        const code = this.getAdminPasscode();
        if (code) {
          this.saveArchiveServer(finalItems, code).catch((err) =>
            console.warn('Background sync of local changes notice:', err)
          );
        }
      }
    } else {
      finalItems = sanitizeItemFormats(localItems.length > 0 ? localItems : deepLowercaseStrings(INITIAL_MEDIA_ITEMS));
      this.saveAllMediaItems(finalItems);
    }

    return { items: finalItems };
  },

  async fetchMediaItems(): Promise<MediaItem[]> {
    const { items } = await this.fetchArchiveData();
    return items;
  },

  getMediaItems(): MediaItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) {
        const cleanInitial = sanitizeItemFormats(deepLowercaseStrings(INITIAL_MEDIA_ITEMS));
        this.saveAllMediaItems(cleanInitial);
        return cleanInitial;
      }
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return sanitizeItemFormats(deepLowercaseStrings(parsed));
      }
      return sanitizeItemFormats(deepLowercaseStrings(INITIAL_MEDIA_ITEMS));
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return sanitizeItemFormats(deepLowercaseStrings(INITIAL_MEDIA_ITEMS));
    }
  },

  saveAllMediaItems(items: MediaItem[]): void {
    try {
      const clean = sanitizeItemFormats(deepLowercaseStrings(items));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  },

  /**
   * Saves full archive items array directly to archive.json database file on server and commits to GitHub
   */
  async saveArchiveServer(
    items?: MediaItem[],
    passcode?: string
  ): Promise<{ success: boolean; items: MediaItem[]; message?: string }> {
    const currentItems = deepLowercaseStrings(items || this.getMediaItems());
    const code = passcode || this.getAdminPasscode();

    // Immediately persist to localStorage first so it's impossible to lose data on reload
    this.saveAllMediaItems(currentItems);

    try {
      const res = await fetch('/api/save-archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          passcode: code,
          items: currentItems,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save database to server archive.json');
      }

      let updatedItems = currentItems;
      if (data.archive && Array.isArray(data.archive.items)) {
        updatedItems = deepLowercaseStrings(data.archive.items);
        this.saveAllMediaItems(updatedItems);
      }

      return {
        success: true,
        items: updatedItems,
        message: data.message || 'Database archive.json permanently updated on server!',
      };
    } catch (err: any) {
      console.warn('saveArchiveServer notice:', err);
      return {
        success: true,
        items: currentItems,
        message: err.message ? `Saved locally. (Server sync notice: ${err.message})` : 'Saved locally.',
      };
    }
  },

  /**
   * Submits a new or updated item to server and local storage immediately
   */
  async addItemServer(item: MediaItem, passcode: string): Promise<{ success: boolean; items: MediaItem[]; message?: string }> {
    const currentItems = this.getMediaItems();
    const existingIdx = currentItems.findIndex((i) => i.id === item.id);
    let updated: MediaItem[];

    const processedItem: MediaItem = {
      ...item,
      id: item.id || `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (existingIdx >= 0) {
      updated = [...currentItems];
      updated[existingIdx] = processedItem;
    } else {
      updated = [processedItem, ...currentItems];
    }

    // Immediately save locally
    this.saveAllMediaItems(updated);

    // Sync to server
    return this.saveArchiveServer(updated, passcode);
  },

  async deleteMediaItemServer(id: string, passcode: string): Promise<{ success: boolean; items: MediaItem[]; message?: string }> {
    recordDeletedId(id);
    const currentItems = this.getMediaItems();
    const updated = currentItems.filter((i) => i.id !== id);
    this.saveAllMediaItems(updated);
    return this.saveArchiveServer(updated, passcode);
  },

  saveMediaItemLocal(item: MediaItem, passcode?: string): MediaItem[] {
    const items = this.getMediaItems();
    const index = items.findIndex((i) => i.id === item.id);
    let updated: MediaItem[];

    if (index >= 0) {
      updated = [...items];
      updated[index] = {
        ...item,
        updatedAt: new Date().toISOString(),
      };
    } else {
      updated = [
        {
          ...item,
          id: item.id || `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        ...items,
      ];
    }

    this.saveAllMediaItems(updated);
    const code = passcode || this.getAdminPasscode();
    if (code) {
      this.saveArchiveServer(updated, code).catch((err) =>
        console.warn('Auto saveArchiveServer sync notice:', err)
      );
    }
    return updated;
  },

  deleteMediaItem(id: string, passcode?: string): MediaItem[] {
    recordDeletedId(id);
    const items = this.getMediaItems();
    const updated = items.filter((i) => i.id !== id);
    this.saveAllMediaItems(updated);
    const code = passcode || this.getAdminPasscode();
    if (code) {
      this.saveArchiveServer(updated, code).catch((err) =>
        console.warn('Auto saveArchiveServer delete sync notice:', err)
      );
    }
    return updated;
  },

  clearDatabase(passcode?: string): MediaItem[] {
    this.saveAllMediaItems([]);
    const code = passcode || this.getAdminPasscode();
    if (code) {
      this.saveArchiveServer([], code).catch((err) =>
        console.warn('Auto saveArchiveServer clear sync notice:', err)
      );
    }
    return [];
  },

  resetDatabase(passcode?: string): MediaItem[] {
    this.saveAllMediaItems([]);
    const code = passcode || this.getAdminPasscode();
    if (code) {
      this.saveArchiveServer([], code).catch((err) =>
        console.warn('Auto saveArchiveServer reset sync notice:', err)
      );
    }
    return [];
  },

  exportDatabaseJSON(): string {
    const items = this.getMediaItems();
    return JSON.stringify({ items }, null, 2);
  },

  importDatabaseJSON(jsonStr: string, passcode?: string): { items: MediaItem[] } {
    try {
      const parsed = deepLowercaseStrings(JSON.parse(jsonStr));
      let mediaItems: MediaItem[] = [];

      if (Array.isArray(parsed)) {
        mediaItems = parsed;
      } else if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.items)) {
          mediaItems = parsed.items;
        }
      } else {
        throw new Error('Imported JSON is not a valid format.');
      }

      this.saveAllMediaItems(mediaItems);

      const code = passcode || this.getAdminPasscode();
      if (code) {
        this.saveArchiveServer(mediaItems, code).catch((err) =>
          console.warn('Auto saveArchiveServer import sync notice:', err)
        );
      }
      return { items: mediaItems };
    } catch (err) {
      throw new Error('Invalid JSON format: ' + (err as Error).message);
    }
  },

  getAdminPasscode(): string {
    return localStorage.getItem(PASSCODE_KEY) || '';
  },

  setAdminPasscode(passcode: string): void {
    localStorage.setItem(PASSCODE_KEY, passcode);
  },

  verifyPasscode(attempt: string): boolean {
    const current = this.getAdminPasscode();
    if (!current) return false;
    return attempt.trim() === current.trim();
  },

  /**
   * Verifies the passcode against the backend API `/api/verify-passcode`
   */
  async verifyPasscodeServer(attempt: string): Promise<boolean> {
    try {
      const res = await fetch('/api/verify-passcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: attempt }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          this.setAdminPasscode(attempt);
          return true;
        }
      }
    } catch (err) {
      console.warn('Backend passcode verification notice:', err);
    }
    return false;
  }
};
