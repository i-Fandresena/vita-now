import type { Transition, Variants } from "framer-motion";

/**
 * motion.ts — le vocabulaire de mouvement du produit (DESIGN.md).
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
  /** Niveau fonctionnel — plafonné à 200 ms par DESIGN.md. */
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

/* ── Défilement — la landing publique uniquement ────────────────────────── */

/**
 * Apparition au défilement, section par section.
 *
 * **Ce geste est une dérogation, et il faut la connaître.** La règle du projet
 * dit « pas de reveal-au-scroll » : sur un outil qu'on ouvre tous les jours, du
 * contenu qui attend d'être vu pour s'afficher se paie à chaque visite. La
 * landing publique, elle, se parcourt une fois, d'un bout à l'autre, et le
 * défilement y est le geste principal — c'est le seul endroit où l'argument ne
 * tient pas.
 *
 * Elle reste donc bornée par ce que la règle protégeait :
 *
 *   · `transform` et `opacity` seuls, jamais une propriété qui repeint ;
 *   · 12px de montée, pas 40 — on lit une arrivée, pas un défilé ;
 *   · rien en cascade à l'intérieur d'une section : c'est la section qui
 *     arrive, pas ses dix enfants l'un après l'autre.
 *
 * Sous `prefers-reduced-motion`, l'appelant doit sauter ces variantes
 * entièrement — voir `Section`. Le contenu s'affiche alors sans condition.
 */
export const revealTransition: Transition = {
  duration: 0.45,
  ease: EASE.outExpo,
};

export const reveal: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: revealTransition },
};

/**
 * Réglage du déclenchement au défilement.
 *
 * `once: false` — la transition se rejoue à **chaque** passage, dans les deux
 * sens. C'est un choix, et il a une contrepartie qu'il faut connaître : quand
 * une section quitte l'écran, elle repasse par son état de départ. Elle
 * s'efface donc légèrement au bord au moment où elle sort, et se rejoue au
 * retour. Repasser à `true` fige chaque section après sa première arrivée.
 *
 * `amount: 0.1` — la section s'anime dès qu'un dixième en est visible.
 * Le seuil est bas pour deux raisons opposées. Trop haut, une section plus
 * grande que la fenêtre ne se déclencherait jamais : son sommet touche déjà le
 * bas de l'écran alors que le seuil n'est pas atteint, et elle resterait
 * invisible. Trop haut aussi, la sortie se produirait alors qu'une large bande
 * est encore à l'écran — et l'effacement, discret à 10 %, deviendrait visible.
 */
export const REVEAL_VIEWPORT = { once: false, amount: 0.1 } as const;

/**
 * Arrivée d'un élément dans une liste, décalée par son rang.
 *
 * Les éléments héritent des états `hidden` / `visible` de leur section — Framer
 * Motion propage le nom de l'état à ses descendants animés — donc aucun d'eux
 * n'a besoin de son propre déclencheur au défilement, et aucun ne peut arriver
 * avant la section qui le contient.
 *
 * **Aucune opacité, jamais.** Le fondu appartient à la section. Le doubler
 * donnerait des éléments qui s'éclaircissent à l'intérieur d'un bloc qui
 * s'éclaircit : le fondu paraît alors sale, et c'est l'erreur la plus courante
 * dès qu'on empile deux niveaux d'animation.
 *
 * Le pas se choisit à l'usage, et il porte du sens :
 *   · ~50 ms pour une grille, où l'ordre ne dit rien — on veut seulement que
 *     les cellules ne tombent pas toutes d'un bloc ;
 *   · ~130 ms pour une séquence, où l'ordre **est** l'information.
 * Un pas long sur une liste sans ordre fait attendre le dernier élément pour
 * rien.
 */
export const staggerItem = (pas = 0.07, distance = 14): Variants => ({
  hidden: { y: distance },
  visible: (index: number) => ({
    y: 0,
    transition: { duration: 0.42, ease: EASE.outExpo, delay: index * pas },
  }),
});

/* ── Accessibilité ──────────────────────────────────────────────────────── */

/**
 * DESIGN.md : sous `prefers-reduced-motion`, le niveau fonctionnel tombe
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
