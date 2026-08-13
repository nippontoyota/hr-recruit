import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface UseAsyncOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: any) => void;
  immediate?: boolean;
}

export function useAsync<T>(
  asyncFunction: (...args: any[]) => Promise<T>,
  options: UseAsyncOptions<T> = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(options.immediate !== false);
  const [error, setError] = useState<any>(null);

  // Store the asyncFunction and options in refs so we don't re-trigger unnecessarily
  const asyncFunctionRef = useRef(asyncFunction);
  const optionsRef = useRef(options);
  
  useEffect(() => {
    asyncFunctionRef.current = asyncFunction;
    optionsRef.current = options;
  }, [asyncFunction, options]);

  const execute = useCallback(
    async (...args: any[]) => {
      setLoading(true);
      setError(null);
      try {
        const result = await asyncFunctionRef.current(...args);
        setData(result);
        if (optionsRef.current.onSuccess) optionsRef.current.onSuccess(result);
        return result;
      } catch (err: any) {
        setError(err);
        if (optionsRef.current.onError) {
          optionsRef.current.onError(err);
        } else {
          toast.error(err?.response?.data?.detail || err.message || 'An error occurred.');
        }
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (options.immediate !== false) {
      execute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once if immediate

  return { execute, data, loading, error, setData, setLoading };
}
