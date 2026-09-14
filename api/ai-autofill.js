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
        title: { type: Type.STRING, description: 'Title of the media piece' },
        mainCreator: { type: Type.STRING, description: 'Main creator, director, author, developer studio, or band' },
        mainCreatorCategory: {
          type: Type.STRING,
          description: 'Role or category of main creator, e.g. Game Designer, Director, Author, Band, Studio, Composer, Mangaka'
        },
        creatorNation: { type: Type.STRING, description: 'Nationality or country of the creator if mentioned' },
        otherCreatorsStr: { type: Type.STRING, description: 'Other creators, co-developers, cast, or contributors as comma-separated string' },
        mediaFormat: {
          type: Type.STRING,
          description: 'Format: Video Game, Film, Book, Music Album, TV Show, Anime, Manga, Comic/Manga Series, or custom name'
        },
        isCustomCategory: { type: Type.BOOLEAN, description: 'Whether this format is a custom category' },
        customCategoryName: { type: Type.STRING, description: 'Custom category name if isCustomCategory is true' },
        releaseDate: { type: Type.STRING, description: 'Release date in YYYY-MM-DD or YYYY format' },
        countryOfOrigin: { type: Type.STRING, description: 'Country of origin / production' },
        originalLanguage: { type: Type.STRING, description: 'Original language of the work' },
        consumedVersion: { type: Type.STRING, description: 'Specific platform or edition consumed (e.g. PC, PS5, Vinyl, Director Cut, Paperback)' },
        genresStr: { type: Type.STRING, description: 'Main genres separated by commas (e.g. Action RPG, Psychological Horror)' },
        genreStyleTags: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Specific style tags, tropes, aesthetics, gameplay or structural traits'
        },
        philosophicalTags: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Underlying philosophical, moral, or thematic concepts'
        },
        summaryPlot: { type: Type.STRING, description: 'Brief 1-3 sentence summary of the premise, setting, or core plot' },
        hornetScore: { type: Type.NUMBER, description: 'Score from 1 to 10 (integer). If specified in text like 9/10 or Score: 8, extract it; otherwise estimate from review tone.' },
        hornetVerdict: { type: Type.STRING, description: 'A punchy 1-2 sentence core verdict or takeaway summary' },
        review: {
          type: Type.STRING,
          description: 'The FULL complete linear long review article! Extract the entire review text, retaining all paragraphs, critiques, technical breakdowns, artistic evaluations, and prose. Do not summarize or cut short.'
        },
        similarMediaStr: { type: Type.STRING, description: 'Comma-separated titles of similar or related media works mentioned' },
        mediumInfluencesStr: { type: Type.STRING, description: 'Comma-separated titles or creators of inspirations and influences mentioned' },
        cover: { type: Type.STRING, description: 'Cover image URL if an image link was provided in the input text' }
      },
      required: ['title', 'mainCreator', 'mediaFormat', 'hornetScore', 'review']
    };

    const prompt = `You are an expert intelligent media archivist and reviewer assistant.
The user provided a mixed, unorganized text dump containing information about a media work (video game, movie, book, music album, anime, manga, etc.) together with its in-depth review.

Your task is to carefully filter, extract, and place every piece of information into the designated fields.

CRITICAL INSTRUCTIONS:
1. "review": Extract the entire long-form review text verbatim or as fully as possible. Preserve paragraph breaks. Do NOT summarize or shorten the review! The review is the centerpiece.
2. "hornetVerdict": A 1-2 sentence core conclusion/verdict. If there is a summary line or verdict sentence in the review, extract it here.
3. "hornetScore": Extract the rating (1 to 10). If the text mentions "8/10", "Score: 9", "Grade: 7", "Rating: 10", extract that number. If none is found, estimate an appropriate score between 1 and 10 based on the review tone.
4. "summaryPlot": Extract or generate a clean 1-3 sentence synopsis of the premise/plot (separate from the critical review).
5. "mediaFormat": Determine the appropriate medium format (e.g. Video Game, Film, Book, Music Album, TV Show, Anime, Manga).
6. "genresStr": Extract the key genres as a comma-separated list.
7. "genreStyleTags": Extract specific stylistic, mechanical, or aesthetic tags (e.g. pixel art, boss rush, slow burn, cyberpunk).
8. "philosophicalTags": Extract philosophical / existential themes (e.g. nihilism, identity, determinism, guilt).
9. "mainCreator" & "mainCreatorCategory": The primary director, developer studio, author, band, or creator, with their role category.
10. "releaseDate", "countryOfOrigin", "originalLanguage", "consumedVersion": Extract if mentioned.

INPUT TEXT:
${rawText}`;

    const candidateModels = [
      'gemini-3.7-flash',
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-flash-latest',
    ];

    let response = null;
    let lastError = null;

    for (const modelName of candidateModels) {
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
        console.warn(`Model ${modelName} failed for autofill:`, err.message);
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error('No response from AI model');
    }

    const data = JSON.parse(response.text);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('AI Autofill Error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to process AI autofill',
    });
  }
}
