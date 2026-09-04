/**
 * Utility functions for tag sanitation, hyphen/spacing normalization,
 * and auto-correcting typos against existing tags in the database.
 */

// Helper to normalize tag for loose comparison (e.g. "sci-fi", "sci fi", "Sci Fi" -> "scifi")
export function normalizeTagKey(tag: string): string {
  if (!tag) return '';
  return tag
    .trim()
    .toLowerCase()
    .replace(/[-_\s]+/g, '');
}

// Calculate Levenshtein distance for minor typo detection
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Strips leading/trailing spaces, normalizes hyphens/spaces,
 * and auto-corrects typos against known existing tags in the system.
 */
export function cleanAndCorrectTag(
  rawTag: string,
  existingTagPool: string[] = [],
  options?: { forceLowercase?: boolean; allowFuzzyAutocorrect?: boolean }
): string {
  if (!rawTag) return '';
  let trimmed = rawTag.trim();
  if (!trimmed) return '';

  if (options?.forceLowercase) {
    trimmed = trimmed.toLowerCase();
  }

  const normInput = normalizeTagKey(trimmed);

  // 1. Direct exact match in pool
  const exactMatch = existingTagPool.find((t) => (options?.forceLowercase ? t.trim().toLowerCase() : t.trim()) === trimmed);
  if (exactMatch) return options?.forceLowercase ? exactMatch.trim().toLowerCase() : exactMatch.trim();

  // 2. Case-insensitive / hyphen-insensitive match
  const normalizedMatch = existingTagPool.find(
    (t) => normalizeTagKey(t) === normInput
  );
  if (normalizedMatch) return options?.forceLowercase ? normalizedMatch.trim().toLowerCase() : normalizedMatch.trim();

  // 3. Minor typo auto-correct ONLY if explicitly enabled
  if (options?.allowFuzzyAutocorrect && normInput.length >= 5) {
    let bestMatch: string | null = null;
    let minDistance = 2;

    for (const existing of existingTagPool) {
      const normExisting = normalizeTagKey(existing);
      if (Math.abs(normExisting.length - normInput.length) > 1) continue;

      const dist = levenshteinDistance(normInput, normExisting);
      if (dist <= 1 && dist < minDistance) {
        minDistance = dist;
        bestMatch = options?.forceLowercase ? existing.trim().toLowerCase() : existing.trim();
      }
    }

    if (bestMatch) {
      return bestMatch;
    }
  }

  // 4. Return clean trimmed tag as entered by user
  return trimmed;
}

/**
 * Process an array of tags (splits by comma/newline if needed, trims spaces, deduplicates, and auto-corrects)
 */
export function processTagList(
  inputTags: string[] | string,
  existingTagPool: string[] = [],
  options?: { forceLowercase?: boolean; allowFuzzyAutocorrect?: boolean }
): string[] {
  let list: string[] = [];

  if (typeof inputTags === 'string') {
    list = inputTags.split(/[,;\n]+/);
  } else if (Array.isArray(inputTags)) {
    list = inputTags.flatMap((t) => (typeof t === 'string' ? t.split(/[,;\n]+/) : []));
  }

  const result: string[] = [];
  const seenNorm = new Set<string>();

  for (const raw of list) {
    const cleaned = cleanAndCorrectTag(raw, existingTagPool, options);
    if (!cleaned) continue;

    const normKey = normalizeTagKey(cleaned);
    if (!seenNorm.has(normKey)) {
      seenNorm.add(normKey);
      result.push(options?.forceLowercase ? cleaned.toLowerCase() : cleaned);
    }
  }

  return result;
}
