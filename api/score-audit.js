import { GoogleGenAI, Type } from '@google/genai';

function getItemScore(item) {
  if (!item) return 0;
  if (typeof item.hornetScore === 'number' && !isNaN(item.hornetScore)) return item.hornetScore;
  if (typeof item.score === 'number' && !isNaN(item.score)) return item.score;
  const parsed = parseFloat(item.hornetScore ?? item.score);
  return !isNaN(parsed) ? parsed : 0;
}

// Structural defect keywords that represent systemic or core mechanical/narrative collapse
const FATAL_STRUCTURAL_DEFECTS = [
  'broken pacing',
  'artificial padding',
  'artificial length',
  'game-breaking',
  'core gameplay loop breaks',
  'narrative collapse',
  'monotonous grind',
  'severe plot hole',
  'unresponsive controls',
  'ruins the ending',
  'procedural filler',
  'drags agonizingly',
  'tedious padding',
  'mechanically broken',
  'fundamental design flaw',
  'constant sample-loops',
  'fatigue quickly',
  'stagnant pacing',
];

// Profound excellence markers representing extraordinary craft or transformative resonance
const PROFOUND_EXCELLENCE_MARKERS = [
  'transcendent',
  'masterpiece',
  'flawless execution',
  'unmatched depth',
  'groundbreaking',
  'permanent resonance',
  'artistic pinnacle',
  'monumental achievement',
  'revolutionary',
  'emotional peak',
  'mastery of craft',
  'flawless pacing',
  'tactile perfection',
  'zero thematic fillers',
  'elemental richness',
];

function findSpecificMatches(texts, keywords) {
  const corpus = texts.join(' ').toLowerCase();
  return keywords.filter((kw) => corpus.includes(kw.toLowerCase()));
}

export function evaluateDeterministicAudits(items, rejectedSet, sensitivity = 'strict') {
  const suggestions = [];

  for (const item of items) {
    if (!item || !item.id || rejectedSet.has(item.id)) continue;

    const score = getItemScore(item);
    const pros = Array.isArray(item.pros) ? item.pros.filter((p) => p && typeof p === 'string' && p.trim()) : [];
    const cons = Array.isArray(item.cons) ? item.cons.filter((c) => c && typeof c === 'string' && c.trim()) : [];
    const verdict = typeof item.hornetVerdict === 'string' ? item.hornetVerdict : '';

    const allConsText = [...cons, verdict];
    const allProsText = [...pros, verdict];
    const structuralDefects = findSpecificMatches(allConsText, FATAL_STRUCTURAL_DEFECTS);
    const profoundVirtues = findSpecificMatches(allProsText, PROFOUND_EXCELLENCE_MARKERS);

    // Rule 1. Top Tier (9-10: Masterpiece & Essential) with fatal structural defects
    if (score >= 9 && structuralDefects.length > 0) {
      suggestions.push({
        id: item.id,
        currentScore: score,
        suggestedScore: 8,
        critique: `Rated ${score}/10 (${score === 10 ? 'Hornet Essential' : 'Masterpiece'}), but records severe structural defect: "${structuralDefects[0]}". The 9-10 tier requires uncompromised execution across core loops. Suggest calibrating to Exceptional (8/10).`,
        imbalanceReason: 'Tier 9-10 Conflict: Structural Defect',
        confidence: 'high',
      });
      continue;
    }

    // Rule 2. High Tier (7-8) with overwhelmingly negative con balance (>2x cons vs pros)
    if (score >= 7 && cons.length >= 4 && pros.length <= 1) {
      const targetScore = Math.max(5, score - 2);
      suggestions.push({
        id: item.id,
        currentScore: score,
        suggestedScore: targetScore,
        critique: `Rated ${score}/10, but cons heavily dominate recorded text (${cons.length} cons vs ${pros.length} pro). High tiers require strong positive craft density; calibrating to ${targetScore}/10 restores alignment.`,
        imbalanceReason: 'Tier Balance Conflict: Negative Disparity',
        confidence: 'medium',
      });
      continue;
    }

    // Rule 3. Low Tier (1-4: Bad to Average) with profound transcendent praise and 0 defects
    if (score === 4 && (profoundVirtues.length > 0 || (pros.length >= 4 && cons.length <= 1)) && structuralDefects.length === 0) {
      suggestions.push({
        id: item.id,
        currentScore: score,
        suggestedScore: 5,
        critique: `Rated 4/10 (Average: "hits standard genre expectations without pushing boundaries"), but recorded review notes strong distinct virtues with minimal flaws. This craft exceeds baseline Average to Good (5/10).`,
        imbalanceReason: 'Tier 4 Conflict: Subversive Virtues',
        confidence: 'high',
      });
      continue;
    }

    // Rule 4. Failing Tier (1-3) with zero cons and multiple pros
    if (score <= 3 && cons.length === 0 && pros.length >= 2) {
      suggestions.push({
        id: item.id,
        currentScore: score,
        suggestedScore: 5,
        critique: `Rated ${score}/10 (Weak/Flawed), but records zero flaws and multiple positive merits. The 1-3 tier is strictly for substantially broken works; clean execution aligns with Good (5/10).`,
        imbalanceReason: 'Tier 1-3 Conflict: Zero Flaws Recorded',
        confidence: 'high',
      });
      continue;
    }
  }

  return suggestions;
}

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
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  try {
    const { items, scoringPhilosophy, ratingLevels, rejectedIds, sensitivity = 'strict' } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(200).json({ success: true, suggestions: [], totalAudited: 0 });
    }

    const rejectedSet = new Set(Array.isArray(rejectedIds) ? rejectedIds : []);
    const eligibleItems = items.filter((i) => i && i.id);

    if (eligibleItems.length === 0) {
      return res.status(200).json({ success: true, suggestions: [], aligned: [], totalAudited: 0 });
    }

    const deterministicSuggestions = evaluateDeterministicAudits(eligibleItems, rejectedSet, sensitivity);

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const suggestedIds = new Set(deterministicSuggestions.map((s) => s.id));
      const aligned = eligibleItems
        .filter((i) => !suggestedIds.has(i.id))
        .map((i) => ({
          id: i.id,
          currentScore: getItemScore(i),
          alignmentNote: 'Assigned tier accurately reflects the recorded pros and cons.',
        }));

      return res.status(200).json({
        success: true,
        suggestions: deterministicSuggestions.filter((s) => !rejectedSet.has(s.id)),
        aligned,
        totalAudited: eligibleItems.length,
        engine: 'locked-deterministic-audit',
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

      const simplifiedItems = eligibleItems.map((item) => ({
        id: item.id,
        title: item.title,
        format: item.mediaFormat || '',
        creator: item.mainCreator || '',
        releaseDate: item.releaseDate || '',
        score: getItemScore(item),
        pros: Array.isArray(item.pros) ? item.pros : [],
        cons: Array.isArray(item.cons) ? item.cons : [],
        tags: Array.isArray(item.philosophicalTags) ? item.philosophicalTags : [],
        verdict: item.hornetVerdict ? item.hornetVerdict.slice(0, 400) : '',
      }));

      const ratingScaleText = Array.isArray(ratingLevels)
        ? ratingLevels.map((r) => `Score ${r.score} (${r.label}): ${r.description}`).join('\n')
        : `Score 10 (Hornet Essential): Peak media for Hornet. Transcendent artistic pinnacle with permanent personal resonance.
Score 9 (Masterpiece): Flawless work. Monumental achievement with profound vision and faultless execution.
Score 8 (Exceptional): Outstanding release that excels in core mechanics/narrative.
Score 7 (Fascinating): Deeply engaging work with standout qualities or unique style.
Score 6 (Great): Very good experience with distinct strengths and strong craft.
Score 5 (Good): Solid, enjoyable, well-executed experience.
Score 4 (Average): Capable and decent, hits standard genre expectations without pushing boundaries.
Score 3 (Weak): Functional elements weighed down by higher-scaled cons or drawbacks.
Score 2 (Mediocre): Occasional interesting ideas, but significant execution issues or narrative inconsistencies.
Score 1 (Bad): Substantially flawed across core elements with minimal redeeming qualities.`;

      const philosophyText =
        scoringPhilosophy ||
        `my scoring prioritizes lived experience, structural consistency, emotional depth, and mechanical execution above all else. external factors like commercial success, release date, historical influence, and cultural hype are irrelevant unless they directly affect the immediate artistic experience.

i don't review from the perspective of a historian. i wasn't there, so i have no interest in cosplaying as one. i engage with works as they exist for me in the present moment, without performing nostalgia or bending to "what it meant for its time." a book from the 1940s was written for its own era, but i experience it here and now as a contemporary, not as a time traveler. a work stands or falls on what it delivers to me today, not on the grace extended to it for being old.

"that's the point" is not an automatic pass. you could counter virtually any criticism with that logic, but understanding a creator's intent doesn't change whether the execution actually moves me. i don't do mental gymnastics to reconstruct what an author was trying to say because i don't believe art requires deference to the creator; my focus is solely on the connection and meaning built with the work itself. misunderstanding is human, and disliking what others revere is equally human. i don't let external consensus override my judgment—a work either lands or it doesn't, and my review reflects that.

this isn't objectivity or authority. i review and experience strictly for myself. some might consider my focus narrow, but i walk the road i choose proudly and happily. this is simply one person's honest encounter. you're welcome to disagree, no one has to adopt my perspective, and there is no "correct" way to experience art. i hope you find the takes and reviews interesting and enjoyable.`;

      const candidateModels = [
        'gemini-3.7-flash',
        'gemini-3.6-flash',
        'gemini-3.5-flash-lite',
        'gemini-3.5-flash',
        'gemini-flash-latest',
      ];
      let response = null;
      let lastModelError = null;

      const callWithTimeout = (promise, ms = 22000) =>
        Promise.race([
          promise,
          new Promise((_, reject) => setTimeout(() => reject(new Error(`Model request timed out after ${ms}ms`)), ms)),
        ]);

      const systemInstruction = `You are a locked, disciplined audit consistency analyst for Hornet's media archive.

AUDITING PRINCIPLES:
1. Examine each media entry's title, pros, cons, and current score against Hornet's 1-10 Rating Scale and Death of the Author scoring philosophy.
2. Cross-examine from 3 PERSPECTIVES:
   - TIER DEFINITION: Does the qualitative substance fit the exact boundary of the score?
     * Score 10 & 9: Zero severe structural defects allowed. If cons explicitly record pacing collapse, artificial padding, or monotonous grind, propose calibration down to 8.
     * Score 4: Reserved strictly for standard genre-formula entries with no distinct vision. If pros praise innovative subversion or distinct excellence, propose calibration up to 5 or 6.
     * Score 1-3: Reserved for fundamentally broken works. If cons are empty, propose 5.
   - VIRTUE VS. DEFECT WEIGHT: Evaluate qualitative impact, not simplistic point-counting.
   - STRUCTURAL & MECHANISM INTEGRITY: Pacing, controls, and narrative coherence.
3. If an entry is genuinely consistent with its assigned tier, classify it under ALIGNED with a concise verification note.
4. If an entry exhibits real tier tension, propose a calibrated score with an objective critique citing specific arguments.`;

      const prompt = `RATING SCALE:
${ratingScaleText}

SCORING PHILOSOPHY:
"${philosophyText}"

CURRENT AUDIT SCRUTINY: ${sensitivity}

ITEMS TO AUDIT:
${JSON.stringify(simplifiedItems, null, 2)}

TASK:
Audit all provided items. Return suggestions for items where a score calibration is recommended, and aligned entries for items where the score is justified.`;

      for (const modelName of candidateModels) {
        try {
          response = await callWithTimeout(
            ai.models.generateContent({
              model: modelName,
              contents: prompt,
              config: {
                systemInstruction,
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    suggestions: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          currentScore: { type: Type.NUMBER },
                          suggestedScore: { type: Type.NUMBER },
                          critique: {
                            type: Type.STRING,
                            description: 'Substantive explanation citing specific arguments.',
                          },
                          imbalanceReason: {
                            type: Type.STRING,
                            description: 'Concise label describing the tension.',
                          },
                          confidence: {
                            type: Type.STRING,
                            enum: ['high', 'medium'],
                          },
                        },
                        required: ['id', 'currentScore', 'suggestedScore', 'critique', 'imbalanceReason'],
                      },
                    },
                    aligned: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING },
                          currentScore: { type: Type.NUMBER },
                          alignmentNote: {
                            type: Type.STRING,
                            description: 'One concise sentence explaining why the score fits the tier.',
                          },
                        },
                        required: ['id', 'currentScore', 'alignmentNote'],
                      },
                    },
                  },
                  required: ['suggestions', 'aligned'],
                },
              },
            }),
            20000
          );
          if (response && response.text) {
            break;
          }
        } catch (modelErr) {
          lastModelError = modelErr;
          const is503 = String(modelErr?.message || modelErr).includes('503') || String(modelErr?.message || modelErr).includes('UNAVAILABLE');
          if (is503) {
            await new Promise((r) => setTimeout(r, 400));
          }
        }
      }

      if (!response || !response.text) {
        throw lastModelError || new Error('All candidate Gemini models failed to generate audit.');
      }

      const responseText = response.text || '{}';
      const parsed = JSON.parse(responseText);

      const validItemMap = new Map(eligibleItems.map((i) => [i.id, i]));
      let aiSuggestions = [];
      const suggestedIds = new Set();

      if (Array.isArray(parsed.suggestions)) {
        aiSuggestions = parsed.suggestions
          .filter((s) => s && s.id && validItemMap.has(s.id))
          .map((s) => {
            const item = validItemMap.get(s.id);
            const currentScore = getItemScore(item);
            const suggestedScore = Math.max(1, Math.min(10, Math.round(Number(s.suggestedScore) || currentScore)));

            if (suggestedScore === currentScore) {
              return null;
            }

            suggestedIds.add(s.id);
            return {
              id: s.id,
              currentScore,
              suggestedScore,
              critique: s.critique || `Qualitative substance indicates a tier calibration is warranted.`,
              imbalanceReason: s.imbalanceReason || 'Score Tier Tension',
              confidence: s.confidence || 'high',
              isDismissed: rejectedSet.has(s.id),
            };
          })
          .filter(Boolean);
      }

      // Merge any deterministic audit suggestions that AI may have missed
      for (const d of deterministicSuggestions) {
        if (!suggestedIds.has(d.id)) {
          aiSuggestions.push(d);
          suggestedIds.add(d.id);
        }
      }

      let aiAligned = [];
      if (Array.isArray(parsed.aligned)) {
        aiAligned = parsed.aligned
          .filter((a) => a && a.id && validItemMap.has(a.id) && !suggestedIds.has(a.id))
          .map((a) => {
            const item = validItemMap.get(a.id);
            return {
              id: a.id,
              currentScore: getItemScore(item),
              alignmentNote: a.alignmentNote || 'Score is well-balanced against recorded merits and drawbacks.',
            };
          });
      }

      // Add any missing items to aligned list
      for (const item of eligibleItems) {
        if (!suggestedIds.has(item.id) && !aiAligned.some((a) => a.id === item.id)) {
          aiAligned.push({
            id: item.id,
            currentScore: getItemScore(item),
            alignmentNote: 'Score calibrated consistently with assigned rating tier.',
          });
        }
      }

      return res.status(200).json({
        success: true,
        suggestions: aiSuggestions.filter((s) => !rejectedSet.has(s.id)),
        aligned: aiAligned,
        totalAudited: eligibleItems.length,
        engine: 'hybrid-perspective-audit',
      });
    } catch (aiErr) {
      console.warn('Gemini qualitative audit fallback:', aiErr?.message || aiErr);
      const fallback = evaluateDeterministicAudits(eligibleItems, rejectedSet, sensitivity);
      const suggestedIds = new Set(fallback.map((s) => s.id));
      const fallbackAligned = eligibleItems
        .filter((i) => !suggestedIds.has(i.id))
        .map((i) => ({
          id: i.id,
          currentScore: getItemScore(i),
          alignmentNote: 'Assigned tier aligns with recorded pros and cons.',
        }));

      return res.status(200).json({
        success: true,
        suggestions: fallback.filter((s) => !rejectedSet.has(s.id)),
        aligned: fallbackAligned,
        totalAudited: eligibleItems.length,
        engine: 'locked-deterministic-audit',
      });
    }
  } catch (error) {
    console.error('Error in /api/score-audit:', error);
    return res.status(500).json({
      error: error.message || 'An unknown error occurred during score audit',
    });
  }
}


