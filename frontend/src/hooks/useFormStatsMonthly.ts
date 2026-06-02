import { useCallback, useEffect, useRef, useState } from "react";

import { ACCESS_TOKEN_KEY } from "@/lib/authStorage";
import {
  fetchFormStatsAniosFromApi,
  fetchFormStatsMonthlyFromApi,
  type FormStatsMonthlyQuery,
  type FormStatsMonthlyResponse,
} from "@/services/api";

const FILTER_DEBOUNCE_MS = 400;

export type MonthlyStatsLoadState =
  | "idle"
  | "loading"
  | "ready"
  | "error"
  | "offline"
  | "no_session"
  | "needs_municipios";

export function useFormStatsMonthly(
  query: FormStatsMonthlyQuery,
  online: boolean,
): {
  data: FormStatsMonthlyResponse | null;
  anios: number[];
  aniosLoadState: "idle" | "loading" | "ready" | "error" | "offline" | "no_session";
  loadState: MonthlyStatsLoadState;
  error: string | null;
  reload: () => void;
  reloadAnios: () => void;
} {
  const [data, setData] = useState<FormStatsMonthlyResponse | null>(null);
  const [anios, setAnios] = useState<number[]>([]);
  const [aniosLoadState, setAniosLoadState] = useState<
    "idle" | "loading" | "ready" | "error" | "offline" | "no_session"
  >("idle");
  const [loadState, setLoadState] = useState<MonthlyStatsLoadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const queryKey = JSON.stringify(query);

  const loadAnios = useCallback(async () => {
    const token =
      typeof localStorage !== "undefined"
        ? localStorage.getItem(ACCESS_TOKEN_KEY)
        : null;

    if (!online) {
      setAnios([]);
      setAniosLoadState("offline");
      return;
    }
    if (!token) {
      setAnios([]);
      setAniosLoadState("no_session");
      return;
    }

    setAniosLoadState("loading");
    try {
      const list = await fetchFormStatsAniosFromApi();
      setAnios(list.length > 0 ? list : [new Date().getFullYear()]);
      setAniosLoadState("ready");
    } catch {
      setAnios([new Date().getFullYear()]);
      setAniosLoadState("error");
    }
  }, [online]);

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
      setData(null);
      setLoadState("no_session");
      setError(null);
      return;
    }
    if (!query.municipios?.length) {
      setData(null);
      setLoadState("needs_municipios");
      setError(null);
      return;
    }

    const reqId = ++requestIdRef.current;
    setLoadState("loading");
    setError(null);

    try {
      const result = await fetchFormStatsMonthlyFromApi(query);
      if (reqId !== requestIdRef.current) {
        return;
      }
      setData(result);
      setLoadState("ready");
    } catch (e) {
      if (reqId !== requestIdRef.current) {
        return;
      }
      setData(null);
      setLoadState("error");
      setError(
        e instanceof Error ? e.message : "Error al cargar diligencias mensuales",
      );
    }
  }, [query, online]);

  useEffect(() => {
    void loadAnios();
  }, [loadAnios]);

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
  }, [queryKey, online, load]);

  useEffect(() => {
    const onOnline = () => {
      if (online) {
        void loadAnios();
        void load();
      }
    };
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("online", onOnline);
    };
  }, [online, load, loadAnios]);

  return {
    data,
    anios,
    aniosLoadState,
    loadState,
    error,
    reload: load,
    reloadAnios: loadAnios,
  };
}
