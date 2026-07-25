import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Editorial.tsx — les éléments qui donnent au produit son registre d'archive
 * plutôt que de dashboard (DESIGN.md §1, §3.7).
 *
 * C'est ici que vit la signature de mise en page : un rail de métadonnées en
 * marge, des filets horizontaux, un label capitales unique. Pas de cartes
 * flottantes centrées — ce serait le template que le contrat interdit.
 */

/** Filet éditorial. Rayon 0, 1px, jamais coloré. */
export function Rule({ className, ...props }: HTMLAttributes<HTMLHRElement>) {
  return (
    <hr
      className={cn("h-px w-full border-0 bg-line-faint", className)}
      {...props}
    />
  );
}

/** Le label d'archive — seul usage de capitales du produit (DESIGN.md §4). */
export function ArchiveLabel({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn("label-archive", className)} {...props}>
      {children}
    </span>
  );
}

/**
 * Rail — appareil de note en marge.
 *
 * Sur écran large : colonne étroite à gauche, alignée en haut du bloc qu'elle
 * qualifie. Sous 1024px elle repasse au-dessus du contenu, en ligne — un rail
 * de 11rem sur mobile ne serait pas lisible.
 */
export function Rail({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-x-8 gap-y-4",
        "lg:w-(--measure-rail) lg:shrink-0 lg:flex-col lg:gap-6",
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
      <ArchiveLabel>{label}</ArchiveLabel>
      <span className="text-caption text-bone-2">{children}</span>
    </div>
  );
}

/**
 * Layout à deux colonnes : rail en marge, prose à mesure fixe.
 * C'est la structure de l'écran « fragment retrouvé » et de la capsule.
 */
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
