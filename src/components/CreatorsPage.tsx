import React, { useState, useMemo, useEffect } from 'react';
import { MediaItem, CreatorCategory, CreatorDetails, BandMember, getScoreLevelInfo } from '../types';
import { getSortableTitle } from '../utils/stringUtils';
import { SmartImage } from './SmartImage';
import {
  Search,
  User,
  Users,
  Film,
  Music,
  BookOpen,
  Palette,
  Gamepad2,
  Code,
  Building2,
  Star,
  Layers,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2
} from 'lucide-react';

interface CreatorAggregate {
  name: string;
  category: CreatorCategory;
  nation?: string;
  photoUrl?: string;
  wikiUrl?: string;
  customBio?: string;
  personalityTags?: string[];
  isBand?: boolean;
  bandMembers?: BandMember[];
  bandAffiliations?: { bandName: string; role: string }[];
  involvedItems: {
    item: MediaItem;
    role: string;
  }[];
  averageScore: number;
}

interface CreatorsPageProps {
  archiveItems: MediaItem[];
  onSelectCreator: (creatorName: string, category?: CreatorCategory) => void;
  onSelectMedia?: (item: MediaItem) => void;
  onSelectTag?: (tag: string) => void;
}

const CATEGORY_OPTIONS: { label: string; value: CreatorCategory | 'ALL' }[] = [
  { label: 'All Categories', value: 'ALL' },
  { label: 'Director', value: 'Director' },
  { label: 'Author', value: 'Author' },
  { label: 'Music Artist', value: 'Music Artist' },
  { label: 'Band', value: 'Band' },
  { label: 'Game Designer', value: 'Game Designer' },
  { label: 'Production Artist', value: 'Production Artist' },
  { label: 'Painter', value: 'Painter' },
  { label: 'Developer', value: 'Developer' },
  { label: 'Studio / Company', value: 'Studio / Company' },
  { label: 'Other', value: 'Other' },
];

// Memoized individual Creator Card for ultra-fast, smooth scrolling without layout thrashing
const CreatorCard = React.memo<{
  creator: CreatorAggregate;
  onSelectCreator: (creatorName: string, category?: CreatorCategory) => void;
  onSelectMedia?: (item: MediaItem) => void;
  getCategoryIcon: (cat: CreatorCategory) => React.ReactNode;
}>(({ creator, onSelectCreator, onSelectMedia, getCategoryIcon }) => {
  const scoreInfo = getScoreLevelInfo(creator.averageScore);

  return (
    <div
      onClick={() => onSelectCreator(creator.name, creator.category)}
      className="group relative bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl overflow-hidden shadow-md hover:shadow-lg transition-colors duration-200 flex flex-col cursor-pointer transform-gpu"
    >
      {/* Photo Header Container with Average Score Overlay */}
      <div className="relative w-full h-48 bg-slate-950 overflow-hidden flex items-center justify-center border-b border-slate-800">
        <SmartImage
          src={creator.photoUrl || creator.wikiUrl || creator.name}
          wikiUrl={creator.wikiUrl || `https://en.wikipedia.org/wiki/${encodeURIComponent(creator.name)}`}
          alt={creator.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 transform-gpu"
        />

        {/* Gradient Overlay for photo readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-black/30 opacity-70 pointer-events-none" />

        {/* Top-Right Average Score Badge */}
        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950/90 border border-amber-500/50 shadow-md">
          <Star size={11} className="text-amber-400 fill-amber-400 shrink-0" />
          <div className="flex flex-col items-end leading-none">
            <span className="text-[8px] font-mono text-slate-400 uppercase font-bold tracking-tighter">Avg Score</span>
            <span className={`text-xs font-mono font-black ${scoreInfo.color}`}>
              {creator.averageScore.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Category Pill on Image (Bottom Left of photo) */}
        <div className="absolute bottom-2.5 left-2.5 z-10 flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-950/90 border border-slate-800 text-slate-200 font-mono text-[11px]">
          {getCategoryIcon(creator.category)}
          <span>{creator.category}</span>
          {creator.nation && <span className="text-slate-400">• {creator.nation}</span>}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3 font-sans">
        {/* Creator Name */}
        <div>
          <h3 className="text-base font-bold font-mono text-slate-100 group-hover:text-amber-300 transition-colors line-clamp-1">
            {creator.name}
          </h3>

          {/* Tags */}
          {creator.personalityTags && creator.personalityTags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {creator.personalityTags.slice(0, 3).map((tag, tidx) => (
                <span
                  key={tidx}
                  className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20"
                >
                  #{tag.toLowerCase()}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Creations + Role List */}
        <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 font-bold uppercase tracking-wider">
            <span>Creations ({creator.involvedItems.length})</span>
            <span className="text-[10px] text-amber-400/90 group-hover:underline">View Bio →</span>
          </div>

          <div className="space-y-1 max-h-28 overflow-hidden">
            {creator.involvedItems.slice(0, 3).map(({ item, role }, iidx) => (
              <div
                key={iidx}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onSelectMedia) onSelectMedia(item);
                }}
                className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-950 border border-slate-800/80 hover:border-amber-500/40 text-xs transition-colors"
                title={`Inspect ${item.title}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {item.cover ? (
                    <img
                      src={item.cover}
                      alt={item.title}
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      className="w-5 h-6 rounded object-cover shrink-0 border border-slate-800"
                    />
                  ) : (
                    <div className="w-5 h-6 rounded bg-slate-900 shrink-0 flex items-center justify-center text-slate-600">
                      <Film size={10} />
                    </div>
                  )}
                  <span className="font-bold text-slate-200 truncate group-hover:text-amber-200 text-[11px]">
                    {item.title}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 shrink-0 bg-slate-900 px-1.5 py-0.2 rounded border border-slate-800">
                  {role}
                </span>
              </div>
            ))}
            {creator.involvedItems.length > 3 && (
              <div className="text-[10px] font-mono text-slate-500 text-center pt-0.5 italic">
                +{creator.involvedItems.length - 3} more creations in archive
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export const CreatorsPage: React.FC<CreatorsPageProps> = ({
  archiveItems,
  onSelectCreator,
  onSelectMedia,
  onSelectTag,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CreatorCategory | 'ALL'>('ALL');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'avg_score' | 'creations' | 'name'>('avg_score');
  const [currentPage, setCurrentPage] = useState(1);

  const ITEMS_PER_PAGE = 24;

  // Compile all unique creators across all media items
  const aggregatedCreators = useMemo<CreatorAggregate[]>(() => {
    const creatorMap = new Map<string, {
      name: string;
      category: CreatorCategory;
      nation?: string;
      photoUrl?: string;
      wikiUrl?: string;
      customBio?: string;
      personalityTags: Set<string>;
      isBand: boolean;
      bandMembersMap: Map<string, BandMember>;
      bandAffiliationsMap: Map<string, { bandName: string; role: string }>;
      itemMap: Map<string, { item: MediaItem; role: string }>;
    }>();

    archiveItems.forEach((item) => {
      // 1. Process main creator
      if (item.mainCreator && item.mainCreator.trim()) {
        const rawName = item.mainCreator.trim();
        // Check if format is "Name / Role"
        let creatorName = rawName;
        let roleFromMain = 'Main Creator';
        if (rawName.includes('/')) {
          const parts = rawName.split('/');
          creatorName = parts[0].trim();
          roleFromMain = parts[1].trim() || 'Main Creator';
        }

        const key = creatorName.toLowerCase();
        if (!creatorMap.has(key)) {
          creatorMap.set(key, {
            name: creatorName,
            category: 'Other',
            personalityTags: new Set(),
            isBand: false,
            bandMembersMap: new Map(),
            bandAffiliationsMap: new Map(),
            itemMap: new Map(),
          });
        }
        creatorMap.get(key)!.itemMap.set(item.id, { item, role: roleFromMain });
      }

      // 2. Process other creators
      if (item.otherCreators && Array.isArray(item.otherCreators)) {
        item.otherCreators.forEach((oc) => {
          if (!oc || !oc.trim()) return;
          let creatorName = oc.trim();
          let roleFromOther = 'Creator';
          if (creatorName.includes('/')) {
            const parts = creatorName.split('/');
            creatorName = parts[0].trim();
            roleFromOther = parts[1].trim() || 'Creator';
          }

          const key = creatorName.toLowerCase();
          if (!creatorMap.has(key)) {
            creatorMap.set(key, {
              name: creatorName,
              category: 'Other',
              personalityTags: new Set(),
              isBand: false,
              bandMembersMap: new Map(),
              bandAffiliationsMap: new Map(),
              itemMap: new Map(),
            });
          }
          if (!creatorMap.get(key)!.itemMap.has(item.id)) {
            creatorMap.get(key)!.itemMap.set(item.id, { item, role: roleFromOther });
          }
        });
      }

      // 3. Process creatorDetails metadata
      if (item.creatorDetails && Array.isArray(item.creatorDetails)) {
        item.creatorDetails.forEach((cd) => {
          if (!cd || !cd.name || !cd.name.trim()) return;
          const key = cd.name.trim().toLowerCase();
          if (!creatorMap.has(key)) {
            creatorMap.set(key, {
              name: cd.name.trim(),
              category: cd.category || 'Other',
              nation: cd.nation,
              photoUrl: cd.photoUrl,
              wikiUrl: cd.wikiUrl,
              customBio: cd.customBio,
              personalityTags: new Set(cd.personalityTags || []),
              isBand: cd.category === 'Band',
              bandMembersMap: new Map(),
              bandAffiliationsMap: new Map(),
              itemMap: new Map(),
            });
          }

          const entry = creatorMap.get(key)!;
          if (cd.category && cd.category !== 'Other') entry.category = cd.category;
          if (cd.nation) entry.nation = cd.nation;
          if (cd.photoUrl) entry.photoUrl = cd.photoUrl;
          if (cd.wikiUrl) entry.wikiUrl = cd.wikiUrl;
          if (cd.customBio) entry.customBio = cd.customBio;
          if (cd.category === 'Band') entry.isBand = true;
          if (cd.bandMembers && cd.bandMembers.length > 0) entry.isBand = true;

          if (cd.personalityTags) {
            cd.personalityTags.forEach((t) => entry.personalityTags.add(t));
          }

          // If this is a Band entry with band members
          if ((cd.category === 'Band' || (cd.bandMembers && cd.bandMembers.length > 0)) && cd.bandMembers) {
            cd.bandMembers.forEach((bm) => {
              if (bm.name && bm.name.trim()) {
                const bmKey = bm.name.trim().toLowerCase();
                entry.bandMembersMap.set(bmKey, bm);

                // Register band affiliation for individual member creator
                if (!creatorMap.has(bmKey)) {
                  creatorMap.set(bmKey, {
                    name: bm.name.trim(),
                    category: 'Music Artist',
                    personalityTags: new Set(),
                    isBand: false,
                    bandMembersMap: new Map(),
                    bandAffiliationsMap: new Map(),
                    itemMap: new Map(),
                  });
                }
                const memberCreator = creatorMap.get(bmKey)!;
                memberCreator.bandAffiliationsMap.set(key, {
                  bandName: cd.name.trim(),
                  role: bm.bandRole || bm.productRole || 'Member',
                });

                if (bm.participatedInProduct !== false) {
                  memberCreator.itemMap.set(item.id, {
                    item,
                    role: `${cd.name.trim()} (${bm.productRole || bm.bandRole || 'Member'})`,
                  });
                }
              }
            });
          }
        });
      }
    });

    // Convert map to CreatorAggregate list with calculated average score
    const result: CreatorAggregate[] = [];
    creatorMap.forEach((data) => {
      const itemsList = Array.from(data.itemMap.values());
      if (itemsList.length === 0) return;

      const totalScore = itemsList.reduce((acc, curr) => acc + (curr.item.hornetScore || 0), 0);
      const averageScore = Math.round((totalScore / itemsList.length) * 10) / 10;

      result.push({
        name: data.name,
        category: data.category,
        nation: data.nation,
        photoUrl: data.photoUrl,
        wikiUrl: data.wikiUrl,
        customBio: data.customBio,
        personalityTags: Array.from(data.personalityTags),
        isBand: data.isBand,
        bandMembers: Array.from(data.bandMembersMap.values()),
        bandAffiliations: Array.from(data.bandAffiliationsMap.values()),
        involvedItems: itemsList,
        averageScore,
      });
    });

    return result;
  }, [archiveItems]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedTag, sortBy]);

  // Tag counts
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    aggregatedCreators.forEach((c) => {
      c.personalityTags?.forEach((t) => {
        if (!t || typeof t !== 'string') return;
        const lower = t.toLowerCase().trim();
        counts[lower] = (counts[lower] || 0) + 1;
      });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [aggregatedCreators]);

  // Filtered and Sorted list
  const filteredCreators = useMemo(() => {
    let list = [...aggregatedCreators];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          (c.nation && c.nation.toLowerCase().includes(q)) ||
          c.involvedItems.some(
            (i) => i.item.title.toLowerCase().includes(q) || i.role.toLowerCase().includes(q)
          )
      );
    }

    if (selectedCategory !== 'ALL') {
      list = list.filter((c) => c.category === selectedCategory);
    }

    if (selectedTag) {
      list = list.filter((c) =>
        c.personalityTags?.some((t) => t.toLowerCase().trim() === selectedTag.toLowerCase().trim())
      );
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'avg_score') {
        if (b.averageScore !== a.averageScore) {
          return b.averageScore - a.averageScore;
        }
        return b.involvedItems.length - a.involvedItems.length;
      }
      if (sortBy === 'creations') {
        if (b.involvedItems.length !== a.involvedItems.length) {
          return b.involvedItems.length - a.involvedItems.length;
        }
        return b.averageScore - a.averageScore;
      }
      return getSortableTitle(a.name).localeCompare(getSortableTitle(b.name));
    });

    return list;
  }, [aggregatedCreators, searchQuery, selectedCategory, selectedTag, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filteredCreators.length / ITEMS_PER_PAGE));
  const currentCreators = filteredCreators.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const getCategoryIcon = (cat: CreatorCategory) => {
    switch (cat) {
      case 'Band':
        return <Users size={13} className="text-amber-400" />;
      case 'Music Artist':
        return <Music size={13} className="text-emerald-400" />;
      case 'Author':
        return <BookOpen size={13} className="text-amber-400" />;
      case 'Director':
        return <Film size={13} className="text-cyan-400" />;
      case 'Painter':
      case 'Production Artist':
        return <Palette size={13} className="text-purple-400" />;
      case 'Game Designer':
        return <Gamepad2 size={13} className="text-amber-400" />;
      case 'Developer':
        return <Code size={13} className="text-blue-400" />;
      case 'Studio / Company':
        return <Building2 size={13} className="text-indigo-400" />;
      default:
        return <User size={13} className="text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 font-sans">
      {/* Minimalist Page Header */}
      <div className="flex items-center justify-between gap-4 bg-slate-900/80 border border-slate-800/80 px-6 py-4 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 font-mono tracking-tight">
            Creators
          </h1>
          <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-amber-400">
            {aggregatedCreators.length}
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl space-y-4 shadow-md">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search creator by name, nation, category, or creation title..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs font-mono focus:outline-none focus:border-amber-500/50 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Selector */}
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-amber-400 shrink-0" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500/50 cursor-pointer"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500/50 cursor-pointer"
          >
            <option value="avg_score">Sort: Highest Avg Score</option>
            <option value="creations">Sort: Most Creations</option>
            <option value="name">Sort: Name A-Z</option>
          </select>
        </div>

        {/* Personality / Category Tag Cloud */}
        {tagCounts.length > 0 && (
          <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-mono text-slate-400 font-semibold mr-1">
              Filter by Tag:
            </span>
            {selectedTag && (
              <button
                onClick={() => setSelectedTag(null)}
                className="px-2.5 py-0.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-mono font-bold hover:bg-amber-400 transition"
              >
                Clear Tag Filter
              </button>
            )}
            {tagCounts.slice(0, 15).map(([tag, count]) => {
              const isSelected = selectedTag?.toLowerCase() === tag.toLowerCase();
              return (
                <button
                  key={tag}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedTag(null);
                    } else {
                      setSelectedTag(tag);
                      if (onSelectTag) onSelectTag(tag);
                    }
                  }}
                  className={`px-2.5 py-0.5 rounded-lg text-xs font-mono transition flex items-center gap-1 cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-950 hover:bg-slate-800 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  <span>#{tag}</span>
                  <span className="text-[10px] opacity-75">({count})</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Creator Grid */}
      {currentCreators.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {currentCreators.map((creator) => (
            <CreatorCard
              key={creator.name}
              creator={creator}
              onSelectCreator={onSelectCreator}
              onSelectMedia={onSelectMedia}
              getCategoryIcon={getCategoryIcon}
            />
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl space-y-3 font-mono">
          <User size={36} className="mx-auto text-slate-600" />
          <h3 className="text-lg font-bold text-slate-200">No Creators Found</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            No creators match your current search query or filter selection. Try adjusting your search term or clearing filters.
          </p>
          {(searchQuery || selectedCategory !== 'ALL' || selectedTag) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('ALL');
                setSelectedTag(null);
              }}
              className="mt-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs transition cursor-pointer"
            >
              Reset Search & Filters
            </button>
          )}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 p-4 rounded-2xl font-mono text-xs">
          <div className="text-slate-400">
            Showing Page <span className="font-bold text-slate-200">{currentPage}</span> of{' '}
            <span className="font-bold text-slate-200">{totalPages}</span> ({filteredCreators.length} creators)
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-2 rounded-xl bg-slate-950 border border-slate-800 disabled:opacity-40 hover:border-amber-500/40 text-slate-200 transition cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-2 rounded-xl bg-slate-950 border border-slate-800 disabled:opacity-40 hover:border-amber-500/40 text-slate-200 transition cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
