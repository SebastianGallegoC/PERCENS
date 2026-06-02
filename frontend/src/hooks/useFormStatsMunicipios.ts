import { useCallback, useEffect, useState } from "react";

import { ACCESS_TOKEN_KEY } from "@/lib/authStorage";
import { fetchFormStatsMunicipiosFromApi } from "@/services/api";

export type MunicipiosLoadState = "idle" | "loading" | "ready" | "error" | "offline" | "no_session";

export function useFormStatsMunicipios(online: boolean): {
  municipios: string[];
  loadState: MunicipiosLoadState;
  error: string | null;
  reload: () => void;
} {
  const [municipios, setMunicipios] = useState<string[]>([]);
  const [loadState, setLoadState] = useState<MunicipiosLoadState>("idle");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token =
      typeof localStorage !== "undefined"
        ? localStorage.getItem(ACCESS_TOKEN_KEY)
        : null;

    if (!online) {
      setMunicipios([]);
      setLoadState("offline");
      setError(null);
      return;
    }

    if (!token) {
      setMunicipios([]);
      setLoadState("no_session");
      setError(null);
      return;
    }

    setLoadState("loading");
    setError(null);

    try {
      const list = await fetchFormStatsMunicipiosFromApi();
      setMunicipios(list);
      setLoadState("ready");
    } catch (e) {
      setMunicipios([]);
      setLoadState("error");
      setError(
        e instanceof Error ? e.message : "Error al cargar municipios",
      );
    }
  }, [online]);

  useEffect(() => {
    void load();
  }, [load]);

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

  return { municipios, loadState, error, reload: load };
}
