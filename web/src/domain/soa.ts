/**
 * soa.ts — le modèle du domaine, dérivé de AURA_cadrage.md.
 *
 * Ce fichier ne connaît ni React, ni HTTP, ni la base. Il décrit ce que SOA
 * manipule, module par module, avec le numéro du cadrage en regard.
 *
 * Règle de nommage : les valeurs de statut, de niveau et de catégorie sont
 * **celles du cadrage**, en français, telles qu'écrites. Ne pas les traduire ni
 * en inventer d'autres — c'est ce qui garantit que l'interface parle la langue
 * du document de référence.
 */

/* ── M1 — Comptes et profils étudiants ──────────────────────────────────── */

/** Niveaux du cadrage : « niveau (L1-M2) ». */
export type Niveau = "L1" | "L2" | "L3" | "M1" | "M2";

export type Disponibilite = "Soirs" | "Week-ends" | "Vacances" | "Temps plein";

/**
 * M1 — « Authentification (email, Google, GitHub, université en option) ».
 *
 * ⚠️ **Ceci n'est pas de la sécurité, et il ne faut pas le présenter comme
 * telle.** La vérification se fait dans le navigateur, contre une liste
 * embarquée dans le paquet JavaScript. N'importe qui peut ouvrir les outils de
 * développement et lire tous les mots de passe en dix secondes.
 *
 * Ce que cela apporte quand même, et pourquoi c'est écrit plutôt que sauté :
 * le produit a besoin de savoir **qui** est connecté — le tableau de bord, les
 * projets, le profil et le portfolio changent tous selon la personne. Sans
 * session, la démonstration ne peut montrer qu'un seul utilisateur.
 *
 * Une authentification réelle suppose un serveur qui garde les empreintes et
 * délivre un jeton. Tant qu'il n'existe pas, l'écran de connexion le dit.
 */
export type AuthProvider = "email" | "google" | "github" | "universite";

export type Role = "etudiant" | "enseignant";

export interface Account {
  studentId: string;
  email: string;
  provider: AuthProvider;
  /**
   * En clair, et assumé : une empreinte calculée côté navigateur donnerait
   * l'illusion d'une protection sans en apporter une seule — le code qui la
   * vérifie est livré avec elle. Mieux vaut que la nature du dispositif soit
   * lisible dans le type que maquillée derrière un hachage décoratif.
   */
  motDePasse: string;
  /** Renseigné pour les comptes de démonstration listés à l'écran. */
  demo?: boolean;
}

/** Résultat d'une tentative de connexion — jamais un simple booléen. */
export type AuthResult =
  | { ok: true }
  /* Distinguer les deux cas est un choix de démonstration, pas de sécurité :
     sur un vrai service, dire « ce compte n'existe pas » révèle quels e-mails
     sont inscrits. Ici il n'y a rien à protéger, et un jury qui se trompe de
     compte doit comprendre pourquoi en une seconde. */
  | {
      ok: false;
      raison: "inconnu" | "motDePasse";
      /** Message du serveur, quand il est plus précis que la raison. */
      message?: string;
    };

export interface Student {
  id: string;
  nom: string;
  /** Initiales calculées à l'affichage — stockées pour rester déterministe. */
  initiales: string;
  universite: string;
  niveau: Niveau;
  filiere: string;
  /** Technos maîtrisées. Le cadrage parle de « niveau » par techno (E3). */
  technos: Skill[];
  interets: string[];
  disponibilites: Disponibilite[];
  objectifs: string;
  /** M18 — un étudiant avancé peut devenir mentor. */
  mentor: boolean;
  promo: string;
}

/** E3 — « technos maîtrisées avec niveau ». */
export interface Skill {
  nom: string;
  /** 1 découverte · 2 pratiqué · 3 à l'aise · 4 avancé. Jamais affiché en score. */
  maitrise: 1 | 2 | 3 | 4;
  /** E9 — validation formelle par une entreprise. */
  valideePar?: string;
}

/* ── M2 — Gestion de projets ────────────────────────────────────────────── */

/** Statuts du cadrage, à la lettre. */
export type ProjectStatus = "Idée" | "En cours" | "En pause" | "Abandonné" | "Terminé";

/** Types du cadrage : « académique ou personnel (startup, app perso, open source, recherche) ». */
export type ProjectType =
  | "Académique"
  | "Personnel"
  | "Startup"
  | "Open source"
  | "Recherche";

export type Difficulte = "Découverte" | "Intermédiaire" | "Ambitieux";

export interface Project {
  id: string;
  nom: string;
  description: string;
  type: ProjectType;
  status: ProjectStatus;
  technos: string[];
  objectif: string;
  /** Durée visée, en semaines. */
  dureeSemaines: number;
  debut: string;
  /** Renseignée quand le projet est Terminé ou Abandonné. */
  fin?: string;
  difficulte: Difficulte;
  ownerId: string;
  /** ISO — pilote la détection d'inactivité (M7). */
  derniereActivite: string;
  /**
   * M15 — « les projets abandonnés restent visibles avec leur état (%, raison) ».
   * Le pourcentage vient du journal, pas d'une saisie : voir `avancement()`.
   */
  raisonAbandon?: string;
  /** Le projet est-il consultable par les autres étudiants ? */
  public: boolean;
  /** M17 — éléments de présentation, renseignés à la livraison. */
  presentation?: ProjectShowcase;
  /** M4 — dépôt Git rattaché (mock : aucun appel réseau). */
  depot?: RepoLink;
}

export interface ProjectShowcase {
  captures: string[];
  /** M17 — « vidéo de démo ». URL saisie : l'envoi de fichier suppose un serveur. */
  videoUrl?: string;
  demoUrl?: string;
  architecture: string;
  documentation: string;
}

/** M4 — intégration GitHub/GitLab. Mock assumé, cf. SPEC.md §4.2. */
export interface RepoLink {
  hote: "GitHub" | "GitLab";
  slug: string;
  /** Fréquence de commits sur les 12 dernières semaines. */
  commitsParSemaine: number[];
  branches: string[];
}

/* ── M3 — Journal de progression ────────────────────────────────────────── */

/** Les cinq natures d'entrée nommées par le cadrage. */
export type JournalKind =
  | "Décision"
  | "Erreur"
  | "Solution"
  | "Architecture"
  | "Apprentissage";

export interface JournalEntry {
  id: string;
  projectId: string;
  kind: JournalKind;
  titre: string;
  corps: string;
  /** ISO, horodaté — « historique horodaté par projet ». */
  date: string;
  /** Une entrée peut marquer une étape franchie du projet. */
  jalon?: string;
}

/* ── M5 — Résumé intelligent par IA ─────────────────────────────────────── */

/** Le contrat de sortie de l'IA, tel que fixé par le cadrage. */
export interface ProjectSummary {
  projectId: string;
  objectif: string;
  faitCeQui: string[];
  resteAFaire: string[];
  derniereActivite: string;
  /** Le cadrage demande un « risque d'abandon ». Qualitatif, jamais un score. */
  risqueAbandon: "Faible" | "Modéré" | "Élevé";
  /** Ce qui motive le niveau de risque — sans quoi l'indication est opaque. */
  pourquoi: string;
}

/* ── M6 / M7 — Reprise et anti-abandon ──────────────────────────────────── */

export interface ResumptionCapsule {
  projectId: string;
  projectTitle: string;
  lastActivity: string;
  where: string;
  blocking: string;
  nextStep: { action: string; minutes: number };
}

/* ── Mémoire IA — fragments du corpus ───────────────────────────────────── */

export interface Author {
  id: string;
  name: string;
  cohort: string;
  field: string;
}

export type WorkKind = "mémoire" | "projet";
export type WorkStatus = "terminé" | "arrêté";

export interface Origin {
  work: string;
  kind: WorkKind;
  year: number;
  field: string;
  status: WorkStatus;
}

export interface ArchitectureChoice {
  decision: string;
  rationale: string;
}

export interface Excerpt {
  caption: string;
  language: string;
  code: string;
}

export interface Fragment {
  id: string;
  title: string;
  promise: string;
  origin: Origin;
  author: Author;
  reasoning: string;
  choices: ArchitectureChoice[];
  deadEnds: string[];
  leads: string[];
  excerpt?: Excerpt;
  signals: string[];
}

export interface SearchHit {
  fragment: Fragment;
  relevance: number;
  why: string;
  matchedOn: string[];
}

export interface AuthorSignal {
  id: string;
  fragmentId: string;
  fragmentTitle: string;
  author: Author;
  helpedWith: string;
  helpedAt: string;
}

export interface FragmentDraft {
  title: string;
  work: string;
  kind: WorkKind;
  status: WorkStatus;
  reasoning: string;
  deadEnds: string[];
}

/* ── M8 — Communauté étudiante ──────────────────────────────────────────── */

/** Catégories du cadrage, à la lettre. */
export const FORUM_CATEGORIES = [
  "Java",
  "PHP",
  "React",
  "IA",
  "BDD",
  "Réseau",
] as const;

export type ForumCategory = (typeof FORUM_CATEGORIES)[number];

export interface ForumThread {
  id: string;
  categorie: ForumCategory;
  titre: string;
  corps: string;
  auteurId: string;
  date: string;
  reponses: ForumReply[];
  /** Une réponse marquée comme résolvant le sujet. */
  resoluPar?: string;
  /** Ressource partagée avec le sujet — « partage de ressources par projet ». */
  ressource?: { libelle: string; url: string };
}

export interface ForumReply {
  id: string;
  auteurId: string;
  corps: string;
  date: string;
  /** M18 — une réponse de mentor est signalée comme telle. */
  deMentor: boolean;
}

/* ── M9 — Groupes de progression ────────────────────────────────────────── */

export interface Companion {
  student: Student;
  /**
   * Correspondance en %, exigée par le cadrage (« matching automatique »).
   * Toujours accompagnée de `raisons` : un pourcentage nu ne se vérifie pas.
   */
  correspondance: number;
  raisons: string[];
}

/* ── M10 — Challenges ───────────────────────────────────────────────────── */

export interface Challenge {
  id: string;
  titre: string;
  description: string;
  /** Ex. « Challenge Java 90 jours ». */
  dureeJours: number;
  techno: string;
  debut: string;
  participants: ChallengeParticipant[];
  /** E7 — un challenge peut être sponsorisé par une entreprise. */
  sponsorId?: string;
  recompense?: string;
}

export interface ChallengeParticipant {
  studentId: string;
  /** « suivi de progression hebdomadaire » — une entrée par semaine. */
  semaines: boolean[];
}

/* ── M11 / M12 — Reconnaissance ─────────────────────────────────────────── */

/**
 * SPEC.md §2bis : ces mécaniques sont conservées mais restent **secondaires**.
 * Aucun écran de reprise ne les affiche.
 */
export interface Badge {
  id: string;
  nom: string;
  description: string;
  obtenuLe?: string;
}

/**
 * M12 — « Points SOA gagnés en terminant un projet, aidant un pair, partageant
 * une solution, documentant une erreur ».
 *
 * Les quatre gestes sont ceux du cadrage, et leur barème dit quelque chose :
 * documenter une erreur rapporte autant qu'aider un pair, parce que c'est le
 * même service rendu — simplement décalé dans le temps.
 */
export type PointReason =
  | "projet-termine"
  | "pair-aide"
  | "solution-partagee"
  | "erreur-documentee";

export const POINT_VALUES: Record<PointReason, number> = {
  "projet-termine": 50,
  "pair-aide": 15,
  "solution-partagee": 15,
  "erreur-documentee": 15,
};

export const POINT_LABELS: Record<PointReason, string> = {
  "projet-termine": "Projet terminé",
  "pair-aide": "Pair aidé",
  "solution-partagee": "Solution partagée",
  "erreur-documentee": "Erreur documentée",
};

export interface PointEntry {
  studentId: string;
  reason: PointReason;
  detail: string;
  date: string;
}

/** Les trois classements nommés par le cadrage. */
export type LeaderboardKind = "academique" | "progression" | "contribution";

export interface LeaderboardRow {
  studentId: string;
  valeur: number;
  libelle: string;
}

/* ── M13 / E2 — Opportunités ────────────────────────────────────────────── */

export interface Opportunity {
  id: string;
  titre: string;
  /**
   * Le cadrage écrit « Entreprises **ou étudiants** publient des projets à
   * réaliser ». L'émetteur est donc l'un ou l'autre, jamais imposé.
   */
  companyId?: string;
  studentId?: string;
  description: string;
  technos: string[];
  dureeMois: number;
  profil: string;
  /** « possibilité de stage » — le cadrage distingue projet et emploi. */
  nature: "Projet" | "Stage" | "Alternance";
  publieeLe: string;
}

/* ── M14 — Validation d'idée ────────────────────────────────────────────── */

export interface Idea {
  id: string;
  auteurId: string;
  titre: string;
  corps: string;
  date: string;
  /** La communauté vote avant que l'étudiant ne démarre. */
  votesPour: string[];
  votesReserve: string[];
  commentaires: { auteurId: string; corps: string; date: string }[];
  /** Renseigné si l'idée est devenue un projet. */
  projetId?: string;
}

/* ── M18 — Mentorat ─────────────────────────────────────────────────────── */

export interface MentorProfile {
  studentId: string;
  domaines: string[];
  /** Alumni ou étudiant avancé — le cadrage nomme « L3, M1/M2, alumni ». */
  statut: "L3" | "M1" | "M2" | "Alumni";
  presentation: string;
  disponible: boolean;
}

/**
 * M18 — la mise en relation. Le cadrage demande que les mentors « conseillent,
 * répondent, guident » : un annuaire ne suffit pas, il faut un fil.
 */
export interface MentorRequest {
  id: string;
  mentorId: string;
  studentId: string;
  blocage: string;
  date: string;
  reponses: { auteurId: string; corps: string; date: string }[];
  statut: "en attente" | "en cours" | "résolu";
}

/* ── Universités — la branche du schéma d'architecture ──────────────────── */

/**
 * Le schéma d'architecture du cadrage place les universités au même rang que
 * les entreprises, avec quatre usages : suivi pédagogique, projets académiques,
 * classements, et l'accès à la Mémoire IA.
 *
 * Cette branche n'apparaît dans aucun des 21 modules numérotés — c'est
 * probablement pour cela qu'elle avait été oubliée. Elle est traitée ici comme
 * un espace à part entière, avec sa propre navigation.
 */
export interface Teacher {
  id: string;
  nom: string;
  initiales: string;
  universite: string;
  departement: string;
  /** Les promotions dont l'enseignant a la charge. */
  promotions: string[];
}

/** Une promotion suivie : le grain du suivi pédagogique. */
export interface Cohort {
  id: string;
  libelle: string;
  niveau: Niveau;
  filiere: string;
  annee: string;
  studentIds: string[];
}

/**
 * Encadrement d'un projet académique par un enseignant.
 * Le cadrage sépare « projets académiques » de « suivi pédagogique » : le
 * premier est l'objet, le second est le regard porté dessus.
 */
export interface Supervision {
  projectId: string;
  teacherId: string;
  cohortId: string;
  /** Observation de l'enseignant — factuelle, pas une note. */
  observation?: string;
  /** Jalon attendu par le programme, et sa date. */
  echeance?: { libelle: string; date: string };
}

/** Agrégat de suivi pédagogique pour une promotion. */
export interface CohortHealth {
  cohortId: string;
  effectif: number;
  projetsActifs: number;
  projetsTermines: number;
  projetsEnSommeil: number;
  /** Étudiants sans aucune activité depuis le seuil — le signal qui compte. */
  etudiantsSansActivite: string[];
  entreesJournal: number;
}

/* ── M20 — Notifications ────────────────────────────────────────────────── */

export type NotificationKind =
  | "reprise"
  | "forum"
  | "challenge"
  | "opportunite"
  | "signal"
  | "mentorat";

/** M20 — « Canaux : email, push mobile, notification web ». */
export type NotificationChannel = "web" | "email" | "push";

export interface ChannelPrefs {
  web: boolean;
  email: boolean;
  push: boolean;
}

export interface Notification {
  id: string;
  kind: NotificationKind;
  titre: string;
  corps: string;
  date: string;
  lu: boolean;
  /** Route à ouvrir au clic — le cadrage exige des notifications actionnables. */
  cible?: string;
}

/* ── Module Entreprise (E1–E10) ─────────────────────────────────────────── */

export interface Company {
  id: string;
  nom: string;
  secteur: string;
  technosRecherchees: string[];
  /** « stagiaires, alternants, juniors ». */
  profilsRecherches: string[];
  presentation: string;
}

/**
 * E4 — « Project Reliability Score ». Le cadrage insiste : indicateur
 * d'**engagement**, pas d'intelligence. Les cinq composantes sont les siennes.
 */
export interface ReliabilityScore {
  studentId: string;
  regularite: number;
  projetsTermines: number;
  documentation: number;
  collaboration: number;
  entraide: number;
  /** Moyenne des cinq, arrondie. Affichée avec son détail, jamais seule. */
  global: number;
}

/** E5 — Talent Discovery. */
export interface TalentMatch {
  student: Student;
  correspondance: number;
  raisons: string[];
  score: ReliabilityScore;
}

/* ── Agrégats de lecture ────────────────────────────────────────────────── */

/** M19 — analytics personnel étudiant. */
export interface StudentAnalytics {
  projetsCommences: number;
  projetsTermines: number;
  projetsRepris: number;
  /** Techno la plus utilisée, exigée telle quelle par le cadrage. */
  technoPrincipale: string;
  /** M19 — « progression moyenne », sur les projets non terminés. */
  progressionMoyenne: number;
  entreesJournal: number;
  /** M12 — total des points SOA. */
  points: number;
  /** Activité des 12 dernières semaines — alimente la carte de rythme. */
  rythme: number[];
}

/* ── Fonctions de domaine ───────────────────────────────────────────────── */

const JOUR = 86_400_000;

export function joursDepuis(iso: string, maintenant = Date.now()): number {
  return Math.max(0, Math.floor((maintenant - new Date(iso).getTime()) / JOUR));
}

/**
 * Avancement d'un projet, déduit du journal.
 *
 * Volontairement **pas** une saisie de l'étudiant : demander « où en es-tu, en
 * pourcentage ? » est exactement la question à laquelle personne ne sait
 * répondre honnêtement, et une jauge fausse est pire qu'une absence de jauge.
 * Ici, un projet avance quand il produit des décisions et des solutions — pas
 * quand on déplace un curseur.
 */
export function avancement(entries: JournalEntry[]): number {
  if (entries.length === 0) return 0;
  const jalons = entries.filter((e) => e.jalon).length;
  const substantielles = entries.filter(
    (e) => e.kind === "Solution" || e.kind === "Architecture",
  ).length;
  const brut = jalons * 18 + substantielles * 7 + entries.length * 2;
  return Math.min(96, brut);
}

/** M7 — un projet est en sommeil au-delà du seuil du cadrage (7 jours). */
export const SEUIL_INACTIVITE_JOURS = 7;

export function enSommeil(projet: Project, maintenant = Date.now()): boolean {
  if (projet.status === "Terminé" || projet.status === "Abandonné") return false;
  return joursDepuis(projet.derniereActivite, maintenant) >= SEUIL_INACTIVITE_JOURS;
}

/** E4 — moyenne des cinq composantes, arrondie. */
export function scoreGlobal(s: Omit<ReliabilityScore, "global" | "studentId">): number {
  return Math.round(
    (s.regularite + s.projetsTermines + s.documentation + s.collaboration + s.entraide) / 5,
  );
}
