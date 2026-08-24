import React, { useState, useRef } from 'react';
import { MediaItem } from '../types';
import { HornetBadge } from './HornetBadge';
import { Calendar, User, Film, BookOpen, Gamepad2, Tv, Bookmark, Disc, Palette, Image as ImageIcon, FileText, Globe, Tag, Download, Check, Loader2 } from 'lucide-react';
import { SmartImage } from './SmartImage';
import { extractReleaseYear } from '../utils/dateUtils';
import { downloadMediaItemCardPng } from '../utils/downloadUtils';

interface MediaCardProps {
  item: MediaItem;
  onClick: (item: MediaItem) => void;
  onTagClick?: (tag: string) => void;
  onCreatorClick?: (creatorName: string) => void;
  isAdmin?: boolean;
  onDownload?: (item: MediaItem) => void;
}

export const MediaCardComponent: React.FC<MediaCardProps> = ({
  item,
  onClick,
  onTagClick,
  onCreatorClick,
  isAdmin = false,
  onDownload,
}) => {
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleDownloadClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (downloading) return;

    setDownloading(true);
    try {
      if (onDownload) {
        onDownload(item);
      } else {
        await downloadMediaItemCardPng(cardRef.current, item);
      }
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 2000);
    } catch (err) {
      console.error('Failed to download card PNG:', err);
    } finally {
      setDownloading(false);
    }
  };

  const getFormatIcon = (format: string) => {
    switch (format) {
      case 'Film':
        return <Film size={12} />;
      case 'Video Game':
        return <Gamepad2 size={12} />;
      case 'Music Album':
        return <Disc size={12} />;
      case 'Painting':
        return <Palette size={12} />;
      case 'Artwork':
        return <ImageIcon size={12} />;
      case 'TV Show':
        return <Tv size={12} />;
      case 'Comic/Manga Series':
        return <FileText size={12} />;
      case 'Book':
        return <BookOpen size={12} />;
      default:
        return <Bookmark size={12} />;
    }
  };

  const parsedYear = extractReleaseYear(item.releaseDate);
  const releaseYear = parsedYear ? String(parsedYear) : (item.releaseDate ? item.releaseDate.substring(0, 4) : 'N/A');

  const genres = item.genres || [];
  const styleTags = item.genreStyleTags || [];
  const philosophicalTags = item.philosophicalTags || [];

  return (
    <div
      ref={cardRef}
      onClick={() => onClick(item)}
      className="group relative w-full min-w-0 bg-slate-900 hover:bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-lg overflow-hidden shadow-sm transition-colors flex flex-col cursor-pointer [content-visibility:auto] [contain-intrinsic-size:320px] contain-content"
    >
      {/* Cover Image Container */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-950">
        <SmartImage
          src={item.cover}
          alt={item.title}
          adaptive={false}
          className="w-full h-full object-cover object-center group-hover:scale-102 transition-transform duration-200 opacity-90 group-hover:opacity-100"
          loading="lazy"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-black/30 pointer-events-none" />

        {/* Format & Soundtrack Badge */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-950/90 border border-slate-800 text-slate-200 text-[11px] font-mono font-medium shadow-sm">
            <span className={item.isCustomCategory ? "text-amber-400" : "text-purple-400"}>
              {item.isCustomCategory ? <Tag size={12} /> : getFormatIcon(item.mediaFormat)}
            </span>
            <span>{item.isCustomCategory ? (item.customCategoryName || item.mediaFormat) : item.mediaFormat}</span>
          </div>
          {item.mediaFormat === 'Music Album' && item.isSoundtrack && (
            <div className="px-1.5 py-0.5 rounded bg-purple-950/90 border border-purple-800 text-purple-300 text-[10px] font-mono font-bold shadow-sm flex items-center gap-1">
              <Disc size={10} className="text-purple-400" /> OST
            </div>
          )}
        </div>

        {/* Top-Right Badges: Admin Single-Click Download & Hornet Score */}
        <div className="absolute top-2.5 right-2.5 flex items-center justify-end gap-1.5 z-10 pointer-events-auto">
          {isAdmin && (
            <button
              id={`download-card-${item.id}`}
              type="button"
              data-no-export="true"
              onClick={handleDownloadClick}
              disabled={downloading}
              title="Download card as PNG image (Admin)"
              aria-label={`Download ${item.title} card as PNG`}
              className={`px-2 py-1 rounded bg-slate-950/90 hover:bg-purple-600 border ${
                downloaded
                  ? 'border-emerald-500 text-emerald-400 bg-slate-950'
                  : downloading
                  ? 'border-purple-500 text-purple-300 bg-slate-950'
                  : 'border-slate-800 hover:border-purple-500 text-slate-300 hover:text-white'
              } font-mono text-[10px] flex items-center gap-1 shadow-md transition-colors cursor-pointer group/dl`}
            >
              {downloading ? (
                <>
                  <Loader2 size={11} className="animate-spin text-purple-400" />
                  <span className="text-[10px] text-purple-300 font-medium">PNG...</span>
                </>
              ) : downloaded ? (
                <>
                  <Check size={11} className="text-emerald-400" />
                  <span className="text-[10px] text-emerald-400 font-bold">Saved</span>
                </>
              ) : (
                <>
                  <Download size={11} className="text-slate-300 group-hover/dl:text-white transition-colors" />
                  <span className="text-[10px] font-medium hidden sm:inline">PNG</span>
                </>
              )}
            </button>
          )}
          <HornetBadge score={item.hornetScore} size="sm" showLabel={false} />
        </div>

        {/* Bottom Badges: Release Year, Origin & Consumed Version */}
        <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between gap-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-1 text-slate-300 text-[10px] font-mono bg-slate-950/90 px-1.5 py-0.2 rounded border border-slate-800">
              <Calendar size={10} className="text-slate-400" />
              <span>{releaseYear}</span>
            </div>

            {item.countryOfOrigin && (
              <div className="flex items-center gap-1 text-purple-200 text-[10px] font-mono bg-slate-950/90 px-1.5 py-0.2 rounded border border-slate-800">
                <Globe size={10} className="text-purple-400" />
                <span>{item.countryOfOrigin}</span>
              </div>
            )}
          </div>

          {item.consumedVersion && (
            <div className="text-slate-300 text-[10px] font-mono bg-slate-950/90 px-1.5 py-0.2 rounded border border-slate-800 shrink-0">
              <span>{item.consumedVersion}</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 flex-1 flex flex-col gap-2 min-w-0">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-100 group-hover:text-purple-300 transition-colors line-clamp-1 font-mono tracking-tight">
            {item.title}
          </h3>

          <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5 line-clamp-1 font-mono">
            <User size={11} className="text-slate-500 shrink-0" />
            <span
              onClick={(e) => {
                if (onCreatorClick) {
                  e.stopPropagation();
                  onCreatorClick(item.mainCreator);
                }
              }}
              className="hover:text-purple-300 hover:underline cursor-pointer truncate"
            >
              {item.mainCreator}
            </span>
          </div>
        </div>

        {/* Genres & Tags - unified tight wrap without awkward blank gaps */}
        {(genres.length > 0 || styleTags.length > 0 || philosophicalTags.length > 0) && (
          <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-1 min-w-0">
            {/* Primary: Main Genres */}
            {genres.slice(0, 3).map((genre, idx) => (
              <span
                key={`genre-${idx}`}
                className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-950/70 text-purple-300 border border-purple-800/70 font-semibold truncate max-w-[130px] leading-tight"
                title={`Genre: ${genre}`}
              >
                {genre}
              </span>
            ))}

            {/* Elements / Style Tags */}
            {styleTags.slice(0, 2).map((tag, idx) => (
              <button
                key={`style-${idx}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onTagClick) onTagClick(tag);
                }}
                className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-slate-100 border border-slate-800 hover:border-slate-700 transition-colors truncate max-w-[120px] leading-tight cursor-pointer"
                title={`Tag: ${tag}`}
              >
                {tag}
              </button>
            ))}

            {/* Philosophical Themes */}
            {philosophicalTags.slice(0, 2).map((tag, idx) => (
              <button
                key={`phil-${idx}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onTagClick) onTagClick(tag);
                }}
                className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-indigo-950/50 hover:bg-indigo-900/70 text-indigo-200 hover:text-indigo-100 border border-indigo-900/60 hover:border-indigo-700 transition-colors truncate max-w-[120px] leading-tight cursor-pointer"
                title={`Philosophical Tag: ${tag}`}
              >
                {tag}
              </button>
            ))}

            {/* Overflow indicator if many tags */}
            {genres.length + styleTags.length + philosophicalTags.length > 7 && (
              <span
                className="text-[10px] font-mono text-slate-500 self-center pl-0.5"
                title={[...genres.slice(3), ...styleTags.slice(2), ...philosophicalTags.slice(2)].join(', ')}
              >
                +{genres.length + styleTags.length + philosophicalTags.length - 7}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const MediaCard = React.memo(MediaCardComponent);
