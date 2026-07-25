import type { Transition, Variants } from "framer-motion";

/**
 * motion.ts — le vocabulaire de mouvement du produit (DESIGN.md §5).
 *
 * Système à deux niveaux :
 *
 *   NARRATIF   2 moments seulement — l'ouverture du fragment, le retour à
 *              l'auteur. Orchestration, 3D, couleur. Budget illimité.
 *
 *   FONCTIONNEL  tout le reste. Doit être invisible : ≤ 200 ms,
 *                `transform` et `opacity` uniquement, aucun stagger décoratif.
 *
 * Un composant qui a besoin d'un geste absent de ce fichier doit d'abord
 * justifier ce geste dans DESIGN.md. C'est ce qui empêche la dérive
 * décorative sous pression de temps.
 */

type Bezier = [number, number, number, number];

export const EASE = {
  outExpo: [0.16, 1, 0.3, 1] as Bezier,
  inOutQuint: [0.65, 0, 0.35, 1] as Bezier,
  narrative: [0.22, 0.61, 0.2, 1] as Bezier,
} as const;

export const DURATION = {
  /** Niveau fonctionnel — plafonné à 200 ms par DESIGN.md §5.2. */
  enter: 0.14,
  exit: 0.1,
  hover: 0.09,
  layout: 0.18,
  /** Niveau narratif — les deux seuls dépassements autorisés. */
  fragmentOpen: 0.9,
  authorReturn: 1.4,
} as const;

/* ── Transitions fonctionnelles ─────────────────────────────────────────── */

export const enterTransition: Transition = {
  duration: DURATION.enter,
  ease: EASE.outExpo,
};

export const exitTransition: Transition = {
  duration: DURATION.exit,
  ease: "linear",
};

export const layoutTransition: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 34,
};

/* ── Variants fonctionnels ──────────────────────────────────────────────── */

/** Fondu pur. Le geste par défaut quand rien d'autre n'est justifié. */
export const fade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: enterTransition },
  exit: { opacity: 0, transition: exitTransition },
};

/**
 * Fondu + 4px de montée. Le seul déplacement autorisé au niveau fonctionnel.
 * 4px, pas 12 : à 12px cela devient une animation, à 4px cela reste une arrivée.
 */
export const rise: Variants = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0, transition: enterTransition },
  exit: { opacity: 0, transition: exitTransition },
};

/**
 * Séquencement de fratrie — autorisé UNIQUEMENT quand l'ordre porte du sens
 * (une liste de fragments arrive par pertinence décroissante), jamais pour
 * décorer. Décalage volontairement court : on lit un ordre, pas une cascade.
 */
export const sequence = (stagger = 0.035): Variants => ({
  hidden: {},
  visible: { transition: { staggerChildren: stagger } },
  exit: {},
});

/* ── Accessibilité ──────────────────────────────────────────────────────── */

/**
 * DESIGN.md §5.4 : sous `prefers-reduced-motion`, le niveau fonctionnel tombe
 * à zéro et le niveau narratif se dégrade en fondu. Le récit reste lisible
 * sans mouvement — il ne disparaît pas.
 */
export function reduceVariants(variants: Variants, reduced: boolean): Variants {
  if (!reduced) return variants;
  return {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.2 } },
    exit: { opacity: 0, transition: { duration: 0.15 } },
  };
}

export function narrativeTransition(reduced: boolean, duration: number): Transition {
  return reduced
    ? { duration: 0.2, ease: "linear" }
    : { duration, ease: EASE.narrative };
}
