import React, { useState, useEffect, useMemo } from 'react';
import { MediaItem } from '../types';
import { SmartImage } from './SmartImage';
import { getSortableTitle } from '../utils/stringUtils';
import { compareByQuality, calculateProsConsStats, buildCompositeQualityRankMap, getItemScore } from '../utils/sortUtils';
import { normalizeMediaFormat } from '../utils/formatUtils';
import {
  Film,
  Book,
  Disc,
  Gamepad2,
  Tv,
  Palette,
  Star,
  CheckCircle2,
  XCircle,
  ArrowUpDown,
  Tag,
  HelpCircle,
  Download,
  Check
} from 'lucide-react';
import { downloadMediaItemCardPng } from '../utils/downloadUtils';

interface TableViewProps {
  items: MediaItem[];
  onItemClick: (item: MediaItem) => void;
  onTagClick: (tag: string) => void;
  onCreatorClick: (creator: string) => void;
  isAdmin?: boolean;
  onReorderItems?: (newOrderedItems: MediaItem[]) => void;
  scoringPhilosophy?: string;
  aiRankMap?: Map<string, number> | null;
}

export const TableView: React.FC<TableViewProps> = ({
  items,
  onItemClick,
  onTagClick,
  onCreatorClick,
  isAdmin = false,
  onReorderItems,
  scoringPhilosophy,
  aiRankMap: propAiRankMap,
}) => {
  // Sort field: 'quality' (default), 'row', 'title', 'creator', 'format', 'score', 'proscons', 'year'
  const [sortField, setSortField] = useState<
    'quality' | 'row' | 'title' | 'creator' | 'format' | 'score' | 'proscons' | 'year'
  >('quality');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [localAiRankMap, setLocalAiRankMap] = useState<Map<string, number> | null>(null);

  const [downloadedId, setDownloadedId] = useState<string | null>(null);

  const effectiveAiRankMap = propAiRankMap !== undefined ? propAiRankMap : localAiRankMap;

  const getFormatIcon = (format: string) => {
    const { canonicalFormat } = normalizeMediaFormat(format);
    switch (canonicalFormat) {
      case 'Film':
        return <Film size={12} />;
      case 'Book':
      case 'Comic/Manga Series':
        return <Book size={12} />;
      case 'Music Album':
        return <Disc size={12} />;
      case 'Video Game':
        return <Gamepad2 size={12} />;
      case 'TV Show':
        return <Tv size={12} />;
      default:
        return <Palette size={12} />;
    }
  };

  // Only trigger local ranking if propAiRankMap is not provided
  useEffect(() => {
    if (propAiRankMap !== undefined) return;
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
          setLocalAiRankMap(map);
        }
      } catch (err) {
        // Fallback to deterministic ranking
      }
    };

    const timer = setTimeout(fetchSmartSort, 500);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [items, scoringPhilosophy, propAiRankMap]);

  // Pre-calculate rock-solid quality ranks for 100% of items
  const compositeRankMap = useMemo(() => {
    return buildCompositeQualityRankMap(items, effectiveAiRankMap);
  }, [items, effectiveAiRankMap]);

  // Derive display items based on active sort field
  const displayItems = useMemo(() => {
    if (!items || items.length === 0) return [];

    const sorted = [...items].sort((a, b) => {
      if (sortField === 'quality') {
        const rankA = compositeRankMap.get(a.id) ?? 0;
        const rankB = compositeRankMap.get(b.id) ?? 0;
        const diff = rankA - rankB;
        return sortAsc ? -diff : diff;
      }
      if (sortField === 'row') {
        return sortAsc ? 1 : -1;
      }
      if (sortField === 'title') {
        const res = getSortableTitle(a.title || '').localeCompare(getSortableTitle(b.title || ''));
        return sortAsc ? res : -res;
      }
      if (sortField === 'creator') {
        const res = (a.mainCreator || '').localeCompare(b.mainCreator || '');
        return sortAsc ? res : -res;
      }
      if (sortField === 'format') {
        const res = (a.mediaFormat || '').localeCompare(b.mediaFormat || '');
        return sortAsc ? res : -res;
      }
      if (sortField === 'score') {
        const scoreA = getItemScore(a);
        const scoreB = getItemScore(b);
        const scoreDiff = scoreB - scoreA;
        if (Math.abs(scoreDiff) > 0.001) {
          return sortAsc ? -scoreDiff : scoreDiff;
        }
        return sortAsc ? compareByQuality(b, a) : compareByQuality(a, b);
      }
      if (sortField === 'proscons') {
        const statsA = calculateProsConsStats(a);
        const statsB = calculateProsConsStats(b);
        const diff = statsB.metric - statsA.metric;
        return sortAsc ? -diff : diff;
      }
      if (sortField === 'year') {
        const yA = a.releaseDate ? parseInt(a.releaseDate.slice(0, 4)) || 0 : 0;
        const yB = b.releaseDate ? parseInt(b.releaseDate.slice(0, 4)) || 0 : 0;
        return sortAsc ? yA - yB : yB - yA;
      }
      return 0;
    });

    return sorted;
  }, [items, sortField, sortAsc, compositeRankMap]);

  const handleHeaderClick = (
    field: 'quality' | 'row' | 'title' | 'creator' | 'format' | 'score' | 'proscons' | 'year'
  ) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      if (['quality', 'score', 'proscons'].includes(field)) {
        setSortAsc(false);
      } else {
        setSortAsc(true);
      }
    }
  };

  return (
    <div className="space-y-3 font-mono text-xs">
      {/* Table Top Header Summary */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-slate-400 text-[11px]">
        <div className="flex items-center gap-2">
          <span className="text-slate-300 font-bold">
            Datasheet Index ({displayItems.length} {displayItems.length === 1 ? 'entry' : 'entries'})
          </span>
          <span className="text-slate-600">•</span>
          <span className="flex items-center gap-1 text-slate-400">
            <ArrowUpDown size={11} className="text-amber-400" />
            <span>Ordered by {sortField === 'quality' ? 'Hornet Quality (Score + Pros/Cons dynamic)' : sortField}</span>
          </span>
        </div>
      </div>

      {/* Clean Spreadsheet Table Container */}
      <div className="w-full overflow-x-auto border border-slate-800 rounded-xl bg-slate-900 shadow-lg select-text">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider select-none font-bold">
              <th
                onClick={() => handleHeaderClick('quality')}
                className="py-2.5 px-3 w-12 text-center border-r border-slate-800 hover:text-slate-200 cursor-pointer"
                title="Hornet Quality Rank"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>#</span>
                  {sortField === 'quality' && <span className="text-amber-400">{sortAsc ? '↑' : '↓'}</span>}
                </div>
              </th>

              <th className="py-2.5 px-3 w-14 text-center border-r border-slate-800">
                Cover
              </th>

              <th
                onClick={() => handleHeaderClick('title')}
                className="py-2.5 px-3 min-w-[200px] border-r border-slate-800 hover:text-slate-200 cursor-pointer"
              >
                <div className="flex items-center gap-1">
                  <span>Title</span>
                  {sortField === 'title' && <span className="text-amber-400">{sortAsc ? '↑' : '↓'}</span>}
                </div>
              </th>

              <th
                onClick={() => handleHeaderClick('creator')}
                className="py-2.5 px-3 min-w-[140px] border-r border-slate-800 hover:text-slate-200 cursor-pointer"
              >
                <div className="flex items-center gap-1">
                  <span>Creator / Author</span>
                  {sortField === 'creator' && <span className="text-amber-400">{sortAsc ? '↑' : '↓'}</span>}
                </div>
              </th>

              <th
                onClick={() => handleHeaderClick('format')}
                className="py-2.5 px-3 w-32 border-r border-slate-800 hover:text-slate-200 cursor-pointer"
              >
                <div className="flex items-center gap-1">
                  <span>Format</span>
                  {sortField === 'format' && <span className="text-amber-400">{sortAsc ? '↑' : '↓'}</span>}
                </div>
              </th>

              {/* Score */}
              <th
                onClick={() => handleHeaderClick('score')}
                className="py-2.5 px-3 w-24 text-center border-r border-slate-800 hover:text-slate-200 cursor-pointer bg-slate-900/50"
                title="Hornet Rating (1 to 10)"
              >
                <div className="flex items-center justify-center gap-1">
                  <Star size={11} className="text-amber-400 fill-amber-400" />
                  <span>Score</span>
                  {sortField === 'score' && <span className="text-amber-400">{sortAsc ? '↑' : '↓'}</span>}
                </div>
              </th>

              {/* Pros & Cons Balance */}
              <th
                onClick={() => handleHeaderClick('proscons')}
                className="py-2.5 px-3 w-28 text-center border-r border-slate-800 hover:text-slate-200 cursor-pointer"
                title="Pros vs Cons Dynamic Balance"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Pros / Cons</span>
                  {sortField === 'proscons' && <span className="text-amber-400">{sortAsc ? '↑' : '↓'}</span>}
                </div>
              </th>

              <th
                onClick={() => handleHeaderClick('year')}
                className="py-2.5 px-3 w-20 text-center border-r border-slate-800 hover:text-slate-200 cursor-pointer"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Year</span>
                  {sortField === 'year' && <span className="text-amber-400">{sortAsc ? '↑' : '↓'}</span>}
                </div>
              </th>

              <th className="py-2.5 px-3 min-w-[180px]">Genres & Tags</th>
              {isAdmin && <th className="py-2.5 px-2 w-14 text-center border-l border-slate-800">Export</th>}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800">
            {displayItems.map((item, idx) => {
              const rowNum = String(idx + 1).padStart(3, '0');
              const releaseYear = item.releaseDate ? item.releaseDate.slice(0, 4) : '—';
              const genres = item.genres || [];
              const styleTags = item.genreStyleTags || [];
              const prosCount = Array.isArray(item.pros) ? item.pros.length : 0;
              const consCount = Array.isArray(item.cons) ? item.cons.length : 0;

              return (
                <tr
                  key={item.id}
                  onClick={() => onItemClick(item)}
                  className="transition-colors cursor-pointer group hover:bg-slate-800/80"
                >
                  {/* Index # */}
                  <td className="py-2 px-3 text-center border-r border-slate-800 text-slate-500 text-[11px] font-bold">
                    {rowNum}
                  </td>

                  {/* Cover */}
                  <td className="py-1.5 px-2 text-center border-r border-slate-800">
                    <div className="w-10 h-14 mx-auto rounded overflow-hidden bg-slate-950 border border-slate-800 shrink-0">
                      <SmartImage
                        src={item.cover}
                        alt={item.title}
                        adaptive={false}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </td>

                  {/* Title */}
                  <td className="py-2 px-3 border-r border-slate-800">
                    <div className="font-bold text-slate-100 group-hover:text-amber-400 transition-colors line-clamp-1">
                      {item.title}
                    </div>
                    {item.consumedVersion && (
                      <div className="text-[10px] text-slate-400 font-sans line-clamp-1">
                        {item.consumedVersion}
                      </div>
                    )}
                  </td>

                  {/* Creator */}
                  <td className="py-2 px-3 border-r border-slate-800">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCreatorClick(item.mainCreator);
                      }}
                      className="text-slate-300 hover:text-amber-400 font-medium hover:underline text-left line-clamp-1 cursor-pointer"
                    >
                      {item.mainCreator || '—'}
                    </button>
                  </td>

                  {/* Format */}
                  <td className="py-2 px-3 border-r border-slate-800 text-slate-300">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px]">
                      <span className="text-amber-400">{getFormatIcon(item.mediaFormat)}</span>
                      <span className="truncate">{item.mediaFormat}</span>
                    </div>
                  </td>

                  {/* Score */}
                  <td className="py-2 px-3 text-center border-r border-slate-800 bg-slate-950/30 font-mono">
                    <span className="inline-block px-2 py-0.5 rounded bg-slate-950 border border-amber-500/40 text-amber-400 font-black text-[11px] shadow-sm">
                      {item.hornetScore}/10
                    </span>
                  </td>

                  {/* Pros & Cons Balance */}
                  <td className="py-2 px-3 text-center border-r border-slate-800 font-mono text-[11px]">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 font-bold">
                        +{prosCount}
                      </span>
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-400 border border-rose-800/40 font-bold">
                        -{consCount}
                      </span>
                    </div>
                  </td>

                  {/* Release Year */}
                  <td className="py-2 px-3 text-center border-r border-slate-800 text-slate-400 text-[11px]">
                    {releaseYear}
                  </td>

                  {/* Genres & Style Tags */}
                  <td className="py-2 px-3">
                    <div className="flex flex-wrap gap-1">
                      {genres.slice(0, 2).map((g, i) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-amber-400 border border-slate-700 font-medium"
                        >
                          {g}
                        </span>
                      ))}
                      {styleTags.slice(0, 2).map((st, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onTagClick(st);
                          }}
                          className="px-1.5 py-0.2 rounded text-[10px] bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700 cursor-pointer"
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </td>

                  {/* Admin Single-Click Download */}
                  {isAdmin && (
                    <td className="py-2 px-2 text-center border-l border-slate-800">
                      <button
                        type="button"
                        id={`download-table-${item.id}`}
                        onClick={async (e) => {
                          e.stopPropagation();
                          setDownloadedId(item.id);
                          await downloadMediaItemCardPng(null, item);
                          setTimeout(() => setDownloadedId(null), 1600);
                        }}
                        title="Download card as PNG image (Admin)"
                        aria-label={`Download ${item.title} card as PNG`}
                        className={`p-1.5 rounded border ${
                          downloadedId === item.id
                            ? 'border-emerald-500 text-emerald-400 bg-slate-950'
                            : 'border-slate-800 hover:border-purple-500 bg-slate-950/80 text-slate-300 hover:text-white'
                        } transition cursor-pointer inline-flex items-center justify-center`}
                      >
                        {downloadedId === item.id ? (
                          <Check size={12} className="text-emerald-400" />
                        ) : (
                          <Download size={12} />
                        )}
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
