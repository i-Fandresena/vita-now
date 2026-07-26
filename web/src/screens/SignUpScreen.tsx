import { motion } from "framer-motion";
import { useState, type FormEvent } from "react";

import { hrefFor, type Route } from "@/app/router";
import { useSoa } from "@/app/soa-store";
import type { Niveau } from "@/domain/soa";
import { cn } from "@/lib/cn";
import { rise, sequence } from "@/lib/motion";
import { Button } from "@/ui/Button";
import { Input } from "@/ui/Field";

/**
 * Écran d'inscription.
 *
 * Même façade que la connexion, et les mêmes limites : le produit n'a pas de
 * backend, aucun compte n'est créé, rien n'est envoyé ni conservé. La mention
 * sous le formulaire le dit à l'écran plutôt que de le laisser au code.
 *
 * **Deux éléments du modèle ne sont pas repris, et ce sont les deux qui
 * mentent.**
 *
 * Les cinq étoiles d'abord : une note est une moyenne d'avis, et il n'y a ni
 * avis ni utilisateurs. Cinq étoiles pleines affichées sur une page d'entrée
 * sont une statistique inventée — exactement ce que la page d'accueil a purgé
 * du template d'origine avec ses « 12k+ étudiants ».
 *
 * Le témoignage signé ensuite. Le modèle attribue un paragraphe élogieux à un
 * client nommé. Un produit dont le sujet est de ne pas laisser disparaître le
 * travail réel ne peut pas s'ouvrir sur une parole fabriquée. La phrase du
 * panneau est donc celle du produit, non signée : elle n'emprunte la voix de
 * personne.
 *
 * Les trois visages du modèle deviennent trois mascottes. Elles ne prétendent
 * représenter aucun utilisateur.
 */

/** Les mascottes qui se chevauchent en tête de formulaire. */
const TROMBINOSCOPE = ["/mascotte1.png", "/mascotte4.png", "/mascotte3.png"] as const;

const JOURS = [
  "dimanche",
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
] as const;

/**
 * Le salut du modèle — « Happy Tuesday ! ».
 *
 * C'est le seul chiffre de l'écran qui soit vrai, et il l'est par construction :
 * il est lu sur l'horloge de la machine, pas écrit dans le code. D'où le calcul
 * au rendu plutôt qu'une constante.
 */
function salutDuJour(): string {
  return `Bon ${JOURS[new Date().getDay()]} !`;
}

/** Les niveaux du cadrage. Le champ est obligatoire : le matching de
 *  compagnons et le suivi de promotion s'en servent tous les deux. */
const NIVEAUX: Niveau[] = ["L1", "L2", "L3", "M1", "M2"];

export function SignUpScreen({ navigate }: { navigate: (to: Route) => void }) {
  const { signup } = useSoa();
  const [form, setForm] = useState({
    email: "",
    nom: "",
    motDePasse: "",
    niveau: "L3" as Niveau,
    filiere: "",
  });
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const complet =
    form.email.trim() && form.nom.trim() && form.motDePasse.length >= 6 && form.filiere.trim();

  function soumettre(event: FormEvent) {
    event.preventDefault();
    if (!complet) {
      setErreur("Veuillez remplir tous les champs obligatoires (mot de passe 6 caractères min).");
      return;
    }

    setEnvoye(true);
    const resultat = signup({
      nom: form.nom,
      email: form.email,
      motDePasse: form.motDePasse,
      universite: "ENI Fianarantsoa",
      niveau: form.niveau,
      filiere: form.filiere,
      objectifs: "",
    });

    if (resultat.ok) {
      navigate({ name: "tableau" });
      return;
    }

    setEnvoye(false);
    setErreur("Un compte existe déjà pour cette adresse. Connecte-toi plutôt.");
  }

  function versConnexion(event: { preventDefault: () => void }) {
    event.preventDefault();
    navigate({ name: "connexion" });
  }

  return (
    <div className="grid h-dvh min-h-dvh max-h-dvh overflow-hidden lg:grid-cols-[0.85fr_1.15fr]">
      {/* Panneau en dégradé */}
      <aside className="panel-aura relative hidden h-full items-center justify-center p-6 lg:flex">
        <img
          src="/hero-section.png"
          alt=""
          aria-hidden
          width={385}
          height={506}
          className="relative z-10 max-h-[80vh] w-auto max-w-[36rem] object-contain"
        />
      </aside>

      {/* Colonne du formulaire */}
      <div className="flex h-full flex-col items-center justify-center overflow-y-auto px-6 py-4 sm:px-10 sm:py-6">
        <motion.div
          variants={sequence(0.05)}
          initial="hidden"
          animate="visible"
          className="my-auto mx-auto flex w-full max-w-sm flex-col items-center gap-3 sm:gap-4 text-center"
        >
          <motion.div variants={rise} className="flex items-center">
            {TROMBINOSCOPE.map((source, rang) => (
              <span
                key={source}
                className="grid size-14 place-items-center overflow-hidden rounded-full ring-2 ring-background sm:size-16"
                style={{ marginLeft: rang === 0 ? 0 : "-0.75rem" }}
              >
                <img src={source} alt="" aria-hidden className="size-10 object-contain sm:size-12" />
              </span>
            ))}
          </motion.div>

          <motion.div variants={rise} className="flex flex-col gap-1">
            <h1 className="font-display text-display-3 text-ink">{salutDuJour()}</h1>
            <p className="text-caption text-ink-muted">
              Ouvre un espace où tes projets gardent leur mémoire.
            </p>
          </motion.div>

          <motion.form
            variants={rise}
            onSubmit={soumettre}
            className="flex w-full flex-col gap-2.5 sm:gap-3 text-left"
          >
            <Input
              label="Adresse e-mail"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="prenom.nom@eni.mg"
              value={form.email}
              onChange={(event) => {
                setForm({ ...form, email: event.target.value });
                setErreur(null);
              }}
              error={erreur ?? undefined}
            />
            <Input
              label="Nom complet"
              type="text"
              name="nom"
              autoComplete="name"
              placeholder="Votre nom"
              value={form.nom}
              onChange={(event) => setForm({ ...form, nom: event.target.value })}
            />
            <Input
              label="Mot de passe"
              type="password"
              name="motdepasse"
              autoComplete="new-password"
              placeholder="Six caractères au minimum"
              value={form.motDePasse}
              onChange={(event) => setForm({ ...form, motDePasse: event.target.value })}
            />
            <Input
              label="Filière"
              type="text"
              name="filiere"
              placeholder="Génie logiciel"
              value={form.filiere}
              onChange={(event) => setForm({ ...form, filiere: event.target.value })}
            />

            <fieldset className="flex flex-col gap-1">
              <legend className="label-eyebrow mb-1">Niveau</legend>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Niveau">
                {NIVEAUX.map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={n === form.niveau}
                    onClick={() => setForm({ ...form, niveau: n })}
                    className={cn(
                      "h-9 w-12 rounded-full border text-caption transition-colors duration-150",
                      n === form.niveau
                        ? "border-primary bg-primary-wash font-medium text-primary"
                        : "border-border text-ink-muted hover:border-border-strong hover:text-ink",
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </fieldset>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="mt-1 w-full bg-primary text-on-primary hover:bg-primary/90 cursor-pointer"
              disabled={envoye}
            >
              {envoye ? "Ouverture…" : "S'inscrire"}
            </Button>
          </motion.form>

          <motion.p variants={rise} className="text-caption text-ink-muted">
            Déjà un compte ?{" "}
            <a
              href={hrefFor({ name: "connexion" })}
              onClick={versConnexion}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Se connecter
            </a>
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
