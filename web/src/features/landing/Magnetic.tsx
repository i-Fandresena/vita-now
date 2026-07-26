import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";

import { cn } from "@/lib/cn";

/**
 * Magnetic — le contenu suit légèrement le pointeur, avec un ressort.
 *
 * Lier la translation directement à la position de la souris donne un résultat
 * artificiel : le mouvement n'a ni masse ni retard. C'est le ressort qui fait
 * la différence entre « ça bouge » et « c'est vivant ».
 *
 * Trois bornes, et chacune a sa raison :
 *
 *   · **6 px au maximum.** Au-delà, le bouton fuit le curseur au lieu de
 *     l'accueillir, et viser devient plus difficile. C'est un plaisir, jamais
 *     une aide à la visée.
 *   · **Pointeur fin uniquement.** Sur un écran tactile l'effet n'existe pas :
 *     le calcul serait pur gaspillage, et `:hover` s'y déclenche au toucher.
 *   · **Éteint sous mouvement réduit.** Le geste est décoratif de bout en
 *     bout ; c'est exactement ce que ce réglage demande de retirer.
 *
 * Les valeurs passent par `useMotionValue` : rien ne remonte dans l'état React,
 * donc aucun rendu n'est déclenché pendant le déplacement du pointeur.
 */
export function Magnetic({
  children,
  force = 6,
  className,
}: {
  children: ReactNode;
  force?: number;
  className?: string;
}) {
  const reduced = useReducedMotion() ?? false;
  const ref = useRef<HTMLDivElement>(null);
  const [pointeurFin, setPointeurFin] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 90, damping: 18, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 90, damping: 18, mass: 0.6 });

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    setPointeurFin(mq.matches);
    const onChange = () => setPointeurFin(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const actif = pointeurFin && !reduced;

  function bouge(event: PointerEvent<HTMLDivElement>) {
    if (!actif || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set(((event.clientX - (r.left + r.width / 2)) / (r.width / 2)) * force);
    y.set(((event.clientY - (r.top + r.height / 2)) / (r.height / 2)) * force);
  }

  return (
    <motion.div
      ref={ref}
      onPointerMove={bouge}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
      style={actif ? { x: sx, y: sy } : undefined}
      className={cn("inline-flex", className)}
    >
      {children}
    </motion.div>
  );
}
