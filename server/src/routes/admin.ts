import argon2 from "argon2";
import type { FastifyInstance } from "fastify";

import { query, queryOne } from "../db.js";
import { env } from "../env.js";
import { ecrireReglages, lireReglages, type Reglages } from "../reglages.js";
import {
  adminConfigure,
  exigerAdmin,
  fermerSessionAdmin,
  identifiantsAdminValides,
  ouvrirSessionAdmin,
  sessionAdminDe,
} from "../session-admin.js";

/**
 * admin.ts — le centre d'administration.
 *
 * **Une seule mécanique, décrite par des données.** Quinze collections, une
 * quinzaine de tables éditables : les écrire en quinze routes manuscrites
 * garantirait que la seizième oublie une vérification. Tout passe donc par
 * deux descripteurs — `COLLECTIONS` (ce qui se lit) et `EDITABLES` (ce qui
 * s'écrit) — et par un petit nombre de routes génériques qui les consultent.
 *
 * **Rien n'est interpolé sans liste blanche.** Les noms de tables, de colonnes
 * et les expressions SQL viennent exclusivement de ces descripteurs, jamais de
 * la requête : le client ne fournit que des *clés*, et une clé absente du
 * descripteur est refusée. Les valeurs, elles, restent des paramètres liés.
 *
 * **Ce que l'administration ne fait pas.** Elle ne se substitue pas à un
 * étudiant : pas d'usurpation de session, pas de lecture du contenu des
 * conversations Copilote depuis les listes. Elle voit, corrige et supprime —
 * ce qui suffit à tenir la plateforme, et laisse une frontière lisible entre
 * administrer et espionner.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Plafond dur : un `taille=100000` ne doit pas pouvoir vider la base en RAM. */
const TAILLE_MAX = 100;

interface Collection {
  /** Table portant la clé primaire — cible des suppressions. */
  table: string;
  /** Colonnes projetées, alias compris. */
  select: string;
  /** Source, jointures incluses. */
  from: string;
  /** Expression booléenne utilisant `$1` (motif ILIKE). */
  recherche: string;
  ordre: string;
}

const COLLECTIONS = {
  etudiants: {
    table: "students",
    select: `s.id, s.nom, s.initiales, s.universite, s.niveau::text AS niveau,
      s.filiere, s.promo, s.interets, s.objectifs, s.mentor,
      s.desactive_le AS "deactivatedAt", s.cree_le AS "createdAt",
      (SELECT a.email::text FROM accounts a WHERE a.student_id = s.id ORDER BY a.cree_le LIMIT 1) AS email,
      (SELECT count(*)::int FROM projects p WHERE p.owner_id = s.id) AS "projectCount",
      (SELECT count(*)::int FROM forum_threads f WHERE f.auteur_id = s.id) AS "threadCount",
      (SELECT count(*)::int FROM points pt WHERE pt.student_id = s.id) AS "pointCount"`,
    from: "students s",
    recherche: "(s.nom ILIKE $1 OR s.filiere ILIKE $1 OR s.promo ILIKE $1 OR s.universite ILIKE $1)",
    ordre: "s.cree_le DESC",
  },
  entreprises: {
    table: "companies",
    select: `c.id, c.nom, c.secteur, c.presentation,
      c.technos_recherchees AS "technosRecherchees",
      c.profils_recherches AS "profilsRecherches",
      (SELECT ca.email::text FROM company_accounts ca WHERE ca.company_id = c.id ORDER BY ca.id LIMIT 1) AS email,
      (SELECT count(*)::int FROM opportunities o WHERE o.company_id = c.id) AS "opportunityCount"`,
    from: "companies c",
    recherche: "(c.nom ILIKE $1 OR c.secteur ILIKE $1)",
    ordre: "c.nom",
  },
  projets: {
    table: "projects",
    select: `p.id, p.nom, p.description, p.statut::text AS statut, p.type::text AS type,
      p.difficulte::text AS difficulte, p.objectif, p.technos, p.public,
      p.duree_semaines AS "dureeSemaines", p.raison_abandon AS "raisonAbandon",
      p.derniere_activite AS "updatedAt", p.owner_id AS "ownerId", s.nom AS "ownerName"`,
    from: "projects p JOIN students s ON s.id = p.owner_id",
    recherche: "(p.nom ILIKE $1 OR s.nom ILIKE $1 OR p.objectif ILIKE $1)",
    ordre: "p.derniere_activite DESC",
  },
  journal: {
    table: "journal_entries",
    select: `j.id, j.titre, j.corps, j.nature::text AS nature, j.jalon, j.date,
      p.nom AS "projectName", s.nom AS "ownerName"`,
    from: `journal_entries j
      JOIN projects p ON p.id = j.project_id
      JOIN students s ON s.id = p.owner_id`,
    recherche: "(j.titre ILIKE $1 OR j.corps ILIKE $1 OR p.nom ILIKE $1)",
    ordre: "j.date DESC",
  },
  discussions: {
    table: "forum_threads",
    select: `f.id, f.titre, f.corps, f.categorie::text AS categorie, f.date,
      s.nom AS "authorName",
      (SELECT count(*)::int FROM forum_replies r WHERE r.thread_id = f.id) AS "replyCount"`,
    from: "forum_threads f JOIN students s ON s.id = f.auteur_id",
    recherche: "(f.titre ILIKE $1 OR f.corps ILIKE $1 OR s.nom ILIKE $1)",
    ordre: "f.date DESC",
  },
  reponses: {
    table: "forum_replies",
    select: `r.id, r.corps, r.date, r.de_mentor AS "deMentor",
      f.titre AS "threadTitle", s.nom AS "authorName"`,
    from: `forum_replies r
      JOIN forum_threads f ON f.id = r.thread_id
      JOIN students s ON s.id = r.auteur_id`,
    recherche: "(r.corps ILIKE $1 OR f.titre ILIKE $1 OR s.nom ILIKE $1)",
    ordre: "r.date DESC",
  },
  fiches: {
    table: "fiches",
    select: `fi.id, fi.titre, fi.promesse, fi.oeuvre, fi.nature::text AS nature,
      fi.annee, fi.domaine, fi.etat::text AS etat, fi.cree_le AS "createdAt",
      s.nom AS "authorName",
      (SELECT count(*)::int FROM fiche_uses fu WHERE fu.fiche_id = fi.id) AS "useCount"`,
    from: "fiches fi JOIN students s ON s.id = fi.author_id",
    recherche: "(fi.titre ILIKE $1 OR fi.domaine ILIKE $1 OR s.nom ILIKE $1)",
    ordre: "fi.cree_le DESC",
  },
  idees: {
    table: "ideas",
    select: `i.id, i.titre, i.corps, i.date, s.nom AS "authorName",
      (SELECT count(*)::int FROM idea_votes v WHERE v.idea_id = i.id AND v.sens = 'pour') AS "votes",
      (SELECT count(*)::int FROM idea_comments ic WHERE ic.idea_id = i.id) AS "commentCount"`,
    from: "ideas i JOIN students s ON s.id = i.auteur_id",
    recherche: "(i.titre ILIKE $1 OR i.corps ILIKE $1 OR s.nom ILIKE $1)",
    ordre: "i.date DESC",
  },
  defis: {
    table: "challenges",
    select: `ch.id, ch.titre, ch.description, ch.techno,
      ch.duree_jours AS "dureeJours", ch.debut, ch.recompense, c.nom AS "sponsorName",
      (SELECT count(*)::int FROM challenge_participants cp WHERE cp.challenge_id = ch.id) AS "participantCount"`,
    from: "challenges ch LEFT JOIN companies c ON c.id = ch.sponsor_id",
    recherche: "(ch.titre ILIKE $1 OR ch.techno ILIKE $1)",
    ordre: "ch.debut DESC",
  },
  mentorat: {
    table: "mentor_requests",
    select: `m.id, m.blocage, m.statut::text AS statut, m.date,
      s.nom AS "studentName", mt.nom AS "mentorName"`,
    from: `mentor_requests m
      JOIN students s ON s.id = m.student_id
      JOIN students mt ON mt.id = m.mentor_id`,
    recherche: "(m.blocage ILIKE $1 OR s.nom ILIKE $1 OR mt.nom ILIKE $1)",
    ordre: "m.date DESC",
  },
  annonces: {
    table: "opportunities",
    select: `o.id, o.titre, o.description, o.technos, o.profil,
      o.nature::text AS nature, o.duree_mois AS "dureeMois",
      o.publiee_le AS "publishedAt",
      COALESCE(c.nom, s.nom, 'Inconnu') AS "ownerName"`,
    from: `opportunities o
      LEFT JOIN companies c ON c.id = o.company_id
      LEFT JOIN students s ON s.id = o.student_id`,
    recherche: "(o.titre ILIKE $1 OR o.profil ILIKE $1 OR c.nom ILIKE $1 OR s.nom ILIKE $1)",
    ordre: "o.publiee_le DESC",
  },
  evenements: {
    table: "events",
    select: `e.id, e.titre, e.date, e.heure::text AS heure, e.type::text AS type,
      s.nom AS "studentName"`,
    from: "events e JOIN students s ON s.id = e.student_id",
    recherche: "(e.titre ILIKE $1 OR s.nom ILIKE $1)",
    ordre: "e.date DESC",
  },
  conversations: {
    table: "copilot_conversations",
    select: `c.id, c.title, c.role, c.updated_at AS "updatedAt",
      s.nom AS "studentName",
      (SELECT count(*)::int FROM copilot_messages m WHERE m.conversation_id = c.id) AS "messageCount"`,
    from: "copilot_conversations c JOIN students s ON s.id = c.student_id",
    recherche: "(c.title ILIKE $1 OR s.nom ILIKE $1)",
    ordre: "c.updated_at DESC",
  },
  points: {
    table: "points",
    select: `pt.id, pt.motif::text AS motif, pt.detail, pt.date,
      pt.student_id AS "studentId", s.nom AS "studentName"`,
    from: "points pt JOIN students s ON s.id = pt.student_id",
    recherche: "(pt.detail ILIKE $1 OR s.nom ILIKE $1)",
    ordre: "pt.date DESC",
  },
  notifications: {
    table: "notifications",
    select: `n.id, n.titre, n.corps, n.nature::text AS nature, n.date, n.lu,
      s.nom AS "studentName"`,
    from: "notifications n JOIN students s ON s.id = n.student_id",
    recherche: "(n.titre ILIKE $1 OR n.corps ILIKE $1 OR s.nom ILIKE $1)",
    ordre: "n.date DESC",
  },
} as const satisfies Record<string, Collection>;

type NomCollection = keyof typeof COLLECTIONS;

function collectionValide(nom: string): nom is NomCollection {
  return Object.prototype.hasOwnProperty.call(COLLECTIONS, nom);
}

/* ------------------------------------------------------------------ */
/* Champs éditables                                                    */
/* ------------------------------------------------------------------ */

type Genre = "texte" | "texteOuNull" | "liste" | "booleen" | "entier" | "date";

interface Champ {
  colonne: string;
  genre: Genre;
  /** Type PostgreSQL à appliquer au paramètre — indispensable pour les ENUM. */
  cast?: string;
  /** Valeurs admises côté serveur, pour rendre un 400 lisible plutôt qu'un 500. */
  valeurs?: readonly string[];
}

const STATUTS_PROJET = ["Idée", "En cours", "En pause", "Abandonné", "Terminé"] as const;

const EDITABLES: Partial<Record<NomCollection, Record<string, Champ>>> = {
  etudiants: {
    nom: { colonne: "nom", genre: "texte" },
    initiales: { colonne: "initiales", genre: "texte" },
    universite: { colonne: "universite", genre: "texte" },
    niveau: { colonne: "niveau", genre: "texte", cast: "niveau", valeurs: ["L1", "L2", "L3", "M1", "M2"] },
    filiere: { colonne: "filiere", genre: "texte" },
    promo: { colonne: "promo", genre: "texte" },
    interets: { colonne: "interets", genre: "liste" },
    objectifs: { colonne: "objectifs", genre: "texte" },
    mentor: { colonne: "mentor", genre: "booleen" },
  },
  entreprises: {
    nom: { colonne: "nom", genre: "texte" },
    secteur: { colonne: "secteur", genre: "texte" },
    presentation: { colonne: "presentation", genre: "texte" },
    technosRecherchees: { colonne: "technos_recherchees", genre: "liste" },
    profilsRecherches: { colonne: "profils_recherches", genre: "liste" },
  },
  projets: {
    nom: { colonne: "nom", genre: "texte" },
    description: { colonne: "description", genre: "texte" },
    objectif: { colonne: "objectif", genre: "texte" },
    statut: { colonne: "statut", genre: "texte", cast: "projet_statut", valeurs: STATUTS_PROJET },
    type: {
      colonne: "type",
      genre: "texte",
      cast: "projet_type",
      valeurs: ["Académique", "Personnel", "Startup", "Open source", "Recherche"],
    },
    difficulte: {
      colonne: "difficulte",
      genre: "texte",
      cast: "difficulte",
      valeurs: ["Découverte", "Intermédiaire", "Ambitieux"],
    },
    technos: { colonne: "technos", genre: "liste" },
    public: { colonne: "public", genre: "booleen" },
    dureeSemaines: { colonne: "duree_semaines", genre: "entier" },
    raisonAbandon: { colonne: "raison_abandon", genre: "texteOuNull" },
  },
  journal: {
    titre: { colonne: "titre", genre: "texte" },
    corps: { colonne: "corps", genre: "texte" },
    nature: {
      colonne: "nature",
      genre: "texte",
      cast: "journal_nature",
      valeurs: ["Décision", "Erreur", "Solution", "Architecture", "Apprentissage"],
    },
    jalon: { colonne: "jalon", genre: "texteOuNull" },
  },
  discussions: {
    titre: { colonne: "titre", genre: "texte" },
    corps: { colonne: "corps", genre: "texte" },
    categorie: {
      colonne: "categorie",
      genre: "texte",
      cast: "forum_categorie",
      valeurs: ["Java", "PHP", "React", "IA", "BDD", "Réseau"],
    },
  },
  reponses: {
    corps: { colonne: "corps", genre: "texte" },
    deMentor: { colonne: "de_mentor", genre: "booleen" },
  },
  fiches: {
    titre: { colonne: "titre", genre: "texte" },
    promesse: { colonne: "promesse", genre: "texte" },
    oeuvre: { colonne: "oeuvre", genre: "texte" },
    domaine: { colonne: "domaine", genre: "texte" },
    annee: { colonne: "annee", genre: "entier" },
    nature: { colonne: "nature", genre: "texte", cast: "fiche_nature", valeurs: ["mémoire", "projet"] },
    etat: { colonne: "etat", genre: "texte", cast: "fiche_etat", valeurs: ["terminé", "arrêté"] },
  },
  idees: {
    titre: { colonne: "titre", genre: "texte" },
    corps: { colonne: "corps", genre: "texte" },
  },
  defis: {
    titre: { colonne: "titre", genre: "texte" },
    description: { colonne: "description", genre: "texte" },
    techno: { colonne: "techno", genre: "texte" },
    dureeJours: { colonne: "duree_jours", genre: "entier" },
    debut: { colonne: "debut", genre: "date" },
    recompense: { colonne: "recompense", genre: "texteOuNull" },
  },
  mentorat: {
    blocage: { colonne: "blocage", genre: "texte" },
    statut: {
      colonne: "statut",
      genre: "texte",
      cast: "demande_statut",
      valeurs: ["en attente", "en cours", "résolu"],
    },
  },
  annonces: {
    titre: { colonne: "titre", genre: "texte" },
    description: { colonne: "description", genre: "texte" },
    profil: { colonne: "profil", genre: "texte" },
    technos: { colonne: "technos", genre: "liste" },
    dureeMois: { colonne: "duree_mois", genre: "entier" },
    nature: {
      colonne: "nature",
      genre: "texte",
      cast: "opportunite_nature",
      valeurs: ["Projet", "Stage", "Alternance"],
    },
  },
  evenements: {
    titre: { colonne: "titre", genre: "texte" },
    date: { colonne: "date", genre: "date" },
    type: {
      colonne: "type",
      genre: "texte",
      cast: "evenement_type",
      valeurs: ["Réunion", "Deadline", "Session", "Autre"],
    },
  },
  conversations: {
    title: { colonne: "title", genre: "texte" },
  },
  points: {
    detail: { colonne: "detail", genre: "texte" },
    motif: {
      colonne: "motif",
      genre: "texte",
      cast: "point_motif",
      valeurs: ["projet-termine", "pair-aide", "solution-partagee", "erreur-documentee"],
    },
  },
  notifications: {
    titre: { colonne: "titre", genre: "texte" },
    corps: { colonne: "corps", genre: "texte" },
    lu: { colonne: "lu", genre: "booleen" },
  },
};

/**
 * Convertit une valeur du corps JSON en paramètre SQL, ou explique le refus.
 *
 * Rend un tuple plutôt que de lever : la route veut nommer le champ fautif
 * dans son message, et une exception aurait perdu ce contexte.
 */
function convertir(champ: Champ, brut: unknown): { ok: true; valeur: unknown } | { ok: false; raison: string } {
  switch (champ.genre) {
    case "texte":
    case "texteOuNull": {
      if (brut === null && champ.genre === "texteOuNull") return { ok: true, valeur: null };
      if (typeof brut !== "string") return { ok: false, raison: "attend du texte" };
      const valeur = brut.trim();
      if (champ.valeurs && !champ.valeurs.includes(valeur)) {
        return { ok: false, raison: `valeur admise : ${champ.valeurs.join(", ")}` };
      }
      if (champ.genre === "texteOuNull" && valeur === "") return { ok: true, valeur: null };
      return { ok: true, valeur };
    }
    case "liste": {
      if (!Array.isArray(brut) || brut.some((item) => typeof item !== "string")) {
        return { ok: false, raison: "attend une liste de textes" };
      }
      return { ok: true, valeur: (brut as string[]).map((item) => item.trim()).filter(Boolean) };
    }
    case "booleen":
      if (typeof brut !== "boolean") return { ok: false, raison: "attend vrai ou faux" };
      return { ok: true, valeur: brut };
    case "entier": {
      const nombre = typeof brut === "number" ? brut : Number(brut);
      if (!Number.isInteger(nombre)) return { ok: false, raison: "attend un nombre entier" };
      return { ok: true, valeur: nombre };
    }
    case "date": {
      if (typeof brut !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(brut)) {
        return { ok: false, raison: "attend une date AAAA-MM-JJ" };
      }
      return { ok: true, valeur: brut };
    }
  }
}

/* ------------------------------------------------------------------ */

interface LigneCompte {
  id: string;
  email: string | null;
  provider: string;
}

export async function routesAdmin(app: FastifyInstance): Promise<void> {
  app.post<{ Body: { email?: string; motDePasse?: string } }>("/api/admin/connexion", async (requete, reponse) => {
    if (!adminConfigure()) return reponse.code(503).send({ erreur: "Administration non configurée." });
    const email = requete.body?.email?.trim() ?? "";
    const motDePasse = requete.body?.motDePasse ?? "";
    if (!identifiantsAdminValides(email, motDePasse)) {
      return reponse.code(401).send({ erreur: "Identifiants administrateur invalides." });
    }
    ouvrirSessionAdmin(reponse);
    return { admin: { email: env.adminEmail } };
  });

  app.get("/api/admin/session", async (requete) => ({
    admin: sessionAdminDe(requete) ? { email: env.adminEmail } : null,
  }));

  app.post("/api/admin/deconnexion", async (_requete, reponse) => {
    fermerSessionAdmin(reponse);
    return { deconnecte: true };
  });

  /**
   * GET /api/admin/overview — le tableau de bord, sans aucune ligne.
   *
   * Il ne rend que des compteurs et les réglages : les listes se demandent
   * section par section (`/api/admin/collection/:nom`). Charger quinze
   * collections d'un bloc à chaque ouverture de la console coûterait des
   * centaines de kilo-octets pour n'en afficher qu'une.
   */
  app.get("/api/admin/overview", async (requete, reponse) => {
    if (!(await exigerAdmin(requete, reponse))) return;

    const [stats, reglages] = await Promise.all([
      query<Record<string, number>>(
        `SELECT
          (SELECT count(*)::int FROM students) AS etudiants,
          (SELECT count(*)::int FROM students WHERE desactive_le IS NULL) AS "etudiantsActifs",
          (SELECT count(*)::int FROM companies) AS entreprises,
          (SELECT count(*)::int FROM projects) AS projets,
          (SELECT count(*)::int FROM projects WHERE statut = 'En cours') AS "projetsEnCours",
          (SELECT count(*)::int FROM journal_entries) AS journal,
          (SELECT count(*)::int FROM forum_threads) AS discussions,
          (SELECT count(*)::int FROM forum_replies) AS reponses,
          (SELECT count(*)::int FROM fiches) AS fiches,
          (SELECT count(*)::int FROM ideas) AS idees,
          (SELECT count(*)::int FROM challenges) AS defis,
          (SELECT count(*)::int FROM mentor_requests) AS mentorat,
          (SELECT count(*)::int FROM opportunities) AS annonces,
          (SELECT count(*)::int FROM events) AS evenements,
          (SELECT count(*)::int FROM copilot_conversations) AS conversations,
          (SELECT count(*)::int FROM points) AS points,
          (SELECT count(*)::int FROM notifications) AS notifications`,
      ),
      lireReglages(),
    ]);

    return { stats: stats[0], reglages, tailleParPage: TAILLE_MAX };
  });

  /**
   * GET /api/admin/collection/:nom?q=&page=&taille=
   *
   * La recherche et la pagination sont côté serveur : filtrer cent lignes
   * dans le navigateur donne l'illusion d'une recherche alors qu'elle ne
   * voit que la première page.
   */
  app.get<{ Params: { nom: string }; Querystring: { q?: string; page?: string; taille?: string } }>(
    "/api/admin/collection/:nom",
    async (requete, reponse) => {
      if (!(await exigerAdmin(requete, reponse))) return;

      const nom = requete.params.nom;
      if (!collectionValide(nom)) {
        return reponse.code(404).send({ erreur: "Collection inconnue." });
      }
      const collection: Collection = COLLECTIONS[nom];

      const recherche = requete.query.q?.trim();
      const motif = recherche ? `%${recherche}%` : null;
      const taille = Math.min(Math.max(Number(requete.query.taille) || 25, 1), TAILLE_MAX);
      const page = Math.max(Number(requete.query.page) || 1, 1);

      const filtre = `WHERE ($1::text IS NULL OR ${collection.recherche})`;

      const [lignes, total] = await Promise.all([
        query(
          `SELECT ${collection.select}
           FROM ${collection.from}
           ${filtre}
           ORDER BY ${collection.ordre}
           LIMIT $2 OFFSET $3`,
          [motif, taille, (page - 1) * taille],
        ),
        queryOne<{ total: number }>(
          `SELECT count(*)::int AS total FROM ${collection.from} ${filtre}`,
          [motif],
        ),
      ]);

      return {
        nom,
        lignes,
        total: total?.total ?? 0,
        page,
        taille,
        champs: EDITABLES[nom] ?? {},
      };
    },
  );

  /**
   * PATCH /api/admin/collection/:nom/:id — édition générique.
   *
   * Le corps est un objet clé → valeur ; seules les clés listées dans
   * `EDITABLES` sont retenues, et une clé inconnue fait échouer la requête
   * entière plutôt que d'être ignorée : ici, contrairement aux réglages, une
   * clé en trop signale une erreur d'appel, et l'ignorer laisserait croire à
   * une modification qui n'a pas eu lieu.
   */
  app.patch<{ Params: { nom: string; id: string }; Body: Record<string, unknown> }>(
    "/api/admin/collection/:nom/:id",
    async (requete, reponse) => {
      if (!(await exigerAdmin(requete, reponse))) return;

      const nom = requete.params.nom;
      if (!collectionValide(nom)) return reponse.code(404).send({ erreur: "Collection inconnue." });
      if (!UUID.test(requete.params.id)) return reponse.code(400).send({ erreur: "Identifiant invalide." });

      const champs = EDITABLES[nom];
      if (!champs) return reponse.code(400).send({ erreur: "Cette collection n'est pas modifiable." });

      const corps = requete.body ?? {};
      const morceaux: string[] = [];
      const valeurs: unknown[] = [];

      for (const [cle, brut] of Object.entries(corps)) {
        const champ = champs[cle];
        if (!champ) return reponse.code(400).send({ erreur: `Champ inconnu : ${cle}.` });
        const resultat = convertir(champ, brut);
        if (!resultat.ok) {
          return reponse.code(400).send({ erreur: `${cle} : ${resultat.raison}.` });
        }
        valeurs.push(resultat.valeur);
        morceaux.push(`${champ.colonne} = $${valeurs.length}${champ.cast ? `::${champ.cast}` : ""}`);
      }

      if (morceaux.length === 0) return reponse.code(400).send({ erreur: "Aucun champ à modifier." });

      /* La base refuse « Abandonné » sans raison (contrainte `abandon_motive`).
         Le dire ici évite une erreur 500 opaque là où le problème est une
         règle métier parfaitement explicable. */
      if (nom === "projets" && corps["statut"] === "Abandonné") {
        const raison =
          typeof corps["raisonAbandon"] === "string" && corps["raisonAbandon"].trim()
            ? corps["raisonAbandon"].trim()
            : (await queryOne<{ raison: string | null }>(
                "SELECT raison_abandon AS raison FROM projects WHERE id = $1",
                [requete.params.id],
              ))?.raison;
        if (!raison) {
          return reponse
            .code(400)
            .send({ erreur: "Un projet abandonné doit porter la raison de son abandon." });
        }
      }

      valeurs.push(requete.params.id);
      const lignes = await query<{ id: string }>(
        `UPDATE ${COLLECTIONS[nom].table} SET ${morceaux.join(", ")}
         WHERE id = $${valeurs.length} RETURNING id`,
        valeurs,
      );
      if (!lignes[0]) return reponse.code(404).send({ erreur: "Élément introuvable." });
      return { modifie: true };
    },
  );

  /** DELETE /api/admin/collection/:nom/:id — suppression, cascades comprises. */
  app.delete<{ Params: { nom: string; id: string } }>(
    "/api/admin/collection/:nom/:id",
    async (requete, reponse) => {
      if (!(await exigerAdmin(requete, reponse))) return;

      const nom = requete.params.nom;
      if (!collectionValide(nom)) return reponse.code(404).send({ erreur: "Collection inconnue." });
      if (!UUID.test(requete.params.id)) return reponse.code(400).send({ erreur: "Identifiant invalide." });

      const lignes = await query<{ id: string }>(
        `DELETE FROM ${COLLECTIONS[nom].table} WHERE id = $1 RETURNING id`,
        [requete.params.id],
      );
      if (!lignes[0]) return reponse.code(404).send({ erreur: "Élément introuvable." });
      return { supprime: true };
    },
  );

  /* ---------------------------------------------------------------- */
  /* Dossiers détaillés                                                */
  /* ---------------------------------------------------------------- */

  /**
   * GET /api/admin/etudiant/:id — tout ce qu'un compte porte, en un écran.
   *
   * Les conversations Copilote apparaissent par leur titre et leur volume,
   * jamais par leur contenu : administrer un compte ne demande pas de lire ce
   * que quelqu'un a confié à un assistant.
   */
  app.get<{ Params: { id: string } }>("/api/admin/etudiant/:id", async (requete, reponse) => {
    if (!(await exigerAdmin(requete, reponse))) return;
    const id = requete.params.id;
    if (!UUID.test(id)) return reponse.code(400).send({ erreur: "Identifiant invalide." });

    const etudiant = await queryOne(
      `SELECT s.id, s.nom, s.initiales, s.universite, s.niveau::text AS niveau, s.filiere,
              s.promo, s.interets, s.objectifs, s.mentor,
              s.desactive_le AS "deactivatedAt", s.cree_le AS "createdAt"
       FROM students s WHERE s.id = $1`,
      [id],
    );
    if (!etudiant) return reponse.code(404).send({ erreur: "Étudiant introuvable." });

    const [comptes, projets, points, discussions, fiches, evenements, conversations, notifications] =
      await Promise.all([
        query<LigneCompte>(
          `SELECT id, email::text AS email, provider::text AS provider
           FROM accounts WHERE student_id = $1 ORDER BY cree_le`,
          [id],
        ),
        query(
          `SELECT id, nom, statut::text AS statut, derniere_activite AS "updatedAt", public
           FROM projects WHERE owner_id = $1 ORDER BY derniere_activite DESC`,
          [id],
        ),
        query(
          `SELECT id, motif::text AS motif, detail, date
           FROM points WHERE student_id = $1 ORDER BY date DESC LIMIT 50`,
          [id],
        ),
        query(
          `SELECT id, titre, categorie::text AS categorie, date
           FROM forum_threads WHERE auteur_id = $1 ORDER BY date DESC LIMIT 50`,
          [id],
        ),
        query(
          `SELECT id, titre, etat::text AS etat, cree_le AS "createdAt"
           FROM fiches WHERE author_id = $1 ORDER BY cree_le DESC LIMIT 50`,
          [id],
        ),
        query(
          `SELECT id, titre, date, type::text AS type
           FROM events WHERE student_id = $1 ORDER BY date DESC LIMIT 50`,
          [id],
        ),
        query(
          `SELECT c.id, c.title, c.role, c.updated_at AS "updatedAt",
                  (SELECT count(*)::int FROM copilot_messages m WHERE m.conversation_id = c.id) AS "messageCount"
           FROM copilot_conversations c WHERE c.student_id = $1
           ORDER BY c.updated_at DESC LIMIT 50`,
          [id],
        ),
        query(
          `SELECT id, titre, nature::text AS nature, date, lu
           FROM notifications WHERE student_id = $1 ORDER BY date DESC LIMIT 50`,
          [id],
        ),
      ]);

    return { etudiant, comptes, projets, points, discussions, fiches, evenements, conversations, notifications };
  });

  /** GET /api/admin/entreprise/:id — profil, comptes et annonces publiées. */
  app.get<{ Params: { id: string } }>("/api/admin/entreprise/:id", async (requete, reponse) => {
    if (!(await exigerAdmin(requete, reponse))) return;
    const id = requete.params.id;
    if (!UUID.test(id)) return reponse.code(400).send({ erreur: "Identifiant invalide." });

    const entreprise = await queryOne(
      `SELECT id, nom, secteur, presentation,
              technos_recherchees AS "technosRecherchees",
              profils_recherches AS "profilsRecherches"
       FROM companies WHERE id = $1`,
      [id],
    );
    if (!entreprise) return reponse.code(404).send({ erreur: "Entreprise introuvable." });

    const [comptes, annonces, defis] = await Promise.all([
      query(`SELECT id, email::text AS email FROM company_accounts WHERE company_id = $1`, [id]),
      query(
        `SELECT id, titre, nature::text AS nature, publiee_le AS "publishedAt"
         FROM opportunities WHERE company_id = $1 ORDER BY publiee_le DESC`,
        [id],
      ),
      query(
        `SELECT id, titre, techno, debut FROM challenges WHERE sponsor_id = $1 ORDER BY debut DESC`,
        [id],
      ),
    ]);

    return { entreprise, comptes, annonces, defis };
  });

  /* ---------------------------------------------------------------- */
  /* Actions sur les comptes                                           */
  /* ---------------------------------------------------------------- */

  /**
   * POST /api/admin/etudiant/:id/activation — suspendre ou rétablir un compte.
   *
   * `sessionDe()` revérifie `desactive_le` à chaque requête : une suspension
   * coupe donc immédiatement toutes les sessions ouvertes, sans avoir à tenir
   * une liste de jetons à révoquer.
   */
  app.post<{ Params: { id: string }; Body: { actif?: boolean } }>(
    "/api/admin/etudiant/:id/activation",
    async (requete, reponse) => {
      if (!(await exigerAdmin(requete, reponse))) return;
      const id = requete.params.id;
      if (!UUID.test(id)) return reponse.code(400).send({ erreur: "Identifiant invalide." });
      if (typeof requete.body?.actif !== "boolean") {
        return reponse.code(400).send({ erreur: "Indiquez `actif` (vrai ou faux)." });
      }

      const lignes = await query<{ deactivatedAt: string | null }>(
        `UPDATE students SET desactive_le = ${requete.body.actif ? "NULL" : "now()"}
         WHERE id = $1 RETURNING desactive_le AS "deactivatedAt"`,
        [id],
      );
      if (!lignes[0]) return reponse.code(404).send({ erreur: "Étudiant introuvable." });
      return { deactivatedAt: lignes[0].deactivatedAt };
    },
  );

  /**
   * POST /api/admin/etudiant/:id/mot-de-passe — réinitialisation.
   *
   * Le mot de passe choisi par l'administrateur est transmis hors plateforme :
   * il n'est jamais renvoyé par cette route, qui confirme seulement l'écriture.
   * Un compte sans identifiant e-mail (arrivé par Google) ne peut pas recevoir
   * de mot de passe — il n'y aurait aucun identifiant avec lequel s'en servir.
   */
  app.post<{ Params: { id: string }; Body: { motDePasse?: string } }>(
    "/api/admin/etudiant/:id/mot-de-passe",
    async (requete, reponse) => {
      if (!(await exigerAdmin(requete, reponse))) return;
      const id = requete.params.id;
      if (!UUID.test(id)) return reponse.code(400).send({ erreur: "Identifiant invalide." });

      const motDePasse = requete.body?.motDePasse ?? "";
      if (motDePasse.length < 12) {
        return reponse.code(400).send({ erreur: "Le mot de passe doit faire au moins 12 caractères." });
      }

      const comptes = await query<LigneCompte>(
        `SELECT id, email::text AS email, provider::text AS provider
         FROM accounts WHERE student_id = $1 ORDER BY cree_le`,
        [id],
      );
      if (comptes.length === 0) return reponse.code(404).send({ erreur: "Aucun compte pour cet étudiant." });

      const empreinte = await argon2.hash(motDePasse, { type: argon2.argon2id });
      const compteEmail = comptes.find((compte) => compte.provider === "email");

      if (compteEmail) {
        await query("UPDATE accounts SET mot_de_passe = $1 WHERE id = $2", [empreinte, compteEmail.id]);
        return { reinitialise: true, email: compteEmail.email };
      }

      const adresse = comptes.find((compte) => compte.email)?.email;
      if (!adresse) {
        return reponse
          .code(400)
          .send({ erreur: "Ce compte n'a pas d'adresse e-mail : impossible d'y attacher un mot de passe." });
      }
      await query(
        "INSERT INTO accounts (student_id, email, provider, mot_de_passe) VALUES ($1, $2, 'email', $3)",
        [id, adresse, empreinte],
      );
      return { reinitialise: true, email: adresse };
    },
  );

  /** POST /api/admin/entreprise/:id/mot-de-passe — même règle, côté entreprise. */
  app.post<{ Params: { id: string }; Body: { motDePasse?: string } }>(
    "/api/admin/entreprise/:id/mot-de-passe",
    async (requete, reponse) => {
      if (!(await exigerAdmin(requete, reponse))) return;
      const id = requete.params.id;
      if (!UUID.test(id)) return reponse.code(400).send({ erreur: "Identifiant invalide." });

      const motDePasse = requete.body?.motDePasse ?? "";
      if (motDePasse.length < 12) {
        return reponse.code(400).send({ erreur: "Le mot de passe doit faire au moins 12 caractères." });
      }

      const compte = await queryOne<{ id: string; email: string }>(
        `SELECT id, email::text AS email FROM company_accounts WHERE company_id = $1 ORDER BY id LIMIT 1`,
        [id],
      );
      if (!compte) return reponse.code(404).send({ erreur: "Aucun compte pour cette entreprise." });

      const empreinte = await argon2.hash(motDePasse, { type: argon2.argon2id });
      await query("UPDATE company_accounts SET mot_de_passe = $1 WHERE id = $2", [empreinte, compte.id]);
      return { reinitialise: true, email: compte.email };
    },
  );

  /**
   * POST /api/admin/etudiant/:id/point — attribution manuelle.
   *
   * Les quatre motifs restent ceux du cadrage : l'administration peut réparer
   * un point manquant ou en retirer un injustifié, pas inventer une cinquième
   * source de points. C'est la garantie que le classement reste explicable.
   */
  app.post<{ Params: { id: string }; Body: { motif?: string; detail?: string } }>(
    "/api/admin/etudiant/:id/point",
    async (requete, reponse) => {
      if (!(await exigerAdmin(requete, reponse))) return;
      const id = requete.params.id;
      if (!UUID.test(id)) return reponse.code(400).send({ erreur: "Identifiant invalide." });

      const motifs = EDITABLES.points?.["motif"]?.valeurs ?? [];
      const motif = requete.body?.motif ?? "";
      const detail = requete.body?.detail?.trim() ?? "";
      if (!motifs.includes(motif)) {
        return reponse.code(400).send({ erreur: `Motif admis : ${motifs.join(", ")}.` });
      }
      if (!detail) return reponse.code(400).send({ erreur: "Précisez le détail du point attribué." });

      const lignes = await query<{ id: string }>(
        `INSERT INTO points (student_id, motif, detail) VALUES ($1, $2::point_motif, $3) RETURNING id`,
        [id, motif, detail],
      );
      return reponse.code(201).send({ id: lignes[0]?.id });
    },
  );

  /* ---------------------------------------------------------------- */
  /* Réglages et annonce                                               */
  /* ---------------------------------------------------------------- */

  app.get("/api/admin/reglages", async (requete, reponse) => {
    if (!(await exigerAdmin(requete, reponse))) return;
    return { reglages: await lireReglages() };
  });

  app.patch<{ Body: Partial<Reglages> }>("/api/admin/reglages", async (requete, reponse) => {
    if (!(await exigerAdmin(requete, reponse))) return;
    const corps = requete.body ?? {};
    const partiel: Partial<Reglages> = {};

    for (const cle of [
      "inscriptionsOuvertes",
      "inscriptionsEntrepriseOuvertes",
      "copiloteActif",
      "maintenance",
    ] as const) {
      if (cle in corps) {
        if (typeof corps[cle] !== "boolean") {
          return reponse.code(400).send({ erreur: `${cle} attend vrai ou faux.` });
        }
        partiel[cle] = corps[cle];
      }
    }

    if ("annonce" in corps) {
      const brut = corps.annonce;
      if (brut === null) {
        partiel.annonce = null;
      } else if (typeof brut === "object" && typeof brut.titre === "string" && typeof brut.corps === "string") {
        const titre = brut.titre.trim();
        const corpsAnnonce = brut.corps.trim();
        partiel.annonce =
          titre || corpsAnnonce
            ? { titre, corps: corpsAnnonce, ton: brut.ton === "alerte" ? "alerte" : "info" }
            : null;
      } else {
        return reponse.code(400).send({ erreur: "L'annonce attend un titre et un corps, ou `null`." });
      }
    }

    return { reglages: await ecrireReglages(partiel) };
  });

  /**
   * POST /api/admin/notification — un message dans le fil de chaque étudiant.
   *
   * Distinct du bandeau d'annonce (un réglage, visible tant qu'il est posé) :
   * ceci écrit une notification datée, que chacun lit puis archive. Les
   * comptes suspendus sont exclus — leur écrire n'aurait aucun destinataire.
   */
  app.post<{ Body: { titre?: string; corps?: string; etudiantId?: string } }>(
    "/api/admin/notification",
    async (requete, reponse) => {
      if (!(await exigerAdmin(requete, reponse))) return;

      const titre = requete.body?.titre?.trim() ?? "";
      const corps = requete.body?.corps?.trim() ?? "";
      const etudiantId = requete.body?.etudiantId;
      if (!titre) return reponse.code(400).send({ erreur: "Un titre est requis." });
      if (etudiantId && !UUID.test(etudiantId)) {
        return reponse.code(400).send({ erreur: "Identifiant d'étudiant invalide." });
      }

      const lignes = etudiantId
        ? await query<{ id: string }>(
            `INSERT INTO notifications (student_id, nature, titre, corps)
             VALUES ($1, 'signal', $2, $3) RETURNING id`,
            [etudiantId, titre, corps],
          )
        : await query<{ id: string }>(
            `INSERT INTO notifications (student_id, nature, titre, corps)
             SELECT id, 'signal', $1, $2 FROM students WHERE desactive_le IS NULL
             RETURNING id`,
            [titre, corps],
          );

      return reponse.code(201).send({ envoyees: lignes.length });
    },
  );
}
