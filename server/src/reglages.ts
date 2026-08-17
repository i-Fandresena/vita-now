import { query } from "./db.js";

/**
 * reglages.ts — les leviers globaux de la plateforme.
 *
 * Lus par les routes qui doivent en tenir compte (inscriptions, Copilote,
 * maintenance), écrits uniquement par le centre d'administration.
 *
 * **Les défauts sont ici, pas seulement en base.** Une table vide — migration
 * pas encore appliquée, ligne supprimée à la main — doit laisser la plateforme
 * ouverte. L'inverse rendrait une erreur d'exploitation indistinguable d'une
 * fermeture volontaire, et personne ne pourrait plus s'inscrire sans que
 * quiconque l'ait décidé.
 *
 * Un cache mémoire de quelques secondes évite une requête sur chaque
 * inscription et chaque appel au Copilote, sans introduire d'invalidation
 * inter-processus : le service tourne en une seule instance, et une écriture
 * depuis l'administration vide le cache localement (`oublierReglages`).
 */

export interface Annonce {
  titre: string;
  corps: string;
  /** `info` — neutre ; `alerte` — interruption annoncée, maintenance à venir. */
  ton: "info" | "alerte";
}

export interface Reglages {
  /** Inscription étudiante ouverte au public. */
  inscriptionsOuvertes: boolean;
  /** Création de compte entreprise ouverte au public. */
  inscriptionsEntrepriseOuvertes: boolean;
  /** Copilote IA disponible. Coupe l'appel au modèle, pas l'historique. */
  copiloteActif: boolean;
  /**
   * Maintenance : les écritures étudiantes et entreprise répondent 503.
   * La lecture reste possible — quelqu'un en pleine session voit ses données
   * plutôt qu'une page blanche, et comprend pourquoi rien ne s'enregistre.
   */
  maintenance: boolean;
  /** Bandeau affiché en haut de l'application, ou `null`. */
  annonce: Annonce | null;
}

export const REGLAGES_DEFAUT: Reglages = {
  inscriptionsOuvertes: true,
  inscriptionsEntrepriseOuvertes: true,
  copiloteActif: true,
  maintenance: false,
  annonce: null,
};

const CLES = Object.keys(REGLAGES_DEFAUT) as Array<keyof Reglages>;

/** Cinq secondes : assez pour absorber une rafale, trop court pour dérouter. */
const DUREE_CACHE_MS = 5_000;

let cache: { valeur: Reglages; expire: number } | null = null;

function booleen(brut: unknown, defaut: boolean): boolean {
  return typeof brut === "boolean" ? brut : defaut;
}

function annonce(brut: unknown): Annonce | null {
  if (typeof brut !== "object" || brut === null) return null;
  const objet = brut as Record<string, unknown>;
  const titre = typeof objet["titre"] === "string" ? objet["titre"].trim() : "";
  const corps = typeof objet["corps"] === "string" ? objet["corps"].trim() : "";
  // Une annonce sans titre ni corps n'est pas une annonce : la traiter comme
  // absente évite un bandeau vide sur toute la plateforme.
  if (!titre && !corps) return null;
  return { titre, corps, ton: objet["ton"] === "alerte" ? "alerte" : "info" };
}

/** Force la relecture au prochain appel. À appeler après toute écriture. */
export function oublierReglages(): void {
  cache = null;
}

export async function lireReglages(): Promise<Reglages> {
  const maintenant = Date.now();
  if (cache && cache.expire > maintenant) return cache.valeur;

  let lignes: Array<{ cle: string; valeur: unknown }> = [];
  try {
    lignes = await query<{ cle: string; valeur: unknown }>(
      "SELECT cle, valeur FROM platform_settings",
    );
  } catch {
    /* Table absente (migration pas encore appliquée) ou base momentanément
       injoignable : on rend les défauts. Ne pas mettre en cache dans ce cas —
       sinon une coupure d'une seconde figerait les défauts cinq secondes de
       plus, et surtout masquerait une fermeture réellement décidée. */
    return REGLAGES_DEFAUT;
  }

  const brut = new Map(lignes.map(({ cle, valeur }) => [cle, valeur]));
  const valeur: Reglages = {
    inscriptionsOuvertes: booleen(brut.get("inscriptionsOuvertes"), REGLAGES_DEFAUT.inscriptionsOuvertes),
    inscriptionsEntrepriseOuvertes: booleen(
      brut.get("inscriptionsEntrepriseOuvertes"),
      REGLAGES_DEFAUT.inscriptionsEntrepriseOuvertes,
    ),
    copiloteActif: booleen(brut.get("copiloteActif"), REGLAGES_DEFAUT.copiloteActif),
    maintenance: booleen(brut.get("maintenance"), REGLAGES_DEFAUT.maintenance),
    annonce: annonce(brut.get("annonce")),
  };

  cache = { valeur, expire: maintenant + DUREE_CACHE_MS };
  return valeur;
}

/**
 * Écrit les réglages fournis (mise à jour partielle) et rend l'état complet.
 *
 * Les clés inconnues sont ignorées silencieusement plutôt que rejetées : la
 * seule source d'appels est le formulaire d'administration, et une clé en trop
 * y signifie un front plus récent que le serveur — refuser toute l'écriture
 * pour cela ferait perdre les réglages valides du même envoi.
 */
export async function ecrireReglages(partiel: Partial<Reglages>): Promise<Reglages> {
  const entrees = CLES.filter((cle) => cle in partiel).map(
    (cle) => [cle, partiel[cle] ?? null] as const,
  );

  for (const [cle, valeur] of entrees) {
    await query(
      `INSERT INTO platform_settings (cle, valeur, maj_le)
       VALUES ($1, $2::jsonb, now())
       ON CONFLICT (cle) DO UPDATE SET valeur = EXCLUDED.valeur, maj_le = now()`,
      [cle, JSON.stringify(valeur)],
    );
  }

  oublierReglages();
  return lireReglages();
}
