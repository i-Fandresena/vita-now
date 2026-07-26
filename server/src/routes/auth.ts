import argon2 from "argon2";
import type { FastifyInstance } from "fastify";

import { query, queryOne, transaction } from "../db.js";
import { exigerSession, fermerSession, ouvrirSession, sessionDe } from "../session.js";

/**
 * auth.ts — M1, pour de vrai.
 *
 * Jusqu'ici aucun mot de passe n'était demandé ni vérifié, et les écrans le
 * disaient. Ici il l'est : argon2id, le seul algorithme recommandé aujourd'hui
 * pour du stockage de mot de passe. Ni bcrypt (plafonné à 72 octets), ni SHA
 * (conçu pour être rapide — exactement ce qu'on ne veut pas).
 *
 * Ces comptes sont réutilisés ailleurs par leurs propriétaires : un étudiant
 * mettra le mot de passe de sa messagerie. C'est ce qui justifie de ne pas
 * traiter cette partie comme un décor de démonstration.
 */

interface LigneCompte {
  id: string;
  student_id: string;
  mot_de_passe: string | null;
}

interface LigneEtudiant {
  id: string;
  nom: string;
  initiales: string;
  universite: string;
  niveau: string;
  filiere: string;
  interets: string[];
  disponibilites: string[];
  objectifs: string;
  mentor: boolean;
  promo: string;
}

const CHAMPS_ETUDIANT = `
  id, nom, initiales, universite, niveau, filiere, interets,
  disponibilites, objectifs, mentor, promo
`;

/** Initiales à partir du nom — « Soa Rakotoarisoa » donne « SR ». */
function initialesDe(nom: string): string {
  const mots = nom.trim().split(/\s+/).filter(Boolean);
  const lettres = mots.slice(0, 2).map((m) => m[0] ?? "");
  return lettres.join("").toUpperCase() || "?";
}

export async function routesAuth(app: FastifyInstance): Promise<void> {
  /**
   * POST /api/auth/inscription
   *
   * Crée l'étudiant et son compte dans une seule transaction : un étudiant
   * sans compte serait invisible et inaccessible, un compte sans étudiant
   * ferait échouer toute lecture ultérieure.
   */
  app.post<{
    Body: {
      nom?: string;
      email?: string;
      motDePasse?: string;
      universite?: string;
      niveau?: string;
      filiere?: string;
      objectifs?: string;
    };
  }>("/api/auth/inscription", async (requete, reponse) => {
    const { nom, email, motDePasse, universite, niveau, filiere, objectifs } =
      requete.body ?? {};

    if (!nom?.trim() || !email?.trim() || !motDePasse) {
      return reponse
        .code(400)
        .send({ erreur: "Nom, adresse e-mail et mot de passe sont requis." });
    }

    // Douze caractères plutôt que huit : la longueur est le seul facteur qui
    // compte vraiment, et exiger des symboles pousse aux variantes prévisibles
    // (« Motdepasse1! ») sans rien gagner.
    if (motDePasse.length < 12) {
      return reponse
        .code(400)
        .send({ erreur: "Le mot de passe doit faire au moins 12 caractères." });
    }

    const dejaPris = await queryOne<{ id: string }>(
      "SELECT id FROM accounts WHERE email = $1 AND provider = 'email'",
      [email.trim()],
    );
    if (dejaPris) {
      return reponse
        .code(409)
        .send({ erreur: "Un compte existe déjà avec cette adresse." });
    }

    const empreinte = await argon2.hash(motDePasse, { type: argon2.argon2id });

    const etudiant = await transaction(async (client) => {
      const { rows } = await client.query<LigneEtudiant>(
        `INSERT INTO students (nom, initiales, universite, niveau, filiere, objectifs, promo)
         VALUES ($1, $2, $3, $4::niveau, $5, $6, $7)
         RETURNING ${CHAMPS_ETUDIANT}`,
        [
          nom.trim(),
          initialesDe(nom),
          universite?.trim() || "ENI Fianarantsoa",
          niveau || "L1",
          filiere?.trim() || "",
          objectifs?.trim() || "",
          String(new Date().getFullYear()),
        ],
      );
      const cree = rows[0]!;

      await client.query(
        `INSERT INTO accounts (student_id, email, provider, mot_de_passe)
         VALUES ($1, $2, 'email', $3)`,
        [cree.id, email.trim(), empreinte],
      );
      await client.query("INSERT INTO channel_prefs (student_id) VALUES ($1)", [
        cree.id,
      ]);

      return cree;
    });

    ouvrirSession(reponse, etudiant.id);
    return reponse.code(201).send({ etudiant });
  });

  /**
   * POST /api/auth/connexion
   *
   * Le message d'échec est **le même** que le compte n'existe pas ou que le
   * mot de passe soit faux. Distinguer les deux dirait à un inconnu quelles
   * adresses sont inscrites ici.
   */
  app.post<{ Body: { email?: string; motDePasse?: string } }>(
    "/api/auth/connexion",
    async (requete, reponse) => {
      const { email, motDePasse } = requete.body ?? {};
      if (!email?.trim() || !motDePasse) {
        return reponse
          .code(400)
          .send({ erreur: "Adresse e-mail et mot de passe requis." });
      }

      const compte = await queryOne<LigneCompte>(
        `SELECT id, student_id, mot_de_passe
         FROM accounts WHERE email = $1 AND provider = 'email'`,
        [email.trim()],
      );

      const refus = { erreur: "Adresse e-mail ou mot de passe incorrect." };

      if (!compte?.mot_de_passe) {
        // Vérification à vide malgré tout : sans elle, un compte inexistant
        // répondrait en 1 ms et un compte réel en ~80 ms. L'écart se mesure,
        // et révèle quelles adresses sont inscrites.
        await argon2.verify(
          "$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHR2YWx1ZQ$m5aC1o1tJEbSDVCr6PLg7yBjEJyLDGvGKl0Hn5Q1Zks",
          motDePasse,
        ).catch(() => false);
        return reponse.code(401).send(refus);
      }

      const valide = await argon2.verify(compte.mot_de_passe, motDePasse);
      if (!valide) return reponse.code(401).send(refus);

      const etudiant = await queryOne<LigneEtudiant>(
        `SELECT ${CHAMPS_ETUDIANT} FROM students WHERE id = $1`,
        [compte.student_id],
      );
      if (!etudiant) return reponse.code(401).send(refus);

      ouvrirSession(reponse, etudiant.id);
      return { etudiant };
    },
  );

  /**
   * GET /api/auth/session — qui suis-je ?
   *
   * Répond 200 avec `null` plutôt que 401 quand personne n'est connecté :
   * c'est la première requête que fait le front au chargement, et une erreur
   * dans la console à chaque visite anonyme rendrait les vraies illisibles.
   */
  app.get("/api/auth/session", async (requete) => {
    const id = sessionDe(requete);
    if (!id) return { etudiant: null };

    const etudiant = await queryOne<LigneEtudiant>(
      `SELECT ${CHAMPS_ETUDIANT} FROM students WHERE id = $1`,
      [id],
    );
    return { etudiant };
  });

  app.post("/api/auth/deconnexion", async (_requete, reponse) => {
    fermerSession(reponse);
    return { deconnecte: true };
  });

  /** PATCH /api/profil — M1, édition. */
  app.patch<{
    Body: Partial<{
      nom: string;
      universite: string;
      niveau: string;
      filiere: string;
      objectifs: string;
      interets: string[];
      disponibilites: string[];
    }>;
  }>("/api/profil", async (requete, reponse) => {
    const id = await exigerSession(requete, reponse);
    if (!id) return;

    const corps = requete.body ?? {};

    /* Mise à jour partielle : on ne touche qu'aux champs réellement fournis.
       Un `UPDATE` de toutes les colonnes écraserait par `null` tout ce que le
       formulaire n'a pas envoyé — un écran qui ne modifie que le nom viderait
       les centres d'intérêt. */
    const morceaux: string[] = [];
    const valeurs: unknown[] = [];
    const poser = (colonne: string, valeur: unknown, cast = "") => {
      valeurs.push(valeur);
      morceaux.push(`${colonne} = $${valeurs.length}${cast}`);
    };

    if (corps.nom?.trim()) {
      poser("nom", corps.nom.trim());
      poser("initiales", initialesDe(corps.nom));
    }
    if (corps.universite !== undefined) poser("universite", corps.universite);
    if (corps.niveau !== undefined) poser("niveau", corps.niveau, "::niveau");
    if (corps.filiere !== undefined) poser("filiere", corps.filiere);
    if (corps.objectifs !== undefined) poser("objectifs", corps.objectifs);
    if (corps.interets !== undefined) poser("interets", corps.interets);
    if (corps.disponibilites !== undefined)
      poser("disponibilites", corps.disponibilites, "::disponibilite[]");

    if (morceaux.length === 0) {
      return reponse.code(400).send({ erreur: "Aucun champ à modifier." });
    }

    valeurs.push(id);
    const lignes = await query<LigneEtudiant>(
      `UPDATE students SET ${morceaux.join(", ")}
       WHERE id = $${valeurs.length}
       RETURNING ${CHAMPS_ETUDIANT}`,
      valeurs,
    );

    return { etudiant: lignes[0] };
  });
}
