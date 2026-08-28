import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  MediaFormat,
  MediaItem,
  MediaLink,
  CreatorCategory,
  CreatorDetails,
  BandMember,
  MediaRelationEntry,
  getScoreLevelInfo,
  ALL_MEDIA_FORMATS
} from '../types';
import { formatImageUrl, fetchWikipediaImage, isWikipediaArticleUrl } from '../utils/imageUtils';
import { processTagList } from '../utils/tagUtils';
import { normalizeMediaFormat } from '../utils/formatUtils';
import { SmartImage } from './SmartImage';
import {
  X,
  Plus,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  Link as LinkIcon,
  Wand2,
  Save,
  Tag,
  Award,
  User,
  Globe,
  Flag,
  Languages,
  Disc,
  Users
} from 'lucide-react';

interface AdminMediaModalProps {
  isOpen: boolean;
  itemToEdit: MediaItem | null;
  allItems?: MediaItem[];
  onClose: () => void;
  onSave: (item: MediaItem) => void;
  existingPhilosophicalTags: string[];
  existingStyleTags: string[];
}

const MEDIA_FORMATS = ALL_MEDIA_FORMATS;

const CREATOR_CATEGORIES: CreatorCategory[] = [
  'Author',
  'Director',
  'Production Artist',
  'Music Artist',
  'Band',
  'Painter',
  'Game Designer',
  'Developer',
  'Studio / Company',
  'Other'
];

/* =========================================================================
   MEMOIZED SUB-SECTIONS TO GUARANTEE 0MS INSTANT TYPING ACROSS ALL FIELDS
   ========================================================================= */

// 1. Modal Header
const ModalHeader = React.memo<{
  isEditing: boolean;
  onQuickSample: () => void;
  onClose: () => void;
}>(({ isEditing, onQuickSample, onClose }) => {
  return (
    <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800 shrink-0">
      <div className="flex items-center gap-2">
        <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
          <Wand2 size={18} />
        </div>
        <div>
          <h3 className="text-base sm:text-lg font-bold font-mono text-slate-100">
            {isEditing ? 'EDIT MEDIA ARCHIVE ENTRY' : 'ADD NEW MEDIA ARCHIVE ENTRY'}
          </h3>
          <p className="text-xs text-slate-400 font-sans">
            Admin Control Panel
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onQuickSample}
          className="px-3 py-1.5 rounded-lg bg-indigo-950/70 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-700/50 text-xs font-mono flex items-center gap-1 transition cursor-pointer"
          title="Autofill sample fields"
        >
          <Wand2 size={13} />
          <span className="hidden sm:inline">Fill Sample</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
});

// 2. Cover Section
const CoverSection = React.memo<{
  cover: string;
  onChangeCover: (val: string) => void;
}>(({ cover, onChangeCover }) => {
  const [previewSrc, setPreviewSrc] = useState(cover);

  useEffect(() => {
    setPreviewSrc(cover);
  }, [cover]);

  const handleBlur = async () => {
    const trimmed = cover.trim();
    if (trimmed) {
      if (isWikipediaArticleUrl(trimmed)) {
        const wikiImg = await fetchWikipediaImage(trimmed);
        if (wikiImg) {
          onChangeCover(wikiImg);
          setPreviewSrc(wikiImg);
          return;
        }
      }
      const formatted = formatImageUrl(trimmed);
      onChangeCover(formatted);
      setPreviewSrc(formatted);
    }
  };

  return (
    <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
          <ImageIcon size={14} /> Cover Image URL
        </label>
        <span className="text-[10px] font-mono text-slate-400">
          Supports JPG, PNG, WebP, GIF, SVG, AVIF, Data URIs & hotlinks
        </span>
      </div>
      <input
        type="text"
        placeholder="Paste image link, Wikipedia article link, or data URL..."
        value={cover}
        onChange={(e) => {
          onChangeCover(e.target.value);
          setPreviewSrc(e.target.value);
        }}
        onBlur={handleBlur}
        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
      />

      {/* Live Preview Container */}
      <div className="mt-2 flex flex-col sm:flex-row items-center gap-4 p-3 rounded-lg bg-slate-900 border border-slate-800">
        <div className="w-full sm:w-48 aspect-[16/9] bg-slate-950 rounded-lg overflow-hidden border border-slate-700/60 relative flex items-center justify-center shrink-0">
          {previewSrc.trim() ? (
            <SmartImage
              src={previewSrc}
              alt="Cover preview"
              className="w-full h-full object-cover object-center"
            />
          ) : (
            <div className="text-center p-3 text-slate-500 text-xs font-mono">
              <ImageIcon size={24} className="mx-auto mb-1 opacity-50" />
              <span>No Cover URL Entered</span>
            </div>
          )}
        </div>

        <div className="text-xs text-slate-400 space-y-1">
          <p className="font-mono text-slate-300 font-semibold">Live Cover Preview</p>
          <p className="font-sans text-slate-400">
            Accepts any image format or URL version. Referrer blocking protection is enabled automatically for external CDNs.
          </p>
        </div>
      </div>
    </div>
  );
});

// 3. Basic Info Section (Title, Format, Custom Category, Country, Language)
const BasicInfoSection = React.memo<{
  title: string;
  onChangeTitle: (val: string) => void;
  mediaFormat: MediaFormat;
  onChangeMediaFormat: (fmt: MediaFormat) => void;
  isCustomCategory: boolean;
  onChangeIsCustomCategory: (val: boolean) => void;
  customCategoryName: string;
  onChangeCustomCategoryName: (val: string) => void;
  countryOfOrigin: string;
  onChangeCountryOfOrigin: (val: string) => void;
  originalLanguage: string;
  onChangeOriginalLanguage: (val: string) => void;
}>(({
  title,
  onChangeTitle,
  mediaFormat,
  onChangeMediaFormat,
  isCustomCategory,
  onChangeIsCustomCategory,
  customCategoryName,
  onChangeCustomCategoryName,
  countryOfOrigin,
  onChangeCountryOfOrigin,
  originalLanguage,
  onChangeOriginalLanguage
}) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-1">
            Title *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. NieR: Automata, Dune, Disco Elysium..."
            value={title}
            onChange={(e) => onChangeTitle(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-1">
            Media Format / Category *
          </label>
          <select
            value={isCustomCategory ? 'Custom Category' : mediaFormat}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'Custom Category') {
                onChangeIsCustomCategory(true);
                onChangeMediaFormat('Custom Category');
              } else {
                onChangeIsCustomCategory(false);
                onChangeMediaFormat(val as MediaFormat);
              }
            }}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
          >
            {MEDIA_FORMATS.map((fmt) => (
              <option key={fmt} value={fmt}>
                {fmt === 'Custom Category' ? "⭐ Custom Category (Hornet's Page Only)" : fmt}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1">
            <Flag size={12} className="text-amber-400" /> Country of Origin
          </label>
          <input
            type="text"
            placeholder="e.g. Japan, France, USA..."
            value={countryOfOrigin}
            onChange={(e) => onChangeCountryOfOrigin(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>
      </div>

      {/* Custom Category Details Input */}
      {isCustomCategory && (
        <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/50 space-y-2 font-mono animate-fade-in">
          <label className="block text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
            <Tag size={14} className="text-amber-400" />
            Custom Category Name (e.g. Song Review, Boss Fight, Character) *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Song Review, Boss Fight, Character, Random Review..."
            value={customCategoryName}
            onChange={(e) => onChangeCustomCategoryName(e.target.value)}
            className="w-full bg-slate-950 border border-amber-500/60 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-400 font-mono"
          />
          <p className="text-[10px] text-amber-300/90 leading-relaxed">
            ⚡ <strong>Hornet's Page Exclusive:</strong> Entries in custom categories appear on <strong>Hornet's Page</strong> for your custom reviews (songs, boss fights, etc.) and are automatically excluded from the main media list sorted from best to worst.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1">
            <Languages size={12} className="text-amber-400" /> Original Language
          </label>
          <input
            type="text"
            placeholder="e.g. Japanese, French, English, Polish..."
            value={originalLanguage}
            onChange={(e) => onChangeOriginalLanguage(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>
      </div>
    </div>
  );
});

// 4. Soundtrack Section
const SoundtrackSection = React.memo<{
  mediaFormat: MediaFormat;
  isSoundtrack: boolean;
  onChangeIsSoundtrack: (val: boolean) => void;
  soundtrackForId: string;
  onChangeSoundtrackForId: (id: string, title?: string) => void;
  soundtrackForTitle: string;
  onChangeSoundtrackForTitle: (val: string) => void;
  soundtrackEntries: { id?: string; title: string }[];
  onChangeSoundtrackEntries: (entries: { id?: string; title: string }[]) => void;
  targetMediaOptions: React.ReactNode;
  soundtrackAlbumOptions: React.ReactNode;
  allItems: MediaItem[];
}>(({
  mediaFormat,
  isSoundtrack,
  onChangeIsSoundtrack,
  soundtrackForId,
  onChangeSoundtrackForId,
  soundtrackForTitle,
  onChangeSoundtrackForTitle,
  soundtrackEntries,
  onChangeSoundtrackEntries,
  targetMediaOptions,
  soundtrackAlbumOptions,
  allItems
}) => {
  if (mediaFormat === 'Music Album') {
    return (
      <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-800/60 space-y-3 font-mono animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
              <Disc size={15} /> Is it a soundtrack?
            </label>
            <p className="text-[11px] text-slate-400 font-sans mt-0.5">
              Is this album an official original soundtrack (OST) for a film, game, TV show, anime, or book?
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => {
                onChangeIsSoundtrack(false);
                onChangeSoundtrackForId('');
                onChangeSoundtrackForTitle('');
              }}
              className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                !isSoundtrack
                  ? 'bg-slate-800 text-slate-200 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              No
            </button>
            <button
              type="button"
              onClick={() => onChangeIsSoundtrack(true)}
              className={`px-3 py-1 text-xs font-bold rounded-md transition cursor-pointer ${
                isSoundtrack
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Yes
            </button>
          </div>
        </div>

        {isSoundtrack && (
          <div className="pt-3 border-t border-purple-900/50 space-y-2.5 animate-fade-in">
            <label className="block text-xs font-bold uppercase tracking-wider text-purple-200">
              Add the entry (Select media entry this album is soundtrack for):
            </label>
            <select
              value={soundtrackForId}
              onChange={(e) => {
                const selectedId = e.target.value;
                const found = allItems.find((i) => i.id === selectedId);
                onChangeSoundtrackForId(selectedId, found?.title);
              }}
              className="w-full bg-slate-900 border border-purple-700/60 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-purple-400 font-mono"
            >
              <option value="">-- Select Target Entry (Film, Video Game, TV Show, etc.) --</option>
              {targetMediaOptions}
            </select>

            <div className="pt-1">
              <label className="block text-[10px] text-slate-400 mb-1">
                Or specify parent media title manually if not yet logged in database:
              </label>
              <input
                type="text"
                placeholder="e.g. Interstellar, Cyberpunk 2077..."
                value={soundtrackForTitle}
                onChange={(e) => onChangeSoundtrackForTitle(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 font-mono"
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-800/50 space-y-3 font-mono">
      <div className="flex items-center justify-between gap-2">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
            <Disc size={15} /> Official Soundtrack Albums (OSTs)
          </label>
          <p className="text-[11px] text-slate-400 font-sans mt-0.5">
            Link one or more official soundtrack albums associated with this media (e.g. Vol. 1, Original Score, Expansion OST).
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChangeSoundtrackEntries([...soundtrackEntries, { title: '' }])}
          className="px-2.5 py-1 text-xs font-bold bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 rounded-lg border border-indigo-700/60 transition shrink-0 flex items-center gap-1 cursor-pointer"
        >
          <Plus size={13} /> Add OST
        </button>
      </div>

      {soundtrackEntries.length > 0 && (
        <div className="space-y-2 pt-1">
          {soundtrackEntries.map((st, idx) => (
            <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-950/80 p-2 rounded-lg border border-slate-800">
              <select
                value={st.id || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  const found = allItems.find((i) => i.id === val);
                  const updated = [...soundtrackEntries];
                  if (found) {
                    updated[idx] = { id: found.id, title: found.title };
                  } else {
                    updated[idx] = { ...updated[idx], id: undefined };
                  }
                  onChangeSoundtrackEntries(updated);
                }}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono"
              >
                <option value="">-- Select Music Album from DB --</option>
                {soundtrackAlbumOptions}
              </select>

              <input
                type="text"
                placeholder="Or type album title manually..."
                value={st.title}
                onChange={(e) => {
                  const updated = [...soundtrackEntries];
                  updated[idx] = { ...updated[idx], title: e.target.value };
                  onChangeSoundtrackEntries(updated);
                }}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-600 font-mono"
              />

              <button
                type="button"
                onClick={() => {
                  onChangeSoundtrackEntries(soundtrackEntries.filter((_, i) => i !== idx));
                }}
                className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/50 transition self-end sm:self-auto cursor-pointer"
                title="Remove OST"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

// 5. Creator Profile Section
const CreatorSection = React.memo<{
  mainCreator: string;
  onChangeMainCreator: (val: string) => void;
  mainCreatorCategory: CreatorCategory;
  onChangeMainCreatorCategory: (cat: CreatorCategory) => void;
  creatorNation: string;
  onChangeCreatorNation: (val: string) => void;
  mainCreatorWiki: string;
  onChangeMainCreatorWiki: (val: string) => void;
  mainCreatorPhoto: string;
  onChangeMainCreatorPhoto: (val: string) => void;
}>(({
  mainCreator,
  onChangeMainCreator,
  mainCreatorCategory,
  onChangeMainCreatorCategory,
  creatorNation,
  onChangeCreatorNation,
  mainCreatorWiki,
  onChangeMainCreatorWiki,
  mainCreatorPhoto,
  onChangeMainCreatorPhoto
}) => {
  return (
    <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <User size={16} className="text-amber-400" />
        <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
          Creator Profile & Wikipedia Reference
        </h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div>
          <label className="block text-xs font-mono font-bold text-slate-300 mb-1">
            Creator Name *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Stanisław Lem, Yoko Taro..."
            value={mainCreator}
            onChange={(e) => onChangeMainCreator(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-sans"
          />
        </div>

        <div>
          <label className="block text-xs font-mono font-bold text-slate-300 mb-1">
            Creator Category *
          </label>
          <select
            value={mainCreatorCategory}
            onChange={(e) => onChangeMainCreatorCategory(e.target.value as CreatorCategory)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
          >
            {CREATOR_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-mono font-bold text-slate-300 mb-1 flex items-center gap-1">
            <Flag size={12} className="text-amber-400" /> Creator Nation
          </label>
          <input
            type="text"
            placeholder="e.g. Poland, Japan, UK..."
            value={creatorNation}
            onChange={(e) => onChangeCreatorNation(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1">
              <Globe size={12} className="text-amber-400" /> Creator Wikipedia
            </label>
            {mainCreatorWiki && (
              <button
                type="button"
                onClick={async () => {
                  const img = await fetchWikipediaImage(mainCreatorWiki);
                  if (img) onChangeMainCreatorPhoto(img);
                }}
                className="text-[10px] font-mono text-amber-400 hover:text-amber-300 underline cursor-pointer"
              >
                Pull Wiki Image
              </button>
            )}
          </div>
          <input
            type="text"
            placeholder="Creator Bio Wikipedia URL..."
            value={mainCreatorWiki}
            onChange={(e) => onChangeMainCreatorWiki(e.target.value)}
            onBlur={async () => {
              const val = mainCreatorWiki.trim();
              if (val.includes('wikipedia.org') && (!mainCreatorPhoto || isWikipediaArticleUrl(mainCreatorPhoto))) {
                const img = await fetchWikipediaImage(val);
                if (img) onChangeMainCreatorPhoto(img);
              }
            }}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-mono font-bold text-slate-300 mb-1 flex items-center gap-1">
            <ImageIcon size={12} className="text-amber-400" /> Photo URL
          </label>
          <input
            type="text"
            placeholder="Creator Portrait URL or Wikipedia Link..."
            value={mainCreatorPhoto}
            onChange={(e) => onChangeMainCreatorPhoto(e.target.value)}
            onBlur={async () => {
              if (mainCreatorPhoto.trim() && isWikipediaArticleUrl(mainCreatorPhoto)) {
                const img = await fetchWikipediaImage(mainCreatorPhoto);
                if (img) onChangeMainCreatorPhoto(img);
              }
            }}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>
      </div>
    </div>
  );
});

// 6. Band Lineup & Roster Section
const BandLineupSection = React.memo<{
  mainCreator: string;
  bandMembers: BandMember[];
  knownBandMembers: BandMember[];
  onAddBandMember: () => void;
  onAddPresetMember: (role: string) => void;
  onUpdateBandMember: (index: number, field: keyof BandMember, value: any) => void;
  onRemoveBandMember: (index: number) => void;
  onImportBulkText: (text: string) => void;
  onImportKnownMember: (member: BandMember, participated: boolean) => void;
  onImportAllKnownMembers: (participated: boolean) => void;
}>(({
  mainCreator,
  bandMembers,
  knownBandMembers,
  onAddBandMember,
  onAddPresetMember,
  onUpdateBandMember,
  onRemoveBandMember,
  onImportBulkText,
  onImportKnownMember,
  onImportAllKnownMembers
}) => {
  const [showBulkInput, setShowBulkInput] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const handleApplyBulk = () => {
    if (!bulkText.trim()) return;
    onImportBulkText(bulkText);
    setBulkText('');
    setShowBulkInput(false);
  };

  return (
    <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-amber-500/20 pb-3">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-amber-400" />
          <div>
            <h5 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-300">
              Band Roster & Lineup for this Product ({bandMembers.length})
            </h5>
            <p className="text-[11px] font-mono text-slate-400">
              Specify members, multi-roles (e.g. "Guitarist, Vocalist, Director"), and whether they worked on this release.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 self-end sm:self-center">
          <button
            type="button"
            onClick={() => setShowBulkInput(!showBulkInput)}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 font-mono text-xs transition flex items-center gap-1 cursor-pointer"
          >
            <Plus size={12} />
            <span>{showBulkInput ? 'Close Bulk' : 'Bulk Paste'}</span>
          </button>

          {knownBandMembers.length > 0 && (
            <button
              type="button"
              onClick={() => onImportAllKnownMembers(true)}
              className="px-2.5 py-1 rounded bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-500/40 font-mono text-xs transition flex items-center gap-1 cursor-pointer"
            >
              <Users size={12} />
              <span>Add All Known ({knownBandMembers.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={onAddBandMember}
            className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs transition flex items-center gap-1 shadow cursor-pointer"
          >
            <Plus size={13} />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* KNOWN BAND MEMBERS FROM DATABASE */}
      {knownBandMembers.length > 0 && (
        <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-amber-400/90 uppercase tracking-wide flex items-center gap-1.5">
              <Users size={12} />
              <span>Known Members of "{mainCreator}" in database</span>
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              Click to toggle participation for this product
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {knownBandMembers.map((km, kIdx) => {
              const existing = bandMembers.find(
                (bm) => bm.name.toLowerCase().trim() === km.name.toLowerCase().trim()
              );
              const isAdded = !!existing;
              const worked = existing ? existing.participatedInProduct !== false : false;

              return (
                <div
                  key={kIdx}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-mono flex items-center gap-2 transition ${
                    isAdded
                      ? worked
                        ? 'bg-amber-950/50 border-amber-500/50 text-amber-200'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-amber-500/40'
                  }`}
                >
                  <span className="font-bold">{km.name}</span>
                  <span className="text-[10px] text-slate-400">({km.bandRole || 'Member'})</span>

                  <div className="flex items-center gap-1 ml-1">
                    <button
                      type="button"
                      onClick={() => onImportKnownMember(km, true)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                        isAdded && worked
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 hover:bg-amber-500/30 text-amber-300'
                      }`}
                      title="Set as Worked on this product"
                    >
                      Worked
                    </button>
                    <button
                      type="button"
                      onClick={() => onImportKnownMember(km, false)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                        isAdded && !worked
                          ? 'bg-rose-900 text-rose-200'
                          : 'bg-slate-800 hover:bg-rose-900/40 text-slate-400'
                      }`}
                      title="Set as Unworked on this product"
                    >
                      Unworked
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* BULK PASTE INPUT AREA */}
      {showBulkInput && (
        <div className="p-3 bg-slate-950 rounded-xl border border-amber-500/40 space-y-2 animate-fade-in">
          <label className="block text-xs font-mono font-bold text-amber-300">
            Bulk Paste Members List
          </label>
          <p className="text-[11px] font-mono text-slate-400">
            Format example: <code className="text-amber-200">Freddie Mercury (Guitarist, Vocalist, Director), Brian May (Lead Guitar, Vocals)</code>
            <br />
            Commas inside parentheses are preserved as a single member's multi-role list!
          </p>
          <textarea
            rows={3}
            placeholder="Paste comma or newline separated members e.g.&#10;Freddie Mercury (Vocalist, Pianist, Director),&#10;Brian May (Guitarist, Vocalist),&#10;Roger Taylor (Drummer, Vocalist)"
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowBulkInput(false)}
              className="px-3 py-1 rounded bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-mono cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyBulk}
              className="px-3 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs font-mono cursor-pointer"
            >
              Parse & Add Roster
            </button>
          </div>
        </div>
      )}

      {/* CURRENT BAND MEMBERS LIST */}
      {bandMembers.length === 0 ? (
        <div className="p-4 bg-slate-900/60 rounded-xl border border-dashed border-amber-500/30 text-center space-y-2">
          <p className="text-xs font-mono text-amber-300/80">No members added to this band lineup yet.</p>
          <div className="flex flex-wrap justify-center gap-1.5">
            <button
              type="button"
              onClick={() => onAddPresetMember('Vocalist')}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono text-xs border border-slate-700 cursor-pointer"
            >
              + Vocalist
            </button>
            <button
              type="button"
              onClick={() => onAddPresetMember('Guitarist, Vocalist')}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono text-xs border border-slate-700 cursor-pointer"
            >
              + Guitarist, Vocalist
            </button>
            <button
              type="button"
              onClick={() => onAddPresetMember('Bass Player')}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono text-xs border border-slate-700 cursor-pointer"
            >
              + Bass Player
            </button>
            <button
              type="button"
              onClick={() => onAddPresetMember('Drummer')}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono text-xs border border-slate-700 cursor-pointer"
            >
              + Drummer
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {bandMembers.map((member, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl border bg-slate-900 border-slate-800 hover:border-amber-500/40 space-y-2.5 transition"
            >
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
                {/* Member Name */}
                <div className="sm:col-span-5">
                  <label className="block text-[10px] font-mono text-slate-400 mb-0.5">
                    Member Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Freddie Mercury"
                    value={member.name}
                    onChange={(e) => onUpdateBandMember(idx, 'name', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                {/* Band Role */}
                <div className="sm:col-span-6">
                  <label className="block text-[10px] font-mono text-slate-400 mb-0.5">
                    Role in Band (e.g. "Guitarist, Vocalist, Director")
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Lead Vocalist, Pianist, Director"
                    value={member.bandRole}
                    onChange={(e) => onUpdateBandMember(idx, 'bandRole', e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                {/* Remove Button */}
                <div className="sm:col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => onRemoveBandMember(idx)}
                    className="p-1.5 rounded hover:bg-rose-900/50 text-rose-400 hover:text-rose-200 transition cursor-pointer"
                    title="Remove member from roster"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Specific Product Role */}
              <div className="pl-3 border-l-2 border-amber-500/40 pt-1">
                <label className="block text-[10px] font-mono text-amber-400 mb-0.5">
                  Specific Role on this product (optional)
                </label>
                <input
                  type="text"
                  placeholder={`e.g. Lead Vocals, Piano, Director (Default: ${member.bandRole || 'Band Role'})`}
                  value={member.productRole || ''}
                  onChange={(e) => onUpdateBandMember(idx, 'productRole', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-amber-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
            </div>
          ))}

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={onAddBandMember}
              className="text-xs font-mono text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Plus size={12} /> Add another member
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

// 7. Release & Secondary Creators Section
const ReleaseAndOtherCreatorsSection = React.memo<{
  otherCreatorsStr: string;
  onChangeOtherCreatorsStr: (val: string) => void;
  releaseDate: string;
  onChangeReleaseDate: (val: string) => void;
  consumedVersion: string;
  onChangeConsumedVersion: (val: string) => void;
}>(({
  otherCreatorsStr,
  onChangeOtherCreatorsStr,
  releaseDate,
  onChangeReleaseDate,
  consumedVersion,
  onChangeConsumedVersion
}) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-mono font-bold text-slate-300 mb-1">
            Other Associated Creators (e.g. "Hiroyuki Owaku/Scriptwriter, Yuka Kitamura/Composer")
          </label>
          <input
            type="text"
            placeholder="e.g. Hiroyuki Owaku/Scriptwriter, Yuka Kitamura/Composer..."
            value={otherCreatorsStr}
            onChange={(e) => onChangeOtherCreatorsStr(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div>
          <label className="block text-xs font-mono font-bold text-slate-300 mb-1">
            Release Date *
          </label>
          <input
            type="text"
            placeholder="YYYY-MM-DD or YYYY"
            value={releaseDate}
            onChange={(e) => onChangeReleaseDate(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-mono font-bold text-purple-300 mb-1">
          Consumed Version / Platform (e.g. Vinyl, Digital, PS2, PSP, Nintendo 64...)
        </label>
        <input
          type="text"
          placeholder="e.g. PS2, PSP, Nintendo 64, Vinyl, Digital, PC..."
          value={consumedVersion}
          onChange={(e) => onChangeConsumedVersion(e.target.value)}
          className="w-full bg-slate-900 border border-purple-500/40 rounded-lg px-3 py-2 text-xs sm:text-sm text-purple-100 placeholder-slate-600 focus:outline-none focus:border-purple-400 font-mono"
        />
      </div>
    </div>
  );
});

// 8. Genres & Tags Section
const GenresAndTagsSection = React.memo<{
  genresStr: string;
  onChangeGenresStr: (val: string) => void;
  philosophicalTags: string[];
  onAddPhiloTag: (tag?: string, forceOriginal?: boolean) => void;
  onRemovePhiloTag: (tag: string) => void;
  existingPhilosophicalTags: string[];
  genreStyleTags: string[];
  onAddStyleTag: (tag?: string, forceOriginal?: boolean) => void;
  onRemoveStyleTag: (tag: string) => void;
  existingStyleTags: string[];
}>(({
  genresStr,
  onChangeGenresStr,
  philosophicalTags,
  onAddPhiloTag,
  onRemovePhiloTag,
  existingPhilosophicalTags,
  genreStyleTags,
  onAddStyleTag,
  onRemoveStyleTag,
  existingStyleTags
}) => {
  const [newPhiloTag, setNewPhiloTag] = useState('');
  const [newStyleTag, setNewStyleTag] = useState('');

  const filteredPhiloTags = useMemo(() => {
    if (!existingPhilosophicalTags || existingPhilosophicalTags.length === 0) return [];
    const query = newPhiloTag.trim().toLowerCase();
    if (!query) return existingPhilosophicalTags.slice(0, 40);
    return existingPhilosophicalTags.filter((t) => t.toLowerCase().includes(query)).slice(0, 40);
  }, [newPhiloTag, existingPhilosophicalTags]);

  const filteredStyleTags = useMemo(() => {
    if (!existingStyleTags || existingStyleTags.length === 0) return [];
    const query = newStyleTag.trim().toLowerCase();
    if (!query) return existingStyleTags.slice(0, 40);
    return existingStyleTags.filter((t) => t.toLowerCase().includes(query)).slice(0, 40);
  }, [newStyleTag, existingStyleTags]);

  const handlePhiloAdd = (tagToAdd?: string, forceOriginal?: boolean) => {
    onAddPhiloTag(tagToAdd || newPhiloTag, forceOriginal);
    setNewPhiloTag('');
  };

  const handleStyleAdd = (tagToAdd?: string, forceOriginal?: boolean) => {
    onAddStyleTag(tagToAdd || newStyleTag, forceOriginal);
    setNewStyleTag('');
  };

  return (
    <div className="space-y-4">
      {/* Main Genres */}
      <div>
        <label className="block text-xs font-mono font-bold uppercase tracking-wider text-amber-400 mb-1">
          Main Genres (Primary Work Classification • Comma separated)
        </label>
        <input
          type="text"
          placeholder="e.g. Slapstick, Action RPG, Science Fiction, Dark Fantasy"
          value={genresStr}
          onChange={(e) => onChangeGenresStr(e.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
        />
        <p className="text-[10px] font-mono text-slate-400 mt-1">
          Main overarching genres defining the core identity of the entry.
        </p>
      </div>

      {/* Philosophical Tags Input */}
      <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-900/40 space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-mono font-bold uppercase tracking-wider text-indigo-400">
            Philosophical Tags
          </label>
          <span className="text-[10px] font-mono text-indigo-300/70">
            Preserves exact text
          </span>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add custom philosophical tag (Press Enter)..."
            value={newPhiloTag}
            onChange={(e) => setNewPhiloTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handlePhiloAdd();
              }
            }}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
          />
          <button
            type="button"
            onClick={() => handlePhiloAdd()}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold transition flex items-center gap-1 cursor-pointer"
          >
            <Plus size={13} /> Add
          </button>
        </div>

        {/* Explicit Add Original button */}
        {newPhiloTag.trim() !== '' && (
          <div className="flex items-center gap-2 p-2 bg-slate-900/90 rounded-lg border border-indigo-500/40 text-xs font-mono animate-fade-in">
            <span className="text-slate-400 text-[11px]">User Input:</span>
            <button
              type="button"
              onClick={() => handlePhiloAdd(newPhiloTag.trim(), true)}
              className="px-2.5 py-1 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-500/50 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
              title="Add exact original text without any autocorrect"
            >
              <Plus size={12} className="text-indigo-400" />
              <span>Add Original: "{newPhiloTag.trim()}"</span>
            </button>
          </div>
        )}

        {/* Existing tags quick picker */}
        {filteredPhiloTags.length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-slate-400">Quick select existing tags:</span>
            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
              {filteredPhiloTags.map((t, idx) => (
                <button
                  key={`exist-philo-${t}-${idx}`}
                  type="button"
                  onClick={() => handlePhiloAdd(t)}
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-800/60 transition cursor-pointer"
                >
                  + {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selected Tags list */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {philosophicalTags.map((tag, idx) => (
            <span
              key={`selected-philo-${tag}-${idx}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-600 text-white text-xs font-mono font-medium shadow"
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => onRemovePhiloTag(tag)}
                className="hover:text-rose-300 cursor-pointer"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Elements, Reference & Style Tags */}
      <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <Tag size={13} /> Elements, Reference & Style Tags
          </div>
          <span className="text-[10px] font-mono text-emerald-300/70">
            Secondary attributes (lowercase)
          </span>
        </div>

        <p className="text-[10px] font-mono text-slate-400">
          Used when a genre or style is used as an element or reference rather than being the main genre of the work (e.g. slapstick element, cyberpunk aesthetic, time loop).
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add style tag (e.g. slapstick element, gore, cyberpunk)..."
            value={newStyleTag}
            onChange={(e) => setNewStyleTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleStyleAdd();
              }
            }}
            className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-sans"
          />
          <button
            type="button"
            onClick={() => handleStyleAdd()}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold transition flex items-center gap-1 cursor-pointer"
          >
            <Plus size={13} /> Add
          </button>
        </div>

        {newStyleTag.trim() !== '' && (
          <div className="flex items-center gap-2 p-2 bg-slate-900/90 rounded-lg border border-emerald-500/40 text-xs font-mono animate-fade-in">
            <span className="text-slate-400 text-[11px]">User Input:</span>
            <button
              type="button"
              onClick={() => handleStyleAdd(newStyleTag.trim(), true)}
              className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-500/50 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer"
              title="Add exact original text as entered"
            >
              <Plus size={12} className="text-emerald-400" />
              <span>Add Original: "{newStyleTag.trim().toLowerCase()}"</span>
            </button>
          </div>
        )}

        {filteredStyleTags.length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] font-mono text-slate-400">Quick select existing tags:</span>
            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
              {filteredStyleTags.map((t, idx) => (
                <button
                  key={`exist-style-${t}-${idx}`}
                  type="button"
                  onClick={() => handleStyleAdd(t)}
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-900/60 transition cursor-pointer"
                >
                  + {t}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 pt-1">
          {genreStyleTags.map((tag, idx) => (
            <span
              key={`selected-style-${tag}-${idx}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-700 text-white text-xs font-sans font-medium"
            >
              <span>{tag}</span>
              <button
                type="button"
                onClick={() => onRemoveStyleTag(tag)}
                className="hover:text-rose-300 cursor-pointer"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
});

// 9. Review & Scoring Section (Summary Plot, Score Slider, Verdict)
const ReviewAndScoringSection = React.memo<{
  summaryPlot: string;
  onChangeSummaryPlot: (val: string) => void;
  hornetScore: number;
  onChangeHornetScore: (val: number) => void;
  hornetVerdict: string;
  onChangeHornetVerdict: (val: string) => void;
}>(({
  summaryPlot,
  onChangeSummaryPlot,
  hornetScore,
  onChangeHornetScore,
  hornetVerdict,
  onChangeHornetVerdict
}) => {
  const levelInfo = useMemo(() => getScoreLevelInfo(hornetScore), [hornetScore]);

  return (
    <div className="space-y-6">
      {/* Summary Plot / Premise */}
      <div>
        <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-1">
          Summary Plot & Premise
        </label>
        <textarea
          rows={3}
          placeholder="Enter a brief summary plot, central narrative premise, or thematic overview..."
          value={summaryPlot}
          onChange={(e) => onChangeSummaryPlot(e.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-sans"
        />
      </div>

      {/* Hornet's 10-Point Score & Verdict */}
      <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <label className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Award size={15} /> Hornet's Score (1 to 10 Scale)
            </label>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold font-mono ${levelInfo.color}`}>
                {hornetScore}/10 — {levelInfo.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={hornetScore}
              onChange={(e) => onChangeHornetScore(Number(e.target.value))}
              className="w-40 accent-amber-500 bg-slate-800 cursor-pointer"
            />
            <input
              type="number"
              min="1"
              max="10"
              step="1"
              value={hornetScore}
              onChange={(e) => onChangeHornetScore(Number(e.target.value))}
              className="w-16 bg-slate-950 border border-amber-500/50 rounded px-2 py-1 text-center font-mono font-bold text-amber-300 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-1">
            Hornet's Verdict / Quick Commentary
          </label>
          <textarea
            rows={2}
            placeholder="A brief 1-2 sentence core evaluation..."
            value={hornetVerdict}
            onChange={(e) => onChangeHornetVerdict(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-sans"
          />
        </div>
      </div>
    </div>
  );
});

// 10. Pros & Cons Section
const ProsAndConsSection = React.memo<{
  pros: string[];
  onAddPro: () => void;
  onUpdatePro: (index: number, val: string) => void;
  onRemovePro: (index: number) => void;
  cons: string[];
  onAddCon: () => void;
  onUpdateCon: (index: number, val: string) => void;
  onRemoveCon: (index: number) => void;
}>(({
  pros,
  onAddPro,
  onUpdatePro,
  onRemovePro,
  cons,
  onAddCon,
  onUpdateCon,
  onRemoveCon
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Pros */}
      <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
            <CheckCircle2 size={14} /> Pros (Strengths)
          </label>
          <button
            type="button"
            onClick={onAddPro}
            className="text-xs font-mono text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Plus size={12} /> Add Pro
          </button>
        </div>

        <div className="space-y-2">
          {pros.map((pro, idx) => (
            <div key={`pro-${idx}`} className="flex items-center gap-2">
              <input
                type="text"
                placeholder={`Strength #${idx + 1} (Press Enter to add next)...`}
                value={pro}
                onChange={(e) => onUpdatePro(idx, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onAddPro();
                    setTimeout(() => {
                      const inputs = document.querySelectorAll<HTMLInputElement>('.pro-input-field');
                      if (inputs && inputs[idx + 1]) {
                        inputs[idx + 1].focus();
                      }
                    }, 50);
                  }
                }}
                className="pro-input-field flex-1 bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => onRemovePro(idx)}
                className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Cons */}
      <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1">
            <XCircle size={14} /> Cons (Flaws)
          </label>
          <button
            type="button"
            onClick={onAddCon}
            className="text-xs font-mono text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Plus size={12} /> Add Con
          </button>
        </div>

        <div className="space-y-2">
          {cons.map((con, idx) => (
            <div key={`con-${idx}`} className="flex items-center gap-2">
              <input
                type="text"
                placeholder={`Critique #${idx + 1} (Press Enter to add next)...`}
                value={con}
                onChange={(e) => onUpdateCon(idx, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onAddCon();
                    setTimeout(() => {
                      const inputs = document.querySelectorAll<HTMLInputElement>('.con-input-field');
                      if (inputs && inputs[idx + 1]) {
                        inputs[idx + 1].focus();
                      }
                    }, 50);
                  }
                }}
                className="con-input-field flex-1 bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-rose-500"
              />
              <button
                type="button"
                onClick={() => onRemoveCon(idx)}
                className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

// 11. Relations Section (Medium Influences & Similar Media)
const RelationsSection = React.memo<{
  mediumInfluencesStr: string;
  onChangeMediumInfluencesStr: (val: string) => void;
  mediumInfluencesDetails: MediaRelationEntry[];
  onChangeMediumInfluencesDetails: (details: MediaRelationEntry[]) => void;
  similarMediaStr: string;
  onChangeSimilarMediaStr: (val: string) => void;
  similarMediaDetails: MediaRelationEntry[];
  onChangeSimilarMediaDetails: (details: MediaRelationEntry[]) => void;
}>(({
  mediumInfluencesStr,
  onChangeMediumInfluencesStr,
  mediumInfluencesDetails,
  onChangeMediumInfluencesDetails,
  similarMediaStr,
  onChangeSimilarMediaStr,
  similarMediaDetails,
  onChangeSimilarMediaDetails
}) => {
  const parsedInfluenceList = useMemo(() => {
    return mediumInfluencesStr.split(',').map((s) => s.trim()).filter(Boolean);
  }, [mediumInfluencesStr]);

  const parsedSimilarList = useMemo(() => {
    return similarMediaStr.split(',').map((s) => s.trim()).filter(Boolean);
  }, [similarMediaStr]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Medium Influences */}
      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
        <div>
          <label className="block text-xs font-mono font-bold uppercase tracking-wider text-amber-400 mb-1">
            Medium Influences & Inspirations (Comma separated)
          </label>
          <p className="text-[11px] font-mono text-slate-400 mb-2">
            Enter name-drops or media that directly influenced this work. If the media exists in the archive, clicking its thumbnail in bios leads to its detail view. Uncataloged media automatically interconnects once added!
          </p>
          <input
            type="text"
            placeholder="e.g. Crime and Punishment, Solaris, Akira, Neuromancer..."
            value={mediumInfluencesStr}
            onChange={(e) => onChangeMediumInfluencesStr(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        {/* Optional Custom Cover attachment for Influences */}
        {parsedInfluenceList.length > 0 && (
          <div className="space-y-2 pt-1 border-t border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">
              Custom Covers for Uncataloged Influences (Optional)
            </span>
            {parsedInfluenceList.map((titleStr, idx) => {
              const match = mediumInfluencesDetails.find((d) => d.title.toLowerCase().trim() === titleStr.toLowerCase().trim());
              const currentCover = match?.customCover || '';
              return (
                <div key={`inf-cov-${idx}`} className="flex items-center gap-2">
                  <span className="text-xs font-mono text-amber-300 w-28 truncate shrink-0" title={titleStr}>
                    {titleStr}:
                  </span>
                  <input
                    type="text"
                    placeholder="Image URL for custom picture..."
                    value={currentCover}
                    onChange={(e) => {
                      const val = e.target.value;
                      const updated = [...mediumInfluencesDetails];
                      const existingIdx = updated.findIndex((d) => d.title.toLowerCase().trim() === titleStr.toLowerCase().trim());
                      if (existingIdx >= 0) {
                        updated[existingIdx] = { ...updated[existingIdx], customCover: val };
                      } else {
                        updated.push({ title: titleStr, customCover: val });
                      }
                      onChangeMediumInfluencesDetails(updated);
                    }}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Similar Media */}
      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
        <div>
          <label className="block text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 mb-1">
            Similar Media & References (Comma separated)
          </label>
          <p className="text-[11px] font-mono text-slate-400 mb-2">
            Enter similar media titles. You can attach pictures now for works not yet in the archive. Once cataloged, they automatically link together!
          </p>
          <input
            type="text"
            placeholder="e.g. Ghost in the Shell, SOMA, Planescape..."
            value={similarMediaStr}
            onChange={(e) => onChangeSimilarMediaStr(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        {/* Optional Custom Cover attachment for Similar Media */}
        {parsedSimilarList.length > 0 && (
          <div className="space-y-2 pt-1 border-t border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">
              Custom Covers for Uncataloged Similar Media
            </span>
            {parsedSimilarList.map((titleStr, idx) => {
              const match = similarMediaDetails.find((d) => d.title.toLowerCase().trim() === titleStr.toLowerCase().trim());
              const currentCover = match?.customCover || '';
              return (
                <div key={`sim-cov-${idx}`} className="flex items-center gap-2">
                  <span className="text-xs font-mono text-cyan-300 w-28 truncate shrink-0" title={titleStr}>
                    {titleStr}:
                  </span>
                  <input
                    type="text"
                    placeholder="Image URL for custom picture..."
                    value={currentCover}
                    onChange={(e) => {
                      const val = e.target.value;
                      const updated = [...similarMediaDetails];
                      const existingIdx = updated.findIndex((d) => d.title.toLowerCase().trim() === titleStr.toLowerCase().trim());
                      if (existingIdx >= 0) {
                        updated[existingIdx] = { ...updated[existingIdx], customCover: val };
                      } else {
                        updated.push({ title: titleStr, customCover: val });
                      }
                      onChangeSimilarMediaDetails(updated);
                    }}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

// 12. External Links Section
const ExternalLinksSection = React.memo<{
  links: MediaLink[];
  onAddLink: () => void;
  onUpdateLink: (id: string, field: 'label' | 'url', val: string) => void;
  onRemoveLink: (id: string) => void;
}>(({ links, onAddLink, onUpdateLink, onRemoveLink }) => {
  return (
    <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1">
          <LinkIcon size={12} /> External Links
        </label>
        <button
          type="button"
          onClick={onAddLink}
          className="text-xs font-mono text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
        >
          <Plus size={12} /> Add Link
        </button>
      </div>

      <div className="space-y-2">
        {links.map((link) => (
          <div key={link.id} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Label (Steam, IMDb...)"
              value={link.label}
              onChange={(e) => onUpdateLink(link.id, 'label', e.target.value)}
              className="w-28 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
            />
            <input
              type="text"
              placeholder="URL (https://...)"
              value={link.url}
              onChange={(e) => onUpdateLink(link.id, 'url', e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
            />
            <button
              type="button"
              onClick={() => onRemoveLink(link.id)}
              className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
});

// 13. Modal Footer Action Bar
const ModalActionBar = React.memo<{
  isEditing: boolean;
  onClose: () => void;
}>(({ isEditing, onClose }) => {
  return (
    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
      <button
        type="button"
        onClick={onClose}
        className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs transition cursor-pointer"
      >
        Cancel
      </button>
      <button
        type="submit"
        className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs sm:text-sm flex items-center gap-2 shadow transition cursor-pointer"
      >
        <Save size={16} />
        <span>{isEditing ? 'Update Entry' : 'Save To Archive'}</span>
      </button>
    </div>
  );
});

/* =========================================================================
   MAIN ADMIN MEDIA MODAL COMPONENT (ORCHESTRATOR)
   ========================================================================= */

const AdminMediaModalComponent: React.FC<AdminMediaModalProps> = ({
  isOpen,
  itemToEdit,
  allItems = [],
  onClose,
  onSave,
  existingPhilosophicalTags,
  existingStyleTags
}) => {
  if (!isOpen) return null;

  // Form State
  const [cover, setCover] = useState('');
  const [title, setTitle] = useState('');
  const [mainCreator, setMainCreator] = useState('');
  const [mainCreatorCategory, setMainCreatorCategory] = useState<CreatorCategory>('Game Designer');
  const [mainCreatorWiki, setMainCreatorWiki] = useState('');
  const [mainCreatorPhoto, setMainCreatorPhoto] = useState('');
  const [creatorNation, setCreatorNation] = useState('');
  const [bandMembers, setBandMembers] = useState<BandMember[]>([]);
  
  const [otherCreatorsStr, setOtherCreatorsStr] = useState('');
  const [mediaFormat, setMediaFormat] = useState<MediaFormat>('Video Game');
  const [releaseDate, setReleaseDate] = useState('');
  const [countryOfOrigin, setCountryOfOrigin] = useState('');
  const [originalLanguage, setOriginalLanguage] = useState('');
  const [genresStr, setGenresStr] = useState('');
  const [philosophicalTags, setPhilosophicalTags] = useState<string[]>([]);
  const [genreStyleTags, setGenreStyleTags] = useState<string[]>([]);
  const [summaryPlot, setSummaryPlot] = useState('');
  const [pros, setPros] = useState<string[]>(['']);
  const [cons, setCons] = useState<string[]>(['']);
  const [hornetScore, setHornetScore] = useState<number>(9);
  const [hornetVerdict, setHornetVerdict] = useState('');
  
  // Relations: Similar Media & Medium Influences
  const [similarMediaStr, setSimilarMediaStr] = useState('');
  const [similarMediaDetails, setSimilarMediaDetails] = useState<MediaRelationEntry[]>([]);
  const [mediumInfluencesStr, setMediumInfluencesStr] = useState('');
  const [mediumInfluencesDetails, setMediumInfluencesDetails] = useState<MediaRelationEntry[]>([]);
  
  const [consumedVersion, setConsumedVersion] = useState('');
  const [links, setLinks] = useState<MediaLink[]>([]);

  // Custom category state
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');

  // Soundtrack relationship state
  const [isSoundtrack, setIsSoundtrack] = useState(false);
  const [soundtrackForId, setSoundtrackForId] = useState('');
  const [soundtrackForTitle, setSoundtrackForTitle] = useState('');
  const [soundtrackEntries, setSoundtrackEntries] = useState<{ id?: string; title: string }[]>([]);

  // Link Validation Modal State
  const [pendingLinkMatches, setPendingLinkMatches] = useState<{
    id: string;
    field: 'mediumInfluences' | 'similarMedia';
    rawTitle: string;
    matchedType: 'product' | 'creator';
    matchedLabel: string;
    matchedSub: string;
    shouldLink: boolean;
  }[] | null>(null);
  const [stagedSavedItem, setStagedSavedItem] = useState<MediaItem | null>(null);

  // Initialize form when itemToEdit changes or modal opens
  useEffect(() => {
    if (itemToEdit) {
      setCover(itemToEdit.cover || '');
      setTitle(itemToEdit.title || '');
      setMainCreator(itemToEdit.mainCreator || '');
      const primaryDetail = itemToEdit.creatorDetails?.[0];
      setMainCreatorCategory(primaryDetail?.category || 'Author');
      setMainCreatorWiki(primaryDetail?.wikiUrl || '');
      setMainCreatorPhoto(primaryDetail?.photoUrl || '');
      setCreatorNation(primaryDetail?.nation || '');
      setBandMembers(primaryDetail?.bandMembers || []);

      const { canonicalFormat, isCustom: detectedCustom } = normalizeMediaFormat(itemToEdit.customCategoryName || itemToEdit.mediaFormat);
      const isCustom = Boolean(itemToEdit.isCustomCategory && detectedCustom);
      setIsCustomCategory(isCustom);
      setCustomCategoryName(itemToEdit.customCategoryName || (isCustom ? itemToEdit.mediaFormat : ''));

      setOtherCreatorsStr(itemToEdit.otherCreators?.join(', ') || '');
      setMediaFormat(isCustom ? 'Custom Category' : canonicalFormat);
      setReleaseDate(itemToEdit.releaseDate || '');
      setCountryOfOrigin(itemToEdit.countryOfOrigin || '');
      setOriginalLanguage(itemToEdit.originalLanguage || '');
      setGenresStr(itemToEdit.genres?.join(', ') || '');
      setPhilosophicalTags(itemToEdit.philosophicalTags || []);
      setGenreStyleTags((itemToEdit.genreStyleTags || []).map((t) => t.toLowerCase()));
      setSummaryPlot(itemToEdit.summaryPlot || '');
      setPros(itemToEdit.pros && itemToEdit.pros.length > 0 ? itemToEdit.pros : ['']);
      setCons(itemToEdit.cons && itemToEdit.cons.length > 0 ? itemToEdit.cons : ['']);
      setHornetScore(itemToEdit.hornetScore ?? 9);
      setHornetVerdict(itemToEdit.hornetVerdict || '');

      // Parse Similar Media
      if (itemToEdit.similarMedia) {
        const rawTitles: string[] = [];
        const details: MediaRelationEntry[] = [];
        itemToEdit.similarMedia.forEach((sm) => {
          if (typeof sm === 'string') {
            rawTitles.push(sm);
          } else {
            rawTitles.push(sm.title);
            details.push(sm);
          }
        });
        setSimilarMediaStr(rawTitles.join(', '));
        setSimilarMediaDetails(details);
      } else {
        setSimilarMediaStr('');
        setSimilarMediaDetails([]);
      }

      // Parse Medium Influences
      if (itemToEdit.mediumInfluences) {
        const rawTitles: string[] = [];
        const details: MediaRelationEntry[] = [];
        itemToEdit.mediumInfluences.forEach((mi) => {
          if (typeof mi === 'string') {
            rawTitles.push(mi);
          } else {
            rawTitles.push(mi.title);
            details.push(mi);
          }
        });
        setMediumInfluencesStr(rawTitles.join(', '));
        setMediumInfluencesDetails(details);
      } else {
        setMediumInfluencesStr('');
        setMediumInfluencesDetails([]);
      }

      setConsumedVersion(itemToEdit.consumedVersion || '');
      setLinks(itemToEdit.links || []);
      setIsSoundtrack(Boolean(itemToEdit.isSoundtrack || itemToEdit.soundtrackForId || itemToEdit.soundtrackForTitle));
      setSoundtrackForId(itemToEdit.soundtrackForId || '');
      setSoundtrackForTitle(itemToEdit.soundtrackForTitle || '');

      let existingSoundtracks: { id?: string; title: string }[] = [];
      if (itemToEdit.soundtracks && itemToEdit.soundtracks.length > 0) {
        existingSoundtracks = itemToEdit.soundtracks.map((s) => ({ ...s }));
      } else if (itemToEdit.soundtrackId || itemToEdit.soundtrackTitle) {
        existingSoundtracks = [{ id: itemToEdit.soundtrackId, title: itemToEdit.soundtrackTitle || '' }];
      }
      setSoundtrackEntries(existingSoundtracks);
    } else {
      // Reset empty form
      setCover('');
      setTitle('');
      setMainCreator('');
      setMainCreatorCategory('Author');
      setMainCreatorWiki('');
      setMainCreatorPhoto('');
      setCreatorNation('');
      setBandMembers([]);
      setOtherCreatorsStr('');
      setMediaFormat('Video Game');
      setReleaseDate(new Date().toISOString().substring(0, 10));
      setCountryOfOrigin('');
      setOriginalLanguage('');
      setGenresStr('');
      setPhilosophicalTags([]);
      setGenreStyleTags([]);
      setSummaryPlot('');
      setPros(['']);
      setCons(['']);
      setHornetScore(9);
      setHornetVerdict('');
      setSimilarMediaStr('');
      setSimilarMediaDetails([]);
      setMediumInfluencesStr('');
      setMediumInfluencesDetails([]);
      setConsumedVersion('');
      setIsCustomCategory(false);
      setCustomCategoryName('');
      setIsSoundtrack(false);
      setSoundtrackForId('');
      setSoundtrackForTitle('');
      setSoundtrackEntries([]);
      setLinks([
        { id: 'l1', label: 'Product Wikipedia / Store Page', url: '' }
      ]);
    }
  }, [itemToEdit, isOpen]);

  // Collect all known genre tags across items for auto-correction
  const existingGenresPool = useMemo(() => {
    const set = new Set<string>();
    allItems.forEach((i) => i.genres?.forEach((g) => set.add(g.trim())));
    return Array.from(set);
  }, [allItems]);

  // Pre-memoize select options so hundreds of DOM elements are not recreated on every keystroke
  const targetMediaOptions = useMemo(() => {
    return allItems
      .filter((i) => i.mediaFormat !== 'Music Album' && i.id !== itemToEdit?.id)
      .map((item) => (
        <option key={item.id} value={item.id}>
          {item.title} ({item.mediaFormat} - {item.mainCreator})
        </option>
      ));
  }, [allItems, itemToEdit?.id]);

  const soundtrackAlbumOptions = useMemo(() => {
    return allItems
      .filter((i) => i.mediaFormat === 'Music Album')
      .map((album) => (
        <option key={album.id} value={album.id}>
          {album.title} (by {album.mainCreator})
        </option>
      ));
  }, [allItems]);

  // Compute known band members across the entire database for the current mainCreator
  const knownBandMembers = useMemo<BandMember[]>(() => {
    if (!mainCreator || !allItems) return [];
    const bandNameLower = mainCreator.toLowerCase().trim();
    const map = new Map<string, BandMember>();

    allItems.forEach((item) => {
      item.creatorDetails?.forEach((cd) => {
        if (cd.category === 'Band' && cd.name.toLowerCase().trim() === bandNameLower && cd.bandMembers) {
          cd.bandMembers.forEach((m) => {
            const key = m.name.toLowerCase().trim();
            if (key && !map.has(key)) {
              map.set(key, m);
            }
          });
        }
      });
    });

    return Array.from(map.values());
  }, [mainCreator, allItems]);

  /* =========================================================================
     MEMOIZED STABLE CALLBACKS
     ========================================================================= */

  const handleAddBandMember = useCallback(() => {
    setBandMembers((prev) => [
      ...prev,
      { name: '', bandRole: 'Musician', participatedInProduct: true, productRole: '' }
    ]);
  }, []);

  const handleAddPresetMember = useCallback((defaultRole: string) => {
    setBandMembers((prev) => [
      ...prev,
      { name: '', bandRole: defaultRole, participatedInProduct: true, productRole: defaultRole }
    ]);
  }, []);

  const handleUpdateBandMember = useCallback((index: number, field: keyof BandMember, value: any) => {
    setBandMembers((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }, []);

  const handleRemoveBandMember = useCallback((index: number) => {
    setBandMembers((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleImportBulkText = useCallback((text: string) => {
    const tokens: string[] = [];
    let current = '';
    let parenDepth = 0;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '(') parenDepth++;
      else if (char === ')') parenDepth--;

      if ((char === ',' || char === '\n' || char === ';') && parenDepth === 0) {
        if (current.trim()) tokens.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    if (current.trim()) tokens.push(current.trim());

    const newParsedMembers: BandMember[] = tokens
      .map((token) => {
        const parenMatch = token.match(/^([^(]+)\(([^)]+)\)$/);
        if (parenMatch) {
          return {
            name: parenMatch[1].trim(),
            bandRole: parenMatch[2].trim(),
            participatedInProduct: true,
            productRole: parenMatch[2].trim()
          };
        }

        const dashMatch = token.match(/^([^-]+)-(.+)$/);
        if (dashMatch) {
          return {
            name: dashMatch[1].trim(),
            bandRole: dashMatch[2].trim(),
            participatedInProduct: true,
            productRole: dashMatch[2].trim()
          };
        }

        return {
          name: token.trim(),
          bandRole: 'Musician',
          participatedInProduct: true,
          productRole: ''
        };
      })
      .filter((m) => m.name.length > 0);

    setBandMembers((prev) => {
      const existingNames = new Set(prev.map((m) => m.name.toLowerCase().trim()));
      const filteredNew = newParsedMembers.filter((m) => !existingNames.has(m.name.toLowerCase().trim()));
      return [...prev, ...filteredNew];
    });
  }, []);

  const handleImportKnownMember = useCallback((m: BandMember, participated: boolean = true) => {
    setBandMembers((prev) => {
      const existingIndex = prev.findIndex((bm) => bm.name.toLowerCase().trim() === m.name.toLowerCase().trim());
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], participatedInProduct: participated };
        return updated;
      }
      return [
        ...prev,
        {
          name: m.name,
          bandRole: m.bandRole || 'Musician',
          participatedInProduct: participated,
          productRole: m.productRole || m.bandRole || '',
          photoUrl: m.photoUrl,
          wikiUrl: m.wikiUrl
        }
      ];
    });
  }, []);

  const handleImportAllKnownMembers = useCallback((participated: boolean = true) => {
    setBandMembers((prev) => {
      const existingNames = new Set(prev.map((bm) => bm.name.toLowerCase().trim()));
      const missing = knownBandMembers.filter((km) => !existingNames.has(km.name.toLowerCase().trim()));
      if (missing.length > 0) {
        return [
          ...prev,
          ...missing.map((km) => ({
            ...km,
            participatedInProduct: participated
          }))
        ];
      }
      return prev;
    });
  }, [knownBandMembers]);

  const handleAddPhiloTag = useCallback((tagToAdd?: string, forceOriginal?: boolean) => {
    const raw = (tagToAdd || '').trim();
    if (!raw) return;
    const cleanedTags = forceOriginal
      ? [raw]
      : processTagList(raw, existingPhilosophicalTags);
    setPhilosophicalTags((prev) => {
      const updated = [...prev];
      cleanedTags.forEach((ct) => {
        if (!updated.some((existing) => existing.toLowerCase().trim() === ct.toLowerCase().trim())) {
          updated.push(ct);
        }
      });
      return updated;
    });
  }, [existingPhilosophicalTags]);

  const handleRemovePhiloTag = useCallback((tagToRemove: string) => {
    setPhilosophicalTags((prev) => prev.filter((t) => t !== tagToRemove));
  }, []);

  const handleAddStyleTag = useCallback((tagToAdd?: string, forceOriginal?: boolean) => {
    const raw = (tagToAdd || '').trim();
    if (!raw) return;
    const cleanedTags = forceOriginal
      ? [raw.toLowerCase()]
      : processTagList(raw, existingStyleTags, { forceLowercase: true });
    setGenreStyleTags((prev) => {
      const updated = [...prev];
      cleanedTags.forEach((ct) => {
        const lower = ct.toLowerCase();
        if (!updated.some((existing) => existing.toLowerCase().trim() === lower)) {
          updated.push(lower);
        }
      });
      return updated;
    });
  }, [existingStyleTags]);

  const handleRemoveStyleTag = useCallback((tagToRemove: string) => {
    setGenreStyleTags((prev) => prev.filter((t) => t !== tagToRemove));
  }, []);

  const handleAddPro = useCallback(() => setPros((prev) => [...prev, '']), []);
  const handleUpdatePro = useCallback((index: number, val: string) => {
    setPros((prev) => {
      const updated = [...prev];
      updated[index] = val;
      return updated;
    });
  }, []);
  const handleRemovePro = useCallback((index: number) => {
    setPros((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleAddCon = useCallback(() => setCons((prev) => [...prev, '']), []);
  const handleUpdateCon = useCallback((index: number, val: string) => {
    setCons((prev) => {
      const updated = [...prev];
      updated[index] = val;
      return updated;
    });
  }, []);
  const handleRemoveCon = useCallback((index: number) => {
    setCons((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleAddLink = useCallback(() => {
    setLinks((prev) => [...prev, { id: `link-${Date.now()}`, label: 'Link', url: '' }]);
  }, []);

  const handleUpdateLink = useCallback((id: string, field: 'label' | 'url', val: string) => {
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, [field]: val } : l)));
  }, []);

  const handleRemoveLink = useCallback((id: string) => {
    setLinks((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const handleQuickSampleData = useCallback(() => {
    setCover('https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80');
    setTitle('Solaris');
    setMainCreator('Stanisław Lem');
    setMainCreatorCategory('Author');
    setMainCreatorWiki('https://en.wikipedia.org/wiki/Stanis%C5%82aw_Lem');
    setCreatorNation('Poland');
    setOtherCreatorsStr('Andrei Tarkovsky');
    setMediaFormat('Book');
    setReleaseDate('1961-11-01');
    setCountryOfOrigin('Poland');
    setOriginalLanguage('Polish');
    setGenresStr('Science Fiction, Philosophical Fiction');
    setPhilosophicalTags(['Limits of Human Cognition', 'Inscrutable Alien Entity', 'Grief & Memory']);
    setGenreStyleTags(['Surrealism', 'Psychological Atmospheric']);
    setPros([
      'Profound meditation on humanity’s inability to truly comprehend non-human intelligence',
      'Unforgettably eerie oceanic manifestations of emotional subconscious'
    ]);
    setCons([
      'Academic chapter descriptions slow narrative momentum'
    ]);
    setHornetScore(10);
    setHornetVerdict('A transcendent masterpiece on the epistemological boundaries of human perception.');
    setSimilarMediaStr('Stalker, Annihilation, Arrival');
    setLinks([
      { id: 'l1', label: 'Goodreads', url: 'https://www.goodreads.com/book/show/95558.Solaris' },
      { id: 'l2', label: 'Product Wikipedia', url: 'https://en.wikipedia.org/wiki/Solaris_(novel)' }
    ]);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please provide a Title.');
      return;
    }

    const mainNameClean = mainCreator.trim().split('/')[0].trim() || 'Unknown Creator';
    const mainRoleClean = mainCreator.includes('/') ? mainCreator.split('/')[1]?.trim() : null;

    const parsedOtherCreators = otherCreatorsStr
      ? otherCreatorsStr.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const creatorDetails: CreatorDetails[] = [
      {
        name: mainNameClean,
        category: (mainRoleClean as CreatorCategory) || mainCreatorCategory,
        nation: creatorNation.trim() || undefined,
        wikiUrl: mainCreatorWiki.trim() || `https://en.wikipedia.org/wiki/${encodeURIComponent(mainNameClean)}`,
        photoUrl: mainCreatorPhoto.trim() || undefined,
        bandMembers: mainCreatorCategory === 'Band' || bandMembers.length > 0 ? bandMembers : undefined
      }
    ];

    parsedOtherCreators.forEach((cStr) => {
      const parts = cStr.split('/');
      const name = parts[0].trim();
      const role = parts[1]?.trim();
      if (name && !creatorDetails.some((cd) => cd.name.toLowerCase() === name.toLowerCase())) {
        creatorDetails.push({
          name,
          category: (role as CreatorCategory) || 'Other',
          wikiUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent(name)}`
        });
      }
    });

    const formattedCover = formatImageUrl(cover);

    // Build similarMedia relations
    const parsedSimilarTitles = similarMediaStr
      ? similarMediaStr.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const similarMedia: (string | MediaRelationEntry)[] = parsedSimilarTitles.map((t) => {
      const detail = similarMediaDetails.find((d) => d.title.toLowerCase().trim() === t.toLowerCase().trim());
      if (detail && (detail.customCover || detail.note)) {
        return {
          title: t,
          customCover: detail.customCover ? formatImageUrl(detail.customCover) : undefined,
          note: detail.note
        };
      }
      return t;
    });

    // Build mediumInfluences relations
    const parsedInfluenceTitles = mediumInfluencesStr
      ? mediumInfluencesStr.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const mediumInfluences: (string | MediaRelationEntry)[] = parsedInfluenceTitles.map((t) => {
      const detail = mediumInfluencesDetails.find((d) => d.title.toLowerCase().trim() === t.toLowerCase().trim());
      if (detail && (detail.customCover || detail.note)) {
        return {
          title: t,
          customCover: detail.customCover ? formatImageUrl(detail.customCover) : undefined,
          note: detail.note
        };
      }
      return t;
    });

    // Clean genres using existing genres pool
    const processedGenres = processTagList(genresStr, existingGenresPool);
    const processedPhiloTags = processTagList(philosophicalTags, existingPhilosophicalTags);
    const processedStyleTags = processTagList(genreStyleTags, existingStyleTags);

    const targetFormat = isCustomCategory ? (customCategoryName.trim() || 'Custom Category') : mediaFormat;
    const { canonicalFormat, isCustom: finalIsCustom } = normalizeMediaFormat(targetFormat);
    const effectiveFormat = finalIsCustom ? (customCategoryName.trim() || 'Custom Category') : canonicalFormat;

    const newItem: MediaItem = {
      id: itemToEdit ? itemToEdit.id : `item-${Date.now()}`,
      cover: formattedCover,
      title: title.trim(),
      mainCreator: mainCreator.trim() || 'Unknown Creator',
      otherCreators: parsedOtherCreators,
      creatorDetails,
      mediaFormat: effectiveFormat,
      isCustomCategory: finalIsCustom,
      customCategoryName: finalIsCustom ? (customCategoryName.trim() || 'Custom Category') : undefined,
      releaseDate: releaseDate.trim() || new Date().toISOString().substring(0, 10),
      countryOfOrigin: countryOfOrigin.trim() || undefined,
      originalLanguage: originalLanguage.trim() || undefined,
      genres: processedGenres,
      philosophicalTags: processedPhiloTags,
      genreStyleTags: processedStyleTags,
      summaryPlot: summaryPlot.trim(),
      pros: pros.map((p) => p.trim()).filter(Boolean),
      cons: cons.map((c) => c.trim()).filter(Boolean),
      hornetScore,
      hornetVerdict: hornetVerdict.trim(),
      similarMedia,
      mediumInfluences,
      consumedVersion: consumedVersion.trim(),
      isSoundtrack: mediaFormat === 'Music Album' ? isSoundtrack : false,
      soundtrackForId: mediaFormat === 'Music Album' && isSoundtrack ? (soundtrackForId.trim() || undefined) : undefined,
      soundtrackForTitle: mediaFormat === 'Music Album' && isSoundtrack ? (soundtrackForTitle.trim() || undefined) : undefined,
      soundtracks: mediaFormat !== 'Music Album' && soundtrackEntries.filter((s) => s.title.trim() !== '').length > 0 
        ? soundtrackEntries.filter((s) => s.title.trim() !== '')
        : undefined,
      soundtrackId: mediaFormat !== 'Music Album' && soundtrackEntries.filter((s) => s.title.trim() !== '').length > 0
        ? soundtrackEntries.filter((s) => s.title.trim() !== '')[0]?.id
        : undefined,
      soundtrackTitle: mediaFormat !== 'Music Album' && soundtrackEntries.filter((s) => s.title.trim() !== '').length > 0
        ? soundtrackEntries.filter((s) => s.title.trim() !== '')[0]?.title
        : undefined,
      links: links.filter((l) => l.url.trim() !== ''),
      createdAt: itemToEdit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Link Validation Check: Check if references match existing items/creators in Archive
    if (allItems && allItems.length > 0 && pendingLinkMatches === null) {
      const matches: {
        id: string;
        field: 'mediumInfluences' | 'similarMedia';
        rawTitle: string;
        matchedType: 'product' | 'creator';
        matchedLabel: string;
        matchedSub: string;
        shouldLink: boolean;
      }[] = [];

      // Check influences
      parsedInfluenceTitles.forEach((t, idx) => {
        const norm = t.toLowerCase().trim();
        if (!norm) return;
        const matchProd = allItems.find((i) => i.id !== (itemToEdit?.id || '') && i.title.toLowerCase().trim() === norm);
        if (matchProd) {
          matches.push({
            id: `inf-${idx}-${norm}`,
            field: 'mediumInfluences',
            rawTitle: t,
            matchedType: 'product',
            matchedLabel: matchProd.title,
            matchedSub: `${matchProd.mediaFormat} (${matchProd.releaseDate?.substring(0, 4)}) by ${matchProd.mainCreator}`,
            shouldLink: true
          });
          return;
        }
        const matchCreator = allItems.find(
          (i) =>
            i.mainCreator?.toLowerCase().trim() === norm ||
            i.otherCreators?.some((c) => c.toLowerCase().trim() === norm) ||
            i.creatorDetails?.some((cd) => cd.name.toLowerCase().trim() === norm)
        );
        if (matchCreator) {
          const creatorName =
            matchCreator.mainCreator?.toLowerCase().trim() === norm
              ? matchCreator.mainCreator
              : matchCreator.creatorDetails?.find((cd) => cd.name.toLowerCase().trim() === norm)?.name || t;
          matches.push({
            id: `inf-${idx}-${norm}`,
            field: 'mediumInfluences',
            rawTitle: t,
            matchedType: 'creator',
            matchedLabel: creatorName,
            matchedSub: 'Creator Bio in Archive',
            shouldLink: true
          });
        }
      });

      // Check similar media
      parsedSimilarTitles.forEach((t, idx) => {
        const norm = t.toLowerCase().trim();
        if (!norm) return;
        const matchProd = allItems.find((i) => i.id !== (itemToEdit?.id || '') && i.title.toLowerCase().trim() === norm);
        if (matchProd) {
          matches.push({
            id: `sim-${idx}-${norm}`,
            field: 'similarMedia',
            rawTitle: t,
            matchedType: 'product',
            matchedLabel: matchProd.title,
            matchedSub: `${matchProd.mediaFormat} (${matchProd.releaseDate?.substring(0, 4)}) by ${matchProd.mainCreator}`,
            shouldLink: true
          });
        }
      });

      if (matches.length > 0) {
        setPendingLinkMatches(matches);
        setStagedSavedItem(newItem);
        return;
      }
    }

    onSave(newItem);
    onClose();
  };

  const handleConfirmLinkMatches = () => {
    if (!stagedSavedItem || !pendingLinkMatches) return;

    const finalItem: MediaItem = { ...stagedSavedItem };

    if (finalItem.mediumInfluences) {
      finalItem.mediumInfluences = finalItem.mediumInfluences.map((inf) => {
        const titleStr = typeof inf === 'string' ? inf : inf.title;
        const norm = titleStr.toLowerCase().trim();
        const match = pendingLinkMatches.find(
          (m) => m.field === 'mediumInfluences' && m.rawTitle.toLowerCase().trim() === norm
        );
        if (match) {
          if (!match.shouldLink) {
            return typeof inf === 'object' ? { ...inf, unlinked: true } : { title: titleStr, unlinked: true };
          } else {
            if (match.matchedType === 'product') {
              const matchedProd = allItems.find((i) => i.id !== (itemToEdit?.id || '') && i.title.toLowerCase().trim() === norm);
              if (matchedProd) {
                return {
                  title: matchedProd.title,
                  type: 'media',
                  customCover: matchedProd.cover,
                  note: `Linked to ${matchedProd.mediaFormat} (${matchedProd.releaseDate?.substring(0, 4) || ''})`
                };
              }
            } else if (match.matchedType === 'creator') {
              const matchedCreator = allItems.find(
                (i) =>
                  i.mainCreator?.toLowerCase().trim() === norm ||
                  i.otherCreators?.some((c) => c.toLowerCase().trim() === norm) ||
                  i.creatorDetails?.some((cd) => cd.name.toLowerCase().trim() === norm)
              );
              if (matchedCreator) {
                const creatorName =
                  matchedCreator.mainCreator?.toLowerCase().trim() === norm
                    ? matchedCreator.mainCreator
                    : matchedCreator.creatorDetails?.find((cd) => cd.name.toLowerCase().trim() === norm)?.name || titleStr;
                const detail = matchedCreator.creatorDetails?.find((cd) => cd.name.toLowerCase().trim() === norm);
                return {
                  title: creatorName,
                  type: 'creator',
                  customCover: detail?.photoUrl || matchedCreator.cover,
                  note: `Linked Creator Bio (${detail?.category || 'Bio'})`
                };
              }
            }
          }
        }
        return inf;
      });
    }

    if (finalItem.similarMedia) {
      finalItem.similarMedia = finalItem.similarMedia.map((sim) => {
        const titleStr = typeof sim === 'string' ? sim : sim.title;
        const norm = titleStr.toLowerCase().trim();
        const match = pendingLinkMatches.find(
          (m) => m.field === 'similarMedia' && m.rawTitle.toLowerCase().trim() === norm
        );
        if (match) {
          if (!match.shouldLink) {
            return typeof sim === 'object' ? { ...sim, unlinked: true } : { title: titleStr, unlinked: true };
          } else {
            const matchedProd = allItems.find((i) => i.id !== (itemToEdit?.id || '') && i.title.toLowerCase().trim() === norm);
            if (matchedProd) {
              return {
                title: matchedProd.title,
                type: 'media',
                customCover: matchedProd.cover,
                note: `Linked to ${matchedProd.mediaFormat}`
              };
            }
          }
        }
        return sim;
      });
    }

    onSave(finalItem);
    setPendingLinkMatches(null);
    setStagedSavedItem(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div
        className="relative w-full max-w-4xl my-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <ModalHeader
          isEditing={Boolean(itemToEdit)}
          onQuickSample={handleQuickSampleData}
          onClose={onClose}
        />

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
          {/* Cover Section */}
          <CoverSection
            cover={cover}
            onChangeCover={setCover}
          />

          {/* Basic Info */}
          <BasicInfoSection
            title={title}
            onChangeTitle={setTitle}
            mediaFormat={mediaFormat}
            onChangeMediaFormat={setMediaFormat}
            isCustomCategory={isCustomCategory}
            onChangeIsCustomCategory={setIsCustomCategory}
            customCategoryName={customCategoryName}
            onChangeCustomCategoryName={setCustomCategoryName}
            countryOfOrigin={countryOfOrigin}
            onChangeCountryOfOrigin={setCountryOfOrigin}
            originalLanguage={originalLanguage}
            onChangeOriginalLanguage={setOriginalLanguage}
          />

          {/* Soundtrack Setup */}
          <SoundtrackSection
            mediaFormat={mediaFormat}
            isSoundtrack={isSoundtrack}
            onChangeIsSoundtrack={setIsSoundtrack}
            soundtrackForId={soundtrackForId}
            onChangeSoundtrackForId={(id, stTitle) => {
              setSoundtrackForId(id);
              if (stTitle) setSoundtrackForTitle(stTitle);
            }}
            soundtrackForTitle={soundtrackForTitle}
            onChangeSoundtrackForTitle={setSoundtrackForTitle}
            soundtrackEntries={soundtrackEntries}
            onChangeSoundtrackEntries={setSoundtrackEntries}
            targetMediaOptions={targetMediaOptions}
            soundtrackAlbumOptions={soundtrackAlbumOptions}
            allItems={allItems}
          />

          {/* Creator Profile */}
          <CreatorSection
            mainCreator={mainCreator}
            onChangeMainCreator={setMainCreator}
            mainCreatorCategory={mainCreatorCategory}
            onChangeMainCreatorCategory={setMainCreatorCategory}
            creatorNation={creatorNation}
            onChangeCreatorNation={setCreatorNation}
            mainCreatorWiki={mainCreatorWiki}
            onChangeMainCreatorWiki={setMainCreatorWiki}
            mainCreatorPhoto={mainCreatorPhoto}
            onChangeMainCreatorPhoto={setMainCreatorPhoto}
          />

          {/* Band Lineup & Lineup for this product */}
          {(mainCreatorCategory === 'Band' || bandMembers.length > 0) && (
            <BandLineupSection
              mainCreator={mainCreator}
              bandMembers={bandMembers}
              knownBandMembers={knownBandMembers}
              onAddBandMember={handleAddBandMember}
              onAddPresetMember={handleAddPresetMember}
              onUpdateBandMember={handleUpdateBandMember}
              onRemoveBandMember={handleRemoveBandMember}
              onImportBulkText={handleImportBulkText}
              onImportKnownMember={handleImportKnownMember}
              onImportAllKnownMembers={handleImportAllKnownMembers}
            />
          )}

          {/* Other Associated Creators, Release Date, Consumed Version */}
          <ReleaseAndOtherCreatorsSection
            otherCreatorsStr={otherCreatorsStr}
            onChangeOtherCreatorsStr={setOtherCreatorsStr}
            releaseDate={releaseDate}
            onChangeReleaseDate={setReleaseDate}
            consumedVersion={consumedVersion}
            onChangeConsumedVersion={setConsumedVersion}
          />

          {/* Genres & Tags */}
          <GenresAndTagsSection
            genresStr={genresStr}
            onChangeGenresStr={setGenresStr}
            philosophicalTags={philosophicalTags}
            onAddPhiloTag={handleAddPhiloTag}
            onRemovePhiloTag={handleRemovePhiloTag}
            existingPhilosophicalTags={existingPhilosophicalTags}
            genreStyleTags={genreStyleTags}
            onAddStyleTag={handleAddStyleTag}
            onRemoveStyleTag={handleRemoveStyleTag}
            existingStyleTags={existingStyleTags}
          />

          {/* Review, Summary Plot, Hornet's Score & Verdict */}
          <ReviewAndScoringSection
            summaryPlot={summaryPlot}
            onChangeSummaryPlot={setSummaryPlot}
            hornetScore={hornetScore}
            onChangeHornetScore={setHornetScore}
            hornetVerdict={hornetVerdict}
            onChangeHornetVerdict={setHornetVerdict}
          />

          {/* Pros & Cons */}
          <ProsAndConsSection
            pros={pros}
            onAddPro={handleAddPro}
            onUpdatePro={handleUpdatePro}
            onRemovePro={handleRemovePro}
            cons={cons}
            onAddCon={handleAddCon}
            onUpdateCon={handleUpdateCon}
            onRemoveCon={handleRemoveCon}
          />

          {/* Medium Influences & Similar Media */}
          <RelationsSection
            mediumInfluencesStr={mediumInfluencesStr}
            onChangeMediumInfluencesStr={setMediumInfluencesStr}
            mediumInfluencesDetails={mediumInfluencesDetails}
            onChangeMediumInfluencesDetails={setMediumInfluencesDetails}
            similarMediaStr={similarMediaStr}
            onChangeSimilarMediaStr={setSimilarMediaStr}
            similarMediaDetails={similarMediaDetails}
            onChangeSimilarMediaDetails={setSimilarMediaDetails}
          />

          {/* External Links */}
          <ExternalLinksSection
            links={links}
            onAddLink={handleAddLink}
            onUpdateLink={handleUpdateLink}
            onRemoveLink={handleRemoveLink}
          />

          {/* Save Action Bar */}
          <ModalActionBar
            isEditing={Boolean(itemToEdit)}
            onClose={onClose}
          />
        </form>
      </div>

      {/* Link Validation Modal */}
      {pendingLinkMatches && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5 text-slate-100">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
                <LinkIcon size={20} />
              </div>
              <div>
                <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-amber-300">
                  Link Validation: Verify Matches
                </h3>
                <p className="text-xs text-slate-300 mt-1 font-sans leading-relaxed">
                  Verify if these referenced titles match existing items in your archive (uncheck if they are distinct works):
                </p>
              </div>
            </div>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {pendingLinkMatches.map((m, idx) => (
                <label
                  key={m.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${
                    m.shouldLink
                      ? 'bg-amber-950/20 border-amber-500/40 text-amber-200'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={m.shouldLink}
                    onChange={(e) => {
                      const next = [...pendingLinkMatches];
                      next[idx].shouldLink = e.target.checked;
                      setPendingLinkMatches(next);
                    }}
                    className="mt-1 rounded bg-slate-900 border-slate-700 text-amber-500 focus:ring-amber-500"
                  />
                  <div className="flex-1 text-xs">
                    <div className="font-bold text-slate-200 font-mono">
                      {m.field === 'mediumInfluences' ? 'Influence Reference' : 'Similar Media'}: "{m.rawTitle}"
                    </div>
                    <div className="text-[11px] text-amber-400 font-mono mt-0.5">
                      Matches {m.matchedType === 'product' ? 'Product' : 'Creator'}: <span className="underline font-bold">{m.matchedLabel}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-sans mt-0.5">{m.matchedSub}</div>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setPendingLinkMatches(null);
                  setStagedSavedItem(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-300 transition cursor-pointer"
              >
                Back to Editing
              </button>
              <button
                type="button"
                onClick={handleConfirmLinkMatches}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs transition shadow cursor-pointer"
              >
                Confirm Links & Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const AdminMediaModal = React.memo(AdminMediaModalComponent);
