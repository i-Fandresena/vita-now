import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Editorial.tsx — les éléments de structure partagés par la landing et l'app.
 *
 * L'ancienne direction posait ici un « rail éditorial » en marge, façon appareil
 * de note. Le template travaille autrement : des **pastilles de métadonnées**
 * posées au-dessus du contenu, et des sections franches séparées par des fonds
 * alternés plutôt que par des filets. C'est ce vocabulaire-là qui vit ici.
 */

/** Séparateur discret. Rayon 0, 1px, jamais coloré. */
export function Rule({ className, ...props }: HTMLAttributes<HTMLHRElement>) {
  return <hr className={cn("h-px w-full border-0 bg-border", className)} {...props} />;
}

/** L'étiquette capitale — Bebas Neue, au-dessus d'un titre de section. */
export function Eyebrow({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn("label-eyebrow", className)} {...props}>
      {children}
    </span>
  );
}

/**
 * Pastille de métadonnée. C'est l'unité d'information secondaire du template :
 * une valeur courte, lisible d'un coup d'œil, jamais une phrase.
 */
export function Chip({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  /** `accent` est réservé à ce qui est acquis — DESIGN.md. */
  tone?: "neutral" | "primary" | "accent" | "success";
  className?: string;
}) {
  const tones = {
    neutral: "bg-surface text-ink-muted border-border",
    primary: "bg-primary-wash text-primary border-primary/20",
    accent: "bg-accent-soft text-on-accent border-accent",
    success: "bg-success/10 text-success border-success/25",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1",
        "text-caption font-medium whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Groupe de pastilles — s'enroule proprement sous 375px. */
export function ChipRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-wrap items-center gap-2", className)}>{children}</div>;
}

/* ── Héritage de l'ancienne direction ───────────────────────────────────────
 *
 * Les cinq écrans existants sont construits sur un vocabulaire de mise en page
 * « archive » : une étiquette capitale, un rail de métadonnées en marge. Ces
 * primitives sont conservées le temps que ces écrans soient réécrits module par
 * module (BACKLOG.md P1), mais **elles ne servent à aucun nouvel écran** — le
 * template travaille en pastilles et en sections, pas en marges annotées.
 */

/** Alias historique de `Eyebrow`. Ne pas employer sur un nouvel écran. */
export const ArchiveLabel = Eyebrow;

export function Rail({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-x-8 gap-y-4",
        "lg:w-52 lg:shrink-0 lg:flex-col lg:gap-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function RailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Eyebrow>{label}</Eyebrow>
      <span className="text-caption text-ink-muted">{children}</span>
    </div>
  );
}

export function EditorialLayout({
  rail,
  children,
  className,
}: {
  rail: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-10 lg:flex-row lg:gap-16", className)}>
      {rail}
      <div className="prose-measure min-w-0 flex-1">{children}</div>
    </div>
  );
}

/**
 * Section de page. Le template alterne fond blanc et fond `surface` pour
 * découper la landing — c'est ce qui remplace les filets de l'ancienne
 * direction.
 */
export function Section({
  children,
  tone = "background",
  className,
  ...props
}: HTMLAttributes<HTMLElement> & { tone?: "background" | "surface" | "ink" }) {
  const tones = {
    background: "bg-background",
    surface: "bg-surface",
    ink: "bg-ink text-background",
  } as const;

  return (
    <section className={cn("py-20 md:py-28", tones[tone], className)} {...props}>
      <div className="page-measure">{children}</div>
    </section>
  );
}

/** En-tête de section : étiquette, titre display, chapô. */
export function SectionHead({
  eyebrow,
  title,
  lede,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-4", className)}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="max-w-[18ch] text-balance font-display text-display-2 text-ink">
        {title}
      </h2>
      {lede && <p className="prose-measure text-body-lg text-ink-muted">{lede}</p>}
    </header>
  );
}
