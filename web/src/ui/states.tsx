import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * states.tsx — vide, chargement, erreur.
 *
 * Le registre du template est encourageant, pas neutre : un écran vide y est
 * une invitation à agir. Ce qui reste interdit (SPEC.md §2bis), c'est la
 * culpabilisation — « déjà 4 jours sans rien faire ». Un état vide propose une
 * action ; il ne compte pas les jours perdus.
 */

/* ── Chargement ─────────────────────────────────────────────────────────── */

/**
 * Skeleton — opacité seule.
 * Volontairement lent : une pulsation rapide crée de l'anxiété, or le produit
 * doit rester calme même quand il attend.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-sm bg-surface [animation-duration:1.8s]",
        className,
      )}
    />
  );
}

/** Silhouette d'un résultat de recherche : métadonnées courtes + trois lignes. */
export function FragmentSkeleton() {
  return (
    <div className="flex flex-col gap-6 rounded-card border border-border p-6">
      <div className="flex gap-3">
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    </div>
  );
}

/** Indicateur d'attente en ligne. Trois points dont l'opacité respire. */
export function Pending({ label }: { label: string }) {
  return (
    <p role="status" className="flex items-center gap-2 text-caption text-ink-muted">
      <span aria-hidden className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 animate-pulse rounded-full bg-primary-soft [animation-duration:1.4s]"
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
  /** Ce qui s'est passé, et quoi faire ensuite. Jamais un reproche. */
  body: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, body, action, className }: StateProps) {
  return (
    <section
      className={cn(
        "flex flex-col items-start gap-5 rounded-card border border-border bg-surface p-8",
        className,
      )}
    >
      <div className="prose-measure flex flex-col gap-3">
        <h2 className="font-heading text-heading text-ink">{title}</h2>
        <p className="text-body text-ink-muted">{body}</p>
      </div>
      {action}
    </section>
  );
}

export function ErrorState({ title, body, action, className }: StateProps) {
  return (
    <section
      role="alert"
      className={cn(
        "flex flex-col items-start gap-5 rounded-card border border-destructive/30 bg-destructive/5 p-8",
        className,
      )}
    >
      <div className="prose-measure flex flex-col gap-3">
        <h2 className="font-heading text-heading text-ink">{title}</h2>
        <p className="text-body text-ink-muted">{body}</p>
      </div>
      {action}
    </section>
  );
}
