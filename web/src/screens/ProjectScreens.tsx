import { motion } from "framer-motion";
import {
  ExternalLink,
  GitBranch,
  Lightbulb,
  Presentation,
  RefreshCw,
  SlidersHorizontal,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ComponentType,
  type FormEvent,
  type ReactNode,
} from "react";

import { hrefFor, type Route } from "@/app/router";
import { useSoa, type NewProject } from "@/app/soa-store";
import { API_ACTIVE, api, type ResumeDistant } from "@/data/api";
import { COMPANIES, STUDENTS, studentById } from "@/data/soa-corpus";
import {
  DEFAULT_KANBAN_COLUMNS,
  joursDepuis,
  type Difficulte,
  type JournalKind,
  type KanbanColumn,
  type Project,
  type ProjectShowcase,
  type ProjectStatus,
  type ProjectSummary,
  type ProjectType,
} from "@/domain/soa";
import { cn } from "@/lib/cn";
import { rise, sequence } from "@/lib/motion";
import { Button } from "@/ui/Button";
import { Dialog } from "@/ui/Dialog";
import { Chip, ChipRow } from "@/ui/Editorial";
import { Input, Textarea } from "@/ui/Field";
import { Avatar, DefRow, Progress, Stat } from "@/ui/data";
import { Icon } from "@/ui/Icon";
import { Block, CardLink, Screen, ScreenHead } from "@/ui/layout";
import { Pagination } from "@/ui/Pagination";
import { EmptyState } from "@/ui/states";

/**
 * ProjectScreens.tsx — le parcours projet complet (M2, M3, M4, M5, M17).
 *
 * Un seul fichier parce que ces écrans partagent leur vocabulaire : les mêmes
 * statuts, les mêmes natures d'entrée de journal, la même façon de rendre un
 * projet en une ligne. Les séparer obligerait à exporter une demi-douzaine de
 * petits composants qui n'ont de sens qu'ici.
 */

/* ── Vocabulaire partagé ────────────────────────────────────────────────── */

const STATUTS: ProjectStatus[] = ["Idée", "En cours", "En pause", "Abandonné", "Terminé"];
const TYPES: ProjectType[] = [
  "Académique",
  "Personnel",
  "Startup",
  "Open source",
  "Recherche",
];
const DIFFICULTES: Difficulte[] = ["Découverte", "Intermédiaire", "Ambitieux"];

function presentationPrete(presentation: ProjectShowcase | undefined): boolean {
  if (!presentation) return false;
  return (
    presentation.architecture.trim().length >= 20 &&
    presentation.documentation.trim().length >= 20 &&
    Boolean(presentation.videoUrl || presentation.demoUrl || presentation.captures.length > 0)
  );
}

function captureEstImage(capture: string): boolean {
  return capture.startsWith("/uploads/projects/") || /^https?:\/\//i.test(capture);
}

/** Le statut colore la pastille — mais le mot reste, `color-not-only`. */
function tonStatut(s: ProjectStatus) {
  if (s === "Terminé") return "success" as const;
  if (s === "En cours") return "primary" as const;
  if (s === "Abandonné") return "neutral" as const;
  return "neutral" as const;
}

const ICONE_ENTREE: Record<JournalKind, ComponentType<{ className?: string }>> = {
  Décision: Lightbulb,
  Erreur: (props) => <Icon name="alertTriangle" size={16} {...props} />,
  Solution: (props) => <Icon name="check" size={16} {...props} />,
  Architecture: (props) => <Icon name="settings" size={16} {...props} />,
  Apprentissage: (props) => <Icon name="book" size={16} {...props} />,
};

/**
 * M5 — le résumé « IA » réel, demandé au serveur (Gemini, Claude, ou repli
 * par règles) et affiché dès qu'il arrive. `actif` contrôle l'appel réseau :
 * `false` par défaut ailleurs que sur la page projet, pour qu'afficher une
 * liste de projets ne déclenche pas un résumé par carte — le quota IA est
 * partagé et compté par étudiant (voir `resume.ts`), un simple survol de la
 * liste ne doit rien coûter. L'heuristique locale (`summaryFor`) reste
 * l'affichage instantané, avant comme pendant le chargement du vrai résumé.
 */
export function useResumeProjet(projet: Project | undefined, actif: boolean) {
  const { summaryFor } = useSoa();
  const [resumeReel, setResumeReel] = useState<ResumeDistant | null>(null);

  useEffect(() => {
    if (!API_ACTIVE || !projet || !actif) return;
    setResumeReel(null);
    const controleur = new AbortController();
    api
      .resumeProjet(projet.id, controleur.signal)
      .then(setResumeReel)
      .catch((erreur: unknown) => {
        if (controleur.signal.aborted) return;
        console.error("[resume] indisponible, repli local :", erreur);
      });
    return () => controleur.abort();
  }, [projet?.id, actif]);

  const resume = projet ? (resumeReel ?? summaryFor(projet.id)) : null;
  const resumeSource = resumeReel?.source ?? "journal";
  return { resume, resumeSource };
}

/** Le contenu du résumé, seul — réutilisé dans le bloc "Résumé" de la page
 * projet et dans le dialogue ouvert par `ResumeButton`. */
function ResumeContenu({
  resume,
  resumeSource,
}: {
  resume: ProjectSummary | ResumeDistant;
  resumeSource: "gemini" | "claude" | "journal";
}) {
  const tonRisque =
    resume.risqueAbandon === "Élevé"
      ? "text-destructive"
      : resume.risqueAbandon === "Modéré"
        ? "text-ink"
        : "text-success";

  return (
    <div className="rounded-card border border-border bg-card p-5 sm:p-6">
      <dl>
        <DefRow terme="Objectif">{resume.objectif}</DefRow>
        <DefRow terme="Ce qui est fait">
          {resume.faitCeQui.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {resume.faitCeQui.map((f) => (
                <li key={f} className="flex gap-2">
                  <Icon name="check" size={14} aria-hidden className="mt-1 shrink-0 text-success" />
                  {f}
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-ink-muted">Rien d'écrit dans le journal.</span>
          )}
        </DefRow>
        {resume.enCours.length > 0 && (
          <DefRow terme="En cours">
            <ul className="flex flex-col gap-1">
              {resume.enCours.map((e) => (
                <li key={e} className="flex gap-2">
                  <Icon name="clock" size={14} aria-hidden className="mt-1 shrink-0 text-primary" />
                  {e}
                </li>
              ))}
            </ul>
          </DefRow>
        )}
        <DefRow terme="Ce qui reste">
          {resume.resteAFaire.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {resume.resteAFaire.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          ) : (
            <span className="text-ink-muted">Rien d'ouvert.</span>
          )}
        </DefRow>
        <DefRow terme="Risque d'abandon">
          <span className={cn("font-semibold", tonRisque)}>{resume.risqueAbandon}</span>
          <span className="mt-1 block text-caption text-ink-muted">{resume.pourquoi}</span>
        </DefRow>
      </dl>
      <p className="mt-4 border-t border-border pt-4 text-caption text-ink-muted">
        {resumeSource === "journal"
          ? "Ce résumé est déduit du journal du projet. Il ne devine rien : ce qui n'est pas écrit n'y figure pas."
          : `Résumé généré par IA (${resumeSource === "gemini" ? "Gemini" : "Claude"}), à partir du journal et de la checklist du projet.`}
      </p>
    </div>
  );
}

/**
 * Bouton "Résumer" posé sur une carte de projet (tuile ou ligne dense) — le
 * résumé s'ouvre dans un dialogue, sans quitter la liste. `stopPropagation`
 * est impératif : la carte entière est un `CardLink` (un `<a>`), et un clic
 * sur ce bouton ne doit jamais déclencher la navigation vers le projet.
 */
function ResumeButton({ projet }: { projet: Project }) {
  const [ouvert, setOuvert] = useState(false);
  const { resume, resumeSource } = useResumeProjet(projet, ouvert);

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOuvert(true);
        }}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-caption font-medium text-ink transition-colors duration-150 hover:border-border-strong hover:bg-surface"
      >
        <Icon name="sparkle" size={14} aria-hidden />
        Résumer
      </button>
      <Dialog open={ouvert} onOpenChange={setOuvert} title={`Résumé — ${projet.nom}`}>
        {resume ? (
          <ResumeContenu resume={resume} resumeSource={resumeSource} />
        ) : (
          <p className="text-body text-ink-muted">Résumé en cours de préparation…</p>
        )}
      </Dialog>
    </>
  );
}

export function ProjectRow({
  projet,
  navigate,
  montrerAuteur = false,
}: {
  projet: Project;
  navigate: (to: Route) => void;
  montrerAuteur?: boolean;
}) {
  const { progressOf } = useSoa();
  const auteur = studentById(projet.ownerId);
  const jours = joursDepuis(projet.derniereActivite);

  return (
    <CardLink
      href={hrefFor({ name: "projet", id: projet.id })}
      onClick={() => navigate({ name: "projet", id: projet.id })}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 text-body font-semibold text-ink">{projet.nom}</h3>
          <div className="flex shrink-0 items-center gap-2">
            <Chip tone={tonStatut(projet.status)}>{projet.status}</Chip>
            <ResumeButton projet={projet} />
          </div>
        </div>

        <p className="line-clamp-2 text-caption text-ink-muted">{projet.description}</p>

        <ChipRow>
          <Chip>{projet.type}</Chip>
          {projet.technos.slice(0, 2).map((t) => (
            <Chip key={t}>{t}</Chip>
          ))}
        </ChipRow>

        {projet.status !== "Idée" && (
          <Progress
            valeur={progressOf(projet.id)}
            libelle="Avancement"
            origine={`Dernière entrée il y a ${jours} jour${jours > 1 ? "s" : ""}`}
          />
        )}

        {montrerAuteur && auteur && (
          <div className="flex items-center gap-2 border-t border-border pt-3">
            <Avatar initiales={auteur.initiales} nom={auteur.nom} taille="sm" />
            <span className="text-caption text-ink-muted">
              {auteur.nom} · {auteur.niveau} {auteur.filiere}
            </span>
          </div>
        )}
      </div>
    </CardLink>
  );
}

/* ── M2 — Liste des projets ─────────────────────────────────────────────── */

const FILTRES = ["Tous", "En cours", "Terminé", "Abandonné", "Idée"] as const;

const DATE_COURTE = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" });

/**
 * Le disque d'angle de la tuile.
 *
 * Il porte la couleur du statut, mais **jamais l'information seule** : le mot
 * est écrit par-dessus (`color-not-only`). Le disque ne fait que rendre la
 * grille lisible d'un coup d'œil — quatre teintes reconnues avant d'avoir lu.
 */
const HALO_STATUT: Record<
  ProjectStatus,
  { disque: string; mot: string; barre: string }
> = {
  "En cours": { disque: "bg-primary/12", mot: "text-primary", barre: "bg-primary" },
  Terminé: { disque: "bg-success/15", mot: "text-success", barre: "bg-success" },
  Idée: { disque: "bg-accent/25", mot: "text-on-accent", barre: "bg-accent" },
  "En pause": { disque: "bg-accent-soft", mot: "text-on-accent", barre: "bg-accent" },
  Abandonné: {
    disque: "bg-destructive/10",
    mot: "text-destructive",
    barre: "bg-border-strong",
  },
};

/**
 * La tuile de projet — le motif de la grille des projets.
 *
 * Distincte de `ProjectRow`, qui reste la ligne dense employée sur les profils :
 * ici on scanne son propre atelier, on ne lit pas la production de quelqu'un
 * d'autre. La tuile ne montre donc pas la description — elle montre ce qui
 * décide de la prochaine action : le nom, la dernière activité, l'avancement.
 */
export function ProjectTile({
  projet,
  navigate,
  className,
}: {
  projet: Project;
  navigate: (to: Route) => void;
  className?: string;
}) {
  const { progressOf, journalFor } = useSoa();
  const halo = HALO_STATUT[projet.status];
  const entrees = journalFor(projet.id).length;
  const avance = progressOf(projet.id);
  // Une idée n'a pas d'avancement : le pourcentage vient du journal, et il n'y
  // a pas encore de journal. Afficher 0 % laisserait croire à un échec.
  const chiffre = projet.status !== "Idée";

  return (
    <CardLink
      href={hrefFor({ name: "projet", id: projet.id })}
      onClick={() => navigate({ name: "projet", id: projet.id })}
      className={cn("relative flex flex-col overflow-hidden p-5 sm:p-6", className)}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute -top-12 -right-12 size-36 rounded-full",
          "transition-transform duration-300 ease-out group-hover:scale-110 motion-reduce:transition-none",
          halo.disque,
        )}
      />

      <div className="relative flex items-start justify-between gap-3">
        <span className="inline-flex items-center rounded-full border border-border px-2.5 py-1 font-heading text-micro text-ink-muted">
          {projet.type}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          <ResumeButton projet={projet} />
          <span className={cn("pt-1 font-heading text-micro", halo.mot)}>{projet.status}</span>
        </div>
      </div>

      <h3 className="relative mt-6 font-heading text-heading text-ink">{projet.nom}</h3>

      <div className="relative mt-auto flex items-end justify-between gap-3 pt-5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-caption text-ink-muted">
          <span className="inline-flex items-center gap-1.5">
            <Icon name="calendar" size={14} aria-hidden className="shrink-0" />
            {DATE_COURTE.format(new Date(projet.derniereActivite))}
            <span className="sr-only">— dernière activité</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Icon name="book" size={14} aria-hidden className="shrink-0" />
            {entrees}
            <span className="sr-only">
              entrée{entrees > 1 ? "s" : ""} de journal
            </span>
          </span>
        </div>

        {chiffre && (
          <span className="shrink-0 font-display text-display-3 leading-none tabular-nums text-ink">
            {avance}
            <span className="text-heading">%</span>
          </span>
        )}
      </div>

      {chiffre ? (
        <div
          role="progressbar"
          aria-valuenow={avance}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Avancement de ${projet.nom}`}
          className="relative mt-3 h-2 w-full overflow-hidden rounded-full bg-surface"
        >
          <div
            className={cn(
              "h-full rounded-full transition-[width] duration-300 ease-out motion-reduce:transition-none",
              halo.barre,
            )}
            style={{ width: `${avance}%` }}
          />
        </div>
      ) : (
        <p className="relative mt-3 text-caption text-ink-muted">
          Pas encore commencé — l'avancement se déduit du journal.
        </p>
      )}
    </CardLink>
  );
}

/** La pastille de filtre — active en indigo plein, inactive en carte blanche. */
function Pastille({
  actif,
  onClick,
  children,
  role,
  "aria-selected": ariaSelected,
  "aria-pressed": ariaPressed,
}: {
  actif: boolean;
  onClick: () => void;
  children: ReactNode;
  role?: "tab";
  "aria-selected"?: boolean;
  "aria-pressed"?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      role={role}
      aria-selected={ariaSelected}
      aria-pressed={ariaPressed}
      className={cn(
        "h-10 shrink-0 rounded-full border px-4 text-caption font-medium",
        "transition-colors duration-150",
        actif
          ? "border-primary bg-primary text-on-primary"
          : "border-border bg-card text-ink-muted hover:border-border-strong hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

export function ProjectsScreen({ navigate }: { navigate: (to: Route) => void }) {
  const { myProjects, analytics } = useSoa();
  const [filtre, setFiltre] = useState<(typeof FILTRES)[number]>("Tous");
  const [recherche, setRecherche] = useState("");
  const [affiner, setAffiner] = useState(false);
  const [types, setTypes] = useState<ProjectType[]>([]);
  const [page, setPage] = useState(1);

  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase();
    return myProjects.filter((p) => {
      if (filtre !== "Tous" && p.status !== filtre) return false;
      if (types.length > 0 && !types.includes(p.type)) return false;
      if (!q) return true;
      return (
        p.nom.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.technos.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [myProjects, filtre, types, recherche]);

  const livres = myProjects.filter((p) => p.status === "Terminé").length;
  const pages = Math.max(1, Math.ceil(visibles.length / 9));
  const projetsPage = visibles.slice((page - 1) * 9, page * 9);

  useEffect(() => {
    setPage(1);
  }, [filtre, recherche, types]);
  useEffect(() => {
    setPage((courante) => Math.min(courante, pages));
  }, [pages]);

  return (
    <Screen>
      {/* Le cadre d'en-tête. Le dégradé jaune-indigo est porté par
          `.panel-aura-pale` et non par des classes de couleur : une teinte
          décorative écrite dans le balisage est un token qui n'existe pas, et
          elle dérive au premier écran suivant.

          Aucune bordure ici — le cadre se détache par sa couleur, et un filet
          gris posé dessus se lirait comme une découpe. Le disque indigo a
          disparu pour la même raison : le dégradé occupe déjà l'angle, deux
          gestes s'y annuleraient. */}
      <header className="panel-aura-pale relative overflow-hidden rounded-card p-6 shadow-card sm:p-8">
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="hand-note">Ton studio</span>
            <h1 className="text-balance font-display text-display-3 text-ink sm:text-display-2">
              Mes projets
            </h1>
            {/* `text-ink-muted` (55 % de clarté) tient sur les surfaces
                blanches du produit, pas sur ce dégradé : il y tombe à 3,8:1.
                L'encre à 70 % d'opacité rend le même gris secondaire tout en
                restant au-dessus de 6:1, sur fond clair comme sur fond
                sombre. */}
            <p className="mt-1 text-caption text-ink/70">
              {myProjects.length} projet{myProjects.length > 1 ? "s" : ""} · {livres}{" "}
              livré{livres > 1 ? "s" : ""} · {analytics.entreesJournal} entrée
              {analytics.entreesJournal > 1 ? "s" : ""} de journal.
            </p>
            <p className="prose-measure mt-3 text-body text-ink/70">
              Un projet arrêté n'est pas un échec : c'est une impasse documentée, et
              elle vaut pour le suivant.
            </p>
          </div>

          <Button
            variant="primary"
            size="lg"
            className="shrink-0 self-start sm:self-auto"
            onClick={() => navigate({ name: "projet-nouveau" })}
          >
            <Icon name="plus" size={16} aria-hidden />
            Nouveau projet
          </Button>
        </div>
      </header>

      {/* Barre d'outils : les statuts à gauche, la recherche à droite. Sous
          640px la recherche passe sous les pastilles plutôt que de les
          comprimer — un champ de 90px ne sert personne. */}
      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          role="tablist"
          aria-label="Filtrer par état"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {FILTRES.map((f) => (
            <Pastille
              key={f}
              role="tab"
              aria-selected={f === filtre}
              actif={f === filtre}
              onClick={() => setFiltre(f)}
            >
              {f}
            </Pastille>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1 lg:w-64 lg:flex-none">
            <Icon
              name="search"
              size={16}
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-muted"
            />
            <input
              type="search"
              value={recherche}
              onChange={(e) => setRecherche(e.target.value)}
              placeholder="Filtrer…"
              aria-label="Filtrer les projets par nom ou techno"
              className={cn(
                "h-11 w-full rounded-full border border-border bg-card pr-4 pl-10 text-body text-ink",
                "placeholder:text-ink-muted transition-[border-color] duration-150",
                "hover:border-border-strong",
                "focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary-wash focus-visible:outline-none",
              )}
            />
          </div>

          <button
            type="button"
            aria-pressed={affiner}
            aria-label="Affiner par type de projet"
            onClick={() => setAffiner((v) => !v)}
            className={cn(
              "grid size-11 shrink-0 place-items-center rounded-full border",
              "transition-colors duration-150",
              affiner || types.length > 0
                ? "border-primary bg-primary-wash text-primary"
                : "border-border bg-card text-ink-muted hover:border-border-strong hover:text-ink",
            )}
          >
            <SlidersHorizontal aria-hidden className="size-4" />
          </button>
        </div>
      </div>

      {affiner && (
        <div
          className="mt-3 flex flex-wrap gap-2"
          role="group"
          aria-label="Filtrer par type de projet"
        >
          {TYPES.map((t) => {
            const choisi = types.includes(t);
            return (
              <Pastille
                key={t}
                aria-pressed={choisi}
                actif={choisi}
                onClick={() =>
                  setTypes((liste) =>
                    choisi ? liste.filter((x) => x !== t) : [...liste, t],
                  )
                }
              >
                {t}
              </Pastille>
            );
          })}
        </div>
      )}

      <motion.div
        variants={sequence(0.04)}
        initial="hidden"
        animate="visible"
        className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
      >
        {projetsPage.map((p) => (
          <motion.div key={p.id} variants={rise} className="flex">
            <ProjectTile projet={p} navigate={navigate} className="w-full" />
          </motion.div>
        ))}
      </motion.div>

      <Pagination page={page} total={visibles.length} pageSize={9} onChange={setPage} itemLabel="projet" />

      {visibles.length === 0 && (
        <div className="mt-6">
          <EmptyState
            title={
              recherche.trim()
                ? `Rien ne correspond à « ${recherche.trim()} »`
                : `Aucun projet « ${filtre} »`
            }
            body="Change de filtre, ou commence quelque chose. Un projet d'une semaine qui aboutit vaut mieux qu'un projet de six mois qui s'arrête au troisième jour."
            action={
              <Button variant="secondary" onClick={() => navigate({ name: "projet-nouveau" })}>
                Créer un projet
              </Button>
            }
          />
        </div>
      )}
    </Screen>
  );
}

/* ── M2 — Création ──────────────────────────────────────────────────────── */

function ChoixGroupe<T extends string>({
  label,
  options,
  valeur,
  onChange,
}: {
  label: string;
  options: readonly T[];
  valeur: T;
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="label-eyebrow mb-2">{label}</legend>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={label}>
        {options.map((o) => {
          const actif = o === valeur;
          return (
            <button
              key={o}
              type="button"
              role="radio"
              aria-checked={actif}
              onClick={() => onChange(o)}
              className={cn(
                "h-11 rounded-full border px-4 text-body transition-colors duration-150",
                actif
                  ? "border-primary bg-primary-wash font-medium text-primary"
                  : "border-border text-ink-muted hover:border-border-strong hover:text-ink",
              )}
            >
              {o}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function NewProjectScreen({ navigate }: { navigate: (to: Route) => void }) {
  const { createProject, opportunities } = useSoa();
  const [form, setForm] = useState<NewProject>({
    nom: "",
    description: "",
    type: "Académique",
    technos: [],
    objectif: "",
    dureeSemaines: 6,
    difficulte: "Intermédiaire",
  });
  const [technosBrut, setTechnosBrut] = useState("");
  const [opportuniteId, setOpportuniteId] = useState("");
  // M13 — les appels à projet, motivation possible d'un projet Personnel.
  const appelsAProjet = opportunities.filter((o) => o.nature === "Projet");
  const [etapes, setEtapes] = useState<{ libelle: string; dureeHeures: string }[]>([
    { libelle: "", dureeHeures: "" },
    { libelle: "", dureeHeures: "" },
    { libelle: "", dureeHeures: "" },
  ]);
  const [erreur, setErreur] = useState<string | null>(null);

  function majEtape(index: number, champ: "libelle" | "dureeHeures", valeur: string) {
    setEtapes((e) => e.map((v, i) => (i === index ? { ...v, [champ]: valeur } : v)));
  }

  function retirerEtape(index: number) {
    setEtapes((e) => e.filter((_, i) => i !== index));
  }

  function soumettre(event: FormEvent) {
    event.preventDefault();
    if (!form.nom.trim()) {
      setErreur("Un projet a besoin d'un nom pour exister ailleurs que dans ta tête.");
      return;
    }
    if (!form.objectif.trim()) {
      setErreur(
        "Sans objectif écrit, il n'y a aucun moyen de savoir si le projet est terminé.",
      );
      return;
    }
    const renseignees = etapes.filter((e) => e.libelle.trim());
    const sansDuree = renseignees.find((e) => !e.dureeHeures.trim() || Number(e.dureeHeures) <= 0);
    if (sansDuree) {
      setErreur(
        `Indique une durée estimée pour « ${sansDuree.libelle.trim()} » — combien d'heures pour la finaliser.`,
      );
      return;
    }
    const projet = createProject({
      ...form,
      technos: technosBrut
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      checklist: renseignees.map((e) => ({
        libelle: e.libelle.trim(),
        dureeHeures: Number(e.dureeHeures),
      })),
      opportuniteId:
        form.type === "Personnel" && opportuniteId ? opportuniteId : undefined,
    });
    navigate({ name: "projet", id: projet.id });
  }

  return (
    <Screen>
      <ScreenHead
        eyebrow="Nouveau projet"
        titre="Qu'est-ce que tu construis ?"
        lede="Trois champs comptent vraiment : le nom, l'objectif, et la durée que tu te donnes. Le reste peut attendre."
        retour={{ name: "projets" }}
        onRetour={navigate}
      />

      <form onSubmit={soumettre} className="mt-8 flex max-w-2xl flex-col gap-8">
        <Input
          label="Nom du projet"
          value={form.nom}
          onChange={(e) => setForm({ ...form, nom: e.target.value })}
          placeholder="Suivi des semis — coopérative d'Antsirabe"
        />

        <Textarea
          label="Description"
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          hint="En deux phrases. À qui ça sert, et dans quelle situation."
        />

        <Textarea
          label="Objectif"
          rows={2}
          value={form.objectif}
          onChange={(e) => setForm({ ...form, objectif: e.target.value })}
          hint="La phrase qui te permettra de dire « c'est fini ». Sois précis : « qu'un technicien puisse saisir une journée hors ligne » se vérifie ; « faire une bonne appli » non."
        />

        <ChoixGroupe
          label="Type"
          options={TYPES}
          valeur={form.type}
          onChange={(type) => {
            setForm({ ...form, type });
            if (type !== "Personnel") setOpportuniteId("");
          }}
        />

        {/*
         * M13 — un projet Personnel peut naître d'un appel à projet déjà
         * publié sur la plateforme (entreprise ou étudiant). Optionnel :
         * beaucoup de projets personnels n'en ont pas.
         */}
        {form.type === "Personnel" && (
          <div className="flex flex-col gap-2">
            <label className="label-eyebrow" htmlFor="opportunite">
              Motivé par un appel à projet
            </label>
            {appelsAProjet.length > 0 ? (
              <select
                id="opportunite"
                value={opportuniteId}
                onChange={(e) => setOpportuniteId(e.target.value)}
                className="h-11 w-full rounded-sm border border-border bg-card px-3 text-body text-ink transition-[border-color] duration-150 ease-out hover:border-border-strong focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-wash"
              >
                <option value="">Aucun — ce projet n'a pas d'appel à l'origine</option>
                {appelsAProjet.map((o) => {
                  const entreprise = COMPANIES.find((e) => e.id === o.companyId);
                  const auteur = o.studentId ? studentById(o.studentId) : undefined;
                  return (
                    <option key={o.id} value={o.id}>
                      {o.titre} — {entreprise?.nom ?? auteur?.nom ?? "Émetteur inconnu"}
                    </option>
                  );
                })}
              </select>
            ) : (
              <p className="text-caption text-ink-muted">
                Aucun appel à projet publié pour l'instant sur la plateforme.
              </p>
            )}
          </div>
        )}

        <ChoixGroupe
          label="Difficulté"
          options={DIFFICULTES}
          valeur={form.difficulte}
          onChange={(difficulte) => setForm({ ...form, difficulte })}
        />

        <Input
          label="Technologies"
          value={technosBrut}
          onChange={(e) => setTechnosBrut(e.target.value)}
          placeholder="TypeScript, PostgreSQL"
          hint="Séparées par des virgules."
        />

        <Input
          label="Durée visée (semaines)"
          type="number"
          inputMode="numeric"
          min={1}
          max={52}
          value={form.dureeSemaines}
          onChange={(e) =>
            setForm({ ...form, dureeSemaines: Number(e.target.value) || 1 })
          }
          hint="Une durée courte et tenue vaut mieux qu'une durée longue et abandonnée."
          error={erreur ?? undefined}
        />

        {/*
         * Les étapes prévues deviennent la checklist ("post-it") de l'espace
         * projet. Optionnel — mais dès qu'il y en a, cocher une étape pilote
         * directement « Avancement » partout (voir `progressOf`).
         */}
        <div className="flex flex-col gap-3">
          <span className="label-eyebrow">Étapes prévues</span>
          <p className="text-caption text-ink-muted">
            Optionnel. Chaque étape devient un post-it à cocher dans l'espace du
            projet — indépendant de l'avancement, qui reste déduit du journal.
            Une durée estimée est requise dès qu'une étape a un libellé ; des
            sous-tâches pourront être ajoutées plus tard, depuis l'espace projet.
          </p>
          <div className="flex flex-col gap-2">
            {etapes.map((etape, index) => (
              <div key={index} className="flex items-end gap-2">
                <Input
                  label={`Étape ${index + 1}`}
                  value={etape.libelle}
                  onChange={(e) => majEtape(index, "libelle", e.target.value)}
                  placeholder="Mettre en place la base de données"
                  wrapperClassName="flex-1"
                />
                <Input
                  label="Durée (h)"
                  type="number"
                  inputMode="numeric"
                  min={0.5}
                  step={0.5}
                  value={etape.dureeHeures}
                  onChange={(e) => majEtape(index, "dureeHeures", e.target.value)}
                  wrapperClassName="w-28 shrink-0"
                />
                {etapes.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => retirerEtape(index)}
                    aria-label={`Retirer l'étape ${index + 1}`}
                  >
                    <X aria-hidden className="size-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="self-start"
            onClick={() => setEtapes((e) => [...e, { libelle: "", dureeHeures: "" }])}
          >
            <Icon name="plus" size={16} aria-hidden />
            Ajouter une étape
          </Button>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" variant="primary" size="lg">
            Créer le projet
          </Button>
          <Button variant="ghost" onClick={() => navigate({ name: "projets" })}>
            Annuler
          </Button>
        </div>
      </form>
    </Screen>
  );
}

/**
 * Formulaire compact d'ajout d'une tâche (ou sous-tâche, via `parentId`)
 * depuis l'espace projet — la checklist ne se limite plus à ce qui a été
 * saisi à la création. La durée est requise, comme à la création.
 */
function estimerDureeIA(libelle: string): number {
  const m = libelle.toLowerCase();
  if (m.includes("bdd") || m.includes("base") || m.includes("database") || m.includes("schema") || m.includes("sql")) return 6;
  if (m.includes("auth") || m.includes("connexion") || m.includes("securit") || m.includes("login")) return 5;
  if (m.includes("ui") || m.includes("maquette") || m.includes("design") || m.includes("interface") || m.includes("ecran")) return 4;
  if (m.includes("api") || m.includes("backend") || m.includes("route") || m.includes("serveur")) return 5;
  if (m.includes("test") || m.includes("unitaire") || m.includes("recette") || m.includes("ci")) return 3;
  if (m.includes("deploy") || m.includes("vps") || m.includes("docker") || m.includes("nginx")) return 4;
  if (m.includes("doc") || m.includes("readme") || m.includes("rapport") || m.includes("presentation")) return 2;
  return 3;
}

function AjoutEtape({
  projectId,
  parentId,
  parentDuree,
  sousTachesSomme = 0,
  onAjoute,
}: {
  projectId: string;
  parentId?: string;
  parentDuree?: number;
  sousTachesSomme?: number;
  onAjoute?: () => void;
}) {
  const { addChecklistItem } = useSoa();
  const [libelle, setLibelle] = useState("");
  const [duree, setDuree] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  const restantDisponible = parentDuree != null ? Math.max(0.5, parentDuree - sousTachesSomme) : undefined;

  function sugererDuree() {
    if (!libelle.trim()) {
      setErreur("Saisissez d'abord le nom de la tâche.");
      return;
    }
    const iaDuree = estimerDureeIA(libelle);
    const retenue = restantDisponible != null ? Math.min(iaDuree, restantDisponible) : iaDuree;
    setDuree(String(retenue));
    setErreur(null);
  }

  function soumettre(event: FormEvent) {
    event.preventDefault();
    const heures = Number(duree);
    if (!libelle.trim()) {
      setErreur("Le libellé est requis.");
      return;
    }
    if (!duree.trim() || heures <= 0) {
      setErreur("La durée estimée (en heures) est requise.");
      return;
    }

    if (parentId && parentDuree != null) {
      const nouvelleSomme = sousTachesSomme + heures;
      if (nouvelleSomme > parentDuree) {
        setErreur(`La somme des sous-tâches (${nouvelleSomme}h) dépasserait la tâche parente (${parentDuree}h). Reste disponible : ${restantDisponible}h.`);
        return;
      }
    }

    addChecklistItem(projectId, { libelle: libelle.trim(), dureeHeures: heures, parentId });
    setLibelle("");
    setDuree("");
    setErreur(null);
    onAjoute?.();
  }

  return (
    <form onSubmit={soumettre} className="flex flex-col gap-2 rounded-card border border-border bg-card p-3">
      {parentId && parentDuree != null && (
        <div className="text-caption text-ink-muted flex items-center justify-between">
          <span>Durée parente : <strong>{parentDuree}h</strong></span>
          <span>Restant dispo : <strong className="text-primary">{restantDisponible}h</strong></span>
        </div>
      )}
      <div className="flex flex-wrap items-end gap-2">
        <Input
          label={parentId ? "Nouvelle sous-tâche" : "Nouveau ticket"}
          value={libelle}
          onChange={(e) => setLibelle(e.target.value)}
          wrapperClassName="min-w-[12rem] flex-1"
        />
        <Input
          label="Durée (h)"
          type="number"
          inputMode="numeric"
          min={0.5}
          step={0.5}
          value={duree}
          onChange={(e) => setDuree(e.target.value)}
          wrapperClassName="w-24 shrink-0"
        />
        <Button type="button" variant="secondary" size="sm" onClick={sugererDuree} className="shrink-0 text-caption">
          <Icon name="sparkle" size={14} aria-hidden />
          IA : Suggérer durée
        </Button>
        <Button type="submit" variant="primary" size="sm" className="shrink-0">
          <Icon name="plus" size={16} aria-hidden />
          Ajouter
        </Button>
      </div>
      {erreur && <p className="text-caption text-destructive">{erreur}</p>}
    </form>
  );
}

function EquipeProjetComponent({ projet, mien }: { projet: Project; mien: boolean }) {
  const { students, addProjectMember, removeProjectMember } = useSoa();
  const [membreSelect, setMembreSelect] = useState("");
  const membresIds = Array.from(new Set([projet.ownerId, ...(projet.membres ?? [])]));

  const membresEtudiants = membresIds
    .map((id) => students.find((s) => s.id === id) ?? studentById(id))
    .filter((s): s is NonNullable<typeof s> => s != null);

  const nonMembres = students.filter((s) => !membresIds.includes(s.id));

  function ajouterMembre() {
    if (!membreSelect) return;
    addProjectMember(projet.id, membreSelect);
    setMembreSelect("");
  }

  return (
    <Block titre="Équipe du projet">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {membresEtudiants.map((member) => (
            <div key={member.id} className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-caption">
              <Avatar initiales={member.initiales} nom={member.nom} taille="sm" />
              <div className="flex flex-col">
                <span className="font-medium text-ink">{member.nom}</span>
                <span className="text-[0.6875rem] text-ink-muted">
                  {member.id === projet.ownerId ? "Porteur de projet" : "Membre d'équipe"}
                </span>
              </div>
              {mien && member.id !== projet.ownerId && (
                <button
                  type="button"
                  onClick={() => removeProjectMember(projet.id, member.id)}
                  className="ml-1 text-ink-muted hover:text-destructive"
                  title="Retirer l'étudiant du groupe"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        {mien && nonMembres.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60">
            <select
              value={membreSelect}
              onChange={(e) => setMembreSelect(e.target.value)}
              className="rounded-sm border border-border bg-surface px-3 py-1.5 text-caption text-ink flex-1 min-w-[14rem]"
            >
              <option value="">Sélectionner un étudiant à inviter dans le groupe…</option>
              {nonMembres.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom} ({s.niveau} - {s.filiere})
                </option>
              ))}
            </select>
            <Button type="button" variant="secondary" size="sm" onClick={ajouterMembre} disabled={!membreSelect}>
              <Icon name="plus" size={14} aria-hidden />
              Inviter au groupe
            </Button>
          </div>
        )}
      </div>
    </Block>
  );
}

function GitHubDepotComponent({ projet, mien }: { projet: Project; mien: boolean }) {
  const { linkGitHubRepo } = useSoa();
  const [slugInput, setSlugInput] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  function soumettre(e: FormEvent) {
    e.preventDefault();
    if (!slugInput.trim()) {
      setErreur("Veuillez saisir un nom de dépôt (ex: username/repo)");
      return;
    }
    linkGitHubRepo(projet.id, slugInput);
    setSlugInput("");
    setErreur(null);
  }

  const depot = projet.depot;

  return (
    <Block titre="Dépôt GitHub rattaché">
      <div className="flex flex-col gap-4">
        {depot ? (
          <div className="rounded-card border border-border bg-card p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitBranch className="size-4 text-primary" />
                <span className="font-semibold text-body text-ink">{depot.hote} / {depot.slug}</span>
              </div>
              <a
                href={depot.url ?? `https://github.com/${depot.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-caption text-primary underline"
              >
                Voir sur GitHub <ExternalLink className="size-3.5" />
              </a>
            </div>
            <p className="text-caption text-ink-muted">
              Branche principale : <strong>{depot.brancheParDefaut ?? "main"}</strong> · Branches : {depot.branches.join(", ")}
            </p>
          </div>
        ) : (
          <div className="rounded-card border border-border bg-surface p-4 text-caption text-ink-muted">
            Aucun dépôt GitHub n'est encore rattaché à ce projet.
          </div>
        )}

        {mien && (
          <form onSubmit={soumettre} className="flex flex-wrap items-end gap-2 pt-2 border-t border-border/60">
            <Input
              label="Lier un dépôt GitHub (ex: i-Fandresena/vita-now)"
              placeholder="username/repository"
              value={slugInput}
              onChange={(e) => setSlugInput(e.target.value)}
              wrapperClassName="flex-1 min-w-[15rem]"
              error={erreur ?? undefined}
            />
            <Button type="submit" variant="secondary" size="sm" className="shrink-0">
              <GitBranch className="size-4" />
              Lier le dépôt
            </Button>
          </form>
        )}
      </div>
    </Block>
  );
}

function KanbanBoardComponent({ projet, mien }: { projet: Project; mien: boolean }) {
  const {
    students,
    toggleChecklistItem,
    toggleChecklistBlocked,
    moveChecklistItemColumn,
    assignChecklistItem,
    addKanbanColumn,
    deleteKanbanColumn,
  } = useSoa();

  const items = projet.checklist ?? [];
  const colonnes = projet.colonnesKanban ?? DEFAULT_KANBAN_COLUMNS;
  const principales = items.filter((e) => !e.parentId);
  const [nouvelleColTitre, setNouvelleColTitre] = useState("");
  const [ajoutColOuvert, setAjoutColOuvert] = useState(false);
  const [sousTacheDe, setSousTacheDe] = useState<string | null>(null);

  const membresIds = Array.from(new Set([projet.ownerId, ...(projet.membres ?? [])]));
  const membresEtudiants = membresIds
    .map((id) => students.find((s) => s.id === id) ?? studentById(id))
    .filter((s): s is NonNullable<typeof s> => s != null);

  function handleDrop(columnId: string, e: React.DragEvent) {
    e.preventDefault();
    const itemId = e.dataTransfer.getData("text/plain");
    if (itemId) {
      moveChecklistItemColumn(projet.id, itemId, columnId);
    }
  }

  function ajouterColonne(e: FormEvent) {
    e.preventDefault();
    if (nouvelleColTitre.trim()) {
      addKanbanColumn(projet.id, nouvelleColTitre.trim());
      setNouvelleColTitre("");
      setAjoutColOuvert(false);
    }
  }

  const total = items.length;
  const faites = items.filter((e) => e.fait).length;

  return (
    <Block
      titre="Tableau des tâches (Kanban)"
      action={
        mien && (
          <Button variant="secondary" size="sm" onClick={() => setAjoutColOuvert(!ajoutColOuvert)}>
            <Icon name="plus" size={14} aria-hidden />
            Nouvelle colonne
          </Button>
        )
      }
    >
      {total > 0 && (
        <Progress
          valeur={Math.round((faites / total) * 100)}
          libelle={`${faites}/${total} étapes accomplies`}
          origine="Glisser-déposer un ticket ou cocher une étape met à jour l'avancement."
        />
      )}

      {ajoutColOuvert && (
        <form onSubmit={ajouterColonne} className="mt-3 flex items-end gap-2 rounded-card border border-border bg-card p-3">
          <Input
            label="Nom de la nouvelle colonne"
            value={nouvelleColTitre}
            onChange={(e) => setNouvelleColTitre(e.target.value)}
            wrapperClassName="flex-1"
          />
          <Button type="submit" variant="primary" size="sm">Créer colonne</Button>
        </form>
      )}

      {/* Colonnes Kanban avec HTML5 Drag & Drop */}
      <div className="mt-4 flex gap-4 overflow-x-auto pb-4">
        {colonnes.map((col) => {
          const ticketsColonne = principales.filter((item) => {
            if (item.colonneId) return item.colonneId === col.id;
            if (col.id === "termine") return item.fait;
            if (col.id === "en_cours") return !item.fait && item.bloque;
            if (col.id === "a_faire") return !item.fait && !item.bloque;
            return false;
          });

          const estDefaut = DEFAULT_KANBAN_COLUMNS.some((d) => d.id === col.id);

          return (
            <div
              key={col.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(col.id, e)}
              className="flex w-72 shrink-0 flex-col rounded-card border border-border bg-surface p-3 transition-colors duration-150 min-h-[16rem]"
            >
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-border/80">
                <div className="flex items-center gap-2 font-heading text-body text-ink">
                  <span className="font-semibold">{col.titre}</span>
                  <span className="rounded-full bg-card border border-border px-2 py-0.5 text-caption tabular-nums text-ink-muted">
                    {ticketsColonne.length}
                  </span>
                </div>
                {mien && !estDefaut && (
                  <button
                    type="button"
                    onClick={() => deleteKanbanColumn(projet.id, col.id)}
                    className="text-ink-muted hover:text-destructive"
                    title="Supprimer cette colonne"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Tickets dans la colonne */}
              <div className="flex flex-col gap-3 flex-1">
                {ticketsColonne.map((tache) => {
                  const sousTaches = items.filter((e) => e.parentId === tache.id);
                  const sousTachesSomme = sousTaches.reduce((sum, s) => sum + (s.dureeHeures ?? 0), 0);
                  const assigne = tache.assigneA ? (students.find((s) => s.id === tache.assigneA) ?? studentById(tache.assigneA)) : undefined;

                  return (
                    <div
                      key={tache.id}
                      draggable={mien}
                      onDragStart={(e) => e.dataTransfer.setData("text/plain", tache.id)}
                      className={cn(
                        "flex flex-col gap-2 rounded-card border bg-card p-3 text-caption shadow-sm transition-shadow",
                        mien ? "cursor-grab active:cursor-grabbing" : "",
                        tache.fait ? "border-success/30 bg-success/5" : tache.bloque ? "border-destructive/40 bg-destructive/5" : "border-border hover:border-border-strong",
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          checked={tache.fait}
                          disabled={!mien}
                          onChange={() => mien && toggleChecklistItem(projet.id, tache.id)}
                          className="mt-0.5 size-4 shrink-0 accent-primary"
                        />
                        <div className="min-w-0 flex-1">
                          <p className={cn("font-medium text-ink", tache.fait && "line-through text-ink-muted")}>
                            {tache.libelle}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[0.6875rem] text-ink-muted">
                            {tache.dureeHeures != null && (
                              <span className="rounded bg-surface px-1.5 py-0.5 border border-border font-mono">
                                ≈{tache.dureeHeures}h
                              </span>
                            )}
                            {sousTaches.length > 0 && (
                              <span className="rounded bg-surface px-1.5 py-0.5 border border-border">
                                {sousTaches.filter((s) => s.fait).length}/{sousTaches.length} sous-tâches ({sousTachesSomme}h)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Membre assigné */}
                      <div className="flex items-center justify-between pt-1 border-t border-border/40">
                        {mien ? (
                          <select
                            value={tache.assigneA ?? ""}
                            onChange={(e) => assignChecklistItem(projet.id, tache.id, e.target.value || undefined)}
                            className="text-[0.6875rem] bg-transparent text-ink-muted border-none p-0 focus:ring-0 cursor-pointer"
                          >
                            <option value="">Non assigné</option>
                            {membresEtudiants.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.nom}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-[0.6875rem] text-ink-muted">
                            {assigne ? `Assigné à ${assigne.nom}` : "Non assigné"}
                          </span>
                        )}

                        {!tache.fait && mien && (
                          <button
                            type="button"
                            onClick={() => toggleChecklistBlocked(projet.id, tache.id)}
                            className={cn(
                              "text-[0.6875rem] font-medium transition-colors",
                              tache.bloque ? "text-destructive" : "text-ink-muted hover:text-ink",
                            )}
                          >
                            {tache.bloque ? "Bloquée" : "Bloquer ?"}
                          </button>
                        )}
                      </div>

                      {/* Sous-tâches de ce ticket */}
                      {sousTaches.length > 0 && (
                        <div className="mt-1 flex flex-col gap-1 border-l-2 border-primary/20 pl-2">
                          {sousTaches.map((sous) => (
                            <div key={sous.id} className="flex items-center justify-between text-[0.6875rem]">
                              <label className="flex items-center gap-1.5 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={sous.fait}
                                  disabled={!mien}
                                  onChange={() => mien && toggleChecklistItem(projet.id, sous.id)}
                                  className="size-3 accent-primary"
                                />
                                <span className={cn(sous.fait && "line-through text-ink-muted", sous.bloque && "text-destructive")}>
                                  {sous.libelle}
                                </span>
                              </label>
                              {sous.dureeHeures != null && (
                                <span className="text-ink-muted font-mono shrink-0">≈{sous.dureeHeures}h</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Bouton d'ajout de sous-tâche */}
                      {mien && (
                        <div className="pt-1">
                          {sousTacheDe === tache.id ? (
                            <AjoutEtape
                              projectId={projet.id}
                              parentId={tache.id}
                              parentDuree={tache.dureeHeures}
                              sousTachesSomme={sousTachesSomme}
                              onAjoute={() => setSousTacheDe(null)}
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSousTacheDe(tache.id)}
                              className="text-[0.6875rem] font-medium text-primary hover:underline"
                            >
                              + Ajouter sous-tâche
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {ticketsColonne.length === 0 && (
                  <div className="flex flex-1 items-center justify-center rounded border border-dashed border-border/60 p-4 text-[0.6875rem] text-ink-muted">
                    Glisser un ticket ici
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {mien && (
        <div className="mt-4">
          <AjoutEtape projectId={projet.id} />
        </div>
      )}
    </Block>
  );
}

/* ── M2 + M5 — Détail d'un projet ───────────────────────────────────────── */

export function ProjectScreen({
  id,
  navigate,
}: {
  id: string;
  navigate: (to: Route) => void;
}) {
  const {
    me,
    projects,
    opportunities,
    journalFor,
    progressOf,
    setProjectStatus,
    reviveProject,
    toggleChecklistItem,
    toggleChecklistBlocked,
  } = useSoa();
  const projet = projects.find((p) => p.id === id);
  const [raison, setRaison] = useState("");
  const [arret, setArret] = useState(false);
  /** Tâche de premier niveau pour laquelle le formulaire de sous-tâche est ouvert. */
  const [sousTacheDe, setSousTacheDe] = useState<string | null>(null);

  // Page dédiée à ce projet : le résumé réel est toujours demandé (`actif`),
  // contrairement à `ResumeButton` sur les cartes de liste.
  const { resume, resumeSource } = useResumeProjet(projet, true);

  if (!projet) {
    return (
      <Screen>
        <EmptyState
          title="Ce projet n'existe pas"
          body="Le lien est peut-être périmé, ou le projet a été supprimé."
          action={
            <Button variant="secondary" onClick={() => navigate({ name: "projets" })}>
              Retour aux projets
            </Button>
          }
        />
      </Screen>
    );
  }

  const entrees = journalFor(projet.id);
  const auteur = studentById(projet.ownerId);
  const mien = projet.ownerId === me.id;
  const jours = joursDepuis(projet.derniereActivite);
  // M13 — l'appel à projet qui a motivé ce projet Personnel, s'il en a un.
  const appel = projet.opportuniteId
    ? opportunities.find((o) => o.id === projet.opportuniteId)
    : undefined;
  const appelEntreprise = appel && COMPANIES.find((e) => e.id === appel.companyId);
  const appelAuteur = appel?.studentId ? studentById(appel.studentId) : undefined;

  return (
    <Screen>
      <ScreenHead
        eyebrow={projet.type}
        titre={projet.nom}
        lede={projet.description}
        retour={{ name: "projets" }}
        onRetour={navigate}
        actions={
          mien ? (
            <>
              <Button
                variant="primary"
                onClick={() => navigate({ name: "projet-journal", id: projet.id })}
              >
                <Icon name="plus" size={16} aria-hidden />
                Écrire au journal
              </Button>
            </>
          ) : (
            projet.status === "Abandonné" && (
              <Button
                variant="primary"
                onClick={() => {
                  reviveProject(projet.id);
                  navigate({ name: "projet-journal", id: projet.id });
                }}
              >
                Reprendre ce projet
              </Button>
            )
          )
        }
      />

      <ChipRow className="mt-5">
        <Chip tone={tonStatut(projet.status)}>{projet.status}</Chip>
        <Chip>{projet.difficulte}</Chip>
        {projet.technos.map((t) => (
          <Chip key={t}>{t}</Chip>
        ))}
      </ChipRow>

      {/* M13 — la source de motivation, quand ce projet Personnel répond à un
          appel déjà publié sur la plateforme. */}
      {appel && (
        <a
          href={hrefFor({ name: "opportunites" })}
          onClick={(e) => {
            e.preventDefault();
            navigate({ name: "opportunites" });
          }}
          className="mt-5 flex items-center gap-3 rounded-card border border-border bg-surface p-4 transition-colors duration-150 hover:border-border-strong"
        >
          <Icon name="sparkle" size={16} aria-hidden className="shrink-0 text-primary" />
          <span className="min-w-0 flex-1">
            <span className="block text-caption text-ink-muted">Motivé par l'appel à projet</span>
            <span className="block truncate text-body font-medium text-ink">
              {appel.titre} — {appelEntreprise?.nom ?? appelAuteur?.nom ?? "Émetteur inconnu"}
            </span>
          </span>
          <Icon name="arrowRight" size={16} aria-hidden className="shrink-0 text-ink-muted" />
        </a>
      )}

      {projet.raisonAbandon && (
        <div className="mt-6 rounded-card border border-border bg-surface p-5">
          <p className="label-eyebrow">Raison de l'arrêt</p>
          <p className="mt-2 text-body text-ink">{projet.raisonAbandon}</p>
          <p className="mt-3 text-caption text-ink-muted">
            Cette phrase reste attachée au projet. C'est ce qui permet à quelqu'un
            d'autre de savoir où il met les pieds.
          </p>
        </div>
      )}

      {/*
       * Les étapes ("post-it"), définies à la création ou ajoutées ensuite —
       * tâches et, sous chacune, ses sous-tâches (un seul niveau).
       *
       * Sa jauge ci-dessous (« X/Y étapes cochées ») **est** l'avancement
       * affiché dans « Repères » plus bas dès qu'une checklist existe (voir
       * `progressOf`) : les deux chiffres sont volontairement identiques,
       * pour ne plus jamais montrer un projet à 100 % de tâches cochées
       * afficher un avancement qui dit autre chose.
       */}
      <EquipeProjetComponent projet={projet} mien={mien} />
      <KanbanBoardComponent projet={projet} mien={mien} />
      <GitHubDepotComponent projet={projet} mien={mien} />

      {/* M5 — le résumé. Le contrat de sortie est celui du cadrage. */}
      {resume && (
        <Block titre="Résumé">
          <ResumeContenu resume={resume} resumeSource={resumeSource} />
        </Block>
      )}

      <Block
        titre="Journal"
        action={
          <a
            href={hrefFor({ name: "projet-journal", id: projet.id })}
            onClick={(e) => {
              e.preventDefault();
              navigate({ name: "projet-journal", id: projet.id });
            }}
            className="rounded-sm text-caption font-medium text-primary underline-offset-4 hover:underline"
          >
            Tout voir ({entrees.length})
          </a>
        }
      >
        <div className="flex flex-col gap-3">
          {entrees.slice(0, 3).map((e) => {
            const Icone = ICONE_ENTREE[e.kind];
            return (
              <div
                key={e.id}
                className="flex gap-3 rounded-card border border-border bg-card p-4"
              >
                <Icone aria-hidden className="mt-0.5 shrink-0 text-ink-muted" />
                <div className="min-w-0">
                  <p className="text-caption text-ink-muted">
                    {e.kind} · il y a {joursDepuis(e.date)} j
                  </p>
                  <p className="mt-1 text-body font-medium text-ink">{e.titre}</p>
                </div>
              </div>
            );
          })}
          {entrees.length === 0 && (
            <div className="rounded-card border border-border bg-surface p-5">
              <p className="text-body text-ink">Le journal est vide.</p>
              <p className="mt-1 text-body text-ink-muted">
                C'est ce qui te manquera dans trois semaines, quand tu ne te
                souviendras plus pourquoi tu as fait ce choix-là.
              </p>
            </div>
          )}
        </div>
      </Block>

      <Block titre="Repères">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat valeur={`${progressOf(projet.id)}%`} libelle="Avancement" />
          <Stat valeur={entrees.length} libelle="Entrées de journal" />
          <Stat valeur={`${jours} j`} libelle="Dernière activité" />
          <Stat valeur={`${projet.dureeSemaines} sem.`} libelle="Durée visée" />
        </div>
      </Block>

      <Block titre="Aller plus loin">
        <div className="grid gap-3 sm:grid-cols-2">
          <CardLink
            href={hrefFor({ name: "projet-depot", id: projet.id })}
            onClick={() => navigate({ name: "projet-depot", id: projet.id })}
          >
            <div className="flex items-center gap-3">
              <GitBranch aria-hidden className="size-5 shrink-0 text-ink-muted" />
              <div>
                <p className="text-body font-medium text-ink">Dépôt Git</p>
                <p className="text-caption text-ink-muted">
                  {projet.depot ? projet.depot.slug : "Rattacher un dépôt public"}
                </p>
              </div>
            </div>
          </CardLink>

          <CardLink
            href={hrefFor({ name: "projet-presentation", id: projet.id })}
            onClick={() => navigate({ name: "projet-presentation", id: projet.id })}
          >
            <div className="flex items-center gap-3">
              <Presentation aria-hidden className="size-5 shrink-0 text-ink-muted" />
              <div>
                <p className="text-body font-medium text-ink">Présentation</p>
                <p className="text-caption text-ink-muted">
                  {presentationPrete(projet.presentation)
                    ? "Prête à partager"
                    : projet.presentation
                      ? "Brouillon à compléter"
                      : "Créer la présentation"}
                </p>
              </div>
            </div>
          </CardLink>
        </div>
      </Block>

      {/* Le statut reste modifiable quel qu'il soit — y compris depuis
          « Terminé » ou « Abandonné » : marquer par erreur, ou vouloir
          rouvrir un projet qu'on croyait clos, ne doit jamais nécessiter de
          contourner l'écran. */}
      {mien && (
        <Block titre="Changer l'état">
          <div className="rounded-card border border-border bg-card p-5">
            <div className="flex flex-wrap gap-2">
              {STATUTS.filter((s) => s !== projet.status && s !== "Abandonné").map((s) => (
                <Button
                  key={s}
                  variant="secondary"
                  size="sm"
                  onClick={() => setProjectStatus(projet.id, s)}
                >
                  {s}
                </Button>
              ))}
            </div>

            {/* `confirmation-dialogs` : arrêter un projet demande une raison.
                Ce n'est pas une friction gratuite — la raison est précisément
                ce qui rend le projet réutilisable (M15). */}
            <div className="mt-5 border-t border-border pt-5">
              {!arret ? (
                <Button variant="quiet" onClick={() => setArret(true)}>
                  Arrêter ce projet
                </Button>
              ) : (
                <div className="flex flex-col gap-3">
                  <Textarea
                    label="Pourquoi tu arrêtes"
                    rows={3}
                    value={raison}
                    onChange={(e) => setRaison(e.target.value)}
                    hint="Écris-le honnêtement. C'est ce que lira celui qui reprendra — et c'est ce qui lui fera gagner des semaines."
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="primary"
                      disabled={!raison.trim()}
                      onClick={() => {
                        setProjectStatus(projet.id, "Abandonné", raison.trim());
                        setArret(false);
                      }}
                    >
                      Confirmer l'arrêt
                    </Button>
                    <Button variant="ghost" onClick={() => setArret(false)}>
                      Annuler
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Block>
      )}

      {!mien && auteur && (
        <Block titre="Auteur">
          <CardLink
            href={hrefFor({ name: "profil", id: auteur.id })}
            onClick={() => navigate({ name: "profil", id: auteur.id })}
          >
            <div className="flex items-center gap-3">
              <Avatar initiales={auteur.initiales} nom={auteur.nom} />
              <div>
                <p className="text-body font-medium text-ink">{auteur.nom}</p>
                <p className="text-caption text-ink-muted">
                  {auteur.niveau} · {auteur.filiere} · promo {auteur.promo}
                </p>
              </div>
            </div>
          </CardLink>
        </Block>
      )}
    </Screen>
  );
}

/* ── M3 — Journal ───────────────────────────────────────────────────────── */

const NATURES: JournalKind[] = [
  "Décision",
  "Erreur",
  "Solution",
  "Architecture",
  "Apprentissage",
];

export function JournalScreen({
  id,
  navigate,
}: {
  id: string;
  navigate: (to: Route) => void;
}) {
  const { projects, journalFor, addJournalEntry } = useSoa();
  const projet = projects.find((p) => p.id === id);
  const [kind, setKind] = useState<JournalKind>("Décision");
  const [titre, setTitre] = useState("");
  const [corps, setCorps] = useState("");
  const [jalon, setJalon] = useState("");
  const [ecrit, setEcrit] = useState(false);

  if (!projet) {
    return (
      <Screen>
        <EmptyState title="Projet introuvable" body="Le lien est peut-être périmé." />
      </Screen>
    );
  }

  const entrees = journalFor(projet.id);

  function soumettre(event: FormEvent) {
    event.preventDefault();
    if (!titre.trim()) return;
    addJournalEntry({
      projectId: projet!.id,
      kind,
      titre: titre.trim(),
      corps: corps.trim(),
      jalon: jalon.trim() || undefined,
    });
    setTitre("");
    setCorps("");
    setJalon("");
    setEcrit(true);
  }

  return (
    <Screen>
      <ScreenHead
        eyebrow={projet.nom}
        titre="Journal"
        lede="Ce que tu écris ici est ce que tu reliras quand tu auras tout oublié — et ce que quelqu'un d'autre lira si tu arrêtes."
        retour={{ name: "projet", id: projet.id }}
        onRetour={navigate}
      />

      <form
        onSubmit={soumettre}
        className="mt-8 flex flex-col gap-6 rounded-card border border-border bg-card p-5 sm:p-6"
      >
        <fieldset className="flex flex-col gap-2">
          <legend className="label-eyebrow mb-2">Nature de l'entrée</legend>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Nature">
            {NATURES.map((n) => {
              const Icone = ICONE_ENTREE[n];
              const actif = n === kind;
              return (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={actif}
                  onClick={() => setKind(n)}
                  className={cn(
                    "inline-flex h-11 items-center gap-2 rounded-full border px-4 text-body transition-colors duration-150",
                    actif
                      ? "border-primary bg-primary-wash font-medium text-primary"
                      : "border-border text-ink-muted hover:border-border-strong hover:text-ink",
                  )}
                >
                  <Icone aria-hidden />
                  {n}
                </button>
              );
            })}
          </div>
        </fieldset>

        <Input
          label="En une phrase"
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          placeholder="La file de synchronisation renvoyait deux fois la même parcelle"
        />

        <Textarea
          label="Le détail"
          rows={4}
          value={corps}
          onChange={(e) => setCorps(e.target.value)}
          hint="Le pourquoi, pas le comment. Le code, tu le retrouveras dans le dépôt ; le raisonnement, non."
        />

        <Input
          label="Jalon (facultatif)"
          value={jalon}
          onChange={(e) => setJalon(e.target.value)}
          hint="Renseigne-le si cette entrée marque une étape franchie."
        />

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="primary" disabled={!titre.trim()}>
            Ajouter au journal
          </Button>
          {ecrit && (
            <span className="flex items-center gap-1.5 text-caption text-success">
              <Icon name="check" size={16} aria-hidden />
              Entrée ajoutée
            </span>
          )}
        </div>
      </form>

      <Block titre={`${entrees.length} entrée${entrees.length > 1 ? "s" : ""}`}>
        <motion.ol variants={sequence()} initial="hidden" animate="visible" className="relative">
          {entrees.map((e, index) => {
            const Icone = ICONE_ENTREE[e.kind];
            const dernier = index === entrees.length - 1;
            return (
              <motion.li key={e.id} variants={rise} className="relative flex gap-4 pb-6">
                {/* Le filet vertical relie les entrées : la timeline est
                    l'objet du module M3, pas une décoration. */}
                {!dernier && (
                  <span
                    aria-hidden
                    className="absolute top-10 left-[1.125rem] h-full w-px bg-border"
                  />
                )}
                <span
                  aria-hidden
                  className={cn(
                    "relative z-10 grid size-9 shrink-0 place-items-center rounded-full border",
                    e.jalon
                      ? "border-accent bg-accent text-on-accent"
                      : "border-border bg-card text-ink-muted",
                  )}
                >
                  <Icone />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-caption text-ink-muted">
                    {e.kind} · il y a {joursDepuis(e.date)} jour
                    {joursDepuis(e.date) > 1 ? "s" : ""}
                    {e.jalon && (
                      <>
                        {" · "}
                        <span className="font-medium text-on-accent">{e.jalon}</span>
                      </>
                    )}
                  </p>
                  <h3 className="mt-1 text-body font-semibold text-ink">{e.titre}</h3>
                  {e.corps && (
                    <p className="prose-measure mt-1 text-body text-ink-muted">{e.corps}</p>
                  )}
                </div>
              </motion.li>
            );
          })}
        </motion.ol>

        {entrees.length === 0 && (
          <EmptyState
            title="Rien d'écrit pour l'instant"
            body="La première entrée est la plus dure. Écris simplement la dernière décision que tu as prise, et pourquoi."
          />
        )}
      </Block>
    </Screen>
  );
}

/* ── M4 — Dépôt Git ─────────────────────────────────────────────────────── */

export function RepoScreen({
  id,
  navigate,
}: {
  id: string;
  navigate: (to: Route) => void;
}) {
  const { projects, me, attachRepo, syncRepo, detachRepo } = useSoa();
  const projet = projects.find((p) => p.id === id);
  const [edition, setEdition] = useState(false);
  const [url, setUrl] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");

  if (!projet) {
    return (
      <Screen>
        <EmptyState title="Projet introuvable" body="Le lien est peut-être périmé." />
      </Screen>
    );
  }

  const depot = projet.depot;
  const max = depot ? Math.max(1, ...depot.commitsParSemaine) : 1;
  const mien = projet.ownerId === me.id;

  async function rattacher(event: FormEvent) {
    event.preventDefault();
    setErreur("");
    setEnCours(true);
    try {
      await attachRepo(projet!.id, url.trim());
      setUrl("");
      setEdition(false);
    } catch (cause) {
      setErreur(cause instanceof Error ? cause.message : "Impossible de rattacher ce dépôt.");
    } finally {
      setEnCours(false);
    }
  }

  async function synchroniser() {
    setErreur("");
    setEnCours(true);
    try {
      await syncRepo(projet!.id);
    } catch (cause) {
      setErreur(cause instanceof Error ? cause.message : "La synchronisation a échoué.");
    } finally {
      setEnCours(false);
    }
  }

  async function detacher() {
    if (!window.confirm("Détacher ce dépôt du projet ? Le dépôt Git ne sera pas supprimé.")) return;
    setErreur("");
    setEnCours(true);
    try {
      await detachRepo(projet!.id);
    } catch (cause) {
      setErreur(cause instanceof Error ? cause.message : "Impossible de détacher ce dépôt.");
    } finally {
      setEnCours(false);
    }
  }

  return (
    <Screen>
      <ScreenHead
        eyebrow={projet.nom}
        titre="Dépôt"
        retour={{ name: "projet", id: projet.id }}
        onRetour={navigate}
      />

      {depot ? (
        <>
          <div className="mt-8 rounded-card border border-border bg-card p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <GitBranch aria-hidden className="size-5 shrink-0 text-ink-muted" />
                <div className="min-w-0">
                  <p className="truncate text-body font-semibold text-ink">{depot.slug}</p>
                  <p className="text-caption text-ink-muted">
                    {depot.hote}
                    {depot.brancheParDefaut ? ` · branche principale : ${depot.brancheParDefaut}` : ""}
                  </p>
                </div>
              </div>
              {depot.url && (
                <a
                  href={depot.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-caption font-medium text-primary underline-offset-4 hover:underline"
                >
                  Ouvrir le dépôt <ExternalLink aria-hidden className="size-3.5" />
                </a>
              )}
            </div>

            <ChipRow className="mt-4">
              {depot.branches.map((b) => (
                <Chip key={b} tone={b === "main" ? "primary" : "neutral"}>
                  {b}
                </Chip>
              ))}
            </ChipRow>
          </div>

          <Block titre="Fréquence de commits">
            <div className="rounded-card border border-border bg-card p-5 sm:p-6">
              <div
                className="flex h-24 items-end gap-1.5"
                role="img"
                aria-label={`Commits par semaine sur douze semaines : ${depot.commitsParSemaine.join(", ")}.`}
              >
                {depot.commitsParSemaine.map((c, i) => (
                  <div key={i} className="flex h-full flex-1 flex-col justify-end gap-1">
                    <div
                      className={cn(
                        "w-full rounded-sm",
                        c === 0 ? "bg-border" : "bg-primary-soft",
                      )}
                      style={{ height: c === 0 ? "3px" : `${(c / max) * 100}%` }}
                    />
                  </div>
                ))}
              </div>
                <p className="mt-4 text-caption text-ink-muted">
                Activité observée sur les douze dernières semaines.
              </p>
            </div>
          </Block>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {mien && (
              <>
                <Button variant="secondary" onClick={synchroniser} disabled={enCours}>
                  <RefreshCw aria-hidden className="size-4" />
                  {enCours ? "Synchronisation…" : "Actualiser"}
                </Button>
                <Button variant="ghost" onClick={() => setEdition((ouverte) => !ouverte)} disabled={enCours}>
                  Remplacer
                </Button>
                <Button variant="ghost" onClick={detacher} disabled={enCours} className="text-destructive hover:text-destructive">
                  <Trash2 aria-hidden className="size-4" />
                  Détacher
                </Button>
              </>
            )}
            {depot.synchroniseLe && (
              <p className="text-caption text-ink-muted">
                Dernière synchronisation : {new Date(depot.synchroniseLe).toLocaleString("fr-FR")}
              </p>
            )}
          </div>
        </>
      ) : (
        <div className="mt-8">
          <EmptyState
            title="Aucun dépôt rattaché"
            body={
              mien
                ? "Rattachez un dépôt public GitHub ou GitLab. Les branches et l'activité seront synchronisées immédiatement."
                : "Le propriétaire n'a pas encore rattaché de dépôt à ce projet."
            }
            action={
              mien ? (
                <Button variant="primary" onClick={() => setEdition(true)}>
                  Rattacher un dépôt
                </Button>
              ) : undefined
            }
          />
        </div>
      )}

      {edition && mien && (
        <form onSubmit={rattacher} className="mt-6 max-w-2xl rounded-card border border-border bg-card p-5 sm:p-6">
          <Input
            label="URL du dépôt public"
            type="url"
            inputMode="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://github.com/organisation/projet"
            hint="GitHub et GitLab publics sont pris en charge. Les dépôts privés nécessitent une autorisation GitHub/GitLab dédiée."
            error={erreur || undefined}
            required
          />
          <div className="mt-5 flex flex-wrap gap-3">
            <Button type="submit" variant="primary" disabled={enCours}>
              <GitBranch aria-hidden className="size-4" />
              {enCours ? "Connexion…" : "Rattacher et synchroniser"}
            </Button>
            <Button variant="ghost" onClick={() => { setEdition(false); setErreur(""); }} disabled={enCours}>
              Annuler
            </Button>
          </div>
        </form>
      )}

      {!edition && erreur && <p className="mt-5 text-caption text-destructive" role="alert">{erreur}</p>}
    </Screen>
  );
}

/* ── M17 — Présentation ─────────────────────────────────────────────────── */

export function ShowcaseScreen({
  id,
  navigate,
}: {
  id: string;
  navigate: (to: Route) => void;
}) {
  const {
    projects,
    me,
    saveShowcase,
    uploadShowcaseCapture,
    removeShowcaseCapture,
  } = useSoa();
  const projet = projects.find((p) => p.id === id);
  const [edition, setEdition] = useState(false);
  const [enregistrement, setEnregistrement] = useState(false);
  const [uploadEnCours, setUploadEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  const [form, setForm] = useState({
    architecture: projet?.presentation?.architecture ?? "",
    documentation: projet?.presentation?.documentation ?? "",
    videoUrl: projet?.presentation?.videoUrl ?? "",
    demoUrl: projet?.presentation?.demoUrl ?? "",
  });

  if (!projet) {
    return (
      <Screen>
        <EmptyState title="Projet introuvable" body="Le lien est peut-être périmé." />
      </Screen>
    );
  }

  const p = projet.presentation;
  const mien = projet.ownerId === me.id;
  const prete = presentationPrete(p);

  useEffect(() => {
    if (edition) return;
    setForm({
      architecture: projet.presentation?.architecture ?? "",
      documentation: projet.presentation?.documentation ?? "",
      videoUrl: projet.presentation?.videoUrl ?? "",
      demoUrl: projet.presentation?.demoUrl ?? "",
    });
  }, [edition, projet.presentation]);

  async function enregistrer(event: FormEvent) {
    event.preventDefault();
    setErreur("");
    setEnregistrement(true);
    try {
      await saveShowcase(projet!.id, {
        architecture: form.architecture.trim(),
        documentation: form.documentation.trim(),
        videoUrl: form.videoUrl.trim() || undefined,
        demoUrl: form.demoUrl.trim() || undefined,
        captures: p?.captures ?? [],
      });
      setEdition(false);
    } catch (cause) {
      setErreur(cause instanceof Error ? cause.message : "Impossible d'enregistrer la présentation.");
    } finally {
      setEnregistrement(false);
    }
  }

  async function ajouterCaptures(event: ChangeEvent<HTMLInputElement>) {
    const fichiers = [...(event.target.files ?? [])];
    event.target.value = "";
    if (fichiers.length === 0) return;
    setErreur("");
    setUploadEnCours(true);
    try {
      for (const fichier of fichiers) await uploadShowcaseCapture(projet!.id, fichier);
    } catch (cause) {
      setErreur(cause instanceof Error ? cause.message : "Impossible d'envoyer cette capture.");
    } finally {
      setUploadEnCours(false);
    }
  }

  async function retirerCapture(url: string) {
    setErreur("");
    setUploadEnCours(true);
    try {
      await removeShowcaseCapture(projet!.id, url);
    } catch (cause) {
      setErreur(cause instanceof Error ? cause.message : "Impossible de retirer cette capture.");
    } finally {
      setUploadEnCours(false);
    }
  }

  return (
    <Screen>
      <ScreenHead
        eyebrow={projet.nom}
        titre="Présentation"
        lede="Ce que verra un jury, une entreprise, ou un étudiant qui envisage de reprendre le projet."
        retour={{ name: "projet", id: projet.id }}
        onRetour={navigate}
        actions={
          mien && !edition && (
            <Button variant="primary" onClick={() => setEdition(true)}>
              {p ? "Modifier" : "Créer"}
            </Button>
          )
        }
      />

      {p && (
        <div className="mt-6 rounded-card border border-border bg-surface p-4 sm:flex sm:items-center sm:justify-between">
          <div>
            <p className="text-body font-medium text-ink">
              {prete ? "Présentation prête à partager" : "Présentation en brouillon"}
            </p>
            <p className="mt-1 text-caption text-ink-muted">
              {prete
                ? "Architecture, documentation et une preuve de démonstration sont présents."
                : "Ajoutez une architecture, une documentation et au moins une démo, vidéo ou capture."}
            </p>
          </div>
          <Chip tone={prete ? "success" : "neutral"} className="mt-3 sm:mt-0">
            {prete ? "Prête" : "À compléter"}
          </Chip>
        </div>
      )}

      {edition ? (
        <form onSubmit={enregistrer} className="mt-8 flex max-w-2xl flex-col gap-6">
          <Textarea
            label="Architecture"
            rows={4}
            value={form.architecture}
            onChange={(e) => setForm({ ...form, architecture: e.target.value })}
            hint="Les choix structurants et leur raison. C'est ce qu'un repreneur lira en premier."
          />
          <Textarea
            label="Documentation"
            rows={4}
            value={form.documentation}
            onChange={(e) => setForm({ ...form, documentation: e.target.value })}
            hint="Ce qu'il faut savoir pour faire tourner le projet, et ses limites connues."
          />
          <Input
            label="Vidéo de démonstration"
            type="url"
            inputMode="url"
            value={form.videoUrl}
            onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
            placeholder="https://…"
            hint="Un lien. L'envoi de fichier suppose un serveur, qui n'existe pas encore."
          />
          <Input
            label="Démonstration en ligne"
            type="url"
            inputMode="url"
            value={form.demoUrl}
            onChange={(e) => setForm({ ...form, demoUrl: e.target.value })}
            placeholder="https://…"
          />

          <section className="rounded-card border border-border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="label-eyebrow">Captures d'écran</p>
                <p className="mt-1 text-caption text-ink-muted">
                  JPEG, PNG ou WebP, 4 Mo maximum par image, jusqu'à huit captures.
                </p>
              </div>
              <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full border border-border bg-card px-5 text-body font-medium text-ink shadow-card transition hover:border-border-strong hover:shadow-lift">
                <Upload aria-hidden className="size-4" />
                {uploadEnCours ? "Envoi…" : "Ajouter"}
                <input
                  type="file"
                  className="sr-only"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  disabled={uploadEnCours || (p?.captures.length ?? 0) >= 8}
                  onChange={ajouterCaptures}
                />
              </label>
            </div>
            {(p?.captures.length ?? 0) > 0 && (
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {p!.captures.map((capture) => (
                  <li key={capture} className="group relative overflow-hidden rounded-sm border border-border bg-surface">
                    {captureEstImage(capture) ? (
                      <img src={capture} alt="Capture du projet" className="aspect-video w-full object-cover" />
                    ) : (
                      <p className="flex aspect-video items-end p-3 text-caption text-ink-muted">{capture}</p>
                    )}
                    <button
                      type="button"
                      onClick={() => void retirerCapture(capture)}
                      disabled={uploadEnCours}
                      className="absolute right-2 top-2 rounded-full bg-card/95 p-2 text-destructive shadow-card opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100"
                      aria-label="Retirer cette capture"
                    >
                      <Trash2 aria-hidden className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {erreur && <p className="text-caption text-destructive" role="alert">{erreur}</p>}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="primary" size="lg" disabled={enregistrement || uploadEnCours}>
              {enregistrement ? "Enregistrement…" : "Enregistrer le brouillon"}
            </Button>
            <Button variant="ghost" onClick={() => { setEdition(false); setErreur(""); }} disabled={enregistrement}>
              Annuler
            </Button>
          </div>
        </form>
      ) : p ? (
        <div className="mt-8 flex flex-col gap-6">
          <section className="rounded-card border border-border bg-card p-5 sm:p-6">
            <h2 className="font-heading text-heading text-ink">Architecture</h2>
            <p className="prose-measure mt-3 text-body text-ink-muted">{p.architecture}</p>
          </section>

          <section className="rounded-card border border-border bg-card p-5 sm:p-6">
            <h2 className="font-heading text-heading text-ink">Documentation</h2>
            <p className="prose-measure mt-3 text-body text-ink-muted">{p.documentation}</p>
          </section>

          {(p.videoUrl || p.demoUrl) && (
            <section className="rounded-card border border-border bg-card p-5 sm:p-6">
              <h2 className="font-heading text-heading text-ink">Liens</h2>
              <ul className="mt-3 flex flex-col gap-2">
                {p.videoUrl && (
                  <li>
                    <a
                      href={p.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 rounded-sm text-body text-primary underline-offset-4 hover:underline"
                    >
                      <Presentation aria-hidden className="size-4 shrink-0" />
                      Vidéo de démonstration
                    </a>
                  </li>
                )}
                {p.demoUrl && (
                  <li>
                    <a
                      href={p.demoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 rounded-sm text-body text-primary underline-offset-4 hover:underline"
                    >
                      <GitBranch aria-hidden className="size-4 shrink-0" />
                      Démonstration en ligne
                    </a>
                  </li>
                )}
              </ul>
            </section>
          )}

          <section className="rounded-card border border-border bg-card p-5 sm:p-6">
            <h2 className="font-heading text-heading text-ink">Captures</h2>
            {p.captures.length > 0 ? (
              <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                {p.captures.map((capture) => (
                  <li key={capture} className="overflow-hidden rounded-sm border border-border bg-surface">
                    {captureEstImage(capture) ? (
                      <img src={capture} alt={`Capture du projet ${projet.nom}`} className="aspect-video w-full object-cover" />
                    ) : (
                      <p className="flex aspect-video items-end p-3 text-caption text-ink-muted">{capture}</p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-body text-ink-muted">Aucune capture ajoutée pour le moment.</p>
            )}
          </section>
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState
            title="Présentation à compléter"
            body="Décrivez l'architecture, donnez les instructions essentielles et ajoutez une démo, une vidéo ou des captures. Le brouillon sera conservé à chaque enregistrement."
            action={
              mien ? <Button variant="secondary" onClick={() => setEdition(true)}>
                Commencer
              </Button> : undefined
            }
          />
        </div>
      )}
    </Screen>
  );
}
