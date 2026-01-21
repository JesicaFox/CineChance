// src/app/recommendations/FilterStateManager.tsx
'use client';

import { useState, useCallback, useEffect } from 'react';
import { ContentType, ListType } from '@/lib/recommendation-types';

interface AdditionalFilters {
  minRating: number;
  yearFrom: string;
  yearTo: string;
  selectedGenres: number[];
}

export interface FilterState {
  types: ContentType[];
  lists: ListType[];
  additionalFilters?: AdditionalFilters;
}

interface FilterStateManagerProps {
  initialFilters?: Partial<FilterState>;
  onFiltersChange: (filters: FilterState) => void;
  onFilterChange?: (parameterName: string, previousValue: unknown, newValue: unknown) => void;
  children: (state: {
    filters: FilterState;
    updateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
    resetFilters: () => void;
    hasActiveFilters: boolean;
  }) => React.ReactNode;
}

const defaultFilters: FilterState = {
  types: ['movie', 'tv', 'anime'],
  lists: ['want', 'watched'],
  additionalFilters: {
    minRating: 0,
    yearFrom: '',
    yearTo: '',
    selectedGenres: [],
  },
};

export default function FilterStateManager({
  initialFilters = {},
  onFiltersChange,
  onFilterChange,
  children,
}: FilterStateManagerProps) {
  const [filters, setFilters] = useState<FilterState>({
    ...defaultFilters,
    lists: initialFilters.lists || defaultFilters.lists,
    types: initialFilters.types || defaultFilters.types,
    additionalFilters: initialFilters.additionalFilters || defaultFilters.additionalFilters,
  });

  // Синхронизируем состояние с initialFilters при их изменении
  useEffect(() => {
    if (initialFilters.lists) {
      setFilters(prev => ({ ...prev, lists: initialFilters.lists as ListType[] }));
    }
    if (initialFilters.types) {
      setFilters(prev => ({ ...prev, types: initialFilters.types as ContentType[] }));
    }
    if (initialFilters.additionalFilters) {
      setFilters(prev => ({ ...prev, additionalFilters: initialFilters.additionalFilters }));
    }
  }, [initialFilters]);

  const updateFilter = useCallback(<K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    setFilters(prev => {
      const previousValue = prev[key];
      const newValue = value;
      
      // Вызываем onFilterChange если он предоставлен
      if (onFilterChange && JSON.stringify(previousValue) !== JSON.stringify(newValue)) {
        onFilterChange(key, previousValue, newValue);
      }
      
      return { ...prev, [key]: value };
    });
  }, [onFilterChange]);

  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    const defaultValue = defaultFilters[key as keyof FilterState];
    if (Array.isArray(value)) {
      return value.length !== (defaultValue as any)?.length;
    }
    if (key === 'additionalFilters') {
      const additional = value as AdditionalFilters;
      const defaultAdditional = defaultValue as AdditionalFilters;
      return additional.minRating !== defaultAdditional.minRating ||
             additional.yearFrom !== defaultAdditional.yearFrom ||
             additional.yearTo !== defaultAdditional.yearTo ||
             additional.selectedGenres.length !== defaultAdditional.selectedGenres.length;
    }
    return JSON.stringify(value) !== JSON.stringify(defaultValue);
  });

  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  return (
    <>
      {children({
        filters,
        updateFilter,
        resetFilters,
        hasActiveFilters,
      })}
    </>
  );
}