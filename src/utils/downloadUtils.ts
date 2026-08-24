import { MediaItem } from '../types';
import { extractReleaseYear } from './dateUtils';
import { formatImageUrl, getProxyImageUrl } from './imageUtils';

/**
 * Generates a clean, safe filename for the exported PNG card.
 */
function getSafeFileName(item: MediaItem): string {
  const safeTitle = (item.title || 'media_card')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'card';

  const year = extractReleaseYear(item.releaseDate);
  const yearSuffix = year ? `_${year}` : '';
  const scoreSuffix = typeof item.hornetScore === 'number' ? `_${item.hornetScore}pts` : '';

  return `${safeTitle}${yearSuffix}${scoreSuffix}.png`;
}

/**
 * Triggers a browser download for a data URL.
 */
function triggerDownload(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Helper to wrap text into lines fitting within a max width.
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = words[0] || '';

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
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
  ctx.lineTo(x + radius, y + height);
  ctx.arcTo(x, y + height, x, y + height - radius, radius);
  ctx.lineTo(x, y + radius);
  ctx.arcTo(x, y, x + radius, y, radius);
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
 * Render a complete, framed collectible card to Canvas.
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
  const creatorHeight = 20;

  // Tags calculation
  const genres = item.genres || [];
  const styleTags = item.genreStyleTags || [];
  const philosophicalTags = item.philosophicalTags || [];

  interface TagItem {
    text: string;
    type: 'genre' | 'style' | 'philo';
  }

  const allTags: TagItem[] = [
    ...genres.map((t) => ({ text: t, type: 'genre' as const })),
    ...styleTags.map((t) => ({ text: t, type: 'style' as const })),
    ...philosophicalTags.map((t) => ({ text: t, type: 'philo' as const })),
  ];

  dctx.font = 'bold 11px monospace';
  const tagHeight = 22;
  const tagGapX = 6;
  const tagGapY = 6;

  let currentTagX = 0;
  let tagRowsCount = allTags.length > 0 ? 1 : 0;

  allTags.forEach((t) => {
    const tagW = dctx.measureText(t.text).width + 16;
    if (currentTagX + tagW > contentWidth && currentTagX > 0) {
      tagRowsCount++;
      currentTagX = tagW + tagGapX;
    } else {
      currentTagX += tagW + tagGapX;
    }
  });

  const tagsBlockHeight = tagRowsCount > 0 ? tagRowsCount * tagHeight + (tagRowsCount - 1) * tagGapY : 0;

  // Calculate EXACT canvas height with proportional padding
  const bodyContentHeight =
    14 + // top padding below cover
    titleBlockHeight +
    creatorHeight +
    (tagsBlockHeight > 0 ? 14 + tagsBlockHeight : 0) +
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
  // Deep metallic dark gradient for the outer frame matting
  const outerGrad = ctx.createLinearGradient(0, 0, width, totalHeight);
  outerGrad.addColorStop(0, '#030712'); // darkest obsidian
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

  // Inset Accent Frame (Subtle gold / purple metallic hairline)
  const insetMargin = 5;
  const frameGrad = ctx.createLinearGradient(0, 0, width, totalHeight);
  frameGrad.addColorStop(0, 'rgba(168, 85, 247, 0.45)'); // purple-500
  frameGrad.addColorStop(0.5, 'rgba(234, 179, 8, 0.4)'); // amber-500
  frameGrad.addColorStop(1, 'rgba(99, 102, 241, 0.45)'); // indigo-500
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
    'rgba(234, 179, 8, 0.7)' // Gold accent brackets
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

  // Inner Card Background
  ctx.fillStyle = '#090d16'; // slate-950
  roundRect(ctx, cardX, cardY, innerCardWidth, innerCardHeight, 10);
  ctx.fill();

  // Inner Card Border
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

  // Placeholder cover background
  ctx.fillStyle = '#020617';
  ctx.fillRect(cardX, cardY, innerCardWidth, coverHeight);

  // Load and draw cover image
  const rawCover = item.cover || '';
  if (rawCover) {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      const imgSrc = getProxyImageUrl(rawCover) || formatImageUrl(rawCover);

      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = imgSrc;
        if (img.complete) resolve();
      });

      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        const hRatio = innerCardWidth / img.naturalWidth;
        const vRatio = coverHeight / img.naturalHeight;
        const ratio = Math.max(hRatio, vRatio);
        const centerShiftX = (innerCardWidth - img.naturalWidth * ratio) / 2;
        const centerShiftY = (coverHeight - img.naturalHeight * ratio) / 2;

        ctx.drawImage(
          img,
          0,
          0,
          img.naturalWidth,
          img.naturalHeight,
          cardX + centerShiftX,
          cardY + centerShiftY,
          img.naturalWidth * ratio,
          img.naturalHeight * ratio
        );
      }
    } catch {
      // Continue if image fails
    }
  }

  // Cover bottom gradient overlay
  const coverGrad = ctx.createLinearGradient(
    0,
    cardY + coverHeight - 100,
    0,
    cardY + coverHeight
  );
  coverGrad.addColorStop(0, 'rgba(9, 13, 22, 0)');
  coverGrad.addColorStop(0.7, 'rgba(9, 13, 22, 0.7)');
  coverGrad.addColorStop(1, 'rgba(9, 13, 22, 1)');
  ctx.fillStyle = coverGrad;
  ctx.fillRect(cardX, cardY + coverHeight - 100, innerCardWidth, 100);

  // Subtle top shadow
  const topGrad = ctx.createLinearGradient(0, cardY, 0, cardY + 50);
  topGrad.addColorStop(0, 'rgba(2, 6, 23, 0.6)');
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

  ctx.font = 'bold 11px monospace';
  const formatTextW = ctx.measureText(formatName).width;
  const formatPillW = formatTextW + 16;
  const formatPillH = 24;
  const badgeY = cardY + 12;
  const badgeLeftX = cardX + 12;

  ctx.fillStyle = 'rgba(2, 6, 23, 0.92)';
  roundRect(ctx, badgeLeftX, badgeY, formatPillW, formatPillH, 5);
  ctx.fill();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  roundRect(ctx, badgeLeftX, badgeY, formatPillW, formatPillH, 5);
  ctx.stroke();

  ctx.fillStyle = item.isCustomCategory ? '#fbbf24' : '#c084fc';
  ctx.fillText(formatName, badgeLeftX + 8, badgeY + 16);

  // OST Badge if applicable
  if (item.mediaFormat === 'Music Album' && item.isSoundtrack) {
    const ostX = badgeLeftX + formatPillW + 6;
    ctx.fillStyle = 'rgba(88, 28, 135, 0.9)';
    roundRect(ctx, ostX, badgeY, 44, formatPillH, 5);
    ctx.fill();
    ctx.strokeStyle = '#9333ea';
    roundRect(ctx, ostX, badgeY, 44, formatPillH, 5);
    ctx.stroke();
    ctx.fillStyle = '#f3e8ff';
    ctx.fillText('OST', ostX + 11, badgeY + 16);
  }

  // Top-Right: Hornet Score Badge
  const score = typeof item.hornetScore === 'number' ? item.hornetScore : 0;
  const scoreColor =
    score >= 9 ? '#10b981' : score >= 7 ? '#a855f7' : score >= 5 ? '#f59e0b' : '#ef4444';

  ctx.font = 'bold 13px monospace';
  const scoreMainText = `${score}`;
  const scoreSubText = '/10';
  const scoreMainW = ctx.measureText(scoreMainText).width;
  ctx.font = '10px monospace';
  const scoreSubW = ctx.measureText(scoreSubText).width;
  const scoreBadgeW = scoreMainW + scoreSubW + 20;
  const scoreBadgeH = 25;
  const scoreBadgeX = cardX + innerCardWidth - 12 - scoreBadgeW;

  ctx.fillStyle = 'rgba(2, 6, 23, 0.94)';
  roundRect(ctx, scoreBadgeX, badgeY, scoreBadgeW, scoreBadgeH, 12);
  ctx.fill();
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  roundRect(ctx, scoreBadgeX, badgeY, scoreBadgeW, scoreBadgeH, 12);
  ctx.stroke();

  // Score Dot
  ctx.fillStyle = scoreColor;
  ctx.beginPath();
  ctx.arc(scoreBadgeX + 10, badgeY + 12.5, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // Score Number
  ctx.fillStyle = scoreColor;
  ctx.font = 'bold 13px monospace';
  ctx.fillText(scoreMainText, scoreBadgeX + 17, badgeY + 17);

  // Score Denominator /10
  ctx.fillStyle = '#64748b';
  ctx.font = '10px monospace';
  ctx.fillText(scoreSubText, scoreBadgeX + 17 + scoreMainW, badgeY + 17);

  // --- BOTTOM OF COVER BADGES (Year & Origin) ---
  const parsedYear = extractReleaseYear(item.releaseDate);
  const yearStr = parsedYear
    ? String(parsedYear)
    : item.releaseDate
    ? item.releaseDate.substring(0, 4)
    : '';

  let bottomBadgeX = cardX + 12;
  const bottomBadgeY = cardY + coverHeight - 30;

  if (yearStr) {
    ctx.font = '10px monospace';
    const yW = ctx.measureText(yearStr).width + 14;
    ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
    roundRect(ctx, bottomBadgeX, bottomBadgeY, yW, 19, 4);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    roundRect(ctx, bottomBadgeX, bottomBadgeY, yW, 19, 4);
    ctx.stroke();

    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(yearStr, bottomBadgeX + 7, bottomBadgeY + 13);
    bottomBadgeX += yW + 6;
  }

  if (item.countryOfOrigin) {
    ctx.font = '10px monospace';
    const cText = item.countryOfOrigin;
    const cW = ctx.measureText(cText).width + 14;
    ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
    roundRect(ctx, bottomBadgeX, bottomBadgeY, cW, 19, 4);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    roundRect(ctx, bottomBadgeX, bottomBadgeY, cW, 19, 4);
    ctx.stroke();

    ctx.fillStyle = '#d8b4fe';
    ctx.fillText(cText, bottomBadgeX + 7, bottomBadgeY + 13);
    bottomBadgeX += cW + 6;
  }

  if (item.consumedVersion) {
    ctx.font = '10px monospace';
    const vText = item.consumedVersion;
    const vW = ctx.measureText(vText).width + 14;
    const vX = cardX + innerCardWidth - 12 - vW;
    ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
    roundRect(ctx, vX, bottomBadgeY, vW, 19, 4);
    ctx.fill();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    roundRect(ctx, vX, bottomBadgeY, vW, 19, 4);
    ctx.stroke();

    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(vText, vX + 7, bottomBadgeY + 13);
  }

  // --- CARD BODY DETAILS ---
  let currY = cardY + coverHeight + 20;
  const textLeft = cardX + padding;
  const textRight = cardX + innerCardWidth - padding;

  // Title
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 17px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace';
  titleLines.forEach((line) => {
    ctx.fillText(line, textLeft, currY);
    currY += 23;
  });

  // Creator
  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px monospace';
  const creatorStr = `BY ${(item.mainCreator || 'UNKNOWN').toUpperCase()}`;
  ctx.fillText(creatorStr, textLeft, currY);
  currY += 14;

  // Tags
  if (allTags.length > 0) {
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(textLeft, currY);
    ctx.lineTo(textRight, currY);
    ctx.stroke();
    currY += 12;

    let tagX = textLeft;
    ctx.font = 'bold 10px monospace';

    allTags.forEach((t) => {
      const tagText = t.text;
      const tagW = ctx.measureText(tagText).width + 14;

      if (tagX + tagW > textRight && tagX > textLeft) {
        tagX = textLeft;
        currY += tagHeight + tagGapY;
      }

      if (t.type === 'genre') {
        ctx.fillStyle = 'rgba(88, 28, 135, 0.6)';
        ctx.strokeStyle = 'rgba(147, 51, 234, 0.6)';
        ctx.lineWidth = 1;
        roundRect(ctx, tagX, currY, tagW, tagHeight, 4);
        ctx.fill();
        roundRect(ctx, tagX, currY, tagW, tagHeight, 4);
        ctx.stroke();

        ctx.fillStyle = '#e9d5ff';
        ctx.fillText(tagText, tagX + 7, currY + 15);
      } else if (t.type === 'style') {
        ctx.fillStyle = '#0f172a';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        roundRect(ctx, tagX, currY, tagW, tagHeight, 4);
        ctx.fill();
        roundRect(ctx, tagX, currY, tagW, tagHeight, 4);
        ctx.stroke();

        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(tagText, tagX + 7, currY + 15);
      } else {
        ctx.fillStyle = 'rgba(30, 27, 75, 0.7)';
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)';
        ctx.lineWidth = 1;
        roundRect(ctx, tagX, currY, tagW, tagHeight, 4);
        ctx.fill();
        roundRect(ctx, tagX, currY, tagW, tagHeight, 4);
        ctx.stroke();

        ctx.fillStyle = '#c7d2fe';
        ctx.fillText(tagText, tagX + 7, currY + 15);
      }

      tagX += tagW + tagGapX;
    });

    currY += tagHeight + 12;
  } else {
    currY += 6;
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

  // Right: ancient hornet (no date)
  const rightText = 'ancient hornet';
  const rightW = ctx.measureText(rightText).width;
  ctx.fillStyle = '#c084fc'; // purple-400 accent for ancient hornet
  ctx.fillText(rightText, textRight - rightW, currY);

  return canvas.toDataURL('image/png');
}

/**
 * Downloads a visual media card as a PNG image with a single click.
 * Uses high-fidelity Canvas rendering with adaptive height, custom collectible framing, and zero blank spaces.
 */
export async function downloadMediaItemCardPng(
  _cardElement: HTMLElement | null,
  item: MediaItem
): Promise<boolean> {
  if (!item) return false;
  const filename = getSafeFileName(item);

  try {
    const canvasDataUrl = await renderCardToCanvas(item);
    if (canvasDataUrl && canvasDataUrl.length > 200) {
      triggerDownload(canvasDataUrl, filename);
      return true;
    }
  } catch (err) {
    console.error('Failed to render and download card PNG:', err);
  }
  return false;
}
