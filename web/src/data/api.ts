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

  // `FormData` (upload de fichier, voir `envoyerPhoto`/`envoyerCv`) part telle
  // quelle : lui fixer `content-type` empêcherait le navigateur d'y joindre sa
  // frontière multipart, et `JSON.stringify` la détruirait.
  const estFormData = corps instanceof FormData;

  const reponse = await fetch(`${BASE}${chemin}`, {
    method: methode,
    // La session voyage en cookie : sans `credentials`, le navigateur ne
    // l'envoie pas sur une requête déclenchée par du JavaScript, et toute
    // écriture répondrait 401 sans explication visible.
    credentials: "include",
    headers:
      corps === undefined || estFormData ? {} : { "content-type": "application/json" },
    body: corps === undefined ? undefined : estFormData ? corps : JSON.stringify(corps),
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
  desactiverCompte: (motDePasse: string, confirmation: string) =>
    appel<{ desactive: true }>("/api/auth/compte/desactiver", {
      methode: "POST",
      corps: { motDePasse, confirmation },
    }),
  supprimerCompte: (motDePasse: string, confirmation: string) =>
    appel<{ supprime: true }>("/api/auth/compte", {
      methode: "DELETE",
      corps: { motDePasse, confirmation },
    }),
  connexionAdmin: (email: string, motDePasse: string) =>
    appel<{ admin: { email: string } }>("/api/admin/connexion", {
      methode: "POST",
      corps: { email, motDePasse },
    }),
  sessionAdmin: () => appel<{ admin: { email: string } | null }>("/api/admin/session"),
  deconnexionAdmin: () => appel<{ deconnecte: true }>("/api/admin/deconnexion", { methode: "POST" }),
  apercuAdmin: () => appel<AdminOverview>("/api/admin/overview"),
  collectionAdmin: (
    nom: AdminCollection,
    options: { q?: string; page?: number; taille?: number } = {},
    signal?: AbortSignal,
  ) => {
    const parametres = new URLSearchParams();
    if (options.q) parametres.set("q", options.q);
    if (options.page) parametres.set("page", String(options.page));
    if (options.taille) parametres.set("taille", String(options.taille));
    const requete = parametres.toString();
    return appel<AdminCollectionPage>(
      `/api/admin/collection/${nom}${requete ? `?${requete}` : ""}`,
      { signal },
    );
  },
  modifierAdmin: (nom: AdminCollection, id: string, corps: Record<string, unknown>) =>
    appel<{ modifie: true }>(`/api/admin/collection/${nom}/${id}`, { methode: "PATCH", corps }),
  supprimerAdmin: (nom: AdminCollection, id: string) =>
    appel<{ supprime: true }>(`/api/admin/collection/${nom}/${id}`, { methode: "DELETE" }),
  dossierEtudiantAdmin: (id: string) => appel<AdminDossierEtudiant>(`/api/admin/etudiant/${id}`),
  dossierEntrepriseAdmin: (id: string) => appel<AdminDossierEntreprise>(`/api/admin/entreprise/${id}`),
  activationEtudiantAdmin: (id: string, actif: boolean) =>
    appel<{ deactivatedAt: string | null }>(`/api/admin/etudiant/${id}/activation`, {
      methode: "POST",
      corps: { actif },
    }),
  motDePasseEtudiantAdmin: (id: string, motDePasse: string) =>
    appel<{ reinitialise: true; email: string | null }>(`/api/admin/etudiant/${id}/mot-de-passe`, {
      methode: "POST",
      corps: { motDePasse },
    }),
  motDePasseEntrepriseAdmin: (id: string, motDePasse: string) =>
    appel<{ reinitialise: true; email: string }>(`/api/admin/entreprise/${id}/mot-de-passe`, {
      methode: "POST",
      corps: { motDePasse },
    }),
  attribuerPointAdmin: (id: string, motif: string, detail: string) =>
    appel<{ id: string }>(`/api/admin/etudiant/${id}/point`, {
      methode: "POST",
      corps: { motif, detail },
    }),
  reglagesAdmin: () => appel<{ reglages: ReglagesPlateforme }>("/api/admin/reglages"),
  majReglagesAdmin: (corps: Partial<ReglagesPlateforme>) =>
    appel<{ reglages: ReglagesPlateforme }>("/api/admin/reglages", { methode: "PATCH", corps }),
  notifierAdmin: (titre: string, corps: string, etudiantId?: string) =>
    appel<{ envoyees: number }>("/api/admin/notification", {
      methode: "POST",
      corps: { titre, corps, etudiantId },
    }),
  majProfil: (corps: Record<string, unknown>) =>
    appel<{ etudiant: unknown }>("/api/profil", { methode: "PATCH", corps }),
  envoyerPhoto: (fichier: File) => {
    const corps = new FormData();
    corps.append("photo", fichier);
    return appel<{ photoUrl: string }>("/api/profil/photo", { methode: "POST", corps });
  },
  supprimerPhoto: () => appel<{ ok: true }>("/api/profil/photo", { methode: "DELETE" }),
  envoyerCv: (fichier: File) => {
    const corps = new FormData();
    corps.append("cv", fichier);
    return appel<{ cvUrl: string; cvNom: string }>("/api/profil/cv", {
      methode: "POST",
      corps,
    });
  },
  supprimerCv: () => appel<{ ok: true }>("/api/profil/cv", { methode: "DELETE" }),

  /* Projets et journal */
  creerProjet: (corps: Record<string, unknown>) =>
    appel<{ id: string }>("/api/projets", { methode: "POST", corps }),
  rattacherDepot: (id: string, url: string) =>
    appel<{ depot: unknown }>(`/api/projets/${id}/depot`, {
      methode: "PATCH",
      corps: { url },
    }),
  synchroniserDepot: (id: string) =>
    appel<{ depot: unknown }>(`/api/projets/${id}/depot/synchroniser`, { methode: "POST" }),
  detacherDepot: (id: string) =>
    appel<{ ok: true }>(`/api/projets/${id}/depot`, { methode: "DELETE" }),
  marquerNotificationLue: (id: string) =>
    appel<{ ok: true }>(`/api/notifications/${id}/lue`, { methode: "PATCH" }),
  supprimerNotification: (id: string) =>
    appel<{ supprime: true }>(`/api/notifications/${id}`, { methode: "DELETE" }),
  supprimerNotifications: (ids: string[]) =>
    appel<{ ids: string[] }>("/api/notifications", { methode: "DELETE", corps: { ids } }),
  supprimerToutesNotifications: () =>
    appel<{ ids: string[] }>("/api/notifications", { methode: "DELETE", corps: { tout: true } }),
  notifications: () => appel<{ notifications: unknown[] }>("/api/notifications"),
  sauvegarderPresentation: (
    id: string,
    corps: {
      architecture: string;
      documentation: string;
      videoUrl?: string;
      demoUrl?: string;
      captures: string[];
    },
  ) =>
    appel<{ presentation: unknown }>(`/api/projets/${id}/presentation`, {
      methode: "PATCH",
      corps,
    }),
  envoyerCapturePresentation: (id: string, fichier: File) => {
    const corps = new FormData();
    corps.append("capture", fichier);
    return appel<{ captureUrl: string; presentation: unknown }>(
      `/api/projets/${id}/presentation/captures`,
      { methode: "POST", corps },
    );
  },
  supprimerCapturePresentation: (id: string, url: string) =>
    appel<{ presentation: unknown }>(`/api/projets/${id}/presentation/captures`, {
      methode: "DELETE",
      corps: { url },
    }),
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
  toggleChecklistItem: (projectId: string, itemId: string, fait: boolean) =>
    appel<{ ok: true }>(`/api/projets/${projectId}/checklist/${itemId}`, {
      methode: "PATCH",
      corps: { fait },
    }),
  bloquerChecklistItem: (projectId: string, itemId: string, bloque: boolean) =>
    appel<{ ok: true }>(`/api/projets/${projectId}/checklist/${itemId}`, {
      methode: "PATCH",
      corps: { bloque },
    }),
  ajouterChecklistItem: (
    projectId: string,
    corps: { id: string; libelle: string; dureeHeures: number; parentId?: string },
  ) =>
    appel<{ id: string; ordre: number }>(`/api/projets/${projectId}/checklist`, {
      methode: "POST",
      corps,
    }),
  resumeProjet: (id: string, signal?: AbortSignal) =>
    appel<ResumeDistant>(`/api/projets/${id}/resume`, { signal }),

  /* Copilote IA — la clé Gemini reste côté API ; le navigateur ne voit que
     les messages déjà associés à sa session. */
  messagesCopilote: (role: CopilotRole) =>
    appel<{ messages: CopilotMessage[] }>(`/api/copilote/messages?role=${role}`),
  conversationsCopilote: () =>
    appel<{ conversations: CopilotConversation[] }>("/api/copilote/conversations"),
  messagesConversationCopilote: (id: string) =>
    appel<{ conversation: Pick<CopilotConversation, "id" | "role" | "title">; messages: CopilotMessage[] }>(
      `/api/copilote/conversations/${id}/messages`,
    ),
  envoyerMessageCopilote: (role: CopilotRole, message: string, conversationId?: string) =>
    appel<{ assistant: CopilotMessage; conversation: Pick<CopilotConversation, "id" | "role" | "title"> }>("/api/copilote/messages", {
      methode: "POST",
      corps: { role, message, conversationId },
    }),
  effacerMessagesCopilote: (role: CopilotRole) =>
    appel<{ ok: true }>(`/api/copilote/messages?role=${role}`, { methode: "DELETE" }),

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

  /* Calendrier */
  creerEvenement: (corps: Record<string, unknown>) =>
    appel<{ id: string }>("/api/evenements", { methode: "POST", corps }),
  supprimerEvenement: (id: string) =>
    appel<{ ok: true }>(`/api/evenements/${id}`, { methode: "DELETE" }),

  /* Comptes entreprise — hors cadrage, addition */
  sessionEntreprise: () =>
    appel<{ entreprise: unknown | null }>("/api/entreprise/session"),
  connexionEntreprise: (email: string, motDePasse: string) =>
    appel<{ entreprise: unknown }>("/api/entreprise/connexion", {
      methode: "POST",
      corps: { email, motDePasse },
    }),
  inscriptionEntreprise: (corps: Record<string, unknown>) =>
    appel<{ entreprise: unknown }>("/api/entreprise/inscription", {
      methode: "POST",
      corps,
    }),
  deconnexionEntreprise: () =>
    appel<{ deconnecte: true }>("/api/entreprise/deconnexion", { methode: "POST" }),
  majProfilEntreprise: (corps: Record<string, unknown>) =>
    appel<{ entreprise: unknown }>("/api/entreprise/profil", { methode: "PATCH", corps }),
} as const;

/* ── Formes renvoyées par le serveur ───────────────────────────────────── */

export interface EtatDistant {
  sessionId: string | null;
  sessionEntrepriseId: string | null;
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
  events: unknown[];
  /** Bandeau posé depuis l'administration, ou `null`. */
  annonce?: AnnoncePlateforme | null;
  /** Vrai quand les écritures sont suspendues côté serveur. */
  maintenance?: boolean;
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

export interface ResumeDistant {
  projectId: string;
  objectif: string;
  faitCeQui: string[];
  enCours: string[];
  resteAFaire: string[];
  derniereActivite: string;
  risqueAbandon: "Faible" | "Modéré" | "Élevé";
  pourquoi: string;
  source: "gemini" | "claude" | "journal";
}

export type CopilotRole = "pilotage" | "technique" | "soutenance";

export interface CopilotMessage {
  id: string;
  role: CopilotRole;
  author: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface CopilotConversation {
  id: string;
  role: CopilotRole;
  title: string;
  preview: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Administration — les noms de collection sont ceux du serveur.
 *
 * Une seule liste sert à la fois de chemin d'URL, de clé de section et de
 * cible de suppression : deux vocabulaires (un pour lire, un pour écrire)
 * finiraient par diverger, et la divergence ne se verrait qu'au clic.
 */
export const ADMIN_COLLECTIONS = [
  "etudiants",
  "entreprises",
  "projets",
  "journal",
  "discussions",
  "reponses",
  "fiches",
  "idees",
  "defis",
  "mentorat",
  "annonces",
  "evenements",
  "conversations",
  "points",
  "notifications",
] as const;

export type AdminCollection = (typeof ADMIN_COLLECTIONS)[number];

export interface AnnoncePlateforme {
  titre: string;
  corps: string;
  ton: "info" | "alerte";
}

export interface ReglagesPlateforme {
  inscriptionsOuvertes: boolean;
  inscriptionsEntrepriseOuvertes: boolean;
  copiloteActif: boolean;
  maintenance: boolean;
  annonce: AnnoncePlateforme | null;
}

/** Compteurs de l'accueil : une clé par section, plus deux détails utiles. */
export type AdminStats = Record<AdminCollection, number> & {
  etudiantsActifs: number;
  projetsEnCours: number;
};

export interface AdminOverview {
  stats: AdminStats;
  reglages: ReglagesPlateforme;
  tailleParPage: number;
}

/** Descripteur d'un champ modifiable, tel que le serveur le déclare. */
export interface AdminChamp {
  colonne: string;
  genre: "texte" | "texteOuNull" | "liste" | "booleen" | "entier" | "date";
  cast?: string;
  valeurs?: string[];
}

/**
 * Une page de collection.
 *
 * `lignes` n'est pas typée par collection : les quinze formes existent déjà
 * côté serveur, les redéclarer ici garantirait surtout qu'elles se
 * désynchronisent. L'écran lit les colonnes qu'il affiche, et une colonne
 * absente vaut vide.
 */
export interface AdminCollectionPage {
  nom: AdminCollection;
  lignes: Array<Record<string, unknown>>;
  total: number;
  page: number;
  taille: number;
  champs: Record<string, AdminChamp>;
}

export interface AdminDossierEtudiant {
  etudiant: {
    id: string;
    nom: string;
    initiales: string;
    universite: string;
    niveau: string;
    filiere: string;
    promo: string;
    interets: string[];
    objectifs: string;
    mentor: boolean;
    deactivatedAt: string | null;
    createdAt: string;
  };
  comptes: Array<{ id: string; email: string | null; provider: string }>;
  projets: Array<{ id: string; nom: string; statut: string; updatedAt: string; public: boolean }>;
  points: Array<{ id: string; motif: string; detail: string; date: string }>;
  discussions: Array<{ id: string; titre: string; categorie: string; date: string }>;
  fiches: Array<{ id: string; titre: string; etat: string; createdAt: string }>;
  evenements: Array<{ id: string; titre: string; date: string; type: string }>;
  conversations: Array<{ id: string; title: string; role: CopilotRole; updatedAt: string; messageCount: number }>;
  notifications: Array<{ id: string; titre: string; nature: string; date: string; lu: boolean }>;
}

export interface AdminDossierEntreprise {
  entreprise: {
    id: string;
    nom: string;
    secteur: string;
    presentation: string;
    technosRecherchees: string[];
    profilsRecherches: string[];
  };
  comptes: Array<{ id: string; email: string }>;
  annonces: Array<{ id: string; titre: string; nature: string; publishedAt: string }>;
  defis: Array<{ id: string; titre: string; techno: string; debut: string }>;
}

export interface UsageDistant {
  id: string;
  a_servi_a: string;
  date: string;
  beneficiaire: string | null;
}
