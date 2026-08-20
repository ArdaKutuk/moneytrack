import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiResult } from "@shared/types";

/** Unwraps an ApiResult, throwing on failure so callers can use try/catch
 * around mutations while queries handle the error branch themselves. */
export async function unwrap<T>(promise: Promise<ApiResult<T>>): Promise<T> {
  const result = await promise;
  if (!result.success) throw new Error(result.error);
  return result.data;
}

interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/** Minimal data-fetching hook over the IPC bridge: tracks loading/error,
 * ignores results from superseded requests, and exposes `refetch` so
 * mutations can invalidate. Deliberately not a full query library — this
 * app's data volume doesn't justify one. */
export function useQuery<T>(
  fetcher: () => Promise<ApiResult<T>>,
  deps: React.DependencyList = []
): QueryState<T> & { refetch: () => void } {
  const [state, setState] = useState<QueryState<T>>({ data: null, loading: true, error: null });
  const requestIdRef = useRef(0);

  const run = useCallback(() => {
    const requestId = ++requestIdRef.current;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    fetcher()
      .then((result) => {
        if (requestId !== requestIdRef.current) return;
        if (result.success) {
          setState({ data: result.data, loading: false, error: null });
        } else {
          setState({ data: null, loading: false, error: result.error });
        }
      })
      .catch((error: unknown) => {
        if (requestId !== requestIdRef.current) return;
        setState({
          data: null,
          loading: false,
          error: error instanceof Error ? error.message : "Unexpected error.",
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  return { ...state, refetch: run };
}
