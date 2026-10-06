import { useState, useEffect } from 'react';

interface UseApiOptions {
  skip?: boolean;
  dependencies?: any[];
}

export const useApi = <T,>(
  url: string,
  options?: UseApiOptions
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (options?.skip) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(url);
        if (!response.ok) throw new Error('API request failed');
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, options?.dependencies || [url]);

  return { data, loading, error };
};
