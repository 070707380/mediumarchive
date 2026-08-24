/**
 * Comprehensive collection of English stopwords, conversational fillers, 
 * conjunctions, prepositions, auxiliary verbs, and generic review terms.
 */
export const STOPWORDS = new Set([
  // Articles & Demonstratives
  'the', 'this', 'that', 'these', 'those', 'a', 'an',

  // Pronouns
  'i', 'me', 'my', 'myself', 'we', 'us', 'our', 'ours', 'ourselves',
  'you', 'your', 'yours', 'yourself', 'yourselves',
  'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself',
  'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves',
  'what', 'which', 'who', 'whom', 'whose', 'whatever', 'whichever', 'whoever', 'whomever',
  'someone', 'somebody', 'something', 'anyone', 'anybody', 'anything',
  'everyone', 'everybody', 'everything', 'noone', 'nobody', 'nothing',
  'some', 'such', 'each', 'every', 'all', 'both', 'few', 'more', 'most',
  'other', 'others', 'another', 'either', 'neither', 'none', 'many', 'much',

  // Prepositions & Conjunctions
  'and', 'or', 'but', 'nor', 'so', 'yet', 'if', 'because', 'as', 'until', 'while', 'whilst',
  'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'throughout',
  'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out',
  'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'across', 'along',
  'behind', 'beyond', 'within', 'without', 'upon', 'concerning', 'toward', 'towards',
  'although', 'though', 'even', 'unless', 'except', 'whether', 'whereas', 'wherever', 'whenever',

  // Auxiliary & Common Verbs
  'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'done',
  'would', 'should', 'could', 'ought', 'might', 'must', 'can', 'cant', 'cannot', 'will', 'wont', 'shall',
  'look', 'looks', 'looked', 'looking', 'feel', 'feels', 'felt', 'feeling',
  'make', 'makes', 'made', 'making', 'take', 'takes', 'took', 'taken', 'taking',
  'give', 'gives', 'gave', 'given', 'giving', 'get', 'gets', 'got', 'gotten', 'getting',
  'come', 'comes', 'came', 'coming', 'go', 'goes', 'went', 'gone', 'going',
  'see', 'sees', 'saw', 'seen', 'seeing', 'seem', 'seems', 'seemed', 'seeming',
  'appear', 'appears', 'appeared', 'appearing', 'become', 'becomes', 'became', 'becoming',
  'mean', 'means', 'meant', 'meaning', 'show', 'shows', 'showed', 'shown', 'showing',
  'keep', 'keeps', 'kept', 'keeping', 'let', 'lets', 'need', 'needs', 'needed',
  'want', 'wants', 'wanted', 'try', 'tries', 'tried', 'trying',
  'tell', 'tells', 'told', 'use', 'uses', 'used', 'using', 'put', 'puts',

  // Conversational Fillers, Adverbs & Qualifiers
  'actually', 'really', 'very', 'quite', 'pretty', 'almost', 'already',
  'always', 'never', 'sometimes', 'often', 'rarely', 'seldom', 'usually',
  'mostly', 'mainly', 'generally', 'simply', 'just', 'only', 'also', 'too',
  'well', 'rather', 'instead', 'however', 'therefore', 'thus', 'hence',
  'furthermore', 'moreover', 'otherwise', 'anyway', 'besides', 'perhaps',
  'maybe', 'probably', 'possibly', 'definitely', 'certainly', 'completely',
  'totally', 'entirely', 'extremely', 'highly', 'especially', 'particularly',
  'specifically', 'relatively', 'slightly', 'nearly', 'obviously', 'clearly',
  'surely', 'somehow', 'somewhat', 'anywhere', 'everywhere', 'nowhere',
  'somewhere', 'anytime', 'frankly', 'honestly', 'basically', 'literally',
  'essentially', 'truly', 'sure', 'fine', 'okay', 'like', 'likes', 'liked',

  // Generic Media, Evaluation & Review Fillers
  'good', 'great', 'bad', 'worse', 'worst', 'better', 'best', 'nice', 'poor',
  'cool', 'decent', 'solid', 'terrible', 'awful', 'amazing', 'awesome',
  'excellent', 'perfect', 'true', 'real', 'item', 'items', 'thing', 'things',
  'part', 'parts', 'aspect', 'aspects', 'element', 'elements', 'side', 'sides',
  'way', 'ways', 'time', 'times', 'lot', 'lots', 'bit', 'bits', 'piece', 'pieces',
  'point', 'points', 'factor', 'factors', 'detail', 'details', 'feature', 'features',
  'content', 'overall', 'general', 'review', 'reviews', 'rating', 'ratings',
  'score', 'scores', 'opinion', 'pros', 'cons', 'note', 'notes', 'quality',
  'level', 'work', 'works', 'title', 'author', 'creator', 'artist', 'director',
  'producer', 'actor', 'writer', 'media', 'medium', 'format', 'game', 'games',
  'film', 'films', 'movie', 'movies', 'track', 'tracks', 'album', 'albums',
  'song', 'songs', 'sound', 'audio', 'visual', 'video', 'book', 'books',
  'show', 'shows', 'series', 'season', 'episode', 'episodes', 'chapter', 'chapters',
  'story', 'plot', 'character', 'characters', 'premise', 'ending', 'beginning',
  'middle', 'scene', 'scenes', 'moment', 'moments', 'entry', 'entries',
  'version', 'edition', 'release', 'released', 'original', 'remake', 'sequel',
  'prequel', 'adaptation', 'style', 'genre', 'genres', 'etc'
]);

/**
 * Extracts meaningful thematic keyword tokens from an array of text snippets,
 * stripping out punctuation, numbers, short words (<=3 chars), and generic stopwords.
 */
export function extractThematicKeywords(texts: (string | undefined | null)[]): Set<string> {
  const rawString = texts.filter(Boolean).join(' ').toLowerCase();
  // Strip punctuation and normalize whitespace
  const words = rawString.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/);
  
  return new Set(
    words.filter((w) => {
      // Must be at least 4 letters
      if (w.length <= 3) return false;
      // Must not be a pure number or digit-heavy token
      if (/^\d+$/.test(w)) return false;
      // Must not be in the comprehensive stopwords list
      if (STOPWORDS.has(w)) return false;
      return true;
    })
  );
}
