import { timingSafeEqual } from "node:crypto";

import type { FastifyReply, FastifyRequest } from "fastify";

import { env } from "./env.js";

const NOM_COOKIE = "vitanow_admin_session";

export function adminConfigure(): boolean {
  return Boolean(env.adminEmail && env.adminPassword);
}

export function identifiantsAdminValides(email: string, motDePasse: string): boolean {
  if (!adminConfigure()) return false;
  const attendu = Buffer.from(`${env.adminEmail}\u0000${env.adminPassword}`);
  const recu = Buffer.from(`${email}\u0000${motDePasse}`);
  return attendu.length === recu.length && timingSafeEqual(attendu, recu);
}

export function ouvrirSessionAdmin(reponse: FastifyReply): void {
  reponse.setCookie(NOM_COOKIE, "admin", {
    path: "/",
    httpOnly: true,
    secure: env.production,
    sameSite: "strict",
    signed: true,
    maxAge: 60 * 60 * 8,
  });
}

export function fermerSessionAdmin(reponse: FastifyReply): void {
  reponse.clearCookie(NOM_COOKIE, { path: "/" });
}

export function sessionAdminDe(requete: FastifyRequest): boolean {
  if (!adminConfigure()) return false;
  const brut = requete.cookies[NOM_COOKIE];
  if (!brut) return false;
  const verifie = requete.unsignCookie(brut);
  return verifie.valid && verifie.value === "admin";
}

export async function exigerAdmin(requete: FastifyRequest, reponse: FastifyReply): Promise<boolean> {
  if (sessionAdminDe(requete)) return true;
  await reponse.code(401).send({ erreur: "Accès administrateur requis." });
  return false;
}
