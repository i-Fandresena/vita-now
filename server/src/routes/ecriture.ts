import { mkdir, unlink, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

import type { FastifyInstance } from "fastify";

import { query, queryOne, transaction } from "../db.js";
import { env } from "../env.js";
import { exigerSession } from "../session.js";

/**
 * ecriture.ts — les mutations.
 *
 * Règle tenue partout ici : **une écriture qui touche plusieurs tables passe
 * par une transaction.** Arrêter un projet écrit dans `projects`, dans
 * `journal_entries` et dans `notifications` ; sans transaction, un échec à
 * mi-chemin laisse un projet arrêté dont personne n'est prévenu — et le
 * journal, qui est la mémoire du projet, mentirait sur ce qui s'est passé.
 *
 * Seconde règle : **on vérifie toujours que l'appelant est propriétaire.**
 * Une session valide ne dit pas que la ressource visée vous appartient. Sans
 * cette vérification, connaître l'identifiant d'un projet suffirait à écrire
 * dans le journal de quelqu'un d'autre.
 */

const STATUTS = ["Idée", "En cours", "En pause", "Abandonné", "Terminé"] as const;
const NATURES = ["Décision", "Erreur", "Solution", "Architecture", "Apprentissage"] as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const IMAGE_MAX_OCTETS = 4 * 1024 * 1024;
const MAX_CAPTURES = 8;

interface DepotProjet {
  hote: "GitHub" | "GitLab";
  slug: string;
  url: string;
  branches: string[];
  commitsParSemaine: number[];
  brancheParDefaut?: string;
  synchroniseLe?: string;
}

interface PresentationProjet {
  architecture: string;
  documentation: string;
  videoUrl?: string;
  demoUrl?: string;
  captures: string[];
}

class ErreurDepot extends Error {}

function objet(v: unknown): Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

function texte(v: unknown, maximum: number): string {
  return typeof v === "string" ? v.trim().slice(0, maximum) : "";
}

function urlHttp(v: unknown, etiquette: string): string | undefined {
  const valeur = texte(v, 2_000);
  if (!valeur) return undefined;
  let url: URL;
  try {
    url = new URL(valeur);
  } catch {
    throw new ErreurDepot(`${etiquette} doit être une URL valide.`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new ErreurDepot(`${etiquette} doit commencer par http:// ou https://.`);
  }
  return url.toString();
}

function urlCapture(v: unknown): string | undefined {
  const valeur = texte(v, 2_000);
  if (!valeur) return undefined;
  if (valeur.startsWith("/uploads/projects/")) return valeur;
  return urlHttp(valeur, "Une capture");
}

function presentationDe(v: unknown): PresentationProjet {
  const source = objet(v);
  const captures = Array.isArray(source.captures)
    ? source.captures
        .filter((capture): capture is string => typeof capture === "string")
        .map((capture) => capture.trim())
        .filter(Boolean)
        .slice(0, MAX_CAPTURES)
    : [];

  return {
    architecture: texte(source.architecture, 5_000),
    documentation: texte(source.documentation, 8_000),
    ...(typeof source.videoUrl === "string" && source.videoUrl.trim()
      ? { videoUrl: source.videoUrl.trim() }
      : {}),
    ...(typeof source.demoUrl === "string" && source.demoUrl.trim()
      ? { demoUrl: source.demoUrl.trim() }
      : {}),
    captures,
  };
}

/** Normalise une URL publique, sans accepter des chemins ou hôtes ambigus. */
function normaliserDepot(urlBrute: unknown): Pick<DepotProjet, "hote" | "slug" | "url"> {
  const valeur = texte(urlBrute, 2_000);
  if (!valeur) throw new ErreurDepot("L'URL du dépôt est requise.");

  let url: URL;
  try {
    url = new URL(valeur);
  } catch {
    throw new ErreurDepot("L'URL du dépôt est invalide.");
  }

  if (url.protocol !== "https:" || url.username || url.password || url.hash || url.search) {
    throw new ErreurDepot("Utilisez l'URL HTTPS publique du dépôt, sans paramètres.");
  }

  const hote = url.hostname.toLowerCase().replace(/^www\./, "");
  const segments = url.pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment));
  if (segments.length > 0) segments[segments.length - 1] = segments.at(-1)!.replace(/\.git$/i, "");

  if (
    segments.length < 2 ||
    segments.length > 5 ||
    segments.some((segment) => !/^[A-Za-z0-9_.-]+$/.test(segment))
  ) {
    throw new ErreurDepot("L'URL doit désigner un dépôt, par exemple github.com/organisation/projet.");
  }

  if (hote === "github.com") {
    if (segments.length !== 2) {
      throw new ErreurDepot("Une URL GitHub doit désigner exactement organisation/projet.");
    }
    const slug = segments.join("/");
    return { hote: "GitHub", slug, url: `https://github.com/${slug}` };
  }
  if (hote === "gitlab.com") {
    const slug = segments.join("/");
    return { hote: "GitLab", slug, url: `https://gitlab.com/${slug}` };
  }
  throw new ErreurDepot("Seuls les dépôts publics GitHub et GitLab sont pris en charge pour le moment.");
}

async function lireJson(url: string): Promise<{ statut: number; corps: unknown }> {
  const controleur = new AbortController();
  const minuterie = setTimeout(() => controleur.abort(), 10_000);
  try {
    const reponse = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "VITA-NOW" },
      signal: controleur.signal,
    });
    let corps: unknown = null;
    try {
      corps = await reponse.json();
    } catch {
      /* Une réponse non JSON est tout de même une erreur exploitable par son statut. */
    }
    return { statut: reponse.status, corps };
  } catch {
    throw new ErreurDepot("La forge ne répond pas. Réessayez dans quelques instants.");
  } finally {
    clearTimeout(minuterie);
  }
}

function compterCommits(dates: unknown[]): number[] {
  const maintenant = new Date();
  const debuts = Array.from({ length: 12 }, (_, index) => {
    const debut = new Date(Date.UTC(
      maintenant.getUTCFullYear(),
      maintenant.getUTCMonth(),
      maintenant.getUTCDate() - (11 - index) * 7,
    ));
    return debut.getTime();
  });
  const compteurs = Array.from({ length: 12 }, () => 0);
  for (const valeur of dates) {
    if (typeof valeur !== "string") continue;
    const instant = new Date(valeur).getTime();
    if (!Number.isFinite(instant) || instant < debuts[0]!) continue;
    const index = Math.min(11, Math.floor((instant - debuts[0]!) / (7 * 24 * 60 * 60 * 1000)));
    compteurs[index]! += 1;
  }
  return compteurs;
}

function erreurForge(hote: "GitHub" | "GitLab", statut: number): never {
  if (statut === 404) {
    throw new ErreurDepot(
      "Ce dépôt est introuvable ou privé. Rattachez un dépôt public, ou configurez l'accès privé ultérieurement.",
    );
  }
  if (statut === 429 || statut === 403) {
    throw new ErreurDepot(`${hote} limite temporairement les requêtes. Réessayez dans quelques minutes.`);
  }
  throw new ErreurDepot(`${hote} ne permet pas de synchroniser ce dépôt pour le moment.`);
}

async function synchroniserDepot(urlBrute: unknown): Promise<DepotProjet> {
  const cible = normaliserDepot(urlBrute);
  const depuis = new Date(Date.now() - 12 * 7 * 24 * 60 * 60 * 1000).toISOString();

  if (cible.hote === "GitHub") {
    const projet = await lireJson(`https://api.github.com/repos/${cible.slug}`);
    if (projet.statut !== 200) erreurForge("GitHub", projet.statut);
    const meta = objet(projet.corps);
    const branches = await lireJson(`https://api.github.com/repos/${cible.slug}/branches?per_page=20`);
    if (branches.statut !== 200) erreurForge("GitHub", branches.statut);
    const commits = await lireJson(
      `https://api.github.com/repos/${cible.slug}/commits?since=${encodeURIComponent(depuis)}&per_page=100`,
    );
    if (commits.statut !== 200) erreurForge("GitHub", commits.statut);
    const nomsBranches = Array.isArray(branches.corps)
      ? branches.corps
          .map((branche) => texte(objet(branche).name, 200))
          .filter(Boolean)
          .slice(0, 20)
      : [];
    const dates = Array.isArray(commits.corps)
      ? commits.corps.map((commit) => {
          const donnees = objet(commit);
          return objet(donnees.commit).author && typeof objet(donnees.commit).author === "object"
            ? objet(objet(donnees.commit).author).date
            : undefined;
        })
      : [];
    const brancheParDefaut = texte(meta.default_branch, 200);
    return {
      ...cible,
      branches: nomsBranches,
      commitsParSemaine: compterCommits(dates),
      ...(brancheParDefaut ? { brancheParDefaut } : {}),
      synchroniseLe: new Date().toISOString(),
    };
  }

  const identifiant = encodeURIComponent(cible.slug);
  const projet = await lireJson(`https://gitlab.com/api/v4/projects/${identifiant}`);
  if (projet.statut !== 200) erreurForge("GitLab", projet.statut);
  const meta = objet(projet.corps);
  const branches = await lireJson(
    `https://gitlab.com/api/v4/projects/${identifiant}/repository/branches?per_page=20`,
  );
  if (branches.statut !== 200) erreurForge("GitLab", branches.statut);
  const commits = await lireJson(
    `https://gitlab.com/api/v4/projects/${identifiant}/repository/commits?since=${encodeURIComponent(depuis)}&per_page=100`,
  );
  if (commits.statut !== 200) erreurForge("GitLab", commits.statut);
  const nomsBranches = Array.isArray(branches.corps)
    ? branches.corps.map((branche) => texte(objet(branche).name, 200)).filter(Boolean).slice(0, 20)
    : [];
  const dates = Array.isArray(commits.corps)
    ? commits.corps.map((commit) => objet(commit).created_at)
    : [];
  const brancheParDefaut = texte(meta.default_branch, 200);
  return {
    ...cible,
    branches: nomsBranches,
    commitsParSemaine: compterCommits(dates),
    ...(brancheParDefaut ? { brancheParDefaut } : {}),
    synchroniseLe: new Date().toISOString(),
  };
}

/**
 * Identifiant proposé par le client.
 *
 * **Pourquoi l'accepter.** Le front applique ses mutations localement avant
 * la réponse du serveur — sans quoi chaque geste attendrait un aller-retour —
 * puis navigue vers la ressource créée. Si le serveur choisissait l'identifiant,
 * l'URL affichée pointerait vers un objet local qui n'existe nulle part, et un
 * rechargement donnerait un écran vide.
 *
 * **Pourquoi c'est sans risque.** Un UUID v4 est imprévisible ; deviner celui
 * d'un autre n'apporte rien de plus que le lire dans une URL. Le format est
 * validé, et une collision violerait la clé primaire — la base refuse, elle ne
 * mélange pas. Surtout, l'identifiant ne confère aucun droit : l'appartenance
 * est vérifiée séparément à chaque écriture.
 */
function idPropose(valeur: unknown): string | null {
  return typeof valeur === "string" && UUID.test(valeur) ? valeur : null;
}

async function estProprietaire(projectId: string, studentId: string): Promise<boolean> {
  const ligne = await queryOne<{ owner_id: string }>(
    "SELECT owner_id FROM projects WHERE id = $1",
    [projectId],
  );
  return ligne?.owner_id === studentId;
}

export async function routesEcriture(app: FastifyInstance): Promise<void> {
  /**
   * POST /api/projets — M2.
   *
   * La checklist ("post-it") est optionnelle et créée dans la même
   * transaction que le projet : un échec sur les items ne doit jamais laisser
   * un projet créé sans les étapes que l'étudiant vient de saisir, sinon le
   * front affiche localement des étapes que le serveur n'a jamais reçues.
   *
   * Volontairement séparée de `avancement()` (M15) : cocher une étape n'écrit
   * ni ne recalcule le pourcentage d'avancement, qui reste dérivé uniquement
   * du journal (voir `projets.ts`).
   */
  app.post<{
    Body: {
      id?: string;
      nom?: string;
      description?: string;
      type?: string;
      technos?: string[];
      objectif?: string;
      dureeSemaines?: number;
      difficulte?: string;
      checklist?: { id?: string; libelle?: string; dureeHeures?: number }[];
      opportuniteId?: string;
    };
  }>("/api/projets", async (requete, reponse) => {
    const moi = await exigerSession(requete, reponse);
    if (!moi) return;

    const c = requete.body ?? {};
    if (!c.nom?.trim()) {
      return reponse.code(400).send({ erreur: "Le nom du projet est requis." });
    }

    /**
     * Un projet Personnel peut se rattacher à l'appel à projet (M13,
     * `opportunities` de nature "Projet") qui l'a motivé. Optionnel, mais
     * vérifié : un identifiant qui ne pointe vers aucun appel — ou vers une
     * offre de stage/alternance — n'est pas silencieusement ignoré, il est
     * rejeté, sinon le front croirait le lien enregistré.
     */
    let opportuniteId: string | null = null;
    if (c.opportuniteId) {
      const appel = await queryOne<{ id: string }>(
        "SELECT id FROM opportunities WHERE id = $1 AND nature = 'Projet'",
        [c.opportuniteId],
      );
      if (!appel) {
        return reponse
          .code(400)
          .send({ erreur: "L'appel à projet indiqué est introuvable." });
      }
      opportuniteId = appel.id;
    }

    const nom = c.nom.trim();
    const etapes = (c.checklist ?? []).filter((e) => e.libelle?.trim());

    const projetId = await transaction(async (client) => {
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO projects
           (id, owner_id, nom, description, type, statut, technos, objectif,
            duree_semaines, difficulte, derniere_activite, opportunite_id)
         VALUES (COALESCE($9::uuid, gen_random_uuid()),
                 $1, $2, $3, $4::projet_type, 'Idée', $5, $6, $7, $8::difficulte, now(), $10)
         RETURNING id`,
        [
          moi,
          nom,
          c.description?.trim() ?? "",
          c.type || "Personnel",
          c.technos ?? [],
          c.objectif?.trim() ?? "",
          c.dureeSemaines ?? 4,
          c.difficulte || "Intermédiaire",
          idPropose(c.id),
          opportuniteId,
        ],
      );
      const id = rows[0]!.id;

      for (const [index, etape] of etapes.entries()) {
        await client.query(
          `INSERT INTO checklist_items (id, project_id, libelle, ordre, duree_heures)
           VALUES (COALESCE($5::uuid, gen_random_uuid()), $1, $2, $3, $4)`,
          [id, etape.libelle!.trim(), index, etape.dureeHeures ?? null, idPropose(etape.id)],
        );
      }

      return id;
    });

    return reponse.code(201).send({ id: projetId });
  });

  /**
   * Rattache et synchronise un dépôt public dès sa première saisie. L'API
   * contacte la forge depuis le serveur : aucun jeton GitHub/GitLab, ni aucune
   * donnée de dépôt, ne transite par le navigateur. Les dépôts privés sont
   * volontairement refusés ici — l'OAuth de connexion ne porte pas le droit
   * `repo`, et prétendre les lire serait un faux raccordement.
   */
  app.patch<{ Params: { id: string }; Body: { url?: string } }>(
    "/api/projets/:id/depot",
    async (requete, reponse) => {
      const moi = await exigerSession(requete, reponse);
      if (!moi) return;
      if (!(await estProprietaire(requete.params.id, moi))) {
        return reponse.code(403).send({ erreur: "Ce projet n'est pas le vôtre." });
      }

      try {
        const depot = await synchroniserDepot(requete.body?.url);
        await query("UPDATE projects SET depot = $1::jsonb WHERE id = $2", [
          JSON.stringify(depot),
          requete.params.id,
        ]);
        return { depot };
      } catch (erreur) {
        if (erreur instanceof ErreurDepot) {
          return reponse.code(400).send({ erreur: erreur.message });
        }
        throw erreur;
      }
    },
  );

  /** Met à jour branches et activité sans obliger à ressaisir l'URL. */
  app.post<{ Params: { id: string } }>(
    "/api/projets/:id/depot/synchroniser",
    async (requete, reponse) => {
      const moi = await exigerSession(requete, reponse);
      if (!moi) return;
      if (!(await estProprietaire(requete.params.id, moi))) {
        return reponse.code(403).send({ erreur: "Ce projet n'est pas le vôtre." });
      }

      const ligne = await queryOne<{ depot: unknown }>(
        "SELECT depot FROM projects WHERE id = $1",
        [requete.params.id],
      );
      const url = objet(ligne?.depot).url;
      if (typeof url !== "string") {
        return reponse.code(400).send({ erreur: "Aucun dépôt n'est rattaché à ce projet." });
      }

      try {
        const depot = await synchroniserDepot(url);
        await query("UPDATE projects SET depot = $1::jsonb WHERE id = $2", [
          JSON.stringify(depot),
          requete.params.id,
        ]);
        return { depot };
      } catch (erreur) {
        if (erreur instanceof ErreurDepot) {
          return reponse.code(400).send({ erreur: erreur.message });
        }
        throw erreur;
      }
    },
  );

  /** Détache seulement la référence locale ; le dépôt hébergé n'est jamais touché. */
  app.delete<{ Params: { id: string } }>("/api/projets/:id/depot", async (requete, reponse) => {
    const moi = await exigerSession(requete, reponse);
    if (!moi) return;
    if (!(await estProprietaire(requete.params.id, moi))) {
      return reponse.code(403).send({ erreur: "Ce projet n'est pas le vôtre." });
    }
    await query("UPDATE projects SET depot = NULL WHERE id = $1", [requete.params.id]);
    return { ok: true };
  });

  /**
   * Présentation persistante. Les deux textes peuvent être enregistrés en
   * brouillon ; l'interface décide ensuite si elle est prête à être partagée.
   */
  app.patch<{
    Params: { id: string };
    Body: {
      architecture?: string;
      documentation?: string;
      videoUrl?: string;
      demoUrl?: string;
      captures?: string[];
    };
  }>("/api/projets/:id/presentation", async (requete, reponse) => {
    const moi = await exigerSession(requete, reponse);
    if (!moi) return;
    if (!(await estProprietaire(requete.params.id, moi))) {
      return reponse.code(403).send({ erreur: "Ce projet n'est pas le vôtre." });
    }

    try {
      const corps = requete.body ?? {};
      const captures = Array.isArray(corps.captures)
        ? corps.captures
            .map((capture) => urlCapture(capture))
            .filter((capture): capture is string => Boolean(capture))
            .slice(0, MAX_CAPTURES)
        : [];
      const presentation: PresentationProjet = {
        architecture: texte(corps.architecture, 5_000),
        documentation: texte(corps.documentation, 8_000),
        ...(urlHttp(corps.videoUrl, "La vidéo de démonstration")
          ? { videoUrl: urlHttp(corps.videoUrl, "La vidéo de démonstration") }
          : {}),
        ...(urlHttp(corps.demoUrl, "La démonstration en ligne")
          ? { demoUrl: urlHttp(corps.demoUrl, "La démonstration en ligne") }
          : {}),
        captures,
      };
      await query("UPDATE projects SET presentation = $1::jsonb WHERE id = $2", [
        JSON.stringify(presentation),
        requete.params.id,
      ]);
      return { presentation };
    } catch (erreur) {
      if (erreur instanceof ErreurDepot) {
        return reponse.code(400).send({ erreur: erreur.message });
      }
      throw erreur;
    }
  });

  /** Ajoute une capture réelle au brouillon, sur le volume persistant du VPS. */
  app.post<{ Params: { id: string } }>(
    "/api/projets/:id/presentation/captures",
    async (requete, reponse) => {
      const moi = await exigerSession(requete, reponse);
      if (!moi) return;
      const ligne = await queryOne<{ presentation: unknown }>(
        "SELECT presentation FROM projects WHERE id = $1 AND owner_id = $2",
        [requete.params.id, moi],
      );
      if (!ligne) return reponse.code(403).send({ erreur: "Ce projet n'est pas le vôtre." });

      const fichier = await requete.file();
      if (!fichier) return reponse.code(400).send({ erreur: "Aucune image reçue." });
      const extension = IMAGE_TYPES[fichier.mimetype];
      if (!extension) {
        return reponse.code(415).send({ erreur: "Format non pris en charge — jpeg, png ou webp." });
      }
      const contenu = await fichier.toBuffer();
      if (contenu.byteLength > IMAGE_MAX_OCTETS) {
        return reponse.code(413).send({ erreur: "Image trop lourde (4 Mo maximum)." });
      }

      const presentation = presentationDe(ligne.presentation);
      if (presentation.captures.length >= MAX_CAPTURES) {
        return reponse.code(400).send({ erreur: `Huit captures maximum par présentation.` });
      }
      await mkdir(join(env.uploadsDir, "projects"), { recursive: true });
      const nom = `${moi}-${requete.params.id}-${Date.now()}.${extension}`;
      const chemin = join(env.uploadsDir, "projects", nom);
      const captureUrl = `/uploads/projects/${nom}`;
      await writeFile(chemin, contenu);
      presentation.captures.push(captureUrl);
      try {
        await query("UPDATE projects SET presentation = $1::jsonb WHERE id = $2", [
          JSON.stringify(presentation),
          requete.params.id,
        ]);
      } catch (erreur) {
        await unlink(chemin).catch(() => undefined);
        throw erreur;
      }
      return reponse.code(201).send({ captureUrl, presentation });
    },
  );

  /** Retire une capture de la présentation et son fichier local associé. */
  app.delete<{ Params: { id: string }; Body: { url?: string } }>(
    "/api/projets/:id/presentation/captures",
    async (requete, reponse) => {
      const moi = await exigerSession(requete, reponse);
      if (!moi) return;
      const ligne = await queryOne<{ presentation: unknown }>(
        "SELECT presentation FROM projects WHERE id = $1 AND owner_id = $2",
        [requete.params.id, moi],
      );
      if (!ligne) return reponse.code(403).send({ erreur: "Ce projet n'est pas le vôtre." });

      const url = texte(requete.body?.url, 2_000);
      const presentation = presentationDe(ligne.presentation);
      if (!url || !presentation.captures.includes(url)) {
        return reponse.code(404).send({ erreur: "Capture introuvable." });
      }
      presentation.captures = presentation.captures.filter((capture) => capture !== url);
      await query("UPDATE projects SET presentation = $1::jsonb WHERE id = $2", [
        JSON.stringify(presentation),
        requete.params.id,
      ]);

      // Ne supprime jamais un chemin arbitraire fourni par le navigateur.
      if (url.startsWith("/uploads/projects/")) {
        const nom = basename(url);
        if (/^[a-f0-9-]+-[a-f0-9-]+-\d+\.(jpg|png|webp)$/i.test(nom)) {
          await unlink(join(env.uploadsDir, "projects", nom)).catch(() => undefined);
        }
      }
      return { presentation };
    },
  );

  /**
   * POST /api/projets/:id/checklist — ajoute une tâche ou sous-tâche après
   * la création du projet (à la création, seules des tâches de premier
   * niveau sont possibles — voir plus haut).
   *
   * Un seul niveau de sous-tâches : si `parentId` est fourni, il doit
   * désigner une tâche de premier niveau (`parent_id IS NULL`) de **ce**
   * projet, sinon 400. Non imposé par une contrainte de base — l'API est la
   * frontière qui vérifie, conformément au reste du fichier.
   *
   * Comme le toggle, ne touche jamais `derniere_activite`.
   */
  app.post<{
    Params: { id: string };
    Body: { id?: string; libelle?: string; dureeHeures?: number; parentId?: string };
  }>("/api/projets/:id/checklist", async (requete, reponse) => {
    const moi = await exigerSession(requete, reponse);
    if (!moi) return;

    if (!(await estProprietaire(requete.params.id, moi))) {
      return reponse.code(403).send({ erreur: "Ce projet n'est pas le vôtre." });
    }

    const libelle = requete.body?.libelle?.trim();
    if (!libelle) {
      return reponse.code(400).send({ erreur: "Le libellé de l'étape est requis." });
    }
    if (requete.body?.dureeHeures == null || requete.body.dureeHeures <= 0) {
      return reponse
        .code(400)
        .send({ erreur: "La durée estimée (en heures) est requise pour ajouter une étape." });
    }

    const parentId = requete.body.parentId;
    if (parentId) {
      const parent = await queryOne<{ id: string }>(
        `SELECT id FROM checklist_items
         WHERE id = $1 AND project_id = $2 AND parent_id IS NULL`,
        [parentId, requete.params.id],
      );
      if (!parent) {
        return reponse.code(400).send({
          erreur: "La tâche parente est introuvable, ou est elle-même une sous-tâche (un seul niveau).",
        });
      }
    }

    const ligne = await queryOne<{ id: string; ordre: number }>(
      `INSERT INTO checklist_items (id, project_id, parent_id, libelle, duree_heures, ordre)
       VALUES (
         COALESCE($5::uuid, gen_random_uuid()), $1, $2, $3, $4,
         COALESCE((SELECT max(ordre) + 1 FROM checklist_items
                   WHERE project_id = $1 AND parent_id IS NOT DISTINCT FROM $2), 0)
       )
       RETURNING id, ordre`,
      [requete.params.id, parentId ?? null, libelle, requete.body.dureeHeures, idPropose(requete.body?.id)],
    );

    return reponse.code(201).send(ligne);
  });

  /**
   * PATCH /api/projets/:id/checklist/:itemId — coche/décoche une étape.
   *
   * Ne touche jamais `derniere_activite` : cette colonne est réservée aux
   * écritures au journal (voir plus bas). Cocher une case est un geste sans
   * friction ; le laisser réinitialiser le compteur d'inactivité (M7)
   * permettrait de maintenir un projet apparemment actif sans jamais écrire
   * une ligne de journal.
   */
  app.patch<{
    Params: { id: string; itemId: string };
    Body: { fait?: boolean; bloque?: boolean };
  }>(
    "/api/projets/:id/checklist/:itemId",
    async (requete, reponse) => {
      const moi = await exigerSession(requete, reponse);
      if (!moi) return;

      if (!(await estProprietaire(requete.params.id, moi))) {
        return reponse.code(403).send({ erreur: "Ce projet n'est pas le vôtre." });
      }

      const corps = requete.body ?? {};
      if (typeof corps.fait !== "boolean" && typeof corps.bloque !== "boolean") {
        return reponse.code(400).send({ erreur: "Indiquez si l'étape est faite ou bloquée." });
      }
      // Une tâche terminée n'est jamais simultanément « bloquée ».
      const fait = typeof corps.fait === "boolean" ? corps.fait : null;
      const bloque = fait === true ? false : typeof corps.bloque === "boolean" ? corps.bloque : null;
      const ligne = await queryOne<{ id: string }>(
        `UPDATE checklist_items
         SET fait = COALESCE($1, fait),
             bloque = COALESCE($2, bloque)
         WHERE id = $3 AND project_id = $4
         RETURNING id`,
        [fait, bloque, requete.params.itemId, requete.params.id],
      );
      if (!ligne) return reponse.code(404).send({ erreur: "Étape introuvable" });

      return { ok: true };
    },
  );

  /**
   * PATCH /api/projets/:id/statut — M15.
   *
   * Arrêter un projet **exige** sa raison. La base l'impose déjà
   * (contrainte `abandon_motive`), mais on le vérifie ici pour rendre un 400
   * lisible plutôt qu'une erreur de contrainte en 500 : le message doit
   * expliquer quoi corriger, pas révéler un nom de contrainte SQL.
   */
  app.patch<{ Params: { id: string }; Body: { statut?: string; raison?: string } }>(
    "/api/projets/:id/statut",
    async (requete, reponse) => {
      const moi = await exigerSession(requete, reponse);
      if (!moi) return;

      if (!(await estProprietaire(requete.params.id, moi))) {
        return reponse.code(403).send({ erreur: "Ce projet n'est pas le vôtre." });
      }

      const { statut, raison } = requete.body ?? {};
      if (!statut || !STATUTS.includes(statut as (typeof STATUTS)[number])) {
        return reponse
          .code(400)
          .send({ erreur: `Statut attendu parmi : ${STATUTS.join(", ")}.` });
      }

      if (statut === "Abandonné" && !raison?.trim()) {
        return reponse.code(400).send({
          erreur:
            "Un projet arrêté doit porter sa raison — c'est ce qui permet à quelqu'un de le reprendre.",
        });
      }

      const termine = statut === "Terminé" || statut === "Abandonné";

      await transaction(async (client) => {
        await client.query(
          `UPDATE projects
           SET statut = $1::projet_statut,
               raison_abandon = CASE WHEN $1 = 'Abandonné' THEN $2 ELSE raison_abandon END,
               fin = CASE WHEN $3 THEN current_date ELSE NULL END,
               derniere_activite = now()
           WHERE id = $4`,
          [statut, raison?.trim() ?? null, termine, requete.params.id],
        );

        // M12 — terminer un projet est l'un des quatre gestes du cadrage.
        if (statut === "Terminé") {
          const p = await client.query<{ nom: string }>(
            "SELECT nom FROM projects WHERE id = $1",
            [requete.params.id],
          );
          await client.query(
            `INSERT INTO points (student_id, motif, detail)
             VALUES ($1, 'projet-termine', $2)`,
            [moi, p.rows[0]?.nom ?? "Projet"],
          );
        }
      });

      return { ok: true };
    },
  );

  /**
   * POST /api/projets/:id/journal — M3.
   *
   * L'écriture au journal met à jour `derniere_activite` du projet dans la
   * même transaction. C'est cette colonne qui pilote la détection
   * d'inactivité (M7) : si les deux pouvaient diverger, un projet suivi tous
   * les jours finirait par être signalé comme en sommeil.
   */
  app.post<{
    Params: { id: string };
    Body: {
      entreeId?: string;
      nature?: string;
      titre?: string;
      corps?: string;
      jalon?: string;
    };
  }>("/api/projets/:id/journal", async (requete, reponse) => {
    const moi = await exigerSession(requete, reponse);
    if (!moi) return;

    /* L'appartenance se vérifie **avant** la validation du corps. Sinon un
       corps mal formé renvoie 400 sur un projet auquel on n'a de toute façon
       pas droit, ce qui laisse croire que corriger le corps suffirait. */
    if (!(await estProprietaire(requete.params.id, moi))) {
      return reponse.code(403).send({ erreur: "Ce projet n'est pas le vôtre." });
    }

    const { nature, titre, corps, jalon } = requete.body ?? {};
    if (!titre?.trim() || !corps?.trim()) {
      return reponse.code(400).send({ erreur: "Titre et contenu sont requis." });
    }
    if (!nature || !NATURES.includes(nature as (typeof NATURES)[number])) {
      return reponse
        .code(400)
        .send({ erreur: `Nature attendue parmi : ${NATURES.join(", ")}.` });
    }

    const entree = await transaction(async (client) => {
      const { rows } = await client.query<{ id: string; date: string }>(
        `INSERT INTO journal_entries (id, project_id, nature, titre, corps, jalon)
         VALUES (COALESCE($6::uuid, gen_random_uuid()),
                 $1, $2::journal_nature, $3, $4, $5)
         RETURNING id, date`,
        [
          requete.params.id,
          nature,
          titre.trim(),
          corps.trim(),
          jalon?.trim() || null,
          idPropose(requete.body?.entreeId),
        ],
      );

      await client.query(
        "UPDATE projects SET derniere_activite = now() WHERE id = $1",
        [requete.params.id],
      );

      // M12 — « documenter une erreur » est l'un des quatre gestes du cadrage,
      // et il rapporte autant qu'aider un pair : c'est le même service rendu,
      // simplement décalé dans le temps.
      if (nature === "Erreur") {
        await client.query(
          `INSERT INTO points (student_id, motif, detail)
           VALUES ($1, 'erreur-documentee', $2)`,
          [moi, titre.trim()],
        );
      }

      return rows[0]!;
    });

    return reponse.code(201).send(entree);
  });

  /**
   * POST /api/fiches/:id/usage — le geste central du produit.
   *
   * Déclarer qu'une fiche a servi déclenche le retour à son auteur. C'est la
   * réponse au second échec de la lettre : l'effort terminé qui ne sert
   * jamais à personne. La notification part dans la même transaction — un
   * usage enregistré dont l'auteur n'est pas prévenu ne vaut rien.
   */
  app.post<{ Params: { id: string }; Body: { aServiA?: string } }>(
    "/api/fiches/:id/usage",
    async (requete, reponse) => {
      const moi = await exigerSession(requete, reponse);
      if (!moi) return;

      const aServiA = requete.body?.aServiA?.trim();
      if (!aServiA) {
        return reponse
          .code(400)
          .send({ erreur: "Dire à quoi la fiche a servi est ce qui fait le retour." });
      }

      const fiche = await queryOne<{ id: string; titre: string; author_id: string }>(
        "SELECT id, titre, author_id FROM fiches WHERE id = $1",
        [requete.params.id],
      );
      if (!fiche) return reponse.code(404).send({ erreur: "Fiche introuvable" });

      await transaction(async (client) => {
        await client.query(
          `INSERT INTO fiche_uses (fiche_id, student_id, a_servi_a)
           VALUES ($1, $2, $3)`,
          [fiche.id, moi, aServiA],
        );

        // On ne se notifie pas soi-même d'avoir utilisé sa propre fiche.
        if (fiche.author_id !== moi) {
          const { rows } = await client.query<{ nom: string }>(
            "SELECT nom FROM students WHERE id = $1",
            [moi],
          );
          await client.query(
            `INSERT INTO notifications (student_id, nature, titre, corps, cible)
             VALUES ($1, 'signal', $2, $3, $4)`,
            [
              fiche.author_id,
              "Ta fiche a servi à quelqu'un",
              `${rows[0]?.nom ?? "Quelqu'un"} s'en est servi pour : ${aServiA}`,
              `#/fragment/${fiche.id}`,
            ],
          );

          await client.query(
            `INSERT INTO points (student_id, motif, detail)
             VALUES ($1, 'solution-partagee', $2)`,
            [fiche.author_id, fiche.titre],
          );
        }
      });

      return reponse.code(201).send({ ok: true });
    },
  );

  /** GET /api/notifications — M20. */
  app.get("/api/notifications", async (requete, reponse) => {
    const moi = await exigerSession(requete, reponse);
    if (!moi) return;

    const notifications = await query(
      `SELECT id, nature, titre, corps, date, lu, cible
       FROM notifications WHERE student_id = $1
       ORDER BY date DESC LIMIT 50`,
      [moi],
    );
    return { notifications };
  });

  /** Une note consultée dans le popup reste archivée, simplement marquée lue. */
  app.patch<{ Params: { id: string } }>(
    "/api/notifications/:id/lue",
    async (requete, reponse) => {
      const moi = await exigerSession(requete, reponse);
      if (!moi) return;
      const miseAJour = await queryOne<{ id: string }>(
        `UPDATE notifications SET lu = true
         WHERE id = $1 AND student_id = $2
         RETURNING id`,
        [requete.params.id, moi],
      );
      if (!miseAJour) return reponse.code(404).send({ erreur: "Notification introuvable." });
      return { ok: true };
    },
  );

  /** PATCH /api/notifications/lues */
  app.patch("/api/notifications/lues", async (requete, reponse) => {
    const moi = await exigerSession(requete, reponse);
    if (!moi) return;

    await query("UPDATE notifications SET lu = true WHERE student_id = $1", [moi]);
    return { ok: true };
  });

  /** Supprime une notification précise appartenant à la session courante. */
  app.delete<{ Params: { id: string } }>("/api/notifications/:id", async (requete, reponse) => {
    const moi = await exigerSession(requete, reponse);
    if (!moi) return;

    if (!UUID.test(requete.params.id)) {
      return reponse.code(400).send({ erreur: "Identifiant de notification invalide." });
    }

    const supprimee = await queryOne<{ id: string }>(
      `DELETE FROM notifications WHERE id = $1 AND student_id = $2 RETURNING id`,
      [requete.params.id, moi],
    );
    if (!supprimee) return reponse.code(404).send({ erreur: "Notification introuvable." });
    return { supprime: true };
  });

  /**
   * Suppression en lot, limitée au propriétaire de la session. `tout` évite
   * d'envoyer une longue liste d'identifiants lorsque l'utilisateur vide son
   * centre de notifications.
   */
  app.delete<{ Body: { ids?: unknown; tout?: unknown } }>(
    "/api/notifications",
    async (requete, reponse) => {
      const moi = await exigerSession(requete, reponse);
      if (!moi) return;

      const corps = objet(requete.body);
      if (corps.tout === true) {
        const supprimees = await query<{ id: string }>(
          "DELETE FROM notifications WHERE student_id = $1 RETURNING id",
          [moi],
        );
        return { ids: supprimees.map((notification) => notification.id) };
      }

      const ids = Array.isArray(corps.ids)
        ? [...new Set(corps.ids.filter((id): id is string => typeof id === "string" && UUID.test(id)))]
        : [];
      if (ids.length === 0 || ids.length > 50) {
        return reponse.code(400).send({ erreur: "Sélection de notifications invalide." });
      }

      const supprimees = await query<{ id: string }>(
        `DELETE FROM notifications
         WHERE student_id = $1 AND id = ANY($2::uuid[])
         RETURNING id`,
        [moi, ids],
      );
      return { ids: supprimees.map((notification) => notification.id) };
    },
  );

  const TYPES_EVENEMENT = ["Réunion", "Deadline", "Session", "Autre"] as const;

  /**
   * POST /api/evenements — calendrier personnel.
   *
   * `projectId`, s'il est fourni, doit appartenir à l'appelant — même garde
   * que partout ailleurs : un identifiant valide ne confère aucun droit sur
   * la ressource qu'il désigne.
   */
  app.post<{
    Body: {
      id?: string;
      titre?: string;
      date?: string;
      heure?: string;
      type?: string;
      projectId?: string;
    };
  }>("/api/evenements", async (requete, reponse) => {
    const moi = await exigerSession(requete, reponse);
    if (!moi) return;

    const c = requete.body ?? {};
    if (!c.titre?.trim()) {
      return reponse.code(400).send({ erreur: "Le titre de l'événement est requis." });
    }
    if (!c.date) {
      return reponse.code(400).send({ erreur: "La date de l'événement est requise." });
    }
    const type = c.type && (TYPES_EVENEMENT as readonly string[]).includes(c.type)
      ? c.type
      : "Autre";

    if (c.projectId && !(await estProprietaire(c.projectId, moi))) {
      return reponse.code(403).send({ erreur: "Ce projet n'est pas le vôtre." });
    }

    const ligne = await queryOne<{ id: string }>(
      `INSERT INTO events (id, student_id, titre, date, heure, type, project_id)
       VALUES (COALESCE($7::uuid, gen_random_uuid()), $1, $2, $3, $4, $5::evenement_type, $6)
       RETURNING id`,
      [
        moi,
        c.titre.trim(),
        c.date,
        c.heure || null,
        type,
        c.projectId ?? null,
        idPropose(c.id),
      ],
    );

    return reponse.code(201).send({ id: ligne!.id });
  });

  /** DELETE /api/evenements/:id */
  app.delete<{ Params: { id: string } }>("/api/evenements/:id", async (requete, reponse) => {
    const moi = await exigerSession(requete, reponse);
    if (!moi) return;

    const ligne = await queryOne<{ id: string }>(
      "DELETE FROM events WHERE id = $1 AND student_id = $2 RETURNING id",
      [requete.params.id, moi],
    );
    if (!ligne) return reponse.code(404).send({ erreur: "Événement introuvable" });

    return { ok: true };
  });
}
