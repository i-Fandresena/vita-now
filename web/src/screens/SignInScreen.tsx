import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, type FormEvent } from "react";

import { hrefFor, type Route } from "@/app/router";
import { cn } from "@/lib/cn";
import { EASE, rise, sequence } from "@/lib/motion";
import { Button } from "@/ui/Button";
import { Input } from "@/ui/Field";

/**
 * Écran de connexion.
 *
 * **Il n'authentifie personne, et le code le dit à voix haute.** Le produit n'a
 * pas de backend : l'étudiant courant est une constante du corpus de
 * démonstration. Cet écran reproduit donc la façade décrite au module 1 du
 * cadrage — e-mail, Google, GitHub — et rien de plus.
 *
 * Deux conséquences assumées, toutes deux visibles à l'écran plutôt que
 * cachées dans le code :
 *
 *   · les identifiants saisis **ne partent nulle part** et ne sont conservés
 *     nulle part. Un champ mot de passe qui avale une vraie saisie sans le dire
 *     est le genre de détail qui se paie cher, y compris en démonstration —
 *     quelqu'un finit toujours par y taper un mot de passe réel. La mention
 *     sous le formulaire l'annonce.
 *   · valider entre simplement dans l'espace étudiant, comme le bouton
 *     « Entrer dans VITA'NOW » de la page d'accueil.
 *
 * Le fournisseur « X » du modèle n'est pas repris : le cadrage nomme e-mail,
 * Google et GitHub, et l'université en option future. Afficher un fournisseur
 * qui n'est pas au périmètre promet une intégration de plus à construire.
 */

/**
 * Les fournisseurs du module 1 du cadrage, avec leurs marques officielles.
 *
 * **Les couleurs sont écrites en dur, et c'est le seul endroit du produit où
 * cela se justifie.** Le bleu de Google appartient à Google : ce n'est pas une
 * valeur de notre palette, et en faire un token l'exposerait comme `bg-*` et
 * `text-*` — donc utilisable sur un bouton du produit, ce qu'aucune charte de
 * marque tierce n'autorise. Elles restent enfermées ici.
 *
 * GitHub fait exception dans l'exception : sa marque est monochrome, donc elle
 * prend `currentColor` et suit l'encre du thème au lieu d'un noir figé qui
 * disparaîtrait sur fond sombre.
 *
 * Les tracés sont écrits dans le fichier, jamais chargés : la démonstration
 * doit tenir sans réseau.
 */
const FOURNISSEURS = [
  {
    nom: "Google",
    tracés: [
      {
        d: "M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82Z",
        couleur: "#4285F4",
      },
      {
        d: "M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24Z",
        couleur: "#34A853",
      },
      {
        d: "M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09Z",
        couleur: "#FBBC05",
      },
      {
        d: "M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z",
        couleur: "#EA4335",
      },
    ],
  },
  {
    nom: "GitHub",
    tracés: [
      {
        d: "M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.1-.4-.6-1.6.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.7 1.6.2 2.8.1 3.2.8.8 1.3 1.9 1.3 3.2 0 4.6-2.8 5.6-5.5 5.9.5.4.9 1.1.9 2.3v3.3c0 .3.1.7.8.6A12 12 0 0 0 12 .3Z",
        couleur: "currentColor",
      },
    ],
  },
] as const;

function LogoFournisseur({
  nom,
  tracés,
}: {
  nom: string;
  tracés: readonly { d: string; couleur: string }[];
}) {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-label={nom} className="size-5">
      {tracés.map(({ d, couleur }) => (
        <path key={d} d={d} fill={couleur} />
      ))}
    </svg>
  );
}

const MASCOTTES = [
  "/mascotte4.png",
  "/mascotte1.png",
  "/mascotte2.png",
  "/mascotte3.png",
] as const;

/**
 * La mascotte de l'écran, qui change de personnage chaque seconde.
 *
 * **Les quatre images sont montées en permanence, empilées.** Une seule est
 * opaque à la fois. Monter puis démonter l'image courante obligerait le
 * navigateur à télécharger chaque personnage au moment précis où il doit
 * paraître : le premier tour clignoterait, et sur une connexion lente il
 * clignoterait à chaque tour. Ici tout est chargé au premier rendu, et le
 * changement ne coûte plus qu'une opacité.
 *
 * `object-contain` dans une boîte carrée règle l'autre difficulté : les quatre
 * personnages n'ont ni la même largeur ni le même rapport — de 259×398 à
 * 339×398. Sans boîte commune, la mise en page se décalerait à chaque seconde.
 *
 * Sous `prefers-reduced-motion`, la minuterie ne démarre pas : le premier
 * personnage reste. Une image qui change chaque seconde est précisément ce que
 * ce réglage demande d'éviter.
 */
function MascotteTournante() {
  const reduced = useReducedMotion() ?? false;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const minuterie = window.setInterval(
      () => setIndex((courant) => (courant + 1) % MASCOTTES.length),
      1000,
    );
    return () => window.clearInterval(minuterie);
  }, [reduced]);

  return (
    <span className="relative block size-20 shrink-0">
      {MASCOTTES.map((source, rang) => (
        <img
          key={source}
          src={source}
          alt=""
          aria-hidden
          className={cn(
            "absolute inset-0 size-full object-contain",
            "transition-opacity duration-200 ease-out",
            rang === index ? "opacity-100" : "opacity-0",
          )}
        />
      ))}
    </span>
  );
}

/**
 * Les phrases qui défilent à droite.
 *
 * **Aucune n'est un message de motivation au sens que le cadrage écarte.** Le
 * sujet du hackathon range les encouragements façon Duolingo — « ton futur toi
 * te remerciera », « tu étais à 60 % » — du côté du problème, pas de la
 * solution : le personnage de la lettre en a déjà essayé des centaines. Une
 * phrase qui pousse à revenir demain aurait donc contredit l'écran d'à côté.
 *
 * Ce que ces phrases font à la place : elles énoncent ce que le produit tient
 * pour vrai. Elles motivent parce qu'elles retirent une culpabilité, pas parce
 * qu'elles réclament un effort.
 *
 * Le mot marqué reprend la sélection de la page d'accueil : un accent par
 * phrase, jamais deux.
 */
const PHRASES = [
  <>
    Reprendre, ce n'est pas <span className="mark-select">recommencer</span>.
  </>,
  <>
    Un projet arrêté n'est pas un échec : c'est une{" "}
    <span className="mark-select">impasse documentée</span>.
  </>,
  <>
    Quelqu'un a déjà résolu ce sur quoi tu{" "}
    <span className="mark-select">bloques</span>. Il ne le sait pas encore.
  </>,
  <>
    Ton travail servira à quelqu'un que tu ne{" "}
    <span className="mark-select">connaîtras jamais</span>.
  </>,
] as const;

/**
 * Le carrousel de phrases.
 *
 * `mode="wait"` fait sortir la phrase courante **avant** de monter la suivante.
 * Sans lui, les deux coexistent une demi-seconde et se superposent — deux
 * textes lisibles l'un sur l'autre, illisibles ensemble.
 *
 * La hauteur minimale est ce qui évite l'à-coup : les phrases n'ont pas la même
 * longueur, donc pas le même nombre de lignes, et le bloc entier se
 * repositionnerait à chaque passage. Elle est calée sur la plus longue.
 *
 * Six secondes, pas une : ce sont des phrases, elles se lisent. Sous
 * `prefers-reduced-motion`, la minuterie ne démarre pas et la première reste.
 */
function PhrasesTournantes() {
  const reduced = useReducedMotion() ?? false;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const minuterie = window.setInterval(
      () => setIndex((courant) => (courant + 1) % PHRASES.length),
      6000,
    );
    return () => window.clearInterval(minuterie);
  }, [reduced]);

  return (
    <div className="flex min-h-[7rem] items-center">
      <AnimatePresence mode="wait">
        <motion.p
          key={index}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ duration: 0.35, ease: EASE.outExpo }}
          className="text-title text-ink"
        >
          {PHRASES[index]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

export function SignInScreen({ navigate }: { navigate: (to: Route) => void }) {
  const [envoye, setEnvoye] = useState(false);

  function soumettre(event: FormEvent) {
    event.preventDefault();
    setEnvoye(true);
    navigate({ name: "tableau" });
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Colonne du formulaire. Mesure bornée puis centrée : à pleine largeur
          d'une demi-page, les champs feraient 600px et la lecture d'un
          formulaire court y perdrait son axe. */}
      <div className="flex items-center justify-center px-6 py-14 sm:px-10">
        <motion.div
          variants={sequence(0.05)}
          initial="hidden"
          animate="visible"
          className="flex w-full max-w-sm flex-col gap-8"
        >
          <motion.a
            variants={rise}
            href={hrefFor({ name: "accueil" })}
            onClick={(event) => {
              event.preventDefault();
              navigate({ name: "accueil" });
            }}
            className="flex items-center gap-2.5 self-start rounded-sm"
          >
            <MascotteTournante />
          </motion.a>

          <motion.div variants={rise} className="flex flex-col gap-2">
            <h1 className="font-display text-display-3 text-ink">
              Connexion à VITA'NOW.
            </h1>
            <p className="text-caption text-ink-muted">
              Pas encore de compte ?{" "}
              <a
                href={hrefFor({ name: "inscription" })}
                onClick={(event) => {
                  event.preventDefault();
                  navigate({ name: "inscription" });
                }}
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Créer un compte
              </a>
            </p>
          </motion.div>

          <motion.form variants={rise} onSubmit={soumettre} className="flex flex-col gap-5">
            <Input
              label="Adresse e-mail"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="prenom.nom@eni.mg"
            />
            <Input
              label="Mot de passe"
              type="password"
              name="motdepasse"
              autoComplete="current-password"
              placeholder="Votre mot de passe"
            />

            <Button type="submit" variant="primary" size="lg" className="w-full">
              {envoye ? "Ouverture…" : "Se connecter"}
            </Button>

            {/* La mention qui rend l'écran honnête. Elle est dans le flux, pas
                en note de bas de page : quelqu'un finit toujours par taper un
                vrai mot de passe dans un formulaire qui n'en demande pas. */}
          </motion.form>

          <motion.div variants={rise} className="flex items-center gap-4">
            <span aria-hidden className="h-px flex-1 bg-border" />
            <span className="text-caption text-ink-muted">Ou continuer avec</span>
            <span aria-hidden className="h-px flex-1 bg-border" />
          </motion.div>

          <motion.div variants={rise} className="grid grid-cols-2 gap-3">
            {FOURNISSEURS.map(({ nom, tracés }) => (
              <Button
                key={nom}
                variant="secondary"
                size="lg"
                aria-label={`Continuer avec ${nom} — indisponible en démonstration`}
                onClick={() => navigate({ name: "tableau" })}
                className="text-ink"
              >
                <LogoFournisseur nom={nom} tracés={tracés} />
              </Button>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Colonne de droite. La signature attribuée à Soa a disparu avec la
          citation : ces phrases sont celles du produit, pas les siennes, et lui
          en attribuer la paternité aurait été un faux. */}
      <aside className="hidden items-center justify-center bg-surface px-10 py-14 lg:flex">
        <div className="flex max-w-md flex-col items-center gap-8 text-center">
          <img src="/logo-vita-now.png" alt="" className="h-auto w-auto shrink-0" />
          <PhrasesTournantes />
        </div>
      </aside>
    </div>
  );
}
