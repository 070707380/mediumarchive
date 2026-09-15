import React, { useState, useEffect } from 'react';
import { MediaItem, getScoreLevelInfo, DEFAULT_SCORING_PHILOSOPHY, getItemReview } from '../types';
import { HornetBadge } from './HornetBadge';
import { SmartImage } from './SmartImage';
import { getItemShareableUrl } from '../utils/urlUtils';
import {
  X,
  Calendar,
  User,
  Users,
  ExternalLink,
  Edit,
  Trash2,
  Layers,
  Tag,
  Link as LinkIcon,
  Quote,
  Award,
  BookOpen,
  Info,
  Disc,
  Copy,
  Check,
  Globe,
  Languages,
  Download,
  Loader2
} from 'lucide-react';
import { downloadMediaItemCardPng } from '../utils/downloadUtils';

interface MediaDetailModalProps {
  item: MediaItem | null;
  isAdmin: boolean;
  onClose: () => void;
  onEdit: (item: MediaItem) => void;
  onDelete: (id: string) => void;
  onTagClick: (tag: string) => void;
  onCreatorClick?: (creatorName: string) => void;
  allItems?: MediaItem[];
  onSimilarClick?: (matchedItem: MediaItem) => void;
  scoringPhilosophy?: string;
  onUpdateScoringPhilosophy?: (newPhilosophy: string) => void;
}

export const MediaDetailModal: React.FC<MediaDetailModalProps> = ({
  item,
  isAdmin,
  onClose,
  onEdit,
  onDelete,
  onTagClick,
  onCreatorClick,
  allItems = [],
  onSimilarClick,
  scoringPhilosophy = DEFAULT_SCORING_PHILOSOPHY,
  onUpdateScoringPhilosophy,
}: MediaDetailModalProps) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState('');
  const [downloaded, setDownloaded] = useState(false);

  const handleDownloadCardAndReviews = async () => {
    if (!item || downloading) return;
    setDownloading(true);
    setDownloadProgress('Starting...');
    try {
      await downloadMediaItemCardPng(null, item, (stage) => {
        setDownloadProgress(stage);
      });
      setDownloaded(true);
      setTimeout(() => {
        setDownloaded(false);
        setDownloadProgress('');
      }, 2500);
    } catch (err) {
      console.error('Failed to download card and review:', err);
    } finally {
      setDownloading(false);
    }
  };

  // Dynamic Document Title & Canonical Tag Management for Reviews
  useEffect(() => {
    if (!item) return;

    const originalTitle = document.title;
    // Set format: [Item Name / Review] - Medium Archive
    document.title = `${item.title} / Review - Medium Archive`;

    let canonicalLink = document.querySelector("link[rel='canonical']") as HTMLLinkElement | null;
    const originalHref = canonicalLink ? canonicalLink.href : window.location.href;

    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = getItemShareableUrl(item.id);

    return () => {
      document.title = originalTitle || 'Medium Archive';
      if (canonicalLink) {
        canonicalLink.href = originalHref;
      }
    };
  }, [item]);

  const handleCopyLink = async () => {
    if (!item) return;
    try {
      const url = getItemShareableUrl(item.id);
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.warn('Failed to copy share link:', err);
    }
  };

  // Interconnected Soundtrack Resolution
  const isCurrentItemSoundtrack = Boolean(
    item?.mediaFormat === 'Music Album' && (item.isSoundtrack || item.soundtrackForId || item.soundtrackForTitle)
  );

  const parentMediaEntry = React.useMemo(() => {
    if (!item || !isCurrentItemSoundtrack) return null;
    if (item.soundtrackForId) {
      const found = allItems.find((i) => i.id === item.soundtrackForId);
      if (found) return found;
    }
    if (item.soundtrackForTitle) {
      const titleLower = item.soundtrackForTitle.toLowerCase().trim();
      const found = allItems.find((i) => i.title.toLowerCase().trim() === titleLower);
      if (found) return found;
    }
    return null;
  }, [item, isCurrentItemSoundtrack, allItems]);

  // Alphabetically sorted tags
  const sortedPhilosophicalTags = React.useMemo(() => {
    if (!item) return [];
    return [...(item.philosophicalTags || [])].sort((a, b) => a.localeCompare(b));
  }, [item]);

  const sortedGenres = React.useMemo(() => {
    if (!item) return [];
    return [...(item.genres || [])].sort((a, b) => a.localeCompare(b));
  }, [item]);

  const sortedStyleTags = React.useMemo(() => {
    if (!item) return [];
    return [...(item.genreStyleTags || [])].sort((a, b) => a.localeCompare(b));
  }, [item]);

  const soundtrackAlbumEntries = React.useMemo(() => {
    if (!item || isCurrentItemSoundtrack) return [];

    // Collect candidate OST definitions
    const candidatesMap = new Map<string, { album?: MediaItem; title: string }>();

    // 1. Check item.soundtracks array
    if (item.soundtracks && item.soundtracks.length > 0) {
      item.soundtracks.forEach((st) => {
        if (st.id) {
          const found = allItems.find((i) => i.id === st.id);
          if (found) {
            candidatesMap.set(found.id, { album: found, title: found.title });
            return;
          }
        }
        if (st.title) {
          const found = allItems.find(
            (i) => i.mediaFormat === 'Music Album' && i.title.toLowerCase().trim() === st.title.toLowerCase().trim()
          );
          if (found) {
            candidatesMap.set(found.id, { album: found, title: found.title });
          } else {
            candidatesMap.set(`custom-${st.title}`, { title: st.title });
          }
        }
      });
    }

    // 2. Legacy fields
    if (item.soundtrackId) {
      const found = allItems.find((i) => i.id === item.soundtrackId);
      if (found && !candidatesMap.has(found.id)) {
        candidatesMap.set(found.id, { album: found, title: found.title });
      }
    } else if (item.soundtrackTitle) {
      const found = allItems.find(
        (i) => i.mediaFormat === 'Music Album' && i.title.toLowerCase().trim() === item.soundtrackTitle!.toLowerCase().trim()
      );
      if (found && !candidatesMap.has(found.id)) {
        candidatesMap.set(found.id, { album: found, title: found.title });
      } else if (!candidatesMap.has(`custom-${item.soundtrackTitle}`)) {
        candidatesMap.set(`custom-${item.soundtrackTitle}`, { title: item.soundtrackTitle });
      }
    }

    // 3. Reverse search for music albums in DB pointing to this item
    allItems.forEach((album) => {
      if (album.mediaFormat !== 'Music Album') return;
      if (album.soundtrackForId && album.soundtrackForId === item.id) {
        candidatesMap.set(album.id, { album, title: album.title });
      } else if (album.soundtrackForTitle && album.soundtrackForTitle.toLowerCase().trim() === item.title.toLowerCase().trim()) {
        candidatesMap.set(album.id, { album, title: album.title });
      }
    });

    return Array.from(candidatesMap.values());
  }, [item, isCurrentItemSoundtrack, allItems]);

  // Main creator detail object & band status
  const mainCreatorName = React.useMemo(() => {
    if (!item?.mainCreator) return 'Unknown Creator';
    return item.mainCreator.split('/')[0].trim();
  }, [item]);

  const mainCreatorExplicitRole = React.useMemo(() => {
    if (!item?.mainCreator || !item.mainCreator.includes('/')) return null;
    return item.mainCreator.split('/')[1].trim();
  }, [item]);

  const mainCreatorDetail = React.useMemo(() => {
    if (!item?.mainCreator) return null;
    const nameOnly = item.mainCreator.split('/')[0].trim().toLowerCase();
    return item.creatorDetails?.find((cd) => cd.name.toLowerCase().trim() === nameOnly) || item.creatorDetails?.[0] || null;
  }, [item]);

  const isMainCreatorBand = React.useMemo(() => {
    if (!item) return false;
    const nameOnly = mainCreatorName.toLowerCase();
    if (mainCreatorDetail?.category === 'Band' || (mainCreatorDetail?.bandMembers && mainCreatorDetail.bandMembers.length > 0)) {
      return true;
    }
    if (mainCreatorExplicitRole?.toLowerCase() === 'band') {
      return true;
    }
    return allItems.some((i) =>
      i.creatorDetails?.some((cd) => cd.name.toLowerCase().trim() === nameOnly && (cd.category === 'Band' || (cd.bandMembers && cd.bandMembers.length > 0)))
    );
  }, [item, mainCreatorName, mainCreatorDetail, mainCreatorExplicitRole, allItems]);

  // Product-specific band lineup (members who took role in this product)
  const productBandMembers = React.useMemo(() => {
    if (!item || !isMainCreatorBand) {
      return { participating: [], nonParticipating: [], allMembers: [] };
    }
    const nameOnly = mainCreatorName.toLowerCase();

    // 1. Check current item's creatorDetails
    let members = mainCreatorDetail?.bandMembers || [];

    // 2. If item doesn't have bandMembers attached directly, check allItems to retrieve known roster
    if (members.length === 0) {
      for (const i of allItems) {
        const matchingCd = i.creatorDetails?.find(
          (cd) => cd.name.toLowerCase().trim() === nameOnly && cd.bandMembers && cd.bandMembers.length > 0
        );
        if (matchingCd?.bandMembers && matchingCd.bandMembers.length > 0) {
          members = matchingCd.bandMembers;
          break;
        }
      }
    }

    const participating = members.filter((m) => m.participatedInProduct !== false);
    const nonParticipating = members.filter((m) => m.participatedInProduct === false);

    return { participating, nonParticipating, allMembers: members };
  }, [item, isMainCreatorBand, mainCreatorName, mainCreatorDetail, allItems]);

  // All other creators (collaborators, producers, writers, composers, etc.)
  const otherCreatorsList = React.useMemo(() => {
    if (!item) return [];
    const mainName = mainCreatorName.toLowerCase();
    const map = new Map<string, {
      name: string;
      role: string;
      category?: string;
      nation?: string;
      wikiUrl?: string;
      photoUrl?: string;
    }>();

    // 1. Process otherCreators string array (e.g. "Name / Role")
    if (item.otherCreators && Array.isArray(item.otherCreators)) {
      item.otherCreators.forEach((entry) => {
        if (!entry || !entry.trim()) return;
        const parts = entry.split('/');
        const name = parts[0].trim();
        const role = parts[1]?.trim() || 'Contributor';
        const key = name.toLowerCase();
        if (key !== mainName && !map.has(key)) {
          map.set(key, { name, role });
        }
      });
    }

    // 2. Process creatorDetails metadata
    if (item.creatorDetails && Array.isArray(item.creatorDetails)) {
      item.creatorDetails.forEach((cd) => {
        if (!cd || !cd.name || !cd.name.trim()) return;
        const name = cd.name.trim();
        const key = name.toLowerCase();
        if (key === mainName) return;

        const existing = map.get(key);
        if (existing) {
          if (cd.category) existing.category = cd.category;
          if (cd.nation) existing.nation = cd.nation;
          if (cd.wikiUrl) existing.wikiUrl = cd.wikiUrl;
          if (cd.photoUrl) existing.photoUrl = cd.photoUrl;
          if (cd.category && existing.role === 'Contributor') {
            existing.role = cd.category;
          }
        } else {
          map.set(key, {
            name,
            role: cd.category || 'Contributor',
            category: cd.category,
            nation: cd.nation,
            wikiUrl: cd.wikiUrl,
            photoUrl: cd.photoUrl,
          });
        }
      });
    }

    // Populate missing nation/wikiUrl from allItems
    map.forEach((creator, key) => {
      if (!creator.nation || !creator.wikiUrl) {
        for (const i of allItems) {
          const detail = i.creatorDetails?.find((cd) => cd.name.toLowerCase().trim() === key);
          if (detail) {
            if (!creator.nation && detail.nation) creator.nation = detail.nation;
            if (!creator.wikiUrl && detail.wikiUrl) creator.wikiUrl = detail.wikiUrl;
            if (!creator.photoUrl && detail.photoUrl) creator.photoUrl = detail.photoUrl;
          }
        }
      }
    });

    return Array.from(map.values());
  }, [item, mainCreatorName, allItems]);

  if (!item) return null;

  const scoreInfo = getScoreLevelInfo(item.hornetScore);
  const reviewContent = getItemReview(item);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-4xl my-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-200 max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Scrollable Container (no pinned metadata tab overhead) */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* Top Bar with Share and Close Actions (scrolls naturally with modal, not pinned over reading) */}
          <div className="flex items-center justify-between gap-2 pb-1">
            <div className="text-xs font-mono text-slate-500 truncate">
              Archive Entry
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isAdmin && (
                <button
                  id={`modal-download-btn-${item.id}`}
                  onClick={handleDownloadCardAndReviews}
                  disabled={downloading}
                  className={`p-1.5 sm:px-2.5 sm:py-1 rounded-lg border text-xs font-mono font-medium flex items-center gap-1.5 transition cursor-pointer ${
                    downloaded
                      ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
                      : downloading
                      ? 'bg-purple-950/80 border-purple-500/60 text-purple-300'
                      : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-slate-100'
                  }`}
                  title="Download card and 2-4 review photos (Admin)"
                >
                  {downloading ? (
                    <>
                      <Loader2 size={13} className="animate-spin text-purple-400" />
                      <span className="text-[11px] font-medium">{downloadProgress || 'Exporting...'}</span>
                    </>
                  ) : downloaded ? (
                    <>
                      <Check size={13} className="text-emerald-400" />
                      <span className="text-[11px] font-bold text-emerald-300">Saved!</span>
                    </>
                  ) : (
                    <>
                      <Download size={13} className="text-slate-400" />
                      <span className="hidden sm:inline">Export PNGs</span>
                    </>
                  )}
                </button>
              )}

              <button
                onClick={handleCopyLink}
                className={`p-1.5 sm:px-2.5 sm:py-1 rounded-lg border text-xs font-mono font-medium flex items-center gap-1.5 transition cursor-pointer ${
                  copiedLink
                    ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300'
                    : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-slate-100'
                }`}
                title="Copy shareable link for this entry"
              >
                {copiedLink ? (
                  <>
                    <Check size={13} className="text-emerald-400" />
                    <span className="text-[11px] hidden sm:inline">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} className="text-slate-400" />
                    <span className="hidden sm:inline">Share</span>
                  </>
                )}
              </button>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition cursor-pointer"
                title="Close"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Main Hero Header: PC Wallpaper Widescreen Image Banner */}
          <div className="space-y-4 bg-slate-950/90 p-4 sm:p-5 rounded-2xl border border-slate-800">
            {/* PC Wallpaper Frame (Aspect 16:9 / Widescreen Banner) */}
            <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl group">
              <SmartImage
                src={item.cover}
                alt={item.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-80" />
              
              <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-3">
                <div className="space-y-1">
                  <h1 className="text-xl sm:text-3xl font-extrabold text-slate-100 font-mono tracking-tight leading-snug drop-shadow-md">
                    {item.title}
                  </h1>
                </div>

                {/* Score badge */}
                <div className="shrink-0 flex items-center gap-1.5 bg-slate-950/90 border border-amber-500/40 px-3 py-1 rounded-lg shadow-lg">
                  <span className={`text-lg sm:text-xl font-black font-mono ${scoreInfo.color}`}>
                    {item.hornetScore}
                  </span>
                  <span className="text-xs text-slate-400 font-mono font-bold">/ 10</span>
                </div>
              </div>
            </div>

            {/* Tidy Metadata Information Strip */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs font-mono pt-0.5">
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700/80 text-[10px] sm:text-xs text-amber-300 font-semibold flex items-center gap-1 shrink-0">
                {item.isCustomCategory && <Tag size={10} className="text-amber-400" />}
                <span>{item.isCustomCategory ? (item.customCategoryName || item.mediaFormat) : item.mediaFormat}</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900/80 border border-slate-800 text-[10px] sm:text-xs text-slate-300 flex items-center gap-1 shrink-0">
                <Calendar size={11} className="text-slate-400" /> {item.releaseDate}
              </span>
              {item.countryOfOrigin && (
                <span className="px-2 py-0.5 rounded bg-slate-900/80 border border-slate-800 text-[10px] sm:text-xs text-amber-200/90 flex items-center gap-1 shrink-0">
                  <Globe size={11} className="text-slate-400" />
                  <span className="text-slate-500 text-[9px] sm:text-[10px]">Origin:</span>
                  <span className="font-semibold">{item.countryOfOrigin}</span>
                </span>
              )}
              {item.originalLanguage && (
                <span className="px-2 py-0.5 rounded bg-slate-900/80 border border-slate-800 text-[10px] sm:text-xs text-cyan-200/90 flex items-center gap-1 shrink-0">
                  <Languages size={11} className="text-slate-400" />
                  <span className="text-slate-500 text-[9px] sm:text-[10px]">Lang:</span>
                  <span className="font-semibold">{item.originalLanguage}</span>
                </span>
              )}
              {item.consumedVersion && (
                <span className="px-2 py-0.5 rounded bg-purple-950/60 border border-purple-500/40 text-[10px] sm:text-xs text-purple-300 flex items-center gap-1 shrink-0">
                  <span className="text-purple-400/70">Consumed:</span>
                  <span className="font-bold">{item.consumedVersion}</span>
                </span>
              )}
            </div>

            {/* Creators Row */}
            <div className="space-y-3 pt-1">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 font-mono">
                {/* Main Creator Pill */}
                <div
                  onClick={() => {
                    if (onCreatorClick) {
                      onCreatorClick(mainCreatorName);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition cursor-pointer font-bold"
                  title={isMainCreatorBand ? `View Band Bio for ${mainCreatorName}` : `View Creator Bio for ${mainCreatorName}`}
                >
                  {isMainCreatorBand ? <Users size={14} className="text-amber-400" /> : <User size={14} />}
                  <span>{mainCreatorName}</span>
                  {isMainCreatorBand ? (
                    <span className="text-amber-400/80 text-[10px] bg-amber-500/20 px-1.5 py-0.2 rounded font-normal">Band</span>
                  ) : mainCreatorExplicitRole ? (
                    <span className="text-amber-400/70 text-[11px] font-normal">({mainCreatorExplicitRole})</span>
                  ) : mainCreatorDetail?.category ? (
                    <span className="text-amber-400/70 text-[11px] font-normal">({mainCreatorDetail.category})</span>
                  ) : null}
                </div>

                {/* Participating Band Members quick tags (if band) */}
                {isMainCreatorBand && productBandMembers.participating.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {productBandMembers.participating.map((member, i) => {
                      const displayRole = member.productRole || member.bandRole || 'Member';
                      return (
                        <span
                          key={`bm-quick-${i}`}
                          onClick={() => {
                            if (onCreatorClick) {
                              onCreatorClick(member.name);
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-amber-500/20 text-slate-200 hover:text-amber-300 hover:border-amber-500/40 transition cursor-pointer"
                          title={`View artist bio for ${member.name} (${displayRole})`}
                        >
                          <User size={11} className="text-amber-400/80" />
                          <span>{member.name}</span>
                          <span className="text-slate-400 text-[10px]">({displayRole})</span>
                        </span>
                      );
                    })}
                    {productBandMembers.nonParticipating.length > 0 && (
                      <span className="text-[10px] text-slate-500 font-mono italic self-center">
                        (Not on release: {productBandMembers.nonParticipating.map((m) => m.name).join(', ')})
                      </span>
                    )}
                  </div>
                )}

                {/* Other Creators quick tags */}
                {otherCreatorsList.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    {otherCreatorsList.map((creator, i) => (
                      <span
                        key={`oc-quick-${i}`}
                        onClick={() => {
                          if (onCreatorClick) {
                            onCreatorClick(creator.name);
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-amber-300 hover:border-slate-700 transition cursor-pointer"
                        title={`View creator bio for ${creator.name} (${creator.role})`}
                      >
                        <Users size={12} className="text-slate-500" />
                        <span>{creator.name}</span>
                        {creator.role && <span className="text-slate-500 text-[10px]">({creator.role})</span>}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Admin Controls bar inside modal */}
          {isAdmin && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs">
              <span className="font-semibold flex items-center gap-1.5 font-mono">
                <Info size={14} /> Admin Controls
              </span>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                <button
                  id={`admin-panel-download-btn-${item.id}`}
                  onClick={handleDownloadCardAndReviews}
                  disabled={downloading}
                  className="px-3 py-1.5 rounded-lg bg-purple-950 hover:bg-purple-900 text-purple-200 border border-purple-700/60 font-mono text-xs flex items-center gap-1.5 transition cursor-pointer"
                  title="Download card and 2-4 review photos as PNGs"
                >
                  {downloading ? (
                    <>
                      <Loader2 size={13} className="animate-spin text-purple-300" />
                      <span>{downloadProgress || 'Exporting...'}</span>
                    </>
                  ) : downloaded ? (
                    <>
                      <Check size={13} className="text-emerald-400" />
                      <span className="text-emerald-300">Saved!</span>
                    </>
                  ) : (
                    <>
                      <Download size={13} className="text-purple-300" />
                      <span>Download PNGs</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => onEdit(item)}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold font-mono text-xs flex items-center gap-1 transition"
                >
                  <Edit size={13} /> Edit Entry
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete "${item.title}" from the database?`)) {
                      onDelete(item.id);
                      onClose();
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-700/50 font-mono text-xs flex items-center gap-1 transition"
                >
                  <Trash2 size={13} /> Delete Entry
                </button>
              </div>
            </div>
          )}

          {/* Interconnected Soundtrack Section (Only shown if soundtrack exists/is linked) */}
          {isCurrentItemSoundtrack && (
            <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-800/60 space-y-2.5 font-mono">
              <div className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                <Disc size={15} className="text-purple-400" /> Soundtrack For Media Entry
              </div>
              {parentMediaEntry ? (
                <div
                  onClick={() => {
                    if (onSimilarClick) {
                      onSimilarClick(parentMediaEntry);
                    }
                  }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-900 border border-purple-800/80 hover:border-purple-400 cursor-pointer transition group shadow-md"
                >
                  <div className="w-12 h-12 rounded overflow-hidden bg-slate-950 shrink-0 border border-slate-800">
                    <SmartImage src={parentMediaEntry.cover} alt={parentMediaEntry.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-slate-100 group-hover:text-purple-300 transition truncate">
                      {parentMediaEntry.title}
                    </div>
                    <div className="text-[11px] text-slate-400 font-sans mt-0.5 truncate">
                      {parentMediaEntry.mediaFormat} • {parentMediaEntry.mainCreator} ({parentMediaEntry.releaseDate?.substring(0, 4)})
                    </div>
                  </div>
                  <HornetBadge score={parentMediaEntry.hornetScore} size="sm" />
                </div>
              ) : (
                <div
                  onClick={() => {
                    if (item.soundtrackForTitle) {
                      const titleLower = item.soundtrackForTitle.toLowerCase().trim();
                      const found = allItems.find((i) => i.title.toLowerCase().trim() === titleLower || i.title.toLowerCase().includes(titleLower));
                      if (found && onSimilarClick) {
                        onSimilarClick(found);
                      } else if (onTagClick) {
                        onTagClick(item.soundtrackForTitle);
                      }
                    }
                  }}
                  className="flex items-center justify-between p-3 rounded-lg bg-purple-900/30 border border-purple-800/60 hover:border-purple-400 hover:bg-purple-900/50 cursor-pointer transition group shadow-md"
                >
                  <div className="text-xs text-purple-200 font-sans">
                    Official Soundtrack for <span className="font-mono font-bold text-amber-300 group-hover:underline">{item.soundtrackForTitle || 'Main Media Entry'}</span>
                  </div>
                  <span className="text-[10px] font-mono text-purple-300 bg-purple-950 px-2.5 py-1 rounded-md border border-purple-700/50 group-hover:bg-purple-900 group-hover:text-purple-100 transition">
                    View Product
                  </span>
                </div>
              )}
            </div>
          )}

          {!isCurrentItemSoundtrack && soundtrackAlbumEntries.length > 0 && (
            <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-800/60 space-y-2.5 font-mono">
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                <Disc size={15} className="text-amber-400" /> Official Soundtrack {soundtrackAlbumEntries.length > 1 ? 'Albums' : 'Album'} ({soundtrackAlbumEntries.length})
              </div>
              <div className="space-y-2">
                {soundtrackAlbumEntries.map((st, idx) => {
                  if (st.album) {
                    return (
                      <div
                        key={st.album.id || idx}
                        onClick={() => {
                          if (onSimilarClick && st.album) {
                            onSimilarClick(st.album);
                          }
                        }}
                        className="flex items-center gap-3 p-3 rounded-lg bg-slate-900 border border-indigo-800/80 hover:border-amber-400 cursor-pointer transition group shadow-md"
                      >
                        <div className="w-12 h-12 rounded overflow-hidden bg-slate-950 shrink-0 border border-slate-800">
                          <SmartImage src={st.album.cover} alt={st.album.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-slate-100 group-hover:text-amber-300 transition truncate">
                            {st.album.title}
                          </div>
                          <div className="text-[11px] text-slate-400 font-sans mt-0.5 truncate">
                            Composed & Performed by {st.album.mainCreator}
                          </div>
                        </div>
                        <HornetBadge score={st.album.hornetScore} size="sm" />
                      </div>
                    );
                  }
                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        const matched = allItems.find(
                          (i) => i.mediaFormat === 'Music Album' &&
                          (i.title.toLowerCase().trim() === st.title.toLowerCase().trim() ||
                           i.title.toLowerCase().includes(st.title.toLowerCase().trim()) ||
                           st.title.toLowerCase().includes(i.title.toLowerCase().trim()))
                        );
                        if (matched && onSimilarClick) {
                          onSimilarClick(matched);
                        } else if (onTagClick) {
                          onTagClick(st.title);
                        }
                      }}
                      className="flex items-center justify-between p-3 rounded-lg bg-indigo-900/30 border border-indigo-800/60 hover:border-amber-400 hover:bg-indigo-900/50 cursor-pointer transition group shadow-md"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Disc size={16} className="text-amber-400 shrink-0 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-mono font-bold text-amber-300 group-hover:underline truncate">
                          {st.title}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950 px-2.5 py-1 rounded-md border border-indigo-700/50 group-hover:bg-indigo-900 group-hover:text-indigo-100 transition shrink-0 ml-2">
                        View Soundtrack
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Classification & Spectrum Tags Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1. Main Genres */}
            <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-2">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Layers size={14} /> Genres
              </h4>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {sortedGenres.length > 0 ? (
                  sortedGenres.map((g, idx) => (
                    <button
                      key={`g-${idx}`}
                      onClick={() => {
                        onTagClick(g);
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 transition cursor-pointer"
                      title={`Filter by genre: ${g}`}
                    >
                      {g}
                    </button>
                  ))
                ) : (
                  <span className="text-xs text-slate-500 italic font-mono">No genres listed.</span>
                )}
              </div>
            </div>

            {/* 2. Elements, Tropes & Style Attributes */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Tag size={14} /> Tags
              </h4>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {sortedStyleTags.length > 0 ? (
                  sortedStyleTags.map((st, idx) => (
                    <button
                      key={`st-${idx}`}
                      onClick={() => {
                        onTagClick(st);
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-mono bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-200 border border-emerald-800/50 transition cursor-pointer flex items-center gap-1"
                      title={`Filter by style tag: ${st}`}
                    >
                      <span className="text-[10px] text-emerald-400 font-sans">#</span>
                      <span>{st}</span>
                    </button>
                  ))
                ) : (
                  <span className="text-xs text-slate-500 italic font-mono">No tags assigned.</span>
                )}
              </div>
            </div>

            {/* 3. Philosophical Themes */}
            <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-900/40 space-y-2">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <BookOpen size={14} /> Themes
              </h4>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {sortedPhilosophicalTags.length > 0 ? (
                  sortedPhilosophicalTags.map((tag, idx) => (
                    <button
                      key={`phil-${idx}`}
                      onClick={() => {
                        onTagClick(tag);
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-mono bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 border border-indigo-800/60 transition cursor-pointer"
                      title={`Filter by tag: ${tag}`}
                    >
                      {tag}
                    </button>
                  ))
                ) : (
                  <span className="text-xs text-slate-500 italic font-mono">No themes assigned.</span>
                )}
              </div>
            </div>
          </div>

          {/* Linear Review Article */}
          <article className="p-6 sm:p-8 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <h3 className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-amber-400">
                  Review & Critical Assessment
                </h3>
              </div>
              <div className="text-xs font-mono text-slate-400">
                <span className="text-amber-400 font-bold">{item.hornetScore}/10</span>
              </div>
            </div>

            {reviewContent ? (
              <div className="text-slate-200 text-sm sm:text-base leading-relaxed sm:leading-loose font-sans space-y-4 pt-1">
                {reviewContent.split(/\n\s*\n/).map((paragraph, pIdx) => (
                  <p key={pIdx} className="text-slate-200/95">
                    {paragraph.trim()}
                  </p>
                ))}
              </div>
            ) : (
              <div className="text-xs font-mono text-slate-500 italic py-4">
                No linear review written yet for this entry.
              </div>
            )}
          </article>

          {/* Medium Influences & Similar Media Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800 pt-4">
            {/* Medium Influences */}
            <div>
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1.5">
                <Quote size={14} /> Influences
              </h4>
              <div className="flex flex-col gap-2">
                {item.mediumInfluences && item.mediumInfluences.length > 0 ? (
                  item.mediumInfluences.map((inf, idx) => {
                    const titleStr = typeof inf === 'string' ? inf : inf.title;
                    const customCover = typeof inf === 'object' ? inf.customCover : undefined;
                    const isExplicitCreator = typeof inf === 'object' && inf.type === 'creator';
                    const isExplicitlyUnlinked = typeof inf === 'object' && inf.unlinked === true;
                    const note = typeof inf === 'object' ? inf.note : undefined;

                    // Match media item by title
                    const matched = !isExplicitlyUnlinked ? allItems.find(
                      (i) => i.title.toLowerCase().trim() === titleStr.toLowerCase().trim()
                    ) : undefined;

                    // Match creator by name across allItems
                    const matchedCreatorItem = !isExplicitlyUnlinked ? allItems.find(
                      (i) =>
                        i.mainCreator?.toLowerCase().trim() === titleStr.toLowerCase().trim() ||
                        i.otherCreators?.some((c) => c.toLowerCase().trim() === titleStr.toLowerCase().trim()) ||
                        i.creatorDetails?.some((cd) => cd.name.toLowerCase().trim() === titleStr.toLowerCase().trim())
                    ) : undefined;

                    // Get canonical creator name if matched
                    const matchedCreatorName = matchedCreatorItem ? (
                      matchedCreatorItem.mainCreator?.toLowerCase().trim() === titleStr.toLowerCase().trim()
                        ? matchedCreatorItem.mainCreator
                        : matchedCreatorItem.creatorDetails?.find((cd) => cd.name.toLowerCase().trim() === titleStr.toLowerCase().trim())?.name || titleStr
                    ) : titleStr;

                    if (matched) {
                      return (
                        <div
                          key={`inf-matched-${idx}`}
                          onClick={() => {
                            if (onSimilarClick) {
                              onSimilarClick(matched);
                            }
                          }}
                          className="flex items-center gap-3 p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-amber-500/30 hover:border-amber-400/60 transition cursor-pointer group"
                        >
                          <div className="w-11 h-11 rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-slate-700">
                            <SmartImage
                              src={matched.cover}
                              alt={matched.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-slate-200 group-hover:text-amber-300 font-mono truncate">
                              {matched.title}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                              <span>{matched.mediaFormat}</span>
                              <span>•</span>
                              <span className="text-amber-400 font-bold">{matched.hornetScore}/10</span>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                            Linked Media
                          </span>
                        </div>
                      );
                    }

                    if (matchedCreatorItem) {
                      return (
                        <div
                          key={`inf-creator-${idx}`}
                          onClick={() => {
                            if (onCreatorClick) {
                              onCreatorClick(matchedCreatorName);
                            }
                          }}
                          className="flex items-center gap-3 p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-indigo-500/30 hover:border-indigo-400/60 transition cursor-pointer group"
                        >
                          {customCover ? (
                            <div className="w-11 h-11 rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-slate-700">
                              <SmartImage src={customCover} alt={matchedCreatorName} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div className="w-11 h-11 rounded-lg bg-indigo-950/60 border border-indigo-800 flex items-center justify-center shrink-0 text-indigo-300 font-bold text-sm">
                              {matchedCreatorName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-slate-200 group-hover:text-indigo-300 font-mono truncate">
                              {matchedCreatorName}
                            </div>
                            <div className="text-[10px] text-indigo-300 font-mono italic truncate">
                              {note || 'Linked Creator Bio'}
                            </div>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shrink-0">
                            Creator Bio
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={`inf-raw-${idx}`}
                        className="flex items-center gap-3 p-2 rounded-xl bg-slate-950/50 border border-slate-800 text-xs font-mono text-slate-300"
                      >
                        {customCover ? (
                          <div className="w-11 h-11 rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-slate-800">
                            <SmartImage src={customCover} alt={titleStr} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-11 h-11 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 text-slate-500 font-bold text-sm">
                            {titleStr.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-slate-300 truncate">{titleStr}</div>
                          <div className="text-[10px] text-slate-500 italic">
                            {isExplicitlyUnlinked ? 'Explicitly Unlinked' : 'Uncataloged Reference'}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <span className="text-xs text-slate-500 italic font-mono">No medium influences listed.</span>
                )}
              </div>
            </div>

            {/* Similar Media */}
            <div>
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 mb-2 flex items-center gap-1.5">
                <Award size={14} /> Similar Works
              </h4>
              <div className="flex flex-col gap-2">
                {item.similarMedia && item.similarMedia.length > 0 ? (
                  item.similarMedia.map((sim, idx) => {
                    const titleStr = typeof sim === 'string' ? sim : sim.title;
                    const customCover = typeof sim === 'object' ? sim.customCover : undefined;
                    const isExplicitlyUnlinked = typeof sim === 'object' && sim.unlinked === true;

                    const matched = !isExplicitlyUnlinked ? allItems.find(
                      (i) => i.title.toLowerCase().trim() === titleStr.toLowerCase().trim()
                    ) : undefined;

                    const matchedCreatorItem = !isExplicitlyUnlinked ? allItems.find(
                      (i) =>
                        i.mainCreator?.toLowerCase().trim() === titleStr.toLowerCase().trim() ||
                        i.creatorDetails?.some((cd) => cd.name.toLowerCase().trim() === titleStr.toLowerCase().trim())
                    ) : undefined;

                    const matchedCreatorName = matchedCreatorItem ? (
                      matchedCreatorItem.mainCreator?.toLowerCase().trim() === titleStr.toLowerCase().trim()
                        ? matchedCreatorItem.mainCreator
                        : matchedCreatorItem.creatorDetails?.find((cd) => cd.name.toLowerCase().trim() === titleStr.toLowerCase().trim())?.name || titleStr
                    ) : titleStr;

                    if (matched) {
                      return (
                        <div
                          key={`sim-matched-${idx}`}
                          onClick={() => {
                            if (onSimilarClick) {
                              onSimilarClick(matched);
                            }
                          }}
                          className="flex items-center gap-3 p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-cyan-500/30 hover:border-cyan-400/60 transition cursor-pointer group"
                        >
                          <div className="w-11 h-11 rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-slate-700">
                            <SmartImage
                              src={matched.cover}
                              alt={matched.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 font-mono truncate">
                              {matched.title}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                              <span>{matched.mediaFormat}</span>
                              <span>•</span>
                              <span className="text-amber-400 font-bold">{matched.hornetScore}/10</span>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                            Inspect
                          </span>
                        </div>
                      );
                    }

                    if (matchedCreatorItem) {
                      return (
                        <div
                          key={`sim-creator-${idx}`}
                          onClick={() => {
                            if (onCreatorClick) {
                              onCreatorClick(matchedCreatorName);
                            }
                          }}
                          className="flex items-center gap-3 p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-indigo-500/30 hover:border-indigo-400/60 transition cursor-pointer group"
                        >
                          <div className="w-11 h-11 rounded-lg bg-indigo-950/60 border border-indigo-800 flex items-center justify-center shrink-0 text-indigo-300 font-bold text-sm">
                            {matchedCreatorName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-slate-200 group-hover:text-indigo-300 font-mono truncate">
                              {matchedCreatorName}
                            </div>
                            <div className="text-[10px] text-indigo-300 font-mono italic truncate">
                              Linked Creator Bio
                            </div>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shrink-0">
                            Creator Bio
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={`sim-raw-${idx}`}
                        className="flex items-center gap-3 p-2 rounded-xl bg-slate-950/50 border border-slate-800 text-xs font-mono text-slate-300"
                      >
                        {customCover ? (
                          <div className="w-11 h-11 rounded-lg overflow-hidden bg-slate-900 shrink-0 border border-slate-800">
                            <SmartImage src={customCover} alt={titleStr} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-11 h-11 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 text-cyan-400/60 font-bold text-sm">
                            {titleStr.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-slate-200 truncate">{titleStr}</div>
                          <div className="text-[10px] text-slate-500 italic">Uncataloged media</div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <span className="text-xs text-slate-500 italic font-mono">No similar media logged.</span>
                )}
              </div>
            </div>
          </div>

          {/* External Links */}
          <div className="border-t border-slate-800 pt-4">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
              <LinkIcon size={12} /> Reference Links
            </h4>
            <div className="flex flex-wrap gap-2">
              {item.links && item.links.length > 0 ? (
                item.links.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-slate-700 text-xs font-mono font-medium transition shadow-sm"
                  >
                    <span>{link.label}</span>
                    <ExternalLink size={12} />
                  </a>
                ))
              ) : (
                <span className="text-xs text-slate-500 italic font-mono">No external links attached.</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
