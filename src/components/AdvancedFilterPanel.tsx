import React, { useState, useMemo } from 'react';
import { FilterOptions, MediaFormat, MediaItem, ALL_MEDIA_FORMATS } from '../types';
import { ALL_DECADE_OPTIONS } from '../utils/dateUtils';
import {
  SlidersHorizontal,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Tag,
  Check,
  Calendar,
  Globe,
  Languages
} from 'lucide-react';

interface AdvancedFilterPanelProps {
  filters: FilterOptions;
  onChange: (filters: FilterOptions) => void;
  allItems: MediaItem[];
  matchingCount: number;
}

export const AdvancedFilterPanel: React.FC<AdvancedFilterPanelProps> = ({
  filters,
  onChange,
  allItems,
  matchingCount
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [philoSearch, setPhiloSearch] = useState('');
  const [genreSearch, setGenreSearch] = useState('');
  const [styleSearch, setStyleSearch] = useState('');

  // Extract all unique philosophical tags from dataset
  const allPhilosophicalTags = useMemo(() => {
    return Array.from<string>(
      new Set(allItems.flatMap((item) => item.philosophicalTags || []))
    ).sort((a, b) => a.localeCompare(b));
  }, [allItems]);

  // Extract all unique main genres from dataset
  const allGenres = useMemo(() => {
    return Array.from<string>(
      new Set(allItems.flatMap((item) => item.genres || []))
    ).sort((a, b) => a.localeCompare(b));
  }, [allItems]);

  // Extract all unique elements / reference style tags from dataset
  const allStyleTags = useMemo(() => {
    return Array.from<string>(
      new Set(allItems.flatMap((item) => item.genreStyleTags || []))
    ).sort((a, b) => a.localeCompare(b));
  }, [allItems]);

  // Filtered tag clouds for user search in filter panel
  const filteredPhiloTags = useMemo(() => {
    return allPhilosophicalTags.filter((t) =>
      t.toLowerCase().includes(philoSearch.toLowerCase())
    );
  }, [allPhilosophicalTags, philoSearch]);

  const filteredGenres = useMemo(() => {
    return allGenres.filter((g) =>
      g.toLowerCase().includes(genreSearch.toLowerCase())
    );
  }, [allGenres, genreSearch]);

  const filteredStyleTags = useMemo(() => {
    return allStyleTags.filter((t) =>
      t.toLowerCase().includes(styleSearch.toLowerCase())
    );
  }, [allStyleTags, styleSearch]);

  const handleFormatToggle = (format: MediaFormat) => {
    const exists = filters.formats.includes(format);
    const updated = exists
      ? filters.formats.filter((f) => f !== format)
      : [...filters.formats, format];
    onChange({ ...filters, formats: updated });
  };

  const handlePhiloTagToggle = (tag: string) => {
    const exists = filters.selectedPhilosophicalTags.includes(tag);
    const updated = exists
      ? filters.selectedPhilosophicalTags.filter((t) => t !== tag)
      : [...filters.selectedPhilosophicalTags, tag];
    onChange({ ...filters, selectedPhilosophicalTags: updated });
  };

  const handleGenreToggle = (genre: string) => {
    const current = filters.selectedGenres || [];
    const exists = current.includes(genre);
    const updated = exists
      ? current.filter((g) => g !== genre)
      : [...current, genre];
    onChange({ ...filters, selectedGenres: updated });
  };

  const handleStyleTagToggle = (tag: string) => {
    const exists = filters.selectedStyleTags.includes(tag);
    const updated = exists
      ? filters.selectedStyleTags.filter((t) => t !== tag)
      : [...filters.selectedStyleTags, tag];
    onChange({ ...filters, selectedStyleTags: updated });
  };

  // Extract all unique consumed versions from dataset
  const allConsumedVersions = useMemo(() => {
    return Array.from<string>(
      new Set(allItems.map((item) => item.consumedVersion).filter(Boolean) as string[])
    ).sort();
  }, [allItems]);

  const handleConsumedVersionToggle = (ver: string) => {
    const current = filters.selectedConsumedVersions || [];
    const exists = current.includes(ver);
    const updated = exists
      ? current.filter((v) => v !== ver)
      : [...current, ver];
    onChange({ ...filters, selectedConsumedVersions: updated });
  };

  const handleDecadeToggle = (decade: string) => {
    const current = filters.selectedDecades || [];
    const exists = current.includes(decade);
    const updated = exists
      ? current.filter((d) => d !== decade)
      : [...current, decade];
    onChange({ ...filters, selectedDecades: updated });
  };

  // Extract all unique origin countries from dataset
  const allCountries = useMemo(() => {
    return Array.from<string>(
      new Set(allItems.map((item) => item.countryOfOrigin).filter(Boolean) as string[])
    ).sort();
  }, [allItems]);

  // Extract all unique original languages from dataset
  const allLanguages = useMemo(() => {
    return Array.from<string>(
      new Set(allItems.map((item) => item.originalLanguage).filter(Boolean) as string[])
    ).sort();
  }, [allItems]);

  const handleCountryToggle = (country: string) => {
    const current = filters.selectedCountries || [];
    const exists = current.includes(country);
    const updated = exists
      ? current.filter((c) => c !== country)
      : [...current, country];
    onChange({ ...filters, selectedCountries: updated });
  };

  const handleLanguageToggle = (lang: string) => {
    const current = filters.selectedLanguages || [];
    const exists = current.includes(lang);
    const updated = exists
      ? current.filter((l) => l !== lang)
      : [...current, lang];
    onChange({ ...filters, selectedLanguages: updated });
  };

  const handleReset = () => {
    onChange({
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
    setPhiloSearch('');
    setGenreSearch('');
    setStyleSearch('');
  };

  const hasActiveFilters =
    filters.searchQuery !== '' ||
    filters.formats.length > 0 ||
    (filters.selectedGenres && filters.selectedGenres.length > 0) ||
    filters.selectedPhilosophicalTags.length > 0 ||
    filters.selectedStyleTags.length > 0 ||
    (filters.selectedConsumedVersions && filters.selectedConsumedVersions.length > 0) ||
    (filters.selectedDecades && filters.selectedDecades.length > 0) ||
    (filters.selectedCountries && filters.selectedCountries.length > 0) ||
    (filters.selectedLanguages && filters.selectedLanguages.length > 0) ||
    filters.minScore > 0 ||
    filters.maxScore < 10 ||
    filters.releaseYearStart !== null ||
    filters.releaseYearEnd !== null ||
    filters.sortBy !== 'quality';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 sm:p-4 shadow-md mb-6 font-mono transition-all">
      {/* Filter Header */}
      <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-slate-800 border border-slate-700 text-amber-400">
            <SlidersHorizontal size={15} />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>Filters</span>
              <span className="text-[10px] px-2 py-0.2 rounded bg-slate-800 border border-slate-700 text-amber-400 font-bold">
                {matchingCount}
              </span>
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={handleReset}
              className="px-2.5 py-1 rounded bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
            >
              <RotateCcw size={11} /> Reset
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`px-3 py-1 rounded text-[11px] font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
              isExpanded
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.25)] ring-1 ring-amber-500/40'
                : hasActiveFilters
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/40 hover:bg-amber-500/20'
                : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
            }`}
          >
            <span className={isExpanded ? 'text-amber-300 font-extrabold' : ''}>
              {isExpanded ? 'Hide Options' : 'Options'}
            </span>
            {isExpanded ? <ChevronUp size={14} className="text-amber-400" /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Expanded Filter Body */}
      {isExpanded && (
        <div className="pt-3 space-y-4 animate-fade-in text-xs">
          {/* Row 1: Sort Engine & Tag Logic */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-950/80 p-3 rounded-lg border border-slate-800/90">
            {/* Sort */}
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
                Sort By
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => onChange({ ...filters, sortBy: e.target.value as any })}
                className="w-full bg-slate-900 border border-slate-700/80 rounded px-2.5 py-1 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
              >
                <option value="quality">Hornet Quality</option>
                <option value="score_desc">Score (10 → 1)</option>
                <option value="score_asc">Score (1 → 10)</option>
                <option value="release_desc">Year (Newest First)</option>
                <option value="release_asc">Year (Oldest First)</option>
                <option value="title">Title (A-Z)</option>
                <option value="date_added">Recently Logged</option>
                <option value="random">Random</option>
              </select>
            </div>

            {/* Tag Match Logic */}
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1">
                Tag Match
              </label>
              <div className="flex rounded bg-slate-900 p-0.5 border border-slate-700/80 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => onChange({ ...filters, tagLogic: 'OR' })}
                  className={`flex-1 py-1 rounded text-center font-bold transition ${
                    filters.tagLogic === 'OR'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Any (OR)
                </button>
                <button
                  type="button"
                  onClick={() => onChange({ ...filters, tagLogic: 'AND' })}
                  className={`flex-1 py-1 rounded text-center font-bold transition ${
                    filters.tagLogic === 'AND'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All (AND)
                </button>
              </div>
            </div>

            {/* Score Band Range (0 to 10) */}
            <div>
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                <span>Hornet's Score Band</span>
                <span className="text-amber-400 font-bold">{filters.minScore} - {filters.maxScore} / 10</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  value={filters.minScore}
                  onChange={(e) => onChange({ ...filters, minScore: Number(e.target.value) })}
                  className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded"
                />
                <span className="text-[10px] text-slate-500">to</span>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  value={filters.maxScore}
                  onChange={(e) => onChange({ ...filters, maxScore: Number(e.target.value) })}
                  className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Media Format Multi-Pills */}
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Media Formats ({filters.formats.length === 0 ? 'All' : `${filters.formats.length} Active`})
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_MEDIA_FORMATS.map((fmt) => {
                const active = filters.formats.includes(fmt);
                return (
                  <button
                    key={fmt}
                    onClick={() => handleFormatToggle(fmt)}
                    className={`px-2.5 py-1 rounded text-[11px] transition-all flex items-center gap-1 border ${
                      active
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-sm'
                        : 'bg-slate-950 hover:bg-slate-900 text-slate-300 border-slate-800'
                    }`}
                  >
                    {active && <Check size={11} />}
                    <span>{fmt}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 3: Release Era & Decades Filter */}
          <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800/90 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                <Calendar size={12} /> Era & Decades
              </label>

              {/* Specific Year Range Inputs */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400">Range:</span>
                <input
                  type="number"
                  placeholder="1990"
                  value={filters.releaseYearStart ?? ''}
                  onChange={(e) =>
                    onChange({
                      ...filters,
                      releaseYearStart: e.target.value ? parseInt(e.target.value, 10) : null
                    })
                  }
                  className="w-20 bg-slate-900 border border-slate-700/80 rounded px-2 py-0.5 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-500"
                />
                <span className="text-slate-500">-</span>
                <input
                  type="number"
                  placeholder="2025"
                  value={filters.releaseYearEnd ?? ''}
                  onChange={(e) =>
                    onChange({
                      ...filters,
                      releaseYearEnd: e.target.value ? parseInt(e.target.value, 10) : null
                    })
                  }
                  className="w-20 bg-slate-900 border border-slate-700/80 rounded px-2 py-0.5 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-500"
                />
                {(filters.releaseYearStart !== null || filters.releaseYearEnd !== null) && (
                  <button
                    onClick={() =>
                      onChange({ ...filters, releaseYearStart: null, releaseYearEnd: null })
                    }
                    className="text-[10px] text-rose-400 hover:underline px-1"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Decade Quick Selector Buttons */}
            <div className="flex flex-wrap gap-1">
              {ALL_DECADE_OPTIONS.map((decade) => {
                const active = filters.selectedDecades?.includes(decade);
                return (
                  <button
                    key={decade}
                    onClick={() => handleDecadeToggle(decade)}
                    className={`px-2 py-0.5 rounded text-[11px] transition border ${
                      active
                        ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-sm'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                    }`}
                  >
                    {decade}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 4: Main Genres Cloud */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1">
                <span>Genres ({filters.selectedGenres?.length || 0} active)</span>
              </label>
              <input
                type="text"
                placeholder="Search genres..."
                value={genreSearch}
                onChange={(e) => setGenreSearch(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-[11px] text-slate-300 focus:outline-none focus:border-slate-700 font-mono w-36"
              />
            </div>
            <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto p-1.5 bg-slate-950 rounded-lg border border-slate-800">
              {filteredGenres.length > 0 ? (
                filteredGenres.map((genre) => {
                  const active = filters.selectedGenres?.includes(genre);
                  return (
                    <button
                      key={genre}
                      onClick={() => handleGenreToggle(genre)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono transition border ${
                        active
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-sm'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                      }`}
                    >
                      {genre}
                    </button>
                  );
                })
              ) : (
                <span className="text-[10px] text-slate-500 italic p-1">No matching genres.</span>
              )}
            </div>
          </div>

          {/* Row 5: Philosophical Spectrum Tags Cloud */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1">
                <span>Themes ({filters.selectedPhilosophicalTags.length} active)</span>
              </label>
              <input
                type="text"
                placeholder="Search themes..."
                value={philoSearch}
                onChange={(e) => setPhiloSearch(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-[11px] text-slate-300 focus:outline-none focus:border-slate-700 font-mono w-36"
              />
            </div>
            <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto p-1.5 bg-slate-950 rounded-lg border border-slate-800">
              {filteredPhiloTags.length > 0 ? (
                filteredPhiloTags.map((tag) => {
                  const active = filters.selectedPhilosophicalTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => handlePhiloTagToggle(tag)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono transition border ${
                        active
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-sm'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })
              ) : (
                <span className="text-[10px] text-slate-500 italic p-1">No matching themes.</span>
              )}
            </div>
          </div>

          {/* Row 6: Elements, Tropes & Reference Tags Cloud */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1">
                <Tag size={11} /> Style Tags ({filters.selectedStyleTags.length} active)
              </label>
              <input
                type="text"
                placeholder="Search style tags..."
                value={styleSearch}
                onChange={(e) => setStyleSearch(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-[11px] text-slate-300 focus:outline-none focus:border-slate-700 font-mono w-36"
              />
            </div>
            <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto p-1.5 bg-slate-950 rounded-lg border border-slate-800">
              {filteredStyleTags.length > 0 ? (
                filteredStyleTags.map((tag) => {
                  const active = filters.selectedStyleTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => handleStyleTagToggle(tag)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono transition border ${
                        active
                          ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-sm'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })
              ) : (
                <span className="text-[10px] text-slate-500 italic p-1">No matching elements or style tags.</span>
              )}
            </div>
          </div>

          {/* Row 6: Consumed Version / Platform Filter Cloud */}
          {allConsumedVersions.length > 0 && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-purple-400 mb-1">
                Consumed Version / Platform ({filters.selectedConsumedVersions?.length || 0} active)
              </label>
              <div className="flex flex-wrap gap-1 p-1.5 bg-slate-950/80 rounded-lg border border-slate-800/90">
                {allConsumedVersions.map((ver) => {
                  const active = filters.selectedConsumedVersions?.includes(ver);
                  return (
                    <button
                      key={ver}
                      onClick={() => handleConsumedVersionToggle(ver)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono transition border ${
                        active
                          ? 'bg-purple-600 text-white border-purple-400 font-bold shadow-sm'
                          : 'bg-purple-950/30 hover:bg-purple-900/50 text-purple-300 border-purple-900/50'
                      }`}
                    >
                      {ver}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Row 7: Origin Country & Language Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Origin Country */}
            {allCountries.length > 0 && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1 mb-1">
                  <Globe size={11} /> Country of Origin ({filters.selectedCountries?.length || 0} active)
                </label>
                <div className="flex flex-wrap gap-1 p-1.5 bg-slate-950/80 rounded-lg border border-slate-800/90 max-h-24 overflow-y-auto">
                  {allCountries.map((c) => {
                    const active = filters.selectedCountries?.includes(c);
                    return (
                      <button
                        key={c}
                        onClick={() => handleCountryToggle(c)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono transition border ${
                          active
                            ? 'bg-sky-600 text-white border-sky-400 font-bold shadow-sm'
                            : 'bg-sky-950/30 hover:bg-sky-900/50 text-sky-300 border-sky-900/50'
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Original Language */}
            {allLanguages.length > 0 && (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1 mb-1">
                  <Languages size={11} /> Original Language ({filters.selectedLanguages?.length || 0} active)
                </label>
                <div className="flex flex-wrap gap-1 p-1.5 bg-slate-950/80 rounded-lg border border-slate-800/90 max-h-24 overflow-y-auto">
                  {allLanguages.map((l) => {
                    const active = filters.selectedLanguages?.includes(l);
                    return (
                      <button
                        key={l}
                        onClick={() => handleLanguageToggle(l)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono transition border ${
                          active
                            ? 'bg-teal-600 text-white border-teal-400 font-bold shadow-sm'
                            : 'bg-teal-950/30 hover:bg-teal-900/50 text-teal-300 border-teal-900/50'
                        }`}
                      >
                        {l}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

