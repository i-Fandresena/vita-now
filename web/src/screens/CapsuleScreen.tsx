import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

import { useRepository } from "@/app/repository";
import type { Route } from "@/app/router";
import { useSearch } from "@/app/search-store";
import type { ResumptionCapsule } from "@/domain/types";
import { EASE } from "@/lib/motion";
import { Button } from "@/ui/Button";
import { ArchiveLabel, EditorialLayout, Rail, RailItem, Rule } from "@/ui/Editorial";
import { Surface } from "@/ui/Surface";
import { EmptyState, FragmentSkeleton } from "@/ui/states";

/**
 * Écran 3 — Capsule de reprise.
 *
 * Raisonnement UX
 * ───────────────
 * C'est l'écran le plus facile à rater, parce que tout l'instinct produit pousse
 * à motiver. PRODUCT.md:26 l'interdit : la capsule est « silencieuse, non
 * culpabilisante, sans notion de streak ».
 *
 * Ce que cela impose concrètement :
 *
 * · La durée d'absence est écrite une fois, en petit, dans le rail — au même
 *   niveau qu'une date de publication. Elle n'est ni en gros caractères, ni
 *   accompagnée d'un adverbe. « 4 jours » est un fait ; « déjà 4 jours ! » est
 *   un reproche.
 * · Aucune phrase ne s'adresse à la volonté du lecteur. L'écran décrit un état
 *   du projet, pas un état de la personne.
 * · Une seule action, et elle est minuscule par construction : 5 à 10 minutes
 *   (Product_2.0.md:36). Proposer « reprendre le projet » remettrait devant les
 *   yeux la montagne qui a fait abandonner.
 *
 * Le second bouton renvoie le blocage vers le corpus. C'est la jonction des deux
 * mécaniques du produit : ce qui bloque ici a déjà été résolu ailleurs.
 */

const DAY = 86_400_000;

function formatAbsence(iso: string): string {
  const days = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / DAY));
  if (days === 0) return "aujourd’hui";
  if (days === 1) return "il y a 1 jour";
  return `il y a ${days} jours`;
}

export function CapsuleScreen({ navigate }: { navigate: (to: Route) => void }) {
  const repository = useRepository();
  const { run } = useSearch();
  const reduced = useReducedMotion() ?? false;
  const [capsule, setCapsule] = useState<ResumptionCapsule | null | "chargement">(
    "chargement",
  );

  useEffect(() => {
    let alive = true;
    repository.capsuleForCurrentProject().then((found) => {
      if (alive) setCapsule(found);
    });
    return () => {
      alive = false;
    };
  }, [repository]);

  if (capsule === "chargement") {
    return (
      <div className="py-16">
        <FragmentSkeleton />
      </div>
    );
  }

  if (!capsule) {
    return (
      <EmptyState
        title="Aucun projet en sommeil"
        body="Sillage ne génère une capsule que lorsqu’un travail s’est arrêté. Rien à reprendre pour le moment."
      />
    );
  }

  const stage = (index: number) => ({
    initial: reduced ? { opacity: 0 } : { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    transition: reduced
      ? { duration: 0.2 }
      : { duration: 0.45, delay: index * 0.06, ease: EASE.outExpo },
  });

  return (
    <div className="pb-24 pt-14">
      <motion.h1
        {...stage(0)}
        className="max-w-[20ch] font-display text-display-2 font-normal text-bone"
      >
        {capsule.projectTitle}
      </motion.h1>

      <motion.div {...stage(1)} className="mt-12">
        <EditorialLayout
          rail={
            <Rail>
              <RailItem label="Dernière activité">
                {formatAbsence(capsule.lastActivity)}
              </RailItem>
              <RailItem label="Capsule">générée automatiquement</RailItem>
            </Rail>
          }
        >
          <div className="flex flex-col gap-12">
            <section>
              <ArchiveLabel>Où vous en étiez</ArchiveLabel>
              <p className="mt-4 text-body-lg text-bone-2">{capsule.where}</p>
            </section>

            <section>
              <ArchiveLabel>Ce qui bloquait</ArchiveLabel>
              <p className="mt-4 text-body-lg text-bone-2">{capsule.blocking}</p>
            </section>

            <Rule />

            <section>
              <ArchiveLabel>Le prochain pas</ArchiveLabel>
              {/* Le micro-pas est le seul élément en relief de l'écran : c'est
                  la seule chose qu'on demande, et elle tient en 7 minutes. */}
              <Surface className="mt-4">
                <p className="text-body-lg text-bone">{capsule.nextStep.action}</p>
                <p className="mt-3 text-caption text-bone-3">
                  {capsule.nextStep.minutes} minutes. Rien de plus n’est attendu.
                </p>
              </Surface>
            </section>

            <section className="flex flex-col gap-4">
              <p className="text-body text-bone-3">
                Ce blocage a peut-être déjà été résolu dans l’école.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="primary"
                  onClick={() => {
                    run(capsule.blocking);
                    navigate({ name: "recherche" });
                  }}
                >
                  Chercher ce blocage dans le corpus
                </Button>
              </div>
            </section>
          </div>
        </EditorialLayout>
      </motion.div>
    </div>
  );
}
