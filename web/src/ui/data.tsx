import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * data.tsx — les primitives d'affichage de données.
 *
 * Toutes suivent la même règle, tirée du cadrage et de la checklist UX :
 * **une valeur ne s'affiche jamais seule.** Un pourcentage sans son unité de
 * mesure, une jauge sans son libellé, une barre sans ses chiffres obligent à
 * deviner — et ce qu'on devine, on le devine faux.
 *
 * Corollaire d'accessibilité (`color-not-only`) : aucune de ces primitives ne
 * transmet son information par la seule couleur. Chacune porte un texte.
 */

/* ── Tuile de statistique ───────────────────────────────────────────────── */

export function Stat({
  valeur,
  libelle,
  detail,
  ton = "neutral",
  className,
}: {
  valeur: ReactNode;
  libelle: string;
  detail?: string;
  ton?: "neutral" | "primary" | "accent" | "success";
  className?: string;
}) {
  const tons = {
    neutral: "text-ink",
    primary: "text-primary",
    accent: "text-on-accent",
    success: "text-success",
  } as const;

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1 rounded-card border border-border bg-card p-4",
        className,
      )}
    >
      <span className={cn("font-display text-display-3 tabular-nums", tons[ton])}>
        {valeur}
      </span>
      <span className="text-caption font-medium text-ink">{libelle}</span>
      {detail && <span className="text-caption text-ink-muted">{detail}</span>}
    </div>
  );
}

/* ── Barre de progression ───────────────────────────────────────────────── */

/**
 * Utilisée **uniquement** pour un avancement vérifiable (journal ou
 * checklist cochée), jamais comme jauge de gamification : SPEC.md §2bis
 * interdit les compteurs de complétion dans un chemin de reprise. Elle porte
 * donc toujours son chiffre en clair et la phrase qui dit d'où il vient.
 */
export function Progress({
  valeur,
  libelle,
  origine,
  className,
}: {
  valeur: number;
  libelle: string;
  origine?: string;
  className?: string;
}) {
  const borne = Math.max(0, Math.min(100, Math.round(valeur)));

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-caption font-medium text-ink">{libelle}</span>
        <span className="text-caption tabular-nums text-ink-muted">{borne}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={borne}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={libelle}
        className="h-2 w-full overflow-hidden rounded-full bg-surface"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out motion-reduce:transition-none"
          style={{ width: `${borne}%` }}
        />
      </div>
      {origine && <p className="text-caption text-ink-muted">{origine}</p>}
    </div>
  );
}

/* ── Carte de rythme ────────────────────────────────────────────────────── */

/**
 * Douze semaines d'activité, en colonnes.
 *
 * Volontairement pas une heatmap façon GitHub : le cadrage rejette
 * explicitement « un nouveau GitHub », et la grille de contributions est le
 * symbole le plus reconnaissable de cet outil. Des colonnes hebdomadaires
 * disent la même chose sans emprunter la même image — et une semaine vide se
 * lit comme un fait, pas comme une case manquée dans une série.
 */
export function Rhythm({
  valeurs,
  libelle,
  className,
}: {
  valeurs: number[];
  libelle: string;
  className?: string;
}) {
  const max = Math.max(1, ...valeurs);
  const total = valeurs.reduce((a, b) => a + b, 0);

  return (
    <figure className={cn("flex flex-col gap-3", className)}>
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="text-caption font-medium text-ink">{libelle}</span>
        <span className="text-caption tabular-nums text-ink-muted">
          {total} entrée{total > 1 ? "s" : ""}
        </span>
      </figcaption>

      <div
        className="flex h-20 items-end gap-1.5"
        role="img"
        aria-label={`${libelle} : ${total} entrées sur douze semaines, de ${valeurs[0]} à ${valeurs[valeurs.length - 1]} par semaine.`}
      >
        {valeurs.map((v, i) => (
          <div key={i} className="flex h-full flex-1 flex-col justify-end">
            <div
              className={cn(
                "w-full rounded-sm",
                v === 0 ? "bg-border" : "bg-primary-soft",
                // La dernière semaine est celle qui compte : c'est maintenant.
                i === valeurs.length - 1 && v > 0 && "bg-primary",
              )}
              style={{ height: v === 0 ? "3px" : `${Math.max(12, (v / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>

      <div className="flex justify-between text-caption text-ink-muted">
        <span>il y a 12 semaines</span>
        <span>cette semaine</span>
      </div>
    </figure>
  );
}

/* ── Anneau de score ────────────────────────────────────────────────────── */

/**
 * E4 — le Project Reliability Score. Le cadrage insiste : indicateur
 * d'**engagement**, pas d'intelligence. L'anneau ne s'affiche donc jamais sans
 * le détail de ses cinq composantes, qui est le seul moyen de comprendre ce
 * qu'il mesure — et de contester ce qu'il prétend.
 */
export function ScoreRing({
  valeur,
  libelle,
  taille = 96,
}: {
  valeur: number;
  libelle: string;
  taille?: number;
}) {
  const rayon = (taille - 10) / 2;
  const circonference = 2 * Math.PI * rayon;
  const borne = Math.max(0, Math.min(100, valeur));

  return (
    <div className="flex items-center gap-4">
      <svg
        width={taille}
        height={taille}
        viewBox={`0 0 ${taille} ${taille}`}
        role="img"
        aria-label={`${libelle} : ${borne} sur 100`}
        className="shrink-0 -rotate-90"
      >
        <circle
          cx={taille / 2}
          cy={taille / 2}
          r={rayon}
          fill="none"
          strokeWidth={8}
          className="stroke-border"
        />
        <circle
          cx={taille / 2}
          cy={taille / 2}
          r={rayon}
          fill="none"
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={circonference}
          strokeDashoffset={circonference * (1 - borne / 100)}
          className="stroke-primary"
        />
      </svg>
      <div className="flex flex-col">
        <span className="font-display text-display-3 tabular-nums text-ink">{borne}</span>
        <span className="text-caption text-ink-muted">{libelle}</span>
      </div>
    </div>
  );
}

/* ── Avatar ─────────────────────────────────────────────────────────────── */

export function Avatar({
  initiales,
  nom,
  photoUrl,
  taille = "md",
  className,
}: {
  initiales: string;
  nom: string;
  /** Hors cadrage, addition — quand présente, remplace les initiales. */
  photoUrl?: string;
  taille?: "sm" | "md" | "lg";
  className?: string;
}) {
  const tailles = {
    sm: "size-8 text-caption",
    md: "size-10 text-body",
    lg: "size-16 text-title",
  } as const;

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt=""
        title={nom}
        className={cn(
          "shrink-0 rounded-full object-cover",
          tailles[taille],
          className,
        )}
      />
    );
  }

  return (
    <span
      aria-hidden
      title={nom}
      className={cn(
        "grid shrink-0 place-items-center rounded-full",
        "bg-primary-wash font-semibold text-primary",
        tailles[taille],
        className,
      )}
    >
      {initiales}
    </span>
  );
}

/* ── Ligne de définition ────────────────────────────────────────────────── */

export function DefRow({ terme, children }: { terme: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-border py-3 last:border-0 sm:flex-row sm:items-baseline sm:gap-6">
      <dt className="shrink-0 text-caption text-ink-muted sm:w-44">{terme}</dt>
      <dd className="min-w-0 text-body text-ink">{children}</dd>
    </div>
  );
}
