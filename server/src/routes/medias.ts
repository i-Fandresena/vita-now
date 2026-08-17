import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { FastifyInstance } from "fastify";

import { query } from "../db.js";
import { env } from "../env.js";
import { exigerSession } from "../session.js";

/**
 * medias.ts — photo de profil et CV.
 *
 * Les fichiers vivent sur le disque (`env.uploadsDir`), servis en statique
 * par nginx sous `/uploads/` — la base ne garde que l'URL. Premier upload de
 * fichier du projet : pas de précédent à suivre, le choix « disque + nginx »
 * plutôt qu'un stockage objet distant tient à l'échelle (quelques dizaines
 * d'étudiants) et à l'absence de dépendance externe à opérer en plus.
 *
 * Chaque fichier est nommé `${studentId}-${horodatage}.${extension}` :
 * jamais réutilisé, donc jamais de souci de cache navigateur périmé après un
 * remplacement — pas besoin de purge de cache, juste une nouvelle URL.
 */

const PHOTO_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const PHOTO_MAX_OCTETS = 4 * 1024 * 1024;
const CV_MAX_OCTETS = 8 * 1024 * 1024;

async function assurerDossiers(): Promise<void> {
  await mkdir(join(env.uploadsDir, "photos"), { recursive: true });
  await mkdir(join(env.uploadsDir, "cv"), { recursive: true });
}

async function supprimerSiPresent(cheminAbsolu: string): Promise<void> {
  try {
    await unlink(cheminAbsolu);
  } catch {
    /* Fichier déjà absent — rien à faire. Une colonne `photo_url` peut
       pointer vers un fichier qui n'existe plus (déploiement, purge
       manuelle) ; ce n'est pas une erreur pour l'appelant. */
  }
}

/** Le nom de fichier porté par une URL `/uploads/...` déjà enregistrée. */
function nomDepuisUrl(url: string | null): string | null {
  if (!url) return null;
  const segments = url.split("/");
  return segments[segments.length - 1] ?? null;
}

export async function routesMedias(app: FastifyInstance): Promise<void> {
  await assurerDossiers();

  app.post("/api/profil/photo", async (requete, reponse) => {
    const moi = await exigerSession(requete, reponse);
    if (!moi) return;

    const fichier = await requete.file();
    if (!fichier) {
      return reponse.code(400).send({ erreur: "Aucun fichier reçu." });
    }

    const extension = PHOTO_TYPES[fichier.mimetype];
    if (!extension) {
      return reponse
        .code(415)
        .send({ erreur: "Format non pris en charge — jpeg, png ou webp." });
    }

    const contenu = await fichier.toBuffer();
    if (contenu.byteLength > PHOTO_MAX_OCTETS) {
      return reponse.code(413).send({ erreur: "Image trop lourde (4 Mo maximum)." });
    }

    const [ancien] = await query<{ photo_url: string | null }>(
      "SELECT photo_url FROM students WHERE id = $1",
      [moi],
    );

    const nomFichier = `${moi}-${Date.now()}.${extension}`;
    await writeFile(join(env.uploadsDir, "photos", nomFichier), contenu);

    const photoUrl = `/uploads/photos/${nomFichier}`;
    await query("UPDATE students SET photo_url = $1 WHERE id = $2", [photoUrl, moi]);

    const ancienNom = nomDepuisUrl(ancien?.photo_url ?? null);
    if (ancienNom) await supprimerSiPresent(join(env.uploadsDir, "photos", ancienNom));

    return reponse.code(201).send({ photoUrl });
  });

  app.delete("/api/profil/photo", async (requete, reponse) => {
    const moi = await exigerSession(requete, reponse);
    if (!moi) return;

    const [ligne] = await query<{ photo_url: string | null }>(
      "SELECT photo_url FROM students WHERE id = $1",
      [moi],
    );
    const nom = nomDepuisUrl(ligne?.photo_url ?? null);
    if (nom) await supprimerSiPresent(join(env.uploadsDir, "photos", nom));

    await query("UPDATE students SET photo_url = NULL WHERE id = $1", [moi]);
    return reponse.send({ ok: true });
  });

  app.post("/api/profil/cv", async (requete, reponse) => {
    const moi = await exigerSession(requete, reponse);
    if (!moi) return;

    const fichier = await requete.file();
    if (!fichier) {
      return reponse.code(400).send({ erreur: "Aucun fichier reçu." });
    }
    if (fichier.mimetype !== "application/pdf") {
      return reponse.code(415).send({ erreur: "Le CV doit être un PDF." });
    }

    const contenu = await fichier.toBuffer();
    if (contenu.byteLength > CV_MAX_OCTETS) {
      return reponse.code(413).send({ erreur: "Fichier trop lourd (8 Mo maximum)." });
    }

    const [ancien] = await query<{ cv_url: string | null }>(
      "SELECT cv_url FROM students WHERE id = $1",
      [moi],
    );

    // L'extension n'est pas déduite du nom d'origine (non fiable) mais fixée :
    // le type MIME est déjà vérifié comme `application/pdf` ci-dessus.
    const nomFichier = `${moi}-${Date.now()}.pdf`;
    await writeFile(join(env.uploadsDir, "cv", nomFichier), contenu);

    const cvUrl = `/uploads/cv/${nomFichier}`;
    // Le nom d'origine (`filename`) sert seulement à l'affichage — un accent
    // ou un identifiant imprévisible dedans ne cassera pas le stockage.
    const cvNom = fichier.filename || "cv.pdf";
    await query("UPDATE students SET cv_url = $1, cv_nom = $2 WHERE id = $3", [
      cvUrl,
      cvNom,
      moi,
    ]);

    const ancienNom = nomDepuisUrl(ancien?.cv_url ?? null);
    if (ancienNom) await supprimerSiPresent(join(env.uploadsDir, "cv", ancienNom));

    return reponse.code(201).send({ cvUrl, cvNom });
  });

  app.delete("/api/profil/cv", async (requete, reponse) => {
    const moi = await exigerSession(requete, reponse);
    if (!moi) return;

    const [ligne] = await query<{ cv_url: string | null }>(
      "SELECT cv_url FROM students WHERE id = $1",
      [moi],
    );
    const nom = nomDepuisUrl(ligne?.cv_url ?? null);
    if (nom) await supprimerSiPresent(join(env.uploadsDir, "cv", nom));

    await query("UPDATE students SET cv_url = NULL, cv_nom = NULL WHERE id = $1", [moi]);
    return reponse.send({ ok: true });
  });
}
