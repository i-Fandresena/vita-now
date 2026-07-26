import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

/**
 * Surface — l'unité d'élévation du produit.
 *
 * DESIGN.md : sur fond clair, l'ombre portée porte réellement. C'est
 * l'inverse de l'ancienne direction sombre, où l'élévation passait par la
 * luminance de bordure et un filet de lumière interne. Ici : ombre douce +
 * bordure fine + le grand rayon de 20px, qui est la signature de forme du
 * template.
 */
const surface = cva("rounded-card", {
  variants: {
    tone: {
      /** Posée sur le fond. Le cas courant. */
      card: "bg-card border border-border shadow-card",
      /** Détachée : dialogue, carte de démonstration, élément flottant. */
      float: "bg-card border border-border shadow-float",
      /** En creux : citation, extrait, zone secondaire. Pas d'ombre. */
      sunken: "bg-surface border border-border",
      /** Sans fond : structure uniquement, délimitée par un contour. */
      outline: "border border-border",
      /** Zone de réussite — le seul emploi du jaune sur une surface. */
      accent: "bg-accent-soft border border-accent",
      /**
       * Carte à bord franc — le vocabulaire brutaliste de la landing publique.
       * Contour d'encre de 2px et ombre pleine sans flou : la carte est un objet
       * découpé et posé, pas une surface qui lévite. Réservée aux écrans
       * publics ; dans l'application, une carte par ligne de tableau avec ce
       * contour rendrait la lecture bruyante.
       */
      hard: "bg-card border-2 border-ink shadow-hard",
      /** Aucun contenant visible — pour composer sans hériter d'un style. */
      bare: "",
    },
    padding: {
      none: "",
      sm: "p-4",
      md: "p-6",
      lg: "p-8",
    },
  },
  defaultVariants: { tone: "card", padding: "md" },
});

export interface SurfaceProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof surface> {}

export const Surface = forwardRef<HTMLDivElement, SurfaceProps>(
  ({ className, tone, padding, ...props }, ref) => (
    <div ref={ref} className={cn(surface({ tone, padding }), className)} {...props} />
  ),
);

Surface.displayName = "Surface";
