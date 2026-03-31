/**
 * Переведенные названия жанров (английский → русский)
 * Сопоставляет английские названия жанров TMDB с русскими переводами
 */

export const GENRE_TRANSLATIONS: Record<string, string> = {
  // TMDB Genres
  'Action': 'Боевик',
  'Adventure': 'Приключения',
  'Animation': 'Анимация',
  'Comedy': 'Комедия',
  'Crime': 'Криминал',
  'Documentary': 'Документальный',
  'Drama': 'Драма',
  'Family': 'Семейный',
  'Fantasy': 'Фэнтези',
  'History': 'Исторический',
  'Horror': 'Ужасы',
  'Music': 'Музыка',
  'Mystery': 'Мистика',
  'Romance': 'Мелодрама',
  'Science Fiction': 'Научная фантастика',
  'TV Movie': 'Телефильм',
  'Thriller': 'Триллер',
  'War': 'Военный',
  'Western': 'Вестерн',
  // Anime-specific genres (если используются)
  'Action Anime': 'Аниме: боевик',
  'Adventure Anime': 'Аниме: приключения',
  'Comedy Anime': 'Аниме: комедия',
  'Drama Anime': 'Аниме: драма',
  'Fantasy Anime': 'Аниме: фэнтези',
  'Horror Anime': 'Аниме: ужасы',
  'Mecha Anime': 'Аниме: меха',
  'Music Anime': 'Аниме: музыка',
  'Mystery Anime': 'Аниме: мистика',
  'Psychological Anime': 'Аниме: психологическое',
  'Romance Anime': 'Аниме: романтика',
  'Sci-Fi Anime': 'Аниме: научная фантастика',
  'Slice of Life Anime': 'Аниме: повседневность',
  'Sports Anime': 'Аниме: спорт',
  'Supernatural Anime': 'Аниме: сверхъестественное',
  'Thriller Anime': 'Аниме: триллер',
};

/**
 * Перевести название жанра на русский
 * @param genre - английское название жанра
 * @returns русское название или исходное, если перевод не найден
 */
export function translateGenre(genre: string): string {
  return GENRE_TRANSLATIONS[genre] || genre;
}
