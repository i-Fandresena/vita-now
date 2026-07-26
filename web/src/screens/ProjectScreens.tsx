import { motion } from "framer-motion";
import {
  AlertTriangle,
  BookOpen,
  Check,
  GitBranch,
  Lightbulb,
  Plus,
  Presentation,
  Wrench,
} from "lucide-react";
import { useState, type ComponentType, type FormEvent } from "react";

import { hrefFor, type Route } from "@/app/router";
import { useSoa, type NewProject } from "@/app/soa-store";
import { studentById } from "@/data/soa-corpus";
import {
  joursDepuis,
  type Difficulte,
  type JournalKind,
  type Project,
  type ProjectStatus,
  type ProjectType,
} from "@/domain/soa";
import { cn } from "@/lib/cn";
import { rise, sequence } from "@/lib/motion";
import { Button } from "@/ui/Button";
import { Chip, ChipRow } from "@/ui/Editorial";
import { Input, Textarea } from "@/ui/Field";
import { Avatar, DefRow, Progress, Stat } from "@/ui/data";
import { Block, CardLink, Screen, ScreenHead, Tabs } from "@/ui/layout";
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

/** Le statut colore la pastille — mais le mot reste, `color-not-only`. */
function tonStatut(s: ProjectStatus) {
  if (s === "Terminé") return "success" as const;
  if (s === "En cours") return "primary" as const;
  if (s === "Abandonné") return "neutral" as const;
  return "neutral" as const;
}

const ICONE_ENTREE: Record<JournalKind, ComponentType<{ className?: string }>> = {
  Décision: Lightbulb,
  Erreur: AlertTriangle,
  Solution: Check,
  Architecture: Wrench,
  Apprentissage: BookOpen,
};

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
          <Chip tone={tonStatut(projet.status)}>{projet.status}</Chip>
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

export function ProjectsScreen({ navigate }: { navigate: (to: Route) => void }) {
  const { myProjects } = useSoa();
  const [filtre, setFiltre] = useState<(typeof FILTRES)[number]>("Tous");

  const visibles =
    filtre === "Tous" ? myProjects : myProjects.filter((p) => p.status === filtre);

  return (
    <Screen>
      <ScreenHead
        titre="Mes projets"
        lede="Un projet arrêté n'est pas un échec : c'est une impasse documentée, et elle vaut pour le suivant."
        actions={
          <Button variant="primary" onClick={() => navigate({ name: "projet-nouveau" })}>
            <Plus aria-hidden className="size-4" />
            Nouveau
          </Button>
        }
      />

      <Tabs valeurs={FILTRES} actif={filtre} onChange={setFiltre} className="mt-6" />

      <div className="mt-6 flex flex-col gap-3">
        {visibles.length > 0 ? (
          visibles.map((p) => <ProjectRow key={p.id} projet={p} navigate={navigate} />)
        ) : (
          <EmptyState
            title={`Aucun projet « ${filtre} »`}
            body="Change de filtre, ou commence quelque chose. Un projet d'une semaine qui aboutit vaut mieux qu'un projet de six mois qui s'arrête au troisième jour."
            action={
              <Button variant="secondary" onClick={() => navigate({ name: "projet-nouveau" })}>
                Créer un projet
              </Button>
            }
          />
        )}
      </div>
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
  const { createProject } = useSoa();
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
  const [erreur, setErreur] = useState<string | null>(null);

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
    const projet = createProject({
      ...form,
      technos: technosBrut
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
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
          onChange={(type) => setForm({ ...form, type })}
        />

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

/* ── M2 + M5 — Détail d'un projet ───────────────────────────────────────── */

export function ProjectScreen({
  id,
  navigate,
}: {
  id: string;
  navigate: (to: Route) => void;
}) {
  const { projects, journalFor, progressOf, summaryFor, setProjectStatus, reviveProject } =
    useSoa();
  const projet = projects.find((p) => p.id === id);
  const [raison, setRaison] = useState("");
  const [arret, setArret] = useState(false);

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
  const resume = summaryFor(projet.id);
  const auteur = studentById(projet.ownerId);
  const mien = projet.ownerId === "s-soa";
  const jours = joursDepuis(projet.derniereActivite);

  const tonRisque =
    resume?.risqueAbandon === "Élevé"
      ? "text-destructive"
      : resume?.risqueAbandon === "Modéré"
        ? "text-ink"
        : "text-success";

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
                <Plus aria-hidden className="size-4" />
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

      {/* M5 — le résumé. Le contrat de sortie est celui du cadrage. */}
      {resume && (
        <Block titre="Résumé">
          <div className="rounded-card border border-border bg-card p-5 sm:p-6">
            <dl>
              <DefRow terme="Objectif">{resume.objectif}</DefRow>
              <DefRow terme="Ce qui est fait">
                {resume.faitCeQui.length > 0 ? (
                  <ul className="flex flex-col gap-1">
                    {resume.faitCeQui.map((f) => (
                      <li key={f} className="flex gap-2">
                        <Check aria-hidden className="mt-1 size-3.5 shrink-0 text-success" />
                        {f}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-ink-muted">Rien d'écrit dans le journal.</span>
                )}
              </DefRow>
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
                <span className={cn("font-semibold", tonRisque)}>
                  {resume.risqueAbandon}
                </span>
                <span className="mt-1 block text-caption text-ink-muted">
                  {resume.pourquoi}
                </span>
              </DefRow>
            </dl>
            <p className="mt-4 border-t border-border pt-4 text-caption text-ink-muted">
              Ce résumé est déduit du journal du projet. Il ne devine rien : ce qui
              n'est pas écrit n'y figure pas.
            </p>
          </div>
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
                <Icone aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-muted" />
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
                  {projet.depot ? projet.depot.slug : "Aucun dépôt rattaché"}
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
                  {projet.presentation ? "Prête" : "À compléter"}
                </p>
              </div>
            </div>
          </CardLink>
        </div>
      </Block>

      {mien && projet.status !== "Terminé" && projet.status !== "Abandonné" && (
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
                  <Icone aria-hidden className="size-4" />
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
              <Check aria-hidden className="size-4" />
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
                  <Icone className="size-4" />
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
  const { projects } = useSoa();
  const projet = projects.find((p) => p.id === id);

  if (!projet) {
    return (
      <Screen>
        <EmptyState title="Projet introuvable" body="Le lien est peut-être périmé." />
      </Screen>
    );
  }

  const depot = projet.depot;
  const max = depot ? Math.max(1, ...depot.commitsParSemaine) : 1;

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
            <div className="flex items-center gap-3">
              <GitBranch aria-hidden className="size-5 shrink-0 text-ink-muted" />
              <div className="min-w-0">
                <p className="text-body font-semibold text-ink">{depot.slug}</p>
                <p className="text-caption text-ink-muted">{depot.hote}</p>
              </div>
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
                Douze semaines. Les deux dernières colonnes sont plates — c'est
                exactement la période où le projet s'est arrêté.
              </p>
            </div>
          </Block>
        </>
      ) : (
        <div className="mt-8">
          <EmptyState
            title="Aucun dépôt rattaché"
            body="La synchronisation GitHub/GitLab est prévue au cadrage (M4) mais n'est pas encore développée. Cet écran affiche des données de démonstration quand un dépôt est rattaché."
          />
        </div>
      )}

      <p className="mt-8 rounded-card border border-border bg-surface p-4 text-caption text-ink-muted">
        Intégration non fonctionnelle : aucune requête n'est envoyée à GitHub.
        Les données ci-dessus viennent du corpus de démonstration.
      </p>
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
  const { projects } = useSoa();
  const projet = projects.find((p) => p.id === id);

  if (!projet) {
    return (
      <Screen>
        <EmptyState title="Projet introuvable" body="Le lien est peut-être périmé." />
      </Screen>
    );
  }

  const p = projet.presentation;

  return (
    <Screen>
      <ScreenHead
        eyebrow={projet.nom}
        titre="Présentation"
        lede="Ce que verra un jury, une entreprise, ou un étudiant qui envisage de reprendre le projet."
        retour={{ name: "projet", id: projet.id }}
        onRetour={navigate}
      />

      {p ? (
        <div className="mt-8 flex flex-col gap-6">
          <section className="rounded-card border border-border bg-card p-5 sm:p-6">
            <h2 className="font-heading text-heading text-ink">Architecture</h2>
            <p className="prose-measure mt-3 text-body text-ink-muted">{p.architecture}</p>
          </section>

          <section className="rounded-card border border-border bg-card p-5 sm:p-6">
            <h2 className="font-heading text-heading text-ink">Documentation</h2>
            <p className="prose-measure mt-3 text-body text-ink-muted">{p.documentation}</p>
          </section>

          <section className="rounded-card border border-border bg-card p-5 sm:p-6">
            <h2 className="font-heading text-heading text-ink">Captures</h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {p.captures.map((c) => (
                <li
                  key={c}
                  className="flex aspect-video items-end rounded-sm border border-border bg-surface p-3"
                >
                  <span className="text-caption text-ink-muted">{c}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-caption text-ink-muted">
              Emplacements réservés : l'envoi d'images n'est pas développé.
            </p>
          </section>
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState
            title="Présentation à compléter"
            body="Un projet livré sans présentation reste invisible — c'est le second échec décrit par la lettre. Architecture, documentation, captures : trois blocs suffisent."
            action={
              <Button
                variant="secondary"
                onClick={() => navigate({ name: "projet-journal", id: projet.id })}
              >
                Partir du journal
              </Button>
            }
          />
        </div>
      )}
    </Screen>
  );
}
