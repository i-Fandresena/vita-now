/**
 * vitanow-corpus.ts — façade de nommage.
 *
 * Le corpus de démonstration vit dans `soa-corpus.ts`. Voir `domain/vitanow.ts`
 * pour la raison : le renommage du produit a laissé deux chemins d'import, et
 * deux jeux de données auraient fini par diverger — l'un des deux l'avait
 * d'ailleurs déjà fait.
 */

export * from "./soa-corpus";
