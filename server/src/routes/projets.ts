import type { FastifyInstance } from "fastify";

import { query, queryOne } from "../db.js";

/**
 * projets.ts — M2 (projets) et M3 (journal), en lecture.
 *
 * L'avancement n'est jamais une saisie : il se déduit du journal, comme
 * l'exige M15 (« les projets abandonnés restent visibles avec leur état »).
 * Le calcul vit ici plutôt que dans le front pour que l'espace enseignant et
 * l'espace entreprise en obtiennent la même valeur sans le réimplémenter.
 */

interface LigneProjet {
  id: string;
  nom: string;
  description: string;
  type: string;
  statut: string;
  technos: string[];
  objectif: string;
  duree_semaines: number;
  debut: string;
  fin: string | null;
  difficulte: string;
  derniere_activite: string;
  raison_abandon: string | null;
  public: boolean;
  presentation: unknown;
  depot: unknown;
  owner_id: string;
  owner_nom: string;
  entrees: number;
  jalons: number;
}

/** Les colonnes communes à toutes les lectures de projet. */
const SELECTION_PROJET = `
  p.id, p.nom, p.description, p.type, p.statut, p.technos, p.objectif,
  p.duree_semaines, p.debut, p.fin, p.difficulte, p.derniere_activite,
  p.raison_abandon, p.public, p.presentation, p.depot, p.owner_id,
  s.nom AS owner_nom,
  (SELECT count(*) FROM journal_entries j WHERE j.project_id = p.id) AS entrees,
  (SELECT count(*) FROM journal_entries j
     WHERE j.project_id = p.id AND j.jalon IS NOT NULL) AS jalons
`;

/**
 * Avancement estimé, en pourcentage.
 *
 * Un jalon franchi pèse davantage qu'une entrée simple : écrire dix fois « j'ai
 * lu la documentation » n'est pas la même chose qu'avoir livré une étape. Le
 * résultat est borné à 95 % tant que le projet n'est pas Terminé — afficher
 * 100 % sur un projet en cours serait un mensonge que l'utilisateur constate.
 */
function avancement(ligne: LigneProjet): number {
  if (ligne.statut === "Terminé") return 100;

  const entrees = Number(ligne.entrees);
  const jalons = Number(ligne.jalons);
  if (entrees === 0) return 0;

  const brut = jalons * 12 + (entrees - jalons) * 4;
  return Math.min(95, brut);
}

function versProjet(ligne: LigneProjet) {
  return {
    id: ligne.id,
    nom: ligne.nom,
    description: ligne.description,
    type: ligne.type,
    statut: ligne.statut,
    technos: ligne.technos,
    objectif: ligne.objectif,
    dureeSemaines: ligne.duree_semaines,
    debut: ligne.debut,
    fin: ligne.fin,
    difficulte: ligne.difficulte,
    derniereActivite: ligne.derniere_activite,
    raisonAbandon: ligne.raison_abandon,
    public: ligne.public,
    presentation: ligne.presentation,
    depot: ligne.depot,
    proprietaire: { id: ligne.owner_id, nom: ligne.owner_nom },
    avancement: avancement(ligne),
    entreesJournal: Number(ligne.entrees),
  };
}

export async function routesProjets(app: FastifyInstance): Promise<void> {
  /** GET /api/projets — les projets publics, ou ceux d'un étudiant donné. */
  app.get<{ Querystring: { etudiant?: string; statut?: string } }>(
    "/api/projets",
    async (requete) => {
      const { etudiant, statut } = requete.query;

      const conditions: string[] = [];
      const valeurs: unknown[] = [];

      if (etudiant) {
        valeurs.push(etudiant);
        conditions.push(`p.owner_id = $${valeurs.length}`);
      } else {
        // Sans propriétaire demandé, on ne sert que le public : la liste des
        // projets privés de quelqu'un d'autre ne regarde personne.
        conditions.push("p.public = true");
      }

      if (statut) {
        valeurs.push(statut);
        conditions.push(`p.statut = $${valeurs.length}`);
      }

      const lignes = await query<LigneProjet>(
        `SELECT ${SELECTION_PROJET}
         FROM projects p JOIN students s ON s.id = p.owner_id
         WHERE ${conditions.join(" AND ")}
         ORDER BY p.derniere_activite DESC
         LIMIT 100`,
        valeurs,
      );

      return { projets: lignes.map(versProjet) };
    },
  );

  /**
   * GET /api/projets/renaissance — M15.
   *
   * Les projets arrêtés, avec leur raison. C'est la réponse au second échec de
   * la lettre : un travail interrompu reste visible et reprenable, au lieu de
   * disparaître. La raison d'abandon est garantie non nulle par la contrainte
   * `abandon_motive` du schéma — on peut l'afficher sans repli.
   */
  app.get("/api/projets/renaissance", async () => {
    const lignes = await query<LigneProjet>(
      `SELECT ${SELECTION_PROJET}
       FROM projects p JOIN students s ON s.id = p.owner_id
       WHERE p.statut = 'Abandonné' AND p.public = true
       ORDER BY p.derniere_activite DESC
       LIMIT 50`,
    );
    return { projets: lignes.map(versProjet) };
  });

  /** GET /api/projets/:id */
  app.get<{ Params: { id: string } }>("/api/projets/:id", async (requete, reponse) => {
    const ligne = await queryOne<LigneProjet>(
      `SELECT ${SELECTION_PROJET}
       FROM projects p JOIN students s ON s.id = p.owner_id
       WHERE p.id = $1`,
      [requete.params.id],
    );

    if (!ligne) return reponse.code(404).send({ erreur: "Projet introuvable" });
    return versProjet(ligne);
  });

  /** GET /api/projets/:id/journal — M3, du plus récent au plus ancien. */
  app.get<{ Params: { id: string } }>("/api/projets/:id/journal", async (requete) => {
    const entrees = await query(
      `SELECT id, nature, titre, corps, date, jalon
       FROM journal_entries
       WHERE project_id = $1
       ORDER BY date DESC`,
      [requete.params.id],
    );
    return { entrees };
  });
}
