import React, { useState, useEffect } from 'react';
import { MediaItem } from '../types';
import { MediaCard } from './MediaCard';
import { Dices, Layers } from 'lucide-react';

interface HeroRandomFeaturedProps {
  items: MediaItem[];
  onItemClick: (item: MediaItem) => void;
  onTagClick: (tag: string) => void;
  isAdmin?: boolean;
}

export const HeroRandomFeatured: React.FC<HeroRandomFeaturedProps> = ({
  items,
  onItemClick,
  onTagClick,
  isAdmin = false,
}) => {
  const [randomized, setRandomized] = useState<MediaItem[]>([]);

  const shuffleItems = () => {
    if (!items.length) return;
    const shuffled = [...items].sort(() => 0.5 - Math.random());
    setRandomized(shuffled.slice(0, 3));
  };

  useEffect(() => {
    shuffleItems();
  }, [items]);

  if (!items.length) return null;

  return (
    <section className="mb-6 bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-md relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 relative z-10 border-b border-slate-800 pb-3">
        <h2 className="text-base sm:text-lg font-bold font-mono text-slate-100 tracking-tight flex items-center gap-2">
          <Dices size={16} className="text-amber-400" />
          Featured Shuffle
        </h2>

        <button
          onClick={shuffleItems}
          className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs flex items-center justify-center gap-1.5 shadow transition shrink-0 cursor-pointer"
        >
          <Dices size={14} />
          <span>Shuffle</span>
        </button>
      </div>

      {/* Grid of randomized cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
        {randomized.map((item) => (
          <MediaCard
            key={`random-${item.id}`}
            item={item}
            onClick={onItemClick}
            onTagClick={onTagClick}
            isAdmin={isAdmin}
          />
        ))}
      </div>
    </section>
  );
};

