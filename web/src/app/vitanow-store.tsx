/**
 * vitanow-store.tsx — façade de nommage.
 *
 * L'état applicatif vit dans `soa-store.tsx`. Voir `domain/vitanow.ts` pour la
 * raison de cette façade.
 *
 * Le point critique qu'elle corrige : `App.tsx` ne montait plus que
 * `VitanowProvider`, alors que dix écrans appelaient encore `useSoa()`. Chacun
 * levait « useSoa doit être utilisé dans un SoaProvider » à l'affichage —
 * autrement dit, tout ce qui suivait la connexion était un écran blanc. Avec
 * un seul store derrière les deux noms, le cas ne peut plus se produire.
 */

export {
  SoaProvider as VitanowProvider,
  SoaProvider,
  useSoa as useVitanow,
  useSoa,
} from "./soa-store";

export type { NewProject, NewJournalEntry, NewThread, NewStudent, NewOpportunity } from "./soa-store";
