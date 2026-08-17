import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type {
  Account,
  AuthResult,
  CalendarEvent,
  Challenge,
  ChannelPrefs,
  ChecklistItem,
  CohortHealth,
  Company,
  ForumThread,
  Idea,
  JournalEntry,
  JournalKind,
  MentorRequest,
  NewCalendarEvent,
  Notification,
  Opportunity,
  PointEntry,
  Project,
  ProjectShowcase,
  ProjectStatus,
  ProjectSummary,
  RepoLink,
  ResumptionCapsule,
  Student,
  StudentAnalytics,
} from "@/domain/soa";
import {
  DEFAULT_KANBAN_COLUMNS,
  POINT_VALUES,
  SEUIL_INACTIVITE_JOURS,
  avancement,
  enSommeil,
  joursDepuis,
} from "@/domain/soa";
import {
  ACCOUNTS,
  CHALLENGES,
  COHORTS,
  COMPANIES,
  CURRENT_STUDENT_ID,
  IDEAS,
  JOURNAL,
  MENTOR_REQUESTS,
  NOTIFICATIONS,
  OPPORTUNITIES,
  POINTS,
  PROJECTS,
  STUDENTS,
  THREADS,
} from "@/data/soa-corpus";
import { API_ACTIVE, ErreurApi, api, type AnnoncePlateforme } from "@/data/api";
import { CLES, charger, enregistrer } from "@/lib/persistence";

import { nouvelUuid, pousser } from "./sync";

/**
 * soa-store.tsx — l'état applicatif de la démonstration.
 *
 * Tout ce qui serait servi par l'API vit ici, en mémoire. Les écrans ne
 * connaissent que ce contexte : le jour où le backend existe, on remplace
 * l'implémentation sans toucher un composant (HANDOFF.md §4).
 *
 * Les mutations sont **réelles** : créer un projet, écrire dans le journal,
 * voter une idée, rejoindre un challenge modifient l'état et se répercutent
 * partout. Une démonstration où les boutons ne font rien se voit en trente
 * secondes, et c'est le genre de détail qui coûte un jury.
 */

interface SoaState {
  students: Student[];
  projects: Project[];
  journal: JournalEntry[];
  threads: ForumThread[];
  challenges: Challenge[];
  ideas: Idea[];
  notifications: Notification[];
  opportunities: Opportunity[];
  mentorRequests: MentorRequest[];
  /** Calendrier personnel — hors cadrage, addition. */
  events: CalendarEvent[];
  /** M1 — null tant que personne n'est connecté. */
  sessionId: string | null;
  /** M20 — « Canaux : email, push mobile, notification web ». */
  channels: ChannelPrefs;
  /** Comptes entreprise réels — hors cadrage, addition. */
  companies: Company[];
  sessionEntrepriseId: string | null;
  /** M12 — journal des 4 gestes réels ; voir `pointsOf` et `PointsCelebration`. */
  points: PointEntry[];
  /**
   * Bandeau posé depuis l'administration, ou `null`. Vient de `/api/etat` :
   * l'annonce suit donc le même cycle que le reste de l'état, et disparaît
   * d'elle-même au rechargement suivant sa dépose.
   */
  annonce: AnnoncePlateforme | null;
  /**
   * Maintenance déclarée côté serveur. Le front ne s'en sert que pour
   * prévenir : c'est le serveur qui refuse les écritures, et lui seul.
   */
  maintenance: boolean;
  /**
   * En mode API, `false` jusqu'à ce que le premier `/api/etat` ait répondu
   * (succès ou échec) — voir `useGardeSession` (App.tsx) : sans ce signal, un
   * arrivant par redirection serveur complète (ex. retour OAuth) est jugé
   * déconnecté sur la seule foi de `sessionId` initial (lu de `localStorage`,
   * jamais du cookie httpOnly réel) et renvoyé vers `#/connexion` avant même
   * que la vraie réponse du serveur soit arrivée. En mode démo, toujours vrai
   * : il n'y a pas de cookie à attendre.
   */
  hydrated: boolean;
}

interface SoaApi extends SoaState {
  /* M1 — session */
  me: Student;
  connecte: boolean;
  /** Comptes entreprise réels — hors cadrage, addition. `null` hors session
      entreprise réelle (l'aperçu démo via le Shell reste possible sans). */
  entreprise: Company | null;
  entrepriseConnectee: boolean;

  /* Lectures dérivées */
  myProjects: Project[];
  dormant: Project[];
  analytics: StudentAnalytics;
  capsule: ResumptionCapsule | null;
  unread: number;
  journalFor: (projectId: string) => JournalEntry[];
  progressOf: (projectId: string) => number;
  summaryFor: (projectId: string) => ProjectSummary | null;
  threadById: (id: string) => ForumThread | undefined;

  /* Mutations */
  createProject: (draft: NewProject) => Project;
  /** Coche/décoche une étape de la checklist ("post-it") — voir `progressOf`. */
  toggleChecklistItem: (projectId: string, itemId: string) => void;
  /** Signale qu'une étape attend une aide ou une décision. */
  toggleChecklistBlocked: (projectId: string, itemId: string) => void;
  /** Ajoute une tâche (ou sous-tâche via `parentId`) après la création. */
  addChecklistItem: (
    projectId: string,
    etape: { libelle: string; dureeHeures: number; parentId?: string },
  ) => void;
  moveChecklistItemColumn: (projectId: string, itemId: string, columnId: string) => void;
  assignChecklistItem: (projectId: string, itemId: string, studentId: string | undefined) => void;
  addProjectMember: (projectId: string, studentId: string) => void;
  removeProjectMember: (projectId: string, studentId: string) => void;
  addKanbanColumn: (projectId: string, titre: string) => void;
  deleteKanbanColumn: (projectId: string, columnId: string) => void;
  linkGitHubRepo: (projectId: string, slugOrUrl: string) => void;
  setProjectStatus: (projectId: string, status: ProjectStatus, raison?: string) => void;
  addJournalEntry: (draft: NewJournalEntry) => JournalEntry;
  replyToThread: (threadId: string, corps: string) => void;
  createThread: (draft: NewThread) => ForumThread;
  voteIdea: (ideaId: string, sens: "pour" | "reserve") => void;
  joinChallenge: (challengeId: string) => void;
  checkChallengeWeek: (challengeId: string, semaine: number) => void;
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;
  deleteNotifications: (ids: string[]) => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
  setChannel: (canal: keyof ChannelPrefs, actif: boolean) => void;

  /** Calendrier personnel — hors cadrage, addition. */
  createEvent: (draft: NewCalendarEvent) => void;
  deleteEvent: (id: string) => void;

  /* M1 — authentification. Voir `domain/soa.ts` : ceci n'est pas de la
     sécurité, c'est une session qui permet de savoir qui est connecté. */
  login: (email: string, motDePasse: string) => Promise<AuthResult>;
  signup: (draft: NewStudent) => Promise<AuthResult>;
  logout: () => void;
  desactiverCompte: (motDePasse: string, confirmation: string) => Promise<void>;
  supprimerCompte: (motDePasse: string, confirmation: string) => Promise<void>;
  updateProfile: (patch: Partial<Student>) => void;
  /** Hors cadrage, addition — photo de profil et CV. */
  uploadPhoto: (fichier: File) => Promise<void>;
  removePhoto: () => Promise<void>;
  uploadCv: (fichier: File) => Promise<void>;
  removeCv: () => Promise<void>;

  /** Comptes entreprise réels — hors cadrage, addition. */
  loginEntreprise: (email: string, motDePasse: string) => Promise<AuthResult>;
  signupEntreprise: (draft: NewCompanyAccount) => Promise<AuthResult>;
  logoutEntreprise: () => void;
  updateCompanyProfile: (patch: Partial<Company>) => void;

  /* M12 — points SOA */
  pointsOf: (studentId: string) => number;

  /* M14 — commenter une idée */
  commentIdea: (ideaId: string, corps: string) => void;

  /* M18 — mise en relation */
  askMentor: (mentorId: string, blocage: string) => MentorRequest;
  answerMentorRequest: (requestId: string, corps: string) => void;

  /* M13 — un étudiant publie aussi */
  publishOpportunity: (draft: NewOpportunity, emetteur?: "etudiant" | "entreprise") => Promise<void>;

  /* Dépôt et présentation — persistés côté API quand elle est active. */
  attachRepo: (projectId: string, url: string) => Promise<void>;
  syncRepo: (projectId: string) => Promise<void>;
  detachRepo: (projectId: string) => Promise<void>;
  saveShowcase: (projectId: string, showcase: ProjectShowcase) => Promise<void>;
  uploadShowcaseCapture: (projectId: string, fichier: File) => Promise<void>;
  removeShowcaseCapture: (projectId: string, url: string) => Promise<void>;

  /* E8/E9 — actions entreprise */
  validateSkill: (studentId: string, techno: string, entreprise: string) => void;
  proposeInterview: (studentId: string) => void;

  /* Universités */
  cohortHealth: (cohortId: string) => CohortHealth;
  /** M15 — reprendre un projet arrêté par quelqu'un d'autre. */
  reviveProject: (projectId: string) => Project;
}

export interface NewProject {
  nom: string;
  description: string;
  type: Project["type"];
  technos: string[];
  objectif: string;
  dureeSemaines: number;
  difficulte: Project["difficulte"];
  /**
   * Étapes prévues, saisies à la création — voir `ChecklistItem`. Uniquement
   * des tâches de premier niveau ; les sous-tâches se rattachent ensuite
   * depuis l'espace projet, via `addChecklistItem`.
   */
  checklist?: { libelle: string; dureeHeures: number }[];
  /** M13 — l'appel à projet qui a motivé ce projet, voir `Project.opportuniteId`. */
  opportuniteId?: string;
}

export interface NewJournalEntry {
  projectId: string;
  kind: JournalKind;
  titre: string;
  corps: string;
  jalon?: string;
}

export interface NewThread {
  categorie: ForumThread["categorie"];
  titre: string;
  corps: string;
}

export interface NewStudent {
  nom: string;
  email: string;
  motDePasse: string;
  universite: string;
  niveau: Student["niveau"];
  filiere: string;
  objectifs: string;
}

/** Comptes entreprise réels — hors cadrage, addition. */
export interface NewCompanyAccount {
  nom: string;
  secteur: string;
  email: string;
  motDePasse: string;
  presentation?: string;
}

export interface NewOpportunity {
  titre: string;
  description: string;
  technos: string[];
  dureeMois: number;
  profil: string;
  nature: Opportunity["nature"];
}

const SoaContext = createContext<SoaApi | null>(null);

/**
 * Persistance de la session.
 *
 * Sans elle, un rechargement de page déconnecte — et un rechargement arrive
 * toujours, y compris en pleine soutenance. Seul l'identifiant est conservé :
 * ni le mot de passe, ni les données, qui restent en mémoire et repartent de
 * leur état initial. C'est une limite assumée du prototype, mais perdre sa
 * session à chaque F5 en serait une autre, parfaitement évitable.
 */
const CLE_SESSION = "vitanow.session";

function lireSession(): string | null {
  try {
    return window.localStorage.getItem(CLE_SESSION);
  } catch {
    // Navigation privée, stockage refusé : on continue sans persistance.
    return null;
  }
}

function ecrireSession(id: string | null) {
  try {
    if (id) window.localStorage.setItem(CLE_SESSION, id);
    else window.localStorage.removeItem(CLE_SESSION);
  } catch {
    /* Sans stockage, la session ne survit pas au rechargement. Rien de plus. */
  }
}

/** Même mécanique que ci-dessus, clé distincte — voir session-entreprise.ts
    côté serveur pour la raison d'un cookie séparé plutôt que réutilisé. */
const CLE_SESSION_ENTREPRISE = "vitanow.session-entreprise";

function lireSessionEntreprise(): string | null {
  try {
    return window.localStorage.getItem(CLE_SESSION_ENTREPRISE);
  } catch {
    return null;
  }
}

function ecrireSessionEntreprise(id: string | null) {
  try {
    if (id) window.localStorage.setItem(CLE_SESSION_ENTREPRISE, id);
    else window.localStorage.removeItem(CLE_SESSION_ENTREPRISE);
  } catch {
    /* Sans stockage, la session ne survit pas au rechargement. */
  }
}

/** Les comptes créés pendant la session s'ajoutent à ceux du corpus. */
let comptesVivants: Account[] = [...ACCOUNTS];

/** Comptes entreprise créés en mode démo — aucun compte de départ, l'aperçu
    démo (Agrivia et consorts) n'a jamais eu besoin d'authentification. */
let comptesEntreprisesVivants: { companyId: string; email: string; motDePasse: string }[] = [];

function parseArray<T>(val: unknown): T[] {
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    const cleaned = val.replace(/^\{|\}$/g, "");
    if (!cleaned.trim()) return [];
    return cleaned.split(",").map((s) => s.replace(/^"|"$/g, "").trim()) as unknown as T[];
  }
  return [];
}

let compteur = 0;
const nouvelId = (prefixe: string) => `${prefixe}-${Date.now().toString(36)}-${compteur++}`;

/**
 * M7 — mêmes phrases que `server/src/inactivite.ts` (dupliquées en TS,
 * comme `avancement()` existe déjà en double front/back dans ce projet).
 * Choisies par hash de l'identifiant plutôt que `Math.random()` : un
 * résultat reproductible.
 */
const PHRASES_INACTIVITE: ((nom: string, jours: number) => string)[] = [
  (nom, jours) =>
    `${jours} jours sans nouvelles de « ${nom} ». Le contexte est encore frais — il le sera moins dans une semaine.`,
  (nom, jours) =>
    `« ${nom} » attend depuis ${jours} jours. Dix minutes suffisent à rouvrir le fil, pas à tout refaire.`,
  (nom, jours) =>
    `« ${nom} » dort depuis ${jours} jours. Ce qui est déjà fait ne disparaît pas — seul le fil se perd si on attend trop.`,
  (nom, jours) =>
    `${jours} jours. Une petite reprise sur « ${nom} » vaut mieux qu'une grande plus tard, quand il faudra tout relire.`,
];

function phraseInactivite(projectId: string, nom: string, jours: number): string {
  let h = 0;
  for (let i = 0; i < projectId.length; i++) h = (h * 31 + projectId.charCodeAt(i)) | 0;
  const index = Math.abs(h) % PHRASES_INACTIVITE.length;
  return PHRASES_INACTIVITE[index]!(nom, jours);
}

export function SoaProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SoaState>(() => {
    const initial: SoaState = {
      students: STUDENTS,
      projects: PROJECTS,
      journal: JOURNAL,
      threads: THREADS,
      challenges: CHALLENGES,
      ideas: IDEAS,
      notifications: NOTIFICATIONS,
      opportunities: OPPORTUNITIES,
      mentorRequests: MENTOR_REQUESTS,
      events: [],
      sessionId: lireSession(),
      channels: { web: true, email: false, push: false },
      companies: COMPANIES,
      sessionEntrepriseId: lireSessionEntreprise(),
      points: POINTS,
      annonce: null,
      maintenance: false,
      hydrated: !API_ACTIVE,
    };

    // `hydrated` est toujours réévalué après la fusion : un état persisté d'une
    // visite précédente ne doit jamais faire croire, sur ce chargement-ci, que
    // le premier `/api/etat` a déjà répondu — voir la doc du champ dans
    // `SoaState`.
    return { ...(charger<SoaState>(CLES.etat) ?? initial), hydrated: !API_ACTIVE };
  });

  useEffect(() => {
    enregistrer(CLES.etat, state);
  }, [state]);

  /**
   * Hydratation depuis le serveur, quand il existe.
   *
   * Un seul appel remplace toutes les collections (`/api/etat` épouse la forme
   * de `SoaState`). Les réglages de canaux restent locaux : ils n'ont pas de
   * table, et rien ne justifie d'en créer une pour trois booléens.
   *
   * **En cas d'échec, on ne vide rien.** Le corpus déjà en place — celui du
   * code ou celui relu du navigateur — reste affiché. Une API injoignable doit
   * dégrader le produit vers la démonstration, jamais vers un écran blanc :
   * c'est la différence entre « le serveur est tombé » et « la soutenance est
   * finie ».
   */
  useEffect(() => {
    if (!API_ACTIVE) return;

    const controleur = new AbortController();

    void api
      .etat(controleur.signal)
      .then((distant) => {
        const nettsStudents = ((distant.students ?? []) as any[]).map((st) => ({
          ...st,
          disponibilites: parseArray(st.disponibilites),
          interets: parseArray(st.interets),
          technos: parseArray(st.technos),
        }));
        const nettsProjects = ((distant.projects ?? []) as any[]).map((pj) => ({
          ...pj,
          technos: parseArray(pj.technos),
        }));

        setState((s) => ({
          ...s,
          students: nettsStudents as SoaState["students"],
          projects: nettsProjects as SoaState["projects"],
          journal: (distant.journal ?? []) as SoaState["journal"],
          threads: (distant.threads ?? []) as SoaState["threads"],
          challenges: (distant.challenges ?? []) as SoaState["challenges"],
          ideas: (distant.ideas ?? []) as SoaState["ideas"],
          opportunities: (distant.opportunities ?? []) as SoaState["opportunities"],
          mentorRequests: (distant.mentorRequests ?? []) as SoaState["mentorRequests"],
          notifications: (distant.notifications ?? []) as SoaState["notifications"],
          events: (distant.events ?? []) as SoaState["events"],
          sessionId: distant.sessionId,
          companies: (distant.companies ?? []) as SoaState["companies"],
          sessionEntrepriseId: distant.sessionEntrepriseId,
          points: (distant.points ?? []) as SoaState["points"],
          annonce: distant.annonce ?? null,
          maintenance: Boolean(distant.maintenance),
          hydrated: true,
        }));
      })
      .catch((erreur: unknown) => {
        if (controleur.signal.aborted) return;
        // Marqué hydraté même en échec : une API injoignable ne doit pas
        // bloquer indéfiniment `useGardeSession` en attente — elle bascule
        // alors sur `sessionId` local, dégradé mais jamais figé.
        setState((s) => ({ ...s, hydrated: true }));
        console.error(
          "[etat] serveur injoignable — la démonstration continue en local",
          erreur,
        );
      });

    return () => controleur.abort();
  }, []);

  const me =
    state.students.find((s) => s.id === (state.sessionId ?? CURRENT_STUDENT_ID)) ??
    state.students[0]!;

  /* Dérivé plutôt que stocké, comme `me` — `state.companies` peut changer
     (édition du profil entreprise) sans que ça désynchronise l'identité
     entreprise courante. */
  const entreprise =
    state.companies.find((c) => c.id === state.sessionEntrepriseId) ?? null;
  const entrepriseConnectee = entreprise !== null;

  const journalFor = useCallback(
    (projectId: string) =>
      state.journal
        .filter((e) => e.projectId === projectId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [state.journal],
  );

  /**
   * Trois sources, dans cet ordre :
   *
   * 1. Un projet doté d'une checklist affiche `faits / total`, **toujours** —
   *    y compris sur un projet Terminé. Décocher une case après coup (le
   *    travail rouvert, ou une tâche qui n'était finalement pas faite) doit
   *    faire bouger le chiffre ; sinon le statut Terminé fige un pourcentage
   *    que la checklist contredit, et l'affichage ment de nouveau (voir
   *    HANDOFF.md — c'est déjà arrivé une fois avec l'ordre inverse).
   * 2. Sans checklist, un projet marqué Terminé affiche 100 % — c'est le seul
   *    signal d'achèvement disponible, et c'est le statut réel du projet,
   *    déjà passé par `setProjectStatus`, pas une saisie.
   * 3. Sans checklist ni statut Terminé, repli sur l'heuristique du journal
   *    (`avancement()`), qui plafonne à 96 % par construction.
   *
   * Même règle côté serveur (`server/src/routes/projets.ts`), pour que
   * l'espace enseignant lise le même chiffre.
   */
  const progressOf = useCallback(
    (projectId: string) => {
      const projet = state.projects.find((p) => p.id === projectId);
      if (projet?.checklist && projet.checklist.length > 0) {
        const faits = projet.checklist.filter((e) => e.fait).length;
        return Math.round((faits / projet.checklist.length) * 100);
      }
      if (projet?.status === "Terminé") return 100;
      return avancement(state.journal.filter((e) => e.projectId === projectId));
    },
    [state.projects, state.journal],
  );

  const myProjects = useMemo(
    () => state.projects.filter((p) => p.ownerId === me.id),
    [state.projects, me.id],
  );

  const dormant = useMemo(() => myProjects.filter((p) => enSommeil(p)), [myProjects]);

  /**
   * M7 — miroir du mode démo de `server/src/inactivite.ts` (voir ce fichier
   * pour la justification : pas de job planifié, une notification manquante
   * est simplement générée à la prochaine occasion, ici au rendu plutôt
   * qu'à l'appel réseau). Même règle d'idempotence : un seul rappel par
   * épisode de sommeil, tant que `derniereActivite` n'a pas avancé. En mode
   * API, le serveur fait déjà ce travail — ne pas le dupliquer içi
   * éviterait un double affichage aux notifications qui ne correspondent
   * à rien côté serveur.
   */
  useEffect(() => {
    if (API_ACTIVE || dormant.length === 0) return;
    setState((s) => {
      const nouvelles: Notification[] = [];
      for (const projet of dormant) {
        const cible = `#/projets/${projet.id}`;
        const dejaNotifie = s.notifications.some(
          (n) => n.kind === "reprise" && n.cible === cible && n.date >= projet.derniereActivite,
        );
        if (dejaNotifie) continue;
        nouvelles.push({
          id: nouvelId("n"),
          kind: "reprise",
          titre: projet.nom,
          corps: phraseInactivite(projet.id, projet.nom, joursDepuis(projet.derniereActivite)),
          date: new Date().toISOString(),
          lu: false,
          cible,
        });
      }
      if (nouvelles.length === 0) return s;
      return { ...s, notifications: [...nouvelles, ...s.notifications] };
    });
  }, [dormant]);

  /**
   * Calendrier — miroir mode démo de `server/src/rappels.ts` (même
   * justification que le miroir M7 juste au-dessus). Idempotence par titre +
   * date du jour, comme côté serveur.
   */
  useEffect(() => {
    if (API_ACTIVE || state.events.length === 0) return;

    const local = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const aujourdhui = local(new Date());
    const demain = local(new Date(Date.now() + 24 * 60 * 60 * 1000));

    setState((s) => {
      const proches = s.events.filter((e) => e.date === aujourdhui || e.date === demain);
      if (proches.length === 0) return s;

      const nouvelles: Notification[] = [];
      for (const evenement of proches) {
        const dejaNotifie = s.notifications.some(
          (n) =>
            n.kind === "evenement" &&
            n.titre === evenement.titre &&
            n.date.slice(0, 10) === aujourdhui,
        );
        if (dejaNotifie) continue;

        const estAujourdhui = evenement.date === aujourdhui;
        nouvelles.push({
          id: nouvelId("n"),
          kind: "evenement",
          titre: evenement.titre,
          corps: estAujourdhui
            ? `Aujourd'hui${evenement.heure ? ` à ${evenement.heure}` : ""} : ${evenement.titre}.`
            : `Demain : ${evenement.titre}.`,
          date: new Date().toISOString(),
          lu: false,
          cible: "#/calendrier",
        });
      }
      if (nouvelles.length === 0) return s;
      return { ...s, notifications: [...nouvelles, ...s.notifications] };
    });
  }, [state.events]);

  const analytics = useMemo<StudentAnalytics>(() => {
    const termines = myProjects.filter((p) => p.status === "Terminé").length;
    const repris = myProjects.filter((p) => p.raisonAbandon && p.status === "En cours").length;

    // Techno la plus utilisée — exigée telle quelle par le cadrage (M19).
    const compte = new Map<string, number>();
    for (const p of myProjects) {
      for (const t of p.technos) compte.set(t, (compte.get(t) ?? 0) + 1);
    }
    const technoPrincipale =
      [...compte.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

    // Rythme : entrées de journal par semaine sur les 12 dernières semaines.
    const mien = state.journal.filter((e) =>
      myProjects.some((p) => p.id === e.projectId),
    );
    const rythme = Array.from({ length: 12 }, (_, i) => {
      const finSemaine = 11 - i;
      return mien.filter((e) => {
        const j = joursDepuis(e.date);
        return j >= finSemaine * 7 && j < (finSemaine + 1) * 7;
      }).length;
    });

    // M19 — « progression moyenne ». Calculée sur les projets **non terminés** :
    // inclure les projets livrés à 100 % gonflerait la moyenne sans rien dire
    // de l'endroit où le travail en est réellement.
    const enCours = myProjects.filter(
      (p) => p.status !== "Terminé" && p.status !== "Idée",
    );
    const progressionMoyenne =
      enCours.length === 0
        ? 0
        : Math.round(
            enCours.reduce(
              (t, p) => t + avancement(state.journal.filter((e) => e.projectId === p.id)),
              0,
            ) / enCours.length,
          );

    const points = state.points.filter((p) => p.studentId === me.id).reduce(
      (t, p) => t + POINT_VALUES[p.reason],
      0,
    );

    return {
      projetsCommences: myProjects.length,
      projetsTermines: termines,
      projetsRepris: repris,
      technoPrincipale,
      progressionMoyenne,
      entreesJournal: mien.length,
      points,
      rythme,
    };
  }, [myProjects, state.journal, state.points, me.id]);

  /**
   * M6 — la capsule est **dérivée**, pas stockée.
   *
   * Elle se construit à partir des deux dernières entrées du journal du projet
   * en sommeil : la dernière solution dit où on en était, la dernière erreur
   * dit ce qui bloquait. Rien n'est demandé à l'étudiant — s'il fallait
   * remplir un formulaire pour obtenir sa capsule, personne ne l'aurait.
   */
  const capsule = useMemo<ResumptionCapsule | null>(() => {
    const projet = dormant[0];
    if (!projet) return null;
    const entrees = journalFor(projet.id);
    const derniereAvancee = entrees.find(
      (e) => e.kind === "Solution" || e.kind === "Architecture",
    );
    const dernierBlocage = entrees.find((e) => e.kind === "Erreur");

    return {
      projectId: projet.id,
      projectTitle: projet.nom,
      lastActivity: projet.derniereActivite,
      where: derniereAvancee?.corps ?? projet.objectif,
      blocking: dernierBlocage?.corps ?? "Aucun blocage écrit dans le journal.",
      nextStep: {
        action: dernierBlocage
          ? `Ouvrir le journal et écrire, en une phrase, la règle qui devrait trancher « ${dernierBlocage.titre.toLowerCase()} ». Sans l'implémenter.`
          : "Relire la dernière entrée du journal et écrire la prochaine décision à prendre.",
        minutes: 7,
      },
    };
  }, [dormant, journalFor]);

  /**
   * M5 — le résumé « IA ».
   *
   * Il est ici déduit du journal par des règles explicites, pas généré. C'est
   * un choix assumé pour la démonstration : une sortie déterministe se rejoue
   * à l'identique devant le jury, et la forme du contrat (objectif / fait /
   * reste / risque) est exactement celle que l'API Claude devra respecter.
   */
  const summaryFor = useCallback(
    (projectId: string): ProjectSummary | null => {
      const projet = state.projects.find((p) => p.id === projectId);
      if (!projet) return null;
      const entrees = journalFor(projectId);
      const jours = joursDepuis(projet.derniereActivite);

      const fait = entrees
        .filter((e) => e.kind === "Solution" || e.kind === "Architecture")
        .map((e) => e.titre);
      const reste = entrees.filter((e) => e.kind === "Erreur").map((e) => e.titre);
      const decisions = entrees.filter((e) => e.kind === "Décision").map((e) => e.titre);

      let risque: ProjectSummary["risqueAbandon"] = "Faible";
      let pourquoi = "Activité régulière, aucun blocage ouvert dans le journal.";
      if (projet.status === "Abandonné") {
        risque = "Élevé";
        pourquoi = projet.raisonAbandon ?? "Projet arrêté.";
      } else if (projet.status === "Terminé") {
        risque = "Faible";
        pourquoi = "Projet livré.";
      } else if (jours >= 7 && reste.length > 0) {
        risque = "Élevé";
        pourquoi = `${jours} jours sans activité, avec un blocage encore ouvert : « ${reste[0]} ».`;
      } else if (jours >= 7) {
        risque = "Modéré";
        pourquoi = `${jours} jours sans activité, mais aucun blocage écrit.`;
      } else if (reste.length > 0) {
        risque = "Modéré";
        pourquoi = `Un blocage est ouvert : « ${reste[0]} ».`;
      }

      // Même règle que le repli serveur (`resume.ts`) : une tâche principale
      // non cochée dont une sous-tâche l'est est « en cours », ni faite ni
      // en attente.
      const checklist = projet.checklist ?? [];
      const enCours = checklist
        .filter(
          (tache) =>
            !tache.parentId &&
            !tache.fait &&
            checklist.some((sous) => sous.parentId === tache.id && sous.fait),
        )
        .map((tache) => tache.libelle);

      return {
        projectId,
        objectif: projet.objectif,
        faitCeQui: fait,
        enCours,
        resteAFaire: [...reste, ...decisions.map((d) => `Trancher : ${d}`)],
        derniereActivite: projet.derniereActivite,
        risqueAbandon: risque,
        pourquoi,
      };
    },
    [state.projects, journalFor],
  );

  const threadById = useCallback(
    (id: string) => state.threads.find((t) => t.id === id),
    [state.threads],
  );

  /* ── Mutations ────────────────────────────────────────────────────────── */

  /* Chaque création génère son identifiant **avant** d'écrire, et l'envoie au
     serveur. L'écran navigue vers cet identifiant dans la foulée : le laisser
     choisir au serveur ferait pointer l'URL vers un objet local, introuvable
     au rechargement. Hors mode API, `nouvelId` suffit et reste lisible en
     débogage. */
  const idNeuf = useCallback(
    (prefixe: string) => (API_ACTIVE ? nouvelUuid() : nouvelId(prefixe)),
    [],
  );

  const createProject = useCallback(
    (draft: NewProject): Project => {
      const { checklist: checklistDraft, ...champs } = draft;
      const checklist: ChecklistItem[] = (checklistDraft ?? [])
        .filter((e) => e.libelle.trim())
        .map((e, ordre) => ({
          id: idNeuf("c"),
          projectId: "", // renseigné juste après, une fois l'id du projet connu
          libelle: e.libelle.trim(),
          fait: false,
          ordre,
          dureeHeures: e.dureeHeures,
        }));

      const projetId = idNeuf("p");
      const projet: Project = {
        id: projetId,
        ...champs,
        status: "Idée",
        debut: new Date().toISOString(),
        ownerId: state.sessionId ?? CURRENT_STUDENT_ID,
        derniereActivite: new Date().toISOString(),
        public: false,
        checklist: checklist.map((e) => ({ ...e, projectId: projetId })),
      };
      setState((s) => ({ ...s, projects: [projet, ...s.projects] }));

      pousser(
        () =>
          api.creerProjet({
            ...champs,
            id: projet.id,
            checklist: checklist.map((e) => ({
              id: e.id,
              libelle: e.libelle,
              dureeHeures: e.dureeHeures,
            })),
          }),
        `créer le projet « ${draft.nom} »`,
      );
      return projet;
    },
    [idNeuf, state.sessionId],
  );

  /**
   * Ajoute une tâche ou sous-tâche après la création du projet — la checklist
   * ne se limite plus à ce qui a été saisi à la création.
   *
   * Un seul niveau de sous-tâches : `parentId`, s'il est fourni, doit désigner
   * une tâche de premier niveau (vérifié aussi côté serveur, voir
   * `ecriture.ts`). Même pattern optimiste que `toggleChecklistItem`.
   */
  const addChecklistItem = useCallback(
    (
      projectId: string,
      etape: { libelle: string; dureeHeures: number; parentId?: string },
    ) => {
      const projet = state.projects.find((p) => p.id === projectId);
      if (!projet) return;

      const item: ChecklistItem = {
        id: idNeuf("c"),
        projectId,
        libelle: etape.libelle.trim(),
        fait: false,
        ordre: (projet.checklist ?? []).length,
        parentId: etape.parentId,
        dureeHeures: etape.dureeHeures,
      };

      setState((s) => ({
        ...s,
        projects: s.projects.map((p) =>
          p.id === projectId ? { ...p, checklist: [...(p.checklist ?? []), item] } : p,
        ),
      }));

      pousser(
        () =>
          api.ajouterChecklistItem(projectId, {
            id: item.id,
            libelle: item.libelle,
            dureeHeures: etape.dureeHeures,
            parentId: item.parentId,
          }),
        "ajouter une étape",
      );
    },
    [idNeuf, state.projects],
  );

  /**
   * Coche/décoche une étape de la checklist ("post-it").
   *
   * Change directement `progressOf` quand le projet a une checklist (voir sa
   * doc) — ne touche en revanche jamais `derniere_activite` : cocher une case
   * est un geste sans friction, pas une écriture au journal.
   */
  const toggleChecklistItem = useCallback(
    (projectId: string, itemId: string) => {
      const item = state.projects
        .find((p) => p.id === projectId)
        ?.checklist?.find((e) => e.id === itemId);
      if (!item) return;
      const prochainEtat = !item.fait;

      setState((s) => ({
        ...s,
        projects: s.projects.map((p) =>
          p.id !== projectId || !p.checklist
            ? p
            : {
                ...p,
                checklist: p.checklist.map((e) =>
                  e.id === itemId ? { ...e, fait: prochainEtat, bloque: prochainEtat ? false : e.bloque } : e,
                ),
              },
        ),
      }));

      pousser(
        () => api.toggleChecklistItem(projectId, itemId, prochainEtat),
        "mettre à jour la checklist",
      );
    },
    [state.projects],
  );

  const toggleChecklistBlocked = useCallback(
    (projectId: string, itemId: string) => {
      const item = state.projects
        .find((p) => p.id === projectId)
        ?.checklist?.find((e) => e.id === itemId);
      if (!item || item.fait) return;
      const bloque = !item.bloque;
      setState((s) => ({
        ...s,
        projects: s.projects.map((p) =>
          p.id !== projectId || !p.checklist
            ? p
            : {
                ...p,
                checklist: p.checklist.map((e) =>
                  e.id === itemId ? { ...e, bloque } : e,
                ),
              },
        ),
      }));
      pousser(
        () => api.bloquerChecklistItem(projectId, itemId, bloque),
        bloque ? "signaler une étape bloquée" : "retirer le blocage de l'étape",
      );
    },
    [state.projects],
  );

  const moveChecklistItemColumn = useCallback(
    (projectId: string, itemId: string, columnId: string) => {
      const estTermine = columnId === "termine";
      setState((s) => ({
        ...s,
        projects: s.projects.map((p) =>
          p.id !== projectId || !p.checklist
            ? p
            : {
                ...p,
                checklist: p.checklist.map((e) =>
                  e.id === itemId
                    ? { ...e, colonneId: columnId, fait: estTermine ? true : e.fait }
                    : e,
                ),
              },
        ),
      }));
    },
    [],
  );

  const assignChecklistItem = useCallback(
    (projectId: string, itemId: string, studentId: string | undefined) => {
      setState((s) => ({
        ...s,
        projects: s.projects.map((p) =>
          p.id !== projectId || !p.checklist
            ? p
            : {
                ...p,
                checklist: p.checklist.map((e) =>
                  e.id === itemId ? { ...e, assigneA: studentId } : e,
                ),
              },
        ),
      }));
    },
    [],
  );

  const addProjectMember = useCallback(
    (projectId: string, studentId: string) => {
      setState((s) => ({
        ...s,
        projects: s.projects.map((p) =>
          p.id !== projectId
            ? p
            : {
                ...p,
                membres: Array.from(new Set([...(p.membres ?? []), studentId])),
              },
        ),
      }));
    },
    [],
  );

  const removeProjectMember = useCallback(
    (projectId: string, studentId: string) => {
      setState((s) => ({
        ...s,
        projects: s.projects.map((p) =>
          p.id !== projectId
            ? p
            : {
                ...p,
                membres: (p.membres ?? []).filter((m) => m !== studentId),
              },
        ),
      }));
    },
    [],
  );

  const addKanbanColumn = useCallback(
    (projectId: string, titre: string) => {
      if (!titre.trim()) return;
      const nouvelleColonne = {
        id: `col-${Date.now()}`,
        titre: titre.trim(),
      };
      setState((s) => ({
        ...s,
        projects: s.projects.map((p) =>
          p.id !== projectId
            ? p
            : {
                ...p,
                colonnesKanban: [...(p.colonnesKanban ?? DEFAULT_KANBAN_COLUMNS), nouvelleColonne],
              },
        ),
      }));
    },
    [],
  );

  const deleteKanbanColumn = useCallback(
    (projectId: string, columnId: string) => {
      setState((s) => ({
        ...s,
        projects: s.projects.map((p) =>
          p.id !== projectId
            ? p
            : {
                ...p,
                colonnesKanban: (p.colonnesKanban ?? DEFAULT_KANBAN_COLUMNS).filter((c) => c.id !== columnId),
                checklist: (p.checklist ?? []).map((item) =>
                  item.colonneId === columnId ? { ...item, colonneId: "a_faire" } : item,
                ),
              },
        ),
      }));
    },
    [],
  );

  const linkGitHubRepo = useCallback(
    (projectId: string, slugOrUrl: string) => {
      let slug = slugOrUrl.trim();
      slug = slug.replace(/^https?:\/\/github\.com\//i, "").replace(/\/$/, "");
      if (!slug) return;
      setState((s) => ({
        ...s,
        projects: s.projects.map((p) =>
          p.id !== projectId
            ? p
            : {
                ...p,
                depot: {
                  hote: "GitHub",
                  slug,
                  url: `https://github.com/${slug}`,
                  commitsParSemaine: [2, 5, 8, 4, 12, 6, 9, 3, 7, 10, 5, 14],
                  branches: ["main", "staging", "dev"],
                  brancheParDefaut: "main",
                  synchroniseLe: new Date().toISOString(),
                },
              },
        ),
      }));
    },
    [],
  );

  const setProjectStatus = useCallback(
    (projectId: string, status: ProjectStatus, raison?: string) => {
      setState((s) => {
        const projet = s.projects.find((p) => p.id === projectId);
        // M12 — « terminer un projet » est l'un des 4 gestes réels ; même
        // geste, même règle que côté serveur (`ecriture.ts`), écrit ici en
        // optimiste pour que la fête (voir PointsCelebration) soit immédiate.
        const nouveauPoint: PointEntry[] =
          status === "Terminé" && projet
            ? [
                {
                  id: idNeuf("pt"),
                  studentId: s.sessionId ?? CURRENT_STUDENT_ID,
                  reason: "projet-termine",
                  detail: projet.nom,
                  date: new Date().toISOString(),
                },
              ]
            : [];

        return {
          ...s,
          projects: s.projects.map((p) =>
            p.id === projectId
              ? {
                  ...p,
                  status,
                  raisonAbandon: status === "Abandonné" ? raison : p.raisonAbandon,
                  fin:
                    status === "Terminé" || status === "Abandonné"
                      ? new Date().toISOString()
                      : undefined,
                  derniereActivite: new Date().toISOString(),
                }
              : p,
          ),
          points: [...nouveauPoint, ...s.points],
        };
      });

      pousser(
        () => api.changerStatut(projectId, status, raison),
        `passer le projet en « ${status} »`,
      );
    },
    [idNeuf],
  );

  const addJournalEntry = useCallback(
    (draft: NewJournalEntry): JournalEntry => {
      const entree: JournalEntry = {
        id: idNeuf("j"),
        ...draft,
        date: new Date().toISOString(),
      };
      setState((s) => ({
        ...s,
        journal: [entree, ...s.journal],
        // Écrire dans le journal, c'est travailler : le projet sort du sommeil.
        projects: s.projects.map((p) =>
          p.id === draft.projectId
            ? { ...p, derniereActivite: entree.date, status: p.status === "Idée" ? "En cours" : p.status }
            : p,
        ),
        // M12 — « documenter une erreur » est l'un des 4 gestes réels, même
        // règle que côté serveur (`ecriture.ts`).
        points:
          draft.kind === "Erreur"
            ? [
                {
                  id: idNeuf("pt"),
                  studentId: s.sessionId ?? CURRENT_STUDENT_ID,
                  reason: "erreur-documentee" as const,
                  detail: draft.titre,
                  date: entree.date,
                },
                ...s.points,
              ]
            : s.points,
      }));

      pousser(
        () =>
          api.ecrireJournal(draft.projectId, {
            entreeId: entree.id,
            nature: draft.kind,
            titre: draft.titre,
            corps: draft.corps,
            jalon: draft.jalon,
          }),
        "écrire au journal",
      );
      return entree;
    },
    [idNeuf],
  );

  const replyToThread = useCallback((threadId: string, corps: string) => {
    setState((s) => {
      const moi = s.sessionId ?? CURRENT_STUDENT_ID;
      const sujet = s.threads.find((t) => t.id === threadId);
      const maintenant = new Date().toISOString();

      return {
        ...s,
        threads: s.threads.map((t) =>
          t.id === threadId
            ? {
                ...t,
                reponses: [
                  ...t.reponses,
                  {
                    id: nouvelId("r"),
                    auteurId: moi,
                    corps,
                    date: maintenant,
                    deMentor: me.mentor,
                  },
                ],
              }
            : t,
        ),
        // M12 — « aider un pair » : répondre au sujet de quelqu'un d'autre,
        // jamais le sien — même garde que côté serveur (`collectif.ts`).
        points:
          sujet && sujet.auteurId !== moi
            ? [
                {
                  id: idNeuf("pt"),
                  studentId: moi,
                  reason: "pair-aide" as const,
                  detail: sujet.titre,
                  date: maintenant,
                },
                ...s.points,
              ]
            : s.points,
      };
    });

    pousser(() => api.repondreSujet(threadId, corps), "répondre au sujet");
  }, [idNeuf]);

  const createThread = useCallback(
    (draft: NewThread): ForumThread => {
      const sujet: ForumThread = {
        id: idNeuf("t"),
        ...draft,
        auteurId: state.sessionId ?? CURRENT_STUDENT_ID,
        date: new Date().toISOString(),
        reponses: [],
      };
      setState((s) => ({ ...s, threads: [sujet, ...s.threads] }));

      pousser(
        () => api.creerSujet({ ...draft, id: sujet.id }),
        `publier « ${draft.titre} »`,
      );
      return sujet;
    },
    [idNeuf, state.sessionId],
  );

  const voteIdea = useCallback((ideaId: string, sens: "pour" | "reserve") => {
    setState((s) => {
      const moi = s.sessionId ?? CURRENT_STUDENT_ID;
      return {
        ...s,
        ideas: s.ideas.map((i) => {
          if (i.id !== ideaId) return i;
          // Un vote est exclusif : voter « pour » retire une réserve, et
          // revoter le même sens l'annule.
          const pour = i.votesPour.filter((v) => v !== moi);
          const reserve = i.votesReserve.filter((v) => v !== moi);
          const dejaPour = i.votesPour.includes(moi);
          const dejaReserve = i.votesReserve.includes(moi);
          if (sens === "pour" && !dejaPour) pour.push(moi);
          if (sens === "reserve" && !dejaReserve) reserve.push(moi);
          return { ...i, votesPour: pour, votesReserve: reserve };
        }),
      };
    });

    pousser(() => api.voterIdee(ideaId, sens), "enregistrer le vote");
  }, []);

  const joinChallenge = useCallback((challengeId: string) => {
    setState((s) => {
      const moi = s.sessionId ?? CURRENT_STUDENT_ID;
      return {
        ...s,
        challenges: s.challenges.map((c) =>
          c.id === challengeId && !c.participants.some((p) => p.studentId === moi)
            ? { ...c, participants: [...c.participants, { studentId: moi, semaines: [] }] }
            : c,
        ),
      };
    });

    pousser(() => api.rejoindreChallenge(challengeId), "rejoindre le challenge");
  }, []);

  const checkChallengeWeek = useCallback((challengeId: string, semaine: number) => {
    setState((s) => {
      const moi = s.sessionId ?? CURRENT_STUDENT_ID;
      return {
        ...s,
        challenges: s.challenges.map((c) => {
          if (c.id !== challengeId) return c;
          return {
            ...c,
            participants: c.participants.map((p) => {
              if (p.studentId !== moi) return p;
              const semaines = [...p.semaines];
              while (semaines.length <= semaine) semaines.push(false);
              semaines[semaine] = !semaines[semaine];
              return { ...p, semaines };
            }),
          };
        }),
      };
    });

    pousser(
      () => api.cocherSemaine(challengeId, semaine),
      "cocher la semaine",
    );
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, lu: true } : n)),
    }));
    // Avant l'hydratation API, l'écran porte encore le corpus de démonstration
    // (ids `n-*`) : ces ids ne sont pas des UUID de la base. Le geste reste
    // local, puis l'état distant remplace le corpus sans déclencher un faux
    // échec de synchronisation.
    if (state.hydrated) {
      pousser(() => api.marquerNotificationLue(id), "marquer la notification comme lue");
    }
  }, [state.hydrated]);

  const markAllRead = useCallback(() => {
    setState((s) => ({
      ...s,
      notifications: s.notifications.map((n) => ({ ...n, lu: true })),
    }));

    pousser(() => api.toutLu(), "marquer les notifications lues");
  }, []);

  const deleteNotifications = useCallback(
    async (ids: string[]) => {
      const selection = [...new Set(ids)].filter(Boolean);
      if (selection.length === 0) return;

      // Durant l'hydratation, les notifications visibles sont encore celles
      // de démonstration (ids non UUID). On ne les envoie donc jamais à l'API.
      if (API_ACTIVE && state.hydrated) await api.supprimerNotifications(selection);
      const aSupprimer = new Set(selection);
      setState((s) => ({
        ...s,
        notifications: s.notifications.filter((notification) => !aSupprimer.has(notification.id)),
      }));
    },
    [state.hydrated],
  );

  const deleteAllNotifications = useCallback(async () => {
    if (API_ACTIVE && state.hydrated) await api.supprimerToutesNotifications();
    setState((s) => ({ ...s, notifications: [] }));
  }, [state.hydrated]);

  /**
   * Calendrier personnel — hors cadrage, addition. Même pattern optimiste
   * que `addChecklistItem` : l'écran affiche l'événement avant même que le
   * serveur ait répondu.
   */
  const createEvent = useCallback(
    (draft: NewCalendarEvent) => {
      const evenement: CalendarEvent = {
        id: idNeuf("e"),
        studentId: state.sessionId ?? CURRENT_STUDENT_ID,
        ...draft,
      };

      setState((s) => ({ ...s, events: [...s.events, evenement] }));

      pousser(
        () =>
          api.creerEvenement({
            id: evenement.id,
            titre: evenement.titre,
            date: evenement.date,
            heure: evenement.heure,
            type: evenement.type,
            projectId: evenement.projectId,
          }),
        `créer l'événement « ${draft.titre} »`,
      );
    },
    [idNeuf, state.sessionId],
  );

  const deleteEvent = useCallback((id: string) => {
    setState((s) => ({ ...s, events: s.events.filter((e) => e.id !== id) }));
    pousser(() => api.supprimerEvenement(id), "supprimer l'événement");
  }, []);

  /**
   * M15 — Renaissance.
   *
   * Reprendre ne veut pas dire copier : le projet change de propriétaire mais
   * **garde son journal et sa raison d'abandon**. C'est tout l'intérêt — celui
   * qui reprend hérite des impasses déjà payées par le précédent.
   */
  const reviveProject = useCallback((projectId: string): Project => {
    const maintenant = new Date().toISOString();
    let repris!: Project;
    setState((s) => ({
      ...s,
      projects: s.projects.map((p) => {
        if (p.id !== projectId) return p;
        repris = {
          ...p,
          ownerId: s.sessionId ?? CURRENT_STUDENT_ID,
          status: "En cours",
          fin: undefined,
          derniereActivite: maintenant,
        };
        return repris;
      }),
      journal: [
        {
          id: idNeuf("j"),
          projectId,
          kind: "Décision",
          titre: "Reprise du projet",
          corps:
            "Projet repris en l'état. La raison d'abandon précédente reste " +
            "attachée au projet : c'est le point de départ, pas un historique à effacer.",
          date: maintenant,
          jalon: "Reprise",
        },
        ...s.journal,
      ],
    }));

    pousser(() => api.reprendreProjet(projectId), "reprendre le projet");
    return repris;
  }, [idNeuf]);

  /* ── M1 — Authentification ────────────────────────────────────────────── */

  /**
   * Aucun mot de passe n'est vérifié : le compte identifie, il ne protège pas.
   * L'écran de connexion l'affiche noir sur blanc — laisser croire à une
   * authentification qui n'existe pas serait pire que ne pas en avoir.
   */
  /**
   * Connexion.
   *
   * En mode API, c'est le serveur qui tranche : lui seul détient les
   * empreintes argon2id. Le repli local n'existe que pour le mode
   * démonstration, où il n'y a pas de serveur du tout.
   *
   * C'est le défaut qui a été corrigé ici : les deux chemins existaient, mais
   * l'écran appelait toujours le local. Le front vérifiait donc les mots de
   * passe contre une liste embarquée dans son propre paquet, pendant que la
   * base en contenait d'autres — aucun compte réel ne pouvait fonctionner.
   */
  const login = useCallback(
    async (email: string, motDePasse: string): Promise<AuthResult> => {
      if (API_ACTIVE) {
        try {
          const { etudiant } = await api.connexion(email.trim(), motDePasse);
          const e = etudiant as Student;
          // La connexion vient de créer un rappel personnalisé côté serveur.
          // Recharger cette seule collection suffit à l'afficher sans F5 ; le
          // reste de l'état sera de toute façon rafraîchi au prochain chargement.
          const rappels = await api.notifications().catch(() => ({ notifications: [] }));
          setState((s) => ({
            ...s,
            sessionId: e.id,
            notifications: rappels.notifications as Notification[],
            students: s.students.some((x) => x.id === e.id)
              ? s.students.map((x) => (x.id === e.id ? e : x))
              : [...s.students, e],
          }));
          ecrireSession(e.id);
          return { ok: true };
        } catch (erreur) {
          /* Le serveur ne distingue pas « compte inconnu » de « mot de passe
             incorrect » — c'est délibéré de sa part : l'écart révélerait
             quelles adresses sont inscrites. On ne peut donc pas inventer la
             distinction ici. */
          const statut = erreur instanceof ErreurApi ? erreur.statut : 0;
          return { ok: false, raison: statut === 401 ? "motDePasse" : "inconnu" };
        }
      }

      const compte = comptesVivants.find(
        (c) => c.email.toLowerCase() === email.trim().toLowerCase(),
      );
      if (!compte) return { ok: false, raison: "inconnu" };
      if (compte.motDePasse !== motDePasse) return { ok: false, raison: "motDePasse" };

      setState((s) => ({ ...s, sessionId: compte.studentId }));
      ecrireSession(compte.studentId);
      return { ok: true };
    },
    [],
  );

  const signup = useCallback(async (draft: NewStudent): Promise<AuthResult> => {
    if (API_ACTIVE) {
      try {
        const { etudiant } = await api.inscription({
          nom: draft.nom.trim(),
          email: draft.email.trim(),
          motDePasse: draft.motDePasse,
          universite: draft.universite.trim(),
          niveau: draft.niveau,
          filiere: draft.filiere.trim(),
          objectifs: draft.objectifs.trim(),
        });
        const e = etudiant as Student;
        setState((s) => ({ ...s, students: [...s.students, e], sessionId: e.id }));
        ecrireSession(e.id);
        return { ok: true };
      } catch (erreur) {
        const statut = erreur instanceof ErreurApi ? erreur.statut : 0;
        /* 409 = adresse déjà prise. 400 = règle non respectée (longueur du mot
           de passe, champ manquant). L'écran doit pouvoir dire lequel. */
        return {
          ok: false,
          raison: statut === 409 ? "inconnu" : "motDePasse",
          message: erreur instanceof Error ? erreur.message : undefined,
        };
      }
    }

    const email = draft.email.trim().toLowerCase();
    if (comptesVivants.some((c) => c.email.toLowerCase() === email)) {
      return { ok: false, raison: "inconnu" };
    }

    const id = nouvelId("s");
    const etudiant: Student = {
      id,
      nom: draft.nom.trim(),
      initiales: draft.nom
        .trim()
        .split(/\s+/)
        .map((m) => m[0] ?? "")
        .slice(0, 2)
        .join("")
        .toUpperCase(),
      universite: draft.universite.trim(),
      niveau: draft.niveau,
      filiere: draft.filiere.trim(),
      technos: [],
      interets: [],
      disponibilites: [],
      objectifs: draft.objectifs.trim(),
      mentor: false,
      promo: String(new Date().getFullYear() + 2),
    };

    comptesVivants = [
      ...comptesVivants,
      { studentId: id, email, motDePasse: draft.motDePasse, provider: "email" },
    ];

    setState((s) => ({ ...s, students: [...s.students, etudiant], sessionId: id }));
    ecrireSession(id);
    return { ok: true };
  }, []);

  const logout = useCallback(() => {
    setState((s) => ({ ...s, sessionId: null }));
    ecrireSession(null);
    pousser(() => api.deconnexion(), "se déconnecter");
  }, []);

  const desactiverCompte = useCallback(async (motDePasse: string, confirmation: string) => {
    if (API_ACTIVE) await api.desactiverCompte(motDePasse, confirmation);
    setState((s) => ({ ...s, sessionId: null }));
    ecrireSession(null);
  }, []);

  const supprimerCompte = useCallback(async (motDePasse: string, confirmation: string) => {
    const actuel = state.sessionId ?? CURRENT_STUDENT_ID;
    if (API_ACTIVE) await api.supprimerCompte(motDePasse, confirmation);
    setState((s) => ({
      ...s,
      sessionId: null,
      students: s.students.filter((etudiant) => etudiant.id !== actuel),
    }));
    ecrireSession(null);
  }, [state.sessionId]);

  const updateProfile = useCallback((patch: Partial<Student>) => {
    setState((s) => ({
      ...s,
      students: s.students.map((e) =>
        e.id === (s.sessionId ?? CURRENT_STUDENT_ID) ? { ...e, ...patch } : e,
      ),
    }));

    pousser(
      () => api.majProfil(patch as Record<string, unknown>),
      "enregistrer le profil",
    );
  }, []);

  /* ── Comptes entreprise réels — hors cadrage, addition ────────────────── */

  const loginEntreprise = useCallback(
    async (email: string, motDePasse: string): Promise<AuthResult> => {
      if (API_ACTIVE) {
        try {
          const { entreprise: e } = await api.connexionEntreprise(email.trim(), motDePasse);
          const c = e as Company;
          setState((s) => ({
            ...s,
            sessionEntrepriseId: c.id,
            companies: s.companies.some((x) => x.id === c.id)
              ? s.companies.map((x) => (x.id === c.id ? c : x))
              : [...s.companies, c],
          }));
          ecrireSessionEntreprise(c.id);
          return { ok: true };
        } catch (erreur) {
          const statut = erreur instanceof ErreurApi ? erreur.statut : 0;
          return { ok: false, raison: statut === 401 ? "motDePasse" : "inconnu" };
        }
      }

      const compte = comptesEntreprisesVivants.find(
        (c) => c.email.toLowerCase() === email.trim().toLowerCase(),
      );
      if (!compte) return { ok: false, raison: "inconnu" };
      if (compte.motDePasse !== motDePasse) return { ok: false, raison: "motDePasse" };

      setState((s) => ({ ...s, sessionEntrepriseId: compte.companyId }));
      ecrireSessionEntreprise(compte.companyId);
      return { ok: true };
    },
    [],
  );

  const signupEntreprise = useCallback(
    async (draft: NewCompanyAccount): Promise<AuthResult> => {
      if (API_ACTIVE) {
        try {
          const { entreprise: e } = await api.inscriptionEntreprise({
            nom: draft.nom.trim(),
            secteur: draft.secteur.trim(),
            email: draft.email.trim(),
            motDePasse: draft.motDePasse,
            presentation: draft.presentation?.trim(),
          });
          const c = e as Company;
          setState((s) => ({
            ...s,
            companies: [...s.companies, c],
            sessionEntrepriseId: c.id,
          }));
          ecrireSessionEntreprise(c.id);
          return { ok: true };
        } catch (erreur) {
          const statut = erreur instanceof ErreurApi ? erreur.statut : 0;
          return {
            ok: false,
            raison: statut === 409 ? "inconnu" : "motDePasse",
            message: erreur instanceof Error ? erreur.message : undefined,
          };
        }
      }

      const email = draft.email.trim().toLowerCase();
      if (comptesEntreprisesVivants.some((c) => c.email.toLowerCase() === email)) {
        return { ok: false, raison: "inconnu" };
      }

      const id = nouvelId("comp");
      const entrepriseCreee: Company = {
        id,
        nom: draft.nom.trim(),
        secteur: draft.secteur.trim(),
        technosRecherchees: [],
        profilsRecherches: [],
        presentation: draft.presentation?.trim() ?? "",
      };

      comptesEntreprisesVivants = [
        ...comptesEntreprisesVivants,
        { companyId: id, email, motDePasse: draft.motDePasse },
      ];

      setState((s) => ({
        ...s,
        companies: [...s.companies, entrepriseCreee],
        sessionEntrepriseId: id,
      }));
      ecrireSessionEntreprise(id);
      return { ok: true };
    },
    [],
  );

  const logoutEntreprise = useCallback(() => {
    setState((s) => ({ ...s, sessionEntrepriseId: null }));
    ecrireSessionEntreprise(null);
    pousser(() => api.deconnexionEntreprise(), "se déconnecter (entreprise)");
  }, []);

  const updateCompanyProfile = useCallback((patch: Partial<Company>) => {
    setState((s) => ({
      ...s,
      companies: s.companies.map((c) =>
        c.id === s.sessionEntrepriseId ? { ...c, ...patch } : c,
      ),
    }));

    pousser(
      () => api.majProfilEntreprise(patch as Record<string, unknown>),
      "enregistrer le profil entreprise",
    );
  }, []);

  /**
   * Hors cadrage, addition — photo de profil et CV.
   *
   * Ne suit pas le patron optimiste habituel (`pousser`) : l'URL finale
   * n'existe qu'après réponse du serveur (le nom de fichier y est décidé),
   * donc on attend l'appel avant de mettre à jour l'état. En mode démo
   * (`!API_ACTIVE`, pas de serveur), `URL.createObjectURL` sert d'aperçu
   * local — même esprit que les autres branches `API_ACTIVE` de ce fichier.
   */
  const uploadPhoto = useCallback(async (fichier: File) => {
    const photoUrl = API_ACTIVE
      ? (await api.envoyerPhoto(fichier)).photoUrl
      : URL.createObjectURL(fichier);
    setState((s) => ({
      ...s,
      students: s.students.map((e) =>
        e.id === (s.sessionId ?? CURRENT_STUDENT_ID) ? { ...e, photoUrl } : e,
      ),
    }));
  }, []);

  const removePhoto = useCallback(async () => {
    if (API_ACTIVE) await api.supprimerPhoto();
    setState((s) => ({
      ...s,
      students: s.students.map((e) =>
        e.id === (s.sessionId ?? CURRENT_STUDENT_ID) ? { ...e, photoUrl: undefined } : e,
      ),
    }));
  }, []);

  const uploadCv = useCallback(async (fichier: File) => {
    const { cvUrl, cvNom } = API_ACTIVE
      ? await api.envoyerCv(fichier)
      : { cvUrl: URL.createObjectURL(fichier), cvNom: fichier.name };
    setState((s) => ({
      ...s,
      students: s.students.map((e) =>
        e.id === (s.sessionId ?? CURRENT_STUDENT_ID) ? { ...e, cvUrl, cvNom } : e,
      ),
    }));
  }, []);

  const removeCv = useCallback(async () => {
    if (API_ACTIVE) await api.supprimerCv();
    setState((s) => ({
      ...s,
      students: s.students.map((e) =>
        e.id === (s.sessionId ?? CURRENT_STUDENT_ID)
          ? { ...e, cvUrl: undefined, cvNom: undefined }
          : e,
      ),
    }));
  }, []);

  /* ── M12 — Points ─────────────────────────────────────────────────────── */

  const pointsOf = useCallback(
    (studentId: string) =>
      state.points.filter((p) => p.studentId === studentId).reduce(
        (t, p) => t + POINT_VALUES[p.reason],
        0,
      ),
    [state.points],
  );

  /* ── M14 — Commenter une idée ─────────────────────────────────────────── */

  const commentIdea = useCallback((ideaId: string, corps: string) => {
    setState((s) => ({
      ...s,
      ideas: s.ideas.map((i) =>
        i.id === ideaId
          ? {
              ...i,
              commentaires: [
                ...i.commentaires,
                {
                  auteurId: s.sessionId ?? CURRENT_STUDENT_ID,
                  corps,
                  date: new Date().toISOString(),
                },
              ],
            }
          : i,
      ),
    }));

    pousser(() => api.commenterIdee(ideaId, corps), "publier le commentaire");
  }, []);

  /* ── M18 — Mise en relation ───────────────────────────────────────────── */

  const askMentor = useCallback(
    (mentorId: string, blocage: string): MentorRequest => {
      const demande: MentorRequest = {
        id: idNeuf("mr"),
        mentorId,
        studentId: state.sessionId ?? CURRENT_STUDENT_ID,
        blocage,
        date: new Date().toISOString(),
        reponses: [],
        statut: "en attente",
      };
      setState((s) => ({
        ...s,
        mentorRequests: [demande, ...s.mentorRequests],
        // La demande crée sa propre notification : sans retour visible, on ne
        // sait pas si le geste a abouti.
        notifications: [
          {
            id: idNeuf("n"),
            kind: "mentorat",
            titre: "Demande envoyée",
            corps: blocage.slice(0, 90) + (blocage.length > 90 ? "…" : ""),
            date: demande.date,
            lu: false,
            cible: "#/mentorat",
          },
          ...s.notifications,
        ],
      }));

      pousser(
        () => api.demanderMentor(mentorId, blocage),
        "envoyer la demande au mentor",
      );
      return demande;
    },
    [idNeuf, state.sessionId],
  );

  const answerMentorRequest = useCallback((requestId: string, corps: string) => {
    setState((s) => {
      const moi = s.sessionId ?? CURRENT_STUDENT_ID;
      const maintenant = new Date().toISOString();

      return {
        ...s,
        mentorRequests: s.mentorRequests.map((d) =>
          d.id === requestId
            ? {
                ...d,
                statut: "en cours",
                reponses: [
                  ...d.reponses,
                  { auteurId: moi, corps, date: maintenant },
                ],
              }
            : d,
        ),
        // M12 — « aider un pair », même règle que côté serveur (`collectif.ts`).
        points: [
          {
            id: idNeuf("pt"),
            studentId: moi,
            reason: "pair-aide" as const,
            detail: "Réponse à une demande d'aide",
            date: maintenant,
          },
          ...s.points,
        ],
      };
    });

    pousser(
      () => api.repondreMentor(requestId, corps),
      "envoyer la réponse",
    );
  }, [idNeuf]);

  /* ── M13 — Un étudiant publie aussi ───────────────────────────────────── */

  const publishOpportunity = useCallback(
    async (draft: NewOpportunity, typeEmetteur: "etudiant" | "entreprise" = "etudiant") => {
      // Émetteur : l'entreprise réellement connectée (E2, hors cadrage) si
      // elle existe, sinon l'étudiant — jamais les deux, comme côté serveur
      // (contrainte `un_seul_emetteur`). `entreprise` est dérivé à chaque
      // rendu (voir plus haut), donc capturé ici plutôt que relu dans
      // `setState` comme le reste de l'état.
      // Même priorité que l'API : si les deux sessions coexistent dans le
      // navigateur, un appel lancé depuis l'espace étudiant reste bien signé
      // par l'étudiant, jamais par l'entreprise ouverte dans un autre onglet.
      const emetteur = typeEmetteur === "entreprise"
        ? entreprise
          ? { companyId: entreprise.id }
          : { studentId: state.sessionId ?? CURRENT_STUDENT_ID }
        : { studentId: state.sessionId ?? CURRENT_STUDENT_ID };

      const id = API_ACTIVE
        ? (await api.publierOpportunite({ ...draft, emetteur: typeEmetteur })).id
        : idNeuf("o");

      setState((s) => ({
        ...s,
        opportunities: [
          { id, ...draft, ...emetteur, publieeLe: new Date().toISOString() },
          ...s.opportunities,
        ],
      }));
    },
    [idNeuf, entreprise, state.sessionId],
  );

  /* ── Dépôt Git et présentation ───────────────────────────────────────── */

  const appliquerDepot = useCallback((projectId: string, depot?: RepoLink) => {
    setState((s) => ({
      ...s,
      projects: s.projects.map((p) => (p.id === projectId ? { ...p, depot } : p)),
    }));
  }, []);

  const attachRepo = useCallback(
    async (projectId: string, url: string) => {
      let depot: RepoLink;
      if (API_ACTIVE) {
        const resultat = await api.rattacherDepot(projectId, url);
        depot = resultat.depot as RepoLink;
      } else {
        const cible = new URL(url);
        const hote = cible.hostname.replace(/^www\./, "").toLowerCase();
        const slug = cible.pathname.replace(/^\/+|\/+$/g, "").replace(/\.git$/i, "");
        if ((hote !== "github.com" && hote !== "gitlab.com") || !slug.includes("/")) {
          throw new Error("Utilisez une URL publique GitHub ou GitLab.");
        }
        depot = {
          hote: hote === "github.com" ? "GitHub" : "GitLab",
          slug,
          url: `https://${hote}/${slug}`,
          branches: ["main"],
          commitsParSemaine: Array.from({ length: 12 }, () => 0),
          brancheParDefaut: "main",
          synchroniseLe: new Date().toISOString(),
        };
      }
      appliquerDepot(projectId, depot);
    },
    [appliquerDepot],
  );

  const syncRepo = useCallback(
    async (projectId: string) => {
      if (!API_ACTIVE) return;
      const resultat = await api.synchroniserDepot(projectId);
      appliquerDepot(projectId, resultat.depot as RepoLink);
    },
    [appliquerDepot],
  );

  const detachRepo = useCallback(
    async (projectId: string) => {
      if (API_ACTIVE) await api.detacherDepot(projectId);
      appliquerDepot(projectId);
    },
    [appliquerDepot],
  );

  const appliquerPresentation = useCallback(
    (projectId: string, presentation: ProjectShowcase) => {
      setState((s) => ({
        ...s,
        projects: s.projects.map((p) =>
          p.id === projectId ? { ...p, presentation } : p,
        ),
      }));
    },
    [],
  );

  const saveShowcase = useCallback(
    async (projectId: string, showcase: ProjectShowcase) => {
      let presentation = showcase;
      if (API_ACTIVE) {
        const resultat = await api.sauvegarderPresentation(projectId, showcase);
        presentation = resultat.presentation as ProjectShowcase;
      }
      appliquerPresentation(projectId, presentation);
    },
    [appliquerPresentation],
  );

  const uploadShowcaseCapture = useCallback(
    async (projectId: string, fichier: File) => {
      if (API_ACTIVE) {
        const resultat = await api.envoyerCapturePresentation(projectId, fichier);
        appliquerPresentation(projectId, resultat.presentation as ProjectShowcase);
        return;
      }
      const projet = state.projects.find((p) => p.id === projectId);
      if (!projet) return;
      const presentation: ProjectShowcase = {
        architecture: projet.presentation?.architecture ?? "",
        documentation: projet.presentation?.documentation ?? "",
        videoUrl: projet.presentation?.videoUrl,
        demoUrl: projet.presentation?.demoUrl,
        captures: [...(projet.presentation?.captures ?? []), URL.createObjectURL(fichier)].slice(0, 8),
      };
      appliquerPresentation(projectId, presentation);
    },
    [appliquerPresentation, state.projects],
  );

  const removeShowcaseCapture = useCallback(
    async (projectId: string, url: string) => {
      const projet = state.projects.find((p) => p.id === projectId);
      if (!projet?.presentation) return;
      let presentation: ProjectShowcase = {
        ...projet.presentation,
        captures: projet.presentation.captures.filter((capture) => capture !== url),
      };
      if (API_ACTIVE) {
        const resultat = await api.supprimerCapturePresentation(projectId, url);
        presentation = resultat.presentation as ProjectShowcase;
      }
      appliquerPresentation(projectId, presentation);
    },
    [appliquerPresentation, state.projects],
  );

  /* ── E8 / E9 — Actions entreprise ─────────────────────────────────────── */

  const validateSkill = useCallback(
    (studentId: string, techno: string, entreprise: string) => {
      setState((s) => ({
        ...s,
        students: s.students.map((e) =>
          e.id === studentId
            ? {
                ...e,
                technos: e.technos.map((t) =>
                  t.nom === techno ? { ...t, valideePar: entreprise } : t,
                ),
              }
            : e,
        ),
      }));
    },
    [],
  );

  const proposeInterview = useCallback((studentId: string) => {
    setState((s) => ({
      ...s,
      notifications:
        studentId === (s.sessionId ?? CURRENT_STUDENT_ID)
          ? [
              {
                id: nouvelId("n"),
                kind: "opportunite" as const,
                titre: "Proposition d'entretien",
                corps:
                  "Une entreprise a vu tes projets terminés et souhaite te rencontrer.",
                date: new Date().toISOString(),
                lu: false,
                cible: "#/opportunites",
              },
              ...s.notifications,
            ]
          : s.notifications,
    }));
  }, []);

  const setChannel = useCallback((canal: keyof ChannelPrefs, actif: boolean) => {
    setState((s) => ({ ...s, channels: { ...s.channels, [canal]: actif } }));
  }, []);

  /* ── Universités — suivi pédagogique ──────────────────────────────────── */

  /**
   * Santé d'une promotion.
   *
   * Ce que l'enseignant doit voir en premier n'est pas la moyenne : c'est la
   * liste des étudiants **sans aucune activité**. Une moyenne de promotion
   * masque exactement les deux ou trois personnes qui décrochent, et ce sont
   * elles que le suivi pédagogique existe pour rattraper.
   */
  const cohortHealth = useCallback(
    (cohortId: string): CohortHealth => {
      const promo = COHORTS.find((c) => c.id === cohortId);
      const ids = promo?.studentIds ?? [];
      const projets = state.projects.filter((p) => ids.includes(p.ownerId));
      const entrees = state.journal.filter((e) =>
        projets.some((p) => p.id === e.projectId),
      );

      const sansActivite = ids.filter((id) => {
        const siens = projets.filter((p) => p.ownerId === id);
        if (siens.length === 0) return true;
        return siens.every(
          (p) => joursDepuis(p.derniereActivite) >= SEUIL_INACTIVITE_JOURS,
        );
      });

      return {
        cohortId,
        effectif: ids.length,
        projetsActifs: projets.filter((p) => p.status === "En cours").length,
        projetsTermines: projets.filter((p) => p.status === "Terminé").length,
        projetsEnSommeil: projets.filter((p) => enSommeil(p)).length,
        etudiantsSansActivite: sansActivite,
        entreesJournal: entrees.length,
      };
    },
    [state.projects, state.journal],
  );

  const unread = state.notifications.filter((n) => !n.lu).length;

  const value: SoaApi = {
    ...state,
    me,
    connecte: state.sessionId !== null,
    entreprise,
    entrepriseConnectee,
    myProjects,
    dormant,
    analytics,
    capsule,
    unread,
    journalFor,
    progressOf,
    summaryFor,
    threadById,
    createProject,
    toggleChecklistItem,
    toggleChecklistBlocked,
    addChecklistItem,
    moveChecklistItemColumn,
    assignChecklistItem,
    addProjectMember,
    removeProjectMember,
    addKanbanColumn,
    deleteKanbanColumn,
    linkGitHubRepo,
    setProjectStatus,
    addJournalEntry,
    replyToThread,
    createThread,
    voteIdea,
    joinChallenge,
    checkChallengeWeek,
    markNotificationRead,
    markAllRead,
    deleteNotifications,
    deleteAllNotifications,
    setChannel,
    createEvent,
    deleteEvent,
    login,
    signup,
    logout,
    desactiverCompte,
    supprimerCompte,
    updateProfile,
    uploadPhoto,
    removePhoto,
    uploadCv,
    removeCv,
    loginEntreprise,
    signupEntreprise,
    logoutEntreprise,
    updateCompanyProfile,
    pointsOf,
    commentIdea,
    askMentor,
    answerMentorRequest,
    publishOpportunity,
    attachRepo,
    syncRepo,
    detachRepo,
    saveShowcase,
    uploadShowcaseCapture,
    removeShowcaseCapture,
    validateSkill,
    proposeInterview,
    cohortHealth,
    reviveProject,
  };

  return <SoaContext.Provider value={value}>{children}</SoaContext.Provider>;
}

export function useSoa(): SoaApi {
  const ctx = useContext(SoaContext);
  if (!ctx) throw new Error("useSoa doit être utilisé dans un SoaProvider");
  return ctx;
}
