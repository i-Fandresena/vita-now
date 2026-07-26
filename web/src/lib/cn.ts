import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge doit connaître nos tokens, sinon il les confond.
 *
 * `text-body` (taille) et `text-ink` (couleur) partagent le préfixe `text-`.
 * Sans cette configuration, la fusion les traite comme un même groupe et n'en
 * garde qu'un — ce qui faisait disparaître la couleur du bouton primaire :
 * du texte blanc sur un fond blanc, donc un rectangle vide.
 *
 * Toute nouvelle valeur ajoutée à `theme.css` doit être déclarée ici.
 */
const COLORS = [
  "background",
  "surface",
  "card",
  "canvas",
  "ink",
  "ink-muted",
  "primary",
  "primary-soft",
  "primary-wash",
  "on-primary",
  "accent",
  "accent-soft",
  "on-accent",
  "success",
  "destructive",
  "on-destructive",
  "border",
  "border-strong",
];

const FONT_SIZES = [
  "display-hero",
  "display-1",
  "display-2",
  "display-3",
  "heading",
  "title",
  "body-lg",
  "body",
  "caption",
  "micro",
];

const FONT_FAMILIES = ["display", "heading", "sans", "hand", "mono"];

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: FONT_SIZES }],
      "font-family": [{ font: FONT_FAMILIES }],
      "text-color": [{ text: COLORS }],
      "bg-color": [{ bg: COLORS }],
      "border-color": [{ border: COLORS }],
      "divide-color": [{ divide: COLORS }],
      "ring-color": [{ ring: COLORS }],
    },
  },
});

/** Fusion de classes Tailwind : la dernière déclaration gagne, sans conflit. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
