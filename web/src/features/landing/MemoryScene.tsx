import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * MemoryScene — la scène 3D du hero.
 *
 * Ce qu'elle raconte, et pourquoi elle n'est pas décorative : au repos, une
 * quinzaine de feuillets flottent dispersés, désordonnés, chacun dans son coin.
 * C'est l'état décrit par la lettre — des efforts épars, sans lien entre eux.
 * À mesure qu'on descend la page, ils **convergent** en une pile ordonnée : la
 * mémoire du produit. Le geste dit la thèse avant que le texte l'explique.
 *
 * Discipline, parce qu'un hero 3D qui rame coûte plus qu'il ne rapporte :
 *   · 15 feuillets, une seule géométrie partagée, deux matériaux, zéro texture.
 *   · Aucun post-traitement. L'accent lumineux passe par un plan additif.
 *   · La boucle s'arrête dès que la scène sort du champ (IntersectionObserver
 *     côté React, `frameloop` piloté depuis le parent).
 *   · Ombres désactivées : à 15 objets en mouvement permanent, la carte d'ombre
 *     se recalcule à chaque image pour un gain visuel nul sur fond clair.
 *   · Le suivi du pointeur passe par des ressorts maison plutôt que par un
 *     `useSpring` React : on reste dans la boucle de rendu, sans provoquer de
 *     re-render à chaque mouvement de souris.
 */

const FEUILLETS = 15;

/** Position dispersée d'un feuillet — déterministe, pour que la démo se rejoue. */
function dispersion(i: number) {
  const a = i * 2.399963; // angle d'or : répartition sans motif visible
  const r = 1.15 + (i % 5) * 0.42;
  return {
    x: Math.cos(a) * r,
    y: Math.sin(a * 1.7) * 0.95 + (i % 3) * 0.18 - 0.3,
    z: Math.sin(a) * r * 0.72 - (i % 4) * 0.22,
    rx: Math.sin(i * 1.3) * 0.85,
    ry: Math.cos(i * 0.9) * 1.1,
    rz: Math.sin(i * 2.1) * 0.5,
  };
}

/** Feuillet à coins arrondis : le papier n'a pas d'arêtes à 90°. */
function usePaperGeometry(): THREE.ExtrudeGeometry {
  return useMemo(() => {
    const l = 1.02;
    const p = 0.7;
    const r = 0.05;

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
      depth: 0.012,
      bevelEnabled: true,
      bevelThickness: 0.004,
      bevelSize: 0.004,
      bevelSegments: 2,
      curveSegments: 5,
    });
    geo.center();
    return geo;
  }, []);
}

/** Interpolation amortie — un ressort critique, sans dépassement. */
function approche(actuel: number, cible: number, vitesse: number, dt: number) {
  return actuel + (cible - actuel) * Math.min(1, vitesse * dt);
}

function Feuillets({
  progression,
  reduced,
}: {
  progression: React.MutableRefObject<number>;
  reduced: boolean;
}) {
  const geometrie = usePaperGeometry();
  const groupe = useRef<THREE.Group>(null);
  const meshes = useRef<(THREE.Mesh | null)[]>([]);
  const halo = useRef<THREE.Mesh>(null);
  const { pointer } = useThree();

  // État de suivi, hors React : un re-render par image serait absurde.
  const suivi = useRef({ x: 0, y: 0, p: 0 });

  const cibles = useMemo(() => Array.from({ length: FEUILLETS }, (_, i) => dispersion(i)), []);

  useFrame((_, dt) => {
    const t = Math.min(0.05, dt); // borne : un onglet en arrière-plan renvoie des dt énormes
    const s = suivi.current;

    // Le pointeur n'incline la scène que de 7° au maximum. Au-delà, on quitte
    // la parallaxe pour entrer dans le manège.
    s.x = approche(s.x, reduced ? 0 : pointer.x * 0.12, 3.2, t);
    s.y = approche(s.y, reduced ? 0 : pointer.y * 0.09, 3.2, t);
    s.p = approche(s.p, progression.current, 4, t);

    if (groupe.current) {
      groupe.current.rotation.y = s.x;
      groupe.current.rotation.x = -s.y;
    }

    const assemble = s.p;
    const milieu = (FEUILLETS - 1) / 2;

    for (let i = 0; i < FEUILLETS; i += 1) {
      const m = meshes.current[i];
      const d = cibles[i];
      if (!m || !d) continue;

      // Cible assemblée : une pile ordonnée, très légèrement en éventail.
      const offset = i - milieu;
      const px = offset * 0.012;
      const py = offset * 0.055;
      const pz = offset * 0.006;

      m.position.set(
        d.x + (px - d.x) * assemble,
        d.y + (py - d.y) * assemble,
        d.z + (pz - d.z) * assemble,
      );

      // À l'arrivée, les rotations convergent vers un plan quasi commun.
      m.rotation.set(
        d.rx + (-1.35 - d.rx) * assemble,
        d.ry + (offset * 0.008 - d.ry) * assemble,
        d.rz + (offset * 0.004 - d.rz) * assemble,
      );

      // Respiration résiduelle, éteinte une fois assemblé : une pile rangée
      // qui continue de flotter annulerait le propos.
      if (!reduced) {
        const respire = (1 - assemble) * 0.045;
        m.position.y += Math.sin(performance.now() * 0.0006 + i) * respire;
      }
    }

    // La lueur n'apparaît qu'à l'assemblage : c'est la mémoire qui s'allume.
    if (halo.current) {
      const mat = halo.current.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, assemble - 0.45) * 0.5;
      halo.current.scale.setScalar(0.8 + assemble * 0.5);
    }
  });

  return (
    <group ref={groupe}>
      {Array.from({ length: FEUILLETS }, (_, i) => (
        <mesh
          key={i}
          geometry={geometrie}
          ref={(n) => {
            meshes.current[i] = n;
          }}
        >
          {/* Trois valeurs alternées : sans elles, quinze plans identiques
              sous la même lumière se lisent comme un seul volume. */}
          <meshStandardMaterial
            color={i % 3 === 0 ? "#ffffff" : i % 3 === 1 ? "#e4e8f4" : "#d2d8ea"}
            roughness={0.82}
            metalness={0}
          />
        </mesh>
      ))}

      {/* Lueur d'assemblage, en mélange additif — moins cher qu'un bloom. */}
      <mesh ref={halo} position={[0, 0, -0.35]}>
        <planeGeometry args={[3.4, 1.5]} />
        <meshBasicMaterial
          color="#6f7cf5"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

export default function MemoryScene({
  progression,
  actif,
  reduced,
}: {
  /** 0 = dispersé, 1 = assemblé. Piloté par le scroll, hors React. */
  progression: React.MutableRefObject<number>;
  /** Faux quand la scène est hors champ : la boucle s'arrête. */
  actif: boolean;
  reduced: boolean;
}) {
  return (
    <Canvas
      frameloop={actif ? "always" : "demand"}
      dpr={[1, 1.6]}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
      }}
      camera={{ position: [0, 0, 4.2], fov: 34 }}
      style={{ pointerEvents: "none" }}
    >
      {/* Ciel/sol plutôt qu'un ambiant plat : le dessous des feuillets reçoit
          un rebond plus froid, ce qui creuse les interstices de la pile. */}
      <hemisphereLight args={["#ffffff", "#b9c1da", 0.75]} />
      <directionalLight position={[-3, 2.6, 2.4]} intensity={2.2} />
      <directionalLight position={[2.6, -1.2, -1.8]} intensity={0.5} color="#c9d0ff" />
      <Feuillets progression={progression} reduced={reduced} />
    </Canvas>
  );
}
