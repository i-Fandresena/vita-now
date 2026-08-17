import { randomBytes } from "node:crypto";

import argon2 from "argon2";
import type { FastifyInstance } from "fastify";

import { query, queryOne, transaction } from "../db.js";
import { validerAdresseEmail, envoyerEmail } from "../email.js";
import { env } from "../env.js";
import { genererRappelConnexion } from "../rappels.js";
import { lireReglages } from "../reglages.js";
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
  desactive_le: string | null;
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
  photoUrl: string | null;
  cvUrl: string | null;
  cvNom: string | null;
}

const CHAMPS_ETUDIANT = `
  id, nom, initiales, universite, niveau, filiere, interets,
  disponibilites, objectifs, mentor, promo,
  photo_url AS "photoUrl", cv_url AS "cvUrl", cv_nom AS "cvNom"
`;

/** Initiales à partir du nom — « Soa Rakotoarisoa » donne « SR ». */
function initialesDe(nom: string): string {
  const mots = nom.trim().split(/\s+/).filter(Boolean);
  const lettres = mots.slice(0, 2).map((m) => m[0] ?? "");
  return lettres.join("").toUpperCase() || "?";
}

async function verifierMotDePasse(studentId: string, motDePasse: string | undefined): Promise<boolean> {
  if (!motDePasse) return false;
  const compte = await queryOne<{ mot_de_passe: string | null }>(
    `SELECT mot_de_passe FROM accounts
     WHERE student_id = $1 AND provider = 'email'
     ORDER BY cree_le ASC
     LIMIT 1`,
    [studentId],
  );
  return compte?.mot_de_passe ? argon2.verify(compte.mot_de_passe, motDePasse) : false;
}

export async function routesAuth(app: FastifyInstance): Promise<void> {
  /** Le rappel est préparé à la connexion, jamais à chaque rechargement. */
  async function ouvrirSessionAvecRappel(reponse: Parameters<typeof ouvrirSession>[0], studentId: string) {
    ouvrirSession(reponse, studentId);
    // Un rappel ne doit jamais empêcher une connexion valide si sa requête
    // secondaire échoue ; il sera recalculé à la session suivante.
    await genererRappelConnexion(studentId).catch(() => undefined);
  }

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
    // Fermeture décidée depuis le centre d'administration. Vérifiée avant
    // toute validation de champ : quelqu'un qui ne peut pas s'inscrire n'a pas
    // à découvrir d'abord que son mot de passe est trop court.
    if (!(await lireReglages()).inscriptionsOuvertes) {
      return reponse
        .code(403)
        .send({ erreur: "Les inscriptions sont momentanément fermées." });
    }

    const { nom, email, motDePasse, universite, niveau, filiere, objectifs } =
      requete.body ?? {};

    if (!nom?.trim() || !email?.trim() || !motDePasse) {
      return reponse
        .code(400)
        .send({ erreur: "Nom, adresse e-mail et mot de passe sont requis." });
    }

    const validation = validerAdresseEmail(email);
    if (!validation.valide) {
      return reponse.code(400).send({ erreur: validation.raison });
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

    // Envoi e-mail de bienvenue/confirmation
    void envoyerEmail({
      destinataire: email.trim(),
      sujet: "Bienvenue sur VITA'NOW — Confirmation de votre compte",
      texte: `Bonjour ${nom.trim()},\n\nVotre compte VITA'NOW a été créé avec succès sur la plateforme.\nVous pouvez maintenant suivre vos projets et collaborer avec les autres étudiants.\n\nL'équipe VITA'NOW.`,
    });

    await ouvrirSessionAvecRappel(reponse, etudiant.id);
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
        `SELECT accounts.id, accounts.student_id, accounts.mot_de_passe,
                students.desactive_le
         FROM accounts
         JOIN students ON students.id = accounts.student_id
         WHERE accounts.email = $1 AND accounts.provider = 'email'`,
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

      const reactive = compte.desactive_le !== null;
      if (reactive) {
        await query("UPDATE students SET desactive_le = NULL WHERE id = $1", [compte.student_id]);
      }

      await ouvrirSessionAvecRappel(reponse, etudiant.id);
      return { etudiant, reactive };
    },
  );

  /**
   * OAuth Google — hors cadrage, addition demandée directement.
   *
   * Flux en deux temps, classique : `/google` redirige vers l'écran de
   * consentement Google avec un jeton `state` aléatoire posé dans un cookie
   * signé (protection CSRF — sans lui, un tiers pourrait forger un retour
   * de callback et connecter la victime sur le compte de l'attaquant) ;
   * `/google/callback` vérifie ce jeton, échange le code contre un jeton
   * d'accès, lit l'e-mail Google, puis :
   *   1. un compte Google existe déjà pour cet e-mail → session directe ;
   *   2. sinon, un compte (mot de passe) existe pour le même e-mail → on
   *      relie l'identité Google au même étudiant (une seule personne, deux
   *      façons de se connecter) ;
   *   3. sinon, nouvel étudiant, comme `/api/auth/inscription`.
   *
   * L'e-mail Google doit être vérifié (`email_verified`) : sans cette
   * condition, un compte Google mal configuré pourrait revendiquer une
   * adresse qu'il ne contrôle pas réellement.
   *
   * Cette route répond par une redirection de navigateur complète (jamais du
   * JSON) : l'appelant est Google, pas le SPA.
   */
  const NOM_COOKIE_ETAT_GOOGLE = "vitanow_oauth_state";

  app.get("/api/auth/google", async (_requete, reponse) => {
    if (!env.googleClientId) {
      return reponse.code(503).send({ erreur: "Connexion Google non configurée." });
    }

    const etat = randomBytes(24).toString("hex");
    reponse.setCookie(NOM_COOKIE_ETAT_GOOGLE, etat, {
      path: "/",
      httpOnly: true,
      secure: env.production,
      // `lax` et non `strict` : ce cookie doit survivre à la redirection
      // (navigation de premier niveau) qui ramène Google vers notre callback.
      sameSite: "lax",
      signed: true,
      maxAge: 600, // Dix minutes — le temps de l'aller-retour chez Google.
    });

    const parametres = new URLSearchParams({
      client_id: env.googleClientId,
      redirect_uri: env.googleRedirectUri,
      response_type: "code",
      scope: "openid email profile",
      state: etat,
      prompt: "select_account",
    });

    return reponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${parametres}`);
  });

  app.get<{ Querystring: { code?: string; state?: string; error?: string } }>(
    "/api/auth/google/callback",
    async (requete, reponse) => {
      // Échec : toujours une redirection vers l'écran de connexion, jamais du
      // JSON — un navigateur qui vient de Google ne lit pas de corps de réponse.
      const echec = () => reponse.redirect(`${env.corsOrigin}/#/connexion`);

      if (!env.googleClientId || !env.googleClientSecret) return echec();

      const { code, state, error } = requete.query;
      if (error || !code || !state) return echec();

      const brutEtat = requete.cookies[NOM_COOKIE_ETAT_GOOGLE];
      reponse.clearCookie(NOM_COOKIE_ETAT_GOOGLE, { path: "/" });
      const etatVerifie = brutEtat ? requete.unsignCookie(brutEtat) : null;
      if (!etatVerifie?.valid || etatVerifie.value !== state) return echec();

      try {
        const reponseJeton = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: env.googleClientId,
            client_secret: env.googleClientSecret,
            redirect_uri: env.googleRedirectUri,
            grant_type: "authorization_code",
          }),
        });
        if (!reponseJeton.ok) return echec();
        const { access_token: jetonAcces } = (await reponseJeton.json()) as {
          access_token?: string;
        };
        if (!jetonAcces) return echec();

        const reponseProfil = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { authorization: `Bearer ${jetonAcces}` },
        });
        if (!reponseProfil.ok) return echec();
        const profil = (await reponseProfil.json()) as {
          email?: string;
          email_verified?: boolean;
          name?: string;
        };
        if (!profil.email || !profil.email_verified) return echec();

        const email = profil.email.trim();

        // 1. Déjà relié à Google ?
        let studentId: string | undefined = (
          await queryOne<{ student_id: string }>(
            `SELECT student_id FROM accounts WHERE email = $1 AND provider = 'google'`,
            [email],
          )
        )?.student_id;

        // 2. Sinon, un compte existant à la même adresse (mot de passe,
        //    éventuellement un autre fournisseur) : on relie plutôt que
        //    dupliquer — une même personne, deux façons de se connecter.
        if (!studentId) {
          const existant = await queryOne<{ student_id: string }>(
            `SELECT student_id FROM accounts WHERE email = $1 LIMIT 1`,
            [email],
          );
          if (existant) {
            await query(
              `INSERT INTO accounts (student_id, email, provider) VALUES ($1, $2, 'google')`,
              [existant.student_id, email],
            );
            studentId = existant.student_id;
          }
        }

        // 3. Sinon, nouvel étudiant — mêmes valeurs par défaut que l'inscription
        //    par e-mail, puisque Google ne fournit ni université, ni filière.
        if (!studentId) {
          const nom = profil.name?.trim() || email.split("@")[0]!;
          const cree = await transaction(async (client) => {
            const { rows } = await client.query<{ id: string }>(
              `INSERT INTO students (nom, initiales, universite, niveau, filiere, objectifs, promo)
               VALUES ($1, $2, $3, 'L1', '', '', $4)
               RETURNING id`,
              [nom, initialesDe(nom), "ENI Fianarantsoa", String(new Date().getFullYear())],
            );
            const etudiant = rows[0]!;
            await client.query(
              `INSERT INTO accounts (student_id, email, provider) VALUES ($1, $2, 'google')`,
              [etudiant.id, email],
            );
            await client.query("INSERT INTO channel_prefs (student_id) VALUES ($1)", [
              etudiant.id,
            ]);
            return etudiant;
          });
          studentId = cree.id;
        }

        // Cycle de vie du compte (migration 013) : une connexion Google
        // réactive un compte désactivé, comme la connexion par mot de passe.
        await query("UPDATE students SET desactive_le = NULL WHERE id = $1", [studentId]);

        await ouvrirSessionAvecRappel(reponse, studentId);
        return reponse.redirect(`${env.corsOrigin}/#/tableau`);
      } catch {
        return echec();
      }
    },
  );

  /* GitHub reprend le même contrat que Google : un `state` signé dans un
     cookie distinct, puis une redirection navigateur au succès comme à
     l'échec. L'API GitHub ne garantit pas que l'e-mail du profil soit public,
     d'où le scope `user:email` et le repli vers `/user/emails`. */
  const NOM_COOKIE_ETAT_GITHUB = "vitanow_oauth_state_github";

  app.get("/api/auth/github", async (_requete, reponse) => {
    if (!env.githubClientId) {
      return reponse.code(503).send({ erreur: "Connexion GitHub non configurée." });
    }

    const etat = randomBytes(24).toString("hex");
    reponse.setCookie(NOM_COOKIE_ETAT_GITHUB, etat, {
      path: "/",
      httpOnly: true,
      secure: env.production,
      sameSite: "lax",
      signed: true,
      maxAge: 600,
    });

    const parametres = new URLSearchParams({
      client_id: env.githubClientId,
      redirect_uri: env.githubRedirectUri,
      scope: "read:user user:email",
      state: etat,
    });
    return reponse.redirect(`https://github.com/login/oauth/authorize?${parametres}`);
  });

  app.get<{ Querystring: { code?: string; state?: string; error?: string } }>(
    "/api/auth/github/callback",
    async (requete, reponse) => {
      const echec = () => reponse.redirect(`${env.corsOrigin}/#/connexion`);
      if (!env.githubClientId || !env.githubClientSecret) return echec();

      const { code, state, error } = requete.query;
      if (error || !code || !state) return echec();

      const brutEtat = requete.cookies[NOM_COOKIE_ETAT_GITHUB];
      reponse.clearCookie(NOM_COOKIE_ETAT_GITHUB, { path: "/" });
      const etatVerifie = brutEtat ? requete.unsignCookie(brutEtat) : null;
      if (!etatVerifie?.valid || etatVerifie.value !== state) return echec();

      try {
        const reponseJeton = await fetch("https://github.com/login/oauth/access_token", {
          method: "POST",
          headers: {
            accept: "application/json",
            "content-type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            client_id: env.githubClientId,
            client_secret: env.githubClientSecret,
            code,
            redirect_uri: env.githubRedirectUri,
          }),
          signal: AbortSignal.timeout(15_000),
        });
        if (!reponseJeton.ok) return echec();
        const { access_token: jetonAcces } = (await reponseJeton.json()) as { access_token?: string };
        if (!jetonAcces) return echec();

        const entetesGitHub = {
          authorization: `Bearer ${jetonAcces}`,
          "user-agent": "VITA-NOW",
          accept: "application/vnd.github+json",
        };
        const reponseProfil = await fetch("https://api.github.com/user", {
          headers: entetesGitHub,
          signal: AbortSignal.timeout(15_000),
        });
        if (!reponseProfil.ok) return echec();
        const profil = (await reponseProfil.json()) as {
          email?: string | null;
          name?: string | null;
          login?: string;
        };

        /* Le profil peut exposer un e-mail public, mais ne fournit pas le
           drapeau `verified`. L'endpoint dédié est donc consulté dans tous
           les cas : si l'e-mail est privé il le fournit, sinon il confirme
           qu'il est bien primaire et vérifié. */
        const reponseEmails = await fetch("https://api.github.com/user/emails", {
          headers: entetesGitHub,
          signal: AbortSignal.timeout(15_000),
        });
        if (!reponseEmails.ok) return echec();
        const emails = (await reponseEmails.json()) as Array<{
          email?: string;
          primary?: boolean;
          verified?: boolean;
        }>;
        const email = emails.find((item) => item.primary && item.verified)?.email?.trim() || "";
        if (!email) return echec();

        let studentId: string | undefined = (
          await queryOne<{ student_id: string }>(
            `SELECT student_id FROM accounts WHERE email = $1 AND provider = 'github'`,
            [email],
          )
        )?.student_id;

        if (!studentId) {
          const existant = await queryOne<{ student_id: string }>(
            `SELECT student_id FROM accounts WHERE email = $1 LIMIT 1`,
            [email],
          );
          if (existant) {
            await query(
              `INSERT INTO accounts (student_id, email, provider) VALUES ($1, $2, 'github')`,
              [existant.student_id, email],
            );
            studentId = existant.student_id;
          }
        }

        if (!studentId) {
          const nom = profil.name?.trim() || profil.login?.trim() || email.split("@")[0]!;
          const cree = await transaction(async (client) => {
            const { rows } = await client.query<{ id: string }>(
              `INSERT INTO students (nom, initiales, universite, niveau, filiere, objectifs, promo)
               VALUES ($1, $2, $3, 'L1', '', '', $4)
               RETURNING id`,
              [nom, initialesDe(nom), "ENI Fianarantsoa", String(new Date().getFullYear())],
            );
            const etudiant = rows[0]!;
            await client.query(
              `INSERT INTO accounts (student_id, email, provider) VALUES ($1, $2, 'github')`,
              [etudiant.id, email],
            );
            await client.query("INSERT INTO channel_prefs (student_id) VALUES ($1)", [etudiant.id]);
            return etudiant;
          });
          studentId = cree.id;
        }

        await query("UPDATE students SET desactive_le = NULL WHERE id = $1", [studentId]);
        await ouvrirSessionAvecRappel(reponse, studentId);
        return reponse.redirect(`${env.corsOrigin}/#/tableau`);
      } catch {
        return echec();
      }
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
    const id = await sessionDe(requete);
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

  /** Désactivation réversible : une prochaine connexion avec le mot de passe
      remet le compte en service. */
  app.post<{ Body: { motDePasse?: string; confirmation?: string } }>(
    "/api/auth/compte/desactiver",
    async (requete, reponse) => {
      const id = await exigerSession(requete, reponse);
      if (!id) return;
      if (requete.body?.confirmation !== "DESACTIVER") {
        return reponse.code(400).send({ erreur: "Saisissez DESACTIVER pour confirmer." });
      }
      if (!(await verifierMotDePasse(id, requete.body?.motDePasse))) {
        return reponse.code(401).send({ erreur: "Mot de passe incorrect." });
      }
      await query("UPDATE students SET desactive_le = now() WHERE id = $1", [id]);
      fermerSession(reponse);
      return { desactive: true };
    },
  );

  /** Suppression irréversible : les relations de l'étudiant sont déjà toutes
      définies avec les cascades nécessaires dans le schéma PostgreSQL. */
  app.delete<{ Body: { motDePasse?: string; confirmation?: string } }>(
    "/api/auth/compte",
    async (requete, reponse) => {
      const id = await exigerSession(requete, reponse);
      if (!id) return;
      if (requete.body?.confirmation !== "SUPPRIMER") {
        return reponse.code(400).send({ erreur: "Saisissez SUPPRIMER pour confirmer." });
      }
      if (!(await verifierMotDePasse(id, requete.body?.motDePasse))) {
        return reponse.code(401).send({ erreur: "Mot de passe incorrect." });
      }
      await transaction(async (client) => {
        await client.query("DELETE FROM students WHERE id = $1", [id]);
      });
      fermerSession(reponse);
      return { supprime: true };
    },
  );

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
