import { motion } from "framer-motion";
import { useState, type FormEvent } from "react";

import { hrefFor, type Route } from "@/app/router";
import { useSoa } from "@/app/soa-store";
import { rise, sequence } from "@/lib/motion";
import { Button } from "@/ui/Button";
import { Icon } from "@/ui/Icon";
import { Input, Textarea } from "@/ui/Field";

/**
 * CompanyAuthScreens.tsx — connexion et inscription entreprise, hors
 * cadrage (addition demandée directement, pas un module du cadrage).
 *
 * Même langage visuel que `SignInScreen`/`SignUpScreen` (colonne centrée,
 * mêmes variantes de mouvement, mêmes composants de champ), mais sans les
 * boutons Google/GitHub — décoratifs côté étudiant, ils n'ont pas leur place
 * dans un formulaire qui engage une vraie entreprise.
 */

export function CompanyLoginScreen({ navigate }: { navigate: (to: Route) => void }) {
  const { loginEntreprise } = useSoa();
  const [email, setEmail] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function soumettre(event: FormEvent) {
    event.preventDefault();
    if (!email.trim() || !motDePasse) {
      setErreur("Veuillez remplir votre adresse e-mail et votre mot de passe.");
      return;
    }

    setEnvoye(true);
    const resultat = await loginEntreprise(email, motDePasse);

    if (resultat.ok) {
      navigate({ name: "ent-accueil" });
      return;
    }

    setEnvoye(false);
    setErreur(
      resultat.message ??
        "Adresse e-mail ou mot de passe incorrect. Vérifie l'orthographe, ou crée un compte.",
    );
  }

  return (
    <div className="grid h-dvh min-h-dvh max-h-dvh overflow-hidden lg:grid-cols-2">
      <div className="flex h-full flex-col items-center justify-center overflow-y-auto px-6 py-6 sm:px-10">
        <motion.div
          variants={sequence(0.05)}
          initial="hidden"
          animate="visible"
          className="my-auto mx-auto flex w-full max-w-sm flex-col items-center gap-5 sm:gap-6 text-center"
        >
          <motion.a
            variants={rise}
            href={hrefFor({ name: "accueil" })}
            onClick={(event) => {
              event.preventDefault();
              navigate({ name: "accueil" });
            }}
            className="flex items-center gap-2.5 self-center rounded-sm"
          >
            <span className="grid size-16 shrink-0 place-items-center rounded-full bg-primary-wash text-primary sm:size-20">
              <Icon name="building" size={32} aria-hidden />
            </span>
          </motion.a>

          <motion.div variants={rise} className="flex flex-col gap-1 text-center">
            <h1 className="font-display text-display-3 text-ink">Espace entreprise.</h1>
            <p className="text-caption text-ink-muted">
              Pas encore de compte ?{" "}
              <a
                href={hrefFor({ name: "ent-inscription" })}
                onClick={(event) => {
                  event.preventDefault();
                  navigate({ name: "ent-inscription" });
                }}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Créer un compte entreprise
              </a>
            </p>
          </motion.div>

          <motion.form variants={rise} onSubmit={soumettre} className="flex w-full flex-col gap-4 text-left">
            <Input
              label="Adresse e-mail"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="contact@votre-entreprise.mg"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setErreur(null);
              }}
            />
            <Input
              label="Mot de passe"
              type="password"
              name="motdepasse"
              autoComplete="current-password"
              placeholder="Votre mot de passe"
              value={motDePasse}
              onChange={(event) => {
                setMotDePasse(event.target.value);
                setErreur(null);
              }}
              error={erreur ?? undefined}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="mt-1 w-full"
              disabled={envoye}
            >
              {envoye ? "Ouverture…" : "Se connecter"}
            </Button>
          </motion.form>

          <motion.p variants={rise} className="text-caption text-ink-muted">
            Un profil étudiant ?{" "}
            <a
              href={hrefFor({ name: "connexion" })}
              onClick={(event) => {
                event.preventDefault();
                navigate({ name: "connexion" });
              }}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Connexion étudiant
            </a>
          </motion.p>
        </motion.div>
      </div>

      <aside className="hidden h-full items-center justify-center bg-surface px-10 py-10 lg:flex">
        <div className="flex max-w-md flex-col items-center gap-6 text-center">
          <img
            src="/logo-vita-now.png"
            alt=""
            className="h-auto max-h-28 w-auto shrink-0 object-contain"
          />
          <p className="text-title text-ink">
            Publiez de vrais projets, pas seulement des offres d'emploi. C'est la
            distinction que pose le partenariat VITA'NOW.
          </p>
        </div>
      </aside>
    </div>
  );
}

export function CompanySignUpScreen({ navigate }: { navigate: (to: Route) => void }) {
  const { signupEntreprise } = useSoa();
  const [form, setForm] = useState({
    nom: "",
    secteur: "",
    email: "",
    motDePasse: "",
    presentation: "",
  });
  const [envoye, setEnvoye] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const MDP_MINIMUM = 12;
  const complet =
    form.nom.trim() && form.secteur.trim() && form.email.trim() && form.motDePasse.length >= MDP_MINIMUM;

  async function soumettre(event: FormEvent) {
    event.preventDefault();
    if (!complet) {
      setErreur(
        `Nom, secteur et adresse e-mail sont requis, et le mot de passe doit faire au moins ${MDP_MINIMUM} caractères.`,
      );
      return;
    }

    setEnvoye(true);
    const resultat = await signupEntreprise(form);

    if (resultat.ok) {
      navigate({ name: "ent-accueil" });
      return;
    }

    setEnvoye(false);
    setErreur(
      resultat.message ??
        "Un compte existe déjà pour cette adresse. Connectez-vous plutôt.",
    );
  }

  return (
    <div className="grid h-dvh min-h-dvh max-h-dvh overflow-hidden lg:grid-cols-[0.85fr_1.15fr]">
      <aside className="panel-aura relative hidden h-full items-center justify-center p-6 lg:flex">
        <div className="relative z-10 flex max-w-sm flex-col items-center gap-4 text-center text-on-primary">
          <Icon name="building" size={48} aria-hidden />
          <p className="text-title">
            Un partenariat, pas une annonce perdue : vos offres arrivent devant des
            étudiants qui ont déjà un projet à montrer.
          </p>
        </div>
      </aside>

      <div className="flex h-full flex-col items-center justify-center overflow-y-auto px-6 py-4 sm:px-10 sm:py-6">
        <motion.div
          variants={sequence(0.05)}
          initial="hidden"
          animate="visible"
          className="my-auto mx-auto flex w-full max-w-sm flex-col items-center gap-3 sm:gap-4 text-center"
        >
          <motion.div variants={rise} className="flex flex-col gap-1">
            <h1 className="font-display text-display-3 text-ink">Créer un compte entreprise.</h1>
            <p className="text-caption text-ink-muted">
              Pour de vrais partenariats — pas une démonstration.
            </p>
          </motion.div>

          <motion.form
            variants={rise}
            onSubmit={soumettre}
            className="flex w-full flex-col gap-3 text-left"
          >
            <Input
              label="Nom de l'entreprise"
              name="nom"
              placeholder="Agrivia"
              value={form.nom}
              onChange={(event) => {
                setForm({ ...form, nom: event.target.value });
                setErreur(null);
              }}
            />
            <Input
              label="Secteur"
              name="secteur"
              placeholder="Agritech"
              value={form.secteur}
              onChange={(event) => {
                setForm({ ...form, secteur: event.target.value });
                setErreur(null);
              }}
            />
            <Input
              label="Adresse e-mail"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="contact@votre-entreprise.mg"
              value={form.email}
              onChange={(event) => {
                setForm({ ...form, email: event.target.value });
                setErreur(null);
              }}
            />
            <Input
              label="Mot de passe"
              type="password"
              name="motdepasse"
              autoComplete="new-password"
              hint={`${MDP_MINIMUM} caractères minimum.`}
              value={form.motDePasse}
              onChange={(event) => {
                setForm({ ...form, motDePasse: event.target.value });
                setErreur(null);
              }}
            />
            <Textarea
              label="Présentation (optionnel)"
              rows={3}
              value={form.presentation}
              onChange={(event) => setForm({ ...form, presentation: event.target.value })}
              hint="Affichée aux étudiants sur votre espace entreprise."
            />

            {erreur && (
              <p role="alert" className="text-caption text-destructive">
                {erreur}
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="mt-1 w-full"
              disabled={envoye}
            >
              {envoye ? "Création…" : "Créer le compte"}
            </Button>
          </motion.form>

          <motion.p variants={rise} className="text-caption text-ink-muted">
            Déjà un compte ?{" "}
            <a
              href={hrefFor({ name: "ent-connexion" })}
              onClick={(event) => {
                event.preventDefault();
                navigate({ name: "ent-connexion" });
              }}
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
