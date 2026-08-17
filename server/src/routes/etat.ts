import type { FastifyInstance } from "fastify";

import { query } from "../db.js";
import { genererNotificationsInactivite } from "../inactivite.js";
import { genererRappelsEvenements } from "../rappels.js";
import { lireReglages } from "../reglages.js";
import { sessionEntrepriseDe } from "../session-entreprise.js";
import { sessionDe } from "../session.js";

/**
 * etat.ts — l'état applicatif complet, en un appel.
 *
 * **Pourquoi un seul point d'entrée plutôt que vingt.** Le front garde tout en
 * mémoire dans un unique `SoaState` (`app/soa-store.tsx`) et calcule ses vues
 * dérivées à partir de là : le tableau de bord, les classements, le suivi de
 * promotion et le résumé de projet lisent tous la même collection. Servir cela
 * par vingt requêtes obligerait à réécrire le store en même temps qu'on le
 * branche — deux refontes simultanées, chacune capable de masquer les bugs de
 * l'autre.
 *
 * Ici la forme de la réponse **est** celle de `SoaState`. Le store passe donc
 * du corpus à l'API sans changer de structure, et les écrans ne bougent pas.
 *
 * Ce que cela coûte : quelques dizaines de kilo-octets par chargement, sur un
 * corpus de démonstration. Le jour où il grossit, c'est ce point d'entrée
 * qu'on découpe — et il sera alors le seul endroit à toucher.
 */

export async function routesEtat(app: FastifyInstance): Promise<void> {
  app.get("/api/etat", async (requete) => {
    const moi = await sessionDe(requete);
    // Comptes entreprise réels, hors cadrage — session distincte de celle de
    // l'étudiant (voir session-entreprise.ts). `companies` est déjà renvoyée
    // en entier plus bas : pas de requête supplémentaire pour retrouver la
    // ligne de l'entreprise connectée, le front la retrouve par id.
    const sessionEntrepriseId = sessionEntrepriseDe(requete);

    // M7 (+ calendrier) — avant de lire les notifications, générer celles
    // qui manquent : projets en sommeil (inactivite.ts) et événements du
    // jour/de demain (rappels.ts).
    if (moi) {
      await genererNotificationsInactivite(moi);
      await genererRappelsEvenements(moi);
    }

    /* Les collections sont demandées en parallèle. En série, dix requêtes à
       ~4 ms font 40 ms de latence cumulée pour rien : aucune ne dépend du
       résultat d'une autre. */
    const [
      students,
      projects,
      journal,
      threads,
      challenges,
      ideas,
      opportunities,
      mentorRequests,
      mentors,
      companies,
      cohorts,
      supervisions,
      points,
      badges,
      notifications,
      events,
    ] = await Promise.all([
      query(`
        SELECT s.id, s.nom, s.initiales, s.universite, s.niveau, s.filiere,
               s.interets, s.disponibilites, s.objectifs, s.mentor, s.promo,
               s.photo_url AS "photoUrl", s.cv_url AS "cvUrl", s.cv_nom AS "cvNom",
               COALESCE(
                 (SELECT json_agg(json_build_object(
                    'nom', k.nom, 'maitrise', k.maitrise, 'valideePar', k.validee_par))
                  FROM skills k WHERE k.student_id = s.id),
                 '[]'::json) AS technos
        FROM students s ORDER BY s.nom`),

      query(`
        SELECT p.id, p.nom, p.description, p.type, p.statut AS status, p.technos,
               p.objectif, p.duree_semaines AS "dureeSemaines", p.debut, p.fin,
               p.difficulte, p.owner_id AS "ownerId",
               p.derniere_activite AS "derniereActivite",
               p.raison_abandon AS "raisonAbandon", p.public,
               p.presentation, p.depot, p.opportunite_id AS "opportuniteId",
               COALESCE(
                 (SELECT json_agg(json_build_object(
                    'id', c.id, 'projectId', c.project_id, 'libelle', c.libelle,
                    'fait', c.fait, 'bloque', c.bloque, 'ordre', c.ordre, 'parentId', c.parent_id,
                    'dureeHeures', c.duree_heures) ORDER BY c.ordre)
                  FROM checklist_items c WHERE c.project_id = p.id),
                 '[]'::json) AS checklist
        FROM projects p ORDER BY p.derniere_activite DESC`),

      query(`
        SELECT id, project_id AS "projectId", nature AS kind, titre, corps,
               date, jalon
        FROM journal_entries ORDER BY date DESC`),

      query(`
        SELECT t.id, t.categorie, t.titre, t.corps,
               t.auteur_id AS "auteurId", t.date,
               t.resolu_par AS "resoluPar", t.ressource,
               COALESCE(
                 (SELECT json_agg(json_build_object(
                    'id', r.id, 'auteurId', r.auteur_id, 'corps', r.corps,
                    'date', r.date, 'deMentor', r.de_mentor) ORDER BY r.date)
                  FROM forum_replies r WHERE r.thread_id = t.id),
                 '[]'::json) AS reponses
        FROM forum_threads t ORDER BY t.date DESC`),

      query(`
        SELECT c.id, c.titre, c.description, c.duree_jours AS "dureeJours",
               c.techno, c.debut, c.sponsor_id AS "sponsorId", c.recompense,
               COALESCE(
                 (SELECT json_agg(json_build_object(
                    'studentId', cp.student_id, 'semaines', cp.semaines))
                  FROM challenge_participants cp WHERE cp.challenge_id = c.id),
                 '[]'::json) AS participants
        FROM challenges c ORDER BY c.debut DESC`),

      query(`
        SELECT i.id, i.auteur_id AS "auteurId", i.titre, i.corps, i.date,
               i.projet_id AS "projetId",
               COALESCE((SELECT json_agg(v.student_id) FROM idea_votes v
                         WHERE v.idea_id = i.id AND v.sens = 'pour'), '[]'::json) AS "votesPour",
               COALESCE((SELECT json_agg(v.student_id) FROM idea_votes v
                         WHERE v.idea_id = i.id AND v.sens = 'reserve'), '[]'::json) AS "votesReserve",
               COALESCE(
                 (SELECT json_agg(json_build_object(
                    'auteurId', k.auteur_id, 'corps', k.corps, 'date', k.date) ORDER BY k.date)
                  FROM idea_comments k WHERE k.idea_id = i.id),
                 '[]'::json) AS commentaires
        FROM ideas i ORDER BY i.date DESC`),

      query(`
        SELECT id, titre, company_id AS "companyId", student_id AS "studentId",
               description, technos, duree_mois AS "dureeMois", profil, nature,
               publiee_le AS "publieeLe"
        FROM opportunities ORDER BY publiee_le DESC`),

      query(`
        SELECT m.id, m.mentor_id AS "mentorId", m.student_id AS "studentId",
               m.blocage, m.date, m.statut,
               COALESCE(
                 (SELECT json_agg(json_build_object(
                    'auteurId', r.auteur_id, 'corps', r.corps, 'date', r.date) ORDER BY r.date)
                  FROM mentor_replies r WHERE r.request_id = m.id),
                 '[]'::json) AS reponses
        FROM mentor_requests m ORDER BY m.date DESC`),

      query(`
        SELECT student_id AS "studentId", domaines, statut, presentation, disponible
        FROM mentor_profiles`),

      query(`
        SELECT id, nom, secteur, technos_recherchees AS "technosRecherchees",
               profils_recherches AS "profilsRecherches", presentation
        FROM companies ORDER BY nom`),

      query(`
        SELECT c.id, c.libelle, c.niveau, c.filiere, c.annee,
               COALESCE((SELECT json_agg(cs.student_id) FROM cohort_students cs
                         WHERE cs.cohort_id = c.id), '[]'::json) AS "studentIds"
        FROM cohorts c ORDER BY c.libelle`),

      query(`
        SELECT project_id AS "projectId", teacher_id AS "teacherId",
               cohort_id AS "cohortId", observation, echeance
        FROM supervisions`),

      query(`
        SELECT id, student_id AS "studentId", motif AS reason, detail, date
        FROM points ORDER BY date DESC`),

      query(`
        SELECT b.id, b.nom, b.description,
               (SELECT sb.obtenu_le FROM student_badges sb
                WHERE sb.badge_id = b.id AND sb.student_id = $1) AS "obtenuLe"
        FROM badges b ORDER BY b.nom`,
        [moi],
      ),

      // Les notifications sont personnelles : rien sans session.
      moi
        ? query(
            `SELECT id, nature AS kind, titre, corps, date, lu, cible
             FROM notifications WHERE student_id = $1
             ORDER BY date DESC LIMIT 50`,
            [moi],
          )
        : Promise.resolve([]),

      // Calendrier personnel — rien sans session, même raison.
      moi
        ? query(
            `SELECT id, student_id AS "studentId", titre, date, heure, type,
                    project_id AS "projectId"
             FROM events WHERE student_id = $1 ORDER BY date`,
            [moi],
          )
        : Promise.resolve([]),
    ]);

    /* Réglages globaux : le front n'a besoin que de ce qui se voit — le
       bandeau d'annonce et l'état de maintenance, pour expliquer d'avance
       pourquoi une écriture va échouer plutôt que de laisser l'utilisateur le
       découvrir sur un formulaire refusé. Les autres leviers (inscriptions,
       Copilote) se manifestent d'eux-mêmes au moment où on les rencontre. */
    const reglages = await lireReglages();

    return {
      sessionId: moi,
      sessionEntrepriseId,
      students,
      projects,
      journal,
      threads,
      challenges,
      ideas,
      opportunities,
      mentorRequests,
      mentors,
      companies,
      cohorts,
      supervisions,
      points,
      badges,
      notifications,
      events,
      annonce: reglages.annonce,
      maintenance: reglages.maintenance,
    };
  });
}
