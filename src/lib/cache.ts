// src/lib/cache.ts
/**
 * Create revalidate value for ISR
 * @param seconds - Time in seconds before revalidation
 */
export function revalidate(seconds: number) {
  return seconds;
}

/**
 * Create tags array for cache invalidation
 * @param tagNames - Tag names to include
 */
export function tags(tagNames: string[]): string[] {
  return tagNames;
}
