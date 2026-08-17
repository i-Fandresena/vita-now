import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

/**
 * DESIGN.md — l'indigo porte l'action, le jaune porte la réussite.
 *
 * Conséquence directe : **aucune variante de bouton n'est jaune.** Un bouton
 * accent existerait au prix du signal : le jaune ne voudrait plus dire « c'est
 * fait », il voudrait dire « c'est cliquable », et l'écran perdrait sa lecture
 * immédiate. La célébration se fait avec des pastilles et des surlignages
 * (`.mark-accent`), jamais avec une action.
 */
/** Exportée pour styler un élément non-`<button>` (ex. un `<a download>`,
    voir `PortfolioScreen`) exactement comme un `Button` — sans imbriquer un
    lien dans un bouton, invalide en HTML. */
export const button = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-full font-medium",
    "transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out",
    "disabled:pointer-events-none disabled:opacity-40",
    // Le template appuie ses boutons : un enfoncement de 1px au clic suffit à
    // rendre la pression physique sans animer quoi que ce soit d'autre.
    "active:translate-y-px",
  ],
  {
    variants: {
      variant: {
        primary: "bg-primary text-on-primary shadow-card hover:bg-primary/90 hover:shadow-lift",
        secondary:
          "bg-card text-ink border border-border shadow-card hover:border-border-strong hover:shadow-lift",
        ghost: "text-ink-muted hover:bg-surface hover:text-ink",
        quiet: "text-ink-muted underline-offset-4 hover:text-ink hover:underline",
      },
      size: {
        sm: "h-9 px-4 text-caption",
        md: "h-11 px-5 text-body",
        lg: "h-13 px-7 text-body-lg",
        icon: "size-11 rounded-full px-0",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(button({ variant, size }), className)}
      {...props}
    />
  ),
);

Button.displayName = "Button";
