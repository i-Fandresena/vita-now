import { motion, useReducedMotion } from "framer-motion";
import { useState, type FormEvent } from "react";

import { useRepository } from "@/app/repository";
import type { Route } from "@/app/router";
import type { WorkKind, WorkStatus } from "@/domain/types";
import { cn } from "@/lib/cn";
import { EASE } from "@/lib/motion";
import { Button } from "@/ui/Button";
import { Input, Textarea } from "@/ui/Field";
import { ArchiveLabel, Rule } from "@/ui/Editorial";
import { Screen } from "@/ui/layout";

/**
 * Écran 4 — Dépôt.
 *
 * Raisonnement UX
 * ───────────────
 * C'est ici que SOA se sépare le plus nettement d'un GitHub ou d'un Notion,
 * refusés par SPEC.md §4. Ces outils demandent un livrable. Cet écran
 * demande autre chose : **ce qui a été compris**, et surtout **ce qui a été
 * essayé pour rien**.
 *
 * Le champ « impasses » n'est donc pas optionnel par accident : il est mis au
 * même rang que le raisonnement, avec sa propre affordance d'ajout. Un dépôt
 * sans impasse est un dépôt qui garde pour lui la partie la plus utile.
 *
 * Ce que l'écran ne fait pas : pas d'étapes numérotées, pas de barre de
 * complétion, pas d'illustration. Un formulaire dense se remplit plus vite
 * qu'un assistant en quatre écrans, et ne prétend pas que la tâche est un jeu.
 */

const KINDS: WorkKind[] = ["mémoire", "projet"];
const STATUSES: WorkStatus[] = ["terminé", "arrêté"];

function ChoiceGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="label-eyebrow mb-2">{label}</legend>
      <div className="flex gap-2" role="radiogroup" aria-label={label}>
        {options.map((option) => {
          const active = option === value;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(option)}
              className={cn(
                "h-11 rounded-full border px-5 text-body transition-colors duration-150",
                active
                  ? "border-primary bg-primary-wash font-medium text-primary"
                  : "border-border text-ink-muted hover:border-border-strong hover:text-ink",
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function DepositScreen({ navigate }: { navigate: (to: Route) => void }) {
  const repository = useRepository();
  const reduced = useReducedMotion() ?? false;

  const [title, setTitle] = useState("");
  const [work, setWork] = useState("");
  const [kind, setKind] = useState<WorkKind>("projet");
  const [status, setStatus] = useState<WorkStatus>("arrêté");
  const [reasoning, setReasoning] = useState("");
  const [deadEnds, setDeadEnds] = useState<string[]>([""]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !reasoning.trim()) {
      setError("Le titre et le raisonnement sont nécessaires : ce sont eux qui se transmettent.");
      return;
    }

    setError(null);
    setSaving(true);
    await repository.deposit({ title, work: work || title, kind, status, reasoning, deadEnds });
    setSaving(false);
    setSaved(true);
  }

  if (saved) {
    return (
      <Screen>
        <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduced ? 0.2 : 0.45, ease: EASE.outExpo }}
        className="flex w-full flex-col gap-6 py-16"
        >
        <Rule />
        <h1 className="font-display text-display-2 text-ink">
          C’est dans le corpus.
        </h1>
        <p className="text-body-lg text-ink-muted">
          Ce que tu viens d’écrire est désormais atteignable par quelqu’un qui
          posera la bonne question. Tu ne sauras pas quand — seulement si cela
          arrive.
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="primary" onClick={() => navigate({ name: "memoire" })}>
            Revenir à la recherche
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setSaved(false);
              setTitle("");
              setWork("");
              setReasoning("");
              setDeadEnds([""]);
            }}
          >
            Déposer autre chose
          </Button>
        </div>
        </motion.div>
      </Screen>
    );
  }

  return (
    <Screen>
      <div className="w-full pb-8">
      <div className="w-full">
        <h1 className="font-display text-display-2 text-ink">
          Déposer ce que tu as compris
        </h1>
        <p className="mt-5 text-body-lg text-ink-muted">
          Pas le livrable. Le raisonnement, les décisions, et les chemins qui
          n’ont mené nulle part — c’est cette dernière partie qui fait gagner du
          temps à celui qui suivra.
        </p>
      </div>

      <form onSubmit={submit} className="mt-10 flex w-full flex-col gap-8 sm:mt-12 sm:gap-10">
        <Input
          label="Titre"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Ce que cette fiche permet de comprendre"
          required
        />

        <Input
          label="Travail d’origine"
          value={work}
          onChange={(event) => setWork(event.target.value)}
          placeholder="Mémoire, projet de fin d’année, travail de groupe…"
          hint="Facultatif. Sert à situer la fiche, pas à la classer."
        />

        <div className="flex flex-wrap gap-10">
          <ChoiceGroup label="Nature" options={KINDS} value={kind} onChange={setKind} />
          <ChoiceGroup label="État" options={STATUSES} value={status} onChange={setStatus} />
        </div>

        <Textarea
          label="Le raisonnement"
          value={reasoning}
          onChange={(event) => setReasoning(event.target.value)}
          rows={8}
          placeholder="Quel était le vrai problème ? Qu’as-tu décidé, et pourquoi ?"
          hint="Écris comme tu l’expliquerais à quelqu’un de ta promotion."
          required
        />

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-1">
            <ArchiveLabel>Les impasses</ArchiveLabel>
          </legend>
          <p className="mb-2 text-caption text-ink-muted">
            Ce que tu as essayé et qui n’a pas marché. La partie la plus utile.
          </p>

          {deadEnds.map((entry, index) => (
            <input
              key={index}
              value={entry}
              onChange={(event) => {
                const next = [...deadEnds];
                next[index] = event.target.value;
                setDeadEnds(next);
              }}
              aria-label={`Impasse ${index + 1}`}
              placeholder="Trois semaines sur une piste qui ne pouvait pas aboutir parce que…"
              className="h-11 w-full rounded-sm border border-border bg-surface px-3 text-body text-ink placeholder:text-ink-muted transition-colors duration-90 hover:border-border-strong"
            />
          ))}

          <div>
            <Button
              variant="quiet"
              size="sm"
              className="px-0"
              onClick={() => setDeadEnds([...deadEnds, ""])}
            >
              Ajouter une impasse
            </Button>
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="border-l border-border pl-3 text-caption text-ink">
            {error}
          </p>
        )}

        <Rule />

        <div className="flex flex-wrap gap-3">
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? "Dépôt en cours…" : "Déposer"}
          </Button>
          <Button variant="ghost" onClick={() => navigate({ name: "memoire" })}>
            Annuler
          </Button>
        </div>
      </form>
      </div>
    </Screen>
  );
}
