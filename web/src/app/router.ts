import { useCallback, useSyncExternalStore } from "react";

/**
 * Routeur sur le fragment d'URL.
 *
 * Pourquoi pas de bibliothèque : aucune route imbriquée, aucun chargement de
 * données par route, et un besoin absolu de revenir sur n'importe quel écran
 * d'un coup pendant une soutenance — d'où des URL réelles plutôt qu'un état
 * interne (règle `deep-linking` : tout écran clé doit être atteignable par URL).
 *
 * Trois espaces distincts, et la distinction porte la navigation (`Shell`) :
 *   · `accueil`   la landing publique
 *   · l'app       l'espace étudiant
 *   · `entreprise/*`  l'espace entreprise, séparé — garde-fou du cadrage :
 *     « l'entreprise arrive après l'apprentissage, pas avant ».
 */

export type Route =
  /* Public */
  | { name: "accueil" }
  | { name: "connexion" }
  | { name: "inscription" }
  | { name: "admin-connexion" }
  | { name: "admin" }
  /* Étudiant — onglets principaux */
  | { name: "tableau" }
  | { name: "copilote" }
  | { name: "projets" }
  | { name: "memoire" }
  | { name: "communaute" }
  | { name: "profil"; id?: string }
  | { name: "profil-edition" }
  /* Étudiant — écrans profonds */
  | { name: "projet"; id: string }
  | { name: "projet-nouveau" }
  | { name: "projet-journal"; id: string }
  | { name: "projet-presentation"; id: string }
  | { name: "projet-depot"; id: string }
  | { name: "reprise" }
  | { name: "renaissance" }
  | { name: "fragment"; id: string }
  | { name: "depot" }
  | { name: "signal"; id: string }
  | { name: "sujet"; id: string }
  | { name: "compagnons" }
  | { name: "challenges" }
  | { name: "challenge"; id: string }
  | { name: "idees" }
  | { name: "mentorat" }
  | { name: "notifications" }
  | { name: "classements" }
  | { name: "portfolio"; id: string }
  | { name: "opportunites" }
  | { name: "calendrier" }
  /* Entreprise — comptes réels, hors cadrage */
  | { name: "ent-connexion" }
  | { name: "ent-inscription" }
  /* Entreprise */
  | { name: "ent-accueil" }
  | { name: "ent-talents" }
  | { name: "ent-talent"; id: string }
  | { name: "ent-opportunites" }
  | { name: "ent-opportunites-nouveau" }
  | { name: "ent-challenges" }
  | { name: "ent-marketplace" }
  | { name: "ent-profil-edition" };

export type Space = "public" | "etudiant" | "entreprise" | "admin";

/** Le centre de gestion n'est jamais mélangé au parcours utilisateur. */
export const ADMIN_HOST = "manage.aura-plus.site";

export function estSurHoteAdmin(): boolean {
  return typeof window !== "undefined" && window.location.hostname === ADMIN_HOST;
}

export function urlAdmin(route: Extract<Route, { name: "admin" | "admin-connexion" }>): string {
  return `https://${ADMIN_HOST}/${hrefFor(route)}`;
}

const ROUTES_PUBLIQUES: readonly Route["name"][] = [
  "accueil",
  "connexion",
  "inscription",
  "ent-connexion",
  "ent-inscription",
  "admin-connexion",
];

export function spaceOf(route: Route): Space {
  if (ROUTES_PUBLIQUES.includes(route.name)) return "public";
  if (route.name === "admin") return "admin";
  return route.name.startsWith("ent-") ? "entreprise" : "etudiant";
}

/**
 * Les écrans publics qui se passent de la barre marketing.
 *
 * La connexion en fait partie : une page qui demande de s'identifier ne doit
 * pas offrir en même temps quatre ancres vers des arguments de vente. Elle
 * porte sa propre sortie — le retour à l'accueil par la marque.
 */
export function estEcranNu(route: Route): boolean {
  return (
    route.name === "connexion" ||
    route.name === "inscription" ||
    route.name === "ent-connexion" ||
    route.name === "ent-inscription"
    || route.name === "admin-connexion"
  );
}

/** Les cinq onglets de la barre basse — `bottom-nav-limit` : jamais plus. */
export const TABS: { name: Route["name"]; route: Route }[] = [
  { name: "tableau", route: { name: "tableau" } },
  { name: "projets", route: { name: "projets" } },
  { name: "memoire", route: { name: "memoire" } },
  { name: "communaute", route: { name: "communaute" } },
  { name: "profil", route: { name: "profil" } },
];

/**
 * Quel onglet est « courant » pour un écran profond.
 *
 * Sans cette table, ouvrir un sujet de forum éteindrait tout l'onglet
 * Communauté — l'utilisateur perdrait le fil de sa position (`nav-state-active`).
 */
const TAB_PARENT: Partial<Record<Route["name"], Route["name"]>> = {
  projet: "projets",
  "projet-nouveau": "projets",
  "projet-journal": "projets",
  "projet-presentation": "projets",
  "projet-depot": "projets",
  reprise: "tableau",
  renaissance: "memoire",
  fragment: "memoire",
  depot: "memoire",
  signal: "memoire",
  sujet: "communaute",
  compagnons: "communaute",
  challenges: "communaute",
  challenge: "communaute",
  idees: "communaute",
  mentorat: "communaute",
  notifications: "tableau",
  classements: "profil",
  "profil-edition": "profil",
  portfolio: "profil",
  opportunites: "profil",
  calendrier: "tableau",
  copilote: "tableau",
  "ent-profil-edition": "ent-accueil",
  "ent-opportunites-nouveau": "ent-opportunites",
};

export function activeTab(route: Route): Route["name"] | null {
  if (TABS.some((t) => t.name === route.name)) return route.name;
  return TAB_PARENT[route.name] ?? null;
}

/* ── Analyse et fabrication d'URL ───────────────────────────────────────── */

export function parseRoute(hash: string): Route {
  const chemin = hash.replace(/^#\/?/, "");
  const [tete, milieu, queue] = chemin.split("/");

  const route: Route = (() : Route => {
  switch (tete) {
    case "":
      return { name: "accueil" };
    case "connexion":
      return { name: "connexion" };
    case "inscription":
      return { name: "inscription" };
    case "admin":
      return milieu === "connexion" ? { name: "admin-connexion" } : { name: "admin" };
    case "tableau":
      return { name: "tableau" };
    case "copilote":
      return { name: "copilote" };
    case "projets":
      if (!milieu) return { name: "projets" };
      if (milieu === "nouveau") return { name: "projet-nouveau" };
      if (queue === "journal") return { name: "projet-journal", id: milieu };
      if (queue === "presentation") return { name: "projet-presentation", id: milieu };
      if (queue === "depot") return { name: "projet-depot", id: milieu };
      return { name: "projet", id: milieu };
    case "memoire":
      return { name: "memoire" };
    case "communaute":
      if (milieu === "sujet" && queue) return { name: "sujet", id: queue };
      return { name: "communaute" };
    case "profil":
      if (milieu === "edition") return { name: "profil-edition" };
      return { name: "profil", id: milieu };
    case "reprise":
      return { name: "reprise" };
    case "renaissance":
      return { name: "renaissance" };
    case "fragment":
      return milieu ? { name: "fragment", id: milieu } : { name: "memoire" };
    case "deposer":
      return { name: "depot" };
    case "signal":
      return milieu ? { name: "signal", id: milieu } : { name: "memoire" };
    case "compagnons":
      return { name: "compagnons" };
    case "challenges":
      return milieu ? { name: "challenge", id: milieu } : { name: "challenges" };
    case "idees":
      return { name: "idees" };
    case "mentorat":
      return { name: "mentorat" };
    case "notifications":
      return { name: "notifications" };
    case "classements":
      return { name: "classements" };
    case "portfolio":
      return milieu ? { name: "portfolio", id: milieu } : { name: "profil" };
    case "opportunites":
      return { name: "opportunites" };
    case "calendrier":
      return { name: "calendrier" };
    case "entreprise":
      switch (milieu) {
        case "connexion":
          return { name: "ent-connexion" };
        case "inscription":
          return { name: "ent-inscription" };
        case "talents":
          return queue ? { name: "ent-talent", id: queue } : { name: "ent-talents" };
        case "opportunites":
          return queue === "nouveau"
            ? { name: "ent-opportunites-nouveau" }
            : { name: "ent-opportunites" };
        case "challenges":
          return { name: "ent-challenges" };
        case "marketplace":
          return { name: "ent-marketplace" };
        case "profil":
          return queue === "edition" ? { name: "ent-profil-edition" } : { name: "ent-accueil" };
        default:
          return { name: "ent-accueil" };
      }
    default:
      return { name: "accueil" };
  }
  })();

  // `manage` sert exclusivement l'authentification et le centre de gestion.
  // Même une URL collée avec une route étudiante revient sur la connexion.
  if (estSurHoteAdmin() && route.name !== "admin" && route.name !== "admin-connexion") {
    return { name: "admin-connexion" };
  }
  return route;
}

export function hrefFor(route: Route): string {
  switch (route.name) {
    case "accueil":
      return "#/";
    case "connexion":
      return "#/connexion";
    case "inscription":
      return "#/inscription";
    case "admin-connexion":
      return "#/admin/connexion";
    case "admin":
      return "#/admin";
    case "tableau":
      return "#/tableau";
    case "copilote":
      return "#/copilote";
    case "projets":
      return "#/projets";
    case "projet":
      return `#/projets/${route.id}`;
    case "projet-nouveau":
      return "#/projets/nouveau";
    case "projet-journal":
      return `#/projets/${route.id}/journal`;
    case "projet-presentation":
      return `#/projets/${route.id}/presentation`;
    case "projet-depot":
      return `#/projets/${route.id}/depot`;
    case "memoire":
      return "#/memoire";
    case "communaute":
      return "#/communaute";
    case "sujet":
      return `#/communaute/sujet/${route.id}`;
    case "profil":
      return route.id ? `#/profil/${route.id}` : "#/profil";
    case "profil-edition":
      return "#/profil/edition";
    case "reprise":
      return "#/reprise";
    case "renaissance":
      return "#/renaissance";
    case "fragment":
      return `#/fragment/${route.id}`;
    case "depot":
      return "#/deposer";
    case "signal":
      return `#/signal/${route.id}`;
    case "compagnons":
      return "#/compagnons";
    case "challenges":
      return "#/challenges";
    case "challenge":
      return `#/challenges/${route.id}`;
    case "idees":
      return "#/idees";
    case "mentorat":
      return "#/mentorat";
    case "notifications":
      return "#/notifications";
    case "classements":
      return "#/classements";
    case "portfolio":
      return `#/portfolio/${route.id}`;
    case "opportunites":
      return "#/opportunites";
    case "calendrier":
      return "#/calendrier";
    case "ent-connexion":
      return "#/entreprise/connexion";
    case "ent-inscription":
      return "#/entreprise/inscription";
    case "ent-accueil":
      return "#/entreprise";
    case "ent-talents":
      return "#/entreprise/talents";
    case "ent-talent":
      return `#/entreprise/talents/${route.id}`;
    case "ent-opportunites":
      return "#/entreprise/opportunites";
    case "ent-opportunites-nouveau":
      return "#/entreprise/opportunites/nouveau";
    case "ent-challenges":
      return "#/entreprise/challenges";
    case "ent-marketplace":
      return "#/entreprise/marketplace";
    case "ent-profil-edition":
      return "#/entreprise/profil/edition";
  }
}

/** Clé de transition : deux routes distinctes ne partagent jamais une clé. */
export function routeKey(route: Route): string {
  return "id" in route && route.id ? `${route.name}:${route.id}` : route.name;
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

const getSnapshot = () => window.location.hash;

export function useRoute(): { route: Route; navigate: (to: Route) => void } {
  const hash = useSyncExternalStore(subscribe, getSnapshot, () => "");

  const navigate = useCallback((to: Route) => {
    if (to.name === "admin" || to.name === "admin-connexion") {
      if (!estSurHoteAdmin()) {
        window.location.assign(urlAdmin(to));
        return;
      }
    } else if (estSurHoteAdmin()) {
      window.location.assign(urlAdmin({ name: "admin-connexion" }));
      return;
    }
    window.location.hash = hrefFor(to);
    // `focus-on-route-change` : après une transition, le focus repart sur le
    // contenu principal, sans quoi un lecteur d'écran reste sur l'écran précédent.
    document.getElementById("contenu")?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, []);

  return { route: parseRoute(hash), navigate };
}
