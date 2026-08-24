import { MediaItem } from '../types';
import { getSortableTitle } from './stringUtils';

export interface ProsConsStats {
  prosCount: number;
  consCount: number;
  netPros: number;
  ratio: number;
  total: number;
  metric: number;
}

/**
 * Safely extracts the numeric Hornet Score from any item variation.
 * Guarantees a valid number (e.g. 10, 9, 8, 7, 6, 5, 4, 3, 2, 1) or 0.
 */
export function getItemScore(item: any): number {
  if (!item) return 0;
  if (typeof item.hornetScore === 'number' && !isNaN(item.hornetScore)) {
    return item.hornetScore;
  }
  if (typeof item.score === 'number' && !isNaN(item.score)) {
    return item.score;
  }
  const parsed = parseFloat(item.hornetScore ?? item.score);
  return !isNaN(parsed) ? parsed : 0;
}

export function calculateProsConsStats(item: MediaItem): ProsConsStats {
  const prosCount = Array.isArray(item?.pros) ? item.pros.length : 0;
  const consCount = Array.isArray(item?.cons) ? item.cons.length : 0;
  const netPros = prosCount - consCount;
  const total = prosCount + consCount;
  const ratio = total > 0 ? prosCount / total : 0.5;
  // Dynamic metric balancing net pros and ratio percentage
  const metric = netPros * 1000 + ratio * 100;
  return { prosCount, consCount, netPros, ratio, total, metric };
}

/**
 * Compare two media items based on Hornet Quality logic:
 * 1. Hornet Score (10 down to 0) - ABSOLUTE FIRST PARTITION (a 5/10 will ALWAYS rank over a 4/10)
 * 2. Pros-cons quantity dynamic + ratio
 * 3. Quantity of philosophical tags
 * 4. Alphabetical title tie-breaker
 */
export function compareByQuality(a: MediaItem, b: MediaItem): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  // 1. Strict Hornet Score partition (best to worst, higher score always wins)
  const scoreA = getItemScore(a);
  const scoreB = getItemScore(b);
  const scoreDiff = scoreB - scoreA;
  if (Math.abs(scoreDiff) > 0.001) {
    return scoreDiff;
  }

  // 2. Intra-tier pros-cons quantity dynamic + ratio
  const statsA = calculateProsConsStats(a);
  const statsB = calculateProsConsStats(b);
  const prosConsDiff = statsB.metric - statsA.metric;
  if (Math.abs(prosConsDiff) > 0.001) {
    return prosConsDiff;
  }

  // 3. Intra-tier quantity of philosophical tags
  const philoA = Array.isArray(a.philosophicalTags) ? a.philosophicalTags.length : 0;
  const philoB = Array.isArray(b.philosophicalTags) ? b.philosophicalTags.length : 0;
  const philoDiff = philoB - philoA;
  if (philoDiff !== 0) {
    return philoDiff;
  }

  // 4. Intra-tier alphabetical Title Fallback
  return getSortableTitle(a.title || '').localeCompare(getSortableTitle(b.title || ''));
}

/**
 * Builds a deterministic rank index map covering 100% of input items.
 * Guaranteed complete inclusion with zero dropped or orphaned items.
 * Hornet Score is STRICTLY the primary sorting partition (10 down to 0).
 * AI/fine-grained ranking only sorts items within the EXACT SAME score tier.
 */
export function buildCompositeQualityRankMap(
  items: MediaItem[],
  aiRankMap?: Map<string, number> | null
): Map<string, number> {
  const result = new Map<string, number>();
  if (!items || items.length === 0) return result;

  const sorted = [...items].sort((a, b) => {
    // 1. Strict primary factor: Hornet Score (10 down to 0) - higher score ALWAYS ranks first
    const scoreA = getItemScore(a);
    const scoreB = getItemScore(b);
    const scoreDiff = scoreB - scoreA;
    if (Math.abs(scoreDiff) > 0.001) {
      return scoreDiff;
    }

    // 2. Intra-tier secondary ranking: AI ranking within the EXACT SAME score tier
    const rankA = aiRankMap?.get(a.id);
    const rankB = aiRankMap?.get(b.id);
    if (rankA !== undefined && rankB !== undefined) {
      return rankA - rankB;
    }

    // 3. Intra-tier deterministic quality tiebreaker
    return compareByQuality(a, b);
  });

  sorted.forEach((item, index) => {
    result.set(item.id, index);
  });

  return result;
}

