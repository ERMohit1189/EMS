import { useState, useCallback } from 'react';
import { incrementRequests, decrementRequests } from './useLoadingState';

export function usePageLoader() {
  const [isLoading, setIsLoading] = useState(false);

  const withLoader = useCallback(async <T,>(
    asyncFn: () => Promise<T>,
    options?: { delay?: number }
  ): Promise<T> => {
    try {
      setIsLoading(true);
      incrementRequests();
      
      if (options?.delay) {
        await new Promise(resolve => setTimeout(resolve, options.delay));
      }
      
      const result = await asyncFn();
      return result;
    } finally {
      setIsLoading(false);
      decrementRequests();
    }
  }, []);

  const withLoaderMultiple = useCallback(async <T,>(
    asyncFns: (() => Promise<T>)[],
    options?: { delay?: number }
  ): Promise<T[]> => {
    try {
      setIsLoading(true);
      incrementRequests();
      
      if (options?.delay) {
        await new Promise(resolve => setTimeout(resolve, options.delay));
      }
      
      const results = await Promise.all(asyncFns.map(fn => fn()));
      return results;
    } finally {
      setIsLoading(false);
      decrementRequests();
    }
  }, []);

  return {
    isLoading,
    withLoader,
    withLoaderMultiple,
    startLoading: () => {
      setIsLoading(true);
      incrementRequests();
    },
    stopLoading: () => {
      setIsLoading(false);
      decrementRequests();
    },
  };
}
