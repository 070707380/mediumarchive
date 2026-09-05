import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Plus,
  Lock,
  Gamepad2,
  Palette,
  Film,
  Tv,
  Disc,
  BookOpen,
  Scroll,
  Dice5,
  Link2,
  Unlink2,
  Check,
  X,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Trash2,
  ExternalLink,
  Star,
  Sparkles,
  Info,
  LucideIcon
} from 'lucide-react';
import { BingoItem, BingoSection, BINGO_SECTIONS, MediaItem, mapMediaFormatToBingoSection } from '../types';
import { storageService } from '../services/storage';

interface BingoViewProps {
  archiveItems: MediaItem[];
  isAdmin: boolean;
  adminPasscode: string;
  onOpenArchiveItem?: (item: MediaItem) => void;
  onOpenPasscodeModal?: () => void;
}

const PAGE_SIZE = 500;

// Section icon map
const SECTION_ICONS: Record<BingoSection, LucideIcon> = {
  'video game': Gamepad2,
  'painting': Palette,
  'movie': Film,
  'tv show': Tv,
  'music album': Disc,
  'book': BookOpen,
  'comic series': Scroll,
  'board game': Dice5,
};

export const BingoView: React.FC<BingoViewProps> = ({
  archiveItems,
  isAdmin,
  adminPasscode,
  onOpenArchiveItem,
  onOpenPasscodeModal,
}) => {
  // Bingo items state
  const [bingoItems, setBingoItems] = useState<BingoItem[]>(() => storageService.getBingoItems());
  const [activeSection, setActiveSection] = useState<BingoSection>('video game');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickAddInput, setQuickAddInput] = useState('');
  const [navbarHeight, setNavbarHeight] = useState(57);
  const [currentPage, setCurrentPage] = useState(1);
  const [jumpPageInput, setJumpPageInput] = useState('1');

  // Admin Enter Item modal state
  const [isEnterModalOpen, setIsEnterModalOpen] = useState(false);
  const [rawInputText, setRawInputText] = useState('');
  const [enterMediaType, setEnterMediaType] = useState<BingoSection>('video game');
  const [enterBio, setEnterBio] = useState('');
  const [enterImageUrl, setEnterImageUrl] = useState('');

  // Queue of duplicate prompts: items awaiting confirmation
  interface DuplicatePrompt {
    title: string;
    mediaType: BingoSection;
    bio?: string;
    imageUrl?: string;
  }
  const [pendingDuplicates, setPendingDuplicates] = useState<DuplicatePrompt[]>([]);
  const [currentDuplicatePrompt, setCurrentDuplicatePrompt] = useState<DuplicatePrompt | null>(null);

  // Queue of linking prompts: items awaiting linking confirmation
  interface LinkPrompt {
    bingoItem: BingoItem;
    archiveItem: MediaItem;
  }
  const [pendingLinks, setPendingLinks] = useState<LinkPrompt[]>([]);
  const [currentLinkPrompt, setCurrentLinkPrompt] = useState<LinkPrompt | null>(null);

  // Card Bio Modal (for visitors and admin viewing)
  const [selectedBioCard, setSelectedBioCard] = useState<BingoItem | null>(null);

  // Admin Card Edit Modal
  const [adminEditingCard, setAdminEditingCard] = useState<BingoItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editMediaType, setEditMediaType] = useState<BingoSection>('video game');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editLinkedItemId, setEditLinkedItemId] = useState<string | undefined>(undefined);
  const [archiveSearchForLink, setArchiveSearchForLink] = useState('');

  // Sync state notification
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Refresh bingo items on mount
  useEffect(() => {
    const loaded = storageService.getBingoItems();
    setBingoItems(loaded);
  }, []);

  // Dynamically track navbar height so sticky bar sticks accurately on all viewports
  useEffect(() => {
    const updateNavHeight = () => {
      const nav = document.querySelector('header');
      if (nav) {
        setNavbarHeight(nav.offsetHeight);
      }
    };
    updateNavHeight();
    window.addEventListener('resize', updateNavHeight);
    let ro: ResizeObserver | null = null;
    const nav = document.querySelector('header');
    if (nav && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(updateNavHeight);
      ro.observe(nav);
    }
    return () => {
      window.removeEventListener('resize', updateNavHeight);
      ro?.disconnect();
    };
  }, []);

  // When activeSection changes, keep enterMediaType synced
  useEffect(() => {
    setEnterMediaType(activeSection);
    setCurrentPage(1);
    setJumpPageInput('1');
  }, [activeSection]);

  // Save helper
  const persistBingoItems = async (updatedList: BingoItem[], message = 'Bingo items updated') => {
    setBingoItems(updatedList);
    storageService.saveAllBingoItems(updatedList);
    if (isAdmin) {
      try {
        const code = adminPasscode || storageService.getAdminPasscode();
        await storageService.saveBingoItemsServer(updatedList, code);
        setStatusMessage(message);
        setTimeout(() => setStatusMessage(null), 2500);
      } catch (err: any) {
        console.warn('Bingo save notice:', err);
      }
    }
  };

  // Archive items lookup map by ID
  const archiveItemMap = useMemo(() => {
    const map = new Map<string, MediaItem>();
    archiveItems.forEach((it) => map.set(it.id, it));
    return map;
  }, [archiveItems]);

  // Section item counts
  const sectionCounts = useMemo(() => {
    const counts: Record<BingoSection, number> = {
      'video game': 0,
      'painting': 0,
      'movie': 0,
      'tv show': 0,
      'music album': 0,
      'book': 0,
      'comic series': 0,
      'board game': 0,
    };
    bingoItems.forEach((b) => {
      if (counts[b.mediaType] !== undefined) {
        counts[b.mediaType]++;
      }
    });
    return counts;
  }, [bingoItems]);

  // Filter and sort items alphabetically only
  const filteredAndSortedItems = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const sectionItems = bingoItems.filter((b) => b.mediaType === activeSection);

    const filtered = query
      ? sectionItems.filter((b) => b.title.toLowerCase().includes(query))
      : sectionItems;

    // Must be sorted alphabetically only
    return filtered.sort((a, b) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
    );
  }, [bingoItems, activeSection, searchQuery]);

  // Pagination calculation (500 items per page)
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedItems.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedItems = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredAndSortedItems.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredAndSortedItems, safeCurrentPage]);

  const handlePageChange = (page: number) => {
    const p = Math.max(1, Math.min(totalPages, page));
    setCurrentPage(p);
    setJumpPageInput(String(p));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Find candidate in archive for linking
  const findArchiveMatch = (title: string, mediaType: BingoSection): MediaItem | undefined => {
    const norm = title.trim().toLowerCase();
    return archiveItems.find((a) => {
      const aTitle = (a.title || '').trim().toLowerCase();
      if (aTitle !== norm) return false;
      const aSection = mapMediaFormatToBingoSection(a.mediaFormat);
      return !aSection || aSection === mediaType;
    });
  };

  // Helper to process creating a confirmed item
  const commitNewItem = (
    itemData: { title: string; mediaType: BingoSection; bio?: string; imageUrl?: string },
    currentList: BingoItem[]
  ): { updatedList: BingoItem[]; createdItem: BingoItem } => {
    const newItem: BingoItem = {
      id: `bingo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: itemData.title.trim(),
      mediaType: itemData.mediaType,
      bio: itemData.bio?.trim() || undefined,
      imageUrl: itemData.imageUrl?.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const nextList = [...currentList, newItem];
    return { updatedList: nextList, createdItem: newItem };
  };

  // Reusable bulk item creation processor (supports commas, newlines, semicolons)
  const processBulkAddition = (
    rawText: string,
    mediaType: BingoSection,
    bio?: string,
    imageUrl?: string
  ) => {
    // Commas must be used to create multiple entries at once
    const parsedTitles = rawText
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (parsedTitles.length === 0) return;

    // Track duplicates to ask
    const dupsToPrompt: DuplicatePrompt[] = [];
    let workingList = [...bingoItems];
    const itemsCreated: BingoItem[] = [];

    parsedTitles.forEach((t) => {
      const norm = t.toLowerCase();
      const existing = workingList.some(
        (b) => b.title.toLowerCase() === norm && b.mediaType === mediaType
      );

      if (existing) {
        dupsToPrompt.push({
          title: t,
          mediaType: mediaType,
          bio,
          imageUrl,
        });
      } else {
        const { updatedList, createdItem } = commitNewItem(
          {
            title: t,
            mediaType: mediaType,
            bio,
            imageUrl,
          },
          workingList
        );
        workingList = updatedList;
        itemsCreated.push(createdItem);
      }
    });

    // Reset modal input fields if open
    setRawInputText('');
    setEnterBio('');
    setEnterImageUrl('');

    // Persist non-duplicate creations immediately
    if (itemsCreated.length > 0) {
      persistBingoItems(
        workingList,
        `Added ${itemsCreated.length} item${itemsCreated.length > 1 ? 's' : ''} to ${mediaType}!`
      );
    }

    // Check for linking prompts on newly created items
    const linkPromptsToQueue: LinkPrompt[] = [];
    itemsCreated.forEach((created) => {
      const match = findArchiveMatch(created.title, created.mediaType);
      if (match) {
        linkPromptsToQueue.push({ bingoItem: created, archiveItem: match });
      }
    });

    if (dupsToPrompt.length > 0) {
      setPendingDuplicates(dupsToPrompt.slice(1));
      setCurrentDuplicatePrompt(dupsToPrompt[0]);
    }

    if (linkPromptsToQueue.length > 0) {
      if (dupsToPrompt.length === 0) {
        setCurrentLinkPrompt(linkPromptsToQueue[0]);
        setPendingLinks(linkPromptsToQueue.slice(1));
      } else {
        setPendingLinks((prev) => [...prev, ...linkPromptsToQueue]);
      }
    }
  };

  // Quick Add submit (from sticky toolbar)
  const handleQuickAddSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickAddInput.trim()) return;

    if (!isAdmin) {
      if (onOpenPasscodeModal) {
        onOpenPasscodeModal();
      }
      return;
    }

    const text = quickAddInput;
    setQuickAddInput('');
    processBulkAddition(text, activeSection);
  };

  // Handle Enter Item Form Submission (from Detailed Modal)
  const handleEnterItemsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawInputText.trim()) return;
    setIsEnterModalOpen(false);
    processBulkAddition(rawInputText, enterMediaType, enterBio, enterImageUrl);
  };

  // Handle duplicate confirmation actions
  const handleConfirmDuplicate = (duplicate: DuplicatePrompt) => {
    let workingList = [...bingoItems];
    const { updatedList, createdItem } = commitNewItem(duplicate, workingList);
    persistBingoItems(updatedList, `Created duplicate item "${duplicate.title}"`);

    // Check linking for this duplicate
    const match = findArchiveMatch(createdItem.title, createdItem.mediaType);
    if (match) {
      setPendingLinks((prev) => [...prev, { bingoItem: createdItem, archiveItem: match }]);
    }

    advanceDuplicateQueue();
  };

  const handleSkipDuplicate = () => {
    advanceDuplicateQueue();
  };

  const advanceDuplicateQueue = () => {
    if (pendingDuplicates.length > 0) {
      setCurrentDuplicatePrompt(pendingDuplicates[0]);
      setPendingDuplicates((prev) => prev.slice(1));
    } else {
      setCurrentDuplicatePrompt(null);
      // Once duplicates queue is done, show link prompts if any
      if (pendingLinks.length > 0 && !currentLinkPrompt) {
        setCurrentLinkPrompt(pendingLinks[0]);
        setPendingLinks((prev) => prev.slice(1));
      }
    }
  };

  // Handle linking confirmation actions
  const handleConfirmLink = (prompt: LinkPrompt) => {
    const updated = bingoItems.map((b) => {
      if (b.id === prompt.bingoItem.id) {
        return {
          ...b,
          linkedItemId: prompt.archiveItem.id,
          imageUrl: b.imageUrl || prompt.archiveItem.cover,
          updatedAt: new Date().toISOString(),
        };
      }
      return b;
    });

    persistBingoItems(updated, `Linked "${prompt.bingoItem.title}" to archive`);
    advanceLinkQueue();
  };

  const handleSkipLink = () => {
    advanceLinkQueue();
  };

  const advanceLinkQueue = () => {
    if (pendingLinks.length > 0) {
      setCurrentLinkPrompt(pendingLinks[0]);
      setPendingLinks((prev) => prev.slice(1));
    } else {
      setCurrentLinkPrompt(null);
    }
  };

  // Click on a card
  const handleCardClick = (item: BingoItem) => {
    const linked = item.linkedItemId ? archiveItemMap.get(item.linkedItemId) : undefined;
    const hasBio = Boolean(item.bio || linked?.hornetVerdict || linked?.summaryPlot);

    if (isAdmin) {
      // In admin mode, open admin card manager
      setAdminEditingCard(item);
      setEditTitle(item.title);
      setEditMediaType(item.mediaType);
      setEditImageUrl(item.imageUrl || '');
      setEditBio(item.bio || '');
      setEditLinkedItemId(item.linkedItemId);
      setArchiveSearchForLink('');
    } else if (hasBio) {
      // For non-admin, open bio modal if bio exists
      setSelectedBioCard(item);
    }
    // If not admin and no bio, card is unclickable
  };

  // Admin save edited card
  const handleAdminSaveCard = () => {
    if (!adminEditingCard) return;
    const updated = bingoItems.map((b) => {
      if (b.id === adminEditingCard.id) {
        return {
          ...b,
          title: editTitle.trim() || b.title,
          mediaType: editMediaType,
          imageUrl: editImageUrl.trim() || undefined,
          bio: editBio.trim() || undefined,
          linkedItemId: editLinkedItemId,
          updatedAt: new Date().toISOString(),
        };
      }
      return b;
    });
    persistBingoItems(updated, `Saved "${editTitle.trim()}"`);
    setAdminEditingCard(null);
  };

  // Admin delete card
  const handleAdminDeleteCard = (id: string) => {
    if (!window.confirm('Are you sure you want to delete this Bingo card?')) return;
    const updated = bingoItems.filter((b) => b.id !== id);
    persistBingoItems(updated, 'Card deleted');
    setAdminEditingCard(null);
  };

  return (
    <div className="space-y-4">
      {/* Status banner */}
      {statusMessage && (
        <div className="bg-purple-950/60 border border-purple-500/40 text-purple-200 px-3 py-1.5 rounded-lg text-xs font-mono text-center animate-fade-in flex items-center justify-center gap-2">
          <Check size={13} className="text-emerald-400" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Sticky Header: Sticks on the screen even when scrolled around */}
      <div
        style={{ top: `${navbarHeight}px` }}
        className="sticky z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800/90 py-2.5 -mx-3 sm:-mx-5 lg:-mx-6 px-3 sm:px-5 lg:px-6 shadow-xl space-y-2.5"
      >
        {/* Row 1: Section Switcher Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {BINGO_SECTIONS.map((sec) => {
            const Icon = SECTION_ICONS[sec.id];
            const count = sectionCounts[sec.id] || 0;
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => {
                  setActiveSection(sec.id);
                  setCurrentPage(1);
                  setJumpPageInput('1');
                }}
                className={`px-3 py-1.5 rounded-lg font-mono text-xs flex items-center gap-2 whitespace-nowrap transition cursor-pointer font-bold shrink-0 ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                <Icon size={13} />
                <span>{sec.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    isActive ? 'bg-purple-800 text-purple-100' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Row 2: Search Tab & Quick Add Tab (Sticks on screen even when scrolled) */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
          {/* Search Tab */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={13} />
            <input
              type="text"
              placeholder={`Search ${activeSection} cards...`}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-900/90 border border-slate-800 focus:border-purple-500 rounded-lg pl-8 pr-7 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none transition shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                title="Clear search"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Quick Add Tab (just as a search tab, commas create multiple entries) */}
          <div className="relative flex-1 min-w-[220px]">
            {isAdmin ? (
              <form onSubmit={handleQuickAddSubmit} className="relative w-full">
                <Plus className="absolute left-2.5 top-1/2 -translate-y-1/2 text-purple-400" size={13} />
                <input
                  type="text"
                  placeholder={`Quick add to ${activeSection} (e.g. item 1, item 2, item 3)...`}
                  value={quickAddInput}
                  onChange={(e) => setQuickAddInput(e.target.value)}
                  className="w-full bg-slate-900/90 border border-purple-500/50 focus:border-purple-400 rounded-lg pl-8 pr-20 py-1.5 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none transition shadow-inner"
                />
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {quickAddInput && (
                    <button
                      type="button"
                      onClick={() => setQuickAddInput('')}
                      className="p-1 text-slate-500 hover:text-slate-300 cursor-pointer"
                      title="Clear input"
                    >
                      <X size={12} />
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={!quickAddInput.trim()}
                    className="px-2 py-0.5 rounded bg-purple-600 hover:bg-purple-500 disabled:opacity-30 disabled:hover:bg-purple-600 text-white font-mono text-[10px] font-bold transition flex items-center gap-1 cursor-pointer shadow-sm"
                    title="Add items (commas create multiple entries)"
                  >
                    <span>Add</span>
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => onOpenPasscodeModal && onOpenPasscodeModal()}
                className="w-full bg-slate-900/80 border border-slate-800 hover:border-purple-500/50 rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono text-slate-400 text-left flex items-center justify-between transition cursor-pointer"
                title="Click to unlock Admin Mode to quick-add cards"
              >
                <div className="flex items-center gap-2">
                  <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={13} />
                  <span className="truncate">Quick add (Admin passcode required)...</span>
                </div>
                <span className="text-[10px] text-purple-400 font-bold shrink-0 underline">Unlock</span>
              </button>
            )}
          </div>

          {/* Action buttons & item count */}
          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
            <span className="text-[11px] font-mono text-slate-400 whitespace-nowrap">
              {filteredAndSortedItems.length} cards (A–Z)
            </span>

            {isAdmin && (
              <button
                onClick={() => {
                  setEnterMediaType(activeSection);
                  setIsEnterModalOpen(true);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-purple-500/40 text-purple-300 font-mono text-xs font-bold flex items-center gap-1 transition cursor-pointer shrink-0"
                title="Open detailed multi-entry modal with bio & custom images"
              >
                <Plus size={12} />
                <span className="hidden lg:inline">Detailed</span> Enter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Pagination Bar (Top) */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between py-1 px-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-400">
          <div>
            Showing {(safeCurrentPage - 1) * PAGE_SIZE + 1}–
            {Math.min(safeCurrentPage * PAGE_SIZE, filteredAndSortedItems.length)} of{' '}
            {filteredAndSortedItems.length}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(1)}
              disabled={safeCurrentPage === 1}
              className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
              title="First Page"
            >
              <ChevronsLeft size={14} />
            </button>
            <button
              onClick={() => handlePageChange(safeCurrentPage - 1)}
              disabled={safeCurrentPage === 1}
              className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
              title="Previous Page"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-2">
              Page {safeCurrentPage} of {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(safeCurrentPage + 1)}
              disabled={safeCurrentPage === totalPages}
              className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
              title="Next Page"
            >
              <ChevronRight size={14} />
            </button>
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={safeCurrentPage === totalPages}
              className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent"
              title="Last Page"
            >
              <ChevronsRight size={14} />
            </button>

            <span className="mx-1 text-slate-600">|</span>
            <span className="text-[11px]">Go:</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={jumpPageInput}
              onChange={(e) => setJumpPageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const p = parseInt(jumpPageInput, 10);
                  if (!isNaN(p)) handlePageChange(p);
                }
              }}
              className="w-12 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-center text-xs text-slate-200"
            />
          </div>
        </div>
      )}

      {/* Bingo Cards Grid (PC screen aspect ratio 16:9 pictures with small name under) */}
      {paginatedItems.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {paginatedItems.map((item) => {
            const linked = item.linkedItemId ? archiveItemMap.get(item.linkedItemId) : undefined;
            const displayImage = item.imageUrl || linked?.cover;
            const hasBio = Boolean(item.bio || linked?.hornetVerdict || linked?.summaryPlot);
            const isClickable = isAdmin || hasBio;
            const Icon = SECTION_ICONS[item.mediaType] || Gamepad2;

            return (
              <div
                key={item.id}
                onClick={() => isClickable && handleCardClick(item)}
                className={`flex flex-col select-none ${
                  isClickable
                    ? 'cursor-pointer group'
                    : 'cursor-default opacity-85'
                }`}
                title={
                  isAdmin
                    ? `${item.title} (Admin: Click to edit or link)`
                    : hasBio
                    ? `${item.title} (Click to view bio)`
                    : item.title
                }
              >
                {/* 16:9 PC Screen Aspect Ratio Box */}
                <div
                  className={`relative w-full aspect-video rounded-lg overflow-hidden bg-slate-900 border transition-all ${
                    isClickable
                      ? 'border-slate-800 group-hover:border-purple-500/80 group-hover:shadow-md'
                      : 'border-slate-800/80'
                  }`}
                >
                  {displayImage ? (
                    <img
                      src={displayImage}
                      alt={item.title}
                      loading="lazy"
                      className="w-full h-full object-cover rounded-lg"
                      onError={(e) => {
                        // fallback to icon if image fails
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-600 gap-1">
                      <Icon size={20} className="text-slate-700" />
                    </div>
                  )}

                  {/* Hornet Score badge if linked */}
                  {linked && typeof linked.hornetScore === 'number' && (
                    <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded bg-slate-950/90 border border-amber-500/50 text-amber-300 font-mono font-bold text-[10px] flex items-center gap-0.5 shadow">
                      <Star size={9} className="fill-amber-400 text-amber-400" />
                      <span>{linked.hornetScore}</span>
                    </div>
                  )}

                  {/* Linked indicator chip in bottom corner */}
                  {linked && (
                    <div className="absolute bottom-1 left-1 p-0.5 rounded bg-purple-950/85 border border-purple-500/40 text-purple-300">
                      <Link2 size={9} />
                    </div>
                  )}

                  {/* Bio indicator for non-admin clickability clue */}
                  {!isAdmin && hasBio && (
                    <div className="absolute bottom-1 right-1 p-0.5 rounded bg-slate-950/80 border border-slate-700 text-slate-300">
                      <Info size={9} />
                    </div>
                  )}
                </div>

                {/* Small Name Written Under */}
                <div
                  className={`mt-1 text-xs font-mono text-center truncate px-0.5 transition ${
                    isClickable
                      ? 'text-slate-300 group-hover:text-purple-300'
                      : 'text-slate-400'
                  }`}
                >
                  {item.title}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-16 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/50">
          <p className="text-xs font-mono text-slate-400">
            {searchQuery
              ? `No ${activeSection} cards match "${searchQuery}"`
              : `No items in ${activeSection} section yet.`}
          </p>
          {isAdmin && !searchQuery && (
            <button
              onClick={() => {
                setEnterMediaType(activeSection);
                setIsEnterModalOpen(true);
              }}
              className="mt-3 px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold transition cursor-pointer inline-flex items-center gap-1"
            >
              <Plus size={12} /> Add First Item
            </button>
          )}
        </div>
      )}

      {/* Pagination Bar (Bottom) */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-400">
          <div>
            Page {safeCurrentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handlePageChange(safeCurrentPage - 1)}
              disabled={safeCurrentPage === 1}
              className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-30"
            >
              Prev
            </button>
            <button
              onClick={() => handlePageChange(safeCurrentPage + 1)}
              disabled={safeCurrentPage === totalPages}
              className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* ================= MODALS ================= */}

      {/* 1. Enter Item Modal (Admin Only, quick bulk entry) */}
      {isEnterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl text-slate-100 font-mono space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                <Plus size={14} /> Enter Item(s)
              </h3>
              <button
                onClick={() => setIsEnterModalOpen(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEnterItemsSubmit} className="space-y-3 text-xs">
              {/* Media Type (automatically ticked to displayed section) */}
              <div>
                <label className="block font-bold text-slate-400 uppercase text-[10px] mb-1">
                  Media Type Section
                </label>
                <select
                  value={enterMediaType}
                  onChange={(e) => setEnterMediaType(e.target.value as BingoSection)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                >
                  {BINGO_SECTIONS.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fast Bulk Item Input */}
              <div>
                <label className="block font-bold text-slate-300 uppercase text-[10px] mb-1">
                  Item Names (Comma, semicolon, or newline separated)
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="item 1, item 2, item 3..."
                  value={rawInputText}
                  onChange={(e) => setRawInputText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500 font-mono"
                  autoFocus
                />
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Writing "item 1, item 2, item 3" creates 3 unique items instantly.
                </p>
              </div>

              {/* Optional: Single Item Bio */}
              <div>
                <label className="block font-bold text-slate-400 uppercase text-[10px] mb-1">
                  Item Bio / Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional brief commentary or background note..."
                  value={enterBio}
                  onChange={(e) => setEnterBio(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              {/* Optional: Image URL */}
              <div>
                <label className="block font-bold text-slate-400 uppercase text-[10px] mb-1">
                  Image URL (Optional)
                </label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={enterImageUrl}
                  onChange={(e) => setEnterImageUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEnterModalOpen(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition"
                >
                  Create Item(s)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Duplicate Check Pop-up */}
      {currentDuplicatePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-md bg-slate-900 border border-amber-500/50 rounded-xl p-5 shadow-2xl text-slate-100 font-mono space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-amber-400">
              <AlertTriangle size={20} />
              <h3 className="font-bold text-sm uppercase">Duplicate Item</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              An item named <strong className="text-amber-300">"{currentDuplicatePrompt.title}"</strong>{' '}
              with media type <strong className="text-purple-300">"{currentDuplicatePrompt.mediaType}"</strong>{' '}
              already exists in Bingo.
            </p>
            <p className="text-xs text-slate-400">Are you sure to duplicate?</p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={handleSkipDuplicate}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer"
              >
                Skip Duplicate
              </button>
              <button
                onClick={() => handleConfirmDuplicate(currentDuplicatePrompt)}
                className="px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition cursor-pointer"
              >
                Yes, Duplicate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Automatic Linking Pop-up */}
      {currentLinkPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-md bg-slate-900 border border-purple-500/50 rounded-xl p-5 shadow-2xl text-slate-100 font-mono space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-purple-400">
              <Link2 size={20} />
              <h3 className="font-bold text-sm uppercase">Link to Archive</h3>
            </div>

            <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
              <p>
                Found matching entry in main archive for{' '}
                <strong className="text-purple-300">"{currentLinkPrompt.bingoItem.title}"</strong>:
              </p>
              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-center gap-3">
                {currentLinkPrompt.archiveItem.cover ? (
                  <img
                    src={currentLinkPrompt.archiveItem.cover}
                    alt={currentLinkPrompt.archiveItem.title}
                    className="w-12 h-12 object-cover rounded"
                  />
                ) : null}
                <div className="text-xs">
                  <div className="font-bold text-slate-100">{currentLinkPrompt.archiveItem.title}</div>
                  <div className="text-slate-400 text-[10px]">
                    {currentLinkPrompt.archiveItem.mediaFormat} • Score:{' '}
                    {currentLinkPrompt.archiveItem.hornetScore}/10
                  </div>
                </div>
              </div>
              <p className="text-slate-400">
                Are you sure to link these? (Image and ratings will be shown immediately).
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={handleSkipLink}
                className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer"
              >
                No, Keep Unlinked
              </button>
              <button
                onClick={() => handleConfirmLink(currentLinkPrompt)}
                className="px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition cursor-pointer"
              >
                Yes, Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Visitor Item Bio Modal */}
      {selectedBioCard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedBioCard(null)}
        >
          <div
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl text-slate-100 font-mono space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 16:9 Picture Header */}
            {(() => {
              const linked = selectedBioCard.linkedItemId
                ? archiveItemMap.get(selectedBioCard.linkedItemId)
                : undefined;
              const img = selectedBioCard.imageUrl || linked?.cover;
              return img ? (
                <div className="w-full aspect-video rounded-lg overflow-hidden border border-slate-800">
                  <img src={img} alt={selectedBioCard.title} className="w-full h-full object-cover" />
                </div>
              ) : null;
            })()}

            <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2">
              <div>
                <h3 className="text-base font-bold text-slate-100">{selectedBioCard.title}</h3>
                <span className="text-[11px] text-purple-400 capitalize">
                  {selectedBioCard.mediaType}
                </span>
              </div>
              <button
                onClick={() => setSelectedBioCard(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            {/* Linked score if any */}
            {(() => {
              const linked = selectedBioCard.linkedItemId
                ? archiveItemMap.get(selectedBioCard.linkedItemId)
                : undefined;
              if (linked && typeof linked.hornetScore === 'number') {
                return (
                  <div className="p-2.5 rounded bg-slate-950 border border-amber-500/30 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Hornet's Rating:</span>
                    <span className="font-bold text-amber-400 flex items-center gap-1">
                      <Star size={12} className="fill-amber-400" />
                      {linked.hornetScore}/10
                    </span>
                  </div>
                );
              }
              return null;
            })()}

            {/* Bio text */}
            <div className="text-xs text-slate-300 leading-relaxed font-sans space-y-2 whitespace-pre-wrap">
              {selectedBioCard.bio ? (
                <p>{selectedBioCard.bio}</p>
              ) : selectedBioCard.linkedItemId ? (
                <p>
                  {archiveItemMap.get(selectedBioCard.linkedItemId)?.hornetVerdict ||
                    archiveItemMap.get(selectedBioCard.linkedItemId)?.summaryPlot ||
                    'No additional bio text.'}
                </p>
              ) : (
                <p className="text-slate-500">No bio entered.</p>
              )}
            </div>

            {/* Link to view archive entry */}
            {selectedBioCard.linkedItemId && archiveItemMap.has(selectedBioCard.linkedItemId) && (
              <div className="pt-2 border-t border-slate-800">
                <button
                  onClick={() => {
                    const linked = archiveItemMap.get(selectedBioCard.linkedItemId!);
                    if (linked && onOpenArchiveItem) {
                      onOpenArchiveItem(linked);
                    }
                    setSelectedBioCard(null);
                  }}
                  className="w-full py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs font-mono flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <ExternalLink size={12} />
                  <span>View Full Archive Entry</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Admin Card Edit & Linking Modal */}
      {adminEditingCard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in"
          onClick={() => setAdminEditingCard(null)}
        >
          <div
            className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl text-slate-100 font-mono space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-sm font-bold uppercase text-purple-300 flex items-center gap-1.5">
                <Sparkles size={14} /> Admin Card Controls
              </h3>
              <button
                onClick={() => setAdminEditingCard(null)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-400 uppercase text-[10px] mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-400 uppercase text-[10px] mb-1">
                  Media Type Section
                </label>
                <select
                  value={editMediaType}
                  onChange={(e) => setEditMediaType(e.target.value as BingoSection)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-purple-500"
                >
                  {BINGO_SECTIONS.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-400 uppercase text-[10px] mb-1">
                  Image URL
                </label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={editImageUrl}
                  onChange={(e) => setEditImageUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-400 uppercase text-[10px] mb-1">
                  Item Bio
                </label>
                <textarea
                  rows={3}
                  placeholder="Card bio or evaluation notes..."
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Linking Controls */}
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-purple-400 flex items-center gap-1">
                    <Link2 size={12} /> Archive Link Status
                  </span>
                  {editLinkedItemId ? (
                    <button
                      type="button"
                      onClick={() => setEditLinkedItemId(undefined)}
                      className="text-[10px] text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Unlink2 size={11} /> Unlink
                    </button>
                  ) : null}
                </div>

                {editLinkedItemId && archiveItemMap.has(editLinkedItemId) ? (
                  <div className="text-xs text-emerald-400 flex items-center gap-2">
                    <Check size={13} />
                    <span>
                      Linked to "{archiveItemMap.get(editLinkedItemId)?.title}" (Score:{' '}
                      {archiveItemMap.get(editLinkedItemId)?.hornetScore}/10)
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="text-[11px] text-slate-400">
                      Not currently linked to main archive. Search archive to link:
                    </div>
                    <input
                      type="text"
                      placeholder="Search archive entry to link..."
                      value={archiveSearchForLink}
                      onChange={(e) => setArchiveSearchForLink(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                    />
                    {archiveSearchForLink.trim() && (
                      <div className="max-h-32 overflow-y-auto space-y-1 border border-slate-800 rounded p-1 bg-slate-900/50">
                        {archiveItems
                          .filter((a) =>
                            a.title.toLowerCase().includes(archiveSearchForLink.trim().toLowerCase())
                          )
                          .slice(0, 5)
                          .map((match) => (
                            <div
                              key={match.id}
                              onClick={() => {
                                setEditLinkedItemId(match.id);
                                if (!editImageUrl) {
                                  setEditImageUrl(match.cover || '');
                                }
                                setArchiveSearchForLink('');
                              }}
                              className="p-1.5 rounded hover:bg-purple-950/50 cursor-pointer flex items-center justify-between text-xs"
                            >
                              <span className="text-slate-200">{match.title}</span>
                              <span className="text-[10px] text-purple-400 font-mono">
                                {match.mediaFormat}
                              </span>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => handleAdminDeleteCard(adminEditingCard.id)}
                className="px-3 py-1.5 rounded bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 text-xs font-mono flex items-center gap-1 transition cursor-pointer"
              >
                <Trash2 size={12} />
                <span>Delete</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAdminEditingCard(null)}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAdminSaveCard}
                  className="px-4 py-1.5 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
