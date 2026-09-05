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

// Legitimate titles that officially end in "1" or "1st"
const LEGITIMATE_TRAILING_ONE_TITLES = new Set([
  'battlefield 1',
  'mortal kombat 1',
  'formula 1',
  'f 1',
  'f1',
  'player 1',
  'number 1',
  'no 1',
  'day 1',
  'tier 1',
  'zone 1',
  'area 1',
  '1',
]);

// Strips artificial trailing "1", "1st", or Roman "I" from titles that were unnumbered at release,
// e.g. "Half Life 1" -> "Half Life", "Final Fantasy 1" -> "Final Fantasy", "Max Payne 1" -> "Max Payne".
// Preserves titles where "1" is legitimately part of the name (e.g. "Battlefield 1", "Mortal Kombat 1", "Formula 1")
// or where preceded by division keywords (e.g. "Kill Bill Vol 1", "Dune Part 1").
function stripArtificialTrailingOne(title) {
  if (!title) return '';
  const trimmed = title.trim();
  const lower = trimmed.toLowerCase();

  // If the whole title is legitimate or literally just "1", preserve it
  if (LEGITIMATE_TRAILING_ONE_TITLES.has(lower) || lower === '1') {
    return trimmed;
  }

  // Check if title ends with " 1" or " 1st"
  const trailingOneMatch = trimmed.match(/^(.*?)\s+(?:1|1st)$/i);
  if (trailingOneMatch) {
    const prefix = trailingOneMatch[1].trim();
    // If preceded by series division keywords, preserve it (e.g. "Part 1", "Vol 1", "Chapter 1", "Episode 1")
    if (/\b(part|vol|volume|chapter|episode|act|book|season)\b$/i.test(prefix)) {
      return trimmed;
    }
    // Artificial "1" detected (e.g. "Half Life 1", "Final Fantasy 1", "Max Payne 1") -> strip it
    return prefix;
  }

  // Check if title ends with trailing Roman numeral " I" (e.g. "Final Fantasy I", "Half Life I")
  const trailingIMatch = trimmed.match(/^(.*?)\s+i$/i);
  if (trailingIMatch) {
    const prefix = trailingIMatch[1].trim();
    if (/\b(part|vol|volume|chapter|episode|act|book|season)\b$/i.test(prefix)) {
      return `${prefix} 1`;
    }
    // Pronoun exception: "The King and I", "Me and I", "You and I"
    if (/\b(and|or|with|you|me)\b$/i.test(prefix)) {
      return trimmed;
    }
    return prefix;
  }

  return trimmed;
}

// Sanitize title to the user's specific writing style:
// - NO colons (:) and NO hyphens/dashes (-, –, —, −)
// - NO Roman numerals (standard Arabic numbers only)
// - NO artificial "1" or "I" on debut titles (e.g. "Half Life", NOT "Half Life 1")
// - Clean whitespace and quotes
function sanitizeBingoTitleStyle(title) {
  if (!title) return '';
  let clean = title.trim();
  // Strip all colons and hyphens/dashes and replace with a space
  clean = clean.replace(/[:\-–—−]+/g, ' ');
  // Convert Roman numerals to Arabic numbers
  clean = convertRomanNumeralsToNumbers(clean);
  // Remove surrounding quotes
  clean = clean.replace(/^["'“‘«\s]+|["'”’»\s]+$/g, '');
  // Collapse whitespace
  clean = clean.replace(/\s+/g, ' ').trim();
  // Strip artificial trailing 1 / I (unless legitimate like Battlefield 1)
  clean = stripArtificialTrailingOne(clean);
  return clean;
}

// Canonical comparison key for detecting duplicates regardless of formatting:
// Treats "Final Fantasy: VII", "Final Fantasy 7", "The Final Fantasy 7" as identical.
// Also normalizes artificial 1s so "Half Life 1" and "Half Life" are treated as identical keys.
function canonicalCompareKey(title) {
  if (!title) return '';
  let s = title.toLowerCase();
  // Remove diacritics
  s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // Remove leading articles
  s = s.replace(/^(the|a|an)\s+/i, '');
  // Convert Roman numerals
  s = convertRomanNumeralsToNumbers(s);
  // Strip artificial trailing 1 or I so "Half Life 1" matches "Half Life" as duplicate
  s = stripArtificialTrailingOne(s);
  // Strip all punctuation and symbols (including colons, dashes, apostrophes, brackets)
  s = s.replace(/[^\w\s]/g, ' ');
  // Collapse whitespace
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

// Broad fallback collection across an infinite spectrum (obscure, cult, indie, classic, weird)
// formatted strictly without colons, hyphens, or Roman numerals
const DIVERSE_FALLBACKS = {
  'video game': [
    'Chrono Trigger', 'Super Metroid', 'Shadow of the Colossus', 'Half Life 2', 'Disco Elysium',
    'Silent Hill 2', 'Portal 2', 'Castlevania Symphony of the Night', 'BioShock', 'Dark Souls',
    'Okami', 'Deus Ex', 'Deadly Premonition', 'Grim Fandango', 'Pathologic 2',
    'Outer Wilds', 'Katamari Damacy', 'Psychonauts', 'Shenmue', 'Vampire The Masquerade Bloodlines',
    'EarthBound', 'Ico', 'System Shock 2', 'Mother 3', 'Thief 2 The Metal Age',
    'Planescape Torment', 'Fallout New Vegas', 'S.T.A.L.K.E.R. Shadow of Chernobyl', 'Jet Set Radio Future', 'Suikoden 2',
    'Snatcher', 'God Hand', 'No More Heroes', 'The Neverhood', 'Oddworld Abes Oddysee',
    'Policenauts', 'Live A Live', 'Illusion of Gaia', 'Terranigma', 'Xenogears',
    'Valkyrie Profile', 'Parasite Eve', 'Dino Crisis', 'Fear Effect', 'Alundra',
    'Klonoa Door to Phantomile', 'Beyond Good and Evil', 'Killer7', 'Rule of Rose', 'Haunting Ground',
    'Grim Fandango', 'Deus Ex', 'Half Life 2', 'Portal 2', 'BioShock', 'Silent Hill 2', 'Castlevania Symphony of the Night',
    'Chrono Trigger', 'Super Metroid', 'Metal Gear Solid 3 Snake Eater', 'Shadow of the Colossus', 'Resident Evil 4',
    'The Legend of Zelda Majora Mask', 'Dark Souls', 'Bloodborne', 'Disco Elysium', 'Hollow Knight', 'Celeste',
    'Hotline Miami', 'Dead Cells', 'Braid', 'Spelunky 2', 'Slay the Spire', 'Return of the Obra Dinn', 'Inscryption',
    'Signalis', 'Tunic', 'A Hat in Time', 'Fez', 'Cave Story', 'Undertale', 'Dwarf Fortress', 'Factorio',
    'Kentucky Route Zero', 'Sunless Sea', 'Pathologic 2', 'STALKER Call of Pripyat', 'Arcanum', 'Gothic 2',
    'Shin Megami Tensei 3 Nocturne', 'Persona 4 Golden', 'Yakuza 0', 'Vanquish', 'Bayonetta 2', 'Okami',
    'Viewtiful Joe', 'Ghost Trick Phantom Detective', 'Ace Attorney Trials and Tribulations', 'Professor Layton and the Curious Village',
    'Zero Escape Nine Hours Nine Persons Nine Doors', 'Danganronpa Trigger Happy Havoc', 'Steins Gate', 'The Silver Case'
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
    'Werckmeister Harmonies', 'Satantango', 'Paris Texas', 'Wings of Desire', 'Caché',
    'Metropolis', 'M', 'Bicycle Thieves', 'Tokyo Story', 'Rashomon', 'The 400 Blows', 'Breathless',
    'Contempt', '8 1 2', 'La Dolce Vita', 'L Avventura', 'Blow Up', 'The Red Shoes', 'Black Narcissus',
    'Peeping Tom', 'Eyes Without a Face', 'Diabolique', 'Rififi', 'Le Samourai', 'Army of Shadows',
    'The Battle of Algiers', 'Z', 'Cinema Paradiso', 'Amelie', 'Pan Labyrinth', 'The Double Life of Veronique',
    'Three Colors Blue', 'Three Colors Red', 'Dekalog', 'Stalker', 'The Sacrifice', 'Nostalghia',
    'Uncle Boonmee Who Can Recall His Past Lives', 'Tropical Malady', 'Drive My Car', 'Burning', 'Poetry',
    'The Handmaiden', 'Oldboy', 'Sympathy for Lady Vengeance', 'A Taxi Driver', 'The Host'
  ],
  'tv show': [
    'The Wire', 'Twin Peaks', 'Mad Men', 'The Sopranos', 'Chernobyl',
    'Succession', 'True Detective', 'Severance', 'Deadwood', 'The Leftovers',
    'Better Call Saul', 'Breaking Bad', 'The Shield', 'Fargo', 'Dark',
    'Peep Show', 'The Thick of It', 'Fleabag', 'Nathan For You', 'Spaced',
    'Black Mirror', 'Mindhunter', 'Utopia', 'Mr Robot', 'Six Feet Under',
    'Station Eleven', 'BoJack Horseman', 'Cowboy Bebop', 'Neon Genesis Evangelion', 'Monster',
    'Serial Experiments Lain', 'Paranoia Agent', 'Garth Marenghis Darkplace', 'Look Around You', 'Brass Eye',
    'The Kingdom', 'Berlin Alexanderplatz', 'Dekalog', 'Scenes from a Marriage', 'Tinker Tailor Soldier Spy',
    'The Twilight Zone', 'The Prisoner', 'Columbo', 'Fawlty Towers', 'Monty Python Flying Circus',
    'Blackadder', 'I m Alan Partridge', 'Bottom', 'Father Ted', 'Inside No 9', 'The League of Gentlemen',
    'Spirited Away', 'Mushishi', 'FLCL', 'Ghost in the Shell Stand Alone Complex', 'Samurai Champloo',
    'Trigun', 'Berserk 1997', 'Haibane Renmei', 'Texhnolyze', 'Ergo Proxy', 'Kino Journey',
    'Treme', 'Halt and Catch Fire', 'The Americans', 'Rectify', 'Borgen', 'The Bridge', 'Gomorrah',
    'Babylon Berlin', 'Dark', 'Les Revenants', 'Twin Peaks The Return', 'Atlanta', 'Barry', 'Reservation Dogs'
  ],
  'music album': [
    'OK Computer', 'The Dark Side of the Moon', 'Kind of Blue', 'To Pimp a Butterfly', 'Loveless',
    'Abbey Road', 'Blue', 'Selected Ambient Works 85 92', 'Remain in Light', 'Disintegration',
    'Unknown Pleasures', 'Marquee Moon', 'Spiderland', 'Daydream Nation', 'In the Aeroplane Over the Sea',
    'Soundtracks for the Blind', 'Spirit of Eden', 'Laughing Stock', 'Trout Mask Replica', 'Hounds of Love',
    'Dummy', 'Mezzanine', 'Endtroducing', 'Since I Left You', 'Music Has the Right to Children',
    'Geogaddi', 'Doolittle', 'Surfer Rosa', 'Grace', 'Illinois',
    'Funeral', 'In Rainbows', 'Kid A', 'Agaetis Byrjun', 'Lift Your Skinny Fists Like Antennas to Heaven',
    'Yankee Hotel Foxtrot', 'The Glow Pt 2', 'Microphones in 2020', 'Long Season', 'Fishmans 98 12 28',
    'Pet Sounds', 'A Love Supreme', 'The Velvet Underground and Nico', 'Horses', 'Astral Weeks',
    'Blonde on Blonde', 'Blood on the Tracks', 'Highway 61 Revisited', 'Songs in the Key of Life', 'Innervisions',
    'What Going On', 'Maggot Brain', 'There a Riot Goin On', 'Curtis', 'Superfly', 'Head Hunters',
    'Bitches Brew', 'In a Silent Way', 'Agharta', 'Karma', 'The Black Saint and the Sinner Lady',
    'Mingus Ah Um', 'Giant Steps', 'My Favorite Things', 'Time Out', 'The Shape of Jazz to Come'
  ],
  'book': [
    'One Hundred Years of Solitude', 'Crime and Punishment', '1984', 'The Great Gatsby', 'Dune',
    'The Sound and the Fury', 'Fahrenheit 451', 'Blindness', 'The Master and Margarita', 'Invisible Cities',
    'Ficciones', 'The Aleph', 'Pedro Paramo', 'Hopscotch', 'If on a Winters Night a Traveler',
    'The Tartar Steppe', 'The Castle', 'The Trial', 'The Metamorphosis', 'Nausea',
    'The Stranger', 'The Plague', 'Journey to the End of the Night', 'Dead Souls', 'The Brothers Karamazov',
    'The Idiot', 'Notes from Underground', 'Fathers and Sons', 'Oblamov', 'The Death of Ivan Ilyich',
    'Auto da Fe', 'The Book of Disquiet', 'The Third Policeman', 'At Swim Two Birds', 'Molloy',
    'Malone Dies', 'The Unnamable', 'Waiting for Godot', 'Pale Fire', 'Labyrinths',
    'Ulysses', 'In Search of Lost Time', 'War and Peace', 'Anna Karenina', 'Don Quixote', 'Moby Dick',
    'Heart of Darkness', 'To the Lighthouse', 'Mrs Dalloway', 'The Waves', 'Orlando', 'Catch 22',
    'Slaughterhouse Five', 'Cat Cradle', 'Breakfast of Champions', 'Blood Meridian', 'The Road', 'Suttree',
    'Infinite Jest', 'Gravity Rainbow', 'The Crying of Lot 49', 'Mason and Dixon', 'Underworld', 'White Noise',
    'Cosmopolis', 'The Corrections', 'Freedom', '2666', 'The Savage Detectives', 'By Night in Chile'
  ],
  'comic series': [
    'Watchmen', 'Sandman', 'Maus', 'Akira', 'Berserk',
    'Saga', 'Batman The Long Halloween', 'Preacher', 'Transmetropolitan', 'Y The Last Man',
    'Planetary', 'The Invisibles', 'Hellblazer', 'Promethea', 'Swamp Thing',
    'Doom Patrol', 'Animal Man', 'All Star Superman', 'Kingdom Come', 'The Dark Knight Returns',
    'Daredevil Born Again', 'V for Vendetta', 'From Hell', 'Top 10', 'Miracleman',
    'Monster', '20th Century Boys', 'Pluto', 'Goodnight Punpun', 'Oyasumi Punpun',
    'Vinland Saga', 'Vagabond', 'Blame', 'Biomega', 'Knights of Sidonia',
    'Lone Wolf and Cub', 'Golgo 13', 'Phoenix', 'Black Jack', 'Buddha',
    'Corto Maltese', 'Tintin', 'Asterix', 'Incal', 'Metabarons', 'Blacksad', 'Persepolis',
    'Jimmy Corrigan The Smartest Kid on Earth', 'Building Stories', 'Ghost World', 'David Boring',
    'Like a Velvet Glove Cast in Iron', 'Love and Rockets', 'Eightball', 'Acme Novelty Library',
    'Stray Bullets', 'Sin City', 'Scalped', 'Criminal', 'The Fade Out', 'Fatale', 'Kill or Be Killed'
  ],
  'board game': [
    'Settlers of Catan', 'Gloomhaven', 'Carcassonne', 'Terraforming Mars', 'Pandemic',
    '7 Wonders', 'Wingspan', 'Azul', 'Brass Birmingham', 'Root',
    'Spirit Island', 'Scythe', 'Concordia', 'Castles of Burgundy', 'Agricola',
    'Caverna', 'Power Grid', 'Puerto Rico', 'Tigris and Euphrates', 'El Grande',
    'Modern Art', 'Ra', 'Medici', 'Hansa Teutonica', 'Troyes',
    'Pax Pamir 2nd Edition', 'John Company 2nd Edition', 'Oath', 'War of the Ring', 'Twilight Struggle',
    'Dune Imperium', 'Ark Nova', 'Cascadia', 'Calico', 'The Crew Mission Deep Sea',
    'Crokinole', 'Skull', 'Decrypto', 'Codenames', 'Secret Hitler',
    'Ticket to Ride', 'Dominion', 'Splendor', 'Hive', 'Patchwork', 'Santorini', 'Jaipur',
    'Lost Ruins of Arnak', 'Great Western Trail', 'Feast for Odin', 'Viticulture', 'Everdell',
    'Nemesis', 'Mansions of Madness', 'Betrayal at House on the Hill', 'Clank', 'Cosmic Encounter',
    'Battlestar Galactica', 'Avalon', 'Blood on the Clocktower', 'Deception Murder in Hong Kong',
    'Mage Knight', 'Through the Ages A New Story of Civilization', 'Clans of Caledonia', 'Keyflower',
    'Brass Lancashire', 'Terra Mystica', 'Gaia Project', 'Castles of Mad King Ludwig', 'Suburbia',
    'Cosmic Frog', 'Inis', 'Kemet Blood and Sand', 'Cyclades', 'Captain Sonar', 'Just One',
    'Warhammer Quest The Adventure Card Game', 'Sheriff of Nottingham', 'Roll for the Galaxy',
    'Race for the Galaxy', 'Res Arcana', 'Targi', 'Kingdomino', 'Photosynthesis', 'Sushi Go Party'
  ],
  'painting': [
    'The Starry Night', 'Guernica', 'The Persistence of Memory', 'Girl with a Pearl Earring', 'The Great Wave off Kanagawa',
    'The Night Watch', 'The Kiss', 'Wanderer above the Sea of Fog', 'Las Meninas', 'The Garden of Earthly Delights',
    'The Birth of Venus', 'The School of Athens', 'The Arnolfini Portrait', 'A Sunday on La Grande Jatte', 'The Scream',
    'American Gothic', 'Nighthawks', 'The Son of Man', 'The Treachery of Images', 'Golconda',
    'Composition with Red Blue and Yellow', 'Broadway Boogie Woogie', 'No 5 1948', 'Rothko No 61 Rust and Blue', 'Campbell Soup Cans',
    'Christina World', 'The Death of Marat', 'Liberty Leading the People', 'The Raft of the Medusa', 'Saturn Devouring His Son',
    'The Third of May 1808', 'Black Square', 'The Tower of Babel', 'The Triumph of Death', 'Netherlandish Proverbs',
    'Hunters in the Snow', 'The Haywain', 'Ophelia', 'Flaming June', 'The Lady of Shalott',
    'Impression Sunrise', 'Water Lilies', 'Bal du moulin de la Galette', 'Luncheon of the Boating Party', 'The Thinker',
    'The Gates of Hell', 'Whistler Mother', 'Primavera', 'Mona Lisa', 'The Last Supper', 'Creation of Adam',
    'The Swing', 'The Sleep of Reason Produces Monsters', 'Witches Sabbath', 'The Nightmare', 'The Gross Clinic',
    'Judith Slaying Holofernes', 'The Calling of Saint Matthew', 'David with the Head of Goliath', 'Bacchus',
    'The Beheading of Saint John the Baptist', 'View of Toledo', 'The Burial of the Count of Orgaz',
    'The Anatomy Lesson of Dr Nicolaes Tulp', 'Self Portrait with Two Circles', 'Girl at a Window',
    'The Fighting Temeraire', 'Rain Steam and Speed', 'The Slave Ship', 'View of Delft',
    'The Milkmaid', 'The Astronomer', 'The Lacemaker', 'Landscape with the Fall of Icarus',
    'Children Games', 'Dulle Griet', 'The Blind Leading the Blind', 'The Harvesters',
    'The Ghent Altarpiece', 'The Descent from the Cross', 'Portinari Altarpiece',
    'The Third of May', 'Caprichos', 'The Colossus', 'Witches Flight', 'Asmodea'
  ]
};

// Robust helper to try gemini-3.1-flash-lite first, then fallback to gemini-3.8-flash
async function generateContentWithModelFallback(ai, options) {
  const models = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];
  let lastErr = null;
  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        ...options,
        model,
      });
      if (response && response.text) {
        return response.text;
      }
    } catch (err) {
      lastErr = err;
      console.warn(`Model ${model} attempt in bingo-recommendations:`, err?.message || err);
    }
  }
  throw lastErr || new Error('All model attempts failed');
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
    const {
      category,
      existingTitles = [],
      dismissedTitles = [],
      excludeTitles = [],
      count = 10,
    } = req.body || {};

    if (!category || typeof category !== 'string') {
      return res.status(400).json({ error: 'Category is required' });
    }

    const parsedCount = parseInt(count, 10);
    const targetCount = [10, 100, 1000].includes(parsedCount)
      ? parsedCount
      : parsedCount > 0
      ? Math.min(1000, parsedCount)
      : 10;

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

        // Pass existing titles (clean style, trimmed length for prompt efficiency)
        const cleanedExisting = existingTitles.slice(0, 800).map(sanitizeBingoTitleStyle);
        const cleanedDismissed = dismissedTitles.slice(0, 500).map(sanitizeBingoTitleStyle);
        const cleanedExcluded = excludeTitles.slice(0, 500).map(sanitizeBingoTitleStyle);

        const baseInstructions = `You are a cultural media curator and archivist with exhaustive knowledge across all arts, entertainment, and human media history.
The user is building a Bingo collection for the medium: "${normCategory}".

STRICT WRITING STYLE RULES (MANDATORY):
1. PROHIBITED CHARACTERS: Colons (":") and hyphens/dashes ("-", "–", "—") are STRICTLY PROHIBITED in all titles.
   - Always replace colons and hyphens with a single space.
   - Example: "Half Life" (NEVER "Half-Life")
   - Example: "Half Life 2" (NEVER "Half-Life 2" or "Half-Life: 2")
   - Example: "Spider Man" (NEVER "Spider-Man")
   - Example: "Castlevania Symphony of the Night" (NEVER "Castlevania: Symphony of the Night" or "Castlevania - Symphony of the Night")
   - Example: "Star Wars Episode 4 A New Hope" (NEVER "Star Wars: Episode IV")
   - Example: "NieR Automata" (NEVER "NieR:Automata")
   - Example: "X Men" (NEVER "X-Men")
2. NEVER use Roman numerals (II, III, IV, V, VI, VII, VIII, IX, X, XI, etc.). ALWAYS use standard Arabic numbers (2, 3, 4, 5, 6, 7, 8, 9, 10, etc.).
   - Example: "Final Fantasy 7" (NOT "Final Fantasy VII")
   - Example: "Grand Theft Auto 4" (NOT "Grand Theft Auto IV")
   - Example: "Street Fighter 2 Turbo" (NOT "Street Fighter II")
   - Example: "Civilization 6" (NOT "Civilization VI")
3. CRITICAL: NEVER APPEND AN ARTIFICIAL "1" OR "I" TO FIRST/DEBUT RELEASES!
   Famous franchises almost always release their first installment without any number. NEVER add "1" to a title unless the product was genuinely and officially titled with "1" at release!
   - Write "Half Life" (NEVER "Half Life 1" or "Half-Life 1")
   - Write "Final Fantasy" (NEVER "Final Fantasy 1" or "Final Fantasy I")
   - Write "Max Payne" (NEVER "Max Payne 1")
   - Write "Silent Hill" (NEVER "Silent Hill 1")
   - Write "Resident Evil" (NEVER "Resident Evil 1")
   - Write "Dark Souls" (NEVER "Dark Souls 1")
   - Write "Portal" (NEVER "Portal 1")
   - Write "BioShock" (NEVER "BioShock 1")
   - Write "Fallout" (NEVER "Fallout 1")
   - Write "God of War" (NEVER "God of War 1")
   - Write "Deus Ex" (NEVER "Deus Ex 1")
   - Write "Diablo" (NEVER "Diablo 1")
   - Write "System Shock" (NEVER "System Shock 1")
   - Write "The Matrix" (NEVER "The Matrix 1")
   - Write "The Godfather" (NEVER "The Godfather 1")
   - Write "Alien" (NEVER "Alien 1")
   - Write "Toy Story" (NEVER "Toy Story 1")
   ONLY keep "1" when it is officially in the product's launch name, such as "Battlefield 1", "Mortal Kombat 1", "Formula 1", or series markers like "Kill Bill Vol 1", "Dune Part 1".
4. No quotes or unnecessary punctuation.
5. Output ONLY clean title strings. Do not include release years, descriptions, numbers, or authors.
6. INFINITE SPECTRUM: Pick a wide, genuine spectrum across eras, genres, obscure releases, cult gems, and famous titles.
7. NO DUPLICATES with existing cards:
${cleanedExisting.length > 0 ? `Already in collection:\n${JSON.stringify(cleanedExisting)}\n` : ''}
${cleanedDismissed.length > 0 ? `Dismissed titles:\n${JSON.stringify(cleanedDismissed)}\n` : ''}
${cleanedExcluded.length > 0 ? `Excluded this round:\n${JSON.stringify(cleanedExcluded)}\n` : ''}`;

        const RANDOM_PERSPECTIVES = [
          'Focus on overlooked cult oddities, underground foreign works, and underground masterworks.',
          'Focus on influential golden-age vintage gems, niche indie creations, and forgotten critical darlings.',
          'Focus on award-winning auteur masterworks, psychological narratives, and genre-defying rarities.',
          'Focus on sleeper hits, sleeper classics, beloved fan favorites, and hidden gems across all decades.',
        ];
        const randomSeed = RANDOM_PERSPECTIVES[Math.floor(Math.random() * RANDOM_PERSPECTIVES.length)];

        let rawCandidateTitles = [];

        if (targetCount <= 10) {
          // Single call requesting 35-45 items to ensure fresh candidates
          const prompt = `${baseInstructions}
PERSPECTIVE: ${randomSeed}
TASK:
Recommend 35 to 45 REAL, DISTINCT works for "${normCategory}" spanning the entire spectrum from obscure oddities to classic favorites.
Return a JSON array of title strings.`;

          const responseText = await generateContentWithModelFallback(ai, {
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
          });

          if (responseText) {
            try {
              const parsed = JSON.parse(responseText);
              if (Array.isArray(parsed)) {
                rawCandidateTitles.push(...parsed);
              }
            } catch (e) {
              console.warn('JSON parse notice (10 items):', e);
            }
          }
        } else if (targetCount <= 100) {
          // Single call requesting 140-160 items
          const prompt = `${baseInstructions}
PERSPECTIVE: ${randomSeed}
TASK:
Recommend 140 to 160 REAL, DISTINCT works for "${normCategory}" spanning the entire spectrum:
- Obscure & cult gems (35%)
- Indie & niche favorites (35%)
- Historically acclaimed classics (15%)
- Mainstream & widely known popular hits (15%)
Return a JSON array of title strings.`;

          const responseText = await generateContentWithModelFallback(ai, {
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
          });

          if (responseText) {
            try {
              const parsed = JSON.parse(responseText);
              if (Array.isArray(parsed)) {
                rawCandidateTitles.push(...parsed);
              }
            } catch (e) {
              console.warn('JSON parse notice (100 items):', e);
            }
          }
        } else {
          // 1000 items: Execute 4 parallel specialized spectrum calls
          const quadrantPrompts = [
            `${baseInstructions}
TASK 1 OF 4 (OBSCURE & CULT):
Recommend 280 to 300 REAL, DISTINCT obscure, forgotten, cult favorite, underground, foreign, and experimental works for "${normCategory}".
Return a JSON array of title strings.`,

            `${baseInstructions}
TASK 2 OF 4 (INDIE & RETRO):
Recommend 280 to 300 REAL, DISTINCT indie releases, vintage/retro classics, B-tier oddities, and niche genre masterpieces for "${normCategory}".
Return a JSON array of title strings.`,

            `${baseInstructions}
TASK 3 OF 4 (ACCLAIMED & HISTORIC):
Recommend 280 to 300 REAL, DISTINCT landmark, award-winning, critically revered, and historically influential masterpieces across all eras for "${normCategory}".
Return a JSON array of title strings.`,

            `${baseInstructions}
TASK 4 OF 4 (MAINSTREAM & FAN FAVORITES):
Recommend 280 to 300 REAL, DISTINCT widely popular, blockbuster, beloved staple, and fan-favorite works across all eras for "${normCategory}".
Return a JSON array of title strings.`,
          ];

          const promises = quadrantPrompts.map((qPrompt) =>
            generateContentWithModelFallback(ai, {
              contents: qPrompt,
              config: {
                responseMimeType: 'application/json',
                responseSchema: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
            })
              .then((text) => {
                if (text) {
                  const p = JSON.parse(text);
                  return Array.isArray(p) ? p : [];
                }
                return [];
              })
              .catch((err) => {
                console.warn('Spectrum batch error:', err?.message || err);
                return [];
              })
          );

          const results = await Promise.all(promises);
          results.forEach((arr) => {
            rawCandidateTitles.push(...arr);
          });
        }

        // Two-pass deduplication and filtering:
        // Pass 1: Strict (must not be in existing, dismissed, or excludeKeys)
        const seenInBatch = new Set();
        const cleanRecs = [];

        for (const raw of rawCandidateTitles) {
          const titleStr = typeof raw === 'string' ? raw : raw?.title;
          if (!titleStr) continue;
          const cleanTitle = sanitizeBingoTitleStyle(titleStr);
          const key = canonicalCompareKey(cleanTitle);
          if (!cleanTitle || !key) continue;

          // Never recommend what is already collected or permanently dismissed
          if (existingKeys.has(key) || dismissedKeys.has(key)) continue;

          // Pass 1 check: not recently shown in session
          if (!excludeKeys.has(key) && !seenInBatch.has(key)) {
            seenInBatch.add(key);
            cleanRecs.push({ title: cleanTitle });
          }
          if (cleanRecs.length >= targetCount) break;
        }

        // Pass 2: If strict filtering did not yield enough items, relax excludeKeys!
        // (Only strictly forbid existing in cards or permanently dismissed)
        if (cleanRecs.length < targetCount) {
          for (const raw of rawCandidateTitles) {
            const titleStr = typeof raw === 'string' ? raw : raw?.title;
            if (!titleStr) continue;
            const cleanTitle = sanitizeBingoTitleStyle(titleStr);
            const key = canonicalCompareKey(cleanTitle);
            if (!cleanTitle || !key) continue;

            if (!existingKeys.has(key) && !dismissedKeys.has(key) && !seenInBatch.has(key)) {
              seenInBatch.add(key);
              cleanRecs.push({ title: cleanTitle });
            }
            if (cleanRecs.length >= targetCount) break;
          }
        }

        if (cleanRecs.length > 0) {
          return res.status(200).json({
            success: true,
            source: 'gemini',
            category: normCategory,
            requestedCount: targetCount,
            count: cleanRecs.length,
            recommendations: cleanRecs,
          });
        }
      } catch (geminiErr) {
        console.warn('Gemini API call notice in bingo-recommendations:', geminiErr?.message || geminiErr);
      }
    }

    // Fallback pool if offline or API unavailable
    const pool = DIVERSE_FALLBACKS[normCategory] || [];
    const shuffledPool = [...pool].sort(() => 0.5 - Math.random());
    const seenFallback = new Set();
    const cleanFallback = [];

    // Pass 1: Strict exclusion
    for (const title of shuffledPool) {
      const cleanTitle = sanitizeBingoTitleStyle(title);
      const key = canonicalCompareKey(cleanTitle);
      if (!existingKeys.has(key) && !dismissedKeys.has(key) && !excludeKeys.has(key) && !seenFallback.has(key)) {
        seenFallback.add(key);
        cleanFallback.push({ title: cleanTitle });
      }
      if (cleanFallback.length >= targetCount) break;
    }

    // Pass 2: Relax excludeKeys if still needed
    if (cleanFallback.length < targetCount) {
      for (const title of shuffledPool) {
        const cleanTitle = sanitizeBingoTitleStyle(title);
        const key = canonicalCompareKey(cleanTitle);
        if (!existingKeys.has(key) && !dismissedKeys.has(key) && !seenFallback.has(key)) {
          seenFallback.add(key);
          cleanFallback.push({ title: cleanTitle });
        }
        if (cleanFallback.length >= targetCount) break;
      }
    }

    return res.status(200).json({
      success: true,
      source: 'fallback',
      category: normCategory,
      requestedCount: targetCount,
      count: cleanFallback.length,
      recommendations: cleanFallback,
    });
  } catch (error) {
    console.error('Error in /api/bingo-recommendations:', error);
    return res.status(500).json({
      error: error.message || 'Failed to generate recommendations',
    });
  }
}
