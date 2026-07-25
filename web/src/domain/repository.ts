import type {
  AuthorSignal,
  Fragment,
  FragmentDraft,
  ResumptionCapsule,
  SearchHit,
} from "./types";

/**
 * Le port d'accès aux données.
 *
 * L'interface est le contrat entre l'UI et tout ce qui produit des fragments.
 * En démo, l'implémentation est un corpus déterministe en mémoire
 * (Product_2.0.md « Demo Mode » : aucune dépendance Internet critique).
 * En production, la même interface sera servie par PostgreSQL + pgvector et
 * l'API Claude — sans qu'une ligne de composant change.
 *
 * C'est la raison pour laquelle aucun écran n'importe jamais le corpus
 * directement.
 */
export interface FragmentRepository {
  search(query: string, options?: { signal?: AbortSignal }): Promise<SearchHit[]>;
  getById(id: string): Promise<Fragment | null>;
  capsuleForCurrentProject(): Promise<ResumptionCapsule | null>;
  /**
   * Déclare qu'un fragment a servi. C'est ce geste — et lui seul — qui
   * déclenche le retour à l'auteur.
   */
  declareUse(fragmentId: string, helpedWith: string): Promise<AuthorSignal>;
  /**
   * Le dernier signal reçu par l'auteur d'un fragment.
   *
   * Doit rester résolvable même sans déclaration préalable : un rechargement
   * de page en pleine soutenance ne doit pas vider l'écran le plus important
   * du produit (Product_2.0.md « Demo Mode » : aucun écran vide).
   */
  latestSignal(fragmentId: string): Promise<AuthorSignal | null>;
  deposit(draft: FragmentDraft): Promise<Fragment>;
}
