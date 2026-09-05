import { GoogleGenAI, Type } from '@google/genai';

// Curated high-fidelity fallback database by category in case Gemini is offline or rate-limited
const CURATED_FALLBACKS = {
  'video game': [
    { title: 'Chrono Trigger', creator: 'Square', year: '1995', bio: 'A legendary time-travel RPG developed by the Dream Team, revered for its branching narrative and unforgettable score.' },
    { title: 'Super Metroid', creator: 'Nintendo', year: '1994', bio: 'The foundational masterwork of the Metroidvania genre, celebrated for atmospheric isolation and non-linear level design.' },
    { title: 'Shadow of the Colossus', creator: 'Team Ico', year: '2005', bio: 'A minimalist masterpiece exploring grief and consequence as Wander battles sixteen majestic colossi in a forbidden land.' },
    { title: 'Half-Life 2', creator: 'Valve', year: '2004', bio: 'A revolutionary first-person shooter that redefined physics-driven interaction, environmental storytelling, and pacing.' },
    { title: 'Disco Elysium', creator: 'ZA/UM', year: '2019', bio: 'A peerless narrative RPG where an amnesiac detective navigates political ruin, existential dread, and internal psyche voices.' },
    { title: 'Silent Hill 2', creator: 'Konami / Team Silent', year: '2001', bio: 'A psychological survival horror benchmark probing guilt, trauma, and human despair in the fog-drenched town of Silent Hill.' },
    { title: 'Portal 2', creator: 'Valve', year: '2011', bio: 'An impeccably engineered spatial puzzle adventure combining pitch-black comedy with brilliant spatial puzzle mechanics.' },
    { title: 'Castlevania: Symphony of the Night', creator: 'Konami', year: '1997', bio: 'The definitive gothic action-adventure that co-birthed the Metroidvania design doctrine with Alucard exploring Dracula’s castle.' },
    { title: 'BioShock', creator: 'Irrational Games', year: '2007', bio: 'An immersive sim exploring the tragic ideological downfall of Andrew Ryan’s undersea objectivist dystopia, Rapture.' },
    { title: 'Dark Souls', creator: 'FromSoftware', year: '2011', bio: 'Hidetaka Miyazaki’s interconnected grim-fantasy opus that reshaped modern action RPGs through unforgiving yet fair combat.' },
    { title: 'Okami', creator: 'Clover Studio', year: '2006', bio: 'A visual marvel styled after Japanese sumi-e watercolor ink wash paintings, following sun goddess Amaterasu.' },
    { title: 'Deus Ex', creator: 'Ion Storm', year: '2000', bio: 'A seminal cyberpunk immersive RPG offering unprecedented player agency, emergent stealth, and philosophical intrigue.' }
  ],
  'movie': [
    { title: 'Seven Samurai', creator: 'Akira Kurosawa', year: '1954', bio: 'Akira Kurosawa’s timeless epic following seven masterless samurai hired to defend a vulnerable farming village from bandits.' },
    { title: '2001: A Space Odyssey', creator: 'Stanley Kubrick', year: '1968', bio: 'Stanley Kubrick’s transcendent sci-fi visual monolith examining human evolution, artificial consciousness, and alien contact.' },
    { title: 'Stalker', creator: 'Andrei Tarkovsky', year: '1979', bio: 'Andrei Tarkovsky’s philosophical sci-fi journey into the Zone, where a mysterious Room is said to fulfill one’s deepest desires.' },
    { title: 'Spirited Away', creator: 'Hayao Miyazaki', year: '2001', bio: 'Hayao Miyazaki’s animated triumph tracing young Chihiro trapped in a supernatural bathhouse for spirits.' },
    { title: 'Blade Runner', creator: 'Ridley Scott', year: '1982', bio: 'The quintessential neo-noir cyberpunk film exploring synthetic humanity and memory through detective Rick Deckard.' },
    { title: 'Apocalypse Now', creator: 'Francis Ford Coppola', year: '1979', bio: 'A hallucinatory descent into psychological madness along the Nung River during the Vietnam War, inspired by Heart of Darkness.' },
    { title: 'Taxi Driver', creator: 'Martin Scorsese', year: '1976', bio: 'Martin Scorsese’s harrowing portrait of urban alienation and moral decay through lonely insomniac veteran Travis Bickle.' },
    { title: 'Parasite', creator: 'Bong Joon-ho', year: '2019', bio: 'A razor-sharp social satire and thriller examining class division and parasitic symbiosis between two starkly disparate families.' },
    { title: 'Rear Window', creator: 'Alfred Hitchcock', year: '1954', bio: 'Alfred Hitchcock’s suspense masterclass in voyeurism as a wheelchair-bound photographer suspects his neighbor of murder.' },
    { title: 'Fargo', creator: 'Joel & Ethan Coen', year: '1996', bio: 'A darkly comedic Minnesota crime story anchored by pregnant police chief Marge Gunderson investigating a bungled kidnapping.' }
  ],
  'tv show': [
    { title: 'The Wire', creator: 'David Simon', year: '2002', bio: 'An unsparing sociological examination of Baltimore institutions across policing, the port, city hall, schools, and journalism.' },
    { title: 'Twin Peaks', creator: 'David Lynch & Mark Frost', year: '1990', bio: 'A surreal mystery investigating the murder of homecoming queen Laura Palmer in an eccentric Pacific Northwest logging town.' },
    { title: 'Mad Men', creator: 'Matthew Weiner', year: '2007', bio: 'A sublime character study tracking enigmatic ad executive Don Draper amidst the seismic cultural shifts of 1960s America.' },
    { title: 'The Sopranos', creator: 'David Chase', year: '1999', bio: 'The groundbreaking crime drama deconstructing modern American masculinity and identity through mob boss Tony Soprano in therapy.' },
    { title: 'Chernobyl', creator: 'Craig Mazin', year: '2019', bio: 'A gripping five-part historical dramatization chronicling the 1986 Soviet nuclear catastrophe and the catastrophic cost of lies.' },
    { title: 'Succession', creator: 'Jesse Armstrong', year: '2018', bio: 'A biting Shakespearean corporate tragicomedy chronicling the ruthless power struggle among the Roy family media dynasty.' },
    { title: 'True Detective (Season 1)', creator: 'Nic Pizzolatto', year: '2014', bio: 'A southern gothic neo-noir detective saga pairing Rust Cohle and Marty Hart over a seventeen-year occult murder investigation.' },
    { title: 'Severance', creator: 'Dan Erickson', year: '2022', bio: 'A dystopian workplace thriller where employees undergo a surgical procedure separating their work and personal memories.' }
  ],
  'music album': [
    { title: 'OK Computer', creator: 'Radiohead', year: '1997', bio: 'A landmark art-rock masterpiece capturing turn-of-the-century technological alienation, consumer numbness, and societal anxiety.' },
    { title: 'The Dark Side of the Moon', creator: 'Pink Floyd', year: '1973', bio: 'A progressive rock benchmark exploring philosophical themes of time, greed, mortality, and mental instability.' },
    { title: 'Kind of Blue', creator: 'Miles Davis', year: '1959', bio: 'The pinnacle modal jazz recording featuring John Coltrane and Bill Evans, celebrated for cool lyricism and spare elegance.' },
    { title: 'To Pimp a Butterfly', creator: 'Kendrick Lamar', year: '2015', bio: 'A monumental hip-hop tapestry fusing jazz, funk, and spoken word to confront institutional racism and personal trauma.' },
    { title: 'Loveless', creator: 'My Bloody Valentine', year: '1991', bio: 'The holy grail of shoegaze, sculpted through Kevin Shields’ shimmering glide guitar and intoxicating sonic textures.' },
    { title: 'Abbey Road', creator: 'The Beatles', year: '1969', bio: 'The triumphant studio culmination of rock’s most influential quartet, crowned by its ambitious side-two medley.' },
    { title: 'Blue', creator: 'Joni Mitchell', year: '1971', bio: 'A confessional folk benchmark of raw vulnerability, exploring love, disillusionment, and self-discovery.' },
    { title: 'Selected Ambient Works 85-92', creator: 'Aphex Twin', year: '1992', bio: 'Richard D. James’ foundational ambient techno release that shaped the sonic grammar of modern electronic music.' }
  ],
  'book': [
    { title: 'One Hundred Years of Solitude', creator: 'Gabriel García Márquez', year: '1967', bio: 'The defining work of magical realism following seven generations of the Buendía family in the mythical town of Macondo.' },
    { title: 'Crime and Punishment', creator: 'Fyodor Dostoevsky', year: '1866', bio: 'A profound psychological exploration of guilt, moral justification, and spiritual redemption through Rodion Raskolnikov.' },
    { title: '1984', creator: 'George Orwell', year: '1949', bio: 'The quintessential dystopian warning against totalitarian surveillance, historical erasure, and linguistic control under Big Brother.' },
    { title: 'The Great Gatsby', creator: 'F. Scott Fitzgerald', year: '1925', bio: 'A lyrical indictment of the American Dream, unrequited obsession, and moral hollows in Jazz Age Long Island.' },
    { title: 'Dune', creator: 'Frank Herbert', year: '1965', bio: 'A monumental science fiction epic weaving ecology, religion, feudal politics, and messianic destiny on the desert planet Arrakis.' },
    { title: 'The Sound and the Fury', creator: 'William Faulkner', year: '1929', bio: 'A modernist stream-of-consciousness tour de force tracking the tragic decay of the aristocratic Compson family in Mississippi.' },
    { title: 'Fahrenheit 451', creator: 'Ray Bradbury', year: '1953', bio: 'A visionary cautionary tale set in a book-burning future where critical thought is sacrificed for mindless hedonism.' },
    { title: 'Blindness', creator: 'José Saramago', year: '1995', bio: 'A searing parable of human nature following the societal collapse caused by a sudden epidemic of white blindness.' }
  ],
  'comic series': [
    { title: 'Watchmen', creator: 'Alan Moore & Dave Gibbons', year: '1986', bio: 'The deconstructionist graphic novel landmark that interrogated the ethics, psychosis, and geopolitical fallout of costumed vigilantes.' },
    { title: 'Sandman', creator: 'Neil Gaiman', year: '1989', bio: 'A dark fantasy mythology following Morpheus, the Lord of Dreams, woven with historical folklore and literary allusion.' },
    { title: 'Maus', creator: 'Art Spiegelman', year: '1991', bio: 'The Pulitzer Prize-winning graphic memoir depicting Spiegelman’s father’s survival of the Holocaust with Jews depicted as mice.' },
    { title: 'Akira', creator: 'Katsuhiro Otomo', year: '1982', bio: 'The sprawling cyberpunk manga epic set in post-apocalyptic Neo-Tokyo, pioneering visual kineticism and psychic dread.' },
    { title: 'Berserk', creator: 'Kentaro Miura', year: '1989', bio: 'A dark fantasy epic of indomitable human will following the black swordsman Guts through war, betrayal, and demonic fate.' },
    { title: 'Saga', creator: 'Brian K. Vaughan & Fiona Staples', year: '2012', bio: 'A space opera fantasy tracing two soldiers from warring extraterrestrial races fighting to raise their hybrid infant daughter.' },
    { title: 'Batman: The Long Halloween', creator: 'Jeph Loeb & Tim Sale', year: '1996', bio: 'A quintessential detective noir following Batman hunting the Holiday serial killer across Gotham’s mob families.' }
  ],
  'board game': [
    { title: 'Settlers of Catan', creator: 'Klaus Teuber', year: '1995', bio: 'The modern classic that ignited the European designer board game boom with resource trading and island colonization.' },
    { title: 'Gloomhaven', creator: 'Isaac Childres', year: '2017', bio: 'A tactical card-driven cooperative fantasy dungeon crawler with persistent legacy campaign mechanics.' },
    { title: 'Carcassonne', creator: 'Klaus-Jürgen Wrede', year: '2000', bio: 'An elegant tile-placement game where players construct medieval French cities, roads, monasteries, and fields.' },
    { title: 'Terraforming Mars', creator: 'Jacob Fryxelius', year: '2016', bio: 'A deep engine-building strategy game where corporations compete to make Mars habitable through oxygen, temperature, and oceans.' },
    { title: 'Pandemic', creator: 'Matt Leacock', year: '2008', bio: 'The definitive cooperative tension game where medical specialists travel the globe to contain four lethal virus outbreaks.' },
    { title: '7 Wonders', creator: 'Antoine Bauza', year: '2010', bio: 'A brisk simultaneous card-drafting civilization builder across three historical ages of architectural mastery.' },
    { title: 'Wingspan', creator: 'Elizabeth Hargrave', year: '2019', bio: 'A celebrated competitive engine-builder focusing on wildlife preservation and avian species habitat management.' },
    { title: 'Azul', creator: 'Michael Kiesling', year: '2017', bio: 'A pristine abstract tile-drafting game inspired by Portuguese azulejo ceramic craftsmanship.' }
  ],
  'painting': [
    { title: 'The Starry Night', creator: 'Vincent van Gogh', year: '1889', bio: 'Vincent van Gogh’s post-impressionist masterpiece capturing swirling celestial energies above Saint-Rémy-de-Provence.' },
    { title: 'Guernica', creator: 'Pablo Picasso', year: '1937', bio: 'Pablo Picasso’s monumental anti-war mural depicting the horrific aerial bombing of the Basque town during the Spanish Civil War.' },
    { title: 'The Persistence of Memory', creator: 'Salvador Dalí', year: '1931', bio: 'Salvador Dalí’s surrealist icon depicting melting pocket watches draped over barren Catalan coastlines.' },
    { title: 'Girl with a Pearl Earring', creator: 'Johannes Vermeer', year: '1665', bio: 'Johannes Vermeer’s luminous Dutch Golden Age tronie renowned for the enigmatic gaze and exquisite handling of light.' },
    { title: 'The Great Wave off Kanagawa', creator: 'Katsushika Hokusai', year: '1831', bio: 'Katsushika Hokusai’s world-renowned ukiyo-e woodblock print framing Mount Fuji beneath a towering crested ocean wave.' },
    { title: 'The Night Watch', creator: 'Rembrandt van Rijn', year: '1642', bio: 'Rembrandt’s colossal civic guard group portrait celebrated for dramatic chiaroscuro and kinetic composition.' },
    { title: 'The Kiss', creator: 'Gustav Klimt', year: '1908', bio: 'The high point of Gustav Klimt’s Golden Phase, depicting an embracing couple veiled in ornate gold leaf and art nouveau patterns.' },
    { title: 'Wanderer above the Sea of Fog', creator: 'Caspar David Friedrich', year: '1818', bio: 'The defining icon of Romanticism depicting a lone traveler atop a precipice gazing out at an ethereal sea of mountain mist.' }
  ]
};

function normalizeTitle(t) {
  if (!t) return '';
  return t
    .toLowerCase()
    .replace(/^["'“‘«\s]+|["'”’»\s]+$/g, '')
    .trim();
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
    const { category, existingTitles = [], dismissedTitles = [] } = req.body || {};

    if (!category || typeof category !== 'string') {
      return res.status(400).json({ error: 'Category is required' });
    }

    const normCategory = category.trim().toLowerCase();
    const existingSet = new Set(existingTitles.map(normalizeTitle));
    const dismissedSet = new Set(dismissedTitles.map(normalizeTitle));

    const isExcluded = (title) => {
      const norm = normalizeTitle(title);
      return existingSet.has(norm) || dismissedSet.has(norm);
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

        // Provide a balanced sample of existing items so prompt stays concise
        const existingSample = existingTitles.slice(0, 150);
        const dismissedSample = dismissedTitles.slice(0, 100);

        const prompt = `You are a cultural media curator and archivist with exhaustive knowledge across all arts, entertainment, and human media history.
The user is managing a comprehensive Bingo archive collection for the specific category: "${normCategory}".

Category guidance:
- "video game": Real, acclaimed or historically notable video games (PC, console, arcade, indie). Include title, studio/developer, release year, and a factual 1-2 sentence bio.
- "movie": Real, notable films across international and domestic cinema. Include title, director, release year, and a factual 1-2 sentence bio.
- "tv show": Real, celebrated television series or miniseries. Include title, creator/network, release years, and a factual 1-2 sentence bio.
- "music album": Real, seminal music albums across all genres. Include album title, artist/band, release year, and a factual 1-2 sentence bio.
- "book": Real, revered literary novels, nonfiction classics, or philosophical treatises. Include title, author, publication year, and a factual 1-2 sentence bio.
- "comic series": Real comic book series, graphic novels, or manga. Include title, creator/writer, run years, and a factual 1-2 sentence bio.
- "board game": Real modern designer tabletop games or historical strategy games. Include title, designer/publisher, release year, and a factual 1-2 sentence bio.
- "painting": Real famous paintings and fine art masterworks. Include painting title, painter, creation year, and a factual 1-2 sentence bio.

Current cards already in this category (${existingTitles.length} items):
${JSON.stringify(existingSample)}

Permanently dismissed titles that must NEVER be recommended:
${JSON.stringify(dismissedSample)}

CRITICAL RULES:
1. Every recommendation MUST be a REAL item that truly exists in the world in the "${normCategory}" category. Absolute factual accuracy is required.
2. DO NOT include any item that is already in the existing cards or in the dismissed list.
3. Provide 8 to 12 diverse, high-caliber recommendations that would be worthy additions to an enthusiast's collection.
4. Each recommendation must have:
   - title: Exact canonical title
   - creator: Primary creator, artist, director, author, or developer
   - year: Year or timeframe of release
   - bio: 1-2 factual sentences describing what it is, its acclaim, or its signature achievement.`;

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
                      title: { type: Type.STRING, description: 'Canonical title of the real work.' },
                      creator: { type: Type.STRING, description: 'Creator, author, artist, or developer.' },
                      year: { type: Type.STRING, description: 'Year or release period.' },
                      bio: { type: Type.STRING, description: 'Accurate 1-2 sentence summary.' },
                    },
                    required: ['title', 'creator', 'bio'],
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
            const cleanRecs = parsed.recommendations
              .filter((rec) => rec && rec.title && !isExcluded(rec.title))
              .map((rec) => ({
                title: rec.title.trim(),
                creator: (rec.creator || '').trim(),
                year: (rec.year || '').trim(),
                bio: (rec.bio || '').trim(),
              }));

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

    // Fallback to curated accurate recommendations
    const pool = CURATED_FALLBACKS[normCategory] || [];
    const filteredFallback = pool
      .filter((item) => !isExcluded(item.title))
      .slice(0, 10);

    return res.status(200).json({
      success: true,
      source: 'curated',
      category: normCategory,
      recommendations: filteredFallback,
    });
  } catch (error) {
    console.error('Error in /api/bingo-recommendations:', error);
    return res.status(500).json({
      error: error.message || 'Failed to generate recommendations',
    });
  }
}
