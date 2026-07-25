import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge doit connaître nos tokens, sinon il les confond.
 *
 * `text-body` (taille) et `text-canvas` (couleur) partagent le préfixe `text-`.
 * Sans cette configuration, la fusion les traite comme un même groupe et n'en
 * garde qu'un — ce qui faisait disparaître la couleur du bouton primaire :
 * du texte os sur un fond os, donc un rectangle blanc vide.
 *
 * Toute nouvelle valeur ajoutée à `theme.css` doit être déclarée ici.
 */
const COLORS = [
  "canvas",
  "surface",
  "raised",
  "hover",
  "sunken",
  "bone",
  "bone-2",
  "bone-3",
  "bone-4",
  "ember",
  "ember-dim",
  "ember-wash",
  "line-faint",
  "line-soft",
  "line-strong",
  "line-rule",
];

const FONT_SIZES = [
  "display-1",
  "display-2",
  "title",
  "body-lg",
  "body",
  "caption",
  "micro",
];

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: FONT_SIZES }],
      "text-color": [{ text: COLORS }],
      "bg-color": [{ bg: COLORS }],
      "border-color": [{ border: COLORS }],
      "divide-color": [{ divide: COLORS }],
    },
  },
});

/** Fusion de classes Tailwind : la dernière déclaration gagne, sans conflit. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
