import { useCallback, useEffect, useState, type DependencyList } from "react";
import { errorMessage } from "../api/client";

interface AsyncState<T> {
  data: T | undefined;
  error: string | null;
  loading: boolean;
}

/** Ejecuta una función asíncrona cuando cambian las dependencias y expone su estado. */
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList) {
  const [state, setState] = useState<AsyncState<T>>({ data: undefined, error: null, loading: true });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fn()
      .then((data) => active && setState({ data, error: null, loading: false }))
      .catch((e) => active && setState((s) => ({ ...s, error: errorMessage(e), loading: false })));
    return () => {
      active = false;
    };
  }, [...deps, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const setData = useCallback((data: T) => setState({ data, error: null, loading: false }), []);

  return { ...state, reload, setData };
}
