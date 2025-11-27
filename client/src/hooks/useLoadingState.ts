import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

let activeRequests = 0;
let listeners: ((count: number) => void)[] = [];

export function notifyLoadingChange(count: number) {
  listeners.forEach(listener => listener(count));
}

export function addRequestListener(listener: (count: number) => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
}

export function incrementRequests() {
  activeRequests++;
  notifyLoadingChange(activeRequests);
}

export function decrementRequests() {
  activeRequests = Math.max(0, activeRequests - 1);
  notifyLoadingChange(activeRequests);
}

export function useLoadingState() {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = addRequestListener((count) => {
      setIsLoading(count > 0);
    });

    return unsubscribe;
  }, []);

  return isLoading;
}
