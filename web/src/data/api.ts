/**
 * api.ts — le client HTTP.
 *
 * **Le mode est décidé au build, pas à l'exécution.** `VITE_API_URL` est
 * inlinée par Vite au moment de la construction : vide, l'application reste en
 * mode démonstration (corpus local + `localStorage`) ; renseignée, elle parle
 * au serveur. Un seul code, deux déploiements possibles — et surtout, la
 * démonstration continue de fonctionner si l'API est indisponible le jour de
 * la soutenance.
 *
 * Chaîne vide plutôt qu'absente en production : le front et l'API sont servis
 * par le même nginx sur la même origine, donc `/api/...` en chemin relatif
 * suffit. Cela évite d'avoir à connaître le domaine au moment du build.
 */

const BASE = (import.meta.env["VITE_API_URL"] ?? "").replace(/\/$/, "");

/**
 * L'API est-elle branchée ?
 *
 * `VITE_MODE_API` force le mode quand l'API est sur la même origine (donc
 * `VITE_API_URL` vide) : sans ce drapeau, chaîne vide serait indistinguable
 * de « pas d'API ».
 */
export const API_ACTIVE =
  import.meta.env["VITE_MODE_API"] === "1" || BASE.length > 0;

export class ErreurApi extends Error {
  /* Champ déclaré puis affecté, et non propriété de paramètre : `tsconfig`
     active `erasableSyntaxOnly`, qui interdit les syntaxes TypeScript sans
     équivalent JavaScript effaçable — c'est ce qui permet à Node d'exécuter
     ces fichiers sans transpilation. */
  readonly statut: number;

  constructor(message: string, statut: number) {
    super(message);
    this.name = "ErreurApi";
    this.statut = statut;
  }
}

interface Options {
  methode?: "GET" | "POST" | "PATCH" | "DELETE";
  corps?: unknown;
  signal?: AbortSignal;
}

export async function appel<T>(chemin: string, options: Options = {}): Promise<T> {
  const { methode = "GET", corps, signal } = options;

  const reponse = await fetch(`${BASE}${chemin}`, {
    method: methode,
    // La session voyage en cookie : sans `credentials`, le navigateur ne
    // l'envoie pas sur une requête déclenchée par du JavaScript, et toute
    // écriture répondrait 401 sans explication visible.
    credentials: "include",
    headers: corps === undefined ? {} : { "content-type": "application/json" },
    body: corps === undefined ? undefined : JSON.stringify(corps),
    signal,
  });

  if (!reponse.ok) {
    // Le corps d'erreur de l'API porte un message rédigé pour être lu par
    // quelqu'un ; on le préfère au statut brut quand il existe.
    let message = `Erreur ${reponse.status}`;
    try {
      const detail = (await reponse.json()) as { erreur?: string };
      if (detail?.erreur) message = detail.erreur;
    } catch {
      /* Réponse sans corps JSON — le statut suffira. */
    }
    throw new ErreurApi(message, reponse.status);
  }

  if (reponse.status === 204) return undefined as T;
  return (await reponse.json()) as T;
}

export const api = {
  /** L'état applicatif complet, en un appel (voir `server/src/routes/etat.ts`). */
  etat: (signal?: AbortSignal) => appel<EtatDistant>("/api/etat", { signal }),

  /* Session */
  session: () => appel<{ etudiant: unknown | null }>("/api/auth/session"),
  connexion: (email: string, motDePasse: string) =>
    appel<{ etudiant: unknown }>("/api/auth/connexion", {
      methode: "POST",
      corps: { email, motDePasse },
    }),
  inscription: (corps: Record<string, unknown>) =>
    appel<{ etudiant: unknown }>("/api/auth/inscription", { methode: "POST", corps }),
  deconnexion: () => appel<{ deconnecte: true }>("/api/auth/deconnexion", { methode: "POST" }),
  majProfil: (corps: Record<string, unknown>) =>
    appel<{ etudiant: unknown }>("/api/profil", { methode: "PATCH", corps }),

  /* Projets et journal */
  creerProjet: (corps: Record<string, unknown>) =>
    appel<{ id: string }>("/api/projets", { methode: "POST", corps }),
  changerStatut: (id: string, statut: string, raison?: string) =>
    appel<{ ok: true }>(`/api/projets/${id}/statut`, {
      methode: "PATCH",
      corps: { statut, raison },
    }),
  ecrireJournal: (id: string, corps: Record<string, unknown>) =>
    appel<{ id: string; date: string }>(`/api/projets/${id}/journal`, {
      methode: "POST",
      corps,
    }),
  reprendreProjet: (id: string) =>
    appel<{ ok: true }>(`/api/projets/${id}/reprendre`, { methode: "POST" }),

  /* Mémoire */
  rechercher: (q: string, signal?: AbortSignal) =>
    appel<{ resultats: ResultatDistant[] }>(
      `/api/fiches/recherche?q=${encodeURIComponent(q)}`,
      { signal },
    ),
  fiche: (id: string) => appel<Record<string, unknown>>(`/api/fiches/${id}`),
  usages: (id: string) => appel<{ usages: UsageDistant[] }>(`/api/fiches/${id}/usages`),
  declarerUsage: (id: string, aServiA: string) =>
    appel<{ ok: true }>(`/api/fiches/${id}/usage`, {
      methode: "POST",
      corps: { aServiA },
    }),

  /* Collectif */
  creerSujet: (corps: Record<string, unknown>) =>
    appel<{ id: string }>("/api/sujets", { methode: "POST", corps }),
  repondreSujet: (id: string, corps: string) =>
    appel<{ ok: true }>(`/api/sujets/${id}/reponses`, {
      methode: "POST",
      corps: { corps },
    }),
  voterIdee: (id: string, sens: "pour" | "reserve") =>
    appel<{ ok: true }>(`/api/idees/${id}/vote`, { methode: "POST", corps: { sens } }),
  commenterIdee: (id: string, corps: string) =>
    appel<{ ok: true }>(`/api/idees/${id}/commentaires`, {
      methode: "POST",
      corps: { corps },
    }),
  rejoindreChallenge: (id: string) =>
    appel<{ ok: true }>(`/api/challenges/${id}/inscription`, { methode: "POST" }),
  cocherSemaine: (id: string, semaine: number) =>
    appel<{ semaines: boolean[] }>(`/api/challenges/${id}/semaine`, {
      methode: "PATCH",
      corps: { semaine },
    }),
  demanderMentor: (mentorId: string, blocage: string) =>
    appel<{ id: string }>("/api/mentorat/demandes", {
      methode: "POST",
      corps: { mentorId, blocage },
    }),
  repondreMentor: (id: string, corps: string) =>
    appel<{ ok: true }>(`/api/mentorat/demandes/${id}/reponses`, {
      methode: "POST",
      corps: { corps },
    }),
  publierOpportunite: (corps: Record<string, unknown>) =>
    appel<{ id: string }>("/api/opportunites", { methode: "POST", corps }),

  /* Notifications */
  toutLu: () => appel<{ ok: true }>("/api/notifications/lues", { methode: "PATCH" }),
} as const;

/* ── Formes renvoyées par le serveur ───────────────────────────────────── */

export interface EtatDistant {
  sessionId: string | null;
  students: unknown[];
  projects: unknown[];
  journal: unknown[];
  threads: unknown[];
  challenges: unknown[];
  ideas: unknown[];
  opportunities: unknown[];
  mentorRequests: unknown[];
  mentors: unknown[];
  companies: unknown[];
  cohorts: unknown[];
  supervisions: unknown[];
  points: unknown[];
  badges: unknown[];
  notifications: unknown[];
}

export interface ResultatDistant {
  id: string;
  titre: string;
  promesse: string;
  origine: { oeuvre: string; nature: string; annee: number; domaine: string; etat: string };
  auteur: { nom: string; promo: string };
  pertinence: number;
  pourquoi: string;
  extraits: string;
}

export interface UsageDistant {
  id: string;
  a_servi_a: string;
  date: string;
  beneficiaire: string | null;
}
