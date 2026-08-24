import React, { useState, useEffect } from 'react';
import {
  MediaItem,
  ScoreAuditSuggestion,
  AlignedAuditItem,
  RATING_SCALE_LEVELS,
  getScoreLevelInfo,
  DEFAULT_SCORING_PHILOSOPHY,
} from '../types';
import { storageService } from '../services/storage';
import {
  X,
  Sparkles,
  Check,
  Ban,
  ArrowRight,
  RefreshCw,
  SlidersHorizontal,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  HelpCircle,
  AlertTriangle,
  Layers,
  Filter,
  EyeOff,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { SmartImage } from './SmartImage';

interface ScoreAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: MediaItem[];
  scoringPhilosophy?: string;
  onAcceptScoreUpdate: (itemId: string, newScore: number) => Promise<void>;
  initialSuggestions?: ScoreAuditSuggestion[];
  onAuditSuggestionsChange?: (suggestions: ScoreAuditSuggestion[]) => void;
}

export const ScoreAuditModal: React.FC<ScoreAuditModalProps> = ({
  isOpen,
  onClose,
  items,
  scoringPhilosophy = DEFAULT_SCORING_PHILOSOPHY,
  onAcceptScoreUpdate,
  initialSuggestions = [],
  onAuditSuggestionsChange,
}) => {
  if (!isOpen) return null;

  const [isLoading, setIsLoading] = useState<boolean>(initialSuggestions.length === 0);
  const [suggestions, setSuggestions] = useState<ScoreAuditSuggestion[]>(initialSuggestions);
  const [alignedItems, setAlignedItems] = useState<AlignedAuditItem[]>([]);
  const [rejectedCount, setRejectedCount] = useState<number>(() => storageService.getRejectedAuditIds().length);
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [sensitivity, setSensitivity] = useState<'strict' | 'normal' | 'critical'>('strict');
  const [totalScanned, setTotalScanned] = useState<number>(items.length);
  const [scanStepIndex, setScanStepIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'recommendations' | 'aligned' | 'all'>('recommendations');

  // Animated scanning step cycle for realistic inspection visibility
  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => {
      setScanStepIndex((prev) => (prev + 1) % Math.max(1, items.length));
    }, 400);
    return () => clearInterval(interval);
  }, [isLoading, items.length]);

  const runAuditScan = async (selectedSensitivity = sensitivity, resetDismissed = false) => {
    setIsLoading(true);
    setErrorMessage(null);
    if (resetDismissed) {
      setDismissedIds(new Set());
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 40000);

    try {
      const rejectedIds = storageService.getRejectedAuditIds();
      setRejectedCount(rejectedIds.length);

      const res = await fetch('/api/score-audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          items,
          scoringPhilosophy,
          ratingLevels: RATING_SCALE_LEVELS,
          rejectedIds,
          sensitivity: selectedSensitivity,
        }),
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Audit scan failed with status: ${res.status}`);
      }

      const data = await res.json();
      const itemMap = new Map(items.map((i) => [i.id, i]));

      if (data.success) {
        // 1. Hydrate suggestions
        let hydratedSuggestions: ScoreAuditSuggestion[] = [];
        if (Array.isArray(data.suggestions)) {
          hydratedSuggestions = data.suggestions
            .filter((s: ScoreAuditSuggestion) => itemMap.has(s.id))
            .map((s: ScoreAuditSuggestion) => ({
              ...s,
              item: itemMap.get(s.id),
            }));
        }

        // 2. Hydrate aligned items
        let hydratedAligned: AlignedAuditItem[] = [];
        if (Array.isArray(data.aligned)) {
          hydratedAligned = data.aligned
            .filter((a: AlignedAuditItem) => itemMap.has(a.id))
            .map((a: AlignedAuditItem) => ({
              ...a,
              item: itemMap.get(a.id),
            }));
        } else {
          const suggestedIds = new Set(hydratedSuggestions.map((s) => s.id));
          hydratedAligned = items
            .filter((i) => !suggestedIds.has(i.id))
            .map((i) => ({
              id: i.id,
              currentScore: typeof i.hornetScore === 'number' ? i.hornetScore : 0,
              alignmentNote: 'Score calibrated consistently with assigned rating tier.',
              item: i,
            }));
        }

        setSuggestions(hydratedSuggestions);
        setAlignedItems(hydratedAligned);
        setTotalScanned(data.totalAudited || items.length);

        if (hydratedSuggestions.length === 0 && hydratedAligned.length > 0) {
          setActiveTab('aligned');
        } else {
          setActiveTab('recommendations');
        }

        if (onAuditSuggestionsChange) {
          onAuditSuggestionsChange(hydratedSuggestions);
        }
      } else {
        setSuggestions([]);
        setAlignedItems([]);
        if (onAuditSuggestionsChange) {
          onAuditSuggestionsChange([]);
        }
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.warn('Score audit scan error:', err);
      if (err.name === 'AbortError') {
        setErrorMessage('Audit scan timed out. Click Re-audit to try again.');
      } else {
        setErrorMessage(err.message || 'Unable to complete score audit scan.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!initialSuggestions || initialSuggestions.length === 0) {
      runAuditScan('strict');
    }
  }, []);

  const handleSensitivityChange = (newSensitivity: 'strict' | 'normal' | 'critical') => {
    setSensitivity(newSensitivity);
    runAuditScan(newSensitivity);
  };

  const handleAccept = async (suggestion: ScoreAuditSuggestion) => {
    if (!suggestion.item) return;
    setProcessingId(suggestion.id);
    try {
      await onAcceptScoreUpdate(suggestion.id, suggestion.suggestedScore);
      setAcceptedIds((prev) => new Set(prev).add(suggestion.id));
      setSuggestions((prev) => {
        const next = prev.filter((s) => s.id !== suggestion.id);
        if (onAuditSuggestionsChange) {
          onAuditSuggestionsChange(next);
        }
        return next;
      });
      // Move to aligned list
      setAlignedItems((prev) => [
        {
          id: suggestion.id,
          currentScore: suggestion.suggestedScore,
          alignmentNote: `Score successfully calibrated to ${suggestion.suggestedScore}/10 (${getScoreLevelInfo(suggestion.suggestedScore).label}).`,
          item: suggestion.item,
        },
        ...prev,
      ]);
    } catch (err) {
      console.error('Failed to accept score calibration:', err);
      alert('Failed to update and save score.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDismissSession = (suggestionId: string) => {
    setDismissedIds((prev) => new Set(prev).add(suggestionId));
  };

  const handleRestoreDismissed = (suggestionId: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.delete(suggestionId);
      return next;
    });
  };

  const handlePermanentReject = (suggestion: ScoreAuditSuggestion) => {
    storageService.addRejectedAuditId(suggestion.id);
    setRejectedCount(storageService.getRejectedAuditIds().length);
    setDismissedIds((prev) => new Set(prev).add(suggestion.id));
  };

  const handleResetRejected = () => {
    if (confirm('Reset permanent rejection list? Previously rejected items will become eligible for future consistency audits.')) {
      storageService.clearRejectedAuditIds();
      setRejectedCount(0);
      setDismissedIds(new Set());
      runAuditScan(sensitivity, true);
    }
  };

  const activeSuggestions = suggestions.filter((s) => !dismissedIds.has(s.id));
  const dismissedSuggestions = suggestions.filter((s) => dismissedIds.has(s.id));
  const currentScanningItem = items[scanStepIndex % items.length];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-4xl max-h-[92vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-4 sm:px-5 py-3.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <SlidersHorizontal size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold font-mono text-slate-100 flex items-center gap-1.5">
                  SCORE CONSISTENCY & CALIBRATION AUDIT
                </h2>
                <span className="px-2 py-0.5 rounded bg-purple-950/60 border border-purple-500/40 text-purple-300 font-mono text-[10px] font-semibold">
                  1-10 Scale & Death of the Author
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                Re-evaluates every listed pro/con, structural flaw, and scoring tier against your philosophy.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => runAuditScan(sensitivity, true)}
              disabled={isLoading}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-xs font-mono font-medium flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
              title="Re-run score audit scan across all archive items"
            >
              <RefreshCw size={13} className={isLoading ? 'animate-spin text-amber-400' : ''} />
              <span className="hidden sm:inline">Re-audit All</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Audit Filter & Strictness Bar */}
        <div className="px-4 sm:px-5 py-2.5 bg-slate-950/50 border-b border-slate-800/80 flex items-center justify-between flex-wrap gap-2 text-xs font-mono shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-400 text-[11px] flex items-center gap-1">
              <Filter size={11} className="text-amber-400" /> Audit Scrutiny:
            </span>
            <div className="inline-flex rounded-lg bg-slate-900 border border-slate-800 p-0.5">
              <button
                onClick={() => handleSensitivityChange('strict')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                  sensitivity === 'strict'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Meticulous & Deep
              </button>
              <button
                onClick={() => handleSensitivityChange('normal')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                  sensitivity === 'normal'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Standard
              </button>
              <button
                onClick={() => handleSensitivityChange('critical')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                  sensitivity === 'critical'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Major Flaws Only
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span>
              Scanned <strong className="text-slate-200">{totalScanned}</strong> Entries
            </span>
            {rejectedCount > 0 && (
              <button
                onClick={handleResetRejected}
                className="text-slate-500 hover:text-amber-300 underline transition cursor-pointer"
              >
                {rejectedCount} ignored
              </button>
            )}
          </div>
        </div>

        {/* View Switcher Tabs */}
        {!isLoading && (
          <div className="px-4 sm:px-5 py-2 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between flex-wrap gap-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveTab('recommendations')}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition cursor-pointer ${
                  activeTab === 'recommendations'
                    ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <AlertTriangle size={13} className={activeSuggestions.length > 0 ? 'text-amber-400' : 'text-slate-500'} />
                <span>Recommendations</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeSuggestions.length > 0 ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                }`}>
                  {activeSuggestions.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('aligned')}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition cursor-pointer ${
                  activeTab === 'aligned'
                    ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <ShieldCheck size={13} className="text-emerald-400" />
                <span>Verified Aligned</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                  {alignedItems.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-slate-800 border border-slate-700 text-slate-200 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Layers size={13} />
                <span>All Archive ({totalScanned})</span>
              </button>
            </div>

            {dismissedSuggestions.length > 0 && (
              <span className="text-[11px] font-mono text-slate-500">
                {dismissedSuggestions.length} dismissed in this view
              </span>
            )}
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-rose-400 shrink-0" />
                {errorMessage}
              </span>
              <button
                onClick={() => runAuditScan(sensitivity, true)}
                className="underline hover:text-rose-200 font-mono text-xs cursor-pointer ml-2"
              >
                Retry
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="py-16 text-center space-y-4">
              <div className="inline-block p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <RefreshCw size={28} className="animate-spin mx-auto" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-sm font-bold text-slate-200 font-mono tracking-wider">
                  DEEPLY AUDITING PROS, CONS & PHILOSOPHY...
                </h4>
                {currentScanningItem && (
                  <p className="text-xs text-amber-300 font-mono animate-pulse">
                    Inspecting: <span className="font-bold uppercase">"{currentScanningItem.title}"</span> ({currentScanningItem.mediaFormat})
                  </p>
                )}
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Cross-referencing listed strengths and defects against 1–10 tier criteria and lived-experience rules.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Recommendations Section */}
              {(activeTab === 'recommendations' || activeTab === 'all') && (
                <>
                  {activeSuggestions.length > 0 ? (
                    <div className="space-y-4">
                      {activeTab === 'all' && (
                        <div className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5 pt-1">
                          <AlertTriangle size={13} />
                          <span>CALIBRATION RECOMMENDATIONS ({activeSuggestions.length})</span>
                        </div>
                      )}

                      {activeSuggestions.map((suggestion) => {
                        const item = suggestion.item;
                        if (!item) return null;

                        const currLevel = getScoreLevelInfo(suggestion.currentScore);
                        const nextLevel = getScoreLevelInfo(suggestion.suggestedScore);
                        const isProcessing = processingId === suggestion.id;
                        const isDownward = suggestion.suggestedScore < suggestion.currentScore;

                        return (
                          <div
                            key={suggestion.id}
                            className="p-4 sm:p-5 rounded-xl bg-slate-950/80 border border-slate-800/90 hover:border-slate-700 transition space-y-4 shadow-lg"
                          >
                            {/* Item Meta & Score Comparison Header */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                              <div className="flex items-start gap-3 min-w-0">
                                <div className="w-12 h-16 rounded-lg overflow-hidden bg-slate-900 border border-slate-800 shrink-0">
                                  <SmartImage
                                    src={item.cover}
                                    alt={item.title}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 text-slate-300 font-semibold">
                                      {item.mediaFormat}
                                    </span>
                                    {item.releaseDate && (
                                      <span className="text-[11px] font-mono text-slate-400">
                                        {item.releaseDate.substring(0, 4)}
                                      </span>
                                    )}
                                    {suggestion.imbalanceReason && (
                                      <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 font-mono text-[10px] font-bold">
                                        {suggestion.imbalanceReason}
                                      </span>
                                    )}
                                  </div>
                                  <h3 className="text-sm font-bold text-slate-100 mt-1 capitalize truncate">
                                    {item.title}
                                  </h3>
                                  <p className="text-xs text-slate-400 truncate">
                                    by {item.mainCreator || 'Unknown Creator'}
                                  </p>
                                </div>
                              </div>

                              {/* Score Shift Pill Box */}
                              <div className="flex items-center justify-between sm:justify-end gap-3 bg-slate-900/95 border border-slate-800 rounded-xl p-2.5 sm:px-3 sm:py-2 shrink-0">
                                {/* Current Score */}
                                <div className="text-center">
                                  <span className="text-[10px] font-mono text-slate-400 block uppercase font-medium">Current</span>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className={`px-2 py-0.5 rounded font-mono font-bold text-xs border ${currLevel.bgBadge}`}>
                                      {suggestion.currentScore}/10
                                    </span>
                                    <span className="text-xs text-slate-300 font-medium hidden sm:inline">
                                      {currLevel.label}
                                    </span>
                                  </div>
                                </div>

                                <ArrowRight size={16} className={isDownward ? 'text-rose-400' : 'text-emerald-400'} />

                                {/* Suggested Score */}
                                <div className="text-center">
                                  <span className="text-[10px] font-mono text-amber-400 font-bold block uppercase">
                                    Calibrated
                                  </span>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className={`px-2 py-0.5 rounded font-mono font-bold text-xs border ${nextLevel.bgBadge}`}>
                                      {suggestion.suggestedScore}/10
                                    </span>
                                    <span className="text-xs text-amber-300 font-bold hidden sm:inline">
                                      {nextLevel.label}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Critique / Rationale Box */}
                            <div className="p-3.5 rounded-lg bg-amber-950/25 border border-amber-600/40 text-amber-100/95 text-xs leading-relaxed space-y-1">
                              <div className="font-mono text-[10px] uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1.5">
                                <Sparkles size={12} /> CRITIQUE & PHILOSOPHY ALIGNMENT
                              </div>
                              <p className="font-sans">{suggestion.critique}</p>
                            </div>

                            {/* Pros & Cons Comparison Snapshot */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                              {/* Pros */}
                              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-1.5">
                                <span className="text-[11px] font-mono text-emerald-400 font-bold flex items-center justify-between">
                                  <span className="flex items-center gap-1">
                                    <ThumbsUp size={12} /> PROS RECORDED
                                  </span>
                                  <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 text-[10px]">
                                    {(item.pros || []).length}
                                  </span>
                                </span>
                                {(item.pros || []).length > 0 ? (
                                  <ul className="text-xs text-slate-300 space-y-1 max-h-36 overflow-y-auto pr-1">
                                    {item.pros.map((pro, idx) => (
                                      <li key={idx} className="flex items-start gap-1.5 text-[11px] leading-tight">
                                        <span className="text-emerald-400 font-bold shrink-0">•</span>
                                        <span>{pro}</span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-[11px] text-slate-500 italic">No pros recorded</p>
                                )}
                              </div>

                              {/* Cons */}
                              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 space-y-1.5">
                                <span className="text-[11px] font-mono text-rose-400 font-bold flex items-center justify-between">
                                  <span className="flex items-center gap-1">
                                    <ThumbsDown size={12} /> CONS RECORDED
                                  </span>
                                  <span className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-400 text-[10px]">
                                    {(item.cons || []).length}
                                  </span>
                                </span>
                                {(item.cons || []).length > 0 ? (
                                  <ul className="text-xs text-slate-300 space-y-1 max-h-36 overflow-y-auto pr-1">
                                    {item.cons.map((con, idx) => (
                                      <li key={idx} className="flex items-start gap-1.5 text-[11px] leading-tight">
                                        <span className="text-rose-400 font-bold shrink-0">•</span>
                                        <span>{con}</span>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-[11px] text-slate-500 italic">No cons recorded</p>
                                )}
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-800/80">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleDismissSession(suggestion.id)}
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-mono transition cursor-pointer flex items-center gap-1"
                                  title="Keep current score and dismiss for this view"
                                >
                                  <EyeOff size={12} />
                                  <span>Dismiss</span>
                                </button>

                                <button
                                  onClick={() => handlePermanentReject(suggestion)}
                                  disabled={isProcessing}
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-950/40 hover:text-rose-300 text-slate-400 border border-slate-700/80 text-xs font-mono transition cursor-pointer flex items-center gap-1"
                                  title="Permanently ignore. You won't be asked about this item again."
                                >
                                  <Ban size={12} />
                                  <span className="hidden sm:inline">Ignore Forever</span>
                                </button>
                              </div>

                              <button
                                onClick={() => handleAccept(suggestion)}
                                disabled={isProcessing}
                                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md disabled:opacity-50"
                              >
                                {isProcessing ? (
                                  <RefreshCw size={13} className="animate-spin" />
                                ) : (
                                  <Check size={14} />
                                )}
                                <span>Accept Calibration ({suggestion.suggestedScore}/10)</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : activeTab === 'recommendations' ? (
                    <div className="py-10 text-center space-y-3 bg-slate-950/40 border border-slate-800/60 rounded-xl p-6">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                        <CheckCircle2 size={24} />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-slate-200 font-mono">
                          NO SCORE CONFLICTS DETECTED
                        </h4>
                        <p className="text-xs text-slate-400 max-w-md mx-auto">
                          Every active item's listed pros and cons accurately justify its assigned score tier under {sensitivity.toUpperCase()} scrutiny.
                        </p>
                      </div>
                      <div className="pt-2 flex items-center justify-center gap-3">
                        <button
                          onClick={() => setActiveTab('aligned')}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-emerald-400 border border-slate-700 cursor-pointer transition flex items-center gap-1.5"
                        >
                          <ShieldCheck size={13} />
                          <span>View Verified Aligned Entries ({alignedItems.length})</span>
                        </button>
                      </div>
                    </div>
                  ) : null}
                </>
              )}

              {/* Verified Aligned Entries Section */}
              {(activeTab === 'aligned' || activeTab === 'all') && (
                <div className="space-y-3">
                  {activeTab === 'all' && (
                    <div className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-1.5 pt-3 border-t border-slate-800/80">
                      <ShieldCheck size={13} />
                      <span>VERIFIED ALIGNED ENTRIES ({alignedItems.length})</span>
                    </div>
                  )}

                  {alignedItems.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3">
                      {alignedItems.map((aligned) => {
                        const item = aligned.item || items.find((i) => i.id === aligned.id);
                        if (!item) return null;
                        const score = typeof item.hornetScore === 'number' ? item.hornetScore : aligned.currentScore;
                        const level = getScoreLevelInfo(score);

                        return (
                          <div
                            key={aligned.id}
                            className="p-3.5 sm:p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="w-10 h-14 rounded-lg overflow-hidden bg-slate-900 border border-slate-800 shrink-0">
                                <SmartImage
                                  src={item.cover}
                                  alt={item.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="min-w-0 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono uppercase bg-slate-800 text-slate-300 font-semibold">
                                    {item.mediaFormat}
                                  </span>
                                  <h4 className="text-xs sm:text-sm font-bold text-slate-200 capitalize truncate">
                                    {item.title}
                                  </h4>
                                </div>
                                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                                  {aligned.alignmentNote}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                              <span className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs border ${level.bgBadge} flex items-center gap-1.5`}>
                                <Check size={12} className="text-emerald-400" />
                                <span>{score}/10</span>
                                <span className="text-[10px] font-normal opacity-90 hidden sm:inline">
                                  • {level.label}
                                </span>
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic py-4 text-center">
                      No aligned entries found.
                    </p>
                  )}
                </div>
              )}

              {/* Dismissed Items in Session */}
              {dismissedSuggestions.length > 0 && activeTab !== 'recommendations' && (
                <div className="pt-3 border-t border-slate-800/80">
                  <div className="text-[11px] font-mono text-slate-500 flex items-center justify-between">
                    <span>Dismissed in current session: {dismissedSuggestions.length}</span>
                    <button
                      onClick={() => setDismissedIds(new Set())}
                      className="text-amber-400 hover:underline cursor-pointer"
                    >
                      Restore All Dismissed
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 sm:px-5 py-3 bg-slate-950/95 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500 font-mono shrink-0">
          <div className="flex items-center gap-1.5">
            <HelpCircle size={13} />
            <span>Scores are never changed without your explicit approval.</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

