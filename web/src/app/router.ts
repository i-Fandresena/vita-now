import { useCallback, useSyncExternalStore } from "react";

/**
 * Routeur minimal sur le fragment d'URL.
 *
 * Pourquoi pas de bibliothèque : cinq écrans, aucun chargement de données par
 * route, aucun besoin de routes imbriquées. Ce que l'on veut en revanche
 * absolument, c'est pouvoir revenir sur n'importe quel écran d'un coup pendant
 * une soutenance — d'où des URL réelles plutôt qu'un état interne.
 */

export type Route =
  | { name: "recherche" }
  | { name: "fragment"; id: string }
  | { name: "reprise" }
  | { name: "depot" }
  | { name: "signal"; id: string };

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#\/?/, "");
  const [head, tail] = path.split("/");

  switch (head) {
    case "fragment":
      return tail ? { name: "fragment", id: tail } : { name: "recherche" };
    case "reprise":
      return { name: "reprise" };
    case "deposer":
      return { name: "depot" };
    case "signal":
      return tail ? { name: "signal", id: tail } : { name: "recherche" };
    default:
      return { name: "recherche" };
  }
}

export function hrefFor(route: Route): string {
  switch (route.name) {
    case "fragment":
      return `#/fragment/${route.id}`;
    case "reprise":
      return "#/reprise";
    case "depot":
      return "#/deposer";
    case "signal":
      return `#/signal/${route.id}`;
    case "recherche":
      return "#/";
  }
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

const getSnapshot = () => window.location.hash;

export function useRoute(): { route: Route; navigate: (to: Route) => void } {
  const hash = useSyncExternalStore(subscribe, getSnapshot, () => "");

  const navigate = useCallback((to: Route) => {
    window.location.hash = hrefFor(to);
    // Le focus repart en tête de document : une navigation au clavier ne doit
    // pas laisser l'utilisateur au milieu de l'écran précédent.
    document.getElementById("contenu")?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, []);

  return { route: parseRoute(hash), navigate };
}
