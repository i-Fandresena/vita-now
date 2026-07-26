import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * env.ts — la configuration, lue une fois et validée au démarrage.
 *
 * **Le processus refuse de démarrer si une valeur obligatoire manque.** C'est
 * délibéré : une API qui démarre à moitié configurée échoue plus tard, sur une
 * requête, à un moment où le message d'erreur n'atteint plus personne. Mieux
 * vaut une panne au lancement, lisible dans les journaux de systemd.
 *
 * Pas de dépendance `dotenv` : lire un fichier de quinze lignes ne justifie pas
 * un paquet de plus à auditer. Les variables déjà présentes dans
 * l'environnement gagnent toujours — c'est ainsi que systemd et Docker
 * surchargent le fichier en production.
 */

function chargerFichier(chemin: string): void {
  let brut: string;
  try {
    brut = readFileSync(chemin, "utf8");
  } catch {
    return; // Pas de .env : normal en production, tout vient de l'environnement.
  }

  for (const ligne of brut.split("\n")) {
    const nette = ligne.trim();
    if (!nette || nette.startsWith("#")) continue;

    const separateur = nette.indexOf("=");
    if (separateur === -1) continue;

    const cle = nette.slice(0, separateur).trim();
    let valeur = nette.slice(separateur + 1).trim();

    // Les guillemets entourant une valeur sont une convention d'écriture, pas
    // une partie de la valeur.
    if (
      (valeur.startsWith('"') && valeur.endsWith('"')) ||
      (valeur.startsWith("'") && valeur.endsWith("'"))
    ) {
      valeur = valeur.slice(1, -1);
    }

    // L'environnement réel a priorité : systemd doit pouvoir surcharger.
    if (process.env[cle] === undefined) process.env[cle] = valeur;
  }
}

chargerFichier(resolve(process.cwd(), ".env"));

function obligatoire(cle: string): string {
  const valeur = process.env[cle];
  if (!valeur) {
    throw new Error(
      `Configuration manquante : ${cle}. Copier .env.example en .env et le renseigner.`,
    );
  }
  return valeur;
}

function optionnel(cle: string, defaut: string): string {
  return process.env[cle] || defaut;
}

const cookieSecret = obligatoire("COOKIE_SECRET");
const production = process.env.NODE_ENV === "production";

/* Un secret laissé à sa valeur d'exemple en production signerait les sessions
   avec une clé publiée sur GitHub : n'importe qui pourrait forger un cookie.
   Refuser de démarrer est la seule réponse proportionnée. */
if (production && cookieSecret.startsWith("changer-cette-valeur")) {
  throw new Error(
    "COOKIE_SECRET est resté à sa valeur d'exemple. En générer un vrai : openssl rand -hex 32",
  );
}

export const env = {
  databaseUrl: obligatoire("DATABASE_URL"),
  port: Number(optionnel("PORT", "3000")),
  corsOrigin: optionnel("CORS_ORIGIN", "http://localhost:5173"),
  cookieSecret,
  /** Vide = pas de résumé par IA ; l'API se rabat sur les règles du journal. */
  anthropicKey: process.env.ANTHROPIC_API_KEY ?? "",
  production,
} as const;
