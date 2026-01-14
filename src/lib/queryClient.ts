import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 минута по умолчанию
      cacheTime: 5 * 60 * 1000, // 5 минут
      refetchOnWindowFocus: false,
      retry: 2,
    },
    mutations: {
      retry: 1,
    },
  },
});
