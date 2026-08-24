import React from 'react';
import { Plus, Unlock, Database, Search, Shield, BarChart3, Layers, Compass, Shuffle, User, Users, Heart } from 'lucide-react';
import { MediaItem } from '../types';

interface NavbarProps {
  items: MediaItem[];
  isAdmin: boolean;
  activeView: 'archive' | 'hornets' | 'rating_scale' | 'similar' | 'creators' | 'about' | 'donate';
  onViewChange: (view: 'archive' | 'hornets' | 'rating_scale' | 'similar' | 'creators' | 'about' | 'donate') => void;
  onOpenPasscodeModal: () => void;
  onOpenAddModal: () => void;
  onOpenAdminTools: () => void;
  onLockAdmin: () => void;
  onRandomizeClick: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  items,
  isAdmin,
  activeView,
  onViewChange,
  onOpenPasscodeModal,
  onOpenAddModal,
  onOpenAdminTools,
  onLockAdmin,
  onRandomizeClick,
  searchQuery,
  onSearchChange
}) => {
  const handleInputChange = (val: string) => {
    if (val.trim().toLowerCase() === 'fourward') {
      onSearchChange('');
      onOpenPasscodeModal();
      return;
    }
    onSearchChange(val);
    if (val.trim() !== '' && activeView !== 'archive') {
      onViewChange('archive');
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const queryTerm = searchQuery.trim().toLowerCase();
    if (queryTerm === 'fourward') {
      onSearchChange('');
      onOpenPasscodeModal();
      return;
    }
    if (searchQuery.trim() !== '' && activeView !== 'archive') {
      onViewChange('archive');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-950 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-3 sm:px-5 lg:px-6">
        
        {/* MOBILE/TABLET LAYOUT (< md) */}
        <div className="flex flex-col gap-2 py-2 md:hidden font-mono">
          {/* Row 1: Brand & Top Actions */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h1
                onClick={() => onViewChange('archive')}
                className="text-xs font-black tracking-wider text-slate-100 uppercase cursor-pointer hover:text-amber-300 transition"
              >
                MEDIUM ARCHIVE
              </h1>
            </div>

            {/* Mobile Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={onRandomizeClick}
                className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 text-amber-400 hover:text-amber-300"
                title="Shuffle View"
              >
                <Shuffle size={14} />
              </button>

              {isAdmin && (
                <div className="flex items-center gap-1 bg-amber-950/40 border border-amber-500/40 rounded-lg p-0.5">
                  <button
                    onClick={onOpenAddModal}
                    className="px-2 py-1 rounded bg-amber-500 text-slate-950 text-[10px] font-bold flex items-center gap-1"
                  >
                    <Plus size={12} />
                    <span>Add</span>
                  </button>
                  <button
                    onClick={onOpenAdminTools}
                    className="p-1 text-amber-300"
                    title="Admin Tools"
                  >
                    <Database size={12} />
                  </button>
                  <button
                    onClick={onLockAdmin}
                    className="p-1 text-rose-300"
                    title="Lock Admin Mode"
                  >
                    <Unlock size={12} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Equal 6-Column Navigation Segmented Bar */}
          <nav className="grid grid-cols-6 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800/90 text-[11px] font-bold text-center">
            <button
              onClick={() => onViewChange('archive')}
              className={`py-1.5 rounded-lg transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
                activeView === 'archive'
                  ? 'bg-purple-600 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers size={13} />
              <span className="truncate text-[10px]">Archive</span>
            </button>

            <button
              onClick={() => onViewChange('hornets')}
              className={`py-1.5 rounded-lg transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
                activeView === 'hornets'
                  ? 'bg-purple-600 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 size={13} />
              <span className="truncate text-[10px]">Hornet's</span>
            </button>

            <button
              onClick={() => onViewChange('creators')}
              className={`py-1.5 rounded-lg transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
                activeView === 'creators'
                  ? 'bg-amber-600 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users size={13} />
              <span className="truncate text-[10px]">Creators</span>
            </button>

            <button
              onClick={() => onViewChange('rating_scale')}
              className={`py-1.5 rounded-lg transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
                activeView === 'rating_scale'
                  ? 'bg-purple-600 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Shield size={13} />
              <span className="truncate text-[10px]">Scale</span>
            </button>

            <button
              onClick={() => onViewChange('similar')}
              className={`py-1.5 rounded-lg transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
                activeView === 'similar'
                  ? 'bg-purple-600 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Compass size={13} />
              <span className="truncate text-[10px]">Similar</span>
            </button>

            <button
              onClick={() => onViewChange('donate')}
              className={`py-1.5 rounded-lg transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
                activeView === 'donate'
                  ? 'bg-purple-600 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Heart size={13} />
              <span className="truncate text-[10px]">Donate</span>
            </button>
          </nav>

          {/* Row 3: Mobile Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input
              type="text"
              placeholder="Search media, creators, tags..."
              value={searchQuery}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') onSearchChange('');
              }}
              className="w-full bg-slate-950 border border-slate-800/90 rounded-xl pl-8 pr-7 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 shadow-inner font-mono"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-800 text-slate-300 text-[10px] flex items-center justify-center font-bold"
              >
                ✕
              </button>
            )}
          </form>
        </div>

        {/* DESKTOP LAYOUT (md:flex) */}
        <div className="hidden md:flex items-center justify-between py-2.5 gap-3 flex-wrap lg:flex-nowrap min-w-0">
          {/* Brand & Navigation Tabs */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div>
                <h1
                  onClick={() => onViewChange('archive')}
                  className="text-sm font-black tracking-widest text-slate-100 font-mono cursor-pointer hover:text-amber-300 transition uppercase"
                >
                  MEDIUM ARCHIVE
                </h1>
                <p className="text-[10px] text-slate-400 font-mono hidden md:block">
                  Personal Experienced Media Index
                </p>
              </div>
            </div>

            {/* View Selector Tabs */}
            <nav className="flex items-center gap-0.5 bg-slate-950 p-1 rounded-lg border border-slate-800/90 font-mono text-[11px] shrink-0">
              <button
                onClick={() => onViewChange('archive')}
                className={`px-2.5 py-1 rounded transition-all flex items-center gap-1.5 whitespace-nowrap font-bold ${
                  activeView === 'archive'
                    ? 'bg-purple-600 text-white shadow-sm font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Layers size={12} />
                <span>Archive</span>
              </button>

              <button
                onClick={() => onViewChange('hornets')}
                className={`px-2.5 py-1 rounded transition-all flex items-center gap-1.5 whitespace-nowrap font-bold ${
                  activeView === 'hornets'
                    ? 'bg-purple-600 text-white shadow-sm font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <BarChart3 size={12} />
                <span>Hornet's</span>
              </button>

              <button
                onClick={() => onViewChange('creators')}
                className={`px-2.5 py-1 rounded transition-all flex items-center gap-1.5 whitespace-nowrap font-bold ${
                  activeView === 'creators'
                    ? 'bg-amber-600 text-white shadow-sm font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Users size={12} />
                <span>Creators</span>
              </button>

              <button
                onClick={() => onViewChange('rating_scale')}
                className={`px-2.5 py-1 rounded transition-all flex items-center gap-1.5 whitespace-nowrap font-bold ${
                  activeView === 'rating_scale'
                    ? 'bg-purple-600 text-white shadow-sm font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Shield size={12} />
                <span>Rating Scale</span>
              </button>

              <button
                onClick={() => onViewChange('similar')}
                className={`px-2.5 py-1 rounded transition-all flex items-center gap-1.5 whitespace-nowrap font-bold ${
                  activeView === 'similar'
                    ? 'bg-purple-600 text-white shadow-sm font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Compass size={12} />
                <span>Similar</span>
              </button>

              <button
                onClick={() => onViewChange('donate')}
                className={`px-2.5 py-1 rounded transition-all flex items-center gap-1.5 whitespace-nowrap font-bold ${
                  activeView === 'donate'
                    ? 'bg-purple-600 text-white shadow-sm font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Heart size={12} />
                <span>Donate</span>
              </button>
            </nav>
          </div>

          {/* Quick Search & Actions */}
          <div className="flex items-center gap-2">
            <form onSubmit={handleSearchSubmit} className="relative w-48 lg:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" size={13} />
              <input
                type="text"
                placeholder="Search media, creators, tags..."
                value={searchQuery}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') onSearchChange('');
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-7 py-1 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] flex items-center justify-center font-bold"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </form>

            <button
              onClick={onRandomizeClick}
              className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-300 text-xs font-mono font-medium flex items-center gap-1 transition shrink-0"
              title="Shuffle view"
            >
              <Shuffle size={12} className="text-amber-400" />
              <span className="hidden lg:inline">Shuffle</span>
            </button>

            {isAdmin ? (
              <div className="flex items-center gap-1 bg-amber-950/30 border border-amber-500/40 rounded-lg p-0.5 shrink-0">
                <button
                  onClick={onOpenAddModal}
                  className="px-2 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-mono font-bold flex items-center gap-1 transition"
                >
                  <Plus size={12} />
                  <span>Add</span>
                </button>

                <button
                  onClick={onOpenAdminTools}
                  className="p-1 rounded hover:bg-amber-900/40 text-amber-300 text-xs transition"
                  title="Admin Tools"
                >
                  <Database size={13} />
                </button>

                <button
                  onClick={onLockAdmin}
                  className="p-1 rounded hover:bg-amber-900/40 text-rose-300 text-xs transition"
                  title="Lock Admin Mode"
                >
                  <Unlock size={13} />
                </button>
              </div>
            ) : (
              <div className="hidden xl:flex items-center gap-2 text-[11px] text-slate-400 font-mono border-l border-slate-800/80 pl-3 shrink-0">
                <span className="text-amber-400 font-bold">{items.length}</span> logged
              </div>
            )}
          </div>
        </div>

      </div>
    </header>
  );
};

