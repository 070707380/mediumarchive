import { GoogleGenAI, Type } from '@google/genai';

const ROMAN_NUMERALS_MAP = {
  xx: '20',
  xix: '19',
  xviii: '18',
  xvii: '17',
  xvi: '16',
  xv: '15',
  xiv: '14',
  xiii: '13',
  xii: '12',
  xi: '11',
  x: '10',
  ix: '9',
  viii: '8',
  vii: '7',
  vi: '6',
  v: '5',
  iv: '4',
  iii: '3',
  ii: '2',
};

// Convert Roman numerals in title to Arabic numerals (e.g. VII -> 7, IV -> 4)
function convertRomanNumeralsToNumbers(text) {
  if (!text) return '';
  let result = text;
  for (const [roman, arabic] of Object.entries(ROMAN_NUMERALS_MAP)) {
    const regex = new RegExp(`\\b${roman}\\b`, 'gi');
    result = result.replace(regex, arabic);
  }
  result = result.replace(/\b(part|episode|vol|volume|chapter|act)\s+i\b/gi, '$1 1');
  return result;
}

// Sanitize title to the user's specific writing style:
// - NO colons (:)
// - NO Roman numerals (standard Arabic numbers only)
// - Clean whitespace and quotes
function sanitizeBingoTitleStyle(title) {
  if (!title) return '';
  let clean = title.trim();
  // Strip all colons and replace with a space
  clean = clean.replace(/:+/g, ' ');
  // Convert Roman numerals to Arabic numbers
  clean = convertRomanNumeralsToNumbers(clean);
  // Remove surrounding quotes
  clean = clean.replace(/^["'“‘«\s]+|["'”’»\s]+$/g, '');
  // Collapse whitespace
  clean = clean.replace(/\s+/g, ' ').trim();
  return clean;
}

// Canonical comparison key for detecting duplicates regardless of formatting:
// Treats "Final Fantasy: VII", "Final Fantasy 7", "The Final Fantasy 7" as identical.
function canonicalCompareKey(title) {
  if (!title) return '';
  let s = title.toLowerCase();
  // Remove diacritics
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // Remove leading articles
  s = s.replace(/^(the|a|an)\s+/i, '');
  // Convert Roman numerals
  s = convertRomanNumeralsToNumbers(s);
  // Strip all punctuation and symbols (including colons, dashes, apostrophes, brackets)
  s = s.replace(/[^\w\s]/g, ' ');
  // Collapse whitespace
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

// Broad fallback collection across an infinite spectrum (obscure, cult, indie, classic, weird)
// formatted strictly without colons or Roman numerals
const DIVERSE_FALLBACKS = {
  'video game': [
    'Chrono Trigger', 'Super Metroid', 'Shadow of the Colossus', 'Half-Life 2', 'Disco Elysium',
    'Silent Hill 2', 'Portal 2', 'Castlevania Symphony of the Night', 'BioShock', 'Dark Souls',
    'Okami', 'Deus Ex', 'Deadly Premonition', 'Grim Fandango', 'Pathologic 2',
    'Outer Wilds', 'Katamari Damacy', 'Psychonauts', 'Shenmue', 'Vampire The Masquerade Bloodlines',
    'EarthBound', 'Ico', 'System Shock 2', 'Mother 3', 'Thief 2 The Metal Age',
    'Planescape Torment', 'Fallout New Vegas', 'S.T.A.L.K.E.R. Shadow of Chernobyl', 'Jet Set Radio Future', 'Suikoden 2',
    'Snatcher', 'God Hand', 'No More Heroes', 'The Neverhood', 'Oddworld Abes Oddysee',
    'Policenauts', 'Live A Live', 'Illusion of Gaia', 'Terranigma', 'Xenogears',
    'Valkyrie Profile', 'Parasite Eve', 'Dino Crisis', 'Fear Effect', 'Alundra',
    'Klonoa Door to Phantomile', 'Beyond Good and Evil', 'Killer7', 'Rule of Rose', 'Haunting Ground'
  ],
  'movie': [
    'Seven Samurai', '2001 A Space Odyssey', 'Stalker', 'Spirited Away', 'Blade Runner',
    'Apocalypse Now', 'Taxi Driver', 'Parasite', 'Rear Window', 'Fargo',
    'Mulholland Drive', 'La Haine', 'Cure', 'Solaris', 'Memories of Murder',
    'Come and See', 'City of God', 'Barton Fink', 'Chunking Express', 'In the Mood for Love',
    'Yi Yi', 'A Brighter Summer Day', 'High and Low', 'Ran', 'Ikiru',
    'The Holy Mountain', 'El Topo', 'Eraserhead', 'Blue Velvet', 'Tetsuo The Iron Man',
    'Hausu', 'Possession', 'Videodrome', 'Blow Out', 'Hard Boiled',
    'Paprika', 'Perfect Blue', 'Millennium Actress', 'The Mirror', 'Persona',
    'Through a Glass Darkly', 'Wild Strawberries', 'Seventh Seal', 'Aguirre the Wrath of God', 'Fitzcarraldo',
    'Werckmeister Harmonies', 'Satantango', 'Paris Texas', 'Wings of Desire', 'Caché'
  ],
  'tv show': [
    'The Wire', 'Twin Peaks', 'Mad Men', 'The Sopranos', 'Chernobyl',
    'Succession', 'True Detective', 'Severance', 'Deadwood', 'The Leftovers',
    'Better Call Saul', 'Breaking Bad', 'The Shield', 'Fargo', 'Dark',
    'Peep Show', 'The Thick of It', 'Fleabag', 'Nathan For You', 'Spaced',
    'Black Mirror', 'Mindhunter', 'Utopia', 'Mr Robot', 'Six Feet Under',
    'Station Eleven', 'BoJack Horseman', 'Cowboy Bebop', 'Neon Genesis Evangelion', 'Monster',
    'Serial Experiments Lain', 'Paranoia Agent', 'Garth Marenghis Darkplace', 'Look Around You', 'Brass Eye',
    'The Kingdom', 'Berlin Alexanderplatz', 'Dekalog', 'Scenes from a Marriage', 'Tinker Tailor Soldier Spy'
  ],
  'music album': [
    'OK Computer', 'The Dark Side of the Moon', 'Kind of Blue', 'To Pimp a Butterfly', 'Loveless',
    'Abbey Road', 'Blue', 'Selected Ambient Works 85 92', 'Remain in Light', 'Disintegration',
    'Unknown Pleasures', 'Marquee Moon', 'Spiderland', 'Daydream Nation', 'In the Aeroplane Over the Sea',
    'Soundtracks for the Blind', 'Spirit of Eden', 'Laughing Stock', 'Trout Mask Replica', 'Hounds of Love',
    'Dummy', 'Mezzanine', 'Endtroducing', 'Since I Left You', 'Music Has the Right to Children',
    'Geogaddi', 'Doolittle', 'Surfer Rosa', 'Grace', 'Illinois',
    'Funeral', 'In Rainbows', 'Kid A', 'Agaetis Byrjun', 'Lift Your Skinny Fists Like Antennas to Heaven',
    'Yankee Hotel Foxtrot', 'The Glow Pt 2', 'Microphones in 2020', 'Long Season', 'Fishmans 98 12 28'
  ],
  'book': [
    'One Hundred Years of Solitude', 'Crime and Punishment', '1984', 'The Great Gatsby', 'Dune',
    'The Sound and the Fury', 'Fahrenheit 451', 'Blindness', 'The Master and Margarita', 'Invisible Cities',
    'Ficciones', 'The Aleph', 'Pedro Paramo', 'Hopscotch', 'If on a Winters Night a Traveler',
    'The Tartar Steppe', 'The Castle', 'The Trial', 'The Metamorphosis', 'Nausea',
    'The Stranger', 'The Plague', 'Journey to the End of the Night', 'Dead Souls', 'The Brothers Karamazov',
    'The Idiot', 'Notes from Underground', 'Fathers and Sons', 'Oblamov', 'The Death of Ivan Ilyich',
    'Auto da Fe', 'The Book of Disquiet', 'The Third Policeman', 'At Swim Two Birds', 'Molloy',
    'Malone Dies', 'The Unnamable', 'Waiting for Godot', 'Pale Fire', 'Labyrinths'
  ],
  'comic series': [
    'Watchmen', 'Sandman', 'Maus', 'Akira', 'Berserk',
    'Saga', 'Batman The Long Halloween', 'Preacher', 'Transmetropolitan', 'Y The Last Man',
    'Planetary', 'The Invisibles', 'Hellblazer', 'Promethea', 'Swamp Thing',
    'Doom Patrol', 'Animal Man', 'All Star Superman', 'Kingdom Come', 'The Dark Knight Returns',
    'Daredevil Born Again', 'V for Vendetta', 'From Hell', 'Top 10', 'Miracleman',
    'Monster', '20th Century Boys', 'Pluto', 'Goodnight Punpun', 'Oyasumi Punpun',
    'Vinland Saga', 'Vagabond', 'Blame', 'Biomega', 'Knights of Sidonia',
    'Lone Wolf and Cub', 'Golgo 13', 'Phoenix', 'Black Jack', 'Buddha'
  ],
  'board game': [
    'Settlers of Catan', 'Gloomhaven', 'Carcassonne', 'Terraforming Mars', 'Pandemic',
    '7 Wonders', 'Wingspan', 'Azul', 'Brass Birmingham', 'Root',
    'Spirit Island', 'Scythe', 'Concordia', 'Castles of Burgundy', 'Agricola',
    'Caverna', 'Power Grid', 'Puerto Rico', 'Tigris and Euphrates', 'El Grande',
    'Modern Art', 'Ra', 'Medici', 'Hansa Teutonica', 'Troyes',
    'Pax Pamir 2nd Edition', 'John Company 2nd Edition', 'Oath', 'War of the Ring', 'Twilight Struggle',
    'Dune Imperium', 'Ark Nova', 'Cascadia', 'Calico', 'The Crew Mission Deep Sea',
    'Crokinole', 'Skull', 'Decrypto', 'Codenames', 'Secret Hitler'
  ],
  'painting': [
    'The Starry Night', 'Guernica', 'The Persistence of Memory', 'Girl with a Pearl Earring', 'The Great Wave off Kanagawa',
    'The Night Watch', 'The Kiss', 'Wanderer above the Sea of Fog', 'Las Meninas', 'The Garden of Earthly Delights',
    'The Birth of Venus', 'The School of Athens', 'The Arnolfini Portrait', 'A Sunday on La Grande Jatte', 'The Scream',
    'American Gothic', 'Nighthawks', 'The Son of Man', 'The Treachery of Images', 'Golconda',
    'Composition with Red Blue and Yellow', 'Broadway Boogie Woogie', 'No 5 1948', 'Rothko No 61 Rust and Blue', 'Campbell Soup Cans',
    'Christina World', 'The Death of Marat', 'Liberty Leading the People', 'The Raft of the Medusa', 'Saturn Devouring His Son',
    'The Third of May 1808', 'Black Square', 'The Tower of Babel', 'The Triumph of Death', 'Netherlandish Proverbs',
    'Hunters in the Snow', 'The Haywain', 'Ophelia', 'Flaming June', 'The Lady of Shalott'
  ]
};

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
    const {
      category,
      existingTitles = [],
      dismissedTitles = [],
      excludeTitles = [],
    } = req.body || {};

    if (!category || typeof category !== 'string') {
      return res.status(400).json({ error: 'Category is required' });
    }

    const normCategory = category.trim().toLowerCase();

    // Build canonical key sets for deep duplicate prevention
    const existingKeys = new Set(existingTitles.map(canonicalCompareKey));
    const dismissedKeys = new Set(dismissedTitles.map(canonicalCompareKey));
    const excludeKeys = new Set(excludeTitles.map(canonicalCompareKey));

    const isExcluded = (title) => {
      if (!title) return true;
      const key = canonicalCompareKey(title);
      if (!key) return true;
      return existingKeys.has(key) || dismissedKeys.has(key) || excludeKeys.has(key);
    };

    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey) {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        // Pass all existing titles so AI can scan thoroughly
        // Clean them to user style for prompt clarity
        const cleanedExisting = existingTitles.map(sanitizeBingoTitleStyle);
        const cleanedDismissed = dismissedTitles.map(sanitizeBingoTitleStyle);
        const cleanedExcluded = excludeTitles.map(sanitizeBingoTitleStyle);

        const prompt = `You are a cultural media curator and archivist with exhaustive knowledge across all arts, entertainment, and human media history.
The user is building a Bingo collection for the medium: "${normCategory}".

YOUR GOAL:
Recommend 12 to 15 REAL, DISTINCT works for "${normCategory}". Exactly 10 will be selected.

========================================================================
RULE 1: ABSOLUTELY NO DUPLICATES OF EXISTING OR DISMISSED ITEMS
========================================================================
You must carefully scan the existing cards list below.
DO NOT recommend any item that is already in this collection or has been dismissed, even if you spell or format it differently (e.g. subtitle variations, with or without articles).

Current cards already in the user's collection (${existingTitles.length} items):
${JSON.stringify(cleanedExisting)}

Permanently dismissed cards (never recommend these):
${JSON.stringify(cleanedDismissed)}

${cleanedExcluded.length > 0 ? `Recently shown items to exclude this round:\n${JSON.stringify(cleanedExcluded)}` : ''}

========================================================================
RULE 2: STRICT WRITING STYLE (NO COLONS, NO ROMAN NUMERALS)
========================================================================
The user's archive has strict naming conventions. You must adopt their writing style:
1. NEVER use colons (":") in any title. If a title has a colon, omit it and separate with a single space.
   - Example: "Star Wars Episode 4 A New Hope" (NOT "Star Wars: Episode IV")
   - Example: "Castlevania Symphony of the Night" (NOT "Castlevania: Symphony of the Night")
   - Example: "Half-Life 2" (NOT "Half-Life: 2")
2. NEVER use Roman numerals (I, II, III, IV, V, VI, VII, VIII, IX, X, XI, etc.). ALWAYS use standard Arabic numbers (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, etc.).
   - Example: "Final Fantasy 7" (NOT "Final Fantasy VII")
   - Example: "Grand Theft Auto 4" (NOT "Grand Theft Auto IV")
   - Example: "Street Fighter 2 Turbo" (NOT "Street Fighter II")
   - Example: "Civilization 6" (NOT "Civilization VI")
   - Example: "Resident Evil 4" (NOT "Resident Evil IV")
3. Do not include quotes or unnecessary punctuation.

========================================================================
RULE 3: INFINITE SPECTRUM (DO NOT JUST RECOMMEND THE OBVIOUS TOP-10)
========================================================================
- Do NOT restrict recommendations to only the most universally famous, mainstream, or cliché critically acclaimed masterpieces.
- The user wants an INFINITE SPECTRUM of anything that genuinely exists in this medium:
  * Obscure indie games, cult favorites, forgotten releases, B-tier oddities, retro/vintage titles, niche genre masterpieces, foreign and international works, experimental releases, underground classics, alongside celebrated works.
  * Every single item must be a REAL, verifiable work that exists.
  * Pick a rich, varied, unexpected cross-section.

========================================================================
RULE 4: ONLY OUTPUT THE TITLE/NAME
========================================================================
- Return ONLY the clean title of the work. Do NOT provide descriptions, summaries, creators, or release years.`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                recommendations: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: {
                        type: Type.STRING,
                        description: 'Title of the real work written in the user style (no colons, no Roman numerals).',
                      },
                    },
                    required: ['title'],
                  },
                },
              },
              required: ['recommendations'],
            },
          },
        });

        if (response && response.text) {
          const parsed = JSON.parse(response.text);
          if (Array.isArray(parsed.recommendations)) {
            const seenInBatch = new Set();
            const cleanRecs = [];

            for (const item of parsed.recommendations) {
              if (!item || !item.title) continue;
              const cleanTitle = sanitizeBingoTitleStyle(item.title);
              const key = canonicalCompareKey(cleanTitle);
              if (!cleanTitle || !key) continue;

              if (!isExcluded(cleanTitle) && !seenInBatch.has(key)) {
                seenInBatch.add(key);
                cleanRecs.push({ title: cleanTitle });
              }
              if (cleanRecs.length >= 10) break;
            }

            if (cleanRecs.length > 0) {
              return res.status(200).json({
                success: true,
                source: 'gemini',
                category: normCategory,
                recommendations: cleanRecs,
              });
            }
          }
        }
      } catch (geminiErr) {
        console.warn('Gemini API call notice in bingo-recommendations:', geminiErr?.message || geminiErr);
      }
    }

    // Fallback to curated diverse recommendations across the spectrum
    const pool = DIVERSE_FALLBACKS[normCategory] || [];
    // Shuffle pool to provide 10 different items per click
    const shuffledPool = [...pool].sort(() => 0.5 - Math.random());
    const seenFallback = new Set();
    const cleanFallback = [];

    for (const title of shuffledPool) {
      const cleanTitle = sanitizeBingoTitleStyle(title);
      const key = canonicalCompareKey(cleanTitle);
      if (!isExcluded(cleanTitle) && !seenFallback.has(key)) {
        seenFallback.add(key);
        cleanFallback.push({ title: cleanTitle });
      }
      if (cleanFallback.length >= 10) break;
    }

    return res.status(200).json({
      success: true,
      source: 'fallback',
      category: normCategory,
      recommendations: cleanFallback,
    });
  } catch (error) {
    console.error('Error in /api/bingo-recommendations:', error);
    return res.status(500).json({
      error: error.message || 'Failed to generate recommendations',
    });
  }
}
