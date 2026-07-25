import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { SearchHit } from "@/domain/types";
import { useRepository } from "./repository";

/**
 * L'état de recherche vit au-dessus du routeur.
 *
 * Raison produit : quand on revient d'un fragment vers la liste, retrouver ses
 * résultats intacts n'est pas un confort, c'est la condition pour comparer deux
 * fragments. Une recherche relancée à chaque retour casserait la lecture.
 */

export type SearchStatus = "vierge" | "en-cours" | "abouti" | "erreur";

interface SearchState {
  query: string;
  hits: SearchHit[];
  status: SearchStatus;
  run: (query: string) => void;
  reset: () => void;
}

const SearchContext = createContext<SearchState | null>(null);

export function SearchProvider({ children }: { children: ReactNode }) {
  const repository = useRepository();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [status, setStatus] = useState<SearchStatus>("vierge");
  const inFlight = useRef<AbortController | null>(null);

  const run = useCallback(
    (next: string) => {
      const trimmed = next.trim();
      if (!trimmed) return;

      // Une frappe rapide ne doit pas faire clignoter des résultats périmés.
      inFlight.current?.abort();
      const controller = new AbortController();
      inFlight.current = controller;

      setQuery(trimmed);
      setStatus("en-cours");

      repository
        .search(trimmed, { signal: controller.signal })
        .then((results) => {
          if (controller.signal.aborted) return;
          setHits(results);
          setStatus("abouti");
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          setStatus("erreur");
        });
    },
    [repository],
  );

  const reset = useCallback(() => {
    inFlight.current?.abort();
    setQuery("");
    setHits([]);
    setStatus("vierge");
  }, []);

  const value = useMemo(
    () => ({ query, hits, status, run, reset }),
    [query, hits, status, run, reset],
  );

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearch(): SearchState {
  const state = useContext(SearchContext);
  if (!state) throw new Error("useSearch doit être appelé sous un <SearchProvider>");
  return state;
}
