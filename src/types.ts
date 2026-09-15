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
  review?: string; // Linear long-form review article
  pros?: string[];
  cons?: string[];
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
  description?: string;
  color: string;
  bgBadge: string;
}

export const RATING_SCALE_LEVELS: RatingLevel[] = [
  { score: 10, label: 'Hornet Essential', color: 'text-purple-300', bgBadge: 'bg-purple-500/20 text-purple-300 border-purple-500/50' },
  { score: 9, label: 'Masterpiece', color: 'text-purple-400', bgBadge: 'bg-purple-500/20 text-purple-300 border-purple-500/50' },
  { score: 8, label: 'Exceptional', color: 'text-sky-400', bgBadge: 'bg-sky-500/20 text-sky-300 border-sky-500/50' },
  { score: 7, label: 'Fascinating', color: 'text-blue-400', bgBadge: 'bg-blue-500/20 text-blue-300 border-blue-500/50' },
  { score: 6, label: 'Great', color: 'text-emerald-400', bgBadge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50' },
  { score: 5, label: 'Good', color: 'text-green-400', bgBadge: 'bg-green-500/20 text-green-300 border-green-500/50' },
  { score: 4, label: 'Average', color: 'text-yellow-400', bgBadge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50' },
  { score: 3, label: 'Weak', color: 'text-orange-400', bgBadge: 'bg-orange-950/60 text-orange-400 border-orange-800/50' },
  { score: 2, label: 'Mediocre', color: 'text-amber-600', bgBadge: 'bg-amber-950/60 text-amber-500 border-amber-800/50' },
  { score: 1, label: 'Bad', color: 'text-rose-500', bgBadge: 'bg-rose-950/60 text-rose-400 border-rose-800/50' },
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

export function getItemReview(item: Partial<MediaItem>): string {
  if (item.review && item.review.trim()) {
    return item.review.trim();
  }
  const parts: string[] = [];
  if (Array.isArray(item.pros) && item.pros.length > 0) {
    const prosText = item.pros.filter(Boolean).join('\n\n');
    if (prosText) parts.push(prosText);
  }
  if (Array.isArray(item.cons) && item.cons.length > 0) {
    const consText = item.cons.filter(Boolean).join('\n\n');
    if (consText) parts.push(consText);
  }
  return parts.join('\n\n');
}

export const DEFAULT_SCORING_PHILOSOPHY = `My scoring starts with the experience I actually have with a work: what it gives me, how strongly its parts affect that experience, and how those parts function together. I don't use a fixed checklist or universal hierarchy of qualities. Emotional, mechanical, narrative, visual, structural, or other qualities matter only to the extent that they matter in the particular work. Something being complex, simple, polished, difficult, innovative, realistic, ambiguous, or unconventional is not automatically good or bad. I care about what those qualities actually produce.

Commercial success, release date, historical importance, cultural reputation, influence, production difficulty, and other external circumstances do not earn or lose points merely by existing. They can explain a work, and they can be interesting or important in their own right, without determining how highly I rate the experience of the work itself.

I experience older work from the present, because that's the only perspective I genuinely have. I wasn't there when it was released, and I don't think pretending otherwise would make my judgment more honest. Historical context can explain why something looks, sounds, or functions the way it does, but explanation isn't evaluation. I don't raise or lower a score according to what was impressive, innovative, acceptable, or technically difficult for its time. The work meets me now, so I judge the experience it creates now. At the same time, I don't punish an older work simply because newer technology exists. A limitation matters when I actually experience its consequences in the work, not because something made later can do it better.

The same applies to artistic intent. Knowing what an artist wanted to achieve can help explain a choice, but it doesn't determine whether that choice works for me. “That's the point” can explain why an unpleasant, repetitive, confusing, empty, or frustrating effect exists; it cannot automatically make that effect valuable. Understanding an intention can clarify what a choice is attempting, but the intention itself does not earn evaluative weight. What matters is what that choice actually produces in the experience.

Biography and production circumstances work similarly. An artist's life, effort, suffering, limitations, process, or personal reasons for making something can deepen my understanding of how the work came to exist, and I can respect those things without treating them as qualities of the finished work. Difficulty doesn't guarantee achievement, and sincerity doesn't guarantee that an idea lands. My score concerns what reached me through the work rather than what the creator went through while making it.

This isn't disrespect toward artists. If anything, I take the work seriously enough to let it stand on what it actually communicates. I don't think appreciation requires gratitude to become part of criticism, and I don't think disliking something admired by others implies that its creators or audience misunderstood art. A work can be important, influential, difficult to make, deeply sincere, and loved by millions while still doing very little for me. None of those facts need to be denied for my reaction to remain what it is.

External context can still matter when it enters the experience itself. My own familiarity, expectations, cultural associations, prior knowledge, mood, memories, or other circumstances can change what I actually perceive and feel. I don't pretend to encounter art from a neutral position. The distinction is that an external fact doesn't receive evaluative weight merely because it exists; it matters when it produces a real consequence in my encounter with the work.

I also don't consider these ratings objective judgments or claims to authority. They're deliberately personal. I don't believe there is one correct way to experience art. I review from my own experience because that's the only experience I can report honestly. Someone else can value completely different things, notice things I don't, dislike what I love, or love what I dislike without either of us having experienced the work incorrectly. No one has to adopt my standards for their own relationship with art.

That doesn't mean every judgment I make is equally well reasoned. I still care deeply about making my own evaluations internally consistent. I want similar reasoning to survive similar challenges, while still allowing the importance of an element to change according to the particular work and experience. Disagreement is more interesting to me than agreement for its own sake, especially when it exposes something I missed, reveals an inconsistency, or forces me to reconsider why I value something.

My opinions can change as I change. I don't expect my judgments to survive every future culture, generation, or version of myself, and I don't need them to. I'm evaluating the encounter I can actually have in the present, with my own history and sensibilities. The purpose of the score isn't to decide where a work belongs forever. It's to describe, as accurately and consistently as I can, what the work is worth to me when I experience it.`;

