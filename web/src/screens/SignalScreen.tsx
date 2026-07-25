import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

import { useRepository } from "@/app/repository";
import type { Route } from "@/app/router";
import type { AuthorSignal } from "@/domain/types";
import { DURATION, EASE } from "@/lib/motion";
import { Button } from "@/ui/Button";
import { ArchiveLabel } from "@/ui/Editorial";
import { ErrorState } from "@/ui/states";

/**
 * Écran 5 — Le retour à l'auteur. Second et dernier moment narratif.
 *
 * Raisonnement UX
 * ───────────────
 * PRODUCT.md:76 : « c'est l'instant émotionnel central de toute la démo ».
 * PRODUCT.md:27 : c'est aussi le seul signal de progression du produit, et il
 * n'est « ni un score ni une compétition ».
 *
 * Ces deux phrases sont en tension apparente : comment rendre mémorable
 * quelque chose qui refuse toute amplification ? La réponse retenue est de
 * changer de registre plutôt que de monter le volume.
 *
 * · **Changement de point de vue.** Les quatre écrans précédents appartiennent
 *   à celui qui cherche. Celui-ci appartient à l'auteur. Le produit tient sa
 *   promesse hors de la présence de son bénéficiaire — c'est ce déplacement,
 *   pas un effet, qui produit l'émotion.
 *
 * · **Un seul geste, à pleine largeur.** La braise traverse l'écran d'un bord
 *   à l'autre, en dehors de la grille de lecture. C'est la seule fois où le
 *   produit sort de sa mesure. Puis la ligne s'éteint et le calme revient :
 *   le signal a eu lieu, il ne s'installe pas.
 *
 * · **Aucun chiffre.** Ni compteur d'usages, ni date relative valorisante, ni
 *   « 3e fois cette semaine ». La dernière phrase de l'écran énonce ce refus
 *   explicitement — c'est la réponse directe à la lettre de Soa, qui rejetait
 *   « pas de streak à casser, pas de score, pas de niveau suivant ».
 */

function formatMoment(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function SignalScreen({
  id,
  navigate,
}: {
  id: string;
  navigate: (to: Route) => void;
}) {
  const repository = useRepository();
  const reduced = useReducedMotion() ?? false;
  const [signal, setSignal] = useState<AuthorSignal | null | "chargement">("chargement");

  useEffect(() => {
    let alive = true;
    repository.latestSignal(id).then((found) => {
      if (alive) setSignal(found);
    });
    return () => {
      alive = false;
    };
  }, [id, repository]);

  if (signal === "chargement") return <div className="min-h-[60dvh]" />;

  if (!signal) {
    return (
      <ErrorState
        title="Aucun signal à afficher"
        body="Ce fragment n’a encore servi à personne, ou il a été retiré du corpus."
        action={
          <Button variant="secondary" onClick={() => navigate({ name: "recherche" })}>
            Revenir à la recherche
          </Button>
        }
      />
    );
  }

  const step = (delay: number) => ({
    initial: reduced ? { opacity: 0 } : { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: reduced
      ? { duration: 0.25 }
      : { duration: 0.75, delay, ease: EASE.narrative },
  });

  return (
    <section className="flex min-h-[calc(100dvh-4rem)] flex-col justify-center py-20">
      <motion.p {...step(0.05)}>
        <ArchiveLabel>Ce que reçoit {signal.author.name}</ArchiveLabel>
      </motion.p>

      <motion.h1
        {...step(0.4)}
        className="mt-8 max-w-[16ch] text-balance font-display text-display-1 font-light text-bone"
      >
        Ce que vous aviez compris vient de débloquer quelqu’un.
      </motion.h1>

      {/* Pleine largeur : le seul élément du produit qui sort de la mesure de
          lecture. La braise s'allume d'un bord à l'autre, puis s'éteint. */}
      <div
        aria-hidden
        className="relative left-1/2 my-16 w-screen -translate-x-1/2 overflow-hidden"
      >
        <div className="h-px w-full bg-line-faint" />
        <motion.div
          className="absolute inset-x-0 top-0 h-px origin-left bg-ember"
          initial={{ scaleX: 0, opacity: 0 }}
          animate={
            reduced
              ? { scaleX: 1, opacity: 0.35 }
              : { scaleX: 1, opacity: [0, 1, 1, 0.14] }
          }
          transition={
            reduced
              ? { duration: 0.3 }
              : {
                  scaleX: { duration: DURATION.authorReturn, ease: EASE.narrative },
                  opacity: {
                    duration: 4.6,
                    times: [0, 0.14, 0.46, 1],
                    ease: "easeInOut",
                  },
                }
          }
        />
      </div>

      <motion.dl
        {...step(1.05)}
        className="grid gap-x-16 gap-y-8 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
      >
        <div className="flex flex-col gap-2">
          <dt>
            <ArchiveLabel>Le fragment</ArchiveLabel>
          </dt>
          <dd className="max-w-[36ch] text-body-lg text-bone-2">
            {signal.fragmentTitle}
          </dd>
        </div>

        <div className="flex flex-col gap-2">
          <dt>
            <ArchiveLabel>A servi sur</ArchiveLabel>
          </dt>
          <dd className="max-w-[36ch] text-body-lg text-bone-2">{signal.helpedWith}</dd>
        </div>

        <div className="flex flex-col gap-2">
          <dt>
            <ArchiveLabel>Le</ArchiveLabel>
          </dt>
          <dd className="text-body text-bone-3">{formatMoment(signal.helpedAt)}</dd>
        </div>
      </motion.dl>

      <motion.p
        {...step(1.5)}
        className="prose-measure mt-20 text-body text-bone-3"
      >
        Aura++ ne dira ni combien de fois, ni à quel rang, ni comparé à qui.
        Seulement que c’est arrivé.
      </motion.p>

      {/* `-ml-4` compense le rembourrage horizontal du bouton fantôme : son
          libellé doit tomber sur la même verticale que le texte au-dessus. */}
      <motion.div {...step(1.7)} className="-ml-4 mt-10">
        <Button variant="ghost" onClick={() => navigate({ name: "recherche" })}>
          Revenir
        </Button>
      </motion.div>
    </section>
  );
}
