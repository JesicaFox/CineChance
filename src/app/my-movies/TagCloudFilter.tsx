'use client';

import { useState, useMemo } from 'react';

interface TagCloudFilterProps {
  tags: Array<{
    id: string;
    name: string;
    count: number;
  }>;
  selectedTags: string[];
  onTagsChange: (tagIds: string[]) => void;
}

export default function TagCloudFilter({
  tags,
  selectedTags,
  onTagsChange,
}: TagCloudFilterProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate font size and weight based on tag popularity (elevation effect)
  const getTagStyle = (count: number, maxCount: number): { size: string; elevation: string; glow: string } => {
    if (maxCount === 0) {
      return { size: 'text-xs', elevation: 'bg-gray-800/40', glow: '' };
    }

    const ratio = count / maxCount;
    if (ratio > 0.8) {
      return {
        size: 'text-base font-semibold',
        elevation: 'bg-gray-700/60',
        glow: 'shadow-[0_0_12px_rgba(96,165,250,0.25)]',
      };
    }
    if (ratio > 0.6) {
      return {
        size: 'text-sm font-medium',
        elevation: 'bg-gray-700/50',
        glow: 'shadow-[0_0_8px_rgba(96,165,250,0.15)]',
      };
    }
    if (ratio > 0.4) {
      return {
        size: 'text-sm font-normal',
        elevation: 'bg-gray-700/40',
        glow: '',
      };
    }
    if (ratio > 0.2) {
      return {
        size: 'text-xs font-normal',
        elevation: 'bg-gray-800/30',
        glow: '',
      };
    }
    return {
      size: 'text-xs',
      elevation: 'bg-gray-800/20',
      glow: '',
    };
  };

  // Sort tags by popularity and limit to display
  const sortedTags = useMemo(() => {
    return [...tags].sort((a, b) => b.count - a.count);
  }, [tags]);

  // Limit initial display
  const visibleTags = isExpanded ? sortedTags : sortedTags.slice(0, 10);
  const maxCount = Math.max(...tags.map(t => t.count), 1);

  // Toggle tag selection
  const handleTagClick = (tagId: string) => {
    const newSelectedTags = selectedTags.includes(tagId)
      ? selectedTags.filter(id => id !== tagId)
      : [...selectedTags, tagId];
    onTagsChange(newSelectedTags);
  };

  return (
    <div className="mb-4">
      {/* Header with muted tone label */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-medium text-gray-300 tracking-wide">Теги</span>
        {tags.length > 10 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-blue-400/80 hover:text-blue-300 transition-all duration-300 ease-out hover:scale-105"
          >
            {isExpanded ? 'Скрыть' : `+${tags.length - 10}`}
          </button>
        )}
      </div>

      {/* Tag cloud container with subtle background depth */}
      <div className="flex flex-wrap gap-1 p-1.5 rounded-lg bg-gray-900/30 border border-gray-800/50">
        {visibleTags.map((tag) => {
          const isSelected = selectedTags.includes(tag.id);
          const { size, elevation, glow } = getTagStyle(tag.count, maxCount);

          return (
            <button
              key={tag.id}
              onClick={() => handleTagClick(tag.id)}
              className={`
                relative px-2 py-0.5 rounded-md
                transition-all duration-300 ease-out
                ${size}
                ${elevation}
                ${isSelected ? 'text-white' : 'text-gray-300'}
                ${isSelected
                  ? 'bg-blue-600/80 shadow-[0_0_16px_rgba(37,99,235,0.35)] border border-blue-500/50'
                  : 'hover:bg-gray-600/50 hover:text-white hover:shadow-[0_0_10px_rgba(255,255,255,0.08)] border border-gray-700/40'
                }
                ${glow}
                ${isSelected ? 'scale-[1.02]' : ''}
              `}
              style={{
                // Micro-neon accent for popular tags
                boxShadow: isSelected
                  ? '0 0 20px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
                  : undefined,
              }}
            >
              <span className="relative z-10">{tag.name}</span>
              <span className={`
                ml-1 text-[9px] font-medium
                ${isSelected ? 'text-blue-200' : 'text-gray-500'}
              `}>
                {tag.count}
              </span>

              {/* Active state indicator dot */}
              {isSelected && (
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-blue-400 rounded-full shadow-[0_0_6px_rgba(96,165,250,0.8)]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Clear selection with muted styling */}
      {selectedTags.length > 0 && (
        <button
          onClick={() => onTagsChange([])}
          className="mt-3 text-xs text-gray-400 hover:text-gray-200 transition-all duration-300 ease-out hover:underline decoration-gray-500/50 underline-offset-4"
        >
          Очистить выбор
        </button>
      )}
    </div>
  );
}
