import { motion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * Confetti.tsx — la fête, hors cadrage (addition demandée directement).
 *
 * Fait main avec `framer-motion` (déjà une dépendance) plutôt qu'avec
 * `canvas-confetti` : le bundle est déjà signalé trop lourd au build
 * (`web/vite.config.ts` avertit sur les chunks > 500 Ko), et une trentaine de
 * petits éléments animés ne justifie pas un paquet de plus. Couleurs prises
 * dans les tokens existants (primary/accent/success) — pas de nouvelle
 * couleur pour une célébration.
 */

interface Particule {
  id: number;
  x: number;
  y: number;
  rotation: number;
  couleur: string;
  largeur: number;
  hauteur: number;
  delai: number;
}

const COULEURS = ["bg-primary", "bg-accent", "bg-success"] as const;

function genererParticules(): Particule[] {
  return Array.from({ length: 36 }, (_, i) => {
    const angle = Math.random() * Math.PI * 2;
    const distance = 90 + Math.random() * 170;
    return {
      id: i,
      x: Math.cos(angle) * distance,
      // Léger biais vers le haut : une explosion qui monte se lit mieux
      // qu'une qui tombe, pour une célébration plutôt qu'une pluie.
      y: Math.sin(angle) * distance - 60,
      rotation: Math.random() * 360,
      couleur: COULEURS[i % COULEURS.length]!,
      largeur: 5 + Math.random() * 5,
      hauteur: 8 + Math.random() * 8,
      delai: Math.random() * 0.12,
    };
  });
}

/**
 * `declencheur` : un compteur qui augmente à chaque célébration. L'effet ne
 * réagit qu'à un changement de valeur — jamais au montage initial (0), pour
 * ne pas lancer de confettis simplement parce que la page vient de charger.
 */
export function Confetti({ declencheur }: { declencheur: number }) {
  const [particules, setParticules] = useState<Particule[]>([]);

  useEffect(() => {
    if (declencheur === 0) return;
    setParticules(genererParticules());
    const minuterie = window.setTimeout(() => setParticules([]), 1300);
    return () => window.clearTimeout(minuterie);
  }, [declencheur]);

  if (particules.length === 0) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-24 z-[60] flex justify-center"
    >
      <div className="relative size-0">
        {particules.map((p) => (
          <motion.span
            key={p.id}
            className={`absolute rounded-xs ${p.couleur}`}
            style={{ width: p.largeur, height: p.hauteur }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0 }}
            animate={{
              x: p.x,
              y: p.y,
              opacity: 0,
              rotate: p.rotation,
              transition: { duration: 1.1, delay: p.delai, ease: "easeOut" },
            }}
          />
        ))}
      </div>
    </div>
  );
}
