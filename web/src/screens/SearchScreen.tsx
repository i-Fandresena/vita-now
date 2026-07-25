import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect } from "react";

import { hrefFor, type Route } from "@/app/router";
import { useSearch } from "@/app/search-store";
import { DEMO_CAPSULE } from "@/data/corpus";
import { preloadSealScene } from "@/features/fragment/Seal";
import { HitRow } from "@/features/search/HitRow";
import { SearchField } from "@/features/search/SearchField";
import { cn } from "@/lib/cn";
import { exitTransition, fade, layoutTransition, reduceVariants, sequence } from "@/lib/motion";
import { Button } from "@/ui/Button";
import { Rule } from "@/ui/Editorial";
import { EmptyState, ErrorState, FragmentSkeleton, Pending } from "@/ui/states";

/**
 * Écran 1 — Recherche.
 *
 * Raisonnement UX
 * ───────────────
 * PRODUCT.md:74 impose un accueil « presque vide ». Le réflexe serait de
 * remplir ce vide de suggestions, de recherches récentes, de chiffres. Ce
 * serait une erreur de lecture : le vide n'est pas un manque à combler, c'est
 * la promesse du produit. Ici on ne gère rien, on demande une chose.
 *
 * Trois éléments seulement, et chacun se justifie :
 *
 *   · Une phrase — la thèse du produit, dans sa voix (serif).
 *   · Un champ — l'unique action possible.
 *   · Une ligne de reprise — le seul rappel du projet en sommeil. Factuelle,
 *     sans culpabilisation, sans compteur de jours en gros caractères
 *     (PRODUCT.md:26). Elle disparaît dès qu'une recherche est lancée.
 *
 * Quand les résultats arrivent, le champ ne disparaît pas et ne réapparaît pas
 * ailleurs : il **monte**. C'est une animation de layout, donc un geste de
 * continuité — le même objet reste le même objet. C'est le seul mouvement de
 * l'écran, et il est structurel, pas décoratif.
 */

const DAY = 86_400_000;

function daysSince(iso: string): number {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / DAY));
}

export function SearchScreen({ navigate }: { navigate: (to: Route) => void }) {
  const { query, hits, status, run } = useSearch();
  const reduced = useReducedMotion() ?? false;
  const idle = status === "vierge";

  // Dès qu'un résultat existe, le module 3D est chargé en tâche de fond : au
  // moment du clic, il est déjà là. La 3D ne doit jamais faire attendre.
  useEffect(() => {
    if (status === "abouti" && hits.length > 0) preloadSealScene();
  }, [status, hits.length]);

  return (
    <motion.div
      layout={!reduced}
      transition={layoutTransition}
      className={cn(
        "flex flex-col",
        idle ? "pt-[15vh] pb-24 lg:pt-[18vh]" : "pt-14 pb-24",
      )}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {idle && (
          <motion.div
            key="these"
            variants={reduceVariants(fade, reduced)}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="prose-measure mb-14"
          >
            {/* `text-balance` : sans lui, la phrase se brisait sur un « là. »
                orphelin en seconde ligne — un défaut de composition que le
                serif rend impardonnable à cette taille. */}
            <h1 className="text-balance font-display text-display-1 font-light text-bone">
              Quelqu’un est déjà passé par là.
            </h1>
            <p className="mt-6 text-body-lg text-bone-2">
              Décrivez ce qui vous bloque. Sillage cherche, dans les mémoires et les
              projets de l’école, ce qui a déjà été compris — le raisonnement, les
              choix, les impasses. Pas le code.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div layout={!reduced} transition={layoutTransition}>
        <SearchField
          defaultValue={query}
          onSubmit={run}
          autoFocus
          showHint={idle}
        />
      </motion.div>

      <AnimatePresence initial={false}>
        {idle && (
          <motion.div
            key="reprise"
            variants={reduceVariants(fade, reduced)}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="mt-16 flex flex-col gap-4"
          >
            <Rule />
            <p className="text-caption text-bone-3">
              Un projet est en sommeil depuis {daysSince(DEMO_CAPSULE.lastActivity)}{" "}
              jours —{" "}
              <a
                href={hrefFor({ name: "reprise" })}
                onClick={(event) => {
                  event.preventDefault();
                  navigate({ name: "reprise" });
                }}
                className="rounded-control text-bone underline decoration-line-strong underline-offset-4 transition-colors duration-90 hover:decoration-bone"
              >
                {DEMO_CAPSULE.projectTitle}
              </a>
              .
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-16">
        {status === "en-cours" && (
          <>
            <Pending label="Lecture du corpus" />
            <div aria-hidden className="mt-4 divide-y divide-line-faint">
              <FragmentSkeleton />
              <FragmentSkeleton />
            </div>
          </>
        )}

        {status === "erreur" && (
          <ErrorState
            title="La recherche n’a pas abouti"
            body="Le corpus n’a pas répondu. Rien n’est perdu : la même question relancée donnera le même résultat."
            action={
              <Button variant="secondary" onClick={() => run(query)}>
                Relancer
              </Button>
            }
          />
        )}

        {status === "abouti" && hits.length === 0 && (
          <EmptyState
            title="Rien dans le corpus ne répond à cette question"
            body="C’est une information en soi : personne n’a encore documenté ce blocage ici. Ce que vous allez comprendre en le résolvant vaut d’être déposé."
            action={
              <Button variant="secondary" onClick={() => navigate({ name: "depot" })}>
                Déposer ce que j’aurai compris
              </Button>
            }
          />
        )}

        {status === "abouti" && hits.length > 0 && (
          <motion.section
            variants={sequence()}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, transition: exitTransition }}
            aria-label="Résultats"
          >
            <p className="label-archive mb-2">
              {hits.length} fragment{hits.length > 1 ? "s" : ""} retrouvé
              {hits.length > 1 ? "s" : ""}
            </p>
            <ul className="divide-y divide-line-faint">
              {hits.map((hit) => (
                <HitRow
                  key={hit.fragment.id}
                  hit={hit}
                  onOpen={(id) => navigate({ name: "fragment", id })}
                />
              ))}
            </ul>
          </motion.section>
        )}
      </div>
    </motion.div>
  );
}
