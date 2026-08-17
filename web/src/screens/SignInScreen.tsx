import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, type FormEvent } from "react";

import { hrefFor, type Route } from "@/app/router";
import { useSoa } from "@/app/soa-store";
import { cn } from "@/lib/cn";
import { EASE, rise, sequence } from "@/lib/motion";
import { Button } from "@/ui/Button";
import { Input } from "@/ui/Field";

/**
 * Écran de connexion.
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
    <span className="relative block size-16 shrink-0 sm:size-20">
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
    <div className="flex min-h-[6rem] items-center">
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
  const { login } = useSoa();
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
    const resultat = await login(email, motDePasse);

    if (resultat.ok) {
      navigate({ name: "tableau" });
      return;
    }

    setEnvoye(false);
    /* Le serveur ne distingue pas les deux cas — l'écart de temps de réponse
       révélerait quelles adresses sont inscrites. Le message reste donc
       volontairement unique, et dit quoi faire ensuite. */
    setErreur(
      resultat.message ??
        "Adresse e-mail ou mot de passe incorrect. Vérifie l'orthographe, ou crée un compte.",
    );
  }

  return (
    <div className="grid h-dvh min-h-dvh max-h-dvh overflow-hidden lg:grid-cols-2">
      {/* Colonne du formulaire. Centré verticalement et horizontalement sans défilement */}
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
            <MascotteTournante />
          </motion.a>

          <motion.div variants={rise} className="flex flex-col gap-1 text-center">
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

          <motion.form variants={rise} onSubmit={soumettre} className="flex w-full flex-col gap-4 text-left">
            <Input
              label="Adresse e-mail"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="prenom.nom@eni.mg"
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
              className="mt-1 w-full bg-primary text-on-primary hover:bg-primary/90 cursor-pointer"
              disabled={envoye}
            >
              {envoye ? "Ouverture…" : "Se connecter"}
            </Button>
          </motion.form>

          <motion.div variants={rise} className="flex w-full items-center gap-4">
            <span aria-hidden className="h-px flex-1 bg-border" />
            <span className="text-caption text-ink-muted">Ou continuer avec</span>
            <span aria-hidden className="h-px flex-1 bg-border" />
          </motion.div>

          <motion.div variants={rise} className="grid w-full grid-cols-2 gap-3">
            {FOURNISSEURS.map(({ nom, tracés }) => {
              // Redirection complète du navigateur (pas un appel du SPA) :
              // le fournisseur OAuth doit recevoir cette requête, pas notre API.
              const disponible = nom === "Google" || nom === "GitHub";
              return (
                <Button
                  key={nom}
                  variant="secondary"
                  size="lg"
                  aria-label={`Continuer avec ${nom}`}
                  disabled={!disponible}
                  onClick={() => {
                    if (disponible) {
                      window.location.href = nom === "Google" ? "/api/auth/google" : "/api/auth/github";
                    }
                  }}
                  className="text-ink"
                >
                  <LogoFournisseur nom={nom} tracés={tracés} />
                </Button>
              );
            })}
          </motion.div>

          <motion.div variants={rise} className="w-full border-t border-border pt-4">
            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={() => navigate({ name: "ent-connexion" })}
            >
              Connexion entreprise
            </Button>
          </motion.div>
        </motion.div>
      </div>

      {/* Colonne de droite */}
      <aside className="hidden h-full items-center justify-center bg-surface px-10 py-10 lg:flex">
        <div className="flex max-w-md flex-col items-center gap-8 text-center">
          <img src="/logo-vita-now.png" alt="" className="h-auto max-h-28 w-auto shrink-0 object-contain" />
          <PhrasesTournantes />
        </div>
      </aside>
    </div>
  );
}
