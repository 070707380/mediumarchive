import { GoogleGenAI, Type } from '@google/genai';

// In-memory server-side cache and in-flight request de-duplicator
const sortCache = new Map(); // key -> { timestamp: number, data: any }
const inFlightRequests = new Map(); // key -> Promise<any>
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
let rateLimitedUntil = 0; // timestamp until which we avoid hammering Gemini if 429 received

function getItemScore(item) {
  if (!item) return 0;
  if (typeof item.hornetScore === 'number' && !isNaN(item.hornetScore)) return item.hornetScore;
  if (typeof item.score === 'number' && !isNaN(item.score)) return item.score;
  const parsed = parseFloat(item.hornetScore ?? item.score);
  return !isNaN(parsed) ? parsed : 0;
}

function calculateProsConsStats(item) {
  const prosCount = Array.isArray(item?.pros) ? item.pros.length : 0;
  const consCount = Array.isArray(item?.cons) ? item.cons.length : 0;
  const netPros = prosCount - consCount;
  const total = prosCount + consCount;
  const ratio = total > 0 ? prosCount / total : 0.5;
  const metric = netPros * 1000 + ratio * 100;
  return { prosCount, consCount, netPros, ratio, total, metric };
}

function compareByQuality(a, b) {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;

  const scoreA = getItemScore(a);
  const scoreB = getItemScore(b);
  const scoreDiff = scoreB - scoreA;
  if (Math.abs(scoreDiff) > 0.001) {
    return scoreDiff;
  }
  const statsA = calculateProsConsStats(a);
  const statsB = calculateProsConsStats(b);
  const prosConsDiff = statsB.metric - statsA.metric;
  if (Math.abs(prosConsDiff) > 0.001) {
    return prosConsDiff;
  }
  const philoA = Array.isArray(a.philosophicalTags) ? a.philosophicalTags.length : (Array.isArray(a.philoTags) ? a.philoTags.length : 0);
  const philoB = Array.isArray(b.philosophicalTags) ? b.philosophicalTags.length : (Array.isArray(b.philoTags) ? b.philoTags.length : 0);
  const philoDiff = philoB - philoA;
  if (philoDiff !== 0) {
    return philoDiff;
  }
  return (a.title || '').localeCompare(b.title || '');
}

function computeCacheKey(items, scoringPhilosophy) {
  const itemSignature = items
    .slice(0, 100)
    .map((i) => `${i.id || ''}:${i.hornetScore || 0}:${(i.pros || []).length}:${(i.cons || []).length}`)
    .join(',');
  return `${items.length}_${itemSignature}_${(scoringPhilosophy || '').slice(0, 50)}`;
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
    const { items, scoringPhilosophy } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items provided for sorting' });
    }

    // Baseline deterministic quality sort
    const goldenSorted = [...items].sort(compareByQuality);
    const fallbackSort = (reason) => ({
      success: true,
      sortedIds: goldenSorted.map((i) => i.id),
      rationale: reason || 'Items sorted from best to worst based on score, pros/cons balance, and philosophical depth.',
    });

    const cacheKey = computeCacheKey(items, scoringPhilosophy);

    // 1. Check in-memory cache
    const cachedEntry = sortCache.get(cacheKey);
    const now = Date.now();
    if (cachedEntry && now - cachedEntry.timestamp < CACHE_TTL_MS) {
      return res.status(200).json(cachedEntry.data);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const result = fallbackSort();
      sortCache.set(cacheKey, { timestamp: now, data: result });
      return res.status(200).json(result);
    }

    // If temporarily rate limited, return fallback without spamming Gemini
    if (now < rateLimitedUntil) {
      const result = fallbackSort();
      return res.status(200).json(result);
    }

    // 2. Check if identical request is currently in-flight
    if (inFlightRequests.has(cacheKey)) {
      try {
        const sharedResult = await inFlightRequests.get(cacheKey);
        return res.status(200).json(sharedResult);
      } catch {
        return res.status(200).json(fallbackSort());
      }
    }

    // 3. Initiate sorting execution promise
    const executionPromise = (async () => {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        const validItems = items.filter((i) => i && i.id);
        const simplifiedItems = validItems.map((item) => ({
          id: item.id,
          title: item.title,
          creator: item.mainCreator || '',
          format: item.mediaFormat || '',
          score: item.hornetScore || 0,
          pros: item.pros || [],
          cons: item.cons || [],
          philoTags: item.philosophicalTags || [],
          version: item.consumedVersion || '',
          note: item.reviewNote ? item.reviewNote.slice(0, 200) : '',
        }));

        const philosophyText =
          scoringPhilosophy ||
          `My scoring prioritizes lived experience, structural consistency, emotional depth and mechanical execution above all else. External factors such as commercial success, release date, historical influence and cultural hype are not considered unless they directly affect the artistic or interactive experience itself.

I don't review from the perspective of a historian. I wasn't there so I believe I can't cosplay to be. I engage with works as they exist for me, in the present moment without performing nostalgia or bending to "what it meant for its time." I'm aware that a book from the 1940s was written for people living in the 1940s but I'm not them, I'm here now and if I have the access to a work then I experience it as a contemporary, not as a time traveler. A work stands or falls on what it delivers to me, today, not on the grace I extend to it for being old.

I don't accept "that's the point" as a defense, you could really counter any criticism with that move so it's kinda lazy to me and I am almost always aware of the context and point too, it just doesn't effect my experience so I ignore it. I also don't do mental gymnastics to reconstruct what the creator was trying to say because I don't personally believe art is primarily communication and I don't owe the artist my deference, I focus on my own connection and my own meaning to the art. Misunderstanding is human, disliking what others revere is human. I just don't let externals to override my judgment. A work either lands or it doesn't and my review reflects that.

This isn't objectivity nor authority, I'll never claim to be an authority because I review and experience for only myself, I might be narrow intellectually to the most people but I walk the road I chose proudly and happily. It's just one person's honest encounter and you're welcome to disagree but I won't defend my right to feel what I feel and no one has to adopt my perspective, I just don't believe there is a "correct" way to experience art. I hope you find my takes and reviews interesting and enjoyable.`;

        const prompt = `You are an automated archive sorting evaluator. Your task is to rank the provided media items from BEST to WORST.

ENFORCE THIS SCORING PHILOSOPHY:
"${philosophyText}"

CRITICAL RULES:
1. STRICT SCORE PARTITION: Hornet Score is the dominant primary ranking factor (10 is best, down to 1). A higher score ALWAYS ranks above a lower score (e.g. 10 > 9 > 8 > 7 > 6 > 5 > 4 > 3 > 2 > 1). A 4/10 can NEVER be placed above a 5/10.
2. Intra-Tier Ranking: For items with the EXACT SAME score (e.g. two 7/10 items), evaluate the quality, balance, and net depth of PROS vs CONS, emotional resonance, structural mechanism, and philosophical tags to decide which item comes first within that tier.
3. Completely disregard historical significance, nostalgia, mainstream popularity, release date context, or creator intent.
4. You MUST include every single item ID in your output. Return the exact ordered array of item IDs from BEST (rank 1) to WORST.

Input Items:
${JSON.stringify(simplifiedItems, null, 2)}`;

        const candidateModels = [
          'gemini-3.7-flash',
          'gemini-3.6-flash',
          'gemini-3.5-flash-lite',
          'gemini-3.5-flash',
          'gemini-flash-latest',
        ];
        let response = null;

        const callWithTimeout = (promise, ms = 20000) =>
          Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error(`Model request timed out after ${ms}ms`)), ms)),
          ]);

        for (const modelName of candidateModels) {
          try {
            response = await callWithTimeout(
              ai.models.generateContent({
                model: modelName,
                contents: prompt,
                config: {
                  responseMimeType: 'application/json',
                  responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                      sortedIds: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: 'List of item IDs ordered from best to worst.',
                      },
                      rationale: {
                        type: Type.STRING,
                        description: 'Brief rationale summary.',
                      },
                    },
                    required: ['sortedIds', 'rationale'],
                  },
                },
              }),
              16000
            );
            if (response && response.text) {
              break;
            }
          } catch (modelErr) {
            const is503 = String(modelErr?.message || modelErr).includes('503') || String(modelErr?.message || modelErr).includes('UNAVAILABLE');
            if (is503) {
              // Brief jitter backoff before next candidate model
              await new Promise((r) => setTimeout(r, 400));
            }
          }
        }

        if (!response || !response.text) {
          throw new Error('All candidate Gemini models failed in ai-sort');
        }

        const responseText = response.text || '{}';
        const parsedResult = JSON.parse(responseText);

        if (Array.isArray(parsedResult.sortedIds) && parsedResult.sortedIds.length > 0) {
          const itemMap = new Map(validItems.map((i) => [i.id, i]));
          const validReturnedIds = parsedResult.sortedIds.filter((id) => itemMap.has(id));

          const aiRankMap = new Map();
          validReturnedIds.forEach((id, idx) => aiRankMap.set(id, idx));

          const finalOrder = [...validItems].sort((a, b) => {
            const scoreA = getItemScore(a);
            const scoreB = getItemScore(b);
            const scoreDiff = scoreB - scoreA;
            if (Math.abs(scoreDiff) > 0.001) {
              return scoreDiff;
            }
            const rankA = aiRankMap.get(a.id);
            const rankB = aiRankMap.get(b.id);
            if (rankA !== undefined && rankB !== undefined) {
              return rankA - rankB;
            }
            return compareByQuality(a, b);
          });

          const result = {
            success: true,
            sortedIds: finalOrder.map((i) => i.id),
            rationale: parsedResult.rationale || 'Items sorted by quality score and pros/cons dynamic.',
          };
          sortCache.set(cacheKey, { timestamp: Date.now(), data: result });
          return result;
        }

        const fallback = fallbackSort();
        sortCache.set(cacheKey, { timestamp: Date.now(), data: fallback });
        return fallback;
      } catch (aiErr) {
        // If quota exceeded or temporary outage, set rate limit backoff
        const errMsg = String(aiErr?.message || aiErr || '');
        if (errMsg.includes('429') || errMsg.includes('Quota exceeded') || errMsg.includes('503')) {
          rateLimitedUntil = Date.now() + 60 * 1000; // back off for 60s
        }
        const fallback = fallbackSort();
        sortCache.set(cacheKey, { timestamp: Date.now(), data: fallback });
        return fallback;
      } finally {
        inFlightRequests.delete(cacheKey);
      }
    })();

    inFlightRequests.set(cacheKey, executionPromise);
    const finalResult = await executionPromise;
    return res.status(200).json(finalResult);
  } catch (error) {
    console.error('Error in /api/ai-sort:', error);
    return res.status(500).json({
      error: error.message || 'An unknown error occurred during sorting',
    });
  }
}
