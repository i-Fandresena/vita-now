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
    if (!complet) return;

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
    <div className="grid min-h-dvh lg:grid-cols-[0.85fr_1.15fr]">
      {/* Panneau en dégradé. Masqué sous `lg` : sur un téléphone il pousserait
          le formulaire sous la ligne de flottaison, et un écran d'inscription
          qu'il faut faire défiler pour trouver perd la moitié de ceux qui
          l'ouvrent. */}
      {/* Le panneau ne contient plus que l'illustration : `items-center` et
          `justify-center` la calent sur les deux axes.

          `justify-between` répartissait trois enfants ; avec un seul, il le
          colle en haut — c'est le piège de cette propriété quand le contenu se
          réduit. */}
      <aside className="panel-aura relative hidden items-center justify-center p-10 lg:flex">
        {/* `width` et `height` portent les dimensions **réelles** du fichier,
            385×506. C'est ce rapport que le navigateur emploie pour réserver la
            place avant le chargement : un rapport faux — un carré, par exemple —
            fait réserver une boîte carrée, puis l'image se replie sur son vrai
            format à l'arrivée, et tout le panneau sursaute.

            La borne laisse une marge de chaque côté. À pleine largeur de
            colonne, l'illustration touchait les bords et le panneau n'avait plus
            de silhouette — le blanc autour d'une image fait partie de l'image. */}
        <img
          src="/hero-section.png"
          alt=""
          aria-hidden
          width={385}
          height={506}
          className="relative z-10 w-full max-w-[40rem]"
        />
      </aside>

      {/* Colonne du formulaire */}
      <div className="flex items-center justify-center px-6 py-14 sm:px-10">
        <motion.div
          variants={sequence(0.05)}
          initial="hidden"
          animate="visible"
          className="flex w-full max-w-sm flex-col items-center gap-6 text-center"
        >
          {/* Les mascottes se chevauchent par marge négative, jamais par
              position absolue : en flux, la rangée garde une largeur propre et
              reste centrée toute seule. */}
          <motion.div variants={rise} className="flex items-center">
            {TROMBINOSCOPE.map((source, rang) => (
              <span
                key={source}
                className="grid size-20 place-items-center overflow-hidden rounded-full bg- ring-4 ring-background"
                /* Le recouvrement suit la taille du médaillon — un cinquième de
                   son diamètre. Laissé à sa valeur d'avant, il aurait décollé
                   les trois pastilles et la rangée se serait lue comme trois
                   éléments séparés plutôt que comme un groupe. */
                style={{ marginLeft: rang === 0 ? 0 : "-1rem" }}
              >
                <img src={source} alt="" aria-hidden className="size-14 object-contain" />
              </span>
            ))}
          </motion.div>

          <motion.div variants={rise} className="flex flex-col gap-2">
            <h1 className="font-display text-display-3 text-ink">{salutDuJour()}</h1>
            <p className="text-body text-ink-muted">
              Ouvre un espace où tes projets gardent leur mémoire — les
              décisions, les blocages, les raisons.
            </p>
          </motion.div>

          <motion.form
            variants={rise}
            onSubmit={soumettre}
            className="flex w-full flex-col gap-4 text-left"
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
              hint="Six caractères au minimum. Ne réutilise pas un mot de passe existant : la démonstration ne le protège pas."
            />
            <Input
              label="Filière"
              type="text"
              name="filiere"
              placeholder="Génie logiciel"
              value={form.filiere}
              onChange={(event) => setForm({ ...form, filiere: event.target.value })}
            />

            {/* Le niveau conditionne le matching de compagnons et le suivi de
                promotion : il ne peut pas être deviné après coup. */}
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
                        : "border-border text-ink-muted hover:border-border-strong hover:text-ink",
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Le modèle place ici deux liens vers une politique de
                confidentialité et des conditions d'utilisation. Ni l'une ni les
                autres n'existent : des liens morts sur la ligne même où l'on
                demande un consentement valent moins que rien. La phrase dit donc
                l'état réel des choses. */}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={envoye || !complet}
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
