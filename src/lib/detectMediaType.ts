// src/lib/detectMediaType.ts
// Определяет mediaType для watchList: 'anime', 'cartoon', 'movie', 'tv'

export function detectMediaType({ genre_ids, original_language, media_type }: {
  genre_ids: number[];
  original_language: string;
  media_type: 'movie' | 'tv' | 'anime' | 'cartoon';
}): 'anime' | 'cartoon' | 'movie' | 'tv' {
  const isAnimation = genre_ids.includes(16);
  if (isAnimation && original_language === 'ja') return 'anime';
  if (isAnimation && original_language !== 'ja') return 'cartoon';
  return media_type;
}
