import { describe, it, expect } from 'vitest';
import { getMediaTypeDisplay } from '../mediaType';
import type { Media } from '../tmdb';

describe('getMediaTypeDisplay - bug reproduction (media-type-display-mainpage-001)', () => {
  /**
   * Bug: На главной странице отображается "Фильм" для всех типов контента.
   * 
   * Root cause: fetchTrendingMovies/fetchPopularMovies не передают genre_ids и original_language
   * в преобразованные данные, поэтому функция getMediaTypeDisplay не может определить
   * тип контента правильно.
   * 
   * Эти тесты воспроизводят баг: проверяют ожидаемые правильные значения,
   * но получают "Фильм" из-за отсутствия данных genre_ids и original_language.
   */

  it('should return "Аниме" for Japanese animation', () => {
    // Данные с полными полями для корректного определения аниме
    const media: Media = {
      id: 1,
      media_type: 'movie',
      title: 'Аниме',
      poster_path: null,
      vote_average: 0,
      vote_count: 0,
      overview: '',
      genre_ids: [16], // Animation genre
      original_language: 'ja', // Japanese
    };
    
    const result = getMediaTypeDisplay(media);
    
    expect(result.label).toBe('Аниме');
  });

  it('should return "Мульт" for Western animation', () => {
    // Данные с полными полями для корректного определения мультфильма
    const media: Media = {
      id: 2,
      media_type: 'movie',
      title: 'Мульт',
      poster_path: null,
      vote_average: 0,
      vote_count: 0,
      overview: '',
      genre_ids: [16], // Animation genre
      original_language: 'en', // Non-Japanese
    };
    
    const result = getMediaTypeDisplay(media);
    
    expect(result.label).toBe('Мульт');
  });

  it('should return "Сериал" for TV show', () => {
    // Данные с правильным media_type для TV
    const media: Media = {
      id: 3,
      media_type: 'tv',
      name: 'Сериал',
      title: 'Сериал', // required field
      poster_path: null,
      vote_average: 0,
      vote_count: 0,
      overview: '',
    };
    
    const result = getMediaTypeDisplay(media);
    
    expect(result.label).toBe('Сериал');
  });
});
