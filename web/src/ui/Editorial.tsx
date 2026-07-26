import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/cn";
import { REVEAL_VIEWPORT, reveal } from "@/lib/motion";

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
 *
 * Chaque section arrive au défilement. Le geste est porté ici, et non répété
 * dans chaque écran, pour une raison précise : c'est ce qui garantit que les
 * sections arrivent toutes de la même façon. Une animation posée section par
 * section dérive en trois semaines — l'une monte de 12px, la suivante de 40,
 * une troisième ajoute une échelle — et la page se met à bégayer.
 *
 * Sous `prefers-reduced-motion`, on ne rend pas un `motion.section` inerte : on
 * rend une `section` nue. Le contenu est alors visible sans dépendre d'un
 * observateur d'intersection, ce qui est la seule version dont on est certain
 * qu'elle s'affiche.
 */
export const Section = forwardRef<
  HTMLElement,
  HTMLAttributes<HTMLElement> & {
    tone?: "background" | "surface" | "ink" | "primary";
  }
>(function Section({ children, tone = "background", className, ...props }, ref) {
  const reduced = useReducedMotion() ?? false;
  const tones = {
    background: "bg-background",
    surface: "bg-surface",
    ink: "bg-ink text-background",
    /** Aplat d'action pleine page. Une section au plus par écran : l'indigo
        cesse de désigner ce sur quoi on clique s'il devient un fond courant. */
    primary: "bg-primary text-on-primary",
  } as const;

  const classes = cn("py-20 md:py-28", tones[tone], className);

  if (reduced) {
    return (
      <section ref={ref} className={classes} {...props}>
        <div className="page-measure">{children}</div>
      </section>
    );
  }

  return (
    <motion.section
      ref={ref}
      className={classes}
      variants={reveal}
      initial="hidden"
      whileInView="visible"
      viewport={REVEAL_VIEWPORT}
      {...(props as HTMLMotionProps<"section">)}
    >
      <div className="page-measure">{children}</div>
    </motion.section>
  );
});

/**
 * En-tête de section : étiquette, titre display, chapô.
 *
 * `align="center"` ne centre pas seulement le texte, il recentre aussi les
 * mesures : sans les marges automatiques, le titre resterait bloqué à gauche
 * de son bloc de 18 caractères et seules les lignes internes se centreraient.
 * C'est l'erreur classique de `text-center` sur un élément à largeur bornée.
 */
export function SectionHead({
  eyebrow,
  title,
  lede,
  align = "start",
  variant = "display",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  lede?: ReactNode;
  /**
   * `split` renvoie le chapô à droite du titre plutôt qu'en dessous. Le titre
   * gagne alors la pleine hauteur de la ligne et le chapô cesse de le
   * prolonger : ils se lisent comme deux blocs, pas comme un paragraphe qui
   * commence gros. En dessous de `md`, la disposition retombe en colonne — deux
   * colonnes de texte sur un téléphone donnent deux colonnes trop étroites.
   */
  align?: "start" | "center" | "split";
  /**
   * `mono` pose le titre en JetBrains Mono, en graisse normale. Anton est
   * grasse et condensée : elle assène. La monospace, à chasse fixe et sans
   * emphase, énonce — et laisse au mot marqué le soin d'être le seul accent de
   * la phrase. Réservé aux titres qui portent une marque de mot.
   */
  variant?: "display" | "mono";
  className?: string;
}) {
  const centre = align === "center";
  const scinde = align === "split";
  const mono = variant === "mono";

  const titre = (
    <h2
      className={cn(
        "text-balance text-ink",
        /* La mesure change avec la police : la monospace est nettement plus
           large à taille égale, 18 caractères y donneraient deux mots par
           ligne. L'interlignage s'ouvre aussi — une chasse fixe serrée
           devient un pavé illisible. */
        mono
          ? "max-w-[30ch] font-mono text-display-3 font-normal leading-[1.4] tracking-[-0.01em]"
          : "max-w-[18ch] font-display text-display-2",
        centre && "mx-auto",
      )}
    >
      {title}
    </h2>
  );

  if (scinde) {
    return (
      <header
        className={cn(
          "flex flex-col gap-6 md:flex-row md:items-end md:justify-between md:gap-16",
          className,
        )}
      >
        <div className="flex flex-col gap-4">
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          {titre}
        </div>
        {lede && (
          <p className="max-w-[46ch] text-body text-ink-muted md:shrink-0 md:text-right">
            {lede}
          </p>
        )}
      </header>
    );
  }

  return (
    <header
      className={cn("flex flex-col gap-4", centre && "items-center text-center", className)}
    >
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      {titre}
      {lede && (
        <p className={cn("prose-measure text-body-lg text-ink-muted", centre && "mx-auto")}>
          {lede}
        </p>
      )}
    </header>
  );
}
