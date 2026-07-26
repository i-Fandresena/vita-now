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
  Challenge,
  ChannelPrefs,
  CohortHealth,
  ForumThread,
  Idea,
  JournalEntry,
  JournalKind,
  MentorRequest,
  Notification,
  Opportunity,
  Project,
  ProjectShowcase,
  ProjectStatus,
  ProjectSummary,
  ResumptionCapsule,
  Student,
  StudentAnalytics,
} from "@/domain/soa";
import {
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
import { CLES, charger, enregistrer } from "@/lib/persistence";

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
  /** M1 — null tant que personne n'est connecté. */
  sessionId: string | null;
  /** M20 — « Canaux : email, push mobile, notification web ». */
  channels: ChannelPrefs;
}

interface SoaApi extends SoaState {
  /* M1 — session */
  me: Student;
  connecte: boolean;

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
  setProjectStatus: (projectId: string, status: ProjectStatus, raison?: string) => void;
  addJournalEntry: (draft: NewJournalEntry) => JournalEntry;
  replyToThread: (threadId: string, corps: string) => void;
  createThread: (draft: NewThread) => ForumThread;
  voteIdea: (ideaId: string, sens: "pour" | "reserve") => void;
  joinChallenge: (challengeId: string) => void;
  checkChallengeWeek: (challengeId: string, semaine: number) => void;
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;
  setChannel: (canal: keyof ChannelPrefs, actif: boolean) => void;

  /* M1 — authentification. Voir `domain/soa.ts` : ceci n'est pas de la
     sécurité, c'est une session qui permet de savoir qui est connecté. */
  login: (email: string, motDePasse: string) => AuthResult;
  signup: (draft: NewStudent) => AuthResult;
  logout: () => void;
  updateProfile: (patch: Partial<Student>) => void;

  /* M12 — points SOA */
  pointsOf: (studentId: string) => number;

  /* M14 — commenter une idée */
  commentIdea: (ideaId: string, corps: string) => void;

  /* M18 — mise en relation */
  askMentor: (mentorId: string, blocage: string) => MentorRequest;
  answerMentorRequest: (requestId: string, corps: string) => void;

  /* M13 — un étudiant publie aussi */
  publishOpportunity: (draft: NewOpportunity) => void;

  /* M17 — présentation */
  saveShowcase: (projectId: string, showcase: ProjectShowcase) => void;

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

/** Les comptes créés pendant la session s'ajoutent à ceux du corpus. */
let comptesVivants: Account[] = [...ACCOUNTS];

let compteur = 0;
const nouvelId = (prefixe: string) => `${prefixe}-${Date.now().toString(36)}-${compteur++}`;

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
      sessionId: lireSession(),
      channels: { web: true, email: false, push: false },
    };

    return charger<SoaState>(CLES.etat) ?? initial;
  });

  useEffect(() => {
    enregistrer(CLES.etat, state);
  }, [state]);

  const me =
    state.students.find((s) => s.id === (state.sessionId ?? CURRENT_STUDENT_ID)) ??
    state.students[0]!;

  const journalFor = useCallback(
    (projectId: string) =>
      state.journal
        .filter((e) => e.projectId === projectId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [state.journal],
  );

  const progressOf = useCallback(
    (projectId: string) => avancement(state.journal.filter((e) => e.projectId === projectId)),
    [state.journal],
  );

  const myProjects = useMemo(
    () => state.projects.filter((p) => p.ownerId === me.id),
    [state.projects, me.id],
  );

  const dormant = useMemo(() => myProjects.filter((p) => enSommeil(p)), [myProjects]);

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

    const points = POINTS.filter((p) => p.studentId === me.id).reduce(
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
  }, [myProjects, state.journal, me.id]);

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

      return {
        projectId,
        objectif: projet.objectif,
        faitCeQui: fait,
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

  const createProject = useCallback((draft: NewProject): Project => {
    const projet: Project = {
      id: nouvelId("p"),
      ...draft,
      status: "Idée",
      debut: new Date().toISOString(),
      ownerId: CURRENT_STUDENT_ID,
      derniereActivite: new Date().toISOString(),
      public: false,
    };
    setState((s) => ({ ...s, projects: [projet, ...s.projects] }));
    return projet;
  }, []);

  const setProjectStatus = useCallback(
    (projectId: string, status: ProjectStatus, raison?: string) => {
      setState((s) => ({
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
      }));
    },
    [],
  );

  const addJournalEntry = useCallback((draft: NewJournalEntry): JournalEntry => {
    const entree: JournalEntry = {
      id: nouvelId("j"),
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
    }));
    return entree;
  }, []);

  const replyToThread = useCallback((threadId: string, corps: string) => {
    setState((s) => ({
      ...s,
      threads: s.threads.map((t) =>
        t.id === threadId
          ? {
              ...t,
              reponses: [
                ...t.reponses,
                {
                  id: nouvelId("r"),
                  auteurId: CURRENT_STUDENT_ID,
                  corps,
                  date: new Date().toISOString(),
                  deMentor: me.mentor,
                },
              ],
            }
          : t,
      ),
    }));
  }, []);

  const createThread = useCallback((draft: NewThread): ForumThread => {
    const sujet: ForumThread = {
      id: nouvelId("t"),
      ...draft,
      auteurId: CURRENT_STUDENT_ID,
      date: new Date().toISOString(),
      reponses: [],
    };
    setState((s) => ({ ...s, threads: [sujet, ...s.threads] }));
    return sujet;
  }, []);

  const voteIdea = useCallback((ideaId: string, sens: "pour" | "reserve") => {
    setState((s) => ({
      ...s,
      ideas: s.ideas.map((i) => {
        if (i.id !== ideaId) return i;
        // Un vote est exclusif : voter « pour » retire une réserve, et
        // revoter le même sens l'annule.
        const pour = i.votesPour.filter((v) => v !== CURRENT_STUDENT_ID);
        const reserve = i.votesReserve.filter((v) => v !== CURRENT_STUDENT_ID);
        const dejaPour = i.votesPour.includes(CURRENT_STUDENT_ID);
        const dejaReserve = i.votesReserve.includes(CURRENT_STUDENT_ID);
        if (sens === "pour" && !dejaPour) pour.push(CURRENT_STUDENT_ID);
        if (sens === "reserve" && !dejaReserve) reserve.push(CURRENT_STUDENT_ID);
        return { ...i, votesPour: pour, votesReserve: reserve };
      }),
    }));
  }, []);

  const joinChallenge = useCallback((challengeId: string) => {
    setState((s) => ({
      ...s,
      challenges: s.challenges.map((c) =>
        c.id === challengeId && !c.participants.some((p) => p.studentId === CURRENT_STUDENT_ID)
          ? {
              ...c,
              participants: [
                ...c.participants,
                { studentId: CURRENT_STUDENT_ID, semaines: [] },
              ],
            }
          : c,
      ),
    }));
  }, []);

  const checkChallengeWeek = useCallback((challengeId: string, semaine: number) => {
    setState((s) => ({
      ...s,
      challenges: s.challenges.map((c) => {
        if (c.id !== challengeId) return c;
        return {
          ...c,
          participants: c.participants.map((p) => {
            if (p.studentId !== CURRENT_STUDENT_ID) return p;
            const semaines = [...p.semaines];
            while (semaines.length <= semaine) semaines.push(false);
            semaines[semaine] = !semaines[semaine];
            return { ...p, semaines };
          }),
        };
      }),
    }));
  }, []);

  const markNotificationRead = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      notifications: s.notifications.map((n) => (n.id === id ? { ...n, lu: true } : n)),
    }));
  }, []);

  const markAllRead = useCallback(() => {
    setState((s) => ({
      ...s,
      notifications: s.notifications.map((n) => ({ ...n, lu: true })),
    }));
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
          ownerId: CURRENT_STUDENT_ID,
          status: "En cours",
          fin: undefined,
          derniereActivite: maintenant,
        };
        return repris;
      }),
      journal: [
        {
          id: nouvelId("j"),
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
    return repris;
  }, []);

  /* ── M1 — Authentification ────────────────────────────────────────────── */

  /**
   * Aucun mot de passe n'est vérifié : le compte identifie, il ne protège pas.
   * L'écran de connexion l'affiche noir sur blanc — laisser croire à une
   * authentification qui n'existe pas serait pire que ne pas en avoir.
   */
  const login = useCallback((email: string, motDePasse: string): AuthResult => {
    const compte = comptesVivants.find(
      (c) => c.email.toLowerCase() === email.trim().toLowerCase(),
    );
    if (!compte) return { ok: false, raison: "inconnu" };
    if (compte.motDePasse !== motDePasse) return { ok: false, raison: "motDePasse" };

    setState((s) => ({ ...s, sessionId: compte.studentId }));
    ecrireSession(compte.studentId);
    return { ok: true };
  }, []);

  const signup = useCallback((draft: NewStudent): AuthResult => {
    const email = draft.email.trim().toLowerCase();
    // Un e-mail déjà pris renvoie la même erreur qu'une connexion sur un
    // compte inconnu : le formulaire n'a qu'un seul endroit où l'afficher.
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
  }, []);

  const updateProfile = useCallback((patch: Partial<Student>) => {
    setState((s) => ({
      ...s,
      students: s.students.map((e) =>
        e.id === (s.sessionId ?? CURRENT_STUDENT_ID) ? { ...e, ...patch } : e,
      ),
    }));
  }, []);

  /* ── M12 — Points ─────────────────────────────────────────────────────── */

  const pointsOf = useCallback(
    (studentId: string) =>
      POINTS.filter((p) => p.studentId === studentId).reduce(
        (t, p) => t + POINT_VALUES[p.reason],
        0,
      ),
    [],
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
  }, []);

  /* ── M18 — Mise en relation ───────────────────────────────────────────── */

  const askMentor = useCallback((mentorId: string, blocage: string): MentorRequest => {
    const demande: MentorRequest = {
      id: nouvelId("mr"),
      mentorId,
      studentId: CURRENT_STUDENT_ID,
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
          id: nouvelId("n"),
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
    return demande;
  }, []);

  const answerMentorRequest = useCallback((requestId: string, corps: string) => {
    setState((s) => ({
      ...s,
      mentorRequests: s.mentorRequests.map((d) =>
        d.id === requestId
          ? {
              ...d,
              statut: "en cours",
              reponses: [
                ...d.reponses,
                {
                  auteurId: s.sessionId ?? CURRENT_STUDENT_ID,
                  corps,
                  date: new Date().toISOString(),
                },
              ],
            }
          : d,
      ),
    }));
  }, []);

  /* ── M13 — Un étudiant publie aussi ───────────────────────────────────── */

  const publishOpportunity = useCallback((draft: NewOpportunity) => {
    setState((s) => ({
      ...s,
      opportunities: [
        {
          id: nouvelId("o"),
          ...draft,
          studentId: s.sessionId ?? CURRENT_STUDENT_ID,
          publieeLe: new Date().toISOString(),
        },
        ...s.opportunities,
      ],
    }));
  }, []);

  /* ── M17 — Présentation ───────────────────────────────────────────────── */

  const saveShowcase = useCallback((projectId: string, showcase: ProjectShowcase) => {
    setState((s) => ({
      ...s,
      projects: s.projects.map((p) =>
        p.id === projectId ? { ...p, presentation: showcase } : p,
      ),
    }));
  }, []);

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
    setProjectStatus,
    addJournalEntry,
    replyToThread,
    createThread,
    voteIdea,
    joinChallenge,
    checkChallengeWeek,
    markNotificationRead,
    markAllRead,
    setChannel,
    login,
    signup,
    logout,
    updateProfile,
    pointsOf,
    commentIdea,
    askMentor,
    answerMentorRequest,
    publishOpportunity,
    saveShowcase,
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
