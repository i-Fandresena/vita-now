import argon2 from "argon2";
import type { FastifyInstance } from "fastify";

import { query, queryOne, transaction } from "../db.js";
import { lireReglages } from "../reglages.js";
import {
  exigerSessionEntreprise,
  fermerSessionEntreprise,
  ouvrirSessionEntreprise,
  sessionEntrepriseDe,
} from "../session-entreprise.js";

/**
 * entreprise-auth.ts — comptes entreprise réels, hors cadrage.
 *
 * Même schéma qu'`auth.ts` (argon2id, même message d'échec constant pour ne
 * pas révéler quelles adresses sont inscrites), mais sur `company_accounts`
 * plutôt que `accounts` : la table étudiant existante n'est pas touchée.
 */

interface LigneCompteEntreprise {
  id: string;
  company_id: string;
  mot_de_passe: string;
}

interface LigneEntreprise {
  id: string;
  nom: string;
  secteur: string;
  technosRecherchees: string[];
  profilsRecherches: string[];
  presentation: string;
}

const CHAMPS_ENTREPRISE = `
  id, nom, secteur,
  technos_recherchees AS "technosRecherchees",
  profils_recherches AS "profilsRecherches",
  presentation
`;

export async function routesEntrepriseAuth(app: FastifyInstance): Promise<void> {
  /**
   * POST /api/entreprise/inscription
   *
   * Crée l'entreprise et son compte dans une seule transaction, même
   * raisonnement que côté étudiant : une entreprise sans compte serait
   * invisible, un compte sans entreprise ferait échouer toute lecture.
   */
  app.post<{
    Body: {
      nom?: string;
      secteur?: string;
      email?: string;
      motDePasse?: string;
      presentation?: string;
    };
  }>("/api/entreprise/inscription", async (requete, reponse) => {
    if (!(await lireReglages()).inscriptionsEntrepriseOuvertes) {
      return reponse
        .code(403)
        .send({ erreur: "La création de comptes entreprise est momentanément fermée." });
    }

    const { nom, secteur, email, motDePasse, presentation } = requete.body ?? {};

    if (!nom?.trim() || !secteur?.trim() || !email?.trim() || !motDePasse) {
      return reponse
        .code(400)
        .send({ erreur: "Nom, secteur, adresse e-mail et mot de passe sont requis." });
    }
    if (motDePasse.length < 12) {
      return reponse
        .code(400)
        .send({ erreur: "Le mot de passe doit faire au moins 12 caractères." });
    }

    const dejaPris = await queryOne<{ id: string }>(
      "SELECT id FROM company_accounts WHERE email = $1",
      [email.trim()],
    );
    if (dejaPris) {
      return reponse
        .code(409)
        .send({ erreur: "Un compte entreprise existe déjà avec cette adresse." });
    }

    const empreinte = await argon2.hash(motDePasse, { type: argon2.argon2id });

    const entreprise = await transaction(async (client) => {
      const { rows } = await client.query<LigneEntreprise>(
        `INSERT INTO companies (nom, secteur, presentation)
         VALUES ($1, $2, $3)
         RETURNING ${CHAMPS_ENTREPRISE}`,
        [nom.trim(), secteur.trim(), presentation?.trim() ?? ""],
      );
      const creee = rows[0]!;

      await client.query(
        `INSERT INTO company_accounts (company_id, email, mot_de_passe)
         VALUES ($1, $2, $3)`,
        [creee.id, email.trim(), empreinte],
      );

      return creee;
    });

    ouvrirSessionEntreprise(reponse, entreprise.id);
    return reponse.code(201).send({ entreprise });
  });

  app.post<{ Body: { email?: string; motDePasse?: string } }>(
    "/api/entreprise/connexion",
    async (requete, reponse) => {
      const { email, motDePasse } = requete.body ?? {};
      if (!email?.trim() || !motDePasse) {
        return reponse
          .code(400)
          .send({ erreur: "Adresse e-mail et mot de passe requis." });
      }

      const compte = await queryOne<LigneCompteEntreprise>(
        `SELECT id, company_id, mot_de_passe FROM company_accounts WHERE email = $1`,
        [email.trim()],
      );

      const refus = { erreur: "Adresse e-mail ou mot de passe incorrect." };

      if (!compte) {
        // Même vérification à vide que auth.ts — un compte inexistant ne doit
        // pas répondre plus vite qu'un compte réel.
        await argon2
          .verify(
            "$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHR2YWx1ZQ$m5aC1o1tJEbSDVCr6PLg7yBjEJyLDGvGKl0Hn5Q1Zks",
            motDePasse,
          )
          .catch(() => false);
        return reponse.code(401).send(refus);
      }

      const valide = await argon2.verify(compte.mot_de_passe, motDePasse);
      if (!valide) return reponse.code(401).send(refus);

      const entreprise = await queryOne<LigneEntreprise>(
        `SELECT ${CHAMPS_ENTREPRISE} FROM companies WHERE id = $1`,
        [compte.company_id],
      );
      if (!entreprise) return reponse.code(401).send(refus);

      ouvrirSessionEntreprise(reponse, entreprise.id);
      return { entreprise };
    },
  );

  app.get("/api/entreprise/session", async (requete) => {
    const id = sessionEntrepriseDe(requete);
    if (!id) return { entreprise: null };

    const entreprise = await queryOne<LigneEntreprise>(
      `SELECT ${CHAMPS_ENTREPRISE} FROM companies WHERE id = $1`,
      [id],
    );
    return { entreprise };
  });

  app.post("/api/entreprise/deconnexion", async (_requete, reponse) => {
    fermerSessionEntreprise(reponse);
    return { deconnecte: true };
  });

  /** PATCH /api/entreprise/profil — édition du profil entreprise. */
  app.patch<{
    Body: Partial<{
      nom: string;
      secteur: string;
      presentation: string;
      technosRecherchees: string[];
      profilsRecherches: string[];
    }>;
  }>("/api/entreprise/profil", async (requete, reponse) => {
    const id = await exigerSessionEntreprise(requete, reponse);
    if (!id) return;

    const corps = requete.body ?? {};

    const morceaux: string[] = [];
    const valeurs: unknown[] = [];
    const poser = (colonne: string, valeur: unknown) => {
      valeurs.push(valeur);
      morceaux.push(`${colonne} = $${valeurs.length}`);
    };

    if (corps.nom?.trim()) poser("nom", corps.nom.trim());
    if (corps.secteur?.trim()) poser("secteur", corps.secteur.trim());
    if (corps.presentation !== undefined) poser("presentation", corps.presentation);
    if (corps.technosRecherchees !== undefined)
      poser("technos_recherchees", corps.technosRecherchees);
    if (corps.profilsRecherches !== undefined)
      poser("profils_recherches", corps.profilsRecherches);

    if (morceaux.length === 0) {
      return reponse.code(400).send({ erreur: "Aucun champ à modifier." });
    }

    valeurs.push(id);
    const lignes = await query<LigneEntreprise>(
      `UPDATE companies SET ${morceaux.join(", ")}
       WHERE id = $${valeurs.length}
       RETURNING ${CHAMPS_ENTREPRISE}`,
      valeurs,
    );

    return { entreprise: lignes[0] };
  });
}
