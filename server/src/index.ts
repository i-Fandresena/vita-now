import { pool } from "./db.js";
import { env } from "./env.js";
import { construire } from "./server.js";

/**
 * index.ts — le point d'entrée du processus.
 *
 * Écoute sur 127.0.0.1 et non 0.0.0.0 : nginx est le seul client légitime, et
 * exposer directement le port de l'API sur l'interface publique contournerait
 * le TLS et la limitation de débit du proxy.
 */

const app = construire();

async function demarrer(): Promise<void> {
  try {
    await app.listen({ port: env.port, host: "127.0.0.1" });
  } catch (erreur) {
    app.log.error(erreur);
    process.exit(1);
  }
}

/* systemd envoie SIGTERM au redéploiement. Sans cette fermeture ordonnée, les
   requêtes en cours sont coupées net et les connexions PostgreSQL restent
   ouvertes jusqu'à expiration côté serveur. */
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    app.log.info(`${signal} reçu — arrêt en cours`);
    void app
      .close()
      .then(() => pool.end())
      .then(() => process.exit(0));
  });
}

void demarrer();
