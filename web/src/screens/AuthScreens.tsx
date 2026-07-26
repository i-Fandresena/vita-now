import { useState, type FormEvent } from "react";

import type { Route } from "@/app/router";
import { useSoa } from "@/app/soa-store";
import type { Disponibilite, Niveau, Skill } from "@/domain/soa";
import { cn } from "@/lib/cn";
import { Button } from "@/ui/Button";
import { Input, Textarea } from "@/ui/Field";
import { Screen, ScreenHead } from "@/ui/layout";

/**
 * ProfileEditScreen — M1, édition du profil.
 *
 * La connexion et l'inscription vivent dans `SignInScreen` / `SignUpScreen`,
 * écrits par l'équipe. Ce fichier ne garde que l'édition, qui n'y figurait pas.
 */

const NIVEAUX: Niveau[] = ["L1", "L2", "L3", "M1", "M2"];
const DISPONIBILITES: Disponibilite[] = ["Soirs", "Week-ends", "Vacances", "Temps plein"];

export function ProfileEditScreen({ navigate }: { navigate: (to: Route) => void }) {
  const { me, updateProfile } = useSoa();
  const [form, setForm] = useState({
    nom: me.nom,
    universite: me.universite,
    niveau: me.niveau,
    filiere: me.filiere,
    objectifs: me.objectifs,
    mentor: me.mentor,
  });
  const [technos, setTechnos] = useState<Skill[]>(me.technos);
  const [interets, setInterets] = useState(me.interets.join(", "));
  const [dispos, setDispos] = useState<Disponibilite[]>(me.disponibilites);
  const [nouvelleTechno, setNouvelleTechno] = useState("");

  function soumettre(event: FormEvent) {
    event.preventDefault();
    updateProfile({
      ...form,
      technos,
      interets: interets
        .split(",")
        .map((i) => i.trim())
        .filter(Boolean),
      disponibilites: dispos,
    });
    navigate({ name: "profil" });
  }

  return (
    <Screen>
      <ScreenHead
        eyebrow="Profil"
        titre="Modifier"
        retour={{ name: "profil" }}
        onRetour={navigate}
      />

      <form onSubmit={soumettre} className="mt-8 flex max-w-2xl flex-col gap-8">
        <Input
          label="Nom complet"
          value={form.nom}
          onChange={(e) => setForm({ ...form, nom: e.target.value })}
        />

        <Input
          label="Université"
          value={form.universite}
          onChange={(e) => setForm({ ...form, universite: e.target.value })}
        />

        <div className="grid gap-6 sm:grid-cols-2">
          <fieldset className="flex flex-col gap-2">
            <legend className="label-eyebrow mb-2">Niveau</legend>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Niveau">
              {NIVEAUX.map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={n === form.niveau}
                  onClick={() => setForm({ ...form, niveau: n })}
                  className={cn(
                    "h-11 w-14 rounded-full border text-body transition-colors duration-150",
                    n === form.niveau
                      ? "border-primary bg-primary-wash font-medium text-primary"
                      : "border-border text-ink-muted hover:border-border-strong",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </fieldset>

          <Input
            label="Filière"
            value={form.filiere}
            onChange={(e) => setForm({ ...form, filiere: e.target.value })}
          />
        </div>

        {/* Le niveau de maîtrise est déclaratif, et l'écran le dit : c'est la
            validation par une entreprise (E9) qui en fait une preuve. */}
        <fieldset className="flex flex-col gap-3">
          <legend className="label-eyebrow mb-1">Technologies</legend>
          <p className="mb-2 text-caption text-ink-muted">
            Déclaratif. Seule une validation par une entreprise en fait une preuve.
          </p>

          {technos.map((t, index) => (
            <div key={t.nom} className="flex flex-wrap items-center gap-3">
              <span className="w-32 shrink-0 text-body text-ink">{t.nom}</span>
              <div className="flex gap-1.5">
                {([1, 2, 3, 4] as const).map((niveau) => (
                  <button
                    key={niveau}
                    type="button"
                    aria-label={`${t.nom} — niveau ${niveau} sur 4`}
                    aria-pressed={t.maitrise === niveau}
                    onClick={() =>
                      setTechnos(
                        technos.map((x, i) =>
                          i === index ? { ...x, maitrise: niveau } : x,
                        ),
                      )
                    }
                    className={cn(
                      "size-11 rounded-sm border text-caption transition-colors duration-150",
                      t.maitrise >= niveau
                        ? "border-primary bg-primary text-on-primary"
                        : "border-border text-ink-muted hover:border-border-strong",
                    )}
                  >
                    {niveau}
                  </button>
                ))}
              </div>
              <Button
                variant="quiet"
                size="sm"
                onClick={() => setTechnos(technos.filter((_, i) => i !== index))}
              >
                Retirer
              </Button>
            </div>
          ))}

          <div className="flex flex-wrap items-end gap-3">
            <Input
              label="Ajouter une technologie"
              wrapperClassName="flex-1 min-w-48"
              value={nouvelleTechno}
              onChange={(e) => setNouvelleTechno(e.target.value)}
            />
            <Button
              variant="secondary"
              onClick={() => {
                const nom = nouvelleTechno.trim();
                if (!nom || technos.some((t) => t.nom === nom)) return;
                setTechnos([...technos, { nom, maitrise: 1 }]);
                setNouvelleTechno("");
              }}
            >
              Ajouter
            </Button>
          </div>
        </fieldset>

        <Input
          label="Centres d'intérêt"
          value={interets}
          onChange={(e) => setInterets(e.target.value)}
          hint="Séparés par des virgules. Ils alimentent la recherche de compagnons."
        />

        <fieldset className="flex flex-col gap-2">
          <legend className="label-eyebrow mb-2">Disponibilités</legend>
          <div className="flex flex-wrap gap-2">
            {DISPONIBILITES.map((d) => {
              const actif = dispos.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={actif}
                  onClick={() =>
                    setDispos(actif ? dispos.filter((x) => x !== d) : [...dispos, d])
                  }
                  className={cn(
                    "h-11 rounded-full border px-4 text-body transition-colors duration-150",
                    actif
                      ? "border-primary bg-primary-wash font-medium text-primary"
                      : "border-border text-ink-muted hover:border-border-strong",
                  )}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </fieldset>

        <Textarea
          label="Ton objectif"
          rows={3}
          value={form.objectifs}
          onChange={(e) => setForm({ ...form, objectifs: e.target.value })}
        />

        <label className="flex items-start gap-3 rounded-card border border-border bg-card p-4">
          <input
            type="checkbox"
            checked={form.mentor}
            onChange={(e) => setForm({ ...form, mentor: e.target.checked })}
            className="mt-1 size-5 shrink-0 accent-[var(--color-primary)]"
          />
          <span>
            <span className="block text-body font-medium text-ink">
              Me proposer comme mentor
            </span>
            <span className="block text-caption text-ink-muted">
              Tu apparaîtras dans l'annuaire du mentorat. Le cadrage réserve ce
              rôle aux L3, M1/M2 et alumni.
            </span>
          </span>
        </label>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" variant="primary" size="lg">
            Enregistrer
          </Button>
          <Button variant="ghost" onClick={() => navigate({ name: "profil" })}>
            Annuler
          </Button>
        </div>
      </form>
    </Screen>
  );
}
