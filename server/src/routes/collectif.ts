import type { FastifyInstance } from "fastify";

import { query, queryOne, transaction } from "../db.js";
import { sessionEntrepriseDe } from "../session-entreprise.js";
import { exigerSession, sessionDe } from "../session.js";

/**
 * collectif.ts — les écritures de la communauté : forum (M8), idées (M14),
 * challenges (M10), mentorat (M18), opportunités (M13/E2).
 *
 * Chaque geste qui rend service à quelqu'un d'autre crée sa notification et
 * ses points **dans la même transaction** que le geste lui-même. C'est la
 * règle tenue partout : une entraide dont le bénéficiaire n'est pas prévenu
 * n'a pas eu lieu de son point de vue.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function estMentor(studentId: string): Promise<boolean> {
  const l = await queryOne<{ mentor: boolean }>(
    "SELECT mentor FROM students WHERE id = $1",
    [studentId],
  );
  return l?.mentor === true;
}

/** Prévient quelqu'un, sauf lui-même. */
async function notifier(
  client: { query: (t: string, v?: unknown[]) => Promise<unknown> },
  destinataire: string,
  auteur: string,
  nature: string,
  titre: string,
  corps: string,
  cible: string,
): Promise<void> {
  if (destinataire === auteur) return;
  await client.query(
    `INSERT INTO notifications (student_id, nature, titre, corps, cible)
     VALUES ($1, $2::notif_nature, $3, $4, $5)`,
    [destinataire, nature, titre, corps, cible],
  );
}

export async function routesCollectif(app: FastifyInstance): Promise<void> {
  /* ── M8 — Forum ──────────────────────────────────────────────────────── */

  app.post<{
    Body: { id?: string; categorie?: string; titre?: string; corps?: string };
  }>("/api/sujets", async (requete, reponse) => {
    const moi = await exigerSession(requete, reponse);
    if (!moi) return;

    const { id, categorie, titre, corps } = requete.body ?? {};
    if (!titre?.trim() || !corps?.trim() || !categorie) {
      return reponse
        .code(400)
        .send({ erreur: "Catégorie, titre et contenu sont requis." });
    }

    // Identifiant proposé par le client : cf. `idPropose` dans ecriture.ts —
    // l'écran navigue vers le sujet créé avant la réponse du serveur.
    const propose = typeof id === "string" && UUID.test(id) ? id : null;

    const l = await query<{ id: string }>(
      `INSERT INTO forum_threads (id, auteur_id, categorie, titre, corps)
       VALUES (COALESCE($5::uuid, gen_random_uuid()), $1, $2::forum_categorie, $3, $4)
       RETURNING id`,
      [moi, categorie, titre.trim(), corps.trim(), propose],
    );
    return reponse.code(201).send({ id: l[0]!.id });
  });

  app.post<{ Params: { id: string }; Body: { corps?: string } }>(
    "/api/sujets/:id/reponses",
    async (requete, reponse) => {
      const moi = await exigerSession(requete, reponse);
      if (!moi) return;

      const corps = requete.body?.corps?.trim();
      if (!corps) return reponse.code(400).send({ erreur: "Le contenu est requis." });

      const sujet = await queryOne<{ auteur_id: string; titre: string }>(
        "SELECT auteur_id, titre FROM forum_threads WHERE id = $1",
        [requete.params.id],
      );
      if (!sujet) return reponse.code(404).send({ erreur: "Sujet introuvable" });

      const mentor = await estMentor(moi);

      await transaction(async (client) => {
        await client.query(
          `INSERT INTO forum_replies (thread_id, auteur_id, corps, de_mentor)
           VALUES ($1, $2, $3, $4)`,
          [requete.params.id, moi, corps, mentor],
        );
        await notifier(
          client, sujet.auteur_id, moi, "forum",
          "Une réponse à ton sujet", sujet.titre,
          `#/communaute/sujet/${requete.params.id}`,
        );
        // M12 — « aidant un pair ».
        if (sujet.auteur_id !== moi) {
          await client.query(
            "INSERT INTO points (student_id, motif, detail) VALUES ($1, 'pair-aide', $2)",
            [moi, sujet.titre],
          );
        }
      });

      return reponse.code(201).send({ ok: true });
    },
  );

  /* ── M14 — Idées ─────────────────────────────────────────────────────── */

  /**
   * Le vote est un `UPSERT` : revoter remplace l'avis au lieu d'en ajouter un.
   * Changer d'avis après avoir lu les commentaires est le comportement
   * attendu — c'est même l'intérêt de faire valider une idée avant de démarrer.
   */
  app.post<{ Params: { id: string }; Body: { sens?: string } }>(
    "/api/idees/:id/vote",
    async (requete, reponse) => {
      const moi = await exigerSession(requete, reponse);
      if (!moi) return;

      const sens = requete.body?.sens;
      if (sens !== "pour" && sens !== "reserve") {
        return reponse.code(400).send({ erreur: "Sens attendu : pour ou reserve." });
      }

      await query(
        `INSERT INTO idea_votes (idea_id, student_id, sens) VALUES ($1, $2, $3)
         ON CONFLICT (idea_id, student_id) DO UPDATE SET sens = EXCLUDED.sens, date = now()`,
        [requete.params.id, moi, sens],
      );
      return { ok: true };
    },
  );

  app.post<{ Params: { id: string }; Body: { corps?: string } }>(
    "/api/idees/:id/commentaires",
    async (requete, reponse) => {
      const moi = await exigerSession(requete, reponse);
      if (!moi) return;

      const corps = requete.body?.corps?.trim();
      if (!corps) return reponse.code(400).send({ erreur: "Le contenu est requis." });

      const idee = await queryOne<{ auteur_id: string; titre: string }>(
        "SELECT auteur_id, titre FROM ideas WHERE id = $1",
        [requete.params.id],
      );
      if (!idee) return reponse.code(404).send({ erreur: "Idée introuvable" });

      await transaction(async (client) => {
        await client.query(
          "INSERT INTO idea_comments (idea_id, auteur_id, corps) VALUES ($1, $2, $3)",
          [requete.params.id, moi, corps],
        );
        await notifier(
          client, idee.auteur_id, moi, "forum",
          "Un retour sur ton idée", idee.titre, "#/idees",
        );
      });

      return reponse.code(201).send({ ok: true });
    },
  );

  app.post<{ Body: { titre?: string; corps?: string } }>(
    "/api/idees",
    async (requete, reponse) => {
      const moi = await exigerSession(requete, reponse);
      if (!moi) return;

      const { titre, corps } = requete.body ?? {};
      if (!titre?.trim() || !corps?.trim()) {
        return reponse.code(400).send({ erreur: "Titre et description sont requis." });
      }

      const l = await query<{ id: string }>(
        "INSERT INTO ideas (auteur_id, titre, corps) VALUES ($1, $2, $3) RETURNING id",
        [moi, titre.trim(), corps.trim()],
      );
      return reponse.code(201).send({ id: l[0]!.id });
    },
  );

  /* ── M10 — Challenges ────────────────────────────────────────────────── */

  app.post<{ Params: { id: string } }>(
    "/api/challenges/:id/inscription",
    async (requete, reponse) => {
      const moi = await exigerSession(requete, reponse);
      if (!moi) return;

      const ch = await queryOne<{ duree_jours: number }>(
        "SELECT duree_jours FROM challenges WHERE id = $1",
        [requete.params.id],
      );
      if (!ch) return reponse.code(404).send({ erreur: "Challenge introuvable" });

      // Une case par semaine, toutes à faux. Le nombre de semaines vient de la
      // durée du challenge : le front ne doit pas avoir à le recalculer.
      const semaines = Array.from(
        { length: Math.ceil(ch.duree_jours / 7) },
        () => false,
      );

      await query(
        `INSERT INTO challenge_participants (challenge_id, student_id, semaines)
         VALUES ($1, $2, $3)
         ON CONFLICT (challenge_id, student_id) DO NOTHING`,
        [requete.params.id, moi, semaines],
      );
      return reponse.code(201).send({ ok: true });
    },
  );

  /**
   * Cocher une semaine. La bascule se fait **en base** plutôt qu'en recevant
   * le tableau complet du client : deux onglets ouverts enverraient sinon
   * deux états concurrents, et le dernier écraserait l'autre.
   */
  app.patch<{ Params: { id: string }; Body: { semaine?: number } }>(
    "/api/challenges/:id/semaine",
    async (requete, reponse) => {
      const moi = await exigerSession(requete, reponse);
      if (!moi) return;

      const semaine = Number(requete.body?.semaine);
      if (!Number.isInteger(semaine) || semaine < 0) {
        return reponse.code(400).send({ erreur: "Numéro de semaine invalide." });
      }

      const lignes = await query<{ semaines: boolean[] }>(
        `UPDATE challenge_participants
         SET semaines = semaines[1:$1] || ARRAY[NOT COALESCE(semaines[$1+1], false)]
                        || semaines[$1+2:]
         WHERE challenge_id = $2 AND student_id = $3
         RETURNING semaines`,
        [semaine, requete.params.id, moi],
      );

      if (lignes.length === 0) {
        return reponse
          .code(404)
          .send({ erreur: "Tu ne participes pas à ce challenge." });
      }
      return { semaines: lignes[0]!.semaines };
    },
  );

  /* ── M18 — Mentorat ──────────────────────────────────────────────────── */

  app.post<{ Body: { mentorId?: string; blocage?: string } }>(
    "/api/mentorat/demandes",
    async (requete, reponse) => {
      const moi = await exigerSession(requete, reponse);
      if (!moi) return;

      const { mentorId, blocage } = requete.body ?? {};
      if (!mentorId || !blocage?.trim()) {
        return reponse
          .code(400)
          .send({ erreur: "Le mentor et la description du blocage sont requis." });
      }
      if (mentorId === moi) {
        return reponse
          .code(400)
          .send({ erreur: "On ne peut pas être son propre mentor." });
      }

      const id = await transaction(async (client) => {
        const { rows } = await client.query<{ id: string }>(
          `INSERT INTO mentor_requests (mentor_id, student_id, blocage)
           VALUES ($1, $2, $3) RETURNING id`,
          [mentorId, moi, blocage.trim()],
        );
        await notifier(
          client, mentorId, moi, "mentorat",
          "Une demande d'aide", blocage.trim().slice(0, 120), "#/mentorat",
        );
        return rows[0]!.id;
      });

      return reponse.code(201).send({ id });
    },
  );

  app.post<{ Params: { id: string }; Body: { corps?: string } }>(
    "/api/mentorat/demandes/:id/reponses",
    async (requete, reponse) => {
      const moi = await exigerSession(requete, reponse);
      if (!moi) return;

      const corps = requete.body?.corps?.trim();
      if (!corps) return reponse.code(400).send({ erreur: "Le contenu est requis." });

      const demande = await queryOne<{ student_id: string; mentor_id: string }>(
        "SELECT student_id, mentor_id FROM mentor_requests WHERE id = $1",
        [requete.params.id],
      );
      if (!demande) return reponse.code(404).send({ erreur: "Demande introuvable" });

      // Seuls le mentor sollicité et l'auteur de la demande écrivent dans ce fil.
      if (moi !== demande.mentor_id && moi !== demande.student_id) {
        return reponse.code(403).send({ erreur: "Ce fil ne vous concerne pas." });
      }

      await transaction(async (client) => {
        await client.query(
          "INSERT INTO mentor_replies (request_id, auteur_id, corps) VALUES ($1, $2, $3)",
          [requete.params.id, moi, corps],
        );
        await client.query(
          "UPDATE mentor_requests SET statut = 'en cours' WHERE id = $1 AND statut = 'en attente'",
          [requete.params.id],
        );

        const destinataire =
          moi === demande.mentor_id ? demande.student_id : demande.mentor_id;
        await notifier(
          client, destinataire, moi, "mentorat",
          "Une réponse à ta demande", corps.slice(0, 120), "#/mentorat",
        );

        if (moi === demande.mentor_id) {
          await client.query(
            "INSERT INTO points (student_id, motif, detail) VALUES ($1, 'pair-aide', $2)",
            [moi, "Réponse à une demande d'aide"],
          );
        }
      });

      return reponse.code(201).send({ ok: true });
    },
  );

  /* ── M13 — Un étudiant ou une entreprise publie une opportunité ───────── */

  app.post<{
    Body: {
      titre?: string;
      description?: string;
      technos?: string[];
      dureeMois?: number;
      profil?: string;
      nature?: string;
      emetteur?: "etudiant" | "entreprise";
    };
  }>("/api/opportunites", async (requete, reponse) => {
    // L'émetteur est explicite : un navigateur peut conserver simultanément
    // une session étudiant et une session entreprise. Sans ce choix, publier
    // depuis l'espace entreprise pourrait rattacher l'appel à l'étudiant.
    const sessionEtudiant = await sessionDe(requete);
    const sessionEntreprise = sessionEntrepriseDe(requete);
    const typeEmetteur = requete.body?.emetteur;
    if (typeEmetteur !== undefined && typeEmetteur !== "etudiant" && typeEmetteur !== "entreprise") {
      return reponse.code(400).send({ erreur: "Émetteur d'opportunité invalide." });
    }
    // Les anciens appelants sans ce champ gardent le comportement historique
    // (étudiant prioritaire), sans jamais créer une ligne avec deux émetteurs.
    const moi = typeEmetteur === "entreprise" ? null : sessionEtudiant;
    const monEntreprise = typeEmetteur === "etudiant" || moi ? null : sessionEntreprise;
    if (!moi && !monEntreprise) {
      return reponse.code(401).send({ erreur: "Connexion requise" });
    }

    const c = requete.body ?? {};
    const titre = c.titre?.trim() ?? "";
    const description = c.description?.trim() ?? "";
    const profil = c.profil?.trim() ?? "";
    const dureeMois = Number(c.dureeMois);
    const nature = c.nature ?? "Projet";
    const natures = ["Projet", "Stage", "Alternance"];
    const technos = Array.isArray(c.technos)
      ? c.technos.filter((techno): techno is string => typeof techno === "string").map((techno) => techno.trim()).filter(Boolean).slice(0, 12)
      : [];

    if (!titre || !description || !profil) {
      return reponse.code(400).send({ erreur: "Le titre, la description et le profil recherché sont requis." });
    }
    if (!Number.isInteger(dureeMois) || dureeMois < 1 || dureeMois > 24) {
      return reponse.code(400).send({ erreur: "La durée doit être comprise entre 1 et 24 mois." });
    }
    if (!natures.includes(nature)) {
      return reponse.code(400).send({ erreur: "Nature d'opportunité invalide." });
    }

    const l = await query<{ id: string }>(
      `INSERT INTO opportunities
         (student_id, company_id, titre, description, technos, duree_mois, profil, nature)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::opportunite_nature) RETURNING id`,
      [
        moi,
        monEntreprise,
        titre,
        description,
        technos,
        dureeMois,
        profil,
        nature,
      ],
    );
    return reponse.code(201).send({ id: l[0]!.id });
  });

  /* ── M15 — Reprendre le projet de quelqu'un d'autre ──────────────────── */

  /**
   * Reprendre transfère la propriété **et conserve le journal**. C'est tout
   * l'intérêt : celui qui reprend hérite des décisions, des erreurs et des
   * impasses déjà écrites. Repartir d'un projet vidé de son journal
   * reviendrait à repartir de zéro, ce que le produit existe pour éviter.
   */
  app.post<{ Params: { id: string } }>(
    "/api/projets/:id/reprendre",
    async (requete, reponse) => {
      const moi = await exigerSession(requete, reponse);
      if (!moi) return;

      const projet = await queryOne<{
        owner_id: string;
        nom: string;
        statut: string;
      }>("SELECT owner_id, nom, statut FROM projects WHERE id = $1", [
        requete.params.id,
      ]);
      if (!projet) return reponse.code(404).send({ erreur: "Projet introuvable" });

      if (projet.statut !== "Abandonné") {
        return reponse
          .code(409)
          .send({ erreur: "Seul un projet arrêté peut être repris." });
      }
      if (projet.owner_id === moi) {
        return reponse.code(400).send({ erreur: "Ce projet est déjà le vôtre." });
      }

      await transaction(async (client) => {
        await client.query(
          `UPDATE projects
           SET owner_id = $1, statut = 'En cours', fin = NULL, derniere_activite = now()
           WHERE id = $2`,
          [moi, requete.params.id],
        );

        const { rows } = await client.query<{ nom: string }>(
          "SELECT nom FROM students WHERE id = $1",
          [moi],
        );
        await notifier(
          client, projet.owner_id, moi, "reprise",
          "Ton projet a été repris",
          `${rows[0]?.nom ?? "Quelqu'un"} reprend « ${projet.nom} ». Son journal est conservé.`,
          `#/projets/${requete.params.id}`,
        );
      });

      return { ok: true };
    },
  );
}
