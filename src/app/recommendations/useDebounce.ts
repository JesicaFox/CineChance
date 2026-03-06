import { useCallback, useRef } from 'react';

/**
 * Хук для дебаунсинга функций
 */
export function useDebounce<T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]) as T;
}

/**
 * Хук для дебаунсинга асинхронных функций
 */
export function useAsyncDebounce<T extends (...args: unknown[]) => Promise<unknown>>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isPendingRef = useRef(false);

  return useCallback((...args: Parameters<T>) => {
    return new Promise<unknown>((resolve, reject) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(async () => {
        try {
          if (!isPendingRef.current) {
            isPendingRef.current = true;
            const result = await callback(...args);
            resolve(result);
          }
        } catch (error) {
          reject(error);
        } finally {
          isPendingRef.current = false;
        }
      }, delay);
    });
  }, [callback, delay]) as T;
}