import { motion, useReducedMotion } from "framer-motion";
import { RotateCcw, Search } from "lucide-react";
import { useEffect, useState } from "react";

import { hrefFor, type Route } from "@/app/router";
import { useSearch } from "@/app/search-store";
import { useSoa } from "@/app/soa-store";
import { studentById } from "@/data/soa-corpus";
import { joursDepuis } from "@/domain/soa";
import { preloadSealScene } from "@/features/fragment/Seal";
import { HitRow } from "@/features/search/HitRow";
import { SearchField } from "@/features/search/SearchField";
import { exitTransition, rise, sequence } from "@/lib/motion";
import { Button } from "@/ui/Button";
import { Chip, ChipRow } from "@/ui/Editorial";
import { Avatar, Progress } from "@/ui/data";
import { Block, CardLink, Screen, ScreenHead, Tabs } from "@/ui/layout";
import { EmptyState, ErrorState, FragmentSkeleton, Pending } from "@/ui/states";

/**
 * MemoryScreens.tsx — la Mémoire IA : recherche et Renaissance (M15).
 *
 * C'est le pivot de l'architecture du cadrage : tout ce qui est produit en
 * haut (journal, mémoires, projets arrêtés) y est indexé, et tout ce qui est
 * consommé en bas en découle. L'onglet réunit donc les deux faces —
 * interroger le passé, et reprendre ce que quelqu'un a laissé.
 */

export function MemoryScreen({ navigate }: { navigate: (to: Route) => void }) {
  const { query, hits, status, run } = useSearch();
  const { projects } = useSoa();
  const reduced = useReducedMotion() ?? false;
  const vierge = status === "vierge";

  // Dès qu'un résultat existe, le module 3D part en tâche de fond : au moment
  // du clic il est déjà là. La 3D ne doit jamais faire attendre.
  useEffect(() => {
    if (status === "abouti" && hits.length > 0) preloadSealScene();
  }, [status, hits.length]);

  const aReprendre = projects.filter(
    (p) => p.status === "Abandonné" && p.ownerId !== "s-soa",
  ).length;

  return (
    <Screen>
      <ScreenHead
        titre="Chercher"
        lede="Ce que d'autres ont déjà compris avant toi — mémoires et projets de l'école, terminés comme arrêtés. On y cherche un raisonnement, pas du code à copier."
      />

      <div className="mt-6">
        <SearchField defaultValue={query} onSubmit={run} showHint={vierge} />
      </div>

      {vierge && (
        <>
          <Block titre="Par où commencer">
            <div className="grid gap-3 sm:grid-cols-2">
              <CardLink
                href={hrefFor({ name: "renaissance" })}
                onClick={() => navigate({ name: "renaissance" })}
              >
                <div className="flex items-start gap-3">
                  <RotateCcw aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <h3 className="text-body font-semibold text-ink">Renaissance</h3>
                    <p className="mt-0.5 text-caption text-ink-muted">
                      {aReprendre} projet{aReprendre > 1 ? "s" : ""} arrêté
                      {aReprendre > 1 ? "s" : ""} attend{aReprendre > 1 ? "ent" : ""} qu'on
                      les reprenne.
                    </p>
                  </div>
                </div>
              </CardLink>

              <CardLink
                href={hrefFor({ name: "depot" })}
                onClick={() => navigate({ name: "depot" })}
              >
                <div className="flex items-start gap-3">
                  <Search aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <h3 className="text-body font-semibold text-ink">Déposer</h3>
                    <p className="mt-0.5 text-caption text-ink-muted">
                      Ce que tu as compris devient trouvable par le suivant.
                    </p>
                  </div>
                </div>
              </CardLink>
            </div>
          </Block>

          <p className="mt-10 rounded-card border border-border bg-surface p-5 text-body text-ink-muted">
            Décris ton blocage en une phrase, comme tu le dirais à voix haute. La
            recherche travaille sur le sens, pas sur les mots-clés — « deux
            appareils modifient la même donnée » trouve un mémoire qui ne contient
            aucun de ces mots.
          </p>
        </>
      )}

      <div className="mt-8">
        {status === "en-cours" && (
          <>
            <Pending label="Recherche en cours" />
            <div aria-hidden className="mt-4 flex flex-col gap-4">
              <FragmentSkeleton />
              <FragmentSkeleton />
            </div>
          </>
        )}

        {status === "erreur" && (
          <ErrorState
            title="La recherche n'a pas abouti"
            body="La recherche n'a pas répondu. Rien n'est perdu : la même question relancée donnera le même résultat."
            action={
              <Button variant="secondary" onClick={() => run(query)}>
                Relancer
              </Button>
            }
          />
        )}

        {status === "abouti" && hits.length === 0 && (
          <EmptyState
            title="Aucune fiche ne répond à cette question"
            body="C'est une information en soi : personne n'a encore documenté ce blocage ici. Ce que tu vas comprendre en le résolvant vaut d'être déposé."
            action={
              <Button variant="secondary" onClick={() => navigate({ name: "depot" })}>
                Déposer ce que j'aurai compris
              </Button>
            }
          />
        )}

        {status === "abouti" && hits.length > 0 && (
          <motion.section
            variants={sequence(reduced ? 0 : 0.035)}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, transition: exitTransition }}
            aria-label="Résultats"
          >
            <p className="label-eyebrow mb-3">
              {hits.length} résultat{hits.length > 1 ? "s" : ""}
            </p>
            <ul className="flex flex-col gap-4">
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
    </Screen>
  );
}

/* ── M15 — Renaissance ──────────────────────────────────────────────────── */

const FILTRES = ["Tous", "Java", "PHP", "Python", "Go", "TypeScript"] as const;

export function RenaissanceScreen({ navigate }: { navigate: (to: Route) => void }) {
  const { projects, journalFor, reviveProject, progressOf } = useSoa();
  const [filtre, setFiltre] = useState<(typeof FILTRES)[number]>("Tous");

  const arretes = projects.filter((p) => p.status === "Abandonné");
  const visibles =
    filtre === "Tous"
      ? arretes
      : arretes.filter((p) => p.technos.some((t) => t === filtre));

  return (
    <Screen>
      <ScreenHead
        eyebrow="M15"
        titre="Renaissance"
        lede="Des projets arrêtés, avec leur journal et la raison de l'arrêt. Reprendre l'un d'eux, c'est démarrer avec les impasses déjà payées par quelqu'un d'autre."
        retour={{ name: "memoire" }}
        onRetour={navigate}
      />

      <Tabs valeurs={FILTRES} actif={filtre} onChange={setFiltre} className="mt-6" />

      <motion.div
        variants={sequence()}
        initial="hidden"
        animate="visible"
        className="mt-6 flex flex-col gap-4"
      >
        {visibles.map((projet) => {
          const auteur = studentById(projet.ownerId);
          const entrees = journalFor(projet.id);
          const mien = projet.ownerId === "s-soa";

          return (
            <motion.article
              key={projet.id}
              variants={rise}
              className="rounded-card border border-border bg-card p-5 sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-title font-semibold text-ink">{projet.nom}</h3>
                  <p className="mt-1 text-caption text-ink-muted">
                    {auteur?.nom} · promo {auteur?.promo} · arrêté il y a{" "}
                    {Math.round(joursDepuis(projet.fin ?? projet.derniereActivite) / 30)} mois
                  </p>
                </div>
                {mien && <Chip>Le tien</Chip>}
              </div>

              <p className="prose-measure mt-3 text-body text-ink-muted">
                {projet.description}
              </p>

              {/* La raison d'arrêt est le cœur de l'écran : c'est elle qui dit
                  où quelqu'un s'est cassé les dents, donc où tu commences. */}
              {projet.raisonAbandon && (
                <div className="mt-4 rounded-sm border-l-2 border-accent bg-accent-soft/50 p-4">
                  <p className="label-eyebrow text-on-accent">Là où ça s'est arrêté</p>
                  <p className="mt-1 text-body text-ink">{projet.raisonAbandon}</p>
                </div>
              )}

              {/* Le cadrage demande que les projets arrêtés restent visibles
                  « avec leur état (%, raison) ». Le pourcentage est déduit du
                  journal : il dit où le travail s'est arrêté, pas ce qu'il
                  vaut. */}
              <div className="mt-4">
                <Progress
                  valeur={progressOf(projet.id)}
                  libelle="État à l'arrêt"
                  origine={`${entrees.length} entrée${entrees.length > 1 ? "s" : ""} de journal — déduit, pas déclaré`}
                />
              </div>

              <ChipRow className="mt-4">
                {projet.technos.map((t) => (
                  <Chip key={t}>{t}</Chip>
                ))}
              </ChipRow>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() => navigate({ name: "projet", id: projet.id })}
                >
                  Lire le journal
                </Button>
                {!mien && (
                  <Button
                    variant="primary"
                    onClick={() => {
                      reviveProject(projet.id);
                      navigate({ name: "projet", id: projet.id });
                    }}
                  >
                    <RotateCcw aria-hidden className="size-4" />
                    Reprendre
                  </Button>
                )}
              </div>

              {auteur && (
                <div className="mt-5 flex items-center gap-3 border-t border-border pt-4">
                  <Avatar initiales={auteur.initiales} nom={auteur.nom} taille="sm" />
                  <p className="text-caption text-ink-muted">
                    Reprendre ce projet préviendra {auteur.nom.split(" ")[0]}. C'est le
                    seul retour que SOA lui enverra.
                  </p>
                </div>
              )}
            </motion.article>
          );
        })}

        {visibles.length === 0 && (
          <EmptyState
            title={`Aucun projet arrêté en ${filtre}`}
            body="Change de filtre. Un projet arrêté n'est pas une honte : c'est une carte du terrain pour le suivant."
          />
        )}
      </motion.div>
    </Screen>
  );
}
