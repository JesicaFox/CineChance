import { ContentType, ListType } from '@/lib/recommendation-types';

export interface AdditionalFilters {
  minRating: number;
  yearFrom: string;
  yearTo: string;
  selectedGenres: number[];
  selectedTags: string[];
}

export interface FilterValidationError {
  field: string;
  message: string;
}

/**
 * Валидация фильтров рекомендаций
 */
export function validateFilters(
  types: ContentType[],
  lists: ListType[],
  additionalFilters?: AdditionalFilters
): FilterValidationError[] {
  const errors: FilterValidationError[] = [];

  // Валидация типов контента
  if (types.length === 0) {
    errors.push({
      field: 'types',
      message: 'Выберите хотя бы один тип контента'
    });
  }

  // Валидация списков
  if (lists.length === 0) {
    errors.push({
      field: 'lists',
      message: 'Выберите хотя бы один список'
    });
  }

  // Валидация дополнительных фильтров
  if (additionalFilters) {
    // Валидация рейтинга
    if (additionalFilters.minRating < 0 || additionalFilters.minRating > 10) {
      errors.push({
        field: 'minRating',
        message: 'Рейтинг должен быть в диапазоне от 0 до 10'
      });
    }

    // Валидация года
    if (additionalFilters.yearFrom) {
      const yearFromNum = parseInt(additionalFilters.yearFrom);
      const currentYear = new Date().getFullYear();
      
      if (isNaN(yearFromNum) || yearFromNum < 1900 || yearFromNum > currentYear + 5) {
        errors.push({
          field: 'yearFrom',
          message: `Год должен быть в диапазоне от 1900 до ${currentYear + 5}`
        });
      }
    }

    if (additionalFilters.yearTo) {
      const yearToNum = parseInt(additionalFilters.yearTo);
      const currentYear = new Date().getFullYear();
      
      if (isNaN(yearToNum) || yearToNum < 1900 || yearToNum > currentYear + 5) {
        errors.push({
          field: 'yearTo',
          message: `Год должен быть в диапазоне от 1900 до ${currentYear + 5}`
        });
      }
    }

    // Валидация диапазона годов
    if (additionalFilters.yearFrom && additionalFilters.yearTo) {
      const yearFromNum = parseInt(additionalFilters.yearFrom);
      const yearToNum = parseInt(additionalFilters.yearTo);
      
      if (!isNaN(yearFromNum) && !isNaN(yearToNum) && yearFromNum > yearToNum) {
        errors.push({
          field: 'yearRange',
          message: 'Год "От" не может быть больше года "До"'
        });
      }
    }

    // Валидация жанров
    if (additionalFilters.selectedGenres.length > 10) {
      errors.push({
        field: 'selectedGenres',
        message: 'Можно выбрать не более 10 жанров'
      });
    }

    // Валидация тегов
    if (additionalFilters.selectedTags.length > 20) {
      errors.push({
        field: 'selectedTags',
        message: 'Можно выбрать не более 20 тегов'
      });
    }
  }

  return errors;
}

/**
 * Проверяет, являются ли фильтры валидными
 */
export function areFiltersValid(
  types: ContentType[],
  lists: ListType[],
  additionalFilters?: AdditionalFilters
): boolean {
  const errors = validateFilters(types, lists, additionalFilters);
  return errors.length === 0;
}

/**
 * Получает первое сообщение об ошибке
 */
export function getFirstValidationError(
  types: ContentType[],
  lists: ListType[],
  additionalFilters?: AdditionalFilters
): string | null {
  const errors = validateFilters(types, lists, additionalFilters);
  return errors.length > 0 ? errors[0].message : null;
}

/**
 * Очищает и нормализует фильтры
 */
export function normalizeFilters(
  types: ContentType[],
  lists: ListType[],
  additionalFilters?: AdditionalFilters
): {
  types: ContentType[];
  lists: ListType[];
  additionalFilters?: AdditionalFilters;
} {
  // Нормализация типов
  const normalizedTypes = types.filter(type => 
    ['movie', 'tv', 'anime'].includes(type)
  );

  // Нормализация списков
  const normalizedLists = lists.filter(list => 
    ['want', 'watched', 'dropped'].includes(list)
  );

  // Нормализация дополнительных фильтров
  let normalizedAdditionalFilters: AdditionalFilters | undefined;
  
  if (additionalFilters) {
    normalizedAdditionalFilters = {
      minRating: Math.max(0, Math.min(10, additionalFilters.minRating || 0)),
      yearFrom: additionalFilters.yearFrom ? 
        Math.max(1900, Math.min(new Date().getFullYear() + 5, parseInt(additionalFilters.yearFrom) || 1900)).toString() : '',
      yearTo: additionalFilters.yearTo ? 
        Math.max(1900, Math.min(new Date().getFullYear() + 5, parseInt(additionalFilters.yearTo) || 1900)).toString() : '',
      selectedGenres: additionalFilters.selectedGenres.slice(0, 10),
      selectedTags: additionalFilters.selectedTags.slice(0, 20),
    };
  }

  return {
    types: normalizedTypes,
    lists: normalizedLists,
    additionalFilters: normalizedAdditionalFilters
  };
}
