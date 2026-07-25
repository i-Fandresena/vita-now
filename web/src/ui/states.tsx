import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import { Rule } from "./Editorial";

/**
 * states.tsx — vide, chargement, erreur.
 *
 * Aucun de ces états n'utilise d'illustration ni d'icône décorative
 * (DESIGN.md §2). Le produit parle en phrases, pas en pictogrammes.
 * Aucun ne s'excuse et aucun n'encourage : ce sont des constats.
 */

/* ── Chargement ─────────────────────────────────────────────────────────── */

/**
 * Skeleton — opacité seule (DESIGN.md §5.4).
 * Volontairement lent : une pulsation rapide crée de l'anxiété, or le produit
 * doit rester calme même quand il attend.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-control bg-line-faint [animation-duration:1.8s]",
        className,
      )}
    />
  );
}

/** Silhouette d'un résultat de recherche : rail court + trois lignes de prose. */
export function FragmentSkeleton() {
  return (
    <div className="flex flex-col gap-10 py-8 lg:flex-row lg:gap-16">
      <div className="flex gap-8 lg:w-(--measure-rail) lg:shrink-0 lg:flex-col lg:gap-6">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="prose-measure flex flex-1 flex-col gap-4">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    </div>
  );
}

/**
 * Indicateur d'attente en ligne. Trois points dont l'opacité respire —
 * seule animation en boucle autorisée par DESIGN.md §5.4.
 */
export function Pending({ label }: { label: string }) {
  return (
    <p role="status" className="flex items-center gap-2 text-caption text-bone-3">
      <span aria-hidden className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1 animate-pulse rounded-full bg-bone-4 [animation-duration:1.4s]"
            style={{ animationDelay: `${i * 0.16}s` }}
          />
        ))}
      </span>
      {label}
    </p>
  );
}

/* ── Vide & erreur ──────────────────────────────────────────────────────── */

interface StateProps {
  title: string;
  /** Un constat factuel. Jamais une formule d'encouragement. */
  body: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, body, action, className }: StateProps) {
  return (
    <section className={cn("prose-measure flex flex-col gap-6 py-16", className)}>
      <Rule />
      <div className="flex flex-col gap-3">
        <h2 className="font-display text-title font-normal text-bone">{title}</h2>
        <p className="text-body text-bone-3">{body}</p>
      </div>
      {action}
    </section>
  );
}

export function ErrorState({ title, body, action, className }: StateProps) {
  return (
    <section
      role="alert"
      className={cn("prose-measure flex flex-col gap-6 py-16", className)}
    >
      {/* L'erreur est le seul état qui se signale par un filet plus marqué —
          pas par de la couleur, qui appartient à la braise. */}
      <div className="h-px w-full bg-line-rule" />
      <div className="flex flex-col gap-3">
        <h2 className="font-display text-title font-normal text-bone">{title}</h2>
        <p className="text-body text-bone-3">{body}</p>
      </div>
      {action}
    </section>
  );
}
