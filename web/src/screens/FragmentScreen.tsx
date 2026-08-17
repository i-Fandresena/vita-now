import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

import { useRepository } from "@/app/repository";
import { hrefFor, type Route } from "@/app/router";
import { DEMO_CAPSULE } from "@/data/corpus";
import { Seal } from "@/features/fragment/Seal";
import type { Fragment } from "@/domain/types";
import { EASE, narrativeTransition } from "@/lib/motion";
import { Button } from "@/ui/Button";
import { Dialog } from "@/ui/Dialog";
import { ArchiveLabel, EditorialLayout, Rail, RailItem, Rule } from "@/ui/Editorial";
import { Icon } from "@/ui/Icon";
import { Surface } from "@/ui/Surface";
import { ErrorState, FragmentSkeleton } from "@/ui/states";

/**
 * Écran 2 — Fragment retrouvé. Premier des deux moments narratifs.
 *
 * Raisonnement UX
 * ───────────────
 * Ce que l'écran doit produire, ce n'est pas de l'information : c'est de la
 * **compréhension**. D'où trois partis pris.
 *
 * · Le raisonnement occupe la colonne principale, à 68 caractères de large.
 *   C'est de la prose, elle se lit. Un fragment présenté en puces serait un
 *   résumé — or ce qui se transmet, ce sont les liens entre les décisions.
 *
 * · Les impasses ont le même poids visuel que les choix. C'est contre-intuitif
 *   et c'est délibéré : ce qui fait gagner du temps à celui qui suit, ce n'est
 *   pas ce qui a marché, c'est ce qui a été essayé pour rien.
 *
 * · L'extrait de code est en dernier, en creux, sous-titré. SPEC.md §2
 *   interdit de mettre le code brut en avant. Il illustre le raisonnement,
 *   il ne le remplace pas — et rien n'invite à le copier.
 *
 * L'ouverture (sceau 3D + arrivée séquencée du texte) est l'un des deux seuls
 * endroits du produit où l'animation a un budget. Elle dure le temps de la
 * métaphore : quelque chose de clos s'entrouvre.
 */

interface FragmentScreenProps {
  id: string;
  navigate: (to: Route) => void;
}

export function FragmentScreen({ id, navigate }: FragmentScreenProps) {
  const repository = useRepository();
  const reduced = useReducedMotion() ?? false;
  const [fragment, setFragment] = useState<Fragment | null | "chargement">("chargement");
  const [declaring, setDeclaring] = useState(false);
  const [context, setContext] = useState(DEMO_CAPSULE.projectTitle);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let alive = true;
    setFragment("chargement");
    repository.getById(id).then((found) => {
      if (alive) setFragment(found);
    });
    return () => {
      alive = false;
    };
  }, [id, repository]);

  if (fragment === "chargement") {
    return (
      <div className="py-16">
        <FragmentSkeleton />
      </div>
    );
  }

  if (!fragment) {
    return (
      <ErrorState
        title="Cette fiche n’existe plus"
        body="Le lien pointe vers un travail qui a été retiré de l’index."
        action={
          <Button variant="secondary" onClick={() => navigate({ name: "memoire" })}>
            Revenir à la recherche
          </Button>
        }
      />
    );
  }

  async function declare() {
    if (fragment === "chargement" || !fragment) return;
    setSending(true);
    await repository.declareUse(fragment.id, context.trim() || DEMO_CAPSULE.projectTitle);
    setSending(false);
    setDeclaring(false);
    navigate({ name: "signal", id: fragment.id });
  }

  /** Arrivée séquencée du texte, calée sur l'ouverture du sceau. */
  const stage = (index: number) => ({
    initial: reduced ? { opacity: 0 } : { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: reduced
      ? { duration: 0.2 }
      : { duration: 0.6, delay: 0.22 + index * 0.07, ease: EASE.outExpo },
  });

  return (
    <article className="pb-24 pt-10">
      <a
        href={hrefFor({ name: "memoire" })}
        onClick={(event) => {
          event.preventDefault();
          navigate({ name: "memoire" });
        }}
        className="inline-flex items-center gap-2 rounded-sm text-caption text-ink-muted transition-colors duration-90 hover:text-ink"
      >
        <Icon name="back" size={14} aria-hidden />
        Résultats
      </a>

      <motion.div
        className="mt-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={narrativeTransition(reduced, 0.5)}
      >
        <Seal />
      </motion.div>

      <motion.h1
        {...stage(0)}
        className="mt-8 max-w-[22ch] text-balance font-display text-display-2 text-ink lg:max-w-[26ch]"
      >
        {fragment.title}
      </motion.h1>

      <motion.div {...stage(1)} className="mt-12">
        <EditorialLayout
          rail={
            <Rail>
              <RailItem label="Origine">{fragment.origin.work}</RailItem>
              <RailItem label="Nature">
                {fragment.origin.kind} · {fragment.origin.year}
              </RailItem>
              <RailItem label="État">{fragment.origin.status}</RailItem>
              <RailItem label="Auteur">
                {fragment.author.name}
                <span className="block text-ink-muted">
                  promotion {fragment.author.cohort}
                </span>
              </RailItem>
            </Rail>
          }
        >
          <div className="flex flex-col gap-14">
            <section>
              <ArchiveLabel>Le raisonnement</ArchiveLabel>
              <div className="mt-4 flex flex-col gap-5">
                {fragment.reasoning.split("\n\n").map((paragraph, index) => (
                  <p key={index} className="text-body-lg text-ink-muted">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>

            {fragment.choices.length > 0 && (
              <section>
                <ArchiveLabel>Les choix</ArchiveLabel>
                <ul className="mt-4 flex flex-col gap-6">
                  {fragment.choices.map((choice) => (
                    <li key={choice.decision}>
                      <p className="text-body font-medium text-ink">{choice.decision}</p>
                      <p className="mt-1.5 text-body text-ink-muted">{choice.rationale}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {fragment.deadEnds.length > 0 && (
              <section>
                <ArchiveLabel>Les impasses</ArchiveLabel>
                {/* Filet vertical : ce bloc est une mise en garde adressée à
                    celui qui lit, pas un inventaire. */}
                <ul className="mt-4 flex flex-col gap-5 border-l border-border pl-6">
                  {fragment.deadEnds.map((entry) => (
                    <li key={entry} className="text-body text-ink-muted">
                      {entry}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {fragment.leads.length > 0 && (
              <section>
                <ArchiveLabel>Les pistes</ArchiveLabel>
                <ul className="mt-4 flex flex-col gap-4">
                  {fragment.leads.map((lead) => (
                    <li key={lead} className="text-body text-ink-muted">
                      {lead}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {fragment.excerpt && (
              <section>
                <ArchiveLabel>Extrait cité</ArchiveLabel>
                <Surface tone="sunken" padding="sm" className="mt-4 overflow-x-auto">
                  <pre className="font-mono text-caption leading-relaxed text-ink-muted">
                    <code>{fragment.excerpt.code}</code>
                  </pre>
                </Surface>
                <p className="mt-3 text-caption text-ink-muted">
                  {fragment.excerpt.caption}
                </p>
              </section>
            )}

            <Rule />

            <section className="flex flex-col gap-4">
              <p className="text-body text-ink-muted">
                Si ce raisonnement t’a débloqué, {fragment.author.name} peut
                l’apprendre. C’est la seule chose que SOA renvoie à un auteur.
              </p>
              <div>
                <Button variant="primary" onClick={() => setDeclaring(true)}>
                  Ce fragment m’a débloqué
                </Button>
              </div>
            </section>
          </div>
        </EditorialLayout>
      </motion.div>

      <Dialog
        open={declaring}
        onOpenChange={setDeclaring}
        title="Sur quoi cela t’a-t-il débloqué ?"
        description="Cette phrase est la seule chose que l’auteur recevra. Elle doit être vraie et concrète."
      >
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label htmlFor="contexte" className="label-eyebrow">
              Ton travail en cours
            </label>
            <input
              id="contexte"
              value={context}
              onChange={(event) => setContext(event.target.value)}
              className="h-11 w-full rounded-sm border border-border bg-surface px-3 text-body text-ink transition-colors duration-90 hover:border-border-strong"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDeclaring(false)}>
              Annuler
            </Button>
            <Button variant="primary" onClick={declare} disabled={sending}>
              {sending ? "Envoi…" : "Envoyer le signal"}
            </Button>
          </div>
        </div>
      </Dialog>
    </article>
  );
}
