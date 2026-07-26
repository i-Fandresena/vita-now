import { motion, useReducedMotion } from "framer-motion";

import { EASE } from "@/lib/motion";

/**
 * Le repli obligatoire de la scène 3D (SPEC.md §2).
 *
 * Même métaphore, même durée, même courbe — en SVG. Il se déclenche sans
 * WebGL, sur `prefers-reduced-motion`, ou si la scène échoue à se charger.
 * Le produit ne doit jamais dépendre de la 3D pour raconter son histoire ;
 * c'est pourquoi ce repli n'est pas une version dégradée mais une seconde
 * exécution complète du même geste.
 */

const SHEETS = 7;
const SPREAD = 5.2;

export function SealFallback() {
  const reduced = useReducedMotion() ?? false;
  const middle = (SHEETS - 1) / 2;

  return (
    <svg
      viewBox="0 0 260 90"
      aria-hidden
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      {Array.from({ length: SHEETS }, (_, i) => {
        const offset = i - middle;
        return (
          <motion.rect
            key={i}
            x={40}
            y={45}
            width={180}
            height={2.4}
            rx={1}
            fill={i % 2 === 0 ? "#c9cfe0" : "#dfe3ee"}
            initial={{ y: 45, rotate: 0 }}
            animate={{ y: 45 + offset * SPREAD, rotate: offset * 0.35 }}
            style={{ originX: "130px", originY: "46px" }}
            transition={
              reduced
                ? { duration: 0.2 }
                : { duration: 0.9, delay: i * 0.055, ease: EASE.outExpo }
            }
          />
        );
      })}

      <motion.rect
        x={40}
        y={45}
        width={180}
        height={1}
        fill="#4b5cf0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.85 }}
        transition={reduced ? { duration: 0.2 } : { duration: 0.7, delay: 0.42 }}
      />
    </svg>
  );
}
