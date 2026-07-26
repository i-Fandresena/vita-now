import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * SceneFallback — la même image, sans WebGL et sans les 860 ko de three.js.
 *
 * Il sert trois cas, et c'est ce qui justifie de l'écrire :
 *
 *   1. **Le temps de chargement.** Le hero est au-dessus de la ligne de
 *      flottaison ; sur une connexion lente, attendre le chunk 3D laisserait
 *      un trou de plusieurs secondes à l'endroit exact où le regard se pose en
 *      premier. Ici la place est tenue dès la première image.
 *   2. **L'absence de WebGL.** Machine de soutenance ancienne, pilote refusé,
 *      navigateur bridé : la page ne doit pas perdre son hero pour autant.
 *   3. **Le mouvement réduit.** La version statique dit la même chose.
 *
 * Il raconte la même métaphore que la scène : des feuillets épars. Il ne
 * s'assemble pas — c'est le seul renoncement, et il est acceptable : sans 3D,
 * l'assemblage au scroll ne se lirait pas de toute façon.
 */

/** Même dispersion déterministe que la scène, en projection plane. */
function dispersion(i: number) {
  const a = i * 2.399963;
  const r = 26 + (i % 5) * 9;
  return {
    x: 50 + Math.cos(a) * r * 0.9,
    y: 50 + Math.sin(a * 1.7) * r * 0.62,
    rot: Math.sin(i * 2.1) * 34,
    teinte: i % 3,
  };
}

export function SceneFallback({ actif = true }: { actif?: boolean }) {
  const reduced = useReducedMotion() ?? false;
  const feuillets = Array.from({ length: 15 }, (_, i) => dispersion(i));
  const teintes = ["#ffffff", "#e4e8f4", "#d2d8ea"];

  return (
    <div className="absolute inset-0 grid place-items-center">
      <svg
        viewBox="0 0 100 100"
        className="size-full max-h-full"
        role="img"
        aria-label="Des feuillets épars, en attente d'être rassemblés."
      >
        {feuillets.map((f, i) => (
          <motion.rect
            key={i}
            x={f.x - 9}
            y={f.y - 6}
            width={18}
            height={12}
            rx={1.4}
            fill={teintes[f.teinte]}
            stroke="#c2c9de"
            strokeWidth={0.3}
            transform={`rotate(${f.rot} ${f.x} ${f.y})`}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 0.5,
              delay: reduced ? 0 : i * 0.035,
              ease: [0.23, 1, 0.32, 1],
            }}
            style={
              // La respiration est portée par une animation CSS : elle tourne
              // hors du fil principal, contrairement à une boucle Framer.
              !reduced && actif
                ? {
                    animation: `floaty ${5 + (i % 4) * 0.7}s ease-in-out ${i * 0.18}s infinite`,
                  }
                : undefined
            }
          />
        ))}
      </svg>
    </div>
  );
}

/** Vrai si le contexte WebGL peut réellement être obtenu. */
export function useWebGL(): boolean | null {
  const [dispo, setDispo] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      setDispo(
        Boolean(
          window.WebGLRenderingContext &&
            (canvas.getContext("webgl2") ?? canvas.getContext("webgl")),
        ),
      );
    } catch {
      setDispo(false);
    }
  }, []);

  return dispo;
}
