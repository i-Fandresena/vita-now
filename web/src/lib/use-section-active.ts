import { useEffect, useState } from "react";

/**
 * Renvoie l'identifiant de la section actuellement au centre de l'écran.
 *
 * Sert à la barre publique, qui souligne le lien de la section qu'on est en
 * train de lire.
 *
 * **Un observateur d'intersection, pas un écouteur de défilement.** Un
 * `onScroll` se déclenche à chaque image pendant tout le défilement et impose
 * de mesurer la position de chaque section à la main — donc de forcer un calcul
 * de mise en page à chaque fois. L'observateur ne réveille le navigateur qu'aux
 * franchissements, et il le fait en dehors du fil principal.
 *
 * **La marge fait tout le travail.** `-45% 0px -45% 0px` réduit la zone
 * d'observation à une bande horizontale de 10 % au milieu de la fenêtre : est
 * active la section qui traverse cette bande. Sans cette réduction, trois
 * sections sont visibles en même temps sur un grand écran et le lien actif
 * clignote entre elles.
 *
 * En cas d'égalité — deux sections courtes dans la bande — la dernière gagne :
 * c'est celle vers laquelle on descend.
 */
export function useSectionActive(ids: readonly string[]): string | null {
  const [actif, setActif] = useState<string | null>(null);

  /* La liste est recomposée à chaque rendu par l'appelant ; la comparer par sa
     valeur évite de démonter l'observateur à chaque fois. */
  const cle = ids.join("|");

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const sections = cle
      .split("|")
      .filter(Boolean)
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);

    if (sections.length === 0) {
      setActif(null);
      return;
    }

    const visibles = new Set<string>();

    const observateur = new IntersectionObserver(
      (entrees) => {
        for (const entree of entrees) {
          if (entree.isIntersecting) visibles.add(entree.target.id);
          else visibles.delete(entree.target.id);
        }

        /* On reparcourt `sections` plutôt que `visibles` : un `Set` conserve
           l'ordre d'insertion, c'est-à-dire l'ordre où les sections ont été
           traversées, et non l'ordre du document. */
        const dernière = sections.filter((s) => visibles.has(s.id)).at(-1);
        setActif(dernière?.id ?? null);
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );

    sections.forEach((section) => observateur.observe(section));
    return () => observateur.disconnect();
  }, [cle]);

  return actif;
}
