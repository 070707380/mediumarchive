import React from 'react';
import { Award } from 'lucide-react';
import { getScoreLevelInfo } from '../types';

interface HornetBadgeProps {
  score: number; // 1 to 10
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export const HornetBadge: React.FC<HornetBadgeProps> = ({
  score,
  size = 'md',
  showLabel = true,
  className = ''
}) => {
  const levelInfo = getScoreLevelInfo(score);

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-3 py-1 text-xs sm:text-sm gap-1.5',
    lg: 'px-4 py-2 text-sm sm:text-base gap-2 font-bold'
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 18
  };

  return (
    <div
      className={`inline-flex items-center rounded-full bg-slate-950/90 border border-slate-700/80 font-mono tracking-tight ${levelInfo.color} ${sizeClasses[size]} ${className}`}
      title={`Hornet Rating: ${score}/10 - ${levelInfo.label}`}
    >
      <Award size={iconSizes[size]} className="opacity-90 flex-shrink-0" />
      <span className="font-bold">{score}<span className="text-[10px] text-slate-500 font-normal">/10</span></span>
      {showLabel && (
        <span className="text-[10px] font-sans font-semibold tracking-wide border-l border-slate-800 pl-1.5">
          {levelInfo.label}
        </span>
      )}
    </div>
  );
};
