import { motion } from "framer-motion";

import { hrefFor } from "@/app/router";
import type { SearchHit } from "@/domain/types";
import { rise } from "@/lib/motion";
import { Chip, ChipRow } from "@/ui/Editorial";
import { Icon } from "@/ui/Icon";

/**
 * Un résultat de recherche.
 *
 * La correspondance est exprimée en mots, jamais en pourcentage ni en jauge :
 * un chiffre inviterait à comparer les résultats entre eux, ce qui rendrait la
 * recherche compétitive alors qu'elle est documentaire.
 *
 * Ce qui est mis en avant n'est pas le titre mais le **pourquoi** — ce que ce
 * travail fait gagner sur cette question précise. Un étudiant bloqué ne
 * choisit pas un document, il choisit une sortie de blocage.
 */

function matchLabel(relevance: number): string {
  if (relevance >= 0.85) return "Correspondance directe";
  if (relevance >= 0.5) return "Correspondance partielle";
  return "Voisin";
}

export function HitRow({
  hit,
  onOpen,
}: {
  hit: SearchHit;
  onOpen: (id: string) => void;
}) {
  const { fragment, relevance, why, matchedOn } = hit;
  const direct = relevance >= 0.85;

  return (
    <motion.li variants={rise}>
      <a
        href={hrefFor({ name: "fragment", id: fragment.id })}
        onClick={(event) => {
          event.preventDefault();
          onOpen(fragment.id);
        }}
        className="group block rounded-card border border-border bg-card p-6 shadow-card transition-[border-color,box-shadow,transform] duration-150 ease-out hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lift"
      >
        <div className="flex items-start justify-between gap-4">
          <ChipRow>
            {/* Le jaune dit « c'est acquis » (DESIGN.md) : une
                correspondance directe est le seul cas où le résultat ne
                demande pas d'arbitrage à celui qui cherche. */}
            <Chip tone={direct ? "accent" : "neutral"}>{matchLabel(relevance)}</Chip>
            <Chip>
              {fragment.origin.kind} · {fragment.origin.year}
            </Chip>
            <Chip tone={fragment.origin.status === "terminé" ? "success" : "neutral"}>
              {fragment.origin.status}
            </Chip>
          </ChipRow>

          <Icon
            name="arrowRight"
            size={20}
            aria-hidden
            className="mt-1 shrink-0 text-ink-muted transition-transform duration-150 ease-out group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
          />
        </div>

        <h3 className="mt-5 text-title font-semibold text-ink">{fragment.title}</h3>
        <p className="prose-measure mt-2 text-body text-ink-muted">{why}</p>

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-4">
          <span className="text-caption text-ink-muted">{fragment.author.name}</span>
          {matchedOn.length > 0 && (
            <span className="font-mono text-caption text-ink-muted">
              {matchedOn.slice(0, 4).join(" · ")}
            </span>
          )}
        </div>
      </a>
    </motion.li>
  );
}
