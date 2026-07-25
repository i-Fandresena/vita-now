import { Canvas, useFrame } from "@react-three/fiber";
import { useRef, useState } from "react";
import * as THREE from "three";

/**
 * L'unique scène 3D du produit (PRODUCT.md §5, DESIGN.md §6).
 *
 * Ce qu'elle raconte : un travail relié, resté fermé, qui s'entrouvre. Les
 * feuillets étaient superposés, comprimés, indistincts — comme un mémoire au
 * fond d'une étagère. Ils se séparent, et une ligne de braise apparaît dans
 * l'interstice : de la lumière sort de ce qui était clos.
 *
 * Discipline de performance :
 *   · 8 maillages, géométries primitives, aucune texture, aucun post-traitement.
 *   · La boucle de rendu s'arrête dès que le mouvement est terminé. Une scène
 *     3D qui tourne en continu derrière un texte à lire est un défaut, pas un
 *     effet — et c'est la première cause de chute d'images en démonstration.
 *   · `dpr` plafonné : au-delà de 1,75 le gain est invisible et le coût réel.
 */

const SHEETS = 7;
const DURATION = 0.9;
const SHEET_DELAY = 0.055;
/** Écart final entre feuillets. En dessous de 0,08 la séparation ne se lit
 *  plus et l'objet redevient un bloc indistinct. */
const GAP = 0.086;

/** Sortie exponentielle — la même courbe que `--ease-out-expo` en CSS. */
function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function Sheets({ onSettled }: { onSettled: () => void }) {
  const sheets = useRef<(THREE.Mesh | null)[]>([]);
  const ember = useRef<THREE.Mesh>(null);
  const startedAt = useRef<number | null>(null);
  const done = useRef(false);

  useFrame(({ clock }) => {
    if (done.current) return;
    if (startedAt.current === null) startedAt.current = clock.elapsedTime;

    const elapsed = clock.elapsedTime - startedAt.current;
    const middle = (SHEETS - 1) / 2;

    for (let i = 0; i < SHEETS; i += 1) {
      const mesh = sheets.current[i];
      if (!mesh) continue;

      const progress = easeOutExpo(clamp01((elapsed - i * SHEET_DELAY) / DURATION));
      const offset = i - middle;

      mesh.position.y = offset * GAP * progress;
      // Très légère ouverture en éventail : 2,3° au maximum sur le feuillet
      // extrême. Au-delà, l'objet devient un accordéon et perd son sérieux.
      mesh.rotation.z = offset * 0.006 * progress;
      mesh.rotation.x = offset * 0.004 * progress;
    }

    if (ember.current) {
      const material = ember.current.material as THREE.MeshBasicMaterial;
      material.opacity = easeOutExpo(clamp01((elapsed - 0.42) / 0.7)) * 0.85;
    }

    if (elapsed > DURATION + SHEETS * SHEET_DELAY + 0.2) {
      done.current = true;
      onSettled();
    }
  });

  return (
    <group>
      {Array.from({ length: SHEETS }, (_, i) => (
        <mesh
          key={i}
          ref={(node) => {
            sheets.current[i] = node;
          }}
          castShadow={false}
          receiveShadow={false}
        >
          <boxGeometry args={[2.6, 0.018, 1.7]} />
          {/* Alternance de valeurs : sans elle, sept plans identiques éclairés
              par la même lumière se confondent en un seul volume. */}
          <meshStandardMaterial
            color={i % 2 === 0 ? "#454e63" : "#333b4a"}
            roughness={0.82}
            metalness={0}
          />
        </mesh>
      ))}

      {/* La braise : une ligne de lumière dans l'interstice. Elle n'éclaire
          rien — elle indique. */}
      <mesh ref={ember} position={[0, 0.012, 0.86]}>
        <boxGeometry args={[2.6, 0.005, 0.01]} />
        <meshBasicMaterial color="#f0a35c" transparent opacity={0} toneMapped={false} />
      </mesh>
    </group>
  );
}

export default function SealScene() {
  const [settled, setSettled] = useState(false);

  return (
    <Canvas
      // Après le geste, plus une seule image n'est calculée.
      frameloop={settled ? "demand" : "always"}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 1.05, 3.15], fov: 28 }}
      style={{ pointerEvents: "none" }}
    >
      <ambientLight intensity={0.4} />
      {/* Clé rasante depuis la gauche : c'est elle qui dessine la tranche de
          chaque feuillet. Un éclairage frontal aplatirait l'objet. */}
      <directionalLight position={[-3.4, 2.6, 1.8]} intensity={1.8} />
      {/* Contre-jour faible : détache le bord droit du fond. */}
      <directionalLight position={[2.8, 1.4, -2.2]} intensity={0.5} />
      <Sheets onSettled={() => setSettled(true)} />
    </Canvas>
  );
}
