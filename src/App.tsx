import React, { useState, useEffect, useMemo, useCallback, useDeferredValue } from 'react';
import { MediaItem, FilterOptions, DEFAULT_SCORING_PHILOSOPHY, RATING_SCALE_LEVELS } from './types';
import { extractReleaseYear, getDecadeFromYear } from './utils/dateUtils';
import { getSortableTitle } from './utils/stringUtils';
import { buildCompositeQualityRankMap, getItemScore } from './utils/sortUtils';
import { storageService } from './services/storage';
import { findInterconnectedCandidates, applyConfirmedLinks, DetectedLinkCandidate } from './utils/linkDetector';
import { Navbar } from './components/Navbar';
import { HeroRandomFeatured } from './components/HeroRandomFeatured';
import { AdvancedFilterPanel } from './components/AdvancedFilterPanel';
import { MediaCard } from './components/MediaCard';
import { MediaDetailModal } from './components/MediaDetailModal';
import { PasscodeModal } from './components/PasscodeModal';
import { AdminMediaModal } from './components/AdminMediaModal';
import { AdminToolsDrawer } from './components/AdminToolsDrawer';
import { RatingScalePage } from './components/RatingScalePage';
import { HornetsPage } from './components/HornetsPage';
import { SimilarItemsPage } from './components/SimilarItemsPage';
import { CreatorsPage } from './components/CreatorsPage';
import { AboutHornetPage } from './components/AboutHornetPage';
import { DonatePage } from './components/DonatePage';
import { CreatorBioModal } from './components/CreatorBioModal';
import { GlobalTagModal } from './components/GlobalTagModal';
import { LinkConfirmationModal } from './components/LinkConfirmationModal';
import { TableView } from './components/TableView';
import { parseUrlRoute, updateUrlRoute } from './utils/urlUtils';
import { ShieldCheck, Plus, Layers, Lock, Database, User, Heart, LayoutGrid, Table, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [items, setItems] = useState<MediaItem[]>(() => storageService.getMediaItems());
  const [viewLayout, setViewLayout] = useState<'grid' | 'table'>('table');
  const [aiRankMap, setAiRankMap] = useState<Map<string, number> | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [adminPasscode, setAdminPasscode] = useState<string>(() => storageService.getAdminPasscode());
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveStatusMessage, setSaveStatusMessage] = useState<string | null>(null);

  // Scoring Philosophy
  const [scoringPhilosophy, setScoringPhilosophy] = useState<string>(DEFAULT_SCORING_PHILOSOPHY);

  useEffect(() => {
    localStorage.removeItem('hornet_scoring_philosophy');
  }, []);

  const handleUpdateScoringPhilosophy = (newPhilosophy: string) => {
    setScoringPhilosophy(newPhilosophy);
  };

  // Link Detection Modal State
  const [pendingLinkCandidates, setPendingLinkCandidates] = useState<DetectedLinkCandidate[]>([]);
  const [processedCandidateIds, setProcessedCandidateIds] = useState<Set<string>>(new Set());

  // Active Navigation View (initialized from URL if present)
  const [activeView, setActiveView] = useState<'archive' | 'hornets' | 'rating_scale' | 'similar' | 'creators' | 'about' | 'donate'>(() => {
    const route = parseUrlRoute();
    return route.view || 'archive';
  });

  // Modals & Drawers State (initialized from URL if present)
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(() => {
    const route = parseUrlRoute();
    if (!route.itemId) return null;
    const initialItems = storageService.getMediaItems();
    return initialItems.find(
      (i) => i.id === route.itemId || i.title?.toLowerCase().trim() === route.itemId?.toLowerCase().trim()
    ) || null;
  });
  const [selectedCreatorForBio, setSelectedCreatorForBio] = useState<string | null>(() => parseUrlRoute().creator);
  const [selectedTagForBio, setSelectedTagForBio] = useState<string | null>(() => parseUrlRoute().tag);
  const [isPasscodeModalOpen, setIsPasscodeModalOpen] = useState(false);
  const [isAdminMediaModalOpen, setIsAdminMediaModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<MediaItem | null>(null);
  const [isAdminToolsOpen, setIsAdminToolsOpen] = useState(false);

  // Filter options state
  const [filters, setFilters] = useState<FilterOptions>({
    searchQuery: '',
    formats: [],
    selectedGenres: [],
    selectedPhilosophicalTags: [],
    selectedStyleTags: [],
    selectedConsumedVersions: [],
    selectedDecades: [],
    selectedCountries: [],
    selectedLanguages: [],
    minScore: 0,
    maxScore: 10,
    releaseYearStart: null,
    releaseYearEnd: null,
    tagLogic: 'OR',
    sortBy: 'quality'
  });

  // Fetch items on mount and backfill standalone soundtrack entries if missing
  useEffect(() => {
    storageService.fetchArchiveData().then(({ items: fetchedItems }) => {
      const sanitized = fetchedItems.map((item) => ({
        ...item,
        genreStyleTags: item.genreStyleTags ? item.genreStyleTags.map((t) => (typeof t === 'string' ? t.toLowerCase() : String(t))) : []
      }));

      // Check if any non-music item has soundtrack titles without a standalone Music Album entry
      const newItemsToAdd: MediaItem[] = [];

      sanitized.forEach((item) => {
        if (item.mediaFormat !== 'Music Album') {
          const stList = [...(item.soundtracks || [])];
          if (
            item.soundtrackTitle &&
            !stList.some((s) => s && s.title && typeof s.title === 'string' && s.title.toLowerCase().trim() === (item.soundtrackTitle || '').toLowerCase().trim())
          ) {
            stList.push({ id: item.soundtrackId, title: item.soundtrackTitle });
          }

          stList.forEach((st) => {
            if (!st || !st.title || typeof st.title !== 'string' || !st.title.trim()) return;
            const stTitleLower = st.title.trim().toLowerCase();
            const exists = sanitized.some(
              (i) => i.id === st.id || (i.mediaFormat === 'Music Album' && i.title && typeof i.title === 'string' && i.title.toLowerCase().trim() === stTitleLower)
            );
            if (!exists) {
              const newAlbumId = `album-ost-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
              const standaloneOST: MediaItem = {
                id: newAlbumId,
                title: st.title.trim(),
                cover: item.cover,
                mediaFormat: 'Music Album',
                mainCreator: item.mainCreator,
                otherCreators: [],
                creatorDetails: item.mainCreator ? [{ name: item.mainCreator, category: 'Music Artist' }] : [],
                releaseDate: item.releaseDate,
                hornetScore: item.hornetScore || 85,
                hornetVerdict: item.hornetVerdict ? `Official soundtrack for ${item.title}.` : `Official Original Soundtrack (OST) for ${item.title}.`,
                genres: item.genres?.length ? item.genres : ['Soundtrack'],
                genreStyleTags: Array.from(new Set([...(item.genreStyleTags || []), 'soundtrack', 'ost', 'film score'])),
                philosophicalTags: item.philosophicalTags || [],
                consumedVersion: item.consumedVersion,
                summaryPlot: `Official original soundtrack composed for ${item.title} (${item.mediaFormat}).`,
                pros: [`Official original soundtrack for ${item.title}`],
                cons: [],
                isSoundtrack: true,
                soundtrackForId: item.id,
                soundtrackForTitle: item.title,
                links: [],
                similarMedia: [item.title],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              newItemsToAdd.push(standaloneOST);
              st.id = newAlbumId;
            }
          });
        }
      });

      if (newItemsToAdd.length > 0) {
        const fullList = [...sanitized, ...newItemsToAdd];
        setItems(fullList);
        storageService.saveArchiveServer(fullList, storageService.getAdminPasscode()).catch((e) => console.warn('Auto OST backfill error:', e));

        const targetItemId = parseUrlRoute().itemId;
        if (targetItemId) {
          const matched = fullList.find(
            (i) => i.id === targetItemId || i.title?.toLowerCase().trim() === targetItemId.toLowerCase().trim()
          );
          if (matched) setSelectedMedia(matched);
        }
      } else {
        setItems(sanitized);

        const targetItemId = parseUrlRoute().itemId;
        if (targetItemId) {
          const matched = sanitized.find(
            (i) => i.id === targetItemId || i.title?.toLowerCase().trim() === targetItemId.toLowerCase().trim()
          );
          if (matched) setSelectedMedia(matched);
        }
      }
    });
  }, []);

  // Handle Browser Back & Forward (popstate) Deep Linking
  useEffect(() => {
    const handlePopState = () => {
      const route = parseUrlRoute();
      setActiveView(route.view || 'archive');
      setSelectedCreatorForBio(route.creator);
      setSelectedTagForBio(route.tag);
      if (route.itemId) {
        const found = items.find(
          (i) => i.id === route.itemId || i.title?.toLowerCase().trim() === route.itemId?.toLowerCase().trim()
        );
        setSelectedMedia(found || null);
      } else {
        setSelectedMedia(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [items]);

  // Silently trigger background AI ranking on mount or when items change (debounced)
  useEffect(() => {
    let isMounted = true;
    if (!items || items.length === 0) return;

    const fetchSmartSort = async () => {
      try {
        const response = await fetch('/api/ai-sort', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items, scoringPhilosophy }),
        });
        const data = await response.json();
        if (isMounted && response.ok && data.success && Array.isArray(data.sortedIds)) {
          const map = new Map<string, number>();
          data.sortedIds.forEach((id: string, index: number) => {
            map.set(id, index);
          });
          setAiRankMap(map);
        }
      } catch (err) {
        // Fallback to deterministic ranking
      }
    };

    const timer = setTimeout(fetchSmartSort, 400);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [items, scoringPhilosophy]);

  // Compute all unique philosophical tags and style tags across current database
  const allPhilosophicalTags = useMemo(() => {
    return Array.from(new Set(items.flatMap((i) => i.philosophicalTags || []))).sort();
  }, [items]);

  const allStyleTags = useMemo(() => {
    return Array.from(
      new Set([
        ...items.flatMap((i) => i.genres || []),
        ...items.flatMap((i) => i.genreStyleTags || [])
      ])
    ).sort();
  }, [items]);

  // Defer search input update for performance
  const deferredSearchQuery = useDeferredValue(filters.searchQuery);
  const [visibleCount, setVisibleCount] = useState<number>(48);

  // Reset pagination on filter change
  useEffect(() => {
    setVisibleCount(48);
  }, [filters, items.length]);

  // Pre-compute searchable text strings
  const itemCorpusMap = useMemo(() => {
    const map = new Map<string, string>();
    const normalizeText = (str: any) =>
      typeof str === 'string' ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '';

    items.forEach((item) => {
      const rawCorpus = [
        item.title || '',
        item.mainCreator || '',
        ...(item.otherCreators || []),
        item.mediaFormat || '',
        item.releaseDate || '',
        item.consumedVersion || '',
        item.countryOfOrigin || '',
        item.originalLanguage || '',
        item.hornetVerdict || '',
        item.summaryPlot || '',
        `${item.hornetScore}`,
        `${item.hornetScore}/10`,
        `${Math.round(item.hornetScore)}`,
        ...(item.genres || []),
        ...(item.philosophicalTags || []),
        ...(item.genreStyleTags || []),
        ...(item.pros || []),
        ...(item.cons || []),
        ...(item.similarMedia || []).map((sm) => (typeof sm === 'string' ? sm : (sm && sm.title) || '')),
        ...(item.mediumInfluences || []).map((mi) => (typeof mi === 'string' ? mi : (mi && mi.title) || '')),
        ...(item.creatorDetails || []).flatMap((cd) => [
          cd.name || '',
          cd.category || '',
          cd.nation || '',
          ...(cd.bandMembers || []).flatMap((bm) => [bm.name || '', bm.bandRole || ''])
        ])
      ].join(' ');

      map.set(item.id, normalizeText(rawCorpus));
    });
    return map;
  }, [items]);

  // Filter & Sort Logic
  const filteredItems = useMemo(() => {
    const normalizeText = (str: any) =>
      typeof str === 'string' ? str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '';

    const filtered = items.filter((item) => {
      // 0. Exclude Custom Category / Extra Reviews from Main Screen List (Hornet's Page Only)
      if (item.isCustomCategory || item.mediaFormat === 'Custom Category') {
        return false;
      }

      // 1. Search Query
      if (deferredSearchQuery.trim() !== '') {
        const queryClean = deferredSearchQuery.trim().toLowerCase();
        if (queryClean === 'fourward') {
          // Passcode secret query, handled by Navbar
          return true;
        }

        const normQuery = normalizeText(queryClean);
        const terms = normQuery.split(/\s+/).filter(Boolean);

        const corpus = itemCorpusMap.get(item.id) || '';

        const matchesAllTerms = terms.every((term) => corpus.includes(term));
        if (!matchesAllTerms) {
          return false;
        }
      }

      // 2. Media Formats
      if (filters.formats.length > 0) {
        const selectedFormatsLower = filters.formats.map((f) => f.toLowerCase().trim());
        const itemFormatLower = (item.mediaFormat || '').toLowerCase().trim();
        if (!selectedFormatsLower.includes(itemFormatLower)) {
          return false;
        }
      }

      // 3. Hornet Score Range (0 to 10)
      if (item.hornetScore < filters.minScore || item.hornetScore > filters.maxScore) {
        return false;
      }

      // 3.5. Release Year & Decade Filtering
      const itemYear = extractReleaseYear(item.releaseDate);

      if (filters.releaseYearStart !== null && typeof filters.releaseYearStart === 'number' && !isNaN(filters.releaseYearStart)) {
        if (itemYear === null || itemYear < filters.releaseYearStart) return false;
      }

      if (filters.releaseYearEnd !== null && typeof filters.releaseYearEnd === 'number' && !isNaN(filters.releaseYearEnd)) {
        if (itemYear === null || itemYear > filters.releaseYearEnd) return false;
      }

      if (filters.selectedDecades && filters.selectedDecades.length > 0) {
        if (itemYear === null) return false;
        const itemDecade = getDecadeFromYear(itemYear);
        const selectedDecadesNorm = filters.selectedDecades.map((d) => d.toLowerCase().trim());
        const isMatch =
          selectedDecadesNorm.includes(itemDecade.toLowerCase()) ||
          (itemDecade === '1500s' && selectedDecadesNorm.includes('1500')) ||
          (itemDecade === 'BCE' && (selectedDecadesNorm.includes('bce') || selectedDecadesNorm.includes('bc'))) ||
          (itemYear < 1800 && selectedDecadesNorm.includes('pre-1800s'));
        if (!isMatch) return false;
      }

      // 4. Philosophical Tags Filtering
      if (filters.selectedPhilosophicalTags && filters.selectedPhilosophicalTags.length > 0) {
        const itemTags = item.philosophicalTags || [];
        if (filters.tagLogic === 'AND') {
          const hasAll = filters.selectedPhilosophicalTags.every((st) =>
            itemTags.some((it) => it.toLowerCase().trim() === st.toLowerCase().trim())
          );
          if (!hasAll) return false;
        } else {
          const hasAny = filters.selectedPhilosophicalTags.some((st) =>
            itemTags.some((it) => it.toLowerCase().trim() === st.toLowerCase().trim())
          );
          if (!hasAny) return false;
        }
      }

      // 5. Main Genres Filtering
      if (filters.selectedGenres && filters.selectedGenres.length > 0) {
        const itemGenres = item.genres || [];
        if (filters.tagLogic === 'AND') {
          const hasAll = filters.selectedGenres.every((g) =>
            itemGenres.some((ig) => ig.toLowerCase().trim() === g.toLowerCase().trim())
          );
          if (!hasAll) return false;
        } else {
          const hasAny = filters.selectedGenres.some((g) =>
            itemGenres.some((ig) => ig.toLowerCase().trim() === g.toLowerCase().trim())
          );
          if (!hasAny) return false;
        }
      }

      // 6. Elements & Reference / Style Tags Filtering
      if (filters.selectedStyleTags && filters.selectedStyleTags.length > 0) {
        const itemElements = item.genreStyleTags || [];
        if (filters.tagLogic === 'AND') {
          const hasAll = filters.selectedStyleTags.every((st) =>
            itemElements.some((ie) => ie.toLowerCase().trim() === st.toLowerCase().trim())
          );
          if (!hasAll) return false;
        } else {
          const hasAny = filters.selectedStyleTags.some((st) =>
            itemElements.some((ie) => ie.toLowerCase().trim() === st.toLowerCase().trim())
          );
          if (!hasAny) return false;
        }
      }

      // 6. Consumed Version / Platform Filtering
      if (filters.selectedConsumedVersions && filters.selectedConsumedVersions.length > 0) {
        if (!item.consumedVersion || !filters.selectedConsumedVersions.includes(item.consumedVersion)) {
          return false;
        }
      }

      // 7. Country of Origin Filtering
      if (filters.selectedCountries && filters.selectedCountries.length > 0) {
        if (!item.countryOfOrigin || !filters.selectedCountries.includes(item.countryOfOrigin)) {
          return false;
        }
      }

      // 8. Original Language Filtering
      if (filters.selectedLanguages && filters.selectedLanguages.length > 0) {
        if (!item.originalLanguage || !filters.selectedLanguages.includes(item.originalLanguage)) {
          return false;
        }
      }

      return true;
    });

    const compositeRankMap = buildCompositeQualityRankMap(items, aiRankMap);

    return filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'quality': {
          const rankA = compositeRankMap.get(a.id) ?? 999999;
          const rankB = compositeRankMap.get(b.id) ?? 999999;
          return rankA - rankB;
        }
        case 'score_desc':
          return getItemScore(b) - getItemScore(a);
        case 'score_asc':
          return getItemScore(a) - getItemScore(b);
        case 'release_desc':
          return (b.releaseDate || '').localeCompare(a.releaseDate || '');
        case 'release_asc':
          return (a.releaseDate || '').localeCompare(b.releaseDate || '');
        case 'title':
          return getSortableTitle(a.title).localeCompare(getSortableTitle(b.title));
        case 'date_added':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'random':
        default:
          return 0;
      }
    });
  }, [
    items,
    aiRankMap,
    itemCorpusMap,
    deferredSearchQuery,
    filters.formats,
    filters.minScore,
    filters.maxScore,
    filters.releaseYearStart,
    filters.releaseYearEnd,
    filters.selectedDecades,
    filters.selectedPhilosophicalTags,
    filters.selectedGenres,
    filters.selectedStyleTags,
    filters.selectedConsumedVersions,
    filters.selectedCountries,
    filters.selectedLanguages,
    filters.tagLogic,
    filters.sortBy
  ]);

  // Handlers
  const handleSaveMedia = async (newItem: MediaItem) => {
    try {
      const activeCode = adminPasscode || storageService.getAdminPasscode();
      let workingItems = [...items];
      const processedId = newItem.id || `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const nowIso = new Date().toISOString();
      let itemToSave: MediaItem = {
        ...newItem,
        id: processedId,
        createdAt: newItem.createdAt || nowIso,
        updatedAt: nowIso,
      };

      // 1. If saving a non-Music Album item that specifies soundtracks, ensure standalone Music Album entries exist
      if (itemToSave.mediaFormat !== 'Music Album') {
        const soundtrackList = [...(itemToSave.soundtracks || [])];
        if (
          itemToSave.soundtrackTitle &&
          !soundtrackList.some((s) => s.title.toLowerCase().trim() === itemToSave.soundtrackTitle!.toLowerCase().trim())
        ) {
          soundtrackList.unshift({ id: itemToSave.soundtrackId, title: itemToSave.soundtrackTitle });
        }

        if (soundtrackList.length > 0) {
          const finalSoundtrackRefs: { id: string; title: string }[] = [];

          for (const st of soundtrackList) {
            if (!st.title || !st.title.trim()) continue;
            const cleanTitle = st.title.trim();
            const cleanTitleLower = cleanTitle.toLowerCase();

            // Check if matching Music Album already exists in DB
            let existingAlbumIdx = workingItems.findIndex(
              (i) => i.id === st.id || (i.mediaFormat === 'Music Album' && i.title.toLowerCase().trim() === cleanTitleLower)
            );

            if (existingAlbumIdx >= 0) {
              const existingAlbum = workingItems[existingAlbumIdx];
              const updatedAlbum: MediaItem = {
                ...existingAlbum,
                isSoundtrack: true,
                soundtrackForId: itemToSave.id,
                soundtrackForTitle: itemToSave.title,
                updatedAt: new Date().toISOString()
              };
              workingItems[existingAlbumIdx] = updatedAlbum;
              finalSoundtrackRefs.push({ id: updatedAlbum.id, title: updatedAlbum.title });
            } else {
              // Auto-create standalone Music Album entry
              const newAlbumId = `album-ost-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
              const standaloneOST: MediaItem = {
                id: newAlbumId,
                title: cleanTitle,
                cover: itemToSave.cover,
                mediaFormat: 'Music Album',
                mainCreator: itemToSave.mainCreator,
                otherCreators: [],
                creatorDetails: itemToSave.mainCreator ? [{ name: itemToSave.mainCreator, category: 'Music Artist' }] : [],
                releaseDate: itemToSave.releaseDate,
                hornetScore: itemToSave.hornetScore || 85,
                hornetVerdict: itemToSave.hornetVerdict
                  ? `Official soundtrack for ${itemToSave.title}.`
                  : `Official Original Soundtrack (OST) for ${itemToSave.title}.`,
                genres: itemToSave.genres?.length ? itemToSave.genres : ['Soundtrack'],
                genreStyleTags: Array.from(new Set([...(itemToSave.genreStyleTags || []), 'soundtrack', 'ost', 'film score'])),
                philosophicalTags: itemToSave.philosophicalTags || [],
                consumedVersion: itemToSave.consumedVersion,
                summaryPlot: `Official original soundtrack composed for ${itemToSave.title} (${itemToSave.mediaFormat}).`,
                pros: [`Official soundtrack release for ${itemToSave.title}`],
                cons: [],
                isSoundtrack: true,
                soundtrackForId: itemToSave.id,
                soundtrackForTitle: itemToSave.title,
                links: [],
                similarMedia: [itemToSave.title],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };

              workingItems.unshift(standaloneOST);
              finalSoundtrackRefs.push({ id: newAlbumId, title: cleanTitle });
            }
          }

          itemToSave.soundtracks = finalSoundtrackRefs;
          itemToSave.soundtrackId = finalSoundtrackRefs[0]?.id;
          itemToSave.soundtrackTitle = finalSoundtrackRefs[0]?.title;
        }
      }

      // 2. Bi-directional link update: if this album is a soundtrack for a parent media item in DB
      if (itemToSave.mediaFormat === 'Music Album' && (itemToSave.isSoundtrack || itemToSave.soundtrackForId || itemToSave.soundtrackForTitle)) {
        let parentIdx = -1;
        if (itemToSave.soundtrackForId) {
          parentIdx = workingItems.findIndex((i) => i.id === itemToSave.soundtrackForId);
        }
        if (parentIdx === -1 && itemToSave.soundtrackForTitle) {
          const parentTitleLower = itemToSave.soundtrackForTitle.toLowerCase().trim();
          parentIdx = workingItems.findIndex((i) => i.title.toLowerCase().trim() === parentTitleLower);
        }

        if (parentIdx >= 0) {
          const parentItem = workingItems[parentIdx];
          const existingSoundtracks = parentItem.soundtracks || [];
          const alreadyLinked = existingSoundtracks.some((s) => s.id === itemToSave.id || s.title.toLowerCase().trim() === itemToSave.title.toLowerCase().trim());
          const updatedSoundtracks = alreadyLinked
            ? existingSoundtracks.map((s) => (s.id === itemToSave.id || s.title.toLowerCase().trim() === itemToSave.title.toLowerCase().trim() ? { id: itemToSave.id, title: itemToSave.title } : s))
            : [...existingSoundtracks, { id: itemToSave.id, title: itemToSave.title }];

          const updatedParent: MediaItem = {
            ...parentItem,
            soundtracks: updatedSoundtracks,
            soundtrackId: updatedSoundtracks[0]?.id || itemToSave.id,
            soundtrackTitle: updatedSoundtracks[0]?.title || itemToSave.title,
            updatedAt: new Date().toISOString()
          };
          workingItems[parentIdx] = updatedParent;

          itemToSave.soundtrackForId = parentItem.id;
          itemToSave.soundtrackForTitle = parentItem.title;
          itemToSave.isSoundtrack = true;
        }
      }

      // 3. Upsert itemToSave in workingItems
      const targetIdx = workingItems.findIndex((i) => i.id === itemToSave.id);
      if (targetIdx >= 0) {
        workingItems[targetIdx] = itemToSave;
      } else {
        workingItems.unshift(itemToSave);
      }

      // 4. INSTANT UI & LocalStorage update: unblock user immediately
      setItems(workingItems);
      storageService.saveAllMediaItems(workingItems);
      setItemToEdit(null);
      setIsSaving(true);
      setSaveStatusMessage('Item saved locally! Syncing universal archive.json to GitHub...');

      // 5. Detect unconfirmed interconnected links
      const candidates = findInterconnectedCandidates(itemToSave, workingItems, processedCandidateIds);
      if (candidates.length > 0) {
        setPendingLinkCandidates(candidates);
      }

      // 6. Fast background server & GitHub save
      const result = await storageService.saveArchiveServer(workingItems, activeCode);
      if (result.success && result.items) {
        setItems(result.items);
      }
      setSaveStatusMessage(result.message || 'Universal archive.json saved & synced to GitHub!');
      setTimeout(() => setSaveStatusMessage(null), 4000);
    } catch (err: any) {
      console.error('Error saving item:', err);
      setSaveStatusMessage(`Notice: ${err.message || 'Saved locally'}`);
      setTimeout(() => setSaveStatusMessage(null), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompleteLinkVerification = async (confirmedCandidates: DetectedLinkCandidate[]) => {
    if (confirmedCandidates.length > 0) {
      const updatedItems = applyConfirmedLinks(items, confirmedCandidates);
      setItems(updatedItems);
      storageService.saveAllMediaItems(updatedItems);
      try {
        await storageService.saveArchiveServer(updatedItems, adminPasscode);
        setSaveStatusMessage(`Successfully interconnected ${confirmedCandidates.length} media reference(s)!`);
        setTimeout(() => setSaveStatusMessage(null), 4000);
      } catch (err: any) {
        console.error('Failed to persist confirmed links:', err);
      }
    }

    // Mark processed
    const newProcessed = new Set(processedCandidateIds);
    pendingLinkCandidates.forEach((c) => newProcessed.add(c.id));
    setProcessedCandidateIds(newProcessed);

    setPendingLinkCandidates([]);
  };

  const handleRunFullLinkScan = () => {
    let allCandidates: DetectedLinkCandidate[] = [];
    const processed = new Set<string>();

    items.forEach((item) => {
      const cands = findInterconnectedCandidates(item, items, processed);
      cands.forEach((c) => {
        processed.add(c.id);
        allCandidates.push(c);
      });
    });

    if (allCandidates.length > 0) {
      setPendingLinkCandidates(allCandidates);
    } else {
      alert('Database Scan Complete: All influences and similar media are fully interconnected and validated!');
    }
  };

  const handleDeleteMedia = async (id: string) => {
    const updated = items.filter((i) => i.id !== id);
    setItems(updated);
    storageService.saveAllMediaItems(updated);
    if (selectedMedia && selectedMedia.id === id) {
      setSelectedMedia(null);
    }
    setIsSaving(true);
    setSaveStatusMessage('Deleting item and updating server archive.json...');

    try {
      const activeCode = adminPasscode || storageService.getAdminPasscode();
      const result = await storageService.deleteMediaItemServer(id, activeCode);
      if (result.success && result.items) {
        setItems(result.items);
      }
      setSaveStatusMessage('Item deleted from archive.json & GitHub synced!');
      setTimeout(() => setSaveStatusMessage(null), 3000);
    } catch (err: any) {
      setSaveStatusMessage(`Delete notice: ${err.message}`);
      setTimeout(() => setSaveStatusMessage(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReorderItems = async (newOrderedSubList: MediaItem[]) => {
    const subListIds = new Set(newOrderedSubList.map((i) => i.id));
    const reorderedMaster: MediaItem[] = [];

    newOrderedSubList.forEach((item) => reorderedMaster.push(item));
    items.forEach((item) => {
      if (!subListIds.has(item.id)) {
        reorderedMaster.push(item);
      }
    });

    setItems(reorderedMaster);
    setIsSaving(true);
    setSaveStatusMessage('Saving universal item reordering to archive.json...');

    try {
      const activeCode = adminPasscode || storageService.getAdminPasscode();
      const result = await storageService.saveArchiveServer(reorderedMaster, activeCode);
      if (result.success) {
        setItems(result.items);
        setSaveStatusMessage('Universal item order saved to archive.json!');
      } else {
        setSaveStatusMessage('Saved item order locally.');
      }
    } catch (err: any) {
      console.warn('Reorder save warning:', err);
      setSaveStatusMessage('Saved item order locally.');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatusMessage(null), 3000);
    }
  };

  const handleOpenAddModal = () => {
    setItemToEdit(null);
    setIsAdminMediaModalOpen(true);
  };

  const handleOpenEditModal = (item: MediaItem) => {
    setItemToEdit(item);
    setIsAdminMediaModalOpen(true);
  };

  const handleViewChange = (view: typeof activeView) => {
    setActiveView(view);
    updateUrlRoute({ view });
  };

  const handleTagClickFromCardOrModal = useCallback((tag: string) => {
    setSelectedTagForBio(tag);
    updateUrlRoute({ tag });
  }, []);

  const handleCloseTagModal = useCallback(() => {
    setSelectedTagForBio(null);
    updateUrlRoute({ tag: null });
  }, []);

  const handleMediaClick = useCallback((item: MediaItem) => {
    setSelectedMedia(item);
    updateUrlRoute({ item: item.id });
  }, []);

  const handleCloseMediaModal = useCallback(() => {
    setSelectedMedia(null);
    updateUrlRoute({ item: null });
  }, []);

  const handleCreatorClick = useCallback((creatorName: string) => {
    setSelectedCreatorForBio(creatorName);
    updateUrlRoute({ creator: creatorName });
  }, []);

  const handleCloseCreatorModal = useCallback(() => {
    setSelectedCreatorForBio(null);
    updateUrlRoute({ creator: null });
  }, []);

  const handleRenameTagGlobally = async (oldTag: string, newTag: string) => {
    const oldNorm = oldTag.toLowerCase().trim();
    const updatedItems = items.map((item) => {
      let modified = false;
      const philo = (item.philosophicalTags || []).map((t) => {
        if (t.toLowerCase().trim() === oldNorm) {
          modified = true;
          return newTag;
        }
        return t;
      });
      const styles = (item.genreStyleTags || []).map((t) => {
        if (t.toLowerCase().trim() === oldNorm) {
          modified = true;
          return newTag.toLowerCase();
        }
        return t.toLowerCase();
      });
      const genres = (item.genres || []).map((g) => {
        if (g.toLowerCase().trim() === oldNorm) {
          modified = true;
          return newTag;
        }
        return g;
      });

      if (modified) {
        return {
          ...item,
          philosophicalTags: Array.from(new Set(philo)),
          genreStyleTags: Array.from(new Set(styles)),
          genres: Array.from(new Set(genres))
        };
      }
      return item;
    });

    setItems(updatedItems);
    await storageService.saveArchiveServer(updatedItems, adminPasscode);
  };

  const handleDeleteTagGlobally = async (tagToDelete: string) => {
    const q = tagToDelete.toLowerCase().trim();
    const updatedItems = items.map((item) => ({
      ...item,
      philosophicalTags: (item.philosophicalTags || []).filter((t) => t.toLowerCase().trim() !== q),
      genreStyleTags: (item.genreStyleTags || []).filter((t) => t.toLowerCase().trim() !== q),
      genres: (item.genres || []).filter((g) => g.toLowerCase().trim() !== q)
    }));

    setItems(updatedItems);
    await storageService.saveArchiveServer(updatedItems, adminPasscode);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-purple-600 selection:text-white flex flex-col w-full max-w-full overflow-x-hidden">
      {/* Admin Mode Floating Indicator Banner */}
      {isAdmin && (
        <div className="bg-purple-600 text-white py-1.5 px-3 sm:px-4 text-xs font-mono font-bold shadow-md z-50 w-full">
          <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-1.5 sm:gap-3 max-w-7xl mx-auto w-full">
            <span className="flex items-center gap-1.5 text-[11px] sm:text-xs shrink-0">
              <ShieldCheck size={14} className="text-purple-200" />
              <span>ADMIN MODE<span className="hidden sm:inline"> • API Ready</span></span>
            </span>

            <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap sm:flex-nowrap shrink-0">
              <button
                onClick={handleOpenAddModal}
                className="bg-slate-950 hover:bg-slate-900 text-purple-300 px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold flex items-center gap-1 transition cursor-pointer whitespace-nowrap"
              >
                <Plus size={11} /> <span>Add<span className="hidden sm:inline"> Item</span></span>
              </button>
              <button
                onClick={() => setIsAdminToolsOpen(true)}
                className="bg-slate-950 hover:bg-slate-900 text-slate-200 px-2 py-0.5 rounded text-[10px] sm:text-[11px] flex items-center gap-1 transition cursor-pointer whitespace-nowrap"
              >
                <Database size={11} /> <span>DB<span className="hidden sm:inline"> Tools</span></span>
              </button>
              <button
                onClick={() => setIsAdmin(false)}
                className="hover:underline text-purple-100 hover:text-white text-[10px] sm:text-[11px] font-medium flex items-center gap-1 cursor-pointer ml-1 whitespace-nowrap"
              >
                <Lock size={11} /> <span>Exit<span className="hidden sm:inline"> Admin</span></span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Status Banner Notification */}
      {saveStatusMessage && (
        <div className="bg-slate-900 border-b border-purple-500/50 text-purple-300 px-4 py-2 text-center text-xs font-mono animate-fade-in flex items-center justify-center gap-2">
          {isSaving && <div className="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />}
          <span>{saveStatusMessage}</span>
        </div>
      )}

      {/* Main Navbar */}
      <Navbar
        items={items}
        isAdmin={isAdmin}
        activeView={activeView}
        onViewChange={handleViewChange}
        onOpenPasscodeModal={() => setIsPasscodeModalOpen(true)}
        onOpenAddModal={handleOpenAddModal}
        onOpenAdminTools={() => setIsAdminToolsOpen(true)}
        onLockAdmin={() => setIsAdmin(false)}
        onRandomizeClick={() => {
          handleViewChange('archive');
          setFilters((prev) => ({ ...prev, sortBy: 'random' }));
        }}
        searchQuery={filters.searchQuery}
        onSearchChange={(q) => {
          if (activeView !== 'archive') handleViewChange('archive');
          setFilters((prev) => ({ ...prev, searchQuery: q }));
        }}
      />

      {/* Page Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-5 lg:px-6 py-5">
        {activeView === 'archive' && (
          <>
            {/* Hero Section: Randomized Featured Cards (Hidden when searching to bring results to top) */}
            {filters.searchQuery.trim() === '' && (
              <HeroRandomFeatured
                items={items}
                onItemClick={handleMediaClick}
                onTagClick={handleTagClickFromCardOrModal}
                isAdmin={isAdmin}
              />
            )}

            {/* Advanced Filter Panel */}
            <AdvancedFilterPanel
              filters={filters}
              onChange={setFilters}
              allItems={items}
              matchingCount={filteredItems.length}
            />

            {/* Active Search Indicator Banner */}
            {filters.searchQuery.trim() !== '' && (
              <div className="mb-4 p-3 rounded-xl bg-purple-950/20 border border-purple-500/40 flex items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-2 text-slate-200">
                  <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                  <span>
                    Searching for <strong className="text-purple-300">"{filters.searchQuery}"</strong>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-950 border border-purple-500/30 text-purple-400 font-bold">
                    {filteredItems.length} {filteredItems.length === 1 ? 'match' : 'matches'}
                  </span>
                </div>
                <button
                  onClick={() => setFilters((prev) => ({ ...prev, searchQuery: '' }))}
                  className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-purple-300 border border-slate-700 text-[11px] font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  Clear Search ✕
                </button>
              </div>
            )}

            {/* Media Header & Layout Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black font-mono tracking-wider text-slate-100 flex items-center gap-1.5 uppercase">
                  <Layers size={16} className="text-purple-400" />
                  ENTRIES
                </h2>
                <span className="text-[11px] text-slate-400 font-mono">
                  ({filteredItems.length} of {items.length})
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* View Layout Toggle */}
                <div className="flex items-center gap-0.5 bg-slate-900 border border-slate-800 p-0.5 rounded-lg text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setViewLayout('table')}
                    className={`px-2.5 py-1 rounded flex items-center gap-1 font-bold transition cursor-pointer ${
                      viewLayout === 'table'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <Table size={13} />
                    <span>Table / Spreadsheet</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewLayout('grid')}
                    className={`px-2.5 py-1 rounded flex items-center gap-1 font-bold transition cursor-pointer ${
                      viewLayout === 'grid'
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <LayoutGrid size={13} />
                    <span>Cards</span>
                  </button>
                </div>

                {isAdmin && (
                  <button
                    onClick={handleOpenAddModal}
                    className="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white font-mono font-bold text-xs flex items-center gap-1 transition shadow cursor-pointer"
                  >
                    <Plus size={13} /> Add Media
                  </button>
                )}
              </div>
            </div>

            {/* Media Index View */}
            {filteredItems.length > 0 ? (
              <div className="space-y-6">
                {viewLayout === 'table' ? (
                  <TableView
                    items={filteredItems}
                    onItemClick={handleMediaClick}
                    onTagClick={handleTagClickFromCardOrModal}
                    onCreatorClick={handleCreatorClick}
                    isAdmin={isAdmin}
                    onReorderItems={handleReorderItems}
                    scoringPhilosophy={scoringPhilosophy}
                    aiRankMap={aiRankMap}
                  />
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
                    {filteredItems.slice(0, visibleCount).map((item) => (
                      <MediaCard
                        key={item.id}
                        item={item}
                        onClick={handleMediaClick}
                        onTagClick={handleTagClickFromCardOrModal}
                        onCreatorClick={handleCreatorClick}
                        isAdmin={isAdmin}
                      />
                    ))}
                  </div>
                )}

                {viewLayout === 'grid' && filteredItems.length > visibleCount && (
                  <div className="flex flex-col items-center justify-center pt-2 pb-6">
                    <button
                      onClick={() => setVisibleCount((prev) => prev + 48)}
                      className="px-6 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-purple-300 font-mono text-xs font-bold border border-slate-800 hover:border-slate-700 transition flex items-center gap-2 group cursor-pointer"
                    >
                      <span>Load More</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-purple-300 font-normal">
                        {visibleCount} of {filteredItems.length}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 bg-[#0e1117] rounded-xl border border-slate-800/90 p-6">
                <Database className="mx-auto text-purple-500/50 mb-2" size={32} />
                <h3 className="text-sm font-mono font-bold text-slate-200 uppercase">
                  {items.length === 0 ? 'Archive Is Empty' : 'No Items Match Active Filters'}
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-3 font-mono">
                  {items.length === 0
                    ? 'Use secret admin controls to log new entries.'
                    : 'Adjust tag filters, formats, or search queries.'}
                </p>
                {items.length > 0 && (
                  <button
                    onClick={() =>
                      setFilters({
                        searchQuery: '',
                        formats: [],
                        selectedGenres: [],
                        selectedPhilosophicalTags: [],
                        selectedStyleTags: [],
                        selectedConsumedVersions: [],
                        selectedDecades: [],
                        minScore: 0,
                        maxScore: 10,
                        releaseYearStart: null,
                        releaseYearEnd: null,
                        tagLogic: 'OR',
                        sortBy: 'random'
                      })
                    }
                    className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-purple-300 font-mono text-xs transition cursor-pointer"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {/* Hornet's Page View */}
        {activeView === 'hornets' && (
          <HornetsPage
            items={items}
            onItemClick={(item) => {
              handleViewChange('archive');
              handleMediaClick(item);
            }}
            onTagClick={handleTagClickFromCardOrModal}
            onCreatorClick={handleCreatorClick}
            isAdmin={isAdmin}
          />
        )}

        {/* Rating Scale Page View */}
        {activeView === 'rating_scale' && (
          <RatingScalePage
            scoringPhilosophy={scoringPhilosophy}
            isAdmin={isAdmin}
            onUpdateScoringPhilosophy={handleUpdateScoringPhilosophy}
          />
        )}

        {/* Similar Search Page View */}
        {activeView === 'similar' && (
          <SimilarItemsPage
            items={items}
            onItemClick={handleMediaClick}
            onTagClick={handleTagClickFromCardOrModal}
            onCreatorClick={handleCreatorClick}
          />
        )}

        {/* About Ancient Hornet Page View */}
        {activeView === 'about' && (
          <AboutHornetPage onBackToArchive={() => handleViewChange('archive')} />
        )}

        {/* Creators Page View */}
        {activeView === 'creators' && (
          <CreatorsPage
            archiveItems={items}
            onSelectCreator={handleCreatorClick}
            onSelectMedia={handleMediaClick}
            onSelectTag={handleTagClickFromCardOrModal}
          />
        )}

        {/* Donate Page View */}
        {activeView === 'donate' && (
          <DonatePage onBackToArchive={() => handleViewChange('archive')} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-slate-800/80 py-8 px-4 sm:px-6 lg:px-8 mt-12 text-slate-400 text-xs font-mono">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* About Ancient Hornet Card at Bottom */}
          <div className="bg-[#0e1117] border border-slate-800 p-4 sm:p-5 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 font-sans">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2 text-purple-400 font-mono text-xs font-bold uppercase">
                <User size={13} />
                <span>About Ancient Hornet</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Hello, I'm Hornet (born 2005). I earn my living translating books across 3 languages and reselling secondhand items. I've been obsessive about media and reading books since I was 8 years old. All writing, cataloging, and analytical takes on media are 100% handwritten by me.
              </p>
              <div className="pt-1 flex items-center gap-2 text-xs font-mono text-slate-400">
                <span className="text-slate-500">Contact:</span>
                <a href="mailto:fourward996@gmail.com" className="text-purple-300 font-bold hover:underline">
                  fourward996@gmail.com
                </a>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                onClick={() => {
                  handleViewChange('donate');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-3 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-mono text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Heart size={13} className="fill-rose-300/20" />
                <span>Donate</span>
              </button>
              <button
                onClick={() => {
                  handleViewChange('about');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span>Read Full Profile</span>
                <span>→</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left border-t border-slate-800/60 pt-4">
            <div className="space-y-1">
              <p className="font-bold text-slate-200">MEDIUM ARCHIVE</p>
              <p className="text-[11px] text-slate-400 max-w-md font-sans">
                A personal repository logging experienced films, games, books, music, and television. Evaluated strictly on subjective artistic resonance rather than commercial acclaim.
              </p>
            </div>

            <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono">
              <button
                onClick={() => {
                  handleViewChange('rating_scale');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="hover:text-purple-300 transition cursor-pointer"
              >
                Rating Scale
              </button>
              <span>•</span>
              <button
                onClick={() => {
                  handleViewChange('about');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="hover:text-purple-300 transition cursor-pointer"
              >
                About Ancient Hornet
              </button>
              <span>•</span>
              <button
                onClick={() => {
                  handleViewChange('donate');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-rose-400 font-bold hover:underline transition cursor-pointer flex items-center gap-1"
              >
                <Heart size={11} className="fill-rose-400/20" />
                <span>Donate</span>
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Modals & Overlay Components */}
      <MediaDetailModal
        item={selectedMedia}
        isAdmin={isAdmin}
        onClose={handleCloseMediaModal}
        onEdit={(item) => {
          handleCloseMediaModal();
          handleOpenEditModal(item);
        }}
        onDelete={(id) => {
          handleDeleteMedia(id);
          handleCloseMediaModal();
        }}
        onTagClick={handleTagClickFromCardOrModal}
        onCreatorClick={handleCreatorClick}
        allItems={items}
        onSimilarClick={(matchedItem) => handleMediaClick(matchedItem)}
        scoringPhilosophy={scoringPhilosophy}
        onUpdateScoringPhilosophy={handleUpdateScoringPhilosophy}
      />

      <CreatorBioModal
        creatorName={selectedCreatorForBio}
        allItems={items}
        onClose={handleCloseCreatorModal}
        onItemClick={(item) => {
          handleCloseCreatorModal();
          handleViewChange('archive');
          handleMediaClick(item);
        }}
        onTagClick={handleTagClickFromCardOrModal}
      />

      <GlobalTagModal
        tagName={selectedTagForBio}
        allItems={items}
        isAdmin={isAdmin}
        onClose={handleCloseTagModal}
        onItemClick={(item) => {
          handleCloseTagModal();
          handleViewChange('archive');
          handleMediaClick(item);
        }}
        onRenameTag={handleRenameTagGlobally}
        onDeleteTag={handleDeleteTagGlobally}
      />

      {isPasscodeModalOpen && (
        <PasscodeModal
          isOpen={isPasscodeModalOpen}
          onClose={() => setIsPasscodeModalOpen(false)}
          onSuccess={(passcode) => {
            setIsAdmin(true);
            setAdminPasscode(passcode);
          }}
        />
      )}

      {isAdminMediaModalOpen && (
        <AdminMediaModal
          isOpen={isAdminMediaModalOpen}
          itemToEdit={itemToEdit}
          allItems={items}
          onClose={() => {
            setIsAdminMediaModalOpen(false);
            setItemToEdit(null);
          }}
          onSave={handleSaveMedia}
          existingPhilosophicalTags={allPhilosophicalTags}
          existingStyleTags={allStyleTags}
        />
      )}

      {isAdminToolsOpen && (
        <AdminToolsDrawer
          isOpen={isAdminToolsOpen}
          onClose={() => setIsAdminToolsOpen(false)}
          onDatabaseUpdate={(updatedItems) => {
            setItems(updatedItems);
          }}
          onLockAdmin={() => setIsAdmin(false)}
          onRunLinkScan={handleRunFullLinkScan}
          adminPasscode={adminPasscode}
          currentItems={items}
        />
      )}

      {pendingLinkCandidates.length > 0 && (
        <LinkConfirmationModal
          candidates={pendingLinkCandidates}
          onComplete={handleCompleteLinkVerification}
          onClose={() => setPendingLinkCandidates([])}
        />
      )}
    </div>
  );
}
