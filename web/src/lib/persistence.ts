/**
 * persistence.ts — la mémoire courte du navigateur.
 *
 * **Pourquoi ce fichier existe.** Jusqu'ici, un rechargement de page remettait
 * tout le corpus dans son état initial : un projet créé pendant une
 * démonstration disparaissait au premier F5. C'était le seul point sur lequel
 * le produit pouvait être pris en défaut en public, et il ne coûte pas un
 * backend à corriger.
 *
 * **Ce que ce fichier n'est pas.** Ce n'est pas la persistance du produit.
 * `localStorage` est propre à un navigateur, plafonne à ~5 Mo et ne partage
 * rien entre deux personnes — or « l'auteur » et « le chercheur » doivent
 * pouvoir être deux personnes distinctes. C'est un filet de sécurité pour la
 * démonstration, remplacé par PostgreSQL le jour où l'API existe.
 *
 * **Contrat de sûreté.** Aucune de ces fonctions ne peut faire tomber
 * l'application :
 *   · `localStorage` lève en navigation privée Safari et au dépassement de
 *     quota — tout est sous `try`/`catch`, et l'échec d'écriture est silencieux
 *     (perdre la sauvegarde est acceptable, perdre l'écran ne l'est pas) ;
 *   · un contenu corrompu ou d'une version antérieure est **écarté**, jamais
 *     réparé — on repart du corpus initial plutôt que d'hydrater un état
 *     à moitié valide qui casserait un écran plus loin ;
 *   · la version est incrémentée à chaque changement de forme d'un état
 *     persisté. Sans elle, un ancien état hydraterait un nouveau modèle.
 */

/** Préfixe commun — permet de tout effacer sans toucher aux autres clés du domaine. */
const PREFIXE = "vitanow:";

/**
 * Version du format persisté.
 *
 * **À incrémenter dès qu'un champ est ajouté, renommé ou supprimé** dans
 * `SoaState` ou dans les fragments. Un état d'une version antérieure est
 * ignoré, pas migré : le corpus de démonstration est reconstructible à coût
 * nul, écrire des migrations pour lui serait du travail sans contrepartie.
 */
const VERSION = 1;

interface Enveloppe<T> {
  version: number;
  contenu: T;
}

/** `localStorage` peut être absent (SSR) ou interdit (navigation privée). */
function stockage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Relit un état persisté.
 *
 * Renvoie `null` — et non le défaut — pour que l'appelant distingue « rien de
 * sauvegardé » de « sauvegarde écartée ». Les deux mènent au corpus initial,
 * mais seul le second mérite une trace en console.
 */
export function charger<T>(cle: string): T | null {
  const store = stockage();
  if (!store) return null;

  try {
    const brut = store.getItem(PREFIXE + cle);
    if (!brut) return null;

    const enveloppe = JSON.parse(brut) as Enveloppe<T>;
    if (enveloppe?.version !== VERSION) {
      // Format d'une version antérieure : on repart proprement du corpus.
      store.removeItem(PREFIXE + cle);
      return null;
    }

    return enveloppe.contenu;
  } catch {
    // JSON corrompu, quota illisible, storage désactivé — le corpus initial
    // reste un état valide, on s'y replie sans bruit.
    return null;
  }
}

/** Écrit un état. Un échec est sans conséquence : l'état vit en mémoire. */
export function enregistrer<T>(cle: string, contenu: T): void {
  const store = stockage();
  if (!store) return;

  try {
    const enveloppe: Enveloppe<T> = { version: VERSION, contenu };
    store.setItem(PREFIXE + cle, JSON.stringify(enveloppe));
  } catch {
    /* Quota dépassé ou écriture interdite — on continue sans sauvegarder. */
  }
}

/**
 * Efface tout ce que VITA'NOW a écrit, et rien d'autre.
 *
 * Sert au bouton « repartir du corpus initial » : pendant une soutenance, on
 * doit pouvoir rendre la démonstration à son état de départ entre deux
 * passages, sans vider le navigateur ni ouvrir les outils de développement.
 */
export function reinitialiser(): void {
  const store = stockage();
  if (!store) return;

  try {
    const aSupprimer: string[] = [];
    for (let i = 0; i < store.length; i++) {
      const cle = store.key(i);
      if (cle?.startsWith(PREFIXE)) aSupprimer.push(cle);
    }
    for (const cle of aSupprimer) store.removeItem(cle);
  } catch {
    /* Rien à faire : l'appelant recharge la page juste après. */
  }
}

/** Les clés utilisées, regroupées pour éviter les collisions silencieuses. */
export const CLES = {
  /** L'état applicatif SOA — projets, journal, forum, notifications… */
  etat: "etat",
  /** Les dépôts et déclarations d'usage de la Mémoire IA. */
  memoire: "memoire",
} as const;
