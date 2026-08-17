import { useRef, useState, type ChangeEvent, type FormEvent } from "react";

import type { Route } from "@/app/router";
import { useSoa } from "@/app/soa-store";
import type { Disponibilite, Niveau, Skill } from "@/domain/soa";
import { cn } from "@/lib/cn";
import { Button } from "@/ui/Button";
import { Avatar } from "@/ui/data";
import { Input, Textarea } from "@/ui/Field";
import { Icon } from "@/ui/Icon";
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
  const {
    me,
    updateProfile,
    uploadPhoto,
    removePhoto,
    uploadCv,
    removeCv,
    desactiverCompte,
    supprimerCompte,
  } = useSoa();
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
  const [envoiPhoto, setEnvoiPhoto] = useState(false);
  const [envoiCv, setEnvoiCv] = useState(false);
  const [actionCompte, setActionCompte] = useState<"desactiver" | "supprimer" | null>(null);
  const [motDePasseCompte, setMotDePasseCompte] = useState("");
  const [confirmationCompte, setConfirmationCompte] = useState("");
  const [compteEnCours, setCompteEnCours] = useState(false);
  const [erreurCompte, setErreurCompte] = useState<string | null>(null);
  const inputPhoto = useRef<HTMLInputElement>(null);
  const inputCv = useRef<HTMLInputElement>(null);

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

  // Envoyée immédiatement au choix du fichier — pas différée au `submit` du
  // formulaire, pour que l'aperçu reflète tout de suite ce qui est enregistré.
  async function choisirPhoto(event: ChangeEvent<HTMLInputElement>) {
    const fichier = event.target.files?.[0];
    event.target.value = "";
    if (!fichier) return;
    setEnvoiPhoto(true);
    try {
      await uploadPhoto(fichier);
    } finally {
      setEnvoiPhoto(false);
    }
  }

  async function choisirCv(event: ChangeEvent<HTMLInputElement>) {
    const fichier = event.target.files?.[0];
    event.target.value = "";
    if (!fichier) return;
    setEnvoiCv(true);
    try {
      await uploadCv(fichier);
    } finally {
      setEnvoiCv(false);
    }
  }

  async function confirmerActionCompte(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!actionCompte || compteEnCours) return;
    const attendu = actionCompte === "desactiver" ? "DESACTIVER" : "SUPPRIMER";
    if (confirmationCompte !== attendu) {
      setErreurCompte(`Saisis ${attendu} pour confirmer.`);
      return;
    }

    setCompteEnCours(true);
    setErreurCompte(null);
    try {
      if (actionCompte === "desactiver") {
        await desactiverCompte(motDePasseCompte, confirmationCompte);
      } else {
        await supprimerCompte(motDePasseCompte, confirmationCompte);
      }
      navigate({ name: "accueil" });
    } catch (erreur) {
      setErreurCompte(erreur instanceof Error ? erreur.message : "L'opération n'a pas pu être finalisée.");
    } finally {
      setCompteEnCours(false);
    }
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
        <div className="flex items-center gap-5 rounded-card border border-border bg-card p-5">
          <Avatar initiales={me.initiales} nom={me.nom} photoUrl={me.photoUrl} taille="lg" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <p className="text-body font-medium text-ink">Photo de profil</p>
            <p className="text-caption text-ink-muted">JPEG, PNG ou WebP — 4 Mo maximum.</p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={envoiPhoto}
                onClick={() => inputPhoto.current?.click()}
              >
                {envoiPhoto ? "Envoi…" : me.photoUrl ? "Changer la photo" : "Ajouter une photo"}
              </Button>
              {me.photoUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={envoiPhoto}
                  onClick={() => void removePhoto()}
                >
                  Retirer
                </Button>
              )}
            </div>
            <input
              ref={inputPhoto}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={choisirPhoto}
            />
          </div>
        </div>

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

        <div className="flex flex-col gap-3 rounded-card border border-border bg-card p-5">
          <p className="text-body font-medium text-ink">CV</p>
          {me.cvNom ? (
            <p className="flex items-center gap-2 text-body text-ink-muted">
              <Icon name="folder" size={16} aria-hidden className="shrink-0" />
              <span className="min-w-0 truncate">{me.cvNom}</span>
            </p>
          ) : (
            <p className="text-caption text-ink-muted">PDF — 8 Mo maximum.</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={envoiCv}
              onClick={() => inputCv.current?.click()}
            >
              {envoiCv ? "Envoi…" : me.cvUrl ? "Remplacer" : "Ajouter un CV"}
            </Button>
            {me.cvUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={envoiCv}
                onClick={() => void removeCv()}
              >
                Retirer
              </Button>
            )}
          </div>
          <input
            ref={inputCv}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={choisirCv}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <Button type="submit" variant="primary" size="lg">
            Enregistrer
          </Button>
          <Button variant="ghost" onClick={() => navigate({ name: "profil" })}>
            Annuler
          </Button>
        </div>
      </form>

      <section className="mt-10 max-w-2xl rounded-card border border-destructive/25 bg-destructive/5 p-5 sm:p-6" aria-labelledby="gestion-compte">
        <span className="label-eyebrow text-destructive">Gestion du compte</span>
        <h2 id="gestion-compte" className="mt-2 font-heading text-heading text-ink">Prendre une pause ou partir</h2>
        <p className="mt-2 text-body text-ink-muted">
          La désactivation conserve ton espace et tes projets. La suppression est définitive.
        </p>

        {!actionCompte ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setActionCompte("desactiver");
                setErreurCompte(null);
              }}
              className="rounded-card border border-border bg-card p-4 text-left transition-colors hover:border-primary"
            >
              <span className="block text-body font-semibold text-ink">Désactiver temporairement</span>
              <span className="mt-1 block text-caption text-ink-muted">Tu pourras réactiver ton compte simplement en te reconnectant.</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActionCompte("supprimer");
                setErreurCompte(null);
              }}
              className="rounded-card border border-destructive/30 bg-card p-4 text-left transition-colors hover:border-destructive"
            >
              <span className="block text-body font-semibold text-destructive">Supprimer définitivement</span>
              <span className="mt-1 block text-caption text-ink-muted">Cette action ne peut pas être annulée.</span>
            </button>
          </div>
        ) : (
          <form onSubmit={(event) => void confirmerActionCompte(event)} className="mt-5 flex max-w-md flex-col gap-4 rounded-card border border-border bg-card p-4">
            <div>
              <h3 className="text-body font-semibold text-ink">
                {actionCompte === "desactiver" ? "Désactiver le compte" : "Supprimer le compte"}
              </h3>
              <p className="mt-1 text-caption text-ink-muted">
                {actionCompte === "desactiver"
                  ? "La session sera fermée. Une nouvelle connexion avec ton mot de passe réactivera le compte."
                  : "Tous les éléments personnels associés au compte seront supprimés conformément aux règles de conservation de la plateforme."}
              </p>
            </div>
            <Input
              label="Mot de passe actuel"
              type="password"
              autoComplete="current-password"
              value={motDePasseCompte}
              onChange={(event) => setMotDePasseCompte(event.target.value)}
              required
            />
            <Input
              label={`Saisis ${actionCompte === "desactiver" ? "DESACTIVER" : "SUPPRIMER"} pour confirmer`}
              value={confirmationCompte}
              onChange={(event) => setConfirmationCompte(event.target.value.toUpperCase())}
              autoComplete="off"
              required
              error={erreurCompte ?? undefined}
            />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="secondary" disabled={compteEnCours} className={actionCompte === "supprimer" ? "text-destructive" : undefined}>
                {compteEnCours ? "Confirmation…" : actionCompte === "desactiver" ? "Désactiver mon compte" : "Supprimer définitivement"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={compteEnCours}
                onClick={() => {
                  setActionCompte(null);
                  setMotDePasseCompte("");
                  setConfirmationCompte("");
                  setErreurCompte(null);
                }}
              >
                Annuler
              </Button>
            </div>
          </form>
        )}
      </section>
    </Screen>
  );
}
