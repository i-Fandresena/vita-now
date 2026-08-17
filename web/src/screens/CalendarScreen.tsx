import { useMemo, useState, type FormEvent } from "react";

import type { Route } from "@/app/router";
import { useSoa } from "@/app/soa-store";
import type { EvenementType } from "@/domain/soa";
import { cn } from "@/lib/cn";
import { Button } from "@/ui/Button";
import { Dialog } from "@/ui/Dialog";
import { Input } from "@/ui/Field";
import { Icon } from "@/ui/Icon";
import { EmptyState } from "@/ui/states";
import { Block, Screen, ScreenHead } from "@/ui/layout";

/**
 * CalendarScreen — calendrier personnel (hors cadrage, addition demandée
 * par l'utilisateur).
 *
 * Grille en JS pur : 42 cases (6 semaines LUN→DIM) couvrant toujours le mois
 * affiché en entier, complétées par les jours des mois voisins pour ne
 * jamais afficher de case vide. Pas de bibliothèque de calendrier — c'est de
 * l'arithmétique de dates, le projet n'en a jamais eu besoin ailleurs.
 */

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const TYPES: readonly EvenementType[] = ["Réunion", "Deadline", "Session", "Autre"];

/** Mêmes tokens que partout ailleurs (DESIGN.md) — aucune nouvelle couleur. */
const STYLE_TYPE: Record<EvenementType, { puce: string; texte: string }> = {
  Réunion: { puce: "bg-primary", texte: "text-primary" },
  Deadline: { puce: "bg-destructive", texte: "text-destructive" },
  Session: { puce: "bg-success", texte: "text-success" },
  Autre: { puce: "bg-accent", texte: "text-on-accent" },
};

function local(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function ChoixType({
  valeur,
  onChange,
}: {
  valeur: EvenementType;
  onChange: (v: EvenementType) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="label-eyebrow mb-2">Type</legend>
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Type">
        {TYPES.map((t) => {
          const actif = t === valeur;
          return (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={actif}
              onClick={() => onChange(t)}
              className={cn(
                "h-11 rounded-full border px-4 text-body transition-colors duration-150",
                actif
                  ? "border-primary bg-primary-wash font-medium text-primary"
                  : "border-border text-ink-muted hover:border-border-strong hover:text-ink",
              )}
            >
              {t}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function CalendarScreen({ navigate }: { navigate: (to: Route) => void }) {
  const { events, myProjects, createEvent, deleteEvent } = useSoa();
  const [moisAffiche, setMoisAffiche] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [ouvert, setOuvert] = useState(false);

  const annee = moisAffiche.getFullYear();
  const mois = moisAffiche.getMonth();

  const grille = useMemo(() => {
    const premier = new Date(annee, mois, 1);
    // Lundi = 0 plutôt que le dimanche par défaut de `getDay()`.
    const decalage = (premier.getDay() + 6) % 7;
    const debut = new Date(annee, mois, 1 - decalage);
    return Array.from({ length: 42 }, (_, i) => {
      const jour = new Date(debut.getFullYear(), debut.getMonth(), debut.getDate() + i);
      return { date: jour, cle: local(jour), horsMois: jour.getMonth() !== mois };
    });
  }, [annee, mois]);

  const parJour = useMemo(() => {
    const carte = new Map<string, typeof events>();
    for (const e of events) {
      const liste = carte.get(e.date) ?? [];
      liste.push(e);
      carte.set(e.date, liste);
    }
    return carte;
  }, [events]);

  const evenementsMois = events.filter((e) => {
    const [a, m] = e.date.split("-").map(Number);
    return a === annee && m === mois + 1;
  });
  const deadlinesMois = evenementsMois.filter((e) => e.type === "Deadline").length;

  const aujourdhui = local(new Date());
  const aVenir = [...events]
    .filter((e) => e.date >= aujourdhui)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.heure ?? "").localeCompare(b.heure ?? ""))
    .slice(0, 8);

  function changerMois(delta: number) {
    setMoisAffiche(new Date(annee, mois + delta, 1));
  }

  return (
    <Screen>
      <ScreenHead
        eyebrow="Calendrier"
        titre="Mes événements."
        lede={`${evenementsMois.length} événement${evenementsMois.length > 1 ? "s" : ""} ce mois — ${deadlinesMois} deadline${deadlinesMois > 1 ? "s" : ""} critique${deadlinesMois > 1 ? "s" : ""}`}
        retour={{ name: "tableau" }}
        onRetour={navigate}
        actions={
          <Button variant="primary" onClick={() => setOuvert(true)}>
            <Icon name="plus" size={16} aria-hidden />
            Événement
          </Button>
        }
      />

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-heading text-ink">
              {MOIS[mois]} {annee}
            </h2>
            <div className="flex gap-2">
              <Button variant="secondary" size="icon" aria-label="Mois précédent" onClick={() => changerMois(-1)}>
                <Icon name="back" size={16} aria-hidden />
              </Button>
              <Button variant="secondary" size="icon" aria-label="Mois suivant" onClick={() => changerMois(1)}>
                <Icon name="arrowRight" size={16} aria-hidden />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-px overflow-hidden rounded-card border border-border bg-border text-caption">
            {JOURS.map((j) => (
              <div key={j} className="bg-surface p-2 text-center font-medium text-ink-muted">
                {j}
              </div>
            ))}
            {grille.map(({ date, cle, horsMois }) => {
              const jourEvenements = parJour.get(cle) ?? [];
              const estAujourdhui = cle === aujourdhui;
              return (
                <div
                  key={cle}
                  className={cn(
                    "flex min-h-[5.5rem] flex-col gap-1 bg-card p-1.5",
                    horsMois && "bg-surface/40",
                  )}
                >
                  <span
                    className={cn(
                      "self-start rounded-full px-1.5 text-caption",
                      estAujourdhui
                        ? "bg-primary font-medium text-on-primary"
                        : horsMois
                          ? "text-ink-muted/50"
                          : "text-ink-muted",
                    )}
                  >
                    {date.getDate()}
                  </span>
                  <div className="flex flex-col gap-1">
                    {jourEvenements.slice(0, 3).map((e) => (
                      <span
                        key={e.id}
                        title={e.titre}
                        className={cn(
                          "truncate rounded-xs px-1 py-0.5 text-[0.65rem] leading-tight text-on-primary",
                          STYLE_TYPE[e.type].puce,
                        )}
                      >
                        {e.titre}
                      </span>
                    ))}
                    {jourEvenements.length > 3 && (
                      <span className="text-[0.65rem] text-ink-muted">
                        +{jourEvenements.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <Block titre="À venir" className="mt-0">
          {aVenir.length === 0 ? (
            <EmptyState
              title="Rien de prévu"
              body="Ajoute un événement pour qu'il apparaisse ici et dans la grille."
              action={
                <Button variant="secondary" onClick={() => setOuvert(true)}>
                  <Icon name="plus" size={16} aria-hidden />
                  Événement
                </Button>
              }
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {aVenir.map((e) => {
                const projet = e.projectId ? myProjects.find((p) => p.id === e.projectId) : undefined;
                return (
                  <li
                    key={e.id}
                    className="flex items-start gap-3 rounded-card border border-border bg-card p-3"
                  >
                    <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", STYLE_TYPE[e.type].puce)} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body font-medium text-ink">{e.titre}</p>
                      <p className="text-caption text-ink-muted">
                        {new Date(`${e.date}T00:00:00`).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                        })}
                        {e.heure ? ` · ${e.heure}` : " · Toute la journée"}
                        {projet ? ` · ${projet.nom}` : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteEvent(e.id)}
                      aria-label={`Supprimer « ${e.titre} »`}
                      className="shrink-0 rounded-xs p-1 text-ink-muted transition-colors duration-150 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      ✕
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Block>
      </div>

      <NouvelEvenementDialog
        ouvert={ouvert}
        onOpenChange={setOuvert}
        onCreer={createEvent}
        projets={myProjects}
      />
    </Screen>
  );
}

function NouvelEvenementDialog({
  ouvert,
  onOpenChange,
  onCreer,
  projets,
}: {
  ouvert: boolean;
  onOpenChange: (v: boolean) => void;
  onCreer: (draft: {
    titre: string;
    date: string;
    heure?: string;
    type: EvenementType;
    projectId?: string;
  }) => void;
  projets: { id: string; nom: string }[];
}) {
  const [titre, setTitre] = useState("");
  const [date, setDate] = useState(() => local(new Date()));
  const [touteLaJournee, setTouteLaJournee] = useState(true);
  const [heure, setHeure] = useState("09:00");
  const [type, setType] = useState<EvenementType>("Réunion");
  const [projectId, setProjectId] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  function reinitialiser() {
    setTitre("");
    setDate(local(new Date()));
    setTouteLaJournee(true);
    setHeure("09:00");
    setType("Réunion");
    setProjectId("");
    setErreur(null);
  }

  function soumettre(event: FormEvent) {
    event.preventDefault();
    if (!titre.trim()) {
      setErreur("Un événement a besoin d'un titre.");
      return;
    }
    if (!date) {
      setErreur("Choisis une date.");
      return;
    }
    onCreer({
      titre: titre.trim(),
      date,
      heure: touteLaJournee ? undefined : heure,
      type,
      projectId: projectId || undefined,
    });
    reinitialiser();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={ouvert}
      onOpenChange={(v) => {
        if (!v) reinitialiser();
        onOpenChange(v);
      }}
      title="Nouvel événement"
    >
      <form onSubmit={soumettre} className="flex flex-col gap-5">
        <Input
          label="Titre"
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          placeholder="Point d'avancement — encadrant"
        />

        <div className="flex flex-col gap-2">
          <label htmlFor="cal-date" className="label-eyebrow">
            Date
          </label>
          <input
            id="cal-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-11 w-full rounded-sm border border-border bg-card px-3 text-body text-ink transition-[border-color] duration-150 ease-out hover:border-border-strong focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-wash"
          />
        </div>

        <label className="flex items-center gap-2 text-body text-ink">
          <input
            type="checkbox"
            checked={touteLaJournee}
            onChange={(e) => setTouteLaJournee(e.target.checked)}
            className="size-4 rounded-xs border-border accent-primary"
          />
          Toute la journée
        </label>

        {!touteLaJournee && (
          <div className="flex flex-col gap-2">
            <label htmlFor="cal-heure" className="label-eyebrow">
              Heure
            </label>
            <input
              id="cal-heure"
              type="time"
              value={heure}
              onChange={(e) => setHeure(e.target.value)}
              className="h-11 w-full rounded-sm border border-border bg-card px-3 text-body text-ink transition-[border-color] duration-150 ease-out hover:border-border-strong focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-wash"
            />
          </div>
        )}

        <ChoixType valeur={type} onChange={setType} />

        {projets.length > 0 && (
          <div className="flex flex-col gap-2">
            <label htmlFor="cal-projet" className="label-eyebrow">
              Projet lié
            </label>
            <select
              id="cal-projet"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="h-11 w-full rounded-sm border border-border bg-card px-3 text-body text-ink transition-[border-color] duration-150 ease-out hover:border-border-strong focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-wash"
            >
              <option value="">Aucun</option>
              {projets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nom}
                </option>
              ))}
            </select>
          </div>
        )}

        {erreur && (
          <p role="alert" className="text-caption text-destructive">
            {erreur}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="ghost" type="button" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button variant="primary" type="submit">
            Créer
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
