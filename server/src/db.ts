import pg from "pg";

import { env } from "./env.js";

/**
 * db.ts — l'accès à PostgreSQL.
 *
 * Un seul pool pour tout le processus. Fastify traite les requêtes en
 * concurrence : ouvrir une connexion par requête épuiserait `max_connections`
 * bien avant que la charge ne devienne intéressante.
 */

/* Les `timestamptz` gardent la conversion par défaut de pg : ils deviennent des
   `Date`, que `JSON.stringify` sérialise en ISO 8601 UTC — exactement ce que le
   front attend (`domain/soa.ts` : « date: string », relue par `new Date()`).
   Les laisser bruts renverrait « 2026-07-23 13:18:50+03 », avec une espace au
   lieu du « T » : V8 l'accepte, la spécification ne l'exige pas, et un
   navigateur qui refuse produit `Invalid Date` sans rien signaler.

   Les `date` en revanche restent des chaînes. Une date sans heure convertie en
   `Date` est interprétée à minuit UTC : à l'est de Greenwich — Madagascar est à
   UTC+3 — la sérialisation peut la ramener à la veille. Un projet commencé le
   2 avril s'afficherait au 1er. Le type SQL ne porte pas d'heure, la valeur
   transportée ne doit pas en inventer une. */
pg.types.setTypeParser(pg.types.builtins.DATE, (v) => v);

/* `numeric` arrive en chaîne pour préserver la précision. Nos seuls numeric
   sont des rangs de pertinence, où le flottant est exact et attendu. */
pg.types.setTypeParser(pg.types.builtins.NUMERIC, Number);

export const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  // Au-delà, on attend plutôt qu'on sature la base. Un VPS mutualisé n'a pas
  // des centaines de connexions à offrir.
  max: 10,
  idleTimeoutMillis: 30_000,
  // Une base injoignable doit se voir vite : la contrainte produit est une
  // réponse en moins de 2 s (HANDOFF §4).
  connectionTimeoutMillis: 5_000,
});

/**
 * Écouteur d'erreur du pool — **obligatoire**, pas défensif.
 *
 * `pg.Pool` est un `EventEmitter`. Quand PostgreSQL ferme une connexion
 * inactive — arrêt du service, `pg_terminate_backend`, redémarrage pour une
 * mise à jour — le client concerné émet `error`. Un `EventEmitter` dont
 * l'événement `error` n'a aucun écouteur **relance l'exception**, et Node
 * s'arrête. Le processus meurt alors sans qu'aucune requête ait échoué.
 *
 * C'est exactement ce qui s'est produit : `systemctl stop postgresql` faisait
 * tomber l'API en boucle de redémarrage, et `/api/sante` répondait 502 au lieu
 * du 503 documenté. Or ce contrôle de santé est précisément ce qu'on consulte
 * quand la base est tombée — il doit répondre à ce moment-là, pas seulement
 * quand tout va bien.
 *
 * L'erreur est journalisée et rien d'autre : le client fautif est déjà retiré
 * du pool par `pg`, et la requête suivante en ouvrira un neuf.
 */
pool.on("error", (erreur) => {
  console.error(
    JSON.stringify({
      level: 50,
      time: Date.now(),
      msg: "connexion PostgreSQL perdue — le pool se reconstituera",
      erreur: erreur instanceof Error ? erreur.message : String(erreur),
    }),
  );
});

/** Requête typée. `T` décrit une ligne, pas le résultat entier. */
export async function query<T extends pg.QueryResultRow>(
  texte: string,
  valeurs: readonly unknown[] = [],
): Promise<T[]> {
  const resultat = await pool.query<T>(texte, valeurs as unknown[]);
  return resultat.rows;
}

/** Première ligne, ou `null`. Le cas « rien trouvé » n'est pas une erreur. */
export async function queryOne<T extends pg.QueryResultRow>(
  texte: string,
  valeurs: readonly unknown[] = [],
): Promise<T | null> {
  const lignes = await query<T>(texte, valeurs);
  return lignes[0] ?? null;
}

/**
 * Exécute dans une transaction, avec annulation garantie en cas d'échec.
 *
 * Nécessaire dès qu'une écriture touche plusieurs tables — arrêter un projet
 * écrit dans `projects`, `journal_entries` et `notifications`. Sans
 * transaction, un échec à mi-chemin laisse un projet arrêté dont personne
 * n'est prévenu.
 */
export async function transaction<T>(
  travail: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const resultat = await travail(client);
    await client.query("COMMIT");
    return resultat;
  } catch (erreur) {
    await client.query("ROLLBACK");
    throw erreur;
  } finally {
    client.release();
  }
}
