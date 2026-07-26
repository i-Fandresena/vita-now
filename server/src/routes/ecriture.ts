import type { FastifyInstance } from "fastify";

import { query, queryOne, transaction } from "../db.js";
import { exigerSession } from "../session.js";

/**
 * ecriture.ts — les mutations.
 *
 * Règle tenue partout ici : **une écriture qui touche plusieurs tables passe
 * par une transaction.** Arrêter un projet écrit dans `projects`, dans
 * `journal_entries` et dans `notifications` ; sans transaction, un échec à
 * mi-chemin laisse un projet arrêté dont personne n'est prévenu — et le
 * journal, qui est la mémoire du projet, mentirait sur ce qui s'est passé.
 *
 * Seconde règle : **on vérifie toujours que l'appelant est propriétaire.**
 * Une session valide ne dit pas que la ressource visée vous appartient. Sans
 * cette vérification, connaître l'identifiant d'un projet suffirait à écrire
 * dans le journal de quelqu'un d'autre.
 */

const STATUTS = ["Idée", "En cours", "En pause", "Abandonné", "Terminé"] as const;
const NATURES = ["Décision", "Erreur", "Solution", "Architecture", "Apprentissage"] as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Identifiant proposé par le client.
 *
 * **Pourquoi l'accepter.** Le front applique ses mutations localement avant
 * la réponse du serveur — sans quoi chaque geste attendrait un aller-retour —
 * puis navigue vers la ressource créée. Si le serveur choisissait l'identifiant,
 * l'URL affichée pointerait vers un objet local qui n'existe nulle part, et un
 * rechargement donnerait un écran vide.
 *
 * **Pourquoi c'est sans risque.** Un UUID v4 est imprévisible ; deviner celui
 * d'un autre n'apporte rien de plus que le lire dans une URL. Le format est
 * validé, et une collision violerait la clé primaire — la base refuse, elle ne
 * mélange pas. Surtout, l'identifiant ne confère aucun droit : l'appartenance
 * est vérifiée séparément à chaque écriture.
 */
function idPropose(valeur: unknown): string | null {
  return typeof valeur === "string" && UUID.test(valeur) ? valeur : null;
}

async function estProprietaire(projectId: string, studentId: string): Promise<boolean> {
  const ligne = await queryOne<{ owner_id: string }>(
    "SELECT owner_id FROM projects WHERE id = $1",
    [projectId],
  );
  return ligne?.owner_id === studentId;
}

export async function routesEcriture(app: FastifyInstance): Promise<void> {
  /** POST /api/projets — M2. */
  app.post<{
    Body: {
      id?: string;
      nom?: string;
      description?: string;
      type?: string;
      technos?: string[];
      objectif?: string;
      dureeSemaines?: number;
      difficulte?: string;
    };
  }>("/api/projets", async (requete, reponse) => {
    const moi = await exigerSession(requete, reponse);
    if (!moi) return;

    const c = requete.body ?? {};
    if (!c.nom?.trim()) {
      return reponse.code(400).send({ erreur: "Le nom du projet est requis." });
    }

    const lignes = await query<{ id: string }>(
      `INSERT INTO projects
         (id, owner_id, nom, description, type, statut, technos, objectif,
          duree_semaines, difficulte, derniere_activite)
       VALUES (COALESCE($9::uuid, gen_random_uuid()),
               $1, $2, $3, $4::projet_type, 'Idée', $5, $6, $7, $8::difficulte, now())
       RETURNING id`,
      [
        moi,
        c.nom.trim(),
        c.description?.trim() ?? "",
        c.type || "Personnel",
        c.technos ?? [],
        c.objectif?.trim() ?? "",
        c.dureeSemaines ?? 4,
        c.difficulte || "Intermédiaire",
        idPropose(c.id),
      ],
    );

    return reponse.code(201).send({ id: lignes[0]!.id });
  });

  /**
   * PATCH /api/projets/:id/statut — M15.
   *
   * Arrêter un projet **exige** sa raison. La base l'impose déjà
   * (contrainte `abandon_motive`), mais on le vérifie ici pour rendre un 400
   * lisible plutôt qu'une erreur de contrainte en 500 : le message doit
   * expliquer quoi corriger, pas révéler un nom de contrainte SQL.
   */
  app.patch<{ Params: { id: string }; Body: { statut?: string; raison?: string } }>(
    "/api/projets/:id/statut",
    async (requete, reponse) => {
      const moi = await exigerSession(requete, reponse);
      if (!moi) return;

      if (!(await estProprietaire(requete.params.id, moi))) {
        return reponse.code(403).send({ erreur: "Ce projet n'est pas le vôtre." });
      }

      const { statut, raison } = requete.body ?? {};
      if (!statut || !STATUTS.includes(statut as (typeof STATUTS)[number])) {
        return reponse
          .code(400)
          .send({ erreur: `Statut attendu parmi : ${STATUTS.join(", ")}.` });
      }

      if (statut === "Abandonné" && !raison?.trim()) {
        return reponse.code(400).send({
          erreur:
            "Un projet arrêté doit porter sa raison — c'est ce qui permet à quelqu'un de le reprendre.",
        });
      }

      const termine = statut === "Terminé" || statut === "Abandonné";

      await transaction(async (client) => {
        await client.query(
          `UPDATE projects
           SET statut = $1::projet_statut,
               raison_abandon = CASE WHEN $1 = 'Abandonné' THEN $2 ELSE raison_abandon END,
               fin = CASE WHEN $3 THEN current_date ELSE NULL END,
               derniere_activite = now()
           WHERE id = $4`,
          [statut, raison?.trim() ?? null, termine, requete.params.id],
        );

        // M12 — terminer un projet est l'un des quatre gestes du cadrage.
        if (statut === "Terminé") {
          const p = await client.query<{ nom: string }>(
            "SELECT nom FROM projects WHERE id = $1",
            [requete.params.id],
          );
          await client.query(
            `INSERT INTO points (student_id, motif, detail)
             VALUES ($1, 'projet-termine', $2)`,
            [moi, p.rows[0]?.nom ?? "Projet"],
          );
        }
      });

      return { ok: true };
    },
  );

  /**
   * POST /api/projets/:id/journal — M3.
   *
   * L'écriture au journal met à jour `derniere_activite` du projet dans la
   * même transaction. C'est cette colonne qui pilote la détection
   * d'inactivité (M7) : si les deux pouvaient diverger, un projet suivi tous
   * les jours finirait par être signalé comme en sommeil.
   */
  app.post<{
    Params: { id: string };
    Body: {
      entreeId?: string;
      nature?: string;
      titre?: string;
      corps?: string;
      jalon?: string;
    };
  }>("/api/projets/:id/journal", async (requete, reponse) => {
    const moi = await exigerSession(requete, reponse);
    if (!moi) return;

    /* L'appartenance se vérifie **avant** la validation du corps. Sinon un
       corps mal formé renvoie 400 sur un projet auquel on n'a de toute façon
       pas droit, ce qui laisse croire que corriger le corps suffirait. */
    if (!(await estProprietaire(requete.params.id, moi))) {
      return reponse.code(403).send({ erreur: "Ce projet n'est pas le vôtre." });
    }

    const { nature, titre, corps, jalon } = requete.body ?? {};
    if (!titre?.trim() || !corps?.trim()) {
      return reponse.code(400).send({ erreur: "Titre et contenu sont requis." });
    }
    if (!nature || !NATURES.includes(nature as (typeof NATURES)[number])) {
      return reponse
        .code(400)
        .send({ erreur: `Nature attendue parmi : ${NATURES.join(", ")}.` });
    }

    const entree = await transaction(async (client) => {
      const { rows } = await client.query<{ id: string; date: string }>(
        `INSERT INTO journal_entries (id, project_id, nature, titre, corps, jalon)
         VALUES (COALESCE($6::uuid, gen_random_uuid()),
                 $1, $2::journal_nature, $3, $4, $5)
         RETURNING id, date`,
        [
          requete.params.id,
          nature,
          titre.trim(),
          corps.trim(),
          jalon?.trim() || null,
          idPropose(requete.body?.entreeId),
        ],
      );

      await client.query(
        "UPDATE projects SET derniere_activite = now() WHERE id = $1",
        [requete.params.id],
      );

      // M12 — « documenter une erreur » est l'un des quatre gestes du cadrage,
      // et il rapporte autant qu'aider un pair : c'est le même service rendu,
      // simplement décalé dans le temps.
      if (nature === "Erreur") {
        await client.query(
          `INSERT INTO points (student_id, motif, detail)
           VALUES ($1, 'erreur-documentee', $2)`,
          [moi, titre.trim()],
        );
      }

      return rows[0]!;
    });

    return reponse.code(201).send(entree);
  });

  /**
   * POST /api/fiches/:id/usage — le geste central du produit.
   *
   * Déclarer qu'une fiche a servi déclenche le retour à son auteur. C'est la
   * réponse au second échec de la lettre : l'effort terminé qui ne sert
   * jamais à personne. La notification part dans la même transaction — un
   * usage enregistré dont l'auteur n'est pas prévenu ne vaut rien.
   */
  app.post<{ Params: { id: string }; Body: { aServiA?: string } }>(
    "/api/fiches/:id/usage",
    async (requete, reponse) => {
      const moi = await exigerSession(requete, reponse);
      if (!moi) return;

      const aServiA = requete.body?.aServiA?.trim();
      if (!aServiA) {
        return reponse
          .code(400)
          .send({ erreur: "Dire à quoi la fiche a servi est ce qui fait le retour." });
      }

      const fiche = await queryOne<{ id: string; titre: string; author_id: string }>(
        "SELECT id, titre, author_id FROM fiches WHERE id = $1",
        [requete.params.id],
      );
      if (!fiche) return reponse.code(404).send({ erreur: "Fiche introuvable" });

      await transaction(async (client) => {
        await client.query(
          `INSERT INTO fiche_uses (fiche_id, student_id, a_servi_a)
           VALUES ($1, $2, $3)`,
          [fiche.id, moi, aServiA],
        );

        // On ne se notifie pas soi-même d'avoir utilisé sa propre fiche.
        if (fiche.author_id !== moi) {
          const { rows } = await client.query<{ nom: string }>(
            "SELECT nom FROM students WHERE id = $1",
            [moi],
          );
          await client.query(
            `INSERT INTO notifications (student_id, nature, titre, corps, cible)
             VALUES ($1, 'signal', $2, $3, $4)`,
            [
              fiche.author_id,
              "Ta fiche a servi à quelqu'un",
              `${rows[0]?.nom ?? "Quelqu'un"} s'en est servi pour : ${aServiA}`,
              `#/fragment/${fiche.id}`,
            ],
          );

          await client.query(
            `INSERT INTO points (student_id, motif, detail)
             VALUES ($1, 'solution-partagee', $2)`,
            [fiche.author_id, fiche.titre],
          );
        }
      });

      return reponse.code(201).send({ ok: true });
    },
  );

  /** GET /api/notifications — M20. */
  app.get("/api/notifications", async (requete, reponse) => {
    const moi = await exigerSession(requete, reponse);
    if (!moi) return;

    const notifications = await query(
      `SELECT id, nature, titre, corps, date, lu, cible
       FROM notifications WHERE student_id = $1
       ORDER BY date DESC LIMIT 50`,
      [moi],
    );
    return { notifications };
  });

  /** PATCH /api/notifications/lues */
  app.patch("/api/notifications/lues", async (requete, reponse) => {
    const moi = await exigerSession(requete, reponse);
    if (!moi) return;

    await query("UPDATE notifications SET lu = true WHERE student_id = $1", [moi]);
    return { ok: true };
  });
}
