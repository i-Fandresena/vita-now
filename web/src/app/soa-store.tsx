import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type {
  Challenge,
  ForumThread,
  Idea,
  JournalEntry,
  JournalKind,
  Notification,
  Project,
  ProjectStatus,
  ProjectSummary,
  ResumptionCapsule,
  StudentAnalytics,
} from "@/domain/soa";
import { avancement, enSommeil, joursDepuis } from "@/domain/soa";
import {
  CHALLENGES,
  CURRENT_STUDENT,
  CURRENT_STUDENT_ID,
  IDEAS,
  JOURNAL,
  NOTIFICATIONS,
  PROJECTS,
  THREADS,
} from "@/data/soa-corpus";

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
  projects: Project[];
  journal: JournalEntry[];
  threads: ForumThread[];
  challenges: Challenge[];
  ideas: Idea[];
  notifications: Notification[];
}

interface SoaApi extends SoaState {
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

const SoaContext = createContext<SoaApi | null>(null);

let compteur = 0;
const nouvelId = (prefixe: string) => `${prefixe}-${Date.now().toString(36)}-${compteur++}`;

export function SoaProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SoaState>(() => ({
    projects: PROJECTS,
    journal: JOURNAL,
    threads: THREADS,
    challenges: CHALLENGES,
    ideas: IDEAS,
    notifications: NOTIFICATIONS,
  }));

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
    () => state.projects.filter((p) => p.ownerId === CURRENT_STUDENT_ID),
    [state.projects],
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

    return {
      projetsCommences: myProjects.length,
      projetsTermines: termines,
      projetsRepris: repris,
      technoPrincipale,
      entreesJournal: mien.length,
      rythme,
    };
  }, [myProjects, state.journal]);

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
                  deMentor: CURRENT_STUDENT.mentor,
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

  const unread = state.notifications.filter((n) => !n.lu).length;

  const value: SoaApi = {
    ...state,
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
    reviveProject,
  };

  return <SoaContext.Provider value={value}>{children}</SoaContext.Provider>;
}

export function useSoa(): SoaApi {
  const ctx = useContext(SoaContext);
  if (!ctx) throw new Error("useSoa doit être utilisé dans un SoaProvider");
  return ctx;
}
