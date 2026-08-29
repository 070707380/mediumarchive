import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
  Flag,
  Languages,
  Disc
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

interface FormDataShape {
  cover: string;
  title: string;
  mainCreator: string;
  mainCreatorCategory: CreatorCategory;
  mainCreatorWiki: string;
  mainCreatorPhoto: string;
  creatorNation: string;
  bandMembers: BandMember[];
  otherCreatorsStr: string;
  mediaFormat: MediaFormat;
  releaseDate: string;
  countryOfOrigin: string;
  originalLanguage: string;
  genresStr: string;
  philosophicalTags: string[];
  genreStyleTags: string[];
  summaryPlot: string;
  pros: string[];
  cons: string[];
  hornetScore: number;
  hornetVerdict: string;
  similarMediaStr: string;
  similarMediaDetails: MediaRelationEntry[];
  mediumInfluencesStr: string;
  mediumInfluencesDetails: MediaRelationEntry[];
  consumedVersion: string;
  links: MediaLink[];
  isCustomCategory: boolean;
  customCategoryName: string;
  isSoundtrack: boolean;
  soundtrackForId: string;
  soundtrackForTitle: string;
  soundtrackEntries: { id?: string; title: string }[];
}

function getDefaultFormData(itemToEdit: MediaItem | null): FormDataShape {
  if (itemToEdit) {
    const primaryDetail = itemToEdit.creatorDetails?.[0];
    const { canonicalFormat, isCustom: detectedCustom } = normalizeMediaFormat(
      itemToEdit.customCategoryName || itemToEdit.mediaFormat
    );
    const isCustom = Boolean(itemToEdit.isCustomCategory && detectedCustom);

    const smTitles: string[] = [];
    const smDetails: MediaRelationEntry[] = [];
    if (itemToEdit.similarMedia) {
      itemToEdit.similarMedia.forEach((sm) => {
        if (typeof sm === 'string') {
          smTitles.push(sm);
        } else {
          smTitles.push(sm.title);
          smDetails.push(sm);
        }
      });
    }

    const miTitles: string[] = [];
    const miDetails: MediaRelationEntry[] = [];
    if (itemToEdit.mediumInfluences) {
      itemToEdit.mediumInfluences.forEach((mi) => {
        if (typeof mi === 'string') {
          miTitles.push(mi);
        } else {
          miTitles.push(mi.title);
          miDetails.push(mi);
        }
      });
    }

    let existingSoundtracks: { id?: string; title: string }[] = [];
    if (itemToEdit.soundtracks && itemToEdit.soundtracks.length > 0) {
      existingSoundtracks = itemToEdit.soundtracks.map((s) => ({ ...s }));
    } else if (itemToEdit.soundtrackId || itemToEdit.soundtrackTitle) {
      existingSoundtracks = [{ id: itemToEdit.soundtrackId, title: itemToEdit.soundtrackTitle || '' }];
    }

    return {
      cover: itemToEdit.cover || '',
      title: itemToEdit.title || '',
      mainCreator: itemToEdit.mainCreator || '',
      mainCreatorCategory: primaryDetail?.category || 'Author',
      mainCreatorWiki: primaryDetail?.wikiUrl || '',
      mainCreatorPhoto: primaryDetail?.photoUrl || '',
      creatorNation: primaryDetail?.nation || '',
      bandMembers: primaryDetail?.bandMembers ? [...primaryDetail.bandMembers] : [],
      otherCreatorsStr: itemToEdit.otherCreators?.join(', ') || '',
      mediaFormat: isCustom ? 'Custom Category' : canonicalFormat,
      releaseDate: itemToEdit.releaseDate || '',
      countryOfOrigin: itemToEdit.countryOfOrigin || '',
      originalLanguage: itemToEdit.originalLanguage || '',
      genresStr: itemToEdit.genres?.join(', ') || '',
      philosophicalTags: itemToEdit.philosophicalTags ? [...itemToEdit.philosophicalTags] : [],
      genreStyleTags: (itemToEdit.genreStyleTags || []).map((t) => t.toLowerCase()),
      summaryPlot: itemToEdit.summaryPlot || '',
      pros: itemToEdit.pros && itemToEdit.pros.length > 0 ? [...itemToEdit.pros] : [''],
      cons: itemToEdit.cons && itemToEdit.cons.length > 0 ? [...itemToEdit.cons] : [''],
      hornetScore: itemToEdit.hornetScore ?? 9,
      hornetVerdict: itemToEdit.hornetVerdict || '',
      similarMediaStr: smTitles.join(', '),
      similarMediaDetails: smDetails,
      mediumInfluencesStr: miTitles.join(', '),
      mediumInfluencesDetails: miDetails,
      consumedVersion: itemToEdit.consumedVersion || '',
      links: itemToEdit.links && itemToEdit.links.length > 0 ? itemToEdit.links.map((l) => ({ ...l })) : [
        { id: 'l1', label: 'Product Wikipedia / Store Page', url: '' }
      ],
      isCustomCategory: isCustom,
      customCategoryName: itemToEdit.customCategoryName || (isCustom ? itemToEdit.mediaFormat : ''),
      isSoundtrack: Boolean(itemToEdit.isSoundtrack || itemToEdit.soundtrackForId || itemToEdit.soundtrackForTitle),
      soundtrackForId: itemToEdit.soundtrackForId || '',
      soundtrackForTitle: itemToEdit.soundtrackForTitle || '',
      soundtrackEntries: existingSoundtracks
    };
  }

  return {
    cover: '',
    title: '',
    mainCreator: '',
    mainCreatorCategory: 'Game Designer',
    mainCreatorWiki: '',
    mainCreatorPhoto: '',
    creatorNation: '',
    bandMembers: [],
    otherCreatorsStr: '',
    mediaFormat: 'Video Game',
    releaseDate: new Date().toISOString().substring(0, 10),
    countryOfOrigin: '',
    originalLanguage: '',
    genresStr: '',
    philosophicalTags: [],
    genreStyleTags: [],
    summaryPlot: '',
    pros: [''],
    cons: [''],
    hornetScore: 9,
    hornetVerdict: '',
    similarMediaStr: '',
    similarMediaDetails: [],
    mediumInfluencesStr: '',
    mediumInfluencesDetails: [],
    consumedVersion: '',
    links: [{ id: 'l1', label: 'Product Wikipedia / Store Page', url: '' }],
    isCustomCategory: false,
    customCategoryName: '',
    isSoundtrack: false,
    soundtrackForId: '',
    soundtrackForTitle: '',
    soundtrackEntries: []
  };
}

/* =========================================================================
   MEMOIZED ISOLATED FAST SUB-SECTIONS (0ms typing latency)
   ========================================================================= */

// 1. Cover Section
const CoverSection = React.memo<{
  initialCover: string;
  onUpdate: (val: string) => void;
}>(({ initialCover, onUpdate }) => {
  const [val, setVal] = useState(initialCover);
  const [previewSrc, setPreviewSrc] = useState(initialCover);

  useEffect(() => {
    setVal(initialCover);
    setPreviewSrc(initialCover);
  }, [initialCover]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setVal(next);
    setPreviewSrc(next);
    onUpdate(next);
  };

  const handleBlur = async () => {
    const trimmed = val.trim();
    if (trimmed) {
      if (isWikipediaArticleUrl(trimmed)) {
        const wikiImg = await fetchWikipediaImage(trimmed);
        if (wikiImg) {
          setVal(wikiImg);
          setPreviewSrc(wikiImg);
          onUpdate(wikiImg);
          return;
        }
      }
      const formatted = formatImageUrl(trimmed);
      setVal(formatted);
      setPreviewSrc(formatted);
      onUpdate(formatted);
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
        value={val}
        onChange={handleChange}
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

// 2. Basic Info Section (Title, Format, Custom Category, Country, Language)
const BasicInfoSection = React.memo<{
  initialTitle: string;
  initialFormat: MediaFormat;
  initialIsCustom: boolean;
  initialCustomName: string;
  initialCountry: string;
  initialLanguage: string;
  onUpdateField: (field: string, val: any) => void;
  onFormatChange: (fmt: MediaFormat, isCustom: boolean) => void;
}>(({
  initialTitle,
  initialFormat,
  initialIsCustom,
  initialCustomName,
  initialCountry,
  initialLanguage,
  onUpdateField,
  onFormatChange
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [format, setFormat] = useState<MediaFormat>(initialFormat);
  const [isCustom, setIsCustom] = useState(initialIsCustom);
  const [customName, setCustomName] = useState(initialCustomName);
  const [country, setCountry] = useState(initialCountry);
  const [lang, setLang] = useState(initialLanguage);

  useEffect(() => {
    setTitle(initialTitle);
    setFormat(initialFormat);
    setIsCustom(initialIsCustom);
    setCustomName(initialCustomName);
    setCountry(initialCountry);
    setLang(initialLanguage);
  }, [initialTitle, initialFormat, initialIsCustom, initialCustomName, initialCountry, initialLanguage]);

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
            onChange={(e) => {
              setTitle(e.target.value);
              onUpdateField('title', e.target.value);
            }}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-1">
            Media Format / Category *
          </label>
          <select
            value={isCustom ? 'Custom Category' : format}
            onChange={(e) => {
              const val = e.target.value;
              const custom = val === 'Custom Category';
              setIsCustom(custom);
              const nextFmt = custom ? 'Custom Category' : (val as MediaFormat);
              setFormat(nextFmt);
              onUpdateField('isCustomCategory', custom);
              onUpdateField('mediaFormat', nextFmt);
              onFormatChange(nextFmt, custom);
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
            value={country}
            onChange={(e) => {
              setCountry(e.target.value);
              onUpdateField('countryOfOrigin', e.target.value);
            }}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>
      </div>

      {/* Custom Category Details Input */}
      {isCustom && (
        <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/50 space-y-2 font-mono animate-fade-in">
          <label className="block text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
            <Tag size={14} className="text-amber-400" />
            Custom Category Name (e.g. Song Review, Boss Fight, Character) *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Song Review, Boss Fight, Character, Random Review..."
            value={customName}
            onChange={(e) => {
              setCustomName(e.target.value);
              onUpdateField('customCategoryName', e.target.value);
            }}
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
            value={lang}
            onChange={(e) => {
              setLang(e.target.value);
              onUpdateField('originalLanguage', e.target.value);
            }}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>
      </div>
    </div>
  );
});

// 3. Soundtrack Section
const SoundtrackSection = React.memo<{
  mediaFormat: MediaFormat;
  initialIsSoundtrack: boolean;
  initialSoundtrackForId: string;
  initialSoundtrackForTitle: string;
  initialSoundtrackEntries: { id?: string; title: string }[];
  allItems: MediaItem[];
  onUpdateField: (field: string, val: any) => void;
}>(({
  mediaFormat,
  initialIsSoundtrack,
  initialSoundtrackForId,
  initialSoundtrackForTitle,
  initialSoundtrackEntries,
  allItems,
  onUpdateField
}) => {
  const [isSoundtrack, setIsSoundtrack] = useState(initialIsSoundtrack);
  const [soundtrackForId, setSoundtrackForId] = useState(initialSoundtrackForId);
  const [soundtrackForTitle, setSoundtrackForTitle] = useState(initialSoundtrackForTitle);
  const [soundtrackEntries, setSoundtrackEntries] = useState(initialSoundtrackEntries);

  useEffect(() => {
    setIsSoundtrack(initialIsSoundtrack);
    setSoundtrackForId(initialSoundtrackForId);
    setSoundtrackForTitle(initialSoundtrackForTitle);
    setSoundtrackEntries(initialSoundtrackEntries);
  }, [initialIsSoundtrack, initialSoundtrackForId, initialSoundtrackForTitle, initialSoundtrackEntries]);

  const targetMediaOptions = useMemo(() => {
    return allItems
      .filter((i) => i.mediaFormat !== 'Music Album')
      .map((item) => (
        <option key={item.id} value={item.id}>
          {item.title} ({item.mediaFormat} - {item.mainCreator})
        </option>
      ));
  }, [allItems]);

  const soundtrackAlbumOptions = useMemo(() => {
    return allItems
      .filter((i) => i.mediaFormat === 'Music Album')
      .map((album) => (
        <option key={album.id} value={album.id}>
          {album.title} (by {album.mainCreator})
        </option>
      ));
  }, [allItems]);

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
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isSoundtrack}
              onChange={(e) => {
                const next = e.target.checked;
                setIsSoundtrack(next);
                onUpdateField('isSoundtrack', next);
              }}
              className="rounded bg-slate-900 border-slate-700 text-purple-500 focus:ring-purple-500"
            />
            <span className="text-xs font-bold text-purple-300">Yes, it is a soundtrack</span>
          </label>
        </div>

        {isSoundtrack && (
          <div className="pt-2 border-t border-purple-900/60 space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-purple-200">
              Soundtrack For (Media Work):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-slate-400 block mb-1">Select from existing catalog:</span>
                <select
                  value={soundtrackForId}
                  onChange={(e) => {
                    const id = e.target.value;
                    const matched = allItems.find((i) => i.id === id);
                    setSoundtrackForId(id);
                    onUpdateField('soundtrackForId', id);
                    if (matched) {
                      setSoundtrackForTitle(matched.title);
                      onUpdateField('soundtrackForTitle', matched.title);
                    }
                  }}
                  className="w-full bg-slate-900 border border-purple-800/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-purple-400 font-mono"
                >
                  <option value="">-- Choose Existing Media --</option>
                  {targetMediaOptions}
                </select>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 block mb-1">Or type title manually:</span>
                <input
                  type="text"
                  placeholder="e.g. NieR: Automata, Dune, Solaris..."
                  value={soundtrackForTitle}
                  onChange={(e) => {
                    setSoundtrackForTitle(e.target.value);
                    onUpdateField('soundtrackForTitle', e.target.value);
                  }}
                  className="w-full bg-slate-900 border border-purple-800/80 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-purple-400 font-mono"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-800/50 space-y-3 font-mono">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
            <Disc size={15} /> Associated Soundtrack Albums (OSTs)
          </label>
          <p className="text-[11px] text-slate-400 font-sans mt-0.5">
            Link one or more official soundtrack albums associated with this media.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const next = [...soundtrackEntries, { title: '' }];
            setSoundtrackEntries(next);
            onUpdateField('soundtrackEntries', next);
          }}
          className="text-xs font-mono text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
        >
          <Plus size={13} /> Add Soundtrack Album
        </button>
      </div>

      <div className="space-y-2">
        {soundtrackEntries.map((st, idx) => (
          <div key={`st-${idx}`} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 rounded-lg bg-slate-950/60 border border-purple-900/40">
            <div className="flex-1">
              <span className="text-[10px] text-slate-400 block mb-0.5">Select existing music album:</span>
              <select
                value={st.id || ''}
                onChange={(e) => {
                  const id = e.target.value;
                  const album = allItems.find((i) => i.id === id);
                  const next = [...soundtrackEntries];
                  next[idx] = { id: id || undefined, title: album ? album.title : next[idx].title };
                  setSoundtrackEntries(next);
                  onUpdateField('soundtrackEntries', next);
                }}
                className="w-full bg-slate-900 border border-purple-900/80 rounded px-2 py-1 text-xs text-slate-100 focus:outline-none focus:border-purple-400 font-mono"
              >
                <option value="">-- Choose Album from Archive --</option>
                {soundtrackAlbumOptions}
              </select>
            </div>

            <div className="flex-1">
              <span className="text-[10px] text-slate-400 block mb-0.5">Or enter album name:</span>
              <input
                type="text"
                placeholder="e.g. NieR:Automata OST, Volume 1..."
                value={st.title}
                onChange={(e) => {
                  const next = [...soundtrackEntries];
                  next[idx] = { ...next[idx], title: e.target.value };
                  setSoundtrackEntries(next);
                  onUpdateField('soundtrackEntries', next);
                }}
                className="w-full bg-slate-900 border border-purple-900/80 rounded px-2 py-1 text-xs text-slate-100 focus:outline-none focus:border-purple-400 font-mono"
              />
            </div>

            <div className="flex items-end pb-0.5 justify-end">
              <button
                type="button"
                onClick={() => {
                  const next = soundtrackEntries.filter((_, i) => i !== idx);
                  setSoundtrackEntries(next);
                  onUpdateField('soundtrackEntries', next);
                }}
                className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer"
                title="Remove soundtrack entry"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

// 4. Creator Profile Section
const CreatorSection = React.memo<{
  initialMainCreator: string;
  initialCategory: CreatorCategory;
  initialNation: string;
  initialWiki: string;
  initialPhoto: string;
  onUpdateField: (field: string, val: any) => void;
  onCategoryChange: (cat: CreatorCategory) => void;
  onMainCreatorChange: (val: string) => void;
}>(({
  initialMainCreator,
  initialCategory,
  initialNation,
  initialWiki,
  initialPhoto,
  onUpdateField,
  onCategoryChange,
  onMainCreatorChange
}) => {
  const [creator, setCreator] = useState(initialMainCreator);
  const [category, setCategory] = useState<CreatorCategory>(initialCategory);
  const [nation, setNation] = useState(initialNation);
  const [wiki, setWiki] = useState(initialWiki);
  const [photo, setPhoto] = useState(initialPhoto);

  useEffect(() => {
    setCreator(initialMainCreator);
    setCategory(initialCategory);
    setNation(initialNation);
    setWiki(initialWiki);
    setPhoto(initialPhoto);
  }, [initialMainCreator, initialCategory, initialNation, initialWiki, initialPhoto]);

  return (
    <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <label className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
          <User size={14} /> Main Creator Profile
        </label>
        <span className="text-[10px] font-mono text-slate-400">
          Main creator bio data & global catalog linkage
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-1">
            Creator Name *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Yoko Taro, Denis Villeneuve..."
            value={creator}
            onChange={(e) => {
              setCreator(e.target.value);
              onUpdateField('mainCreator', e.target.value);
              onMainCreatorChange(e.target.value);
            }}
            onBlur={() => {
              if (creator.trim() && !wiki.trim()) {
                const cleanName = creator.split('/')[0].trim();
                const autoWiki = `https://en.wikipedia.org/wiki/${encodeURIComponent(cleanName)}`;
                setWiki(autoWiki);
                onUpdateField('mainCreatorWiki', autoWiki);
              }
            }}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-1">
            Creator Role *
          </label>
          <select
            value={category}
            onChange={(e) => {
              const nextCat = e.target.value as CreatorCategory;
              setCategory(nextCat);
              onUpdateField('mainCreatorCategory', nextCat);
              onCategoryChange(nextCat);
            }}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
          >
            {CREATOR_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1">
            <Flag size={11} className="text-amber-400" /> Nationality
          </label>
          <input
            type="text"
            placeholder="e.g. Japanese, Canadian..."
            value={nation}
            onChange={(e) => {
              setNation(e.target.value);
              onUpdateField('creatorNation', e.target.value);
            }}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div>
          <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1">
            <LinkIcon size={11} className="text-cyan-400" /> Wikipedia / Official Bio URL
          </label>
          <input
            type="text"
            placeholder="https://en.wikipedia.org/wiki/..."
            value={wiki}
            onChange={(e) => {
              setWiki(e.target.value);
              onUpdateField('mainCreatorWiki', e.target.value);
            }}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-1 flex items-center gap-1">
            <ImageIcon size={11} className="text-amber-400" /> Portrait / Photo URL
          </label>
          <input
            type="text"
            placeholder="Direct photo link (optional)..."
            value={photo}
            onChange={(e) => {
              setPhoto(e.target.value);
              onUpdateField('mainCreatorPhoto', e.target.value);
            }}
            className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>
      </div>
    </div>
  );
});

// 5. Band Lineup Section
const BandLineupSection = React.memo<{
  mainCreator: string;
  initialBandMembers: BandMember[];
  allItems: MediaItem[];
  onUpdateMembers: (members: BandMember[]) => void;
}>(({ mainCreator, initialBandMembers, allItems, onUpdateMembers }) => {
  const [members, setMembers] = useState<BandMember[]>(initialBandMembers);
  const [bulkText, setBulkText] = useState('');

  useEffect(() => {
    setMembers(initialBandMembers);
  }, [initialBandMembers]);

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

  const updateList = (newList: BandMember[]) => {
    setMembers(newList);
    onUpdateMembers(newList);
  };

  const handleAddMember = (defaultRole = 'Musician') => {
    updateList([
      ...members,
      { name: '', bandRole: defaultRole, participatedInProduct: true, productRole: defaultRole }
    ]);
  };

  const handleUpdateRow = (idx: number, field: keyof BandMember, val: any) => {
    const next = [...members];
    next[idx] = { ...next[idx], [field]: val };
    updateList(next);
  };

  const handleRemoveRow = (idx: number) => {
    updateList(members.filter((_, i) => i !== idx));
  };

  const handleBulkImport = () => {
    if (!bulkText.trim()) return;
    const tokens = bulkText.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
    const added: BandMember[] = [];
    tokens.forEach((token) => {
      const parts = token.split(/[-–—/:]+/);
      const name = parts[0].trim();
      const role = parts[1]?.trim() || 'Musician';
      if (name && !members.some((m) => m.name.toLowerCase() === name.toLowerCase())) {
        added.push({
          name,
          bandRole: role,
          participatedInProduct: true,
          productRole: role
        });
      }
    });
    if (added.length > 0) {
      updateList([...members, ...added]);
      setBulkText('');
    }
  };

  return (
    <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-800/40 space-y-4 font-mono animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-900/60 pb-2">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300">
            Band Lineup & Musician Credits: {mainCreator || 'This Band'}
          </h4>
          <p className="text-[11px] text-slate-400 font-sans mt-0.5">
            Maintain band personnel, instruments, and album performance credits.
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleAddMember('Musician')}
          className="text-xs font-mono text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer self-start sm:self-auto"
        >
          <Plus size={13} /> Add Musician
        </button>
      </div>

      {/* Preset Quick-Add Roles */}
      <div className="space-y-1">
        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
          Quick Preset Roles:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {['Lead Vocals', 'Lead Guitar', 'Rhythm Guitar', 'Bass Guitar', 'Drums & Percussion', 'Keyboards & Synths', 'Composer', 'Producer'].map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => handleAddMember(role)}
              className="px-2 py-0.5 rounded text-[10px] bg-slate-900 hover:bg-slate-800 text-purple-300 border border-purple-800/60 transition cursor-pointer"
            >
              + {role}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Paste */}
      <div className="p-2.5 rounded-lg bg-slate-950/60 border border-purple-900/40 space-y-2">
        <label className="text-[11px] font-bold text-slate-300 block">
          Bulk Paste Band Members (one per line, e.g. "Mikael Åkerfeldt - Lead Vocals"):
        </label>
        <div className="flex gap-2">
          <textarea
            rows={2}
            placeholder="Fredrik Åkesson - Guitar&#10;Martín Méndez - Bass"
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-400 font-mono"
          />
          <button
            type="button"
            onClick={handleBulkImport}
            className="px-3 py-1 bg-purple-700 hover:bg-purple-600 text-white rounded text-xs font-bold transition cursor-pointer self-end shrink-0"
          >
            Import
          </button>
        </div>
      </div>

      {/* Known Members */}
      {knownBandMembers.length > 0 && (
        <div className="space-y-1 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase">
              Known Band Personnel from Other Archive Entries:
            </span>
            <button
              type="button"
              onClick={() => {
                const missing = knownBandMembers.filter(
                  (km) => !members.some((m) => m.name.toLowerCase() === km.name.toLowerCase())
                );
                if (missing.length > 0) {
                  updateList([
                    ...members,
                    ...missing.map((km) => ({ ...km, participatedInProduct: true, productRole: km.bandRole }))
                  ]);
                }
              }}
              className="text-[10px] text-amber-400 hover:underline cursor-pointer"
            >
              + Import All Known Members
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {knownBandMembers.map((km, idx) => {
              const isAdded = members.some((m) => m.name.toLowerCase() === km.name.toLowerCase());
              return (
                <button
                  key={`known-${km.name}-${idx}`}
                  type="button"
                  disabled={isAdded}
                  onClick={() => {
                    if (!isAdded) {
                      updateList([
                        ...members,
                        { ...km, participatedInProduct: true, productRole: km.bandRole }
                      ]);
                    }
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] border transition cursor-pointer ${
                    isAdded
                      ? 'bg-slate-950 text-slate-600 border-slate-800 cursor-default'
                      : 'bg-slate-900 hover:bg-slate-800 text-cyan-300 border-cyan-800/60'
                  }`}
                >
                  {isAdded ? '✓' : '+'} {km.name} ({km.bandRole})
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Members Table */}
      <div className="space-y-2 pt-2 border-t border-purple-900/40">
        {members.map((m, idx) => (
          <div key={`bm-${idx}`} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 rounded-lg bg-slate-950/70 border border-slate-800">
            <input
              type="text"
              placeholder="Musician Name (e.g. John Petrucci)..."
              value={m.name}
              onChange={(e) => handleUpdateRow(idx, 'name', e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 focus:outline-none focus:border-purple-400 font-mono"
            />
            <input
              type="text"
              placeholder="Primary Role (e.g. Lead Guitar)..."
              value={m.bandRole}
              onChange={(e) => handleUpdateRow(idx, 'bandRole', e.target.value)}
              className="w-36 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 focus:outline-none focus:border-purple-400 font-mono"
            />
            <label className="flex items-center gap-1.5 px-2 py-1 bg-slate-900/80 rounded border border-slate-800 text-[11px] text-slate-300 cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={m.participatedInProduct ?? true}
                onChange={(e) => handleUpdateRow(idx, 'participatedInProduct', e.target.checked)}
                className="rounded bg-slate-950 border-slate-700 text-purple-500"
              />
              <span>Credited on this Release</span>
            </label>
            <button
              type="button"
              onClick={() => handleRemoveRow(idx)}
              className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer self-end sm:self-auto"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
});

// 6. Release & Other Creators Section
const ReleaseAndOtherCreatorsSection = React.memo<{
  initialOtherCreators: string;
  initialReleaseDate: string;
  initialConsumedVersion: string;
  onUpdateField: (field: string, val: any) => void;
}>(({
  initialOtherCreators,
  initialReleaseDate,
  initialConsumedVersion,
  onUpdateField
}) => {
  const [otherCreators, setOtherCreators] = useState(initialOtherCreators);
  const [date, setDate] = useState(initialReleaseDate);
  const [version, setVersion] = useState(initialConsumedVersion);

  useEffect(() => {
    setOtherCreators(initialOtherCreators);
    setDate(initialReleaseDate);
    setVersion(initialConsumedVersion);
  }, [initialOtherCreators, initialReleaseDate, initialConsumedVersion]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-1">
          Other Creators & Collaborators
        </label>
        <input
          type="text"
          placeholder="e.g. Keiichi Okabe/Music Artist, Greg Kasavin/Writer..."
          value={otherCreators}
          onChange={(e) => {
            setOtherCreators(e.target.value);
            onUpdateField('otherCreatorsStr', e.target.value);
          }}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
        />
      </div>

      <div>
        <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-1">
          Release Date / Year *
        </label>
        <input
          type="text"
          required
          placeholder="YYYY-MM-DD or YYYY"
          value={date}
          onChange={(e) => {
            setDate(e.target.value);
            onUpdateField('releaseDate', e.target.value);
          }}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
        />
      </div>

      <div>
        <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-1">
          Consumed / Reviewed Version
        </label>
        <input
          type="text"
          placeholder="e.g. PS5 Remastered (2024), 1st Edition Hardcover..."
          value={version}
          onChange={(e) => {
            setVersion(e.target.value);
            onUpdateField('consumedVersion', e.target.value);
          }}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
        />
      </div>
    </div>
  );
});

// 7. Genres & Tags Section
const GenresAndTagsSection = React.memo<{
  initialGenresStr: string;
  initialPhilosophicalTags: string[];
  initialGenreStyleTags: string[];
  existingPhilosophicalTags: string[];
  existingStyleTags: string[];
  onUpdateField: (field: string, val: any) => void;
}>(({
  initialGenresStr,
  initialPhilosophicalTags,
  initialGenreStyleTags,
  existingPhilosophicalTags,
  existingStyleTags,
  onUpdateField
}) => {
  const [genres, setGenres] = useState(initialGenresStr);
  const [philoTags, setPhiloTags] = useState(initialPhilosophicalTags);
  const [styleTags, setStyleTags] = useState(initialGenreStyleTags);
  const [customPhilo, setCustomPhilo] = useState('');
  const [customStyle, setCustomStyle] = useState('');

  useEffect(() => {
    setGenres(initialGenresStr);
    setPhiloTags(initialPhilosophicalTags);
    setStyleTags(initialGenreStyleTags);
  }, [initialGenresStr, initialPhilosophicalTags, initialGenreStyleTags]);

  const handleAddPhilo = (tag: string) => {
    const t = tag.trim();
    if (t && !philoTags.some((pt) => pt.toLowerCase() === t.toLowerCase())) {
      const next = [...philoTags, t];
      setPhiloTags(next);
      onUpdateField('philosophicalTags', next);
    }
    setCustomPhilo('');
  };

  const handleRemovePhilo = (tag: string) => {
    const next = philoTags.filter((t) => t.toLowerCase() !== tag.toLowerCase());
    setPhiloTags(next);
    onUpdateField('philosophicalTags', next);
  };

  const handleAddStyle = (tag: string) => {
    const t = tag.trim().toLowerCase();
    if (t && !styleTags.includes(t)) {
      const next = [...styleTags, t];
      setStyleTags(next);
      onUpdateField('genreStyleTags', next);
    }
    setCustomStyle('');
  };

  const handleRemoveStyle = (tag: string) => {
    const next = styleTags.filter((t) => t.toLowerCase() !== tag.toLowerCase());
    setStyleTags(next);
    onUpdateField('genreStyleTags', next);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-1">
          Genres (Comma separated)
        </label>
        <input
          type="text"
          placeholder="e.g. Action RPG, Sci-Fi, Psychological Drama, Post-Apocalyptic..."
          value={genres}
          onChange={(e) => {
            setGenres(e.target.value);
            onUpdateField('genresStr', e.target.value);
          }}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Philosophical Themes */}
        <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-3">
          <label className="text-xs font-mono font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
            <Tag size={13} /> Philosophical Themes & Motifs
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Nihilism, Free Will..."
              value={customPhilo}
              onChange={(e) => setCustomPhilo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddPhilo(customPhilo);
                }
              }}
              className="flex-1 bg-slate-950 border border-purple-500/40 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-purple-400 font-mono"
            />
            <button
              type="button"
              onClick={() => handleAddPhilo(customPhilo)}
              className="px-3 py-1 bg-purple-700 hover:bg-purple-600 text-white rounded text-xs font-mono font-bold transition cursor-pointer"
            >
              Add
            </button>
          </div>

          {/* Existing tags quick picker */}
          {existingPhilosophicalTags.length > 0 && (
            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pt-1">
              {existingPhilosophicalTags.slice(0, 15).map((t, idx) => (
                <button
                  key={`p-${t}-${idx}`}
                  type="button"
                  onClick={() => handleAddPhilo(t)}
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 hover:bg-slate-800 text-purple-300 border border-purple-900/60 transition cursor-pointer"
                >
                  + {t}
                </button>
              ))}
            </div>
          )}

          {/* Selected tags */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {philoTags.map((tag, idx) => (
              <span
                key={`sel-p-${tag}-${idx}`}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-purple-700 text-white text-xs font-sans font-medium"
              >
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => handleRemovePhilo(tag)}
                  className="hover:text-rose-300 cursor-pointer"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Style & Aesthetic Tags */}
        <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-3">
          <label className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <Tag size={13} /> Genre & Aesthetic Style Tags
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. atmospheric, melancholic, brutalist..."
              value={customStyle}
              onChange={(e) => setCustomStyle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddStyle(customStyle);
                }
              }}
              className="flex-1 bg-slate-950 border border-emerald-500/40 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-400 font-mono"
            />
            <button
              type="button"
              onClick={() => handleAddStyle(customStyle)}
              className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-mono font-bold transition cursor-pointer"
            >
              Add
            </button>
          </div>

          {/* Existing style tags quick picker */}
          {existingStyleTags.length > 0 && (
            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto pt-1">
              {existingStyleTags.slice(0, 15).map((t, idx) => (
                <button
                  key={`s-${t}-${idx}`}
                  type="button"
                  onClick={() => handleAddStyle(t)}
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-900/60 transition cursor-pointer"
                >
                  + {t}
                </button>
              ))}
            </div>
          )}

          {/* Selected tags */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {styleTags.map((tag, idx) => (
              <span
                key={`sel-s-${tag}-${idx}`}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-700 text-white text-xs font-sans font-medium"
              >
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveStyle(tag)}
                  className="hover:text-rose-300 cursor-pointer"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

// 8. Review & Scoring Section (Summary Plot, Score Slider, Verdict)
const ReviewAndScoringSection = React.memo<{
  initialPlot: string;
  initialScore: number;
  initialVerdict: string;
  onUpdateField: (field: string, val: any) => void;
}>(({ initialPlot, initialScore, initialVerdict, onUpdateField }) => {
  const [plot, setPlot] = useState(initialPlot);
  const [score, setScore] = useState(initialScore);
  const [verdict, setVerdict] = useState(initialVerdict);

  useEffect(() => {
    setPlot(initialPlot);
    setScore(initialScore);
    setVerdict(initialVerdict);
  }, [initialPlot, initialScore, initialVerdict]);

  const levelInfo = useMemo(() => getScoreLevelInfo(score), [score]);

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-xs font-mono font-bold uppercase tracking-wider text-slate-300 mb-1">
          Summary Plot & Premise
        </label>
        <textarea
          rows={3}
          placeholder="Enter a brief summary plot, central narrative premise, or thematic overview..."
          value={plot}
          onChange={(e) => {
            setPlot(e.target.value);
            onUpdateField('summaryPlot', e.target.value);
          }}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-sans"
        />
      </div>

      <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <label className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Award size={15} /> Hornet's Score (1 to 10 Scale)
            </label>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold font-mono ${levelInfo.color}`}>
                {score}/10 — {levelInfo.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={score}
              onChange={(e) => {
                const next = Number(e.target.value);
                setScore(next);
                onUpdateField('hornetScore', next);
              }}
              className="w-40 accent-amber-500 bg-slate-800 cursor-pointer"
            />
            <input
              type="number"
              min="1"
              max="10"
              step="1"
              value={score}
              onChange={(e) => {
                const next = Math.max(1, Math.min(10, Number(e.target.value) || 1));
                setScore(next);
                onUpdateField('hornetScore', next);
              }}
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
            value={verdict}
            onChange={(e) => {
              setVerdict(e.target.value);
              onUpdateField('hornetVerdict', e.target.value);
            }}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-sans"
          />
        </div>
      </div>
    </div>
  );
});

// 9. Pros & Cons Section (Hyperfast dynamic rows)
const ProsAndConsSection = React.memo<{
  initialPros: string[];
  initialCons: string[];
  onUpdateField: (field: string, val: any) => void;
}>(({ initialPros, initialCons, onUpdateField }) => {
  const [pros, setPros] = useState(initialPros);
  const [cons, setCons] = useState(initialCons);

  useEffect(() => {
    setPros(initialPros);
    setCons(initialCons);
  }, [initialPros, initialCons]);

  const updatePros = (next: string[]) => {
    setPros(next);
    onUpdateField('pros', next);
  };

  const updateCons = (next: string[]) => {
    setCons(next);
    onUpdateField('cons', next);
  };

  const handleAddPro = () => {
    updatePros([...pros, '']);
  };

  const handleAddCon = () => {
    updateCons([...cons, '']);
  };

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
            onClick={handleAddPro}
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
                onChange={(e) => {
                  const next = [...pros];
                  next[idx] = e.target.value;
                  updatePros(next);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddPro();
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
                onClick={() => {
                  const next = pros.filter((_, i) => i !== idx);
                  updatePros(next.length > 0 ? next : ['']);
                }}
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
            onClick={handleAddCon}
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
                onChange={(e) => {
                  const next = [...cons];
                  next[idx] = e.target.value;
                  updateCons(next);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCon();
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
                onClick={() => {
                  const next = cons.filter((_, i) => i !== idx);
                  updateCons(next.length > 0 ? next : ['']);
                }}
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

// 10. Relations Section (Medium Influences & Similar Media)
const RelationsSection = React.memo<{
  initialInfluencesStr: string;
  initialInfluencesDetails: MediaRelationEntry[];
  initialSimilarStr: string;
  initialSimilarDetails: MediaRelationEntry[];
  onUpdateField: (field: string, val: any) => void;
}>(({
  initialInfluencesStr,
  initialInfluencesDetails,
  initialSimilarStr,
  initialSimilarDetails,
  onUpdateField
}) => {
  const [infStr, setInfStr] = useState(initialInfluencesStr);
  const [infDetails, setInfDetails] = useState(initialInfluencesDetails);
  const [simStr, setSimStr] = useState(initialSimilarStr);
  const [simDetails, setSimDetails] = useState(initialSimilarDetails);

  useEffect(() => {
    setInfStr(initialInfluencesStr);
    setInfDetails(initialInfluencesDetails);
    setSimStr(initialSimilarStr);
    setSimDetails(initialSimilarDetails);
  }, [initialInfluencesStr, initialInfluencesDetails, initialSimilarStr, initialSimilarDetails]);

  const parsedInfList = useMemo(() => {
    return infStr.split(',').map((s) => s.trim()).filter(Boolean);
  }, [infStr]);

  const parsedSimList = useMemo(() => {
    return simStr.split(',').map((s) => s.trim()).filter(Boolean);
  }, [simStr]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Medium Influences */}
      <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
        <div>
          <label className="block text-xs font-mono font-bold uppercase tracking-wider text-amber-400 mb-1">
            Medium Influences & Inspirations (Comma separated)
          </label>
          <p className="text-[11px] font-mono text-slate-400 mb-2">
            Enter name-drops or media that directly influenced this work.
          </p>
          <input
            type="text"
            placeholder="e.g. Crime and Punishment, Solaris, Akira, Neuromancer..."
            value={infStr}
            onChange={(e) => {
              setInfStr(e.target.value);
              onUpdateField('mediumInfluencesStr', e.target.value);
            }}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        {parsedInfList.length > 0 && (
          <div className="space-y-2 pt-1 border-t border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">
              Custom Covers for Uncataloged Influences (Optional)
            </span>
            {parsedInfList.map((titleStr, idx) => {
              const match = infDetails.find((d) => d.title.toLowerCase().trim() === titleStr.toLowerCase().trim());
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
                      const next = [...infDetails];
                      const existingIdx = next.findIndex((d) => d.title.toLowerCase().trim() === titleStr.toLowerCase().trim());
                      if (existingIdx >= 0) {
                        next[existingIdx] = { ...next[existingIdx], customCover: val };
                      } else {
                        next.push({ title: titleStr, customCover: val });
                      }
                      setInfDetails(next);
                      onUpdateField('mediumInfluencesDetails', next);
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
            Enter similar media titles. Uncataloged titles automatically link once added to archive!
          </p>
          <input
            type="text"
            placeholder="e.g. Ghost in the Shell, SOMA, Planescape..."
            value={simStr}
            onChange={(e) => {
              setSimStr(e.target.value);
              onUpdateField('similarMediaStr', e.target.value);
            }}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        {parsedSimList.length > 0 && (
          <div className="space-y-2 pt-1 border-t border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-bold">
              Custom Covers for Uncataloged Similar Media
            </span>
            {parsedSimList.map((titleStr, idx) => {
              const match = simDetails.find((d) => d.title.toLowerCase().trim() === titleStr.toLowerCase().trim());
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
                      const next = [...simDetails];
                      const existingIdx = next.findIndex((d) => d.title.toLowerCase().trim() === titleStr.toLowerCase().trim());
                      if (existingIdx >= 0) {
                        next[existingIdx] = { ...next[existingIdx], customCover: val };
                      } else {
                        next.push({ title: titleStr, customCover: val });
                      }
                      setSimDetails(next);
                      onUpdateField('similarMediaDetails', next);
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

// 11. External Links Section
const ExternalLinksSection = React.memo<{
  initialLinks: MediaLink[];
  onUpdateLinks: (links: MediaLink[]) => void;
}>(({ initialLinks, onUpdateLinks }) => {
  const [links, setLinks] = useState<MediaLink[]>(initialLinks);

  useEffect(() => {
    setLinks(initialLinks);
  }, [initialLinks]);

  const updateList = (next: MediaLink[]) => {
    setLinks(next);
    onUpdateLinks(next);
  };

  return (
    <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1">
          <LinkIcon size={12} /> External Links
        </label>
        <button
          type="button"
          onClick={() => updateList([...links, { id: `link-${Date.now()}`, label: '', url: '' }])}
          className="text-xs font-mono text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
        >
          <Plus size={12} /> Add Link
        </button>
      </div>

      <div className="space-y-2">
        {links.map((link, idx) => (
          <div key={link.id || idx} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Label (Steam, IMDb...)"
              value={link.label}
              onChange={(e) => {
                const next = [...links];
                next[idx] = { ...next[idx], label: e.target.value };
                updateList(next);
              }}
              className="w-28 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
            />
            <input
              type="text"
              placeholder="URL (https://...)"
              value={link.url}
              onChange={(e) => {
                const next = [...links];
                next[idx] = { ...next[idx], url: e.target.value };
                updateList(next);
              }}
              className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-mono"
            />
            <button
              type="button"
              onClick={() => {
                const next = links.filter((_, i) => i !== idx);
                updateList(next);
              }}
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

/* =========================================================================
   MAIN ADMIN MEDIA MODAL COMPONENT (High-Speed Form Engine)
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

  // Key used to instantly reset/repopulate form fields when sample is clicked or itemToEdit changes
  const [formKey, setFormKey] = useState<number>(0);
  const [formData, setFormData] = useState<FormDataShape>(() => getDefaultFormData(itemToEdit));

  // Mutable ref for immediate access to current values during submission without forcing parent renders
  const formRef = useRef<FormDataShape>(formData);

  // Sync state whenever itemToEdit changes or modal opens
  useEffect(() => {
    const fresh = getDefaultFormData(itemToEdit);
    setFormData(fresh);
    formRef.current = fresh;
    setFormKey((k) => k + 1);
  }, [itemToEdit, isOpen]);

  // Fast single-field updater that does NOT trigger modal re-render for text inputs
  const handleUpdateField = useCallback((field: string, val: any) => {
    (formRef.current as any)[field] = val;
  }, []);

  // Format change handler for conditional sub-sections (Band Lineup, Soundtrack)
  const handleFormatChange = useCallback((fmt: MediaFormat, isCustom: boolean) => {
    formRef.current.mediaFormat = fmt;
    formRef.current.isCustomCategory = isCustom;
    setFormData((prev) => ({ ...prev, mediaFormat: fmt, isCustomCategory: isCustom }));
  }, []);

  const handleCreatorCategoryChange = useCallback((cat: CreatorCategory) => {
    formRef.current.mainCreatorCategory = cat;
    setFormData((prev) => ({ ...prev, mainCreatorCategory: cat }));
  }, []);

  const handleMainCreatorChange = useCallback((val: string) => {
    formRef.current.mainCreator = val;
  }, []);

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

  // Collect all known genre tags across items for auto-correction
  const existingGenresPool = useMemo(() => {
    const set = new Set<string>();
    allItems.forEach((i) => i.genres?.forEach((g) => set.add(g.trim())));
    return Array.from(set);
  }, [allItems]);

  // Fill sample data
  const handleQuickSampleData = useCallback(() => {
    const sample: FormDataShape = {
      cover: 'https://upload.wikimedia.org/wikipedia/en/2/23/Solaris_novel.jpg',
      title: 'Solaris',
      mainCreator: 'Stanisław Lem',
      mainCreatorCategory: 'Author',
      mainCreatorWiki: 'https://en.wikipedia.org/wiki/Stanis%C5%82aw_Lem',
      mainCreatorPhoto: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1b/Stanislaw_Lem_by_Wojciech_Zemek.jpg/440px-Stanislaw_Lem_by_Wojciech_Zemek.jpg',
      creatorNation: 'Poland',
      bandMembers: [],
      otherCreatorsStr: '',
      mediaFormat: 'Book / Novel',
      isCustomCategory: false,
      customCategoryName: '',
      releaseDate: '1961-01-01',
      countryOfOrigin: 'Poland',
      originalLanguage: 'Polish',
      genresStr: 'Philosophical Sci-Fi, Psychological Drama, Existential Mystery',
      philosophicalTags: [
        'Existentialism',
        'Epistemology',
        'Solipsism',
        'Anthropocentrism'
      ],
      genreStyleTags: ['surreal', 'eerie', 'cerebral', 'atmospheric'],
      summaryPlot: 'A psychologist sent to an enigmatic oceanic planet encounters unsettling physical manifestations of his deepest repressed memories.',
      pros: [
        'Profound meditation on humanity’s inability to truly comprehend non-human intelligence',
        'Unforgettably eerie oceanic manifestations of emotional subconscious'
      ],
      cons: [
        'Academic chapter descriptions slow narrative momentum'
      ],
      hornetScore: 10,
      hornetVerdict: 'A transcendent masterpiece on the epistemological boundaries of human perception.',
      similarMediaStr: 'Stalker, Annihilation, Arrival',
      similarMediaDetails: [],
      mediumInfluencesStr: 'Crime and Punishment',
      mediumInfluencesDetails: [],
      consumedVersion: '1st Polish Edition (Translated by Bill Johnston)',
      links: [
        { id: 'l1', label: 'Goodreads', url: 'https://www.goodreads.com/book/show/95558.Solaris' },
        { id: 'l2', label: 'Product Wikipedia', url: 'https://en.wikipedia.org/wiki/Solaris_(novel)' }
      ],
      isSoundtrack: false,
      soundtrackForId: '',
      soundtrackForTitle: '',
      soundtrackEntries: []
    };

    setFormData(sample);
    formRef.current = sample;
    setFormKey((k) => k + 1);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const current = formRef.current;

    if (!current.title.trim()) {
      alert('Please provide a Title.');
      return;
    }

    const mainNameClean = current.mainCreator.trim().split('/')[0].trim() || 'Unknown Creator';
    const mainRoleClean = current.mainCreator.includes('/') ? current.mainCreator.split('/')[1]?.trim() : null;

    const parsedOtherCreators = current.otherCreatorsStr
      ? current.otherCreatorsStr.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const creatorDetails: CreatorDetails[] = [
      {
        name: mainNameClean,
        category: (mainRoleClean as CreatorCategory) || current.mainCreatorCategory,
        nation: current.creatorNation.trim() || undefined,
        wikiUrl: current.mainCreatorWiki.trim() || `https://en.wikipedia.org/wiki/${encodeURIComponent(mainNameClean)}`,
        photoUrl: current.mainCreatorPhoto.trim() || undefined,
        bandMembers: current.mainCreatorCategory === 'Band' || current.bandMembers.length > 0 ? current.bandMembers : undefined
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

    const formattedCover = formatImageUrl(current.cover);

    // Build similarMedia relations
    const parsedSimilarTitles = current.similarMediaStr
      ? current.similarMediaStr.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const similarMedia: (string | MediaRelationEntry)[] = parsedSimilarTitles.map((t) => {
      const detail = current.similarMediaDetails.find((d) => d.title.toLowerCase().trim() === t.toLowerCase().trim());
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
    const parsedInfluenceTitles = current.mediumInfluencesStr
      ? current.mediumInfluencesStr.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const mediumInfluences: (string | MediaRelationEntry)[] = parsedInfluenceTitles.map((t) => {
      const detail = current.mediumInfluencesDetails.find((d) => d.title.toLowerCase().trim() === t.toLowerCase().trim());
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
    const processedGenres = processTagList(current.genresStr, existingGenresPool);
    const processedPhiloTags = processTagList(current.philosophicalTags, existingPhilosophicalTags);
    const processedStyleTags = processTagList(current.genreStyleTags, existingStyleTags);

    const targetFormat = current.isCustomCategory ? (current.customCategoryName.trim() || 'Custom Category') : current.mediaFormat;
    const { canonicalFormat, isCustom: finalIsCustom } = normalizeMediaFormat(targetFormat);
    const effectiveFormat = finalIsCustom ? (current.customCategoryName.trim() || 'Custom Category') : canonicalFormat;

    const newItem: MediaItem = {
      id: itemToEdit ? itemToEdit.id : `item-${Date.now()}`,
      cover: formattedCover,
      title: current.title.trim(),
      mainCreator: current.mainCreator.trim() || 'Unknown Creator',
      otherCreators: parsedOtherCreators,
      creatorDetails,
      mediaFormat: effectiveFormat,
      isCustomCategory: finalIsCustom,
      customCategoryName: finalIsCustom ? (current.customCategoryName.trim() || 'Custom Category') : undefined,
      releaseDate: current.releaseDate.trim() || new Date().toISOString().substring(0, 10),
      countryOfOrigin: current.countryOfOrigin.trim() || undefined,
      originalLanguage: current.originalLanguage.trim() || undefined,
      genres: processedGenres,
      philosophicalTags: processedPhiloTags,
      genreStyleTags: processedStyleTags,
      summaryPlot: current.summaryPlot.trim(),
      pros: current.pros.map((p) => p.trim()).filter(Boolean),
      cons: current.cons.map((c) => c.trim()).filter(Boolean),
      hornetScore: current.hornetScore,
      hornetVerdict: current.hornetVerdict.trim(),
      similarMedia,
      mediumInfluences,
      consumedVersion: current.consumedVersion.trim() || undefined,
      links: current.links.filter((l) => l.label.trim() && l.url.trim()),
      isSoundtrack: current.mediaFormat === 'Music Album' ? current.isSoundtrack : undefined,
      soundtrackForId: current.mediaFormat === 'Music Album' && current.isSoundtrack ? current.soundtrackForId || undefined : undefined,
      soundtrackForTitle: current.mediaFormat === 'Music Album' && current.isSoundtrack ? current.soundtrackForTitle || undefined : undefined,
      soundtracks: current.mediaFormat !== 'Music Album' && current.soundtrackEntries.length > 0
        ? current.soundtrackEntries.filter((s) => s.title.trim())
        : undefined,
      createdAt: itemToEdit ? itemToEdit.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Check for interconnected link matches in archive
    if (allItems.length > 0) {
      const matches: typeof pendingLinkMatches = [];

      parsedInfluenceTitles.forEach((t) => {
        const norm = t.toLowerCase().trim();
        const existingDetail = current.mediumInfluencesDetails.find((d) => d.title.toLowerCase().trim() === norm);
        if (existingDetail?.unlinked) return;

        const matchedProd = allItems.find((i) => i.id !== (itemToEdit?.id || '') && i.title.toLowerCase().trim() === norm);
        if (matchedProd) {
          matches.push({
            id: `inf-${norm}`,
            field: 'mediumInfluences',
            rawTitle: t,
            matchedType: 'product',
            matchedLabel: matchedProd.title,
            matchedSub: `${matchedProd.mediaFormat} (${matchedProd.releaseDate?.substring(0, 4) || ''}) by ${matchedProd.mainCreator}`,
            shouldLink: true
          });
          return;
        }

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
              : matchedCreator.creatorDetails?.find((cd) => cd.name.toLowerCase().trim() === norm)?.name || t;
          matches.push({
            id: `inf-c-${norm}`,
            field: 'mediumInfluences',
            rawTitle: t,
            matchedType: 'creator',
            matchedLabel: creatorName,
            matchedSub: `Creator referenced in "${matchedCreator.title}" (${matchedCreator.mediaFormat})`,
            shouldLink: true
          });
        }
      });

      parsedSimilarTitles.forEach((t) => {
        const norm = t.toLowerCase().trim();
        const existingDetail = current.similarMediaDetails.find((d) => d.title.toLowerCase().trim() === norm);
        if (existingDetail?.unlinked) return;

        const matchedProd = allItems.find((i) => i.id !== (itemToEdit?.id || '') && i.title.toLowerCase().trim() === norm);
        if (matchedProd) {
          matches.push({
            id: `sim-${norm}`,
            field: 'similarMedia',
            rawTitle: t,
            matchedType: 'product',
            matchedLabel: matchedProd.title,
            matchedSub: `${matchedProd.mediaFormat} (${matchedProd.releaseDate?.substring(0, 4) || ''}) by ${matchedProd.mainCreator}`,
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
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Wand2 size={18} />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold font-mono text-slate-100">
                {itemToEdit ? 'EDIT MEDIA ARCHIVE ENTRY' : 'ADD NEW MEDIA ARCHIVE ENTRY'}
              </h3>
              <p className="text-xs text-slate-400 font-sans">Admin Control Panel</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleQuickSampleData}
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

        {/* Scrollable Form Body with Localized Sub-Form Sections */}
        <form key={formKey} onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
          {/* Cover Section */}
          <CoverSection
            initialCover={formData.cover}
            onUpdate={(val) => handleUpdateField('cover', val)}
          />

          {/* Basic Info */}
          <BasicInfoSection
            initialTitle={formData.title}
            initialFormat={formData.mediaFormat}
            initialIsCustom={formData.isCustomCategory}
            initialCustomName={formData.customCategoryName}
            initialCountry={formData.countryOfOrigin}
            initialLanguage={formData.originalLanguage}
            onUpdateField={handleUpdateField}
            onFormatChange={handleFormatChange}
          />

          {/* Soundtrack Setup */}
          <SoundtrackSection
            mediaFormat={formData.mediaFormat}
            initialIsSoundtrack={formData.isSoundtrack}
            initialSoundtrackForId={formData.soundtrackForId}
            initialSoundtrackForTitle={formData.soundtrackForTitle}
            initialSoundtrackEntries={formData.soundtrackEntries}
            allItems={allItems}
            onUpdateField={handleUpdateField}
          />

          {/* Creator Profile */}
          <CreatorSection
            initialMainCreator={formData.mainCreator}
            initialCategory={formData.mainCreatorCategory}
            initialNation={formData.creatorNation}
            initialWiki={formData.mainCreatorWiki}
            initialPhoto={formData.mainCreatorPhoto}
            onUpdateField={handleUpdateField}
            onCategoryChange={handleCreatorCategoryChange}
            onMainCreatorChange={handleMainCreatorChange}
          />

          {/* Band Lineup & Lineup for this product */}
          {(formData.mainCreatorCategory === 'Band' || formData.bandMembers.length > 0) && (
            <BandLineupSection
              mainCreator={formData.mainCreator}
              initialBandMembers={formData.bandMembers}
              allItems={allItems}
              onUpdateMembers={(members) => handleUpdateField('bandMembers', members)}
            />
          )}

          {/* Other Associated Creators, Release Date, Consumed Version */}
          <ReleaseAndOtherCreatorsSection
            initialOtherCreators={formData.otherCreatorsStr}
            initialReleaseDate={formData.releaseDate}
            initialConsumedVersion={formData.consumedVersion}
            onUpdateField={handleUpdateField}
          />

          {/* Genres & Tags */}
          <GenresAndTagsSection
            initialGenresStr={formData.genresStr}
            initialPhilosophicalTags={formData.philosophicalTags}
            initialGenreStyleTags={formData.genreStyleTags}
            existingPhilosophicalTags={existingPhilosophicalTags}
            existingStyleTags={existingStyleTags}
            onUpdateField={handleUpdateField}
          />

          {/* Review, Summary Plot, Hornet's Score & Verdict */}
          <ReviewAndScoringSection
            initialPlot={formData.summaryPlot}
            initialScore={formData.hornetScore}
            initialVerdict={formData.hornetVerdict}
            onUpdateField={handleUpdateField}
          />

          {/* Pros & Cons */}
          <ProsAndConsSection
            initialPros={formData.pros}
            initialCons={formData.cons}
            onUpdateField={handleUpdateField}
          />

          {/* Medium Influences & Similar Media */}
          <RelationsSection
            initialInfluencesStr={formData.mediumInfluencesStr}
            initialInfluencesDetails={formData.mediumInfluencesDetails}
            initialSimilarStr={formData.similarMediaStr}
            initialSimilarDetails={formData.similarMediaDetails}
            onUpdateField={handleUpdateField}
          />

          {/* External Links */}
          <ExternalLinksSection
            initialLinks={formData.links}
            onUpdateLinks={(links) => handleUpdateField('links', links)}
          />

          {/* Save Action Bar */}
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
              <span>{itemToEdit ? 'Update Entry' : 'Save To Archive'}</span>
            </button>
          </div>
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
