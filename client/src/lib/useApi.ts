import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';

interface ApiState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

export function useApi<T>(path: string | null, options?: { pollMs?: number }) {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    error: null,
    loading: Boolean(path),
  });
  const [version, setVersion] = useState(0);
  const activeRef = useRef(true);

  const reload = useCallback(() => {
    setVersion((value) => value + 1);
  }, []);

  useEffect(() => {
    activeRef.current = true;
    if (!path) {
      setState({ data: null, error: null, loading: false });
      return;
    }
    setState((current) => ({ ...current, loading: current.data === null, error: null }));

    const load = async () => {
      try {
        const data = await api<T>(path);
        if (activeRef.current) setState({ data, error: null, loading: false });
      } catch (error) {
        if (activeRef.current) {
          setState((current) => ({
            data: current.data,
            error: error instanceof Error ? error.message : 'Xatolik yuz berdi.',
            loading: false,
          }));
        }
      }
    };

    void load();
    let timer: number | undefined;
    if (options?.pollMs && options.pollMs > 0) {
      timer = window.setInterval(load, options.pollMs);
    }
    return () => {
      activeRef.current = false;
      if (timer) window.clearInterval(timer);
    };
  }, [path, version, options?.pollMs]);

  return { ...state, reload, setData: (data: T | null) => setState({ data, error: null, loading: false }) };
}
