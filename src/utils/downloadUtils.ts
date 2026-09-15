import { MediaItem, getScoreLevelInfo, getItemReview } from '../types';
import { extractReleaseYear } from './dateUtils';
import { formatImageUrl, getProxyImageUrl } from './imageUtils';

export type DownloadProgressCallback = (stage: string) => void;

/**
 * Generates a clean, safe filename for exported PNGs.
 */
function getSafeFileName(item: MediaItem, suffix: string = 'card'): string {
  const safeTitle = (item.title || 'media')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'media';

  const year = extractReleaseYear(item.releaseDate);
  const yearSuffix = year ? `_${year}` : '';
  const scoreSuffix = typeof item.hornetScore === 'number' ? `_${item.hornetScore}pts` : '';

  return `${safeTitle}${yearSuffix}${scoreSuffix}_${suffix}.png`;
}

/**
 * Triggers a browser download for a data URL with a slight pause
 * to ensure modern browsers don't throttle multi-file downloads.
 */
async function triggerDownload(url: string, filename: string): Promise<void> {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Short pause to allow browser download pipeline to dispatch cleanly
  await new Promise((r) => setTimeout(r, 320));
}

/**
 * Helper to wrap text into lines fitting within a max width.
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  const lines: string[] = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const word = words[i];
    const width = ctx.measureText(`${currentLine} ${word}`).width;
    if (width < maxWidth) {
      currentLine += ` ${word}`;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

/**
 * Helper to draw a rounded rectangle on a Canvas.
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.lineTo(x + width, y + height - r);
  ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
  ctx.lineTo(x + r, y + height);
  ctx.arcTo(x, y + height, x, y + height - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/**
 * Draws luxury/archival corner bracket notches on the frame.
 */
function drawCornerBrackets(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  len: number,
  strokeColor: string
) {
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 1.5;

  // Top Left
  ctx.beginPath();
  ctx.moveTo(x, y + len);
  ctx.lineTo(x, y);
  ctx.lineTo(x + len, y);
  ctx.stroke();

  // Top Right
  ctx.beginPath();
  ctx.moveTo(x + w - len, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + len);
  ctx.stroke();

  // Bottom Left
  ctx.beginPath();
  ctx.moveTo(x, y + h - len);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x + len, y + h);
  ctx.stroke();

  // Bottom Right
  ctx.beginPath();
  ctx.moveTo(x + w - len, y + h);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w, y + h - len);
  ctx.stroke();
}

/**
 * Loads an image with CORS proxy fallback.
 */
async function loadCanvasImage(rawUrl: string): Promise<HTMLImageElement | null> {
  if (!rawUrl) return null;
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const imgSrc = getProxyImageUrl(rawUrl) || formatImageUrl(rawUrl);

    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = imgSrc;
      if (img.complete) resolve();
    });

    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      return img;
    }
  } catch {
    // Continue if image fails
  }
  return null;
}

/**
 * Extracts clean full review text, pros, and cons (no AI summary or score verdict).
 */
export function getFullReviewText(item: MediaItem): {
  body: string;
  pros: string[];
  cons: string[];
} {
  const body = (getItemReview(item) || '').trim();
  const pros = Array.isArray(item.pros) ? item.pros.filter(Boolean) : [];
  const cons = Array.isArray(item.cons) ? item.cons.filter(Boolean) : [];

  return { body, pros, cons };
}

/**
 * Paginates lines across as many slides as necessary so 100% of the review is displayed,
 * with balanced distribution on the final slides.
 */
function paginateReviewLines(
  allLines: string[],
  hasHighlights: boolean
): string[][] {
  if (allLines.length === 0) {
    return [[]];
  }

  const normalCapacity = 29;
  const lastCapacity = hasHighlights ? 24 : 29;

  // Single slide case
  if (allLines.length <= lastCapacity) {
    return [allLines];
  }

  const chunks: string[][] = [];
  let currentIdx = 0;

  while (currentIdx < allLines.length) {
    const remaining = allLines.length - currentIdx;

    // If remaining fits completely on the final slide
    if (remaining <= lastCapacity) {
      chunks.push(allLines.slice(currentIdx));
      break;
    }

    // If remaining needs exactly 2 slides (current + final), balance them nicely
    if (remaining <= normalCapacity + lastCapacity) {
      const firstPartCount = Math.min(
        normalCapacity,
        Math.max(remaining - lastCapacity, Math.ceil(remaining / 2))
      );
      chunks.push(allLines.slice(currentIdx, currentIdx + firstPartCount));
      chunks.push(allLines.slice(currentIdx + firstPartCount));
      break;
    }

    // Multi-slide continuation: take normal capacity
    chunks.push(allLines.slice(currentIdx, currentIdx + normalCapacity));
    currentIdx += normalCapacity;
  }

  return chunks;
}

/**
 * Prepares the review lines formatted as an absolute wall of text,
 * paginated across as many images as necessary to ensure 100% of the review is displayed.
 */
function prepareReviewSlides(reviewData: {
  body: string;
  pros: string[];
  cons: string[];
}): { slideLineChunks: string[][]; totalParts: number } {
  let text = (reviewData.body || '').trim();

  // If text is empty or minimal, build structured review narrative
  if (!text) {
    const pieces: string[] = [];
    if (reviewData.pros.length > 0) {
      pieces.push(`Key Strengths: ${reviewData.pros.join('; ')}.`);
    }
    if (reviewData.cons.length > 0) {
      pieces.push(`Critical Notes: ${reviewData.cons.join('; ')}.`);
    }
    text = pieces.join(' ');
  }

  // Make it an absolute wall of text:
  // Flatten all newlines, carriage returns, tabs, and multiple spaces into single spaces.
  // Sentences continue directly on the same line after dots without going under.
  const wallOfText = text
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Create canvas context to wrap text using the exact 22px font
  const dummyCanvas = document.createElement('canvas');
  const dctx = dummyCanvas.getContext('2d');
  const bodyW = 940; // 1080 - 44 - 96

  let allLines: string[] = [];
  if (dctx) {
    dctx.font = '22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
    allLines = wrapText(dctx, wallOfText, bodyW);
  } else {
    allLines = [wallOfText];
  }

  const hasHighlights = reviewData.pros.length > 0 || reviewData.cons.length > 0;
  const slideLineChunks = paginateReviewLines(allLines, hasHighlights);
  const totalParts = slideLineChunks.length;

  return { slideLineChunks, totalParts };
}

// -------------------------------------------------------------
// 1. COLLECTIBLE CARD CANVAS RENDERER
// -------------------------------------------------------------

/**
 * Render a collectible card to Canvas with:
 * - Much larger, prominent score badge (28px bold font, glowing dot, 44px pill)
 * - Do NOT show philosophy tags (only genres and style tags)
 * - Strict limit of up to 30 tags with a tidy, max-row constrained layout
 */
async function renderCardToCanvas(item: MediaItem): Promise<string> {
  const scale = 2; // 2x Retina rendering
  const width = 560; // Card width in logical pixels
  const frameMargin = 12; // Outer frame matting
  const innerCardWidth = width - frameMargin * 2;
  const padding = 18;
  const contentWidth = innerCardWidth - padding * 2;

  // 1. Calculate image dimensions (16:10 aspect ratio for cover)
  const coverHeight = Math.round(innerCardWidth * (10 / 16));

  // 2. Pre-calculate layout & typography heights
  const dummyCanvas = document.createElement('canvas');
  const dctx = dummyCanvas.getContext('2d')!;

  // Measure Title
  dctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
  const titleText = item.title || 'Untitled';
  const titleLines = wrapText(dctx, titleText, contentWidth);
  const titleBlockHeight = titleLines.length * 25;

  // Creator line height
  const creatorHeight = 22;

  // --- TAGS: FILTER OUT PHILOSOPHY TAGS, STRICT LIMIT OF 30 ---
  const rawGenres = (item.genres || []).filter(Boolean);
  const rawStyles = (item.genreStyleTags || []).filter(Boolean);

  const seen = new Set<string>();
  interface CardTagItem {
    text: string;
    type: 'genre' | 'style';
  }

  const allTags: CardTagItem[] = [];

  for (const g of rawGenres) {
    const trimmed = (g || '').trim();
    const lower = trimmed.toLowerCase();
    if (trimmed && !seen.has(lower)) {
      seen.add(lower);
      allTags.push({ text: trimmed, type: 'genre' });
    }
  }

  for (const s of rawStyles) {
    const trimmed = (s || '').trim();
    const lower = trimmed.toLowerCase();
    if (trimmed && !seen.has(lower)) {
      seen.add(lower);
      allTags.push({ text: trimmed, type: 'style' });
    }
  }

  // Strictly limit to 30 tags
  const MAX_TAGS = 30;
  const displayTags = allTags.slice(0, MAX_TAGS);

  // Measure tag rows with clean compact layout to prevent awkward stretching
  dctx.font = 'bold 10px monospace';
  const tagHeight = 21;
  const tagGapX = 6;
  const tagGapY = 6;
  const MAX_TAG_ROWS = 5;

  let currentTagX = 0;
  let tagRowsCount = displayTags.length > 0 ? 1 : 0;
  let visibleTagsCount = 0;

  for (let i = 0; i < displayTags.length; i++) {
    const t = displayTags[i];
    const tagW = dctx.measureText(t.text).width + 16;
    if (currentTagX + tagW > contentWidth && currentTagX > 0) {
      if (tagRowsCount >= MAX_TAG_ROWS) {
        break;
      }
      tagRowsCount++;
      currentTagX = tagW + tagGapX;
    } else {
      currentTagX += tagW + tagGapX;
    }
    visibleTagsCount++;
  }

  const hasRemainingTags = displayTags.length > visibleTagsCount;
  const tagsBlockHeight = tagRowsCount > 0 ? tagRowsCount * tagHeight + (tagRowsCount - 1) * tagGapY : 0;

  // Calculate EXACT canvas height with proportional padding
  const bodyContentHeight =
    16 + // top padding below cover
    titleBlockHeight +
    creatorHeight +
    (tagsBlockHeight > 0 ? 16 + tagsBlockHeight : 0) +
    14 + // space before footer
    22 + // footer height
    12; // bottom padding inside card

  const innerCardHeight = coverHeight + bodyContentHeight;
  const totalHeight = innerCardHeight + frameMargin * 2;

  // 3. Create actual Canvas
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = totalHeight * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  ctx.scale(scale, scale);

  // --- OUTER FRAME BACKGROUND & BEZEL ---
  const outerGrad = ctx.createLinearGradient(0, 0, width, totalHeight);
  outerGrad.addColorStop(0, '#030712');
  outerGrad.addColorStop(0.5, '#070b16');
  outerGrad.addColorStop(1, '#02050e');
  ctx.fillStyle = outerGrad;
  roundRect(ctx, 0, 0, width, totalHeight, 16);
  ctx.fill();

  // Outer Precision Border
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#1e293b';
  roundRect(ctx, 0.75, 0.75, width - 1.5, totalHeight - 1.5, 16);
  ctx.stroke();

  // Inset Accent Frame
  const insetMargin = 5;
  const frameGrad = ctx.createLinearGradient(0, 0, width, totalHeight);
  frameGrad.addColorStop(0, 'rgba(168, 85, 247, 0.45)');
  frameGrad.addColorStop(0.5, 'rgba(234, 179, 8, 0.4)');
  frameGrad.addColorStop(1, 'rgba(99, 102, 241, 0.45)');
  ctx.lineWidth = 1;
  ctx.strokeStyle = frameGrad;
  roundRect(
    ctx,
    insetMargin + 0.5,
    insetMargin + 0.5,
    width - insetMargin * 2 - 1,
    totalHeight - insetMargin * 2 - 1,
    12
  );
  ctx.stroke();

  // Corner Bracket Notches on the outer frame
  drawCornerBrackets(
    ctx,
    insetMargin + 4,
    insetMargin + 4,
    width - (insetMargin + 4) * 2,
    totalHeight - (insetMargin + 4) * 2,
    14,
    'rgba(234, 179, 8, 0.7)'
  );

  // Micro Corner Dots
  const dotOffset = insetMargin + 7;
  ctx.fillStyle = 'rgba(234, 179, 8, 0.9)';
  [
    [dotOffset, dotOffset],
    [width - dotOffset, dotOffset],
    [dotOffset, totalHeight - dotOffset],
    [width - dotOffset, totalHeight - dotOffset],
  ].forEach(([dx, dy]) => {
    ctx.beginPath();
    ctx.arc(dx, dy, 1.5, 0, Math.PI * 2);
    ctx.fill();
  });

  // --- INNER CARD CONTAINER ---
  const cardX = frameMargin;
  const cardY = frameMargin;

  ctx.fillStyle = '#090d16';
  roundRect(ctx, cardX, cardY, innerCardWidth, innerCardHeight, 10);
  ctx.fill();

  ctx.lineWidth = 1;
  ctx.strokeStyle = '#1e293b';
  roundRect(ctx, cardX + 0.5, cardY + 0.5, innerCardWidth - 1, innerCardHeight - 1, 10);
  ctx.stroke();

  // --- COVER ARTWORK ---
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cardX + 10, cardY);
  ctx.lineTo(cardX + innerCardWidth - 10, cardY);
  ctx.arcTo(cardX + innerCardWidth, cardY, cardX + innerCardWidth, cardY + 10, 10);
  ctx.lineTo(cardX + innerCardWidth, cardY + coverHeight);
  ctx.lineTo(cardX, cardY + coverHeight);
  ctx.lineTo(cardX, cardY + 10);
  ctx.arcTo(cardX, cardY, cardX + 10, cardY, 10);
  ctx.closePath();
  ctx.clip();

  ctx.fillStyle = '#020617';
  ctx.fillRect(cardX, cardY, innerCardWidth, coverHeight);

  // Load and draw cover image
  const coverImg = await loadCanvasImage(item.cover || '');
  if (coverImg) {
    const hRatio = innerCardWidth / coverImg.naturalWidth;
    const vRatio = coverHeight / coverImg.naturalHeight;
    const ratio = Math.max(hRatio, vRatio);
    const centerShiftX = (innerCardWidth - coverImg.naturalWidth * ratio) / 2;
    const centerShiftY = (coverHeight - coverImg.naturalHeight * ratio) / 2;

    ctx.drawImage(
      coverImg,
      0,
      0,
      coverImg.naturalWidth,
      coverImg.naturalHeight,
      cardX + centerShiftX,
      cardY + centerShiftY,
      coverImg.naturalWidth * ratio,
      coverImg.naturalHeight * ratio
    );
  }

  // Cover bottom gradient overlay
  const coverGrad = ctx.createLinearGradient(
    0,
    cardY + coverHeight - 110,
    0,
    cardY + coverHeight
  );
  coverGrad.addColorStop(0, 'rgba(9, 13, 22, 0)');
  coverGrad.addColorStop(0.6, 'rgba(9, 13, 22, 0.7)');
  coverGrad.addColorStop(1, 'rgba(9, 13, 22, 1)');
  ctx.fillStyle = coverGrad;
  ctx.fillRect(cardX, cardY + coverHeight - 110, innerCardWidth, 110);

  // Subtle top shadow
  const topGrad = ctx.createLinearGradient(0, cardY, 0, cardY + 50);
  topGrad.addColorStop(0, 'rgba(2, 6, 23, 0.65)');
  topGrad.addColorStop(1, 'rgba(2, 6, 23, 0)');
  ctx.fillStyle = topGrad;
  ctx.fillRect(cardX, cardY, innerCardWidth, 50);

  ctx.restore(); // End cover clip

  // --- TOP BADGES ---
  // Top-Left: Format Badge
  const formatName = (
    item.isCustomCategory
      ? item.customCategoryName || item.mediaFormat
      : item.mediaFormat || 'Media'
  ).toUpperCase();

  ctx.font = 'bold 13px monospace';
  const formatTextW = ctx.measureText(formatName).width;
  const formatPillW = formatTextW + 22;
  const formatPillH = 34;
  const badgeY = cardY + 14;
  const badgeLeftX = cardX + 14;

  ctx.fillStyle = 'rgba(2, 6, 23, 0.94)';
  roundRect(ctx, badgeLeftX, badgeY, formatPillW, formatPillH, 8);
  ctx.fill();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  roundRect(ctx, badgeLeftX, badgeY, formatPillW, formatPillH, 8);
  ctx.stroke();

  ctx.fillStyle = item.isCustomCategory ? '#fbbf24' : '#c084fc';
  ctx.fillText(formatName, badgeLeftX + 11, badgeY + 22);

  // OST Badge if applicable
  if (item.mediaFormat === 'Music Album' && item.isSoundtrack) {
    const ostX = badgeLeftX + formatPillW + 8;
    const ostW = 48;
    ctx.fillStyle = 'rgba(88, 28, 135, 0.94)';
    roundRect(ctx, ostX, badgeY, ostW, formatPillH, 8);
    ctx.fill();
    ctx.strokeStyle = '#9333ea';
    roundRect(ctx, ostX, badgeY, ostW, formatPillH, 8);
    ctx.stroke();
    ctx.fillStyle = '#f3e8ff';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('OST', ostX + 11, badgeY + 22);
  }

  // --- TOP-RIGHT: MUCH LARGER, PROMINENT HORNET SCORE BADGE ---
  const score = typeof item.hornetScore === 'number' ? item.hornetScore : 0;
  const scoreColor =
    score >= 9 ? '#10b981' : score >= 7 ? '#a855f7' : score >= 5 ? '#f59e0b' : '#ef4444';

  const scoreMainText = `${score}`;
  const scoreSubText = '/10';
  ctx.font = 'bold 28px monospace';
  const scoreMainW = ctx.measureText(scoreMainText).width;
  ctx.font = 'bold 13px monospace';
  const scoreSubW = ctx.measureText(scoreSubText).width;

  const scoreBadgeH = 44; // Noticeably larger badge height
  const scoreBadgeW = scoreMainW + scoreSubW + 42;
  const scoreBadgeX = cardX + innerCardWidth - 14 - scoreBadgeW;

  // Background with subtle outer score glow
  ctx.shadowColor = scoreColor;
  ctx.shadowBlur = 12;
  ctx.fillStyle = 'rgba(2, 6, 23, 0.96)';
  roundRect(ctx, scoreBadgeX, badgeY, scoreBadgeW, scoreBadgeH, 22);
  ctx.fill();
  ctx.shadowBlur = 0; // reset shadow

  // Score Tinted Border
  ctx.strokeStyle = scoreColor;
  ctx.lineWidth = 1.5;
  roundRect(ctx, scoreBadgeX, badgeY, scoreBadgeW, scoreBadgeH, 22);
  ctx.stroke();

  // Score Indicator Dot
  ctx.fillStyle = scoreColor;
  ctx.beginPath();
  ctx.arc(scoreBadgeX + 16, badgeY + 22, 5.5, 0, Math.PI * 2);
  ctx.fill();

  // Score Number (Large & prominent)
  ctx.fillStyle = scoreColor;
  ctx.font = 'bold 28px monospace';
  ctx.fillText(scoreMainText, scoreBadgeX + 27, badgeY + 31.5);

  // Score Subtext /10
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 13px monospace';
  ctx.fillText(scoreSubText, scoreBadgeX + 27 + scoreMainW + 2, badgeY + 29);

  // --- BOTTOM OF COVER BADGES (Year & Origin) ---
  const parsedYear = extractReleaseYear(item.releaseDate);
  const yearStr = parsedYear
    ? String(parsedYear)
    : item.releaseDate
    ? item.releaseDate.substring(0, 4)
    : '';

  let bottomBadgeX = cardX + 14;
  const bottomBadgeY = cardY + coverHeight - 36;

  if (yearStr) {
    ctx.font = 'bold 11px monospace';
    const yW = ctx.measureText(yearStr).width + 16;
    ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
    roundRect(ctx, bottomBadgeX, bottomBadgeY, yW, 24, 6);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    roundRect(ctx, bottomBadgeX, bottomBadgeY, yW, 24, 6);
    ctx.stroke();

    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(yearStr, bottomBadgeX + 8, bottomBadgeY + 16.5);
    bottomBadgeX += yW + 6;
  }

  if (item.countryOfOrigin) {
    ctx.font = 'bold 11px monospace';
    const cText = item.countryOfOrigin;
    const cW = ctx.measureText(cText).width + 16;
    ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
    roundRect(ctx, bottomBadgeX, bottomBadgeY, cW, 24, 6);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    roundRect(ctx, bottomBadgeX, bottomBadgeY, cW, 24, 6);
    ctx.stroke();

    ctx.fillStyle = '#d8b4fe';
    ctx.fillText(cText, bottomBadgeX + 8, bottomBadgeY + 16.5);
    bottomBadgeX += cW + 6;
  }

  if (item.consumedVersion) {
    ctx.font = 'bold 11px monospace';
    const vText = item.consumedVersion;
    const vW = ctx.measureText(vText).width + 16;
    const vX = cardX + innerCardWidth - 14 - vW;
    ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
    roundRect(ctx, vX, bottomBadgeY, vW, 24, 6);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    roundRect(ctx, vX, bottomBadgeY, vW, 24, 6);
    ctx.stroke();

    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(vText, vX + 8, bottomBadgeY + 16.5);
  }

  // --- CARD BODY DETAILS ---
  let currY = cardY + coverHeight + 22;
  const textLeft = cardX + padding;
  const textRight = cardX + innerCardWidth - padding;

  // Title
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
  titleLines.forEach((line) => {
    ctx.fillText(line, textLeft, currY);
    currY += 24;
  });

  // Creator Line (Clean & uncluttered - prominent score badge is on the cover artwork)
  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px monospace';
  const creatorStr = `BY ${(item.mainCreator || 'UNKNOWN').toUpperCase()}`;
  ctx.fillText(creatorStr, textLeft, currY);

  currY += 16;

  // --- TAGS RENDERING (NO PHILOSOPHY TAGS, LIMIT 30, TIDY VISUALS) ---
  if (displayTags.length > 0) {
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(textLeft, currY);
    ctx.lineTo(textRight, currY);
    ctx.stroke();
    currY += 12;

    let tagX = textLeft;
    ctx.font = 'bold 10px monospace';
    let currentRenderRow = 1;

    for (let i = 0; i < displayTags.length; i++) {
      const t = displayTags[i];
      const tagText = t.text;
      const tagW = ctx.measureText(tagText).width + 16;

      if (tagX + tagW > textRight && tagX > textLeft) {
        if (currentRenderRow >= MAX_TAG_ROWS) {
          // Render remaining count pill if space runs out
          break;
        }
        tagX = textLeft;
        currY += tagHeight + tagGapY;
        currentRenderRow++;
      }

      if (t.type === 'genre') {
        ctx.fillStyle = 'rgba(88, 28, 135, 0.55)';
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.55)';
        ctx.lineWidth = 1;
        roundRect(ctx, tagX, currY, tagW, tagHeight, 4);
        ctx.fill();
        roundRect(ctx, tagX, currY, tagW, tagHeight, 4);
        ctx.stroke();

        ctx.fillStyle = '#e9d5ff';
        ctx.fillText(tagText, tagX + 8, currY + 14.5);
      } else {
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        roundRect(ctx, tagX, currY, tagW, tagHeight, 4);
        ctx.fill();
        roundRect(ctx, tagX, currY, tagW, tagHeight, 4);
        ctx.stroke();

        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(tagText, tagX + 8, currY + 14.5);
      }

      tagX += tagW + tagGapX;
    }

    if (hasRemainingTags) {
      const moreText = `+${displayTags.length - visibleTagsCount} more`;
      const moreW = ctx.measureText(moreText).width + 14;
      if (tagX + moreW <= textRight) {
        ctx.fillStyle = '#1e293b';
        ctx.strokeStyle = '#475569';
        roundRect(ctx, tagX, currY, moreW, tagHeight, 4);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(moreText, tagX + 7, currY + 14.5);
      }
    }

    currY += tagHeight + 12;
  } else {
    currY += 8;
  }

  // --- FOOTER BRANDING ---
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(textLeft, currY);
  ctx.lineTo(textRight, currY);
  ctx.stroke();
  currY += 14;

  // Left: HORNET ARCHIVE
  ctx.fillStyle = '#64748b';
  ctx.font = '10px monospace';
  ctx.fillText('HORNET ARCHIVE', textLeft, currY);

  // Right: ancient hornet
  const rightText = 'ancient hornet';
  const rightW = ctx.measureText(rightText).width;
  ctx.fillStyle = '#c084fc';
  ctx.fillText(rightText, textRight - rightW, currY);

  return canvas.toDataURL('image/png');
}

// -------------------------------------------------------------
// 2. REVIEW PHOTO SLIDE CANVAS RENDERER (Pure Wall of Text)
// -------------------------------------------------------------

/**
 * Renders a single clean review slide photo with:
 * - Dynamic adaptive height & typography tailored to the review text
 * - Luxury obsidian frame & gold corner accents
 * - Header banner with cover thumbnail, title, creator, part indicator, and large score emblem
 * - Highly readable text typography with dynamic line wrapping and balanced vertical distribution
 * - Archival footer branding with slide pagination dots
 */
async function renderReviewSlideToCanvas(
  item: MediaItem,
  slideLines: string[],
  partNumber: number,
  totalParts: number,
  reviewData: { body: string; pros: string[]; cons: string[] },
  slideHeight: number = 1350
): Promise<string> {
  const width = 1080;
  const height = slideHeight;
  const frameMargin = 22;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // --- OUTER MATTING & LUXURY FRAME ---
  const outerGrad = ctx.createLinearGradient(0, 0, width, height);
  outerGrad.addColorStop(0, '#030712');
  outerGrad.addColorStop(0.5, '#070b16');
  outerGrad.addColorStop(1, '#02050e');
  ctx.fillStyle = outerGrad;
  roundRect(ctx, 0, 0, width, height, 18);
  ctx.fill();

  // Precision Outer Border
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#1e293b';
  roundRect(ctx, 1, 1, width - 2, height - 2, 18);
  ctx.stroke();

  // Inset Metallic Accent Frame
  const insetMargin = 8;
  const frameGrad = ctx.createLinearGradient(0, 0, width, height);
  frameGrad.addColorStop(0, 'rgba(168, 85, 247, 0.4)');
  frameGrad.addColorStop(0.5, 'rgba(234, 179, 8, 0.45)');
  frameGrad.addColorStop(1, 'rgba(99, 102, 241, 0.4)');
  ctx.lineWidth = 1;
  ctx.strokeStyle = frameGrad;
  roundRect(
    ctx,
    insetMargin,
    insetMargin,
    width - insetMargin * 2,
    height - insetMargin * 2,
    14
  );
  ctx.stroke();

  // Corner Bracket Notches & Dots
  drawCornerBrackets(
    ctx,
    insetMargin + 5,
    insetMargin + 5,
    width - (insetMargin + 5) * 2,
    height - (insetMargin + 5) * 2,
    18,
    'rgba(234, 179, 8, 0.75)'
  );

  // Micro Corner Dots
  const dotOffset = insetMargin + 9;
  ctx.fillStyle = 'rgba(234, 179, 8, 0.9)';
  [
    [dotOffset, dotOffset],
    [width - dotOffset, dotOffset],
    [dotOffset, height - dotOffset],
    [width - dotOffset, height - dotOffset],
  ].forEach(([dx, dy]) => {
    ctx.beginPath();
    ctx.arc(dx, dy, 2, 0, Math.PI * 2);
    ctx.fill();
  });

  // --- INNER CARD CONTAINER ---
  const innerX = frameMargin;
  const innerY = frameMargin;
  const innerW = width - frameMargin * 2;
  const innerH = height - frameMargin * 2;

  ctx.fillStyle = '#080c15';
  roundRect(ctx, innerX, innerY, innerW, innerH, 12);
  ctx.fill();

  ctx.lineWidth = 1;
  ctx.strokeStyle = '#1e293b';
  roundRect(ctx, innerX + 0.5, innerY + 0.5, innerW - 1, innerH - 1, 12);
  ctx.stroke();

  // --- HEADER SECTION ---
  const headerHeight = 175;
  const headerGrad = ctx.createLinearGradient(0, innerY, 0, innerY + headerHeight);
  headerGrad.addColorStop(0, '#0c1222');
  headerGrad.addColorStop(1, '#080c15');
  ctx.fillStyle = headerGrad;
  roundRect(ctx, innerX, innerY, innerW, headerHeight, 12);
  ctx.fill();

  // Header bottom border
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(innerX + 24, innerY + headerHeight);
  ctx.lineTo(innerX + innerW - 24, innerY + headerHeight);
  ctx.stroke();

  // Load Cover Thumbnail
  const thumbX = innerX + 28;
  const thumbY = innerY + 22;
  const thumbW = 90;
  const thumbH = 130;

  ctx.fillStyle = '#0f172a';
  roundRect(ctx, thumbX, thumbY, thumbW, thumbH, 8);
  ctx.fill();

  const coverImg = await loadCanvasImage(item.cover || '');
  if (coverImg) {
    ctx.save();
    roundRect(ctx, thumbX, thumbY, thumbW, thumbH, 8);
    ctx.clip();
    const hRatio = thumbW / coverImg.naturalWidth;
    const vRatio = thumbH / coverImg.naturalHeight;
    const ratio = Math.max(hRatio, vRatio);
    const shiftX = (thumbW - coverImg.naturalWidth * ratio) / 2;
    const shiftY = (thumbH - coverImg.naturalHeight * ratio) / 2;
    ctx.drawImage(
      coverImg,
      0,
      0,
      coverImg.naturalWidth,
      coverImg.naturalHeight,
      thumbX + shiftX,
      thumbY + shiftY,
      coverImg.naturalWidth * ratio,
      coverImg.naturalHeight * ratio
    );
    ctx.restore();
  }
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  roundRect(ctx, thumbX, thumbY, thumbW, thumbH, 8);
  ctx.stroke();

  // Media Details beside thumbnail
  const metaLeft = thumbX + thumbW + 22;
  const metaMaxW = innerW - (thumbW + 22 + 40) - 260; // Leave space for score & part pill

  // Format & Year pill string
  const formatStr = (
    item.isCustomCategory
      ? item.customCategoryName || item.mediaFormat
      : item.mediaFormat || 'MEDIA'
  ).toUpperCase();
  const yearStr = extractReleaseYear(item.releaseDate) || item.releaseDate?.slice(0, 4) || '';
  const originStr = item.countryOfOrigin ? ` • ${item.countryOfOrigin.toUpperCase()}` : '';
  const headerMetaStr = `${formatStr}${yearStr ? ` • ${yearStr}` : ''}${originStr}`;

  ctx.fillStyle = '#c084fc';
  ctx.font = 'bold 12px monospace';
  ctx.fillText(headerMetaStr, metaLeft, thumbY + 22);

  // Title
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  const titleLines = wrapText(ctx, item.title || 'Untitled', metaMaxW);
  let titleY = thumbY + 54;
  titleLines.slice(0, 2).forEach((tl) => {
    ctx.fillText(tl, metaLeft, titleY);
    titleY += 32;
  });

  // Creator
  ctx.fillStyle = '#94a3b8';
  ctx.font = '13px monospace';
  ctx.fillText(`BY ${(item.mainCreator || 'UNKNOWN').toUpperCase()}`, metaLeft, titleY + 6);

  // Top-Right of Header: Part Indicator Pill & Score Emblem
  const rightColX = innerX + innerW - 28;

  // Part Pill
  const partText = totalParts === 1 ? 'FULL CRITIQUE' : `PART ${partNumber} OF ${totalParts}`;
  ctx.font = 'bold 12px monospace';
  const partW = ctx.measureText(partText).width + 24;
  const partH = 30;
  const partX = rightColX - partW;
  const partY = thumbY + 6;

  ctx.fillStyle = 'rgba(245, 158, 11, 0.14)';
  roundRect(ctx, partX, partY, partW, partH, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.5)';
  ctx.lineWidth = 1;
  roundRect(ctx, partX, partY, partW, partH, 6);
  ctx.stroke();

  ctx.fillStyle = '#fbbf24';
  ctx.fillText(partText, partX + 12, partY + 19.5);

  // Large Score Emblem
  const score = typeof item.hornetScore === 'number' ? item.hornetScore : 0;
  const scoreColor =
    score >= 9 ? '#10b981' : score >= 7 ? '#a855f7' : score >= 5 ? '#f59e0b' : '#ef4444';

  const scoreText = `${score}`;
  ctx.font = 'bold 32px monospace';
  const scoreNumW = ctx.measureText(scoreText).width;
  ctx.font = 'bold 14px monospace';
  const scoreSubW = ctx.measureText('/10').width;

  const scoreEmblemH = 50;
  const scoreEmblemW = scoreNumW + scoreSubW + 48;
  const scoreEmblemX = rightColX - scoreEmblemW;
  const scoreEmblemY = partY + partH + 14;

  ctx.shadowColor = scoreColor;
  ctx.shadowBlur = 14;
  ctx.fillStyle = 'rgba(2, 6, 23, 0.95)';
  roundRect(ctx, scoreEmblemX, scoreEmblemY, scoreEmblemW, scoreEmblemH, 25);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = scoreColor;
  ctx.lineWidth = 1.5;
  roundRect(ctx, scoreEmblemX, scoreEmblemY, scoreEmblemW, scoreEmblemH, 25);
  ctx.stroke();

  // Dot indicator
  ctx.fillStyle = scoreColor;
  ctx.beginPath();
  ctx.arc(scoreEmblemX + 18, scoreEmblemY + 25, 6, 0, Math.PI * 2);
  ctx.fill();

  // Number
  ctx.fillStyle = scoreColor;
  ctx.font = 'bold 32px monospace';
  ctx.fillText(scoreText, scoreEmblemX + 30, scoreEmblemY + 36);

  // Denominator
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 14px monospace';
  ctx.fillText('/10', scoreEmblemX + 30 + scoreNumW + 3, scoreEmblemY + 33);

  // --- REVIEW BODY SECTION ---
  const bodyX = innerX + 48;
  const bodyW = innerW - 96;
  let bodyY = innerY + headerHeight + 32;
  const footerReservedY = innerY + innerH - 60;

  // Section Header Label
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 11px monospace';
  const sectionLabel =
    totalParts === 1
      ? 'ARCHIVAL CRITIQUE & REVIEW'
      : partNumber === 1
      ? `ARCHIVAL CRITIQUE (PART 1 OF ${totalParts})`
      : partNumber === totalParts
      ? `CONCLUDING CRITIQUE (PART ${partNumber} OF ${totalParts})`
      : `CRITIQUE CONTINUED (PART ${partNumber} OF ${totalParts})`;
  ctx.fillText(sectionLabel, bodyX, bodyY);

  // Subtle divider line
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(bodyX + ctx.measureText(sectionLabel).width + 16, bodyY - 4);
  ctx.lineTo(bodyX + bodyW, bodyY - 4);
  ctx.stroke();

  bodyY += 26;

  // Render lines as a continuous, dense, unbroken wall of text
  const fontSize = 22;
  const lineHeight = 33;
  ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif`;
  ctx.fillStyle = '#f1f5f9';

  let currTextY = bodyY;
  for (let i = 0; i < slideLines.length; i++) {
    ctx.fillText(slideLines[i], bodyX, currTextY);
    currTextY += lineHeight;
  }

  // On Final Slide: Render Highlights (Pros/Cons) if present
  const hasProsCons = reviewData.pros.length > 0 || reviewData.cons.length > 0;
  if (partNumber === totalParts && hasProsCons) {
    const highlightsH = 100;
    const bottomBoxY = footerReservedY - highlightsH - 8;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
    roundRect(ctx, bodyX, bottomBoxY, bodyW, highlightsH, 8);
    ctx.fill();
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    roundRect(ctx, bodyX, bottomBoxY, bodyW, highlightsH, 8);
    ctx.stroke();

    const colW = Math.floor((bodyW - 40) / 2);

    // Pros Column
    if (reviewData.pros.length > 0) {
      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('KEY HIGHLIGHTS', bodyX + 16, bottomBoxY + 24);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '14px -apple-system, sans-serif';
      let pY = bottomBoxY + 46;
      reviewData.pros.slice(0, 2).forEach((pro) => {
        ctx.fillText(`✓  ${pro}`, bodyX + 16, pY);
        pY += 22;
      });
    }

    // Cons Column
    if (reviewData.cons.length > 0) {
      const consX = bodyX + colW + 24;
      ctx.fillStyle = '#f43f5e';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('CRITICAL NOTES', consX, bottomBoxY + 24);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '14px -apple-system, sans-serif';
      let cY = bottomBoxY + 46;
      reviewData.cons.slice(0, 2).forEach((con) => {
        ctx.fillText(`•  ${con}`, consX, cY);
        cY += 22;
      });
    }
  }

  // --- FOOTER SECTION ---
  const footerY = innerY + innerH - 46;

  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(innerX + 32, footerY - 14);
  ctx.lineTo(innerX + innerW - 32, footerY - 14);
  ctx.stroke();

  // Left: HORNET ARCHIVE
  ctx.fillStyle = '#64748b';
  ctx.font = '11px monospace';
  ctx.fillText('HORNET ARCHIVE • CRITICAL REVIEW', innerX + 32, footerY + 8);

  // Center: Slide Dots Indicator (dots if <= 8, clean label otherwise)
  let dotsStr = '';
  if (totalParts <= 8) {
    for (let d = 1; d <= totalParts; d++) {
      dotsStr += d === partNumber ? ' ●' : ' ○';
    }
  }
  const slideIndicator = dotsStr
    ? `SLIDE ${partNumber} OF ${totalParts} ${dotsStr}`
    : `SLIDE ${partNumber} OF ${totalParts}`;
  ctx.font = 'bold 12px monospace';
  const slideW = ctx.measureText(slideIndicator).width;
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(slideIndicator, (width - slideW) / 2, footerY + 8);

  // Right: ancient hornet
  const brandText = 'ancient hornet';
  ctx.font = '12px monospace';
  const brandW = ctx.measureText(brandText).width;
  ctx.fillStyle = '#c084fc';
  ctx.fillText(brandText, innerX + innerW - 32 - brandW, footerY + 8);

  return canvas.toDataURL('image/png');
}

// -------------------------------------------------------------
// 3. MAIN DOWNLOAD ORCHESTRATOR
// -------------------------------------------------------------

/**
 * Downloads a complete visual media suite for the entry:
 * 1. The primary collectible card PNG with enlarged score & clean tags
 * 2. The critical review formatted as an absolute wall of text across as many images as needed
 */
export async function downloadMediaItemCardPng(
  _cardElement: HTMLElement | null,
  item: MediaItem,
  onProgress?: DownloadProgressCallback
): Promise<boolean> {
  if (!item) return false;

  try {
    // Stage 1: Collectible Card
    onProgress?.('Card...');
    const cardDataUrl = await renderCardToCanvas(item);
    if (cardDataUrl && cardDataUrl.length > 200) {
      const cardFilename = getSafeFileName(item, 'card');
      await triggerDownload(cardDataUrl, cardFilename);
    }

    // Stage 2: Review Photos (downloads as many images as needed to display 100% of the review)
    const reviewData = getFullReviewText(item);
    const { slideLineChunks, totalParts } = prepareReviewSlides(reviewData);

    const slideHeight = 1350;

    for (let i = 0; i < totalParts; i++) {
      onProgress?.(totalParts === 1 ? 'Review photo...' : `Photo ${i + 1} of ${totalParts}...`);
      const slideDataUrl = await renderReviewSlideToCanvas(
        item,
        slideLineChunks[i],
        i + 1,
        totalParts,
        reviewData,
        slideHeight
      );
      if (slideDataUrl && slideDataUrl.length > 200) {
        const slideFilename = getSafeFileName(item, `review_part_${i + 1}_of_${totalParts}`);
        await triggerDownload(slideDataUrl, slideFilename);
      }
    }

    onProgress?.('Saved!');
    return true;
  } catch (err) {
    console.error('Failed to render and download card & review photos:', err);
  }
  return false;
}
