// Stale-while-revalidate cache for fetched data.
// Returns the cached value (if any) immediately, then triggers a background refresh.
// Components subscribe to keys and re-render when the cache updates.

import { useEffect, useState } from 'react';

type Listener = (value: any) => void;

const cache = new Map<string, any>();
const listeners = new Map<string, Set<Listener>>();
const inFlight = new Map<string, Promise<any>>();

const notify = (key: string, value: any) => {
  cache.set(key, value);
  listeners.get(key)?.forEach((fn) => fn(value));
};

export const invalidate = (key?: string) => {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
};

export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  deps: any[] = []
): { data: T | undefined; loading: boolean; error: string | null; refresh: () => void } {
  const [data, setData] = useState<T | undefined>(() => cache.get(key));
  const [loading, setLoading] = useState(!cache.has(key));
  const [error, setError] = useState<string | null>(null);

  const run = () => {
    let active = true;
    if (!inFlight.has(key)) {
      inFlight.set(
        key,
        fetcher()
          .then((v) => {
            notify(key, v);
            return v;
          })
          .finally(() => inFlight.delete(key))
      );
    }
    inFlight
      .get(key)!
      .then((v) => {
        if (!active) return;
        setData(v);
        setError(null);
        setLoading(false);
      })
      .catch((e) => {
        if (!active) return;
        setError(e?.message || 'Network error');
        setLoading(false);
      });
    return () => {
      active = false;
    };
  };

  useEffect(() => {
    let lset = listeners.get(key);
    if (!lset) {
      lset = new Set();
      listeners.set(key, lset);
    }
    const onUpdate = (v: any) => setData(v);
    lset.add(onUpdate);

    const cleanup = run();

    return () => {
      cleanup();
      lset!.delete(onUpdate);
      if (lset!.size === 0) listeners.delete(key);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ...deps]);

  return {
    data,
    loading,
    error,
    refresh: () => {
      invalidate(key);
      run();
    },
  };
}
