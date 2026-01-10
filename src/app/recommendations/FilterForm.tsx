// src/app/recommendations/FilterForm.tsx
'use client';

import { useState, useCallback } from 'react';

type ContentType = 'movie' | 'tv' | 'anime';
type ListType = 'want' | 'watched';

interface AdditionalFilters {
  minRating: number;
  maxRating: number;
  yearFrom: string;
  yearTo: string;
  selectedGenres: number[];
}

interface FilterFormProps {
  onSubmit: (types: ContentType[], lists: ListType[], additionalFilters?: AdditionalFilters) => void;
  isLoading: boolean;
  onTypeChange?: (types: ContentType[]) => void;
  onListChange?: (lists: ListType[]) => void;
  onAdditionalFilterChange?: (filters: AdditionalFilters) => void;
}

const CONTENT_TYPE_OPTIONS: { value: ContentType; label: string; icon: string; color: string }[] = [
  { value: 'movie', label: 'Фильмы', icon: '🎬', color: 'bg-green-500' },
  { value: 'tv', label: 'Сериалы', icon: '📺', color: 'bg-blue-500' },
  { value: 'anime', label: 'Аниме', icon: '🎌', color: 'bg-[#9C40FE]' },
];

const LIST_OPTIONS: { value: ListType; label: string; description: string; icon: string; color: string }[] = [
  { 
    value: 'want', 
    label: 'Хочу посмотреть', 
    description: 'Из списка отложенного',
    icon: '+', 
    color: 'bg-blue-500' 
  },
  { 
    value: 'watched', 
    label: 'Уже просмотрено', 
    description: 'Просмотренные, пересмотренные',
    icon: '✓', 
    color: 'bg-green-500' 
  },
];

const GENRES = [
  { id: 28, name: 'Боевик' },
  { id: 12, name: 'Приключения' },
  { id: 16, name: 'Анимация' },
  { id: 35, name: 'Комедия' },
  { id: 80, name: 'Криминал' },
  { id: 18, name: 'Драма' },
  { id: 10751, name: 'Семейный' },
  { id: 14, name: 'Фэнтези' },
  { id: 36, name: 'История' },
  { id: 27, name: 'Ужасы' },
  { id: 10402, name: 'Музыка' },
  { id: 9648, name: 'Детектив' },
  { id: 10749, name: 'Мелодрама' },
  { id: 878, name: 'Фантастика' },
  { id: 53, name: 'Триллер' },
  { id: 10752, name: 'Военный' },
];

const defaultAdditionalFilters: AdditionalFilters = {
  minRating: 0,
  maxRating: 10,
  yearFrom: '',
  yearTo: '',
  selectedGenres: [],
};

export default function FilterForm({ onSubmit, isLoading, onTypeChange, onListChange, onAdditionalFilterChange }: FilterFormProps) {
  const [selectedTypes, setSelectedTypes] = useState<ContentType[]>(['movie', 'tv', 'anime']);
  const [selectedLists, setSelectedLists] = useState<ListType[]>(['want', 'watched']);
  const [isAdditionalExpanded, setIsAdditionalExpanded] = useState(false);
  const [additionalFilters, setAdditionalFilters] = useState<AdditionalFilters>(defaultAdditionalFilters);

  const handleTypeToggle = (type: ContentType) => {
    setSelectedTypes(prev => {
      if (prev.includes(type)) {
        if (prev.length === 1) return prev;
        return prev.filter(t => t !== type);
      }
      return [...prev, type];
    });
    // Вызываем колбэк для отслеживания
    const newTypes = selectedTypes.includes(type)
      ? (selectedTypes.length === 1 ? selectedTypes : selectedTypes.filter(t => t !== type))
      : [...selectedTypes, type];
    if (onTypeChange) {
      onTypeChange(newTypes);
    }
  };

  const handleListToggle = (list: ListType) => {
    setSelectedLists(prev => {
      if (prev.includes(list)) {
        if (prev.length === 1) return prev;
        return prev.filter(l => l !== list);
      }
      return [...prev, list];
    });
    // Вызываем колбэк для отслеживания
    const newLists = selectedLists.includes(list)
      ? (selectedLists.length === 1 ? selectedLists : selectedLists.filter(l => l !== list))
      : [...selectedLists, list];
    if (onListChange) {
      onListChange(newLists);
    }
  };

  const toggleGenre = (genreId: number) => {
    setAdditionalFilters(prev => {
      const newGenres = prev.selectedGenres.includes(genreId)
        ? prev.selectedGenres.filter(id => id !== genreId)
        : [...prev.selectedGenres, genreId];
      const newFilters = { ...prev, selectedGenres: newGenres };
      if (onAdditionalFilterChange) {
        onAdditionalFilterChange(newFilters);
      }
      return newFilters;
    });
  };

  const updateMinRating = (value: number) => {
    const newFilters = { ...additionalFilters, minRating: value };
    setAdditionalFilters(newFilters);
    if (onAdditionalFilterChange) {
      onAdditionalFilterChange(newFilters);
    }
  };

  const updateMaxRating = (value: number) => {
    const newFilters = { ...additionalFilters, maxRating: value };
    setAdditionalFilters(newFilters);
    if (onAdditionalFilterChange) {
      onAdditionalFilterChange(newFilters);
    }
  };

  const updateYearFrom = (value: string) => {
    const newFilters = { ...additionalFilters, yearFrom: value };
    setAdditionalFilters(newFilters);
    if (onAdditionalFilterChange) {
      onAdditionalFilterChange(newFilters);
    }
  };

  const updateYearTo = (value: string) => {
    const newFilters = { ...additionalFilters, yearTo: value };
    setAdditionalFilters(newFilters);
    if (onAdditionalFilterChange) {
      onAdditionalFilterChange(newFilters);
    }
  };

  const resetAdditionalFilters = () => {
    setAdditionalFilters(defaultAdditionalFilters);
    if (onAdditionalFilterChange) {
      onAdditionalFilterChange(defaultAdditionalFilters);
    }
  };

  const hasActiveAdditionalFilters = additionalFilters.minRating > 0 ||
    additionalFilters.maxRating < 10 ||
    additionalFilters.yearFrom ||
    additionalFilters.yearTo ||
    additionalFilters.selectedGenres.length > 0;

  const handleSubmit = () => {
    if (selectedTypes.length > 0 && selectedLists.length > 0) {
      onSubmit(selectedTypes, selectedLists, additionalFilters);
    }
  };

  const isSubmitDisabled = selectedTypes.length === 0 || selectedLists.length === 0 || isLoading;

  return (
    <div className="max-w-xs mx-auto">
      <h2 className="text-lg font-bold text-white mb-6 text-center">
        Настройте подбор
      </h2>

      {/* Блок выбора типа контента */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-400 mb-3">
          Тип контента
        </h3>
        <div className="space-y-2">
          {CONTENT_TYPE_OPTIONS.map(option => (
            <label
              key={option.value}
              className={`
                flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all
                ${selectedTypes.includes(option.value) 
                  ? 'bg-blue-500/20 border border-blue-500/30' 
                  : 'bg-gray-800/50 border border-gray-700/50 hover:bg-gray-800'}
              `}
            >
              <input
                type="checkbox"
                checked={selectedTypes.includes(option.value)}
                onChange={() => handleTypeToggle(option.value)}
                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
              />
              <span className={`w-6 h-6 rounded flex items-center justify-center text-sm ${option.color}`}>
                {option.icon}
              </span>
              <span className={`text-sm font-medium ${selectedTypes.includes(option.value) ? 'text-white' : 'text-gray-400'}`}>
                {option.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Блок выбора списков */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-400 mb-3">
          Источник
        </h3>
        <div className="space-y-2">
          {LIST_OPTIONS.map(option => (
            <label
              key={option.value}
              className={`
                flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all
                ${selectedLists.includes(option.value) 
                  ? 'bg-blue-500/20 border border-blue-500/30' 
                  : 'bg-gray-800/50 border border-gray-700/50 hover:bg-gray-800'}
              `}
            >
              <input
                type="checkbox"
                checked={selectedLists.includes(option.value)}
                onChange={() => handleListToggle(option.value)}
                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
              />
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${option.color} text-white`}>
                {option.icon}
              </span>
              <div className="flex-1">
                <span className={`text-sm font-medium block ${selectedLists.includes(option.value) ? 'text-white' : 'text-gray-400'}`}>
                  {option.label}
                </span>
                <span className="text-xs text-gray-500">
                  {option.description}
                </span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Кнопка Доп. фильтры */}
      <button
        type="button"
        onClick={() => setIsAdditionalExpanded(!isAdditionalExpanded)}
        className={`
          w-full py-2 px-3 rounded-lg text-sm transition-colors flex items-center justify-center gap-2 mb-4
          ${hasActiveAdditionalFilters 
            ? 'bg-blue-600 text-white' 
            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}
        `}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
          />
        </svg>
        <span>Доп. фильтры {hasActiveAdditionalFilters && '•'}</span>
        <svg 
          width="12" 
          height="12" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`ml-auto transition-transform ${isAdditionalExpanded ? 'rotate-90' : ''}`}
        >
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      </button>

      {/* Раскрывающиеся дополнительные фильтры */}
      {isAdditionalExpanded && (
        <div className="mb-4 bg-gray-900/80 rounded-lg p-4 space-y-4 border border-gray-800">
          {/* Фильтр по году */}
          <div>
            <label className="text-xs text-gray-400 block mb-2">Год выпуска</label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                placeholder="От"
                value={additionalFilters.yearFrom}
                onChange={(e) => updateYearFrom(e.target.value)}
                className="w-full px-2 py-1.5 rounded bg-gray-800 text-white text-sm border border-gray-700 focus:border-blue-500 outline-none"
              />
              <span className="text-gray-500">—</span>
              <input
                type="number"
                placeholder="До"
                value={additionalFilters.yearTo}
                onChange={(e) => updateYearTo(e.target.value)}
                className="w-full px-2 py-1.5 rounded bg-gray-800 text-white text-sm border border-gray-700 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Фильтр по рейтингу */}
          <div>
            <label className="text-xs text-gray-400 block mb-2">
              Моя оценка: {additionalFilters.minRating > 0 || additionalFilters.maxRating < 10 ? `${additionalFilters.minRating} - ${additionalFilters.maxRating}` : 'Любая'}
            </label>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <span className="text-xs text-gray-500 block mb-1">От</span>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  value={additionalFilters.minRating}
                  onChange={(e) => updateMinRating(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
              <div className="flex-1">
                <span className="text-xs text-gray-500 block mb-1">До</span>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  value={additionalFilters.maxRating}
                  onChange={(e) => updateMaxRating(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Фильтр по жанрам */}
          <div>
            <label className="text-xs text-gray-400 block mb-2">Жанры</label>
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
              {GENRES.map((genre) => (
                <button
                  key={genre.id}
                  type="button"
                  onClick={() => toggleGenre(genre.id)}
                  className={`px-2.5 py-1 rounded text-xs transition-colors whitespace-nowrap ${
                    additionalFilters.selectedGenres.includes(genre.id)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {genre.name}
                </button>
              ))}
            </div>
          </div>

          {/* Кнопка сброса */}
          {hasActiveAdditionalFilters && (
            <button
              type="button"
              onClick={resetAdditionalFilters}
              className="w-full py-2 rounded bg-gray-800 text-gray-400 text-sm hover:bg-gray-700 hover:text-gray-300 transition-colors"
            >
              Сбросить фильтры
            </button>
          )}
        </div>
      )}

      {/* Кнопка подбора */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitDisabled}
        className={`
          w-full py-3 px-4 rounded-lg font-medium text-sm transition-all
          ${isSubmitDisabled
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-500 active:scale-[0.98]'}
        `}
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Подбор...
          </span>
        ) : (
          'Подобрать рекомендации'
        )}
      </button>

      {/* Подсказка */}
      {selectedTypes.length === 0 && (
        <p className="text-xs text-gray-500 text-center mt-3">
          Выберите хотя бы один тип контента
        </p>
      )}
      {selectedLists.length === 0 && selectedTypes.length > 0 && (
        <p className="text-xs text-gray-500 text-center mt-3">
          Выберите хотя бы один список
        </p>
      )}
    </div>
  );
}
