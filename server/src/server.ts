import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import Fastify, { type FastifyInstance } from "fastify";

import { pool } from "./db.js";
import { env } from "./env.js";
import { lireReglages } from "./reglages.js";
import { routesAuth } from "./routes/auth.js";
import { routesAdmin } from "./routes/admin.js";
import { routesCollectif } from "./routes/collectif.js";
import { routesCopilote } from "./routes/copilote.js";
import { routesEcriture } from "./routes/ecriture.js";
import { routesEntrepriseAuth } from "./routes/entreprise-auth.js";
import { routesEtat } from "./routes/etat.js";
import { routesFiches } from "./routes/fiches.js";
import { routesMedias } from "./routes/medias.js";
import { routesProjets } from "./routes/projets.js";

/**
 * server.ts — l'assemblage.
 *
 * Séparé de `index.ts` pour qu'un test puisse construire l'application sans
 * ouvrir de port.
 */

export function construire(): FastifyInstance {
  const app = Fastify({
    // Journal JSON dans les deux cas. Un embellisseur (`pino-pretty`) serait
    // plus lisible en développement, mais c'est une dépendance de plus à
    // installer sur le VPS pour un confort qui ne sert qu'ici — et `journalctl`
    // lit très bien du JSON.
    logger: { level: env.production ? "info" : "debug" },
    // Nginx est devant en production : sans cela, tous les journaux
    // porteraient l'adresse du proxy au lieu de celle du visiteur.
    trustProxy: env.production,
  });

  app.register(cookie, { secret: env.cookieSecret });
  // Limite au niveau le plus large utilisé (le CV, 8 Mo) ; chaque route
  // vérifie ensuite la limite propre à son type de fichier (routes/medias.ts).
  app.register(multipart, { limits: { fileSize: 8 * 1024 * 1024 } });

  /* CORS écrit à la main plutôt qu'avec @fastify/cors : une seule origine est
     autorisée, et la liste des en-têtes tient en quatre lignes. `credentials`
     est indispensable — la session voyage en cookie, pas en en-tête. */
  app.addHook("onRequest", async (requete, reponse) => {
    const origine = requete.headers.origin;
    if (origine === env.corsOrigin) {
      reponse.header("Access-Control-Allow-Origin", origine);
      reponse.header("Access-Control-Allow-Credentials", "true");
      reponse.header("Vary", "Origin");
    }
    if (requete.method === "OPTIONS") {
      reponse
        .header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS")
        .header("Access-Control-Allow-Headers", "content-type")
        .header("Access-Control-Max-Age", "86400")
        .code(204)
        .send();
    }
  });

  /**
   * Maintenance — le levier global du centre d'administration.
   *
   * Ne bloque que les **écritures**, et jamais celles de l'administration :
   * couper aussi la lecture afficherait une page blanche à qui est déjà
   * connecté, alors que l'intention est « rien ne bouge pendant qu'on
   * intervient ». Une session en cours continue donc de voir ses données, et
   * chaque tentative d'écriture explique pourquoi elle échoue.
   *
   * `/api/admin/*` est exempt sans condition : c'est la seule interface
   * capable de rouvrir la plateforme, et elle a déjà sa propre
   * authentification.
   */
  app.addHook("onRequest", async (requete, reponse) => {
    if (requete.method === "GET" || requete.method === "OPTIONS") return;
    const chemin = requete.url.split("?")[0] ?? "";
    if (chemin.startsWith("/api/admin/")) return;
    if (!(await lireReglages()).maintenance) return;
    await reponse.code(503).send({
      erreur: "Maintenance en cours — les modifications sont momentanément suspendues.",
    });
  });

  /**
   * Santé — utilisée par le déploiement pour savoir si le service répond.
   *
   * Interroge réellement la base : un processus vivant dont la base est
   * injoignable est en panne, et un contrôle qui répondrait « OK » dans ce cas
   * ne servirait à rien.
   */
  app.get("/api/sante", async (_requete, reponse) => {
    try {
      const debut = Date.now();
      await pool.query("SELECT 1");
      return { statut: "ok", base: "ok", latenceMs: Date.now() - debut };
    } catch {
      return reponse.code(503).send({ statut: "degrade", base: "injoignable" });
    }
  });

  app.register(routesAuth);
  app.register(routesAdmin);
  app.register(routesEntrepriseAuth);
  app.register(routesEtat);
  app.register(routesFiches);
  app.register(routesProjets);
  app.register(routesEcriture);
  app.register(routesCollectif);
  app.register(routesCopilote);
  app.register(routesMedias);

  /* Le détail d'une erreur serveur ne sort jamais vers le navigateur : un
     message de PostgreSQL révèle des noms de tables et de colonnes. Il part
     dans les journaux, où il sert à qui doit le lire. */
  app.setErrorHandler((erreur: unknown, requete, reponse) => {
    requete.log.error(erreur);

    // `unknown` plutôt que `Error` : ce qui remonte ici peut être n'importe
    // quoi — une chaîne levée par une dépendance, un rejet de promesse sans
    // valeur. Supposer la forme est le meilleur moyen de faire échouer le
    // gestionnaire d'erreurs lui-même, c'est-à-dire de perdre l'erreur.
    const statut =
      typeof erreur === "object" && erreur !== null && "statusCode" in erreur
        ? Number((erreur as { statusCode?: unknown }).statusCode)
        : NaN;
    const code = Number.isFinite(statut) && statut >= 400 ? statut : 500;

    const message =
      erreur instanceof Error ? erreur.message : "Requête invalide";

    reponse.code(code).send({ erreur: code >= 500 ? "Erreur interne" : message });
  });

  return app;
}
