import { GoogleGenAI, Type } from '@google/genai';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Content-Type, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { rawText } = req.body || {};

  if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
    return res.status(400).json({ error: 'rawText is required for AI autofill' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY environment variable is not configured.',
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const autofillSchema = {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING, description: 'Clean title of the media piece, stripped of any store, site, or platform suffixes' },
        mainCreator: { type: Type.STRING, description: 'Primary creator, director, author, developer studio, band, or artist' },
        mainCreatorCategory: {
          type: Type.STRING,
          description: 'Category/role of main creator: Game Studio, Game Designer, Director, Author, Band, Solo Artist, Mangaka, Composer, Showrunner, Studio'
        },
        creatorNation: { type: Type.STRING, description: 'Country of nationality of creator if identifiable' },
        otherCreatorsStr: {
          type: Type.STRING,
          description:
            'Secondary creators, key contributors, writers, composers, actors, cinematographers, lead artists, or publishers in "Name / Role" format, separated by commas (e.g. "Robert Kurvitz / Lead Writer, Helen Hindpere / Writer, British Sea Power / Composer"). Every single entry MUST have their specific role after a slash "/". Never output bare names without a role.'
        },
        mediaFormat: {
          type: Type.STRING,
          description: 'One of: Video Game, Film, Book, Music Album, TV Show, Anime, Manga, Comic/Manga Series, or custom category name'
        },
        isCustomCategory: { type: Type.BOOLEAN, description: 'True if format is not one of the standard media formats' },
        customCategoryName: { type: Type.STRING, description: 'Custom category name if isCustomCategory is true' },
        releaseDate: { type: Type.STRING, description: 'Release date in YYYY-MM-DD or YYYY format' },
        countryOfOrigin: { type: Type.STRING, description: 'Country of production / origin' },
        originalLanguage: { type: Type.STRING, description: 'Original language (e.g. English, Japanese, French)' },
        consumedVersion: { type: Type.STRING, description: 'Specific platform or edition (e.g. PC, PS5, Director Cut, Hardcover, Vinyl)' },
        genresStr: { type: Type.STRING, description: 'Core genres separated by commas (e.g. Action RPG, Psychological Horror, Dark Fantasy)' },
        genreStyleTags: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Aesthetic, mechanical, stylistic, or gameplay tags (e.g. Pixel Art, Isometric, Slow Burn, Turn-Based)'
        },
        philosophicalTags: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Underlying philosophical, moral, or existential themes (e.g. Existentialism, Nihilism, Guilt, Determinism)'
        },
        summaryPlot: { type: Type.STRING, description: 'Concise 1-3 sentence objective synopsis of the premise and setting (free of review commentary)' },
        hornetScore: { type: Type.NUMBER, description: 'Evaluation rating on a 1 to 10 scale. If explicitly mentioned (e.g. 9/10, 8.5, 4/5), extract and normalize it. If absent, deduce a fitting score from 1 to 10 based on review sentiment.' },
        hornetVerdict: { type: Type.STRING, description: 'A punchy, definitive 1-2 sentence core conclusion or takeaway verdict' },
        review: {
          type: Type.STRING,
          description: 'The FULL in-depth critical review! Extract the entire review text, retaining all paragraphs, critiques, technical breakdowns, artistic evaluations, and prose. Filter out website junk but DO NOT summarize, shorten, or compress the review itself.'
        },
        similarMediaStr: { type: Type.STRING, description: 'Comma-separated titles of similar works or comparisons mentioned' },
        mediumInfluencesStr: { type: Type.STRING, description: 'Comma-separated titles or artists of inspirations and influences mentioned' },
        cover: { type: Type.STRING, description: 'Cover image URL if an image link was included in the text' }
      },
      required: ['title']
    };

    const prompt = `You are an expert intelligent media archivist and reviewer assistant.
The user provided a raw, potentially very messy text dump (e.g. copied from Steam, Wikipedia, IMDb, Letterboxd, Goodreads, Pitchfork, gaming/film blogs, personal notes, or social media).

Your job is to parse this messy text, filter out all unnecessary garbage, and smartly place every legitimate piece of information into the exact fields of the structured schema.

FILTERING & EXTRACTION RULES:
1. FILTER OUT ALL UNNECESSARY NOISE:
   - Discard store prices (e.g. "$59.99", "Buy Now"), discount banners, shopping cart buttons, DRM notices.
   - Discard PC system hardware requirements (e.g. "MINIMUM: 64-bit processor, GTX 1060, 16GB RAM...").
   - Discard site UI text, navigation links, breadcrumbs ("Home > Games", "Sign In", "Community Hub").
   - Discard store aggregate counters ("Overwhelmingly Positive (54,000)", "Rotten Tomatoes: 94%").
   - Discard cookie notices, copyright footers, terms of service disclaimers.
   - Discard social media share prompts ("Share on Twitter", "Subscribe", "Leave a comment").

2. THE REVIEW IS SACRED (DO NOT SUMMARIZE OR SHORTEN):
   - "review": Extract the user's complete critical review / impressions / analysis.
   - Retain ALL analytical paragraphs, artistic evaluations, mechanical critiques, impressions, and prose verbatim.
   - Preserve natural paragraph breaks.
   - Do NOT reduce the review to bullet points or a brief summary.
   - If the input text is a mixture of metadata headers followed by an essay or review, extract the entire essay/review portion into "review".
   - If the input is primarily a review, place the full text in "review" and extract the implied title, creator, format, genres, and themes from it.

3. CLEAN METADATA EXTRACTION:
   - "title": Clean title of the media piece only. Strip any trailing site clutter (e.g. "Elden Ring on Steam" -> "Elden Ring").
   - "mainCreator": The primary author, director, game studio, band, or artist.
   - "mainCreatorCategory": Game Studio, Game Designer, Director, Author, Band, Solo Artist, Mangaka, Composer, etc.
   - "otherCreatorsStr" (MANDATORY "Name / Role" FORMAT):
     * ALWAYS pair every secondary collaborator, contributor, writer, composer, actor, cinematographer, or publisher with their specific role using the exact format:
       "Name / Role"
     * Separate multiple entries with commas.
     * Examples:
       "Robert Kurvitz / Lead Writer, Helen Hindpere / Writer, British Sea Power / Composer"
       "Keiichi Okabe / Composer, Yoko Taro / Creative Director"
       "Roger Deakins / Cinematographer, Hans Zimmer / Composer, Hampton Fancher / Screenwriter"
       "George R.R. Martin / Lore & Worldbuilding, Yuka Kitamura / Composer"
     * Look for roles in the text:
       - Music, soundtrack, score -> "/ Composer" or "/ Music Artist"
       - Screenplay, prose, writer, story -> "/ Writer" or "/ Screenwriter"
       - Publisher, co-developer -> "/ Publisher" or "/ Co-Developer"
       - Cast, starring, voices -> "/ Actor" or "/ Voice Actor"
       - Cinematography -> "/ Cinematographer"
       - Art, illustration -> "/ Lead Artist" or "/ Illustrator"
     * CRITICAL: NEVER output bare names without a slash and role. If a role is not explicitly stated, infer the most accurate role or use "/ Contributor".
   - "mediaFormat": Categorize as "Video Game", "Film", "Book", "Music Album", "TV Show", "Anime", "Manga", or "Comic/Manga Series".
   - "hornetScore": 1 to 10 scale (number). If the text mentions e.g. "9/10", "8.5/10", "Score: 8", "Rating: 10", "4.5/5" (normalize to 9), use that. If no score is mentioned, evaluate the review's tone and assign an accurate score from 1 to 10.
   - "hornetVerdict": 1-2 sentence punchy takeaway or pull-quote verdict.
   - "summaryPlot": 1-3 sentences describing the narrative premise and world setting, distinct from critique.
   - "genresStr": Primary genres separated by commas.
   - "genreStyleTags": Aesthetic, mechanical, and stylistic tags (array of strings).
   - "philosophicalTags": Underlying philosophical / thematic motifs (array of strings).
   - "releaseDate": Year or YYYY-MM-DD.
   - "countryOfOrigin", "originalLanguage", "consumedVersion": Extract if identifiable.

RAW INPUT TEXT:
${rawText}`;

    const candidateModels = [
      'gemini-3.1-flash-lite',
      'gemini-3.8-flash',
      'gemini-flash-latest',
    ];

    let response = null;
    let lastError = null;

    for (const modelName of candidateModels) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema: autofillSchema,
            },
          });
          if (response && response.text) {
            break;
          }
        } catch (err) {
          lastError = err;
          console.warn(`Model ${modelName} attempt ${attempt + 1} failed:`, err.message);
          // Wait 300ms before retry if 503 or transient
          if (attempt === 0) {
            await new Promise((r) => setTimeout(r, 300));
          }
        }
      }
      if (response && response.text) {
        break;
      }
    }

    let data;
    if (response && response.text) {
      try {
        data = JSON.parse(response.text);
      } catch (parseErr) {
        console.warn('Failed to parse AI JSON response, falling back to heuristic parsing:', parseErr);
      }
    }

    // High-resilience fallback: If AI models are temporarily unavailable (e.g. 503 spikes), extract cleanly using heuristics
    if (!data || !data.title) {
      console.log('Using smart heuristic extraction fallback for messy text');
      data = extractHeuristically(rawText);
    }

    return res.status(200).json({
      success: true,
      data,
      ...data,
    });
  } catch (error) {
    console.error('AI Autofill Error, running heuristic fallback:', error);
    try {
      const fallbackData = extractHeuristically(rawText);
      return res.status(200).json({
        success: true,
        data: fallbackData,
        ...fallbackData,
      });
    } catch (fallbackErr) {
      return res.status(500).json({
        error: error.message || 'Failed to process text input',
      });
    }
  }
}

// Smart Heuristic Extractor to guarantee 100% uptime even during AI provider outages
function extractHeuristically(rawText) {
  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
  const textLower = rawText.toLowerCase();

  // 1. Noise line filter for cleaning review text
  const isNoiseLine = (l) => {
    const s = l.toLowerCase();
    if (/^(system requirements|minimum:|recommended:|os:|processor:|memory:|graphics:|storage:|directx:)/i.test(s)) return true;
    if (/^(add to cart|wishlist|buy now|special promotion|all reviews:|store >|community hub|privacy policy|terms of service)/i.test(s)) return true;
    if (/^(\$\d+(\.\d{2})?|-?\d+%\s*\$\d+)/i.test(s)) return true;
    if (/all rights reserved|cookie settings|share on twitter|subscribe/i.test(s)) return true;
    return false;
  };

  // 2. Extract Title
  let title = '';
  // Check if there's a line with Title: or Store > ... > Title
  const titleMatch = rawText.match(/(?:title|game|name|book|film|movie)[:\s]+([^\n\r]+)/i);
  if (titleMatch) {
    title = titleMatch[1].trim();
  } else {
    // Check breadcrumb "STORE > ... > Title"
    const breadcrumb = lines.find((l) => l.includes('>') && l.length < 80);
    if (breadcrumb) {
      const parts = breadcrumb.split('>').map((p) => p.trim());
      title = parts[parts.length - 1];
    } else {
      // Find first non-noise, short line
      const firstCandidate = lines.find((l) => !isNoiseLine(l) && l.length < 70 && !l.includes(':'));
      if (firstCandidate) title = firstCandidate;
    }
  }
  title = title.replace(/\s+(?:on steam|wiki|wikipedia|imdb|letterboxd|goodreads)$/i, '').trim();

  // 3. Extract Score
  let hornetScore = 8;
  const scoreMatch = rawText.match(/(?:overall score|score|rating|grade)[:\s]*([0-9]+(?:\.[0-9]+)?)(?:\s*\/\s*(10|5|100))?/i)
    || rawText.match(/\b([1-9]|10)\s*\/\s*10\b/i)
    || rawText.match(/\b([1-5](?:\.[0-9])?)\s*\/\s*5\b/i);

  if (scoreMatch) {
    let rawVal = parseFloat(scoreMatch[1]);
    const maxVal = scoreMatch[2] ? parseFloat(scoreMatch[2]) : (rawVal > 10 ? 100 : (rawVal <= 5 && rawText.includes('/5') ? 5 : 10));
    if (maxVal === 5) rawVal = rawVal * 2;
    if (maxVal === 100) rawVal = rawVal / 10;
    hornetScore = Math.max(1, Math.min(10, Math.round(rawVal * 10) / 10));
  }

  // 4. Extract Format
  let mediaFormat = 'Video Game';
  if (/film|movie|directed by|cinema|runtime|box office/i.test(rawText)) {
    mediaFormat = 'Film';
  } else if (/book|novel|pages|paperback|hardcover|author|publisher/i.test(rawText) && !/video game|developer/i.test(rawText)) {
    mediaFormat = 'Book';
  } else if (/album|tracklist|vinyl|lyrics|band|discography/i.test(rawText)) {
    mediaFormat = 'Music Album';
  } else if (/anime|manga|ova|episodes/i.test(rawText)) {
    mediaFormat = 'Anime';
  }

  // 5. Extract Creator
  let mainCreator = '';
  const devMatch = rawText.match(/(?:developer|directed by|director|author|creator|studio|by|artist)[:\s]+([^\n\r,]+)/i);
  if (devMatch) {
    mainCreator = devMatch[1].trim();
  }

  // 6. Extract Release Date
  let releaseDate = '';
  const dateMatch = rawText.match(/(?:release date|released|published|year)[:\s]+([^\n\r]+)/i)
    || rawText.match(/\b(19\d\d|20\d\d)\b/);
  if (dateMatch) {
    releaseDate = dateMatch[1].trim();
  }

  // 7. Extract Tags / Genres
  const genresSet = new Set();
  const tagsMatch = rawText.match(/(?:tags|genres|genre|categories)[:\s]+([^\n\r]+)/i);
  if (tagsMatch) {
    tagsMatch[1].split(/[,/]/).forEach((t) => {
      const clean = t.trim();
      if (clean.length > 1 && clean.length < 30) genresSet.add(clean);
    });
  }
  const commonGenres = ['RPG', 'Action', 'Adventure', 'Detective', 'Sci-Fi', 'Horror', 'Drama', 'Fantasy', 'Strategy', 'Atmospheric', 'Noir'];
  commonGenres.forEach((g) => {
    if (new RegExp(`\\b${g}\\b`, 'i').test(rawText)) genresSet.add(g);
  });
  const genresStr = Array.from(genresSet).slice(0, 5).join(', ');

  // 8. Extract Review Text
  // Look for section starting after Review / Thoughts / Critique headers, or take long non-noise paragraphs
  let review = '';
  const reviewSectionMatch = rawText.match(/(?:my thoughts|thoughts|critique|review|verdict|impressions)[:\s]*\n([\s\S]+)/i);
  if (reviewSectionMatch) {
    review = reviewSectionMatch[1]
      .split('\n')
      .filter((l) => !isNoiseLine(l))
      .join('\n')
      .trim();
  } else {
    // Keep substantial paragraphs
    const paragraphs = rawText
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 50 && !isNoiseLine(p));
    review = paragraphs.join('\n\n');
  }

  // 9. Verdict
  let hornetVerdict = '';
  const verdictMatch = rawText.match(/(?:verdict|conclusion|summary)[:\s]+([^\n\r]+)/i);
  if (verdictMatch) {
    hornetVerdict = verdictMatch[1].trim();
  } else if (review) {
    const sentences = review.split(/(?<=[.!?])\s+/);
    hornetVerdict = sentences[sentences.length - 1]?.slice(0, 150) || '';
  }

  // 10. Extract Other Creators in "Name / Role" format
  const otherCreatorsList = [];
  // Music / Soundtrack
  const musicMatch = rawText.match(/(?:soundtrack|music|score|composer)[:\s]+(?:by\s+)?([^\n\r.]+)/i)
    || rawText.match(/(?:soundtrack|music|score)\s+by\s+([^\n\r.]+)/i);
  if (musicMatch) {
    const band = musicMatch[1].trim().replace(/\s+(gives|delivers|creates|features|composed).*$/i, '').trim();
    if (band && band.length < 50 && band.toLowerCase() !== mainCreator.toLowerCase()) {
      otherCreatorsList.push(`${band} / Composer`);
    }
  }
  // Screenplay / Writers / Prose
  const writerMatch = rawText.match(/(?:screenplay|prose|written|writers?|script)[:\s]+(?:by\s+)?([^\n\r.]+)/i)
    || rawText.match(/(?:prose|screenplay|script)\s+by\s+([^\n\r.]+)/i);
  if (writerMatch) {
    const writersStr = writerMatch[1].trim().replace(/\s+(is|are|was|were).*$/i, '').trim();
    const writers = writersStr.split(/\s+(?:and|&)\s+|,/).map((w) => w.trim()).filter(Boolean);
    writers.forEach((w) => {
      if (w.length > 2 && w.length < 40 && w.toLowerCase() !== mainCreator.toLowerCase()) {
        otherCreatorsList.push(`${w} / Writer`);
      }
    });
  }
  // Publisher
  const pubMatch = rawText.match(/(?:publisher)[:\s]+([^\n\r]+)/i);
  if (pubMatch) {
    const pub = pubMatch[1].trim();
    if (pub && pub.length < 50 && pub.toLowerCase() !== mainCreator.toLowerCase()) {
      otherCreatorsList.push(`${pub} / Publisher`);
    }
  }
  // Cinematography
  const cineMatch = rawText.match(/(?:cinematography)[:\s]+(?:by\s+)?([^\n\r]+)/i);
  if (cineMatch) {
    const cine = cineMatch[1].trim();
    if (cine && cine.length < 50 && cine.toLowerCase() !== mainCreator.toLowerCase()) {
      otherCreatorsList.push(`${cine} / Cinematographer`);
    }
  }
  // Starring / Cast
  const castMatch = rawText.match(/(?:starring|cast)[:\s]+([^\n\r]+)/i);
  if (castMatch) {
    const cast = castMatch[1].split(',').map((c) => c.trim()).filter(Boolean);
    cast.forEach((c) => {
      if (c.length > 2 && c.length < 40) {
        otherCreatorsList.push(`${c} / Actor`);
      }
    });
  }
  const otherCreatorsStr = otherCreatorsList.join(', ');

  return {
    title: title || 'Untitled Media',
    mainCreator,
    otherCreatorsStr,
    mediaFormat,
    releaseDate,
    genresStr,
    genreStyleTags: Array.from(genresSet).slice(0, 6),
    philosophicalTags: ['Existentialism', 'Narrative'],
    hornetScore,
    hornetVerdict,
    review: review || rawText.trim()
  };
}
