import type { FastifyReply, FastifyRequest } from "fastify";

import { env } from "./env.js";

/**
 * session-entreprise.ts — la session entreprise, séparée de celle de
 * `session.ts`.
 *
 * Même mécanique (cookie signé, httpOnly, `sameSite: lax`), mais un cookie
 * distinct (`vitanow_session_entreprise`) plutôt qu'une réutilisation du
 * cookie étudiant : un navigateur peut ainsi porter une session étudiant et
 * une session entreprise en même temps, chacune dans le sien. C'est ce qui
 * permet à un étudiant connecté de continuer à voir l'aperçu entreprise
 * (bouton existant du Shell) sans que ça n'interfère avec un compte
 * entreprise réel ouvert dans le même navigateur.
 */

const NOM_COOKIE = "vitanow_session_entreprise";

const DUREE_SECONDES = 60 * 60 * 24 * 30;

export function ouvrirSessionEntreprise(reponse: FastifyReply, companyId: string): void {
  reponse.setCookie(NOM_COOKIE, companyId, {
    path: "/",
    httpOnly: true,
    secure: env.production,
    sameSite: "lax",
    signed: true,
    maxAge: DUREE_SECONDES,
  });
}

export function fermerSessionEntreprise(reponse: FastifyReply): void {
  reponse.clearCookie(NOM_COOKIE, { path: "/" });
}

export function sessionEntrepriseDe(requete: FastifyRequest): string | null {
  const brut = requete.cookies[NOM_COOKIE];
  if (!brut) return null;

  const verifie = requete.unsignCookie(brut);
  return verifie.valid ? verifie.value : null;
}

export async function exigerSessionEntreprise(
  requete: FastifyRequest,
  reponse: FastifyReply,
): Promise<string | null> {
  const id = sessionEntrepriseDe(requete);
  if (!id) {
    await reponse.code(401).send({ erreur: "Connexion entreprise requise" });
    return null;
  }
  return id;
}
