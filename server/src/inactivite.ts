import { createHash } from "node:crypto";

import { query, queryOne } from "./db.js";

/**
 * inactivite.ts — M7, « détection d'inactivité → notification, messages de
 * motivation façon Duolingo ».
 *
 * `enSommeil()`/`dormant` existent côté front (`domain/soa.ts`,
 * `app/soa-store.tsx`) depuis le début et alimentent la capsule de reprise
 * du tableau de bord — mais rien ne créait jusqu'ici de vraie notification.
 * C'est ce que fait ce fichier, appelé à chaque `GET /api/etat` (voir
 * `routes/etat.ts`) plutôt que par un job planifié : le comportement observé
 * est identique (la notification apparaît à la prochaine visite), sans
 * ajouter un timer systemd de plus pour une fraction de la complexité de
 * `vitanow-sauvegarde.timer`.
 *
 * **Idempotence** : un seul rappel par épisode de sommeil. On ne réinsère
 * pas tant qu'aucune notification `reprise` plus récente que
 * `derniere_activite` n'existe déjà pour ce projet — si le projet redevient
 * actif puis se rendort, `derniere_activite` avance et un nouveau rappel
 * redevient possible.
 */

const SEUIL_INACTIVITE_JOURS = 7;

/**
 * Phrases de reprise. Aucun reproche, aucune formule creuse — la voix déjà
 * tenue ailleurs dans ce projet (ex. « Un projet arrêté n'est pas un échec »,
 * `screens/ProjectScreens.tsx`). Choisies par hash de l'identifiant plutôt
 * que `Math.random()` : un résultat reproductible, cohérent avec le reste du
 * projet (voir `resume.ts`, `empreinte()`).
 */
const PHRASES = [
  (nom: string, jours: number) =>
    `${jours} jours sans nouvelles de « ${nom} ». Le contexte est encore frais — il le sera moins dans une semaine.`,
  (nom: string, jours: number) =>
    `« ${nom} » attend depuis ${jours} jours. Dix minutes suffisent à rouvrir le fil, pas à tout refaire.`,
  (nom: string, jours: number) =>
    `« ${nom} » dort depuis ${jours} jours. Ce qui est déjà fait ne disparaît pas — seul le fil se perd si on attend trop.`,
  (nom: string, jours: number) =>
    `${jours} jours. Une petite reprise sur « ${nom} » vaut mieux qu'une grande plus tard, quand il faudra tout relire.`,
];

function phraseDe(projectId: string, nom: string, jours: number): string {
  const h = createHash("sha256").update(projectId).digest();
  const index = h[0]! % PHRASES.length;
  return PHRASES[index]!(nom, jours);
}

interface ProjetDormant {
  id: string;
  nom: string;
  derniere_activite: string;
}

/**
 * Génère les notifications de reprise manquantes pour les projets dormants
 * de cet étudiant. Appelée avant de lire les notifications, pour qu'une
 * notification tout juste créée apparaisse dans la même réponse.
 */
export async function genererNotificationsInactivite(studentId: string): Promise<void> {
  const dormants = await query<ProjetDormant>(
    `SELECT id, nom, derniere_activite FROM projects
     WHERE owner_id = $1
       AND statut NOT IN ('Terminé', 'Abandonné')
       AND derniere_activite < now() - interval '${SEUIL_INACTIVITE_JOURS} days'`,
    [studentId],
  );

  for (const projet of dormants) {
    const cible = `#/projets/${projet.id}`;

    const dejaNotifie = await queryOne<{ id: string }>(
      `SELECT id FROM notifications
       WHERE student_id = $1 AND nature = 'reprise' AND cible = $2 AND date >= $3
       LIMIT 1`,
      [studentId, cible, projet.derniere_activite],
    );
    if (dejaNotifie) continue;

    const jours = Math.floor(
      (Date.now() - new Date(projet.derniere_activite).getTime()) / 86_400_000,
    );

    await query(
      `INSERT INTO notifications (student_id, nature, titre, corps, cible)
       VALUES ($1, 'reprise', $2, $3, $4)`,
      [studentId, projet.nom, phraseDe(projet.id, projet.nom, jours), cible],
    );
  }
}
