import { motion, useReducedMotion } from "framer-motion";
import { Clock, Search } from "lucide-react";

import type { Route } from "@/app/router";
import { useSearch } from "@/app/search-store";
import { useSoa } from "@/app/soa-store";
import { joursDepuis } from "@/domain/soa";
import { EASE } from "@/lib/motion";
import { Button } from "@/ui/Button";
import { Screen, ScreenHead } from "@/ui/layout";
import { EmptyState } from "@/ui/states";

/**
 * M6 — Capsule de reprise.
 *
 * C'est l'écran le plus facile à rater, parce que tout l'instinct produit
 * pousse à motiver. Le cadrage l'interdit dans les termes de la lettre : « pas
 * de streak à casser, pas de score, pas de niveau suivant ». Ce que cela
 * impose concrètement :
 *
 *   · La durée d'absence est écrite **une fois**, au même rang qu'une date de
 *     publication. « 4 jours » est un fait ; « déjà 4 jours ! » est un reproche.
 *   · Aucune phrase ne s'adresse à la volonté du lecteur. L'écran décrit l'état
 *     d'un projet, pas l'état d'une personne.
 *   · Une seule action, minuscule par construction : 5 à 10 minutes. Proposer
 *     « reprendre le projet » remettrait devant les yeux la montagne qui a fait
 *     abandonner.
 *
 * La capsule vient du store, qui la **dérive du journal** — la dernière
 * solution dit où on en était, la dernière erreur dit ce qui bloquait. Rien
 * n'est demandé à l'étudiant : s'il fallait remplir un formulaire pour obtenir
 * sa capsule, personne ne l'aurait.
 */

export function CapsuleScreen({ navigate }: { navigate: (to: Route) => void }) {
  const { capsule } = useSoa();
  const { run } = useSearch();
  const reduced = useReducedMotion() ?? false;

  if (!capsule) {
    return (
      <Screen>
        <EmptyState
          title="Aucun projet en sommeil"
          body="VITA'NOW ne prépare une reprise que lorsqu'un projet s'est arrêté. Rien à reprendre pour le moment."
          action={
            <Button variant="secondary" onClick={() => navigate({ name: "projets" })}>
              Voir mes projets
            </Button>
          }
        />
      </Screen>
    );
  }

  const jours = joursDepuis(capsule.lastActivity);

  const etape = (index: number) => ({
    initial: reduced ? { opacity: 0 } : { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    transition: reduced
      ? { duration: 0.2 }
      : { duration: 0.45, delay: index * 0.07, ease: EASE.outExpo },
  });

  return (
    <Screen>
      <ScreenHead
        eyebrow="Reprise"
        titre={capsule.projectTitle}
        retour={{ name: "tableau" }}
        onRetour={navigate}
      />

      <motion.p
        {...etape(0)}
        className="mt-4 flex items-center gap-2 text-caption text-ink-muted"
      >
        <Clock aria-hidden className="size-3.5" />
        Dernière activité il y a {jours} jour{jours > 1 ? "s" : ""}
      </motion.p>

      <div className="mt-10 flex flex-col gap-8">
        <motion.section {...etape(1)}>
          <h2 className="label-eyebrow">Où tu en étais</h2>
          <p className="prose-measure mt-3 text-body-lg text-ink">{capsule.where}</p>
        </motion.section>

        <motion.section {...etape(2)}>
          <h2 className="label-eyebrow">Ce qui bloquait</h2>
          <p className="prose-measure mt-3 text-body-lg text-ink">{capsule.blocking}</p>
        </motion.section>

        {/* Le micro-pas est le seul élément en relief de l'écran : c'est la
            seule chose qu'on demande, et elle tient en sept minutes. */}
        <motion.section
          {...etape(3)}
          className="rounded-card border border-primary/25 bg-primary-wash p-5 sm:p-6"
        >
          <h2 className="label-eyebrow text-primary">
            Le prochain pas — {capsule.nextStep.minutes} minutes
          </h2>
          <p className="prose-measure mt-3 text-body-lg text-ink">
            {capsule.nextStep.action}
          </p>
          <p className="mt-3 text-caption text-ink-muted">
            Rien de plus n'est attendu aujourd'hui.
          </p>
        </motion.section>

        <motion.section {...etape(4)} className="flex flex-col gap-4">
          <p className="text-body text-ink-muted">
            Ce blocage a peut-être déjà été résolu dans l'école.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="primary"
              onClick={() => {
                run(capsule.blocking);
                navigate({ name: "memoire" });
              }}
            >
              <Search aria-hidden className="size-4" />
              Chercher ce blocage dans le corpus
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate({ name: "projet-journal", id: capsule.projectId })}
            >
              Ouvrir le journal
            </Button>
          </div>
        </motion.section>
      </div>
    </Screen>
  );
}
