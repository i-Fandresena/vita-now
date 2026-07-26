/**
 * types.ts — point d'entrée historique du domaine.
 *
 * Le modèle complet vit désormais dans `soa.ts`, où il suit module par module
 * AURA_cadrage.md. Ce fichier est conservé comme façade : les écrans écrits
 * avant l'élargissement du périmètre importent encore `@/domain/types`, et il
 * n'y a aucune raison de les casser pour un déplacement de fichier.
 *
 * Tout nouveau code importe `@/domain/soa`.
 */

export * from "./soa";
