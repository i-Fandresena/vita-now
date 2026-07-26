import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";

/**
 * L'unique scène 3D du produit (SPEC.md §4, DESIGN.md).
 *
 * Ce qu'elle raconte : un travail relié, resté fermé, qui s'entrouvre. Les
 * feuillets étaient superposés, comprimés, indistincts — comme un mémoire au
 * fond d'une étagère. Ils se séparent, et une ligne de lumière apparaît dans
 * l'interstice.
 *
 * Ce qui a changé par rapport à la première version, et **pourquoi** :
 *
 *   · **Coins arrondis.** Des `boxGeometry` à angles vifs sont la signature
 *     visuelle du prototype 3D bâclé : le papier n'a pas d'arêtes à 90°. Une
 *     `ExtrudeGeometry` biseautée coûte un calcul unique au montage et change
 *     complètement la lecture de l'objet.
 *   · **Ombre portée réelle.** Sur fond blanc, sans contact au sol, l'objet
 *     flotte dans le vide et perd tout poids. Une seule lumière projette, sur
 *     un plan qui ne rend *que* l'ombre.
 *   · **Irrégularité.** Sept feuillets parfaitement alignés font imprimé 3D,
 *     pas papier. Un décalage déterministe de quelques millimètres par feuillet
 *     suffit à rendre la pile crédible — déterministe, pour que la démo se
 *     rejoue à l'identique.
 *   · **Dérive de caméra.** Un très léger recul pendant l'ouverture donne la
 *     parallaxe qui fait qu'un rendu « a l'air vrai ». Elle s'arrête avec le
 *     geste.
 *
 * Discipline de performance, inchangée :
 *   · 9 maillages, aucune texture, aucun post-traitement.
 *   · La boucle s'arrête dès le geste terminé. Une scène qui tourne en continu
 *     derrière un texte à lire est un défaut, et la première cause de chute
 *     d'images en soutenance.
 *   · Carte d'ombre 512² : au-delà, le coût est réel et le gain invisible sur
 *     une ombre aussi diffuse.
 */

const SHEETS = 7;
const DURATION = 0.9;
const SHEET_DELAY = 0.055;
/** Écart final entre feuillets. En dessous de 0,08 la séparation ne se lit
 *  plus et l'objet redevient un bloc indistinct. */
const GAP = 0.086;
const TOTAL = DURATION + SHEETS * SHEET_DELAY + 0.25;

/** Sortie exponentielle — la même courbe que `--ease-out-expo` en CSS. */
function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Décalage déterministe par feuillet. Pas de `Math.random()` : le mode
 * démonstration exige que deux exécutions donnent exactement la même image.
 */
function jitter(i: number, axe: number): number {
  return (Math.sin(i * 12.9898 + axe * 78.233) % 1) * 0.018;
}

/** Feuillet à coins arrondis et arêtes biseautées. */
function usePaperGeometry(): THREE.ExtrudeGeometry {
  return useMemo(() => {
    const l = 2.6;
    const p = 1.7;
    const r = 0.055;

    const forme = new THREE.Shape();
    forme.moveTo(-l / 2 + r, -p / 2);
    forme.lineTo(l / 2 - r, -p / 2);
    forme.quadraticCurveTo(l / 2, -p / 2, l / 2, -p / 2 + r);
    forme.lineTo(l / 2, p / 2 - r);
    forme.quadraticCurveTo(l / 2, p / 2, l / 2 - r, p / 2);
    forme.lineTo(-l / 2 + r, p / 2);
    forme.quadraticCurveTo(-l / 2, p / 2, -l / 2, p / 2 - r);
    forme.lineTo(-l / 2, -p / 2 + r);
    forme.quadraticCurveTo(-l / 2, -p / 2, -l / 2 + r, -p / 2);

    const geo = new THREE.ExtrudeGeometry(forme, {
      depth: 0.014,
      bevelEnabled: true,
      bevelThickness: 0.004,
      bevelSize: 0.004,
      bevelSegments: 2,
      curveSegments: 6,
    });
    // L'extrusion travaille dans le plan XY ; le papier est horizontal.
    geo.rotateX(-Math.PI / 2);
    geo.center();
    return geo;
  }, []);
}

function Sheets({ onSettled }: { onSettled: () => void }) {
  const geometrie = usePaperGeometry();
  const sheets = useRef<(THREE.Mesh | null)[]>([]);
  const ember = useRef<THREE.Mesh>(null);
  const halo = useRef<THREE.Mesh>(null);
  const startedAt = useRef<number | null>(null);
  const done = useRef(false);
  const { camera } = useThree();

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
      mesh.position.x = jitter(i, 1) * progress;
      mesh.position.z = jitter(i, 2) * progress;
      // Très légère ouverture en éventail : 2,3° au maximum sur le feuillet
      // extrême. Au-delà, l'objet devient un accordéon et perd son sérieux.
      mesh.rotation.z = offset * 0.006 * progress;
      mesh.rotation.x = offset * 0.004 * progress;
      mesh.rotation.y = jitter(i, 3) * progress;
    }

    // La lumière arrive après que la séparation a commencé : c'est l'ouverture
    // qui la révèle, pas l'inverse.
    const eclat = easeOutExpo(clamp01((elapsed - 0.42) / 0.7));
    if (ember.current) {
      (ember.current.material as THREE.MeshBasicMaterial).opacity = eclat * 0.9;
    }
    if (halo.current) {
      (halo.current.material as THREE.MeshBasicMaterial).opacity = eclat * 0.16;
      halo.current.scale.setScalar(0.9 + eclat * 0.35);
    }

    // Dérive de caméra : 12 cm de recul et 3 cm d'élévation sur toute la durée.
    // Assez pour que le cerveau lise du volume, trop peu pour être remarqué.
    const d = easeOutExpo(clamp01(elapsed / TOTAL));
    camera.position.set(0, 1.05 + d * 0.03, 3.15 + d * 0.12);
    camera.lookAt(0, 0, 0);

    if (elapsed > TOTAL) {
      done.current = true;
      onSettled();
    }
  });

  return (
    <group>
      {Array.from({ length: SHEETS }, (_, i) => (
        <mesh
          key={i}
          geometry={geometrie}
          ref={(node) => {
            sheets.current[i] = node;
          }}
          castShadow
          receiveShadow
        >
          {/* Alternance de valeurs : sans elle, sept plans identiques éclairés
              par la même lumière se confondent en un seul volume. */}
          <meshStandardMaterial
            color={i % 2 === 0 ? "#ced4e4" : "#e6e9f2"}
            roughness={0.86}
            metalness={0}
            flatShading={false}
          />
        </mesh>
      ))}

      {/* La ligne de lumière dans l'interstice. Elle n'éclaire rien — elle
          indique. `toneMapped={false}` la garde franche malgré l'ACES. */}
      <mesh ref={ember} position={[0, 0.012, 0.845]}>
        <boxGeometry args={[2.36, 0.004, 0.008]} />
        <meshBasicMaterial color="#4b5cf0" transparent opacity={0} toneMapped={false} />
      </mesh>

      {/* Halo additif : donne à la ligne l'épaisseur lumineuse qu'un trait de
          4 mm ne peut pas avoir seul, sans passer par un post-traitement. */}
      <mesh ref={halo} position={[0, 0.012, 0.845]}>
        <planeGeometry args={[2.9, 0.34]} />
        <meshBasicMaterial
          color="#6f7cf5"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Plan de contact : ne rend que l'ombre reçue. C'est lui qui pose
          l'objet au sol au lieu de le laisser flotter. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.42, 0]} receiveShadow>
        <planeGeometry args={[9, 9]} />
        <shadowMaterial transparent opacity={0.16} />
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
      shadows="soft"
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
      }}
      camera={{ position: [0, 1.05, 3.15], fov: 28 }}
      style={{ pointerEvents: "none" }}
    >
      {/* Ciel/sol plutôt qu'un ambiant plat : le dessous des feuillets reçoit
          un rebond légèrement plus froid, ce qui creuse les interstices. */}
      <hemisphereLight args={["#ffffff", "#c3c9dc", 0.55]} />

      {/* Clé rasante depuis la gauche : c'est elle qui dessine la tranche de
          chaque feuillet, et la seule qui projette. Un éclairage frontal
          aplatirait l'objet. */}
      <directionalLight
        position={[-3.4, 3.4, 1.8]}
        intensity={2.1}
        castShadow
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
        shadow-camera-near={0.5}
        shadow-camera-far={12}
        shadow-camera-left={-3}
        shadow-camera-right={3}
        shadow-camera-top={3}
        shadow-camera-bottom={-3}
        shadow-radius={5}
        shadow-bias={-0.0012}
      />

      {/* Contre-jour faible : détache le bord droit du fond. Ne projette pas. */}
      <directionalLight position={[2.8, 1.4, -2.2]} intensity={0.45} />

      <Sheets onSettled={() => setSettled(true)} />
    </Canvas>
  );
}
