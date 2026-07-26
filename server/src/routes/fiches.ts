import type { FastifyInstance } from "fastify";

import { query, queryOne } from "../db.js";

/**
 * fiches.ts — la Mémoire IA : chercher, lire, déclarer qu'une fiche a servi.
 *
 * C'est la brique qui répond aux deux échecs de la lettre de Soa : retrouver
 * ce qui a déjà été compris (recherche), et faire savoir à l'auteur que son
 * travail a servi (déclaration d'usage).
 */

interface LigneRecherche {
  id: string;
  titre: string;
  promesse: string;
  oeuvre: string;
  nature: string;
  annee: number;
  domaine: string;
  etat: string;
  auteur_nom: string;
  auteur_promo: string;
  rang: number;
  extraits: string;
}

interface LigneFiche extends Omit<LigneRecherche, "rang" | "extraits"> {
  raisonnement: string;
  choix: unknown;
  impasses: string[];
  pistes: string[];
  extrait: unknown;
  project_id: string | null;
  cree_le: string;
}

/**
 * Découpe la question en mots utiles.
 *
 * `websearch_to_tsquery` accepte du texte libre sans jamais lever d'erreur de
 * syntaxe — contrairement à `to_tsquery`, qui échoue sur une apostrophe ou un
 * opérateur mal placé. Comme les gens tapent ici une phrase entière
 * (« deux appareils modifient la même donnée »), c'est la seule variante qui
 * ne casse pas en production.
 *
 * On l'assortit d'un `OR` implicite : une phrase de dix mots dont un seul
 * figure dans le corpus doit quand même remonter la fiche. `websearch` fait un
 * `AND` par défaut, ce qui ne renvoie presque jamais rien sur une question
 * formulée à voix haute.
 */
function enRequete(question: string): string {
  return question
    .split(/\s+/)
    .map((mot) => mot.replace(/["']/g, "").trim())
    .filter((mot) => mot.length > 1)
    .join(" or ");
}

export async function routesFiches(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/fiches/recherche?q=...
   *
   * Contrat imposé par le front (HANDOFF §4) : chaque résultat porte un `why`
   * — pourquoi *cette* fiche répond à *cette* question. Sans cette phrase, le
   * résultat demande un acte de foi.
   */
  app.get<{ Querystring: { q?: string } }>(
    "/api/fiches/recherche",
    async (requete, reponse) => {
      const question = (requete.query.q ?? "").trim();
      if (question.length < 2) return { resultats: [] };

      const termes = enRequete(question);
      if (!termes) return { resultats: [] };

      const lignes = await query<LigneRecherche>(
        `
        SELECT f.id, f.titre, f.promesse, f.oeuvre, f.nature, f.annee,
               f.domaine, f.etat,
               s.nom AS auteur_nom, s.promo AS auteur_promo,
               ts_rank(f.recherche, q) AS rang,
               -- Les mots de la question, remis dans leur phrase d'origine.
               -- C'est ce qui rend la correspondance vérifiable : on voit le
               -- passage qui a produit le résultat, pas seulement un score.
               ts_headline('fr', f.raisonnement, q,
                 'StartSel=«, StopSel=», MaxFragments=2, FragmentDelimiter= … , MaxWords=18, MinWords=8'
               ) AS extraits
        FROM fiches f
        JOIN students s ON s.id = f.author_id,
             websearch_to_tsquery('fr', $1) AS q
        WHERE f.recherche @@ q
        ORDER BY rang DESC, f.cree_le DESC
        LIMIT 20
        `,
        [termes],
      );

      // Pertinence relative au meilleur résultat, jamais absolue : un
      // pourcentage brut se lirait comme une note de qualité de la fiche.
      const meilleur = lignes[0]?.rang ?? 1;

      void reponse;
      return {
        resultats: lignes.map((l) => ({
          id: l.id,
          titre: l.titre,
          promesse: l.promesse,
          origine: {
            oeuvre: l.oeuvre,
            nature: l.nature,
            annee: l.annee,
            domaine: l.domaine,
            etat: l.etat,
          },
          auteur: { nom: l.auteur_nom, promo: l.auteur_promo },
          pertinence: meilleur > 0 ? Math.min(1, l.rang / meilleur) : 0,
          /** Le `why` du contrat. */
          pourquoi: l.promesse,
          extraits: l.extraits,
        })),
      };
    },
  );

  /** GET /api/fiches/:id — la fiche entière. */
  app.get<{ Params: { id: string } }>(
    "/api/fiches/:id",
    async (requete, reponse) => {
      const ligne = await queryOne<LigneFiche>(
        `
        SELECT f.id, f.titre, f.promesse, f.oeuvre, f.nature, f.annee,
               f.domaine, f.etat, f.raisonnement, f.choix, f.impasses,
               f.pistes, f.extrait, f.project_id, f.cree_le,
               s.nom AS auteur_nom, s.promo AS auteur_promo
        FROM fiches f
        JOIN students s ON s.id = f.author_id
        WHERE f.id = $1
        `,
        [requete.params.id],
      );

      if (!ligne) return reponse.code(404).send({ erreur: "Fiche introuvable" });
      return ligne;
    },
  );

  /**
   * GET /api/fiches/:id/usages — ce que cette fiche a débloqué.
   *
   * Doit rester résolvable sans déclaration préalable (HANDOFF §4) : un
   * rechargement en pleine soutenance ne doit pas vider l'écran le plus
   * important du produit. La liste vide est donc une réponse valide, pas une
   * erreur — c'est au front d'en faire un état.
   */
  app.get<{ Params: { id: string } }>("/api/fiches/:id/usages", async (requete) => {
    const usages = await query(
      `
      SELECT u.id, u.a_servi_a, u.date, s.nom AS beneficiaire
      FROM fiche_uses u
      LEFT JOIN students s ON s.id = u.student_id
      WHERE u.fiche_id = $1
      ORDER BY u.date DESC
      LIMIT 50
      `,
      [requete.params.id],
    );
    return { usages };
  });
}
