import React, { useState } from 'react';
import { DetectedLinkCandidate } from '../utils/linkDetector';
import { SmartImage } from './SmartImage';
import {
  Link2,
  Check,
  X,
  Film,
  User,
  Quote,
  Award,
  ChevronRight,
  HelpCircle,
  AlertCircle
} from 'lucide-react';

interface LinkConfirmationModalProps {
  candidates: DetectedLinkCandidate[];
  onComplete: (confirmedCandidates: DetectedLinkCandidate[]) => void;
  onClose: () => void;
}

export const LinkConfirmationModal: React.FC<LinkConfirmationModalProps> = ({
  candidates,
  onComplete,
  onClose
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [confirmed, setConfirmed] = useState<DetectedLinkCandidate[]>([]);

  if (!candidates || candidates.length === 0) return null;

  const current = candidates[currentIndex];
  const total = candidates.length;

  const handleDecision = (isConfirmed: boolean) => {
    const nextConfirmed = isConfirmed ? [...confirmed, current] : confirmed;
    if (currentIndex + 1 < total) {
      setConfirmed(nextConfirmed);
      setCurrentIndex(currentIndex + 1);
    } else {
      // Done processing all candidates
      onComplete(nextConfirmed);
    }
  };

  const handleConfirmAll = () => {
    const remaining = candidates.slice(currentIndex);
    const allConfirmed = [...confirmed, ...remaining];
    onComplete(allConfirmed);
  };

  const handleSkipAll = () => {
    onComplete(confirmed);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Link2 size={18} />
            </div>
            <div>
              <h3 className="text-sm font-mono font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
                Interconnected Link Verification
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono border border-amber-500/40">
                  {currentIndex + 1} of {total}
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-sans">
                Confirm database cross-reference matches
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Source Context Banner */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1 text-xs">
            <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
              {current.field === 'mediumInfluences' ? (
                <Quote size={13} className="text-amber-400 shrink-0" />
              ) : (
                <Award size={13} className="text-cyan-400 shrink-0" />
              )}
              <span>Referenced in <strong className="text-slate-200">{current.sourceItemTitle}</strong> under <span className="text-amber-300 font-mono">{current.field === 'mediumInfluences' ? 'Influences & Name-Drops' : 'Similar Media'}</span>:</span>
            </div>
            <div className="text-sm font-mono font-bold text-amber-400 pl-5">
              "{current.rawReferenceText}"
            </div>
          </div>

          {/* Question Prompt */}
          <div className="text-center space-y-1">
            <div className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center justify-center gap-1.5">
              <HelpCircle size={15} className="text-indigo-400" />
              Is this the right item?
            </div>
            <p className="text-xs text-slate-400">
              We found a matching entry in your archive database. Confirm if they should be interconnected:
            </p>
          </div>

          {current.targetType === 'media' && current.targetMediaItem && (
            <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 flex items-start gap-4 shadow-lg relative overflow-hidden group">
              <div className="w-20 h-28 rounded-lg overflow-hidden bg-slate-900 border border-slate-800 shrink-0">
                <SmartImage
                  src={current.targetMediaItem.cover}
                  alt={current.targetMediaItem.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-bold text-slate-100 font-mono line-clamp-1">
                    {current.targetMediaItem.title}
                  </h4>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
                    {current.targetMediaItem.hornetScore}/10
                  </span>
                </div>

                <div className="text-xs font-mono text-slate-400 flex items-center gap-2">
                  <span className="text-indigo-300 font-semibold">{current.targetMediaItem.mediaFormat}</span>
                  <span>•</span>
                  <span>{current.targetMediaItem.releaseDate?.substring(0, 4)}</span>
                </div>

                {current.targetMediaItem.mainCreator && (
                  <div className="text-xs font-sans text-slate-300 flex items-center gap-1">
                    <User size={12} className="text-amber-400 shrink-0" />
                    <span className="truncate">by <strong>{current.targetMediaItem.mainCreator}</strong></span>
                  </div>
                )}

                {current.targetMediaItem.summaryPlot && (
                  <p className="text-[11px] text-slate-400 line-clamp-2 italic font-sans pt-0.5">
                    "{current.targetMediaItem.summaryPlot}"
                  </p>
                )}
              </div>
            </div>
          )}

          {current.targetType === 'creator' && (
            <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 flex items-center gap-4 shadow-lg">
              {current.targetCreatorPhoto ? (
                <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-900 border border-slate-800 shrink-0">
                  <SmartImage
                    src={current.targetCreatorPhoto}
                    alt={current.targetCreatorName || ''}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-slate-900 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-400 font-bold text-lg">
                  {current.targetCreatorName?.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="flex-1 min-w-0 space-y-1">
                <div className="text-[10px] font-mono text-amber-400 uppercase tracking-wider">
                  Creator Bio Match
                </div>
                <h4 className="text-base font-bold text-slate-100 font-mono truncate">
                  {current.targetCreatorName}
                </h4>
                <div className="text-xs text-slate-400 font-mono">
                  Category: <span className="text-indigo-300 font-semibold">{current.targetCreatorCategory || 'Bio'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer / Action Buttons */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 space-y-2">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleDecision(false)}
              className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs font-bold flex items-center justify-center gap-2 transition border border-slate-700"
            >
              <X size={15} /> No, Skip Link
            </button>

            <button
              onClick={() => handleDecision(true)}
              className="py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-950/50"
            >
              <Check size={15} /> Yes, Link Item
            </button>
          </div>

          {total > 1 && (
            <div className="flex items-center justify-between pt-1 px-1">
              <button
                onClick={handleSkipAll}
                className="text-[11px] font-mono text-slate-500 hover:text-slate-400 transition"
              >
                Skip remaining ({total - currentIndex})
              </button>
              <button
                onClick={handleConfirmAll}
                className="text-[11px] font-mono text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 transition"
              >
                Confirm All Links <ChevronRight size={12} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
