import { useCallback, useEffect, useRef, useState } from "react";

import { ACCESS_TOKEN_KEY } from "@/lib/authStorage";
import {
  fetchFormStatsFromApi,
  type FormStatsQuery,
  type FormStatsResponse,
} from "@/services/api";

const FILTER_DEBOUNCE_MS = 400;

export type FormStatsLoadState =
  | "idle"
  | "loading"
  | "ready"
  | "error"
  | "offline"
  | "no_session";

export function useFormStats(
  filters: FormStatsQuery,
  online: boolean,
): {
  stats: FormStatsResponse | null;
  loadState: FormStatsLoadState;
  error: string | null;
  reload: () => void;
} {
  const [stats, setStats] = useState<FormStatsResponse | null>(null);
  const [loadState, setLoadState] = useState<FormStatsLoadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const filtersKey = JSON.stringify(filters);

  const load = useCallback(async () => {
    const token =
      typeof localStorage !== "undefined"
        ? localStorage.getItem(ACCESS_TOKEN_KEY)
        : null;

    if (!online) {
      setLoadState("offline");
      setError(null);
      return;
    }

    if (!token) {
      setStats(null);
      setLoadState("no_session");
      setError(null);
      return;
    }

    const reqId = ++requestIdRef.current;
    setLoadState("loading");
    setError(null);

    try {
      const data = await fetchFormStatsFromApi(filters);
      if (reqId !== requestIdRef.current) {
        return;
      }
      setStats(data);
      setLoadState("ready");
    } catch (e) {
      if (reqId !== requestIdRef.current) {
        return;
      }
      setStats(null);
      setLoadState("error");
      setError(e instanceof Error ? e.message : "Error al cargar estadísticas");
    }
  }, [filters, online]);

  useEffect(() => {
    if (!online) {
      setLoadState("offline");
      setError(null);
      return;
    }

    const timer = window.setTimeout(() => {
      void load();
    }, FILTER_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [filtersKey, online, load]);

  useEffect(() => {
    const onOnline = () => {
      if (online) {
        void load();
      }
    };
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("online", onOnline);
    };
  }, [online, load]);

  return { stats, loadState, error, reload: load };
}
