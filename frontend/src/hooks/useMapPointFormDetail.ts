import { useCallback, useEffect, useRef, useState } from "react";

import {
  loadMapPointFormDetail,
  type MapPointFormDetail,
} from "@/services/mapPointFormDetail";

export type MapPointFormDetailLoadState = "idle" | "loading" | "ready" | "error";

export function useMapPointFormDetail(formId: string | null): {
  detail: MapPointFormDetail | null;
  loadState: MapPointFormDetailLoadState;
  error: string | null;
  reload: () => void;
} {
  const [detail, setDetail] = useState<MapPointFormDetail | null>(null);
  const [loadState, setLoadState] = useState<MapPointFormDetailLoadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const load = useCallback(async () => {
    if (!formId) {
      setDetail(null);
      setLoadState("idle");
      setError(null);
      return;
    }

    const reqId = ++requestIdRef.current;
    setLoadState("loading");
    setError(null);

    try {
      const data = await loadMapPointFormDetail(formId);
      if (reqId !== requestIdRef.current) {
        return;
      }
      setDetail(data);
      setLoadState("ready");
    } catch (e) {
      if (reqId !== requestIdRef.current) {
        return;
      }
      setDetail(null);
      setLoadState("error");
      setError(
        e instanceof Error ? e.message : "No se pudo cargar el detalle del formulario",
      );
    }
  }, [formId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { detail, loadState, error, reload: load };
}
