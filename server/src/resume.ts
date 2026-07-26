import { createHash } from "node:crypto";

import { queryOne, query } from "./db.js";
import { env } from "./env.js";

/**
 * resume.ts — M5, le résumé intelligent de projet.
 *
 * Contrat de sortie fixé par le cadrage, et tenu ici : objectif · ce qui est
 * fait · ce qui reste à faire · dernière activité · risque d'abandon **avec son
 * motif**. Jamais de code brut.
 *
 * **Deux chemins, et le second n'est pas un pis-aller.** Sans clé API, le
 * résumé est déduit du journal par des règles explicites. C'est moins riche,
 * mais c'est vérifiable et gratuit — et surtout, cela garantit que l'écran ne
 * dépend pas d'un service tiers le jour d'une démonstration. La clé améliore
 * la formulation ; elle ne conditionne pas le produit.
 *
 * Le résultat est mis en cache avec l'empreinte du journal dont il dérive : on
 * ne rappelle le modèle que si le journal a réellement changé. Un projet
 * consulté dix fois dans l'après-midi coûte un appel, pas dix.
 */

interface EntreeJournal {
  nature: string;
  titre: string;
  corps: string;
  date: string;
  jalon: string | null;
}

export interface Resume {
  projectId: string;
  objectif: string;
  faitCeQui: string[];
  resteAFaire: string[];
  derniereActivite: string;
  risqueAbandon: "Faible" | "Modéré" | "Élevé";
  pourquoi: string;
  /** D'où vient ce résumé — l'écran peut le dire, et il le doit. */
  source: "claude" | "journal";
}

/** Empreinte du journal : change dès qu'une entrée est ajoutée ou modifiée. */
function empreinte(entrees: EntreeJournal[]): string {
  const h = createHash("sha256");
  for (const e of entrees) h.update(`${e.date}|${e.titre}|${e.corps}`);
  return h.digest("hex").slice(0, 32);
}

const JOUR = 86_400_000;

/**
 * Risque d'abandon, déduit du silence.
 *
 * Le seuil vient du cadrage (« détection d'inactivité, ex. après 7 jours »).
 * Il est **qualitatif et jamais un score** : SPEC §2bis interdit d'afficher un
 * chiffre là où une phrase explique. Et le motif accompagne toujours le
 * niveau — sans lui, l'indication est un jugement qu'on ne peut pas discuter.
 */
function risqueDe(
  jours: number,
  statut: string,
): { risque: Resume["risqueAbandon"]; pourquoi: string } {
  if (statut === "Terminé") {
    return { risque: "Faible", pourquoi: "Le projet est terminé." };
  }
  if (statut === "Abandonné") {
    return {
      risque: "Élevé",
      pourquoi: "Le projet est arrêté. Sa raison est écrite : c'est par là qu'on le reprend.",
    };
  }
  if (jours <= 7) {
    return {
      risque: "Faible",
      pourquoi: `Dernière entrée il y a ${jours} jour${jours > 1 ? "s" : ""}. Le fil n'est pas perdu.`,
    };
  }
  if (jours <= 21) {
    return {
      risque: "Modéré",
      pourquoi: `${jours} jours sans entrée. C'est autour de ce moment que le contexte se perd.`,
    };
  }
  return {
    risque: "Élevé",
    pourquoi: `${jours} jours sans entrée. Reprendre demandera de relire le journal avant d'écrire du code.`,
  };
}

/** Le résumé par règles — toujours disponible, toujours explicable. */
function parRegles(
  projet: { id: string; nom: string; objectif: string; statut: string; derniere_activite: string },
  entrees: EntreeJournal[],
): Resume {
  const jours = Math.max(
    0,
    Math.floor((Date.now() - new Date(projet.derniere_activite).getTime()) / JOUR),
  );
  const { risque, pourquoi } = risqueDe(jours, projet.statut);

  // « Ce qui est fait » se lit dans les solutions et les jalons — ce sont les
  // seules entrées qui décrivent un acquis plutôt qu'une intention.
  const fait = entrees
    .filter((e) => e.nature === "Solution" || e.nature === "Architecture" || e.jalon)
    .slice(0, 5)
    .map((e) => e.jalon ?? e.titre);

  // « Ce qui reste » se lit dans les erreurs non suivies d'une solution : une
  // erreur documentée sans issue est un travail encore ouvert.
  const reste = entrees
    .filter((e) => e.nature === "Erreur")
    .slice(0, 4)
    .map((e) => e.titre);

  return {
    projectId: projet.id,
    objectif: projet.objectif || projet.nom,
    faitCeQui: fait.length > 0 ? fait : ["Le journal ne porte encore aucun acquis."],
    resteAFaire:
      reste.length > 0
        ? reste
        : ["Rien d'ouvert dans le journal — la prochaine étape reste à écrire."],
    derniereActivite: projet.derniere_activite,
    risqueAbandon: risque,
    pourquoi,
    source: "journal",
  };
}

/**
 * Le résumé par l'API Claude.
 *
 * Le prompt impose la forme de sortie **et** les interdits du produit : pas de
 * code, pas de reproche, une prochaine étape courte. Un modèle laissé libre
 * produit spontanément des encouragements — exactement ce que la lettre de Soa
 * décrit comme inefficace.
 */
async function parClaude(
  projet: { id: string; nom: string; objectif: string; statut: string; derniere_activite: string },
  entrees: EntreeJournal[],
  repli: Resume,
): Promise<Resume> {
  const journal = entrees
    .slice(0, 30)
    .map((e) => `[${e.nature}] ${e.titre}\n${e.corps}`)
    .join("\n\n");

  const corps = {
    model: "claude-sonnet-5",
    max_tokens: 1024,
    system:
      "Tu résumes le journal de bord d'un projet étudiant, en français. " +
      "Réponds UNIQUEMENT par un objet JSON valide, sans texte autour. " +
      "Champs : objectif (string), faitCeQui (string[]), resteAFaire (string[]), pourquoi (string). " +
      "Règles absolues : jamais de code source ; jamais de reproche ni " +
      "d'encouragement (« bravo », « courage », « tu peux le faire ») ; " +
      "chaque élément fait une phrase courte et factuelle, tirée du journal " +
      "et de rien d'autre. `pourquoi` explique en une phrase où en est " +
      "réellement le projet.",
    messages: [
      {
        role: "user",
        content: `Projet : ${projet.nom}\nObjectif déclaré : ${projet.objectif}\nStatut : ${projet.statut}\n\nJournal :\n${journal}`,
      },
    ],
  };

  const reponse = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(corps),
    // Le contrat produit est une réponse en moins de 2 s côté écran. Au-delà
    // de 12 s, le repli par règles est meilleur qu'une attente.
    signal: AbortSignal.timeout(12_000),
  });

  if (!reponse.ok) throw new Error(`API Claude : ${reponse.status}`);

  const charge = (await reponse.json()) as { content?: { text?: string }[] };
  const texte = charge.content?.[0]?.text ?? "";

  // Le modèle peut encadrer son JSON d'une clôture Markdown malgré la
  // consigne. On extrait le premier objet plutôt que d'échouer là-dessus.
  const debut = texte.indexOf("{");
  const fin = texte.lastIndexOf("}");
  if (debut === -1 || fin === -1) throw new Error("Réponse sans JSON exploitable");

  const analyse = JSON.parse(texte.slice(debut, fin + 1)) as Partial<Resume>;

  return {
    ...repli,
    objectif: analyse.objectif || repli.objectif,
    faitCeQui: Array.isArray(analyse.faitCeQui) && analyse.faitCeQui.length > 0
      ? analyse.faitCeQui
      : repli.faitCeQui,
    resteAFaire: Array.isArray(analyse.resteAFaire) && analyse.resteAFaire.length > 0
      ? analyse.resteAFaire
      : repli.resteAFaire,
    // Le risque reste calculé côté serveur : c'est un fait de calendrier, pas
    // une appréciation, et le modèle n'a aucun moyen de le connaître mieux.
    pourquoi: analyse.pourquoi || repli.pourquoi,
    source: "claude",
  };
}

export async function resumeDe(projectId: string): Promise<Resume | null> {
  const projet = await queryOne<{
    id: string;
    nom: string;
    objectif: string;
    statut: string;
    derniere_activite: string;
  }>(
    `SELECT id, nom, objectif, statut, derniere_activite
     FROM projects WHERE id = $1`,
    [projectId],
  );
  if (!projet) return null;

  const entrees = await query<EntreeJournal>(
    `SELECT nature, titre, corps, date, jalon
     FROM journal_entries WHERE project_id = $1 ORDER BY date DESC`,
    [projectId],
  );

  const repli = parRegles(projet, entrees);
  const hash = empreinte(entrees);

  // Cache : le journal n'a pas bougé, le résumé non plus.
  const enCache = await queryOne<{
    objectif: string;
    fait: string[];
    reste_a_faire: string[];
    risque: Resume["risqueAbandon"];
    pourquoi: string;
  }>(
    `SELECT objectif, fait, reste_a_faire, risque, pourquoi
     FROM project_summaries WHERE project_id = $1 AND source_hash = $2`,
    [projectId, hash],
  );

  if (enCache) {
    return {
      ...repli,
      objectif: enCache.objectif,
      faitCeQui: enCache.fait,
      resteAFaire: enCache.reste_a_faire,
      risqueAbandon: enCache.risque,
      pourquoi: enCache.pourquoi,
      source: "claude",
    };
  }

  if (!env.anthropicKey || entrees.length === 0) return repli;

  let resume: Resume;
  try {
    resume = await parClaude(projet, entrees, repli);
  } catch (erreur) {
    // Une panne du modèle ne doit pas vider l'écran : le repli par règles est
    // toujours disponible, et il dit la même chose en moins bien.
    console.error("[resume] repli sur les règles :", erreur);
    return repli;
  }

  await query(
    `INSERT INTO project_summaries
       (project_id, objectif, fait, reste_a_faire, derniere_activite, risque, pourquoi, source_hash)
     VALUES ($1, $2, $3, $4, $5, $6::risque_abandon, $7, $8)
     ON CONFLICT (project_id) DO UPDATE SET
       objectif = EXCLUDED.objectif, fait = EXCLUDED.fait,
       reste_a_faire = EXCLUDED.reste_a_faire,
       derniere_activite = EXCLUDED.derniere_activite,
       risque = EXCLUDED.risque, pourquoi = EXCLUDED.pourquoi,
       source_hash = EXCLUDED.source_hash, genere_le = now()`,
    [
      projectId,
      resume.objectif,
      resume.faitCeQui,
      resume.resteAFaire,
      resume.derniereActivite,
      resume.risqueAbandon,
      resume.pourquoi,
      hash,
    ],
  );

  return resume;
}
