import { motion } from "framer-motion";

import { hrefFor } from "@/app/router";
import type { SearchHit } from "@/domain/types";
import { rise } from "@/lib/motion";
import { ArchiveLabel } from "@/ui/Editorial";

/**
 * Un résultat de recherche.
 *
 * La correspondance est exprimée en mots, jamais en pourcentage ni en jauge :
 * un chiffre inviterait à comparer les fragments entre eux, ce qui est
 * exactement la mécanique de classement que le produit refuse.
 *
 * Ce qui est mis en avant n'est pas le titre mais la **promesse** — ce que le
 * fragment fait gagner. Un étudiant bloqué ne choisit pas un document, il
 * choisit une sortie de blocage.
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

  return (
    <motion.li variants={rise}>
      <a
        href={hrefFor({ name: "fragment", id: fragment.id })}
        onClick={(event) => {
          event.preventDefault();
          onOpen(fragment.id);
        }}
        className="group -mx-4 block rounded-surface px-4 py-8 transition-colors duration-90 hover:bg-surface"
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-16">
          <div className="flex flex-wrap gap-x-8 gap-y-3 lg:w-(--measure-rail) lg:shrink-0 lg:flex-col lg:gap-5">
            <div className="flex flex-col gap-1.5">
              <ArchiveLabel>{matchLabel(relevance)}</ArchiveLabel>
              <span className="text-caption text-bone-3">
                {fragment.origin.kind} · {fragment.origin.year}
              </span>
            </div>
            <div className="flex flex-col gap-1.5">
              <ArchiveLabel>Auteur</ArchiveLabel>
              <span className="text-caption text-bone-2">{fragment.author.name}</span>
            </div>
          </div>

          <div className="prose-measure min-w-0 flex-1">
            <h3 className="font-display text-[1.5rem] font-normal leading-snug text-bone transition-colors duration-90 group-hover:text-bone">
              {fragment.title}
            </h3>
            <p className="mt-3 text-body text-bone-2">{why}</p>

            {matchedOn.length > 0 && (
              <p className="mt-4 font-mono text-caption text-bone-4">
                {matchedOn.slice(0, 4).join(" · ")}
              </p>
            )}
          </div>
        </div>
      </a>
    </motion.li>
  );
}
