export type MediaFormat =
  | 'Film'
  | 'Video Game'
  | 'Music Album'
  | 'Painting'
  | 'Artwork'
  | 'TV Show'
  | 'Comic/Manga Series'
  | 'Book'
  | 'Board Game'
  | 'Custom Category'
  | string;

export const ALL_MEDIA_FORMATS: MediaFormat[] = [
  'Film',
  'Video Game',
  'Music Album',
  'Painting',
  'Artwork',
  'TV Show',
  'Comic/Manga Series',
  'Book',
  'Board Game',
  'Custom Category',
];

export type CreatorCategory =
  | 'Author'
  | 'Director'
  | 'Production Artist'
  | 'Music Artist'
  | 'Band'
  | 'Painter'
  | 'Game Designer'
  | 'Developer'
  | 'Studio / Company'
  | 'Other';

export type CreatorCategoryType = CreatorCategory;

export interface BandMember {
  name: string;
  bandRole: string; // e.g. "Guitarist", "Vocalist", "Bass Player", "Drummer", "Keyboardist"
  joinedYear?: string;
  leftYear?: string;
  participatedInProduct?: boolean; // Whether member worked on this specific item
  productRole?: string; // Role on this specific item (e.g. "Lead Guitar & Backing Vocals")
  wikiUrl?: string;
  photoUrl?: string;
}

export interface CreatorDetails {
  name: string;
  category: CreatorCategoryType;
  nation?: string; // Country / Nationality of creator e.g. "Japan", "United States"
  wikiUrl?: string;
  wikiTitle?: string;
  customBio?: string;
  photoUrl?: string;
  personalityTags?: string[]; // Personality tags for creator bio
  bandMembers?: BandMember[];
}

export interface MediaRelationEntry {
  title: string;
  type?: 'media' | 'creator'; // Explicitly distinguish if influence is a creator/artist vs media
  customCover?: string; // Optional cover or portrait image
  note?: string; // Optional context e.g. "Direct narrative influence", "Key artistic inspiration"
  unlinked?: boolean; // Set to true if admin explicitly validated that this reference should NOT link to an entry sharing the same name
}

export interface MediaLink {
  id: string;
  label: string;
  url: string;
}

export interface MediaItem {
  id: string;
  cover: string; // Image URL
  title: string;
  mainCreator: string; // e.g. "Hidetaka Miyazaki"
  otherCreators: string[]; // e.g. ["Yuka Kitamura", "George R.R. Martin"]
  creatorDetails?: CreatorDetails[]; // Detailed creator info with category, nation & wiki
  mediaFormat: MediaFormat;
  releaseDate: string; // YYYY-MM-DD or YYYY
  countryOfOrigin?: string; // Nation/Country where created e.g. "Japan", "United States"
  originalLanguage?: string; // Original language e.g. "Japanese", "English"
  genres: string[]; // e.g. ["Action RPG", "Dark Fantasy"]
  philosophicalTags: string[]; // e.g. ["Existentialism", "Absurdism"]
  genreStyleTags: string[]; // e.g. ["Grimdark", "Cyberpunk"]
  summaryPlot?: string; // Summary plot or premise
  pros: string[];
  cons: string[];
  hornetScore: number; // 1 to 10 scale
  hornetVerdict?: string; // Quick commentary
  similarMedia: (string | MediaRelationEntry)[]; // Array of titles or rich media relation objects
  mediumInfluences?: (string | MediaRelationEntry)[]; // Medium influences / artistic inspirations
  links: MediaLink[];
  consumedVersion?: string; // e.g. "Vinyl", "Digital", "PS2", "PSP", "Nintendo 64"
  isCustomCategory?: boolean; // True if item belongs to a custom category (e.g. Song, Boss Fight, Random Review)
  customCategoryName?: string; // Custom category label (e.g. "Boss Fight", "Song Review")
  isSoundtrack?: boolean; // True if this Music Album is an OST
  soundtrackForId?: string; // ID of parent media item this soundtrack is for
  soundtrackForTitle?: string; // Title of parent media item this soundtrack is for
  soundtrackId?: string; // Legacy ID of associated soundtrack album
  soundtrackTitle?: string; // Legacy Title of associated soundtrack album
  soundtracks?: { id?: string; title: string }[]; // Array of multiple associated soundtrack entries
  createdAt: string;
  updatedAt: string;
}

export interface FilterOptions {
  searchQuery: string;
  formats: MediaFormat[];
  selectedGenres: string[];
  selectedPhilosophicalTags: string[];
  selectedStyleTags: string[];
  selectedConsumedVersions: string[];
  selectedDecades: string[];
  selectedCountries?: string[];
  selectedLanguages?: string[];
  minScore: number; // 0 to 10
  maxScore: number; // 0 to 10
  releaseYearStart: number | null;
  releaseYearEnd: number | null;
  tagLogic: 'AND' | 'OR';
  sortBy: 'quality' | 'random' | 'score_desc' | 'score_asc' | 'release_desc' | 'release_asc' | 'title' | 'date_added';
}

export interface RatingLevel {
  score: number;
  label: string;
  description: string;
  color: string;
  bgBadge: string;
}

export interface ScoreAuditSuggestion {
  id: string;
  item?: MediaItem;
  currentScore: number;
  suggestedScore: number;
  critique: string;
  imbalanceReason?: string;
  confidence?: 'high' | 'medium';
  isDismissed?: boolean;
}

export interface AlignedAuditItem {
  id: string;
  item?: MediaItem;
  currentScore: number;
  alignmentNote: string;
}

export const RATING_SCALE_LEVELS: RatingLevel[] = [
  { score: 10, label: 'Hornet Essential', description: 'Peak media for Hornet. Transcendent artistic pinnacle with permanent personal resonance.', color: 'text-purple-300', bgBadge: 'bg-purple-500/20 text-purple-300 border-purple-500/50' },
  { score: 9, label: 'Masterpiece', description: 'Flawless work. A monumental achievement with profound vision and faultless execution.', color: 'text-purple-400', bgBadge: 'bg-purple-500/20 text-purple-300 border-purple-500/50' },
  { score: 8, label: 'Exceptional', description: 'Outstanding release that excels in core mechanics, narrative depth, or thematic resonance.', color: 'text-sky-400', bgBadge: 'bg-sky-500/20 text-sky-300 border-sky-500/50' },
  { score: 7, label: 'Fascinating', description: 'Deeply engaging work with standout artistic qualities, unique style, or ambitious ideas.', color: 'text-blue-400', bgBadge: 'bg-blue-500/20 text-blue-300 border-blue-500/50' },
  { score: 6, label: 'Great', description: 'Very good experience with distinct strengths, engaging rhythm, and strong craft.', color: 'text-emerald-400', bgBadge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' },
  { score: 5, label: 'Good', description: 'Solid, enjoyable, and well-executed experience worthy of time and reflection.', color: 'text-green-400', bgBadge: 'bg-green-500/20 text-green-300 border-green-500/50' },
  { score: 4, label: 'Average', description: 'Capable and decent, hits standard genre expectations without pushing boundaries.', color: 'text-yellow-400', bgBadge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50' },
  { score: 3, label: 'Weak', description: 'Contains functional and well-thought elements, but weighted down by higher-scaled cons or execution drawbacks.', color: 'text-orange-400', bgBadge: 'bg-orange-950/60 text-orange-400 border-orange-800/50' },
  { score: 2, label: 'Mediocre', description: 'Has occasional interesting ideas, but suffers from significant execution issues or narrative inconsistencies.', color: 'text-amber-600', bgBadge: 'bg-amber-950/60 text-amber-500 border-amber-800/50' },
  { score: 1, label: 'Bad', description: 'Substantially flawed across core elements with minimal redeeming qualities.', color: 'text-rose-500', bgBadge: 'bg-rose-950/60 text-rose-400 border-rose-800/50' },
];

export function getScoreLabel(score: number): string {
  const rounded = Math.round(score);
  const level = RATING_SCALE_LEVELS.find((l) => l.score === rounded);
  return level ? level.label : 'Unrated';
}

export function getScoreLevelInfo(score: number): RatingLevel {
  const rounded = Math.max(1, Math.min(10, Math.round(score)));
  return RATING_SCALE_LEVELS.find((l) => l.score === rounded) || RATING_SCALE_LEVELS[3];
}

export const DEFAULT_SCORING_PHILOSOPHY =
  "Scoring philosophy values the lived experience, structural consistency, emotional depth and content & mechanism above all else. External factors such as commercial sales, mainstream hype or historical influence are entirely disregarded unless they directly impact the artistic or interactive experience itself. I'm not a historian that must act like I lived in 1996 when rating a 1996-made video game, that's fake. Also I hate 'that's the point' defense. I don't have to do mental gymnastics to trying to guess what does the creator trying to tell, I don't agree that art is any communication and I don't owe nothing to artist, it's actually more human to misunderstand than acting like you care about the personality of the creator. Never come up with 'you missed the point, product aims for different genre, style or elements.' I'm almost always aware but I simply don't care. I consume and critic for myself proudly, no point of roleplaying as someone who were living in 1940 when judging a book from 1940s, that's fake, plastic and anti-experience, no point of acting like anyone's taste is authority or any objective at all. I'm aware a book released in 1940s is written for people living in 1940s but then I should haven't even have access to that piece, I should haven't pay for that then experience it. Writing this here just so I wouldn't have to deal with historian consumers later on. I'm here for a couple of decades as a human being, my opinion will be dated 200 years later but I never lived in the past and will never see the future. I use Death of the Author-alike philosophy because I read every single counter argument made to it and honestly none of them convinced me because it's all countered with the values philosophy already rejects (such as context exist, intent exist... Yeah they do but I don't care), I feel like the ideology is highly misunderstood too. At the end of the day, I hope you enjoy my observations and takes and find it interesting.";

