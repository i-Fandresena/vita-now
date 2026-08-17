import { query, queryOne } from "./db.js";

/**
 * rappels.ts — rappels du calendrier personnel.
 *
 * Même mécanisme que M7 (`inactivite.ts`) : généré à la lecture de
 * `GET /api/etat`, pas par un job planifié — le comportement observé est
 * identique (le rappel apparaît à la prochaine visite), sans timer systemd
 * de plus. Les événements du jour sont prioritaires ; ceux du lendemain ne
 * sont proposés qu'à partir de 18 h (heure Madagascar), assez tôt pour se
 * préparer sans interrompre une journée entière à l'avance. Idempotent : pas
 * de nouvel INSERT si une notification `evenement` portant le même titre
 * existe déjà pour aujourd'hui.
 */

interface EvenementProche {
  id: string;
  titre: string;
  heure: string | null;
  aujourdhui: boolean;
}

interface EtapeBloquee {
  project_id: string;
  projet: string;
  etape: string;
}

interface ProjetAbandonne {
  id: string;
  nom: string;
  raison: string | null;
}

interface ProchaineEtape {
  project_id: string;
  projet: string;
  etape: string;
}

/**
 * Une connexion est un bon moment pour proposer une seule action, jamais une
 * rafale. L'ordre est volontairement explicite : une tâche marquée bloquée,
 * puis un projet abandonné, puis la prochaine étape réalisable. L'information
 * est une vraie notification afin que le post-it reste consultable ensuite.
 */
export async function genererRappelConnexion(studentId: string): Promise<void> {
  const blocage = await queryOne<EtapeBloquee>(
    `SELECT c.project_id, p.nom AS projet, c.libelle AS etape
     FROM checklist_items c
     JOIN projects p ON p.id = c.project_id
     WHERE p.owner_id = $1 AND c.bloque AND NOT c.fait
       AND p.statut NOT IN ('Terminé', 'Abandonné')
     ORDER BY p.derniere_activite ASC, c.ordre ASC
     LIMIT 1`,
    [studentId],
  );
  if (blocage) {
    await query(
      `INSERT INTO notifications (student_id, nature, titre, corps, cible)
       VALUES ($1, 'reprise', 'Tâche bloquée', $2, $3)`,
      [
        studentId,
        `« ${blocage.etape} » bloque « ${blocage.projet} ». Décris ce qui manque ou demande une aide ciblée avant de contourner le problème.`,
        `#/projets/${blocage.project_id}`,
      ],
    );
    return;
  }

  const abandonne = await queryOne<ProjetAbandonne>(
    `SELECT id, nom, raison_abandon AS raison
     FROM projects
     WHERE owner_id = $1 AND statut = 'Abandonné'
     ORDER BY derniere_activite DESC
     LIMIT 1`,
    [studentId],
  );
  if (abandonne) {
    await query(
      `INSERT INTO notifications (student_id, nature, titre, corps, cible)
       VALUES ($1, 'reprise', 'Projet à reprendre', $2, $3)`,
      [
        studentId,
        `« ${abandonne.nom} » n'est pas perdu.${abandonne.raison ? ` Son dernier arrêt : ${abandonne.raison}` : ""} Décide simplement : le reprendre, le transmettre ou le laisser comme trace utile.`,
        `#/projets/${abandonne.id}`,
      ],
    );
    return;
  }

  const prochaine = await queryOne<ProchaineEtape>(
    `SELECT c.project_id, p.nom AS projet, c.libelle AS etape
     FROM checklist_items c
     JOIN projects p ON p.id = c.project_id
     WHERE p.owner_id = $1 AND NOT c.fait AND NOT c.bloque
       AND p.statut IN ('Idée', 'En cours', 'En pause')
     ORDER BY p.derniere_activite DESC, c.ordre ASC
     LIMIT 1`,
    [studentId],
  );
  if (!prochaine) return;

  await query(
    `INSERT INTO notifications (student_id, nature, titre, corps, cible)
     VALUES ($1, 'reprise', 'Prochaine étape recommandée', $2, $3)`,
    [
      studentId,
      `Sur « ${prochaine.projet} », commence par « ${prochaine.etape} ». Une action claire vaut mieux que de rouvrir tout le projet d'un coup.`,
      `#/projets/${prochaine.project_id}`,
    ],
  );
}

export async function genererRappelsEvenements(studentId: string): Promise<void> {
  // La plateforme est actuellement centrée sur l'ENI Fianarantsoa : utiliser
  // son fuseau évite qu'un rappel de la veille soit déclenché en UTC alors
  // qu'il est déjà le matin pour l'étudiant.
  const evenements = await query<EvenementProche>(
    `WITH moment AS (
       SELECT timezone('Indian/Antananarivo', now()) AS local
     )
     SELECT e.id, e.titre, e.heure,
            (e.date = moment.local::date) AS aujourdhui
     FROM events e CROSS JOIN moment
     WHERE e.student_id = $1
       AND (
         e.date = moment.local::date
         OR (e.date = moment.local::date + 1 AND moment.local::time >= time '18:00')
       )`,
    [studentId],
  );

  for (const evenement of evenements) {
    const dejaNotifie = await queryOne<{ id: string }>(
      `SELECT id FROM notifications
       WHERE student_id = $1 AND nature = 'evenement' AND titre = $2
         AND date::date = timezone('Indian/Antananarivo', now())::date
       LIMIT 1`,
      [studentId, evenement.titre],
    );
    if (dejaNotifie) continue;

    const corps = evenement.aujourdhui
      ? `Aujourd'hui${evenement.heure ? ` à ${evenement.heure.slice(0, 5)}` : ""} : ${evenement.titre}.`
      : `Demain${evenement.heure ? ` à ${evenement.heure.slice(0, 5)}` : ""} : ${evenement.titre}. Prépare ce qu'il te faut ce soir.`;

    await query(
      `INSERT INTO notifications (student_id, nature, titre, corps, cible)
       VALUES ($1, 'evenement', $2, $3, '#/calendrier')`,
      [studentId, evenement.titre, corps],
    );
  }
}
