/**
 * types.ts — le modèle du domaine.
 *
 * Ce fichier ne connaît ni React, ni HTTP, ni la base. Il décrit ce que
 * Aura++ manipule : des efforts passés, ce qu'on peut en apprendre, et le
 * signal qui remonte à celui qui les a produits.
 *
 * Contrainte produit inscrite dans le type lui-même : un fragment expose un
 * raisonnement, des choix, des impasses et des pistes — jamais un livrable de
 * code prêt à copier (PRODUCT.md:25).
 */

export interface Author {
  id: string;
  name: string;
  /** Promotion — « 2021 », pas un statut ni un niveau. */
  cohort: string;
  field: string;
}

export type WorkKind = "mémoire" | "projet";

/** Un travail terminé n'est pas « mieux » qu'un travail arrêté : les deux enseignent. */
export type WorkStatus = "terminé" | "arrêté";

export interface Origin {
  work: string;
  kind: WorkKind;
  year: number;
  field: string;
  status: WorkStatus;
}

export interface ArchitectureChoice {
  decision: string;
  /** Le « pourquoi » est la seule chose qui se transmet réellement. */
  rationale: string;
}

/**
 * Un extrait est **cité**, pas fourni. Il illustre le raisonnement et reste
 * secondaire dans la mise en page (DESIGN.md §7.2).
 */
export interface Excerpt {
  caption: string;
  language: string;
  code: string;
}

export interface Fragment {
  id: string;
  title: string;
  /**
   * Ce que ce fragment fait gagner, en une phrase. C'est ce qui permet à un
   * résultat de recherche de se justifier au lieu de demander un acte de foi.
   */
  promise: string;
  origin: Origin;
  author: Author;
  /** Le corps de la transmission. Prose, à lire — pas à scanner. */
  reasoning: string;
  choices: ArchitectureChoice[];
  /** Les impasses : ce qui fait gagner le plus de temps à celui qui suit. */
  deadEnds: string[];
  leads: string[];
  excerpt?: Excerpt;
  /** Termes indexés — remplacés par un embedding pgvector côté serveur. */
  signals: string[];
}

export interface SearchHit {
  fragment: Fragment;
  /** 0–1. Affiché comme une correspondance, jamais comme un score de jeu. */
  relevance: number;
  /**
   * Pourquoi ce fragment répond à *cette* question. Sans cette phrase, le
   * résultat demande un acte de foi ; avec elle, il se vérifie.
   */
  why: string;
  /** Les termes du corpus qui ont déclenché la correspondance. */
  matchedOn: string[];
}

export interface ResumptionCapsule {
  projectId: string;
  projectTitle: string;
  /** ISO. La durée d'absence est affichée comme un fait, sans jugement. */
  lastActivity: string;
  where: string;
  blocking: string;
  nextStep: {
    action: string;
    /** 5 à 10 minutes — Product_2.0.md:36. Au-delà, ce n'est plus un micro-pas. */
    minutes: number;
  };
}

/**
 * Le signal de retour — l'unique « signal de progression » du produit
 * (PRODUCT.md:27). Factuel, non comparatif, non quantifié dans le temps.
 */
export interface AuthorSignal {
  id: string;
  fragmentId: string;
  fragmentTitle: string;
  author: Author;
  /** Ce sur quoi le fragment a servi. Concret, vérifiable. */
  helpedWith: string;
  helpedAt: string;
}

export interface FragmentDraft {
  title: string;
  work: string;
  kind: WorkKind;
  status: WorkStatus;
  reasoning: string;
  deadEnds: string[];
}
