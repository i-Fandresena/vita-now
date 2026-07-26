import { useReducedMotion } from "framer-motion";
import { Component, lazy, Suspense, useMemo, type ReactNode } from "react";

import { SealFallback } from "./SealFallback";

/**
 * Seal — le portier de la 3D.
 *
 * SPEC.md §2 : « le produit ne doit jamais dépendre du 3D pour fonctionner
 * en démo — c'est un bonus, pas une fondation. » Ce composant applique cette
 * règle littéralement. Il y a quatre chemins vers le repli SVG :
 *
 *   1. WebGL indisponible ou désactivé,
 *   2. `prefers-reduced-motion` — on ne charge alors même pas three.js,
 *   3. échec de chargement du module 3D (réseau, mémoire),
 *   4. erreur d'exécution dans la scène.
 *
 * Dans les quatre cas, l'écran raconte exactement la même chose.
 */

const SealScene = lazy(() => import("./SealScene"));

/**
 * Préchargement du module 3D dès que des résultats existent : au moment où
 * l'utilisateur clique, le chunk est déjà là. La 3D ne doit jamais faire
 * attendre pendant une soutenance.
 */
export function preloadSealScene(): void {
  void import("./SealScene");
}

function supportsWebGL(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl2") ?? canvas.getContext("webgl")),
    );
  } catch {
    return false;
  }
}

class SceneBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function Seal() {
  const reduced = useReducedMotion() ?? false;
  const webgl = useMemo(supportsWebGL, []);
  const use3D = webgl && !reduced;

  return (
    <div
      // Largeur bornée et calée à gauche : la scène appartient à la colonne
      // éditoriale. Centrée sur toute la largeur, elle flottait hors grille et
      // cassait l'alignement de l'écran.
      className="-ml-6 h-[124px] w-[min(24rem,100%)] sm:-ml-8 sm:h-[152px]"
      // La scène est illustrative : elle ne porte aucune information que le
      // texte ne donne pas déjà.
      role="presentation"
    >
      {use3D ? (
        <SceneBoundary fallback={<SealFallback />}>
          {/* Pendant le chargement du chunk : rien. Un substitut animé ferait
              jouer le geste deux fois. */}
          <Suspense fallback={<div className="h-full w-full" />}>
            <SealScene />
          </Suspense>
        </SceneBoundary>
      ) : (
        <SealFallback />
      )}
    </div>
  );
}
