import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

/**
 * Surface — l'unité d'élévation du produit.
 *
 * DESIGN.md §3.5 : sur fond sombre une ombre portée ne se voit pas, elle salit.
 * L'élévation se construit par luminance de fond + bordure + filet de lumière
 * interne. Aucune variante n'utilise `box-shadow` pour paraître « au-dessus ».
 */
const surface = cva("rounded-surface", {
  variants: {
    tone: {
      /** Posé sur le canevas. Le cas courant. */
      raised: "bg-surface border border-line-soft lift",
      /** En creux : citation, extrait, zone de lecture secondaire. */
      sunken: "bg-sunken border border-line-faint",
      /** Sans fond : structure uniquement, délimitée par un contour. */
      outline: "border border-line-soft",
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
  defaultVariants: { tone: "raised", padding: "md" },
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
