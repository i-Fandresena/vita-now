import type { FastifyReply, FastifyRequest } from "fastify";

import { env } from "./env.js";

/**
 * session.ts — qui est connecté, et comment on le sait.
 *
 * La session tient dans un cookie **signé** contenant le seul identifiant de
 * l'étudiant. Pas de table `sessions`, pas de JWT :
 *
 * · Une table de sessions exigerait une requête à chaque appel et un ménage
 *   périodique des entrées expirées, pour un produit qui n'a pas de besoin de
 *   révocation immédiate.
 * · Un JWT porterait les données du profil dans le jeton, donc un profil
 *   modifié resterait périmé jusqu'à l'expiration. On relit l'étudiant à
 *   chaque requête : c'est une jointure de plus, et zéro incohérence.
 *
 * La signature (`@fastify/cookie` + COOKIE_SECRET) est ce qui empêche de
 * forger un cookie. Sans elle, écrire l'identifiant de quelqu'un d'autre
 * suffirait à devenir cette personne.
 */

const NOM_COOKIE = "vitanow_session";

/** Trente jours. Un étudiant ouvre l'outil par intermittence, pas tous les jours. */
const DUREE_SECONDES = 60 * 60 * 24 * 30;

export function ouvrirSession(reponse: FastifyReply, studentId: string): void {
  reponse.setCookie(NOM_COOKIE, studentId, {
    path: "/",
    // `httpOnly` : inaccessible au JavaScript de la page. Une faille XSS ne
    // permet alors pas d'exfiltrer la session.
    httpOnly: true,
    // `secure` seulement en production : en développement le front est en
    // http://localhost, et un cookie `secure` n'y serait jamais envoyé.
    secure: env.production,
    // `lax` et non `strict` : `strict` n'envoie pas le cookie quand on arrive
    // par un lien externe — or une notification par e-mail ouvre exactement
    // ce chemin, et l'utilisateur retomberait sur un écran déconnecté.
    sameSite: "lax",
    signed: true,
    maxAge: DUREE_SECONDES,
  });
}

export function fermerSession(reponse: FastifyReply): void {
  reponse.clearCookie(NOM_COOKIE, { path: "/" });
}

/** L'identifiant de l'étudiant connecté, ou `null`. Ne lève jamais. */
export function sessionDe(requete: FastifyRequest): string | null {
  const brut = requete.cookies[NOM_COOKIE];
  if (!brut) return null;

  const verifie = requete.unsignCookie(brut);
  // Signature absente ou invalide : cookie forgé ou secret changé. Dans les
  // deux cas on traite la requête comme anonyme plutôt que de lever — une
  // erreur 500 sur un cookie périmé enfermerait l'utilisateur dehors.
  return verifie.valid ? verifie.value : null;
}

/**
 * Exige une session. Renvoie l'identifiant, ou répond 401 et renvoie `null`.
 *
 * L'appelant doit s'arrêter dès qu'il reçoit `null` : la réponse est déjà
 * partie.
 */
export async function exigerSession(
  requete: FastifyRequest,
  reponse: FastifyReply,
): Promise<string | null> {
  const id = sessionDe(requete);
  if (!id) {
    await reponse.code(401).send({ erreur: "Connexion requise" });
    return null;
  }
  return id;
}
