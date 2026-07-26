/**
 * vitanow.ts — façade de nommage.
 *
 * Le modèle du domaine vit dans `soa.ts`, où il suit module par module
 * AURA_cadrage.md. Ce fichier n'existe que parce que le produit a été renommé
 * VITA'NOW en cours de route : une partie du code importe `@/domain/vitanow`,
 * l'autre `@/domain/soa`.
 *
 * **Deux modules distincts seraient une bombe à retardement.** Ils ont déjà
 * divergé une fois — la copie VITA'NOW avait été prise avant l'ajout des
 * comptes, de l'espace universitaire et des points, si bien que la moitié de
 * l'application travaillait sur un modèle amputé. Une façade garantit qu'il
 * n'existe plus qu'une seule définition, quel que soit le chemin d'import.
 */

export * from "./soa";
