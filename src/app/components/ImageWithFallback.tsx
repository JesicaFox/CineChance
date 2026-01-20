'use client';

import { useState } from 'react';
import Image from 'next/image';

interface ImageWithFallbackProps {
  src: string;
  fallbackSrc?: string;
  alt: string;
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
  className?: string;
  blurDataURL?: string;
  onError?: () => void;
}

export default function ImageWithFallback({
  src,
  fallbackSrc = '/placeholder-poster.svg',
  alt,
  fill = true,
  sizes,
  priority = false,
  className = '',
  blurDataURL,
  onError,
}: ImageWithFallbackProps) {
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleError = () => {
    setError(true);
    onError?.();
  };

  const handleLoadingComplete = () => {
    setIsLoading(false);
  };

  return (
    <div className={`relative w-full aspect-[2/3] ${className}`}>
      <Image
        src={error ? fallbackSrc : src}
        alt={alt}
        fill={fill}
        sizes={sizes}
        priority={priority}
        className={`object-cover transition-opacity duration-500 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        }`}
        placeholder={blurDataURL ? 'blur' : undefined}
        blurDataURL={blurDataURL}
        onError={handleError}
        onLoad={handleLoadingComplete}
      />
      {isLoading && !error && blurDataURL && (
        <div className="absolute inset-0 bg-gray-800 animate-pulse" />
      )}
    </div>
  );
}
