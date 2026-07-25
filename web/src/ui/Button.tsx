import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

/**
 * Le bouton primaire est **os sur encre**, jamais braise.
 * La braise ne peut pas servir d'accent d'interface — DESIGN.md §3.3 la réserve
 * aux deux moments narratifs et au focus clavier. Un bouton coloré viderait
 * ce signal de son sens.
 */
const button = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap",
    "rounded-control font-medium",
    "transition-[background-color,border-color,color,opacity] duration-90 ease-out",
    "disabled:pointer-events-none disabled:opacity-40",
  ],
  {
    variants: {
      variant: {
        primary: "bg-bone text-canvas hover:bg-bone-2",
        secondary:
          "bg-raised text-bone border border-line-soft lift hover:bg-hover hover:border-line-strong",
        ghost: "text-bone-2 hover:bg-raised hover:text-bone",
        quiet: "text-bone-3 hover:text-bone",
      },
      size: {
        sm: "h-8 px-3 text-caption",
        md: "h-11 px-4 text-body",
        lg: "h-12 px-6 text-body",
        icon: "size-11",
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
