import { MediaItem, MediaRelationEntry, CreatorCategory } from '../types';
import { normalizeFormat } from './stringUtils';

export interface DetectedLinkCandidate {
  id: string; // Unique match identifier
  sourceItemId: string; // ID of item containing the reference
  sourceItemTitle: string; // Title of item containing reference
  field: 'mediumInfluences' | 'similarMedia';
  referenceIndex?: number;
  rawReferenceText: string;

  targetType: 'media' | 'creator';
  targetMediaItem?: MediaItem;
  targetCreatorName?: string;
  targetCreatorCategory?: CreatorCategory;
  targetCreatorPhoto?: string;
  targetCreatorWiki?: string;
}

/**
 * Normalizes text for matching comparisons
 */
export function normalizeTitle(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/gi, '')
    .replace(/\s+/g, ' ');
}

/**
 * Finds all potential unconfirmed matches in the database for references in currentItem
 * OR references in other items pointing to currentItem.
 */
export function findInterconnectedCandidates(
  currentItem: MediaItem,
  allItems: MediaItem[],
  alreadyProcessedIds: Set<string> = new Set()
): DetectedLinkCandidate[] {
  const candidates: DetectedLinkCandidate[] = [];

  // 1. Check currentItem's mediumInfluences

  if (currentItem.mediumInfluences) {
    currentItem.mediumInfluences.forEach((inf, idx) => {
      const titleStr = typeof inf === 'string' ? inf : inf.title;
      const normalized = normalizeTitle(titleStr);
      if (!normalized) return;

      const candidateId = `${currentItem.id}-inf-${idx}-${normalized}`;
      if (alreadyProcessedIds.has(candidateId)) return;

      // Check if already explicitly marked as matched in customCover/type or explicitly unlinked
      if (typeof inf === 'object' && (inf.unlinked === true || (inf.customCover && inf.type))) return;

      // Check media match
      const matchedMedia = allItems.find(
        (item) => item.id !== currentItem.id && normalizeTitle(item.title) === normalized
      );

      if (matchedMedia) {
        candidates.push({
          id: candidateId,
          sourceItemId: currentItem.id,
          sourceItemTitle: currentItem.title,
          field: 'mediumInfluences',
          referenceIndex: idx,
          rawReferenceText: titleStr,
          targetType: 'media',
          targetMediaItem: matchedMedia
        });
        return;
      }

      // Check creator match
      for (const item of allItems) {
        // Main creator
        if (item.mainCreator && normalizeTitle(item.mainCreator) === normalized) {
          const detail = item.creatorDetails?.find((d) => normalizeTitle(d.name) === normalized);
          candidates.push({
            id: candidateId,
            sourceItemId: currentItem.id,
            sourceItemTitle: currentItem.title,
            field: 'mediumInfluences',
            referenceIndex: idx,
            rawReferenceText: titleStr,
            targetType: 'creator',
            targetCreatorName: item.mainCreator,
            targetCreatorCategory: detail?.category || 'Director',
            targetCreatorPhoto: detail?.photoUrl || item.cover,
            targetCreatorWiki: detail?.wikiUrl
          });
          return;
        }

        // Creator details array
        if (item.creatorDetails) {
          for (const cd of item.creatorDetails) {
            if (normalizeTitle(cd.name) === normalized) {
              candidates.push({
                id: candidateId,
                sourceItemId: currentItem.id,
                sourceItemTitle: currentItem.title,
                field: 'mediumInfluences',
                referenceIndex: idx,
                rawReferenceText: titleStr,
                targetType: 'creator',
                targetCreatorName: cd.name,
                targetCreatorCategory: cd.category || 'Author',
                targetCreatorPhoto: cd.photoUrl || item.cover,
                targetCreatorWiki: cd.wikiUrl
              });
              return;
            }
          }
        }
      }
    });
  }

  // 2. Check currentItem's similarMedia
  if (currentItem.similarMedia) {
    currentItem.similarMedia.forEach((sim, idx) => {
      const titleStr = typeof sim === 'string' ? sim : sim.title;
      const normalized = normalizeTitle(titleStr);
      if (!normalized) return;

      const candidateId = `${currentItem.id}-sim-${idx}-${normalized}`;
      if (alreadyProcessedIds.has(candidateId)) return;

      if (typeof sim === 'object' && (sim.unlinked === true || sim.customCover)) return;

      const matchedMedia = allItems.find(
        (item) => item.id !== currentItem.id && normalizeTitle(item.title) === normalized
      );

      if (matchedMedia) {
        candidates.push({
          id: candidateId,
          sourceItemId: currentItem.id,
          sourceItemTitle: currentItem.title,
          field: 'similarMedia',
          referenceIndex: idx,
          rawReferenceText: titleStr,
          targetType: 'media',
          targetMediaItem: matchedMedia
        });
      }
    });
  }

  // 3. Reverse Check: Does another item in allItems have an unlinked reference matching currentItem?
  if (currentItem.title) {
    const currentNormalized = normalizeTitle(currentItem.title);

    allItems.forEach((otherItem) => {
      if (otherItem.id === currentItem.id) return;

      // Check otherItem's influences
      otherItem.mediumInfluences?.forEach((inf, idx) => {
        const titleStr = typeof inf === 'string' ? inf : inf.title;
        if (normalizeTitle(titleStr) === currentNormalized) {
          const candidateId = `${otherItem.id}-inf-${idx}-reverse-${currentItem.id}`;
          if (!alreadyProcessedIds.has(candidateId)) {
            // Check if already linked
            if (typeof inf !== 'object' || !inf.customCover) {
              candidates.push({
                id: candidateId,
                sourceItemId: otherItem.id,
                sourceItemTitle: otherItem.title,
                field: 'mediumInfluences',
                referenceIndex: idx,
                rawReferenceText: titleStr,
                targetType: 'media',
                targetMediaItem: currentItem
              });
            }
          }
        }
      });

      // Check otherItem's similarMedia
      otherItem.similarMedia?.forEach((sim, idx) => {
        const titleStr = typeof sim === 'string' ? sim : sim.title;
        if (normalizeTitle(titleStr) === currentNormalized) {
          const candidateId = `${otherItem.id}-sim-${idx}-reverse-${currentItem.id}`;
          if (!alreadyProcessedIds.has(candidateId)) {
            if (typeof sim !== 'object' || !sim.customCover) {
              candidates.push({
                id: candidateId,
                sourceItemId: otherItem.id,
                sourceItemTitle: otherItem.title,
                field: 'similarMedia',
                referenceIndex: idx,
                rawReferenceText: titleStr,
                targetType: 'media',
                targetMediaItem: currentItem
              });
            }
          }
        }
      });
    });
  }

  return candidates;
}

/**
 * Applies confirmed links to the items array
 */
export function applyConfirmedLinks(
  allItems: MediaItem[],
  confirmedCandidates: DetectedLinkCandidate[]
): MediaItem[] {
  if (confirmedCandidates.length === 0) return allItems;

  const itemsMap = new Map<string, MediaItem>(allItems.map((item) => [item.id, { ...item }]));

  confirmedCandidates.forEach((cand) => {
    const sourceItem = itemsMap.get(cand.sourceItemId);
    if (!sourceItem) return;

    if (cand.field === 'mediumInfluences' && sourceItem.mediumInfluences) {
      const updatedInfluences = [...sourceItem.mediumInfluences];
      if (cand.targetType === 'media' && cand.targetMediaItem) {
        updatedInfluences[cand.referenceIndex] = {
          title: cand.targetMediaItem.title,
          type: 'media',
          customCover: cand.targetMediaItem.cover,
          note: `Linked to ${cand.targetMediaItem.mediaFormat} (${cand.targetMediaItem.releaseDate.substring(0, 4)})`
        };
      } else if (cand.targetType === 'creator' && cand.targetCreatorName) {
        updatedInfluences[cand.referenceIndex] = {
          title: cand.targetCreatorName,
          type: 'creator',
          customCover: cand.targetCreatorPhoto,
          note: `Linked Creator Bio (${cand.targetCreatorCategory || 'Bio'})`
        };
      }
      sourceItem.mediumInfluences = updatedInfluences;
    } else if (cand.field === 'similarMedia' && sourceItem.similarMedia) {
      const updatedSimilar = [...sourceItem.similarMedia];
      if (cand.targetType === 'media' && cand.targetMediaItem) {
        updatedSimilar[cand.referenceIndex] = {
          title: cand.targetMediaItem.title,
          type: 'media',
          customCover: cand.targetMediaItem.cover,
          note: `Linked to ${cand.targetMediaItem.mediaFormat}`
        };
      }
      sourceItem.similarMedia = updatedSimilar;
    }

    itemsMap.set(cand.sourceItemId, sourceItem);
  });

  return Array.from(itemsMap.values());
}
