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
 * **Trois chemins, et le dernier n'est pas un pis-aller.** Sans clé API, le
 * résumé est déduit du journal par des règles explicites. C'est moins riche,
 * mais c'est vérifiable et gratuit — et surtout, cela garantit que l'écran ne
 * dépend pas d'un service tiers le jour d'une démonstration. Les clés
 * améliorent la formulation ; elles ne conditionnent pas le produit. Gemini
 * est tenté avant Claude (voir `env.geminiKey`) ; si l'un échoue ou que le
 * quotidien par étudiant est atteint (`ai_usage`), on retombe sur l'autre puis
 * sur les règles — jamais d'échec visible à l'écran.
 *
 * Le résultat est mis en cache avec l'empreinte du journal **et de la
 * checklist** dont il dérive : on ne rappelle le modèle que si l'un des deux a
 * réellement changé. Un projet consulté dix fois dans l'après-midi coûte un
 * appel, pas dix.
 */

interface EntreeJournal {
  nature: string;
  titre: string;
  corps: string;
  date: string;
  jalon: string | null;
}

interface EtapeChecklist {
  id: string;
  libelle: string;
  fait: boolean;
  parentId: string | null;
}

export interface Resume {
  projectId: string;
  objectif: string;
  faitCeQui: string[];
  enCours: string[];
  resteAFaire: string[];
  derniereActivite: string;
  risqueAbandon: "Faible" | "Modéré" | "Élevé";
  pourquoi: string;
  /** D'où vient ce résumé — l'écran peut le dire, et il le doit. */
  source: "gemini" | "claude" | "journal";
}

type Projet = {
  id: string;
  nom: string;
  objectif: string;
  statut: string;
  derniere_activite: string;
};

/** Empreinte du journal + de la checklist : change si l'un ou l'autre bouge. */
function empreinte(entrees: EntreeJournal[], checklist: EtapeChecklist[]): string {
  const h = createHash("sha256");
  for (const e of entrees) h.update(`${e.date}|${e.titre}|${e.corps}`);
  for (const e of checklist) h.update(`|c|${e.fait ? 1 : 0}|${e.libelle}`);
  return h.digest("hex").slice(0, 32);
}

/**
 * Tâches "en cours" : une tâche de premier niveau non cochée dont au moins
 * une sous-tâche est cochée. Ni « fait » (elle-même ne l'est pas), ni « reste
 * à faire » (il s'y passe déjà quelque chose) — un troisième état, distinct
 * des deux autres.
 */
function enCoursDe(checklist: EtapeChecklist[]): string[] {
  return checklist
    .filter(
      (tache) =>
        !tache.parentId &&
        !tache.fait &&
        checklist.some((sous) => sous.parentId === tache.id && sous.fait),
    )
    .map((tache) => tache.libelle);
}

const JOUR = 86_400_000;

/** Nombre maximal d'appels modèle réels (Gemini ou Claude) par étudiant et par jour. */
const QUOTA_QUOTIDIEN = 20;

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
  projet: Projet,
  entrees: EntreeJournal[],
  checklist: EtapeChecklist[],
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
    enCours: enCoursDe(checklist),
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
 * Texte système commun aux deux providers : les règles de sortie, plus l'état
 * de la checklist et son garde-fou anti-hallucination.
 *
 * Sans la dernière phrase, un modèle a tendance à broder des sous-étapes qui
 * n'existent dans aucune des deux sources (journal, checklist).
 */
function promptSysteme(checklist: EtapeChecklist[]): string {
  const principales = checklist.filter((e) => !e.parentId);
  const etapes =
    principales.length > 0
      ? principales
          .map((tache) => {
            const sousTaches = checklist
              .filter((e) => e.parentId === tache.id)
              .map((s) => `  [${s.fait ? "x" : " "}] ${s.libelle}`)
              .join("\n");
            return `[${tache.fait ? "x" : " "}] ${tache.libelle}${sousTaches ? "\n" + sousTaches : ""}`;
          })
          .join("\n")
      : "Aucune étape définie.";

  return (
    "Tu résumes le journal de bord d'un projet étudiant, en français. " +
    "Réponds UNIQUEMENT par un objet JSON valide, sans texte autour. " +
    "Champs : objectif (string), faitCeQui (string[]), enCours (string[]), " +
    "resteAFaire (string[]), pourquoi (string). " +
    "Règles absolues : jamais de code source ; jamais de reproche ni " +
    "d'encouragement (« bravo », « courage », « tu peux le faire ») ; " +
    "chaque élément fait une phrase courte et factuelle, tirée du journal " +
    "et de rien d'autre. `pourquoi` explique en une phrase où en est " +
    "réellement le projet.\n\n" +
    'Un plan d\'étapes a été défini par l\'étudiant à la création du projet (la "checklist"), ' +
    "avec parfois des sous-tâches indentées sous une tâche principale. " +
    `Voici son état actuel :\n${etapes}\n\n` +
    "Un item coché ([x]) n'est une preuve d'avancement que s'il est corroboré par le journal " +
    "ci-dessous. Un item non coché ([ ]) qui apparaît pourtant décrit dans le journal doit " +
    "apparaître dans faitCeQui, pas dans resteAFaire. " +
    "Une tâche principale non cochée dont au moins une sous-tâche est cochée va dans enCours, " +
    "jamais dans resteAFaire ni faitCeQui — elle a commencé, elle n'est pas finie. " +
    "N'invente aucune étape absente de la checklist et du journal."
  );
}

function texteJournal(entrees: EntreeJournal[]): string {
  return entrees
    .slice(0, 30)
    .map((e) => `[${e.nature}] ${e.titre}\n${e.corps}`)
    .join("\n\n");
}

/** Fusionne la sortie du modèle avec le repli — identique pour tous les providers. */
function fusionner(analyse: Partial<Resume>, repli: Resume, source: Resume["source"]): Resume {
  return {
    ...repli,
    objectif: analyse.objectif || repli.objectif,
    faitCeQui:
      Array.isArray(analyse.faitCeQui) && analyse.faitCeQui.length > 0
        ? analyse.faitCeQui
        : repli.faitCeQui,
    enCours:
      Array.isArray(analyse.enCours) && analyse.enCours.length > 0
        ? analyse.enCours
        : repli.enCours,
    resteAFaire:
      Array.isArray(analyse.resteAFaire) && analyse.resteAFaire.length > 0
        ? analyse.resteAFaire
        : repli.resteAFaire,
    // Le risque reste calculé côté serveur : c'est un fait de calendrier, pas
    // une appréciation, et aucun modèle n'a de moyen de le connaître mieux.
    pourquoi: analyse.pourquoi || repli.pourquoi,
    source,
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
  projet: Projet,
  entrees: EntreeJournal[],
  checklist: EtapeChecklist[],
  repli: Resume,
): Promise<Resume> {
  const corps = {
    model: "claude-sonnet-5",
    max_tokens: 1024,
    system: promptSysteme(checklist),
    messages: [
      {
        role: "user",
        content: `Projet : ${projet.nom}\nObjectif déclaré : ${projet.objectif}\nStatut : ${projet.statut}\n\nJournal :\n${texteJournal(entrees)}`,
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
  return fusionner(analyse, repli, "claude");
}

/**
 * Le résumé par l'API Gemini.
 *
 * `gemini-2.0-flash` a un quota gratuit à 0 sur la clé fournie (429
 * systématique, vérifié) : `gemini-flash-latest` est le modèle qui fonctionne
 * réellement à ce jour. `thinkingConfig.thinkingBudget: 0` est rejeté (400) ;
 * un budget bas (512) réduit fortement le coût en tokens de réflexion interne
 * par rapport à l'absence de configuration (observé : ~230 tokens de pensée
 * sur un prompt trivial sans cette limite), ce qui sert directement l'objectif
 * d'un usage modéré du plan gratuit.
 */
async function parGemini(
  projet: Projet,
  entrees: EntreeJournal[],
  checklist: EtapeChecklist[],
  repli: Resume,
): Promise<Resume> {
  const corps = {
    systemInstruction: { parts: [{ text: promptSysteme(checklist) }] },
    contents: [
      {
        parts: [
          {
            text: `Projet : ${projet.nom}\nObjectif déclaré : ${projet.objectif}\nStatut : ${projet.statut}\n\nJournal :\n${texteJournal(entrees)}`,
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 512 },
    },
  };

  const reponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${env.geminiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(corps),
      signal: AbortSignal.timeout(12_000),
    },
  );

  if (!reponse.ok) throw new Error(`API Gemini : ${reponse.status}`);

  const charge = (await reponse.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const texte = charge.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!texte) throw new Error("Réponse Gemini sans contenu exploitable");

  // `responseMimeType: application/json` garantit un JSON valide, sans fence
  // Markdown à retirer — contrairement à Claude ci-dessus.
  const analyse = JSON.parse(texte) as Partial<Resume>;
  return fusionner(analyse, repli, "gemini");
}

/**
 * Comptabilise une tentative d'appel modèle pour cet étudiant aujourd'hui, et
 * dit si elle reste sous le quota.
 *
 * Incrémente **avant** l'appel réseau, pas après un succès : sinon une clé
 * cassée (401/429...) ne consommerait jamais le quota, et le serveur taperait
 * indéfiniment sur un endpoint qui échoue systématiquement à chaque
 * consultation de l'écran projet.
 *
 * En base plutôt qu'en mémoire : le service redémarre plusieurs fois par jour
 * en développement (édition + build + `systemctl restart`), un compteur en
 * mémoire remis à zéro à chaque redémarrage ne protégerait plus rien.
 */
async function tentativeAutorisee(studentId: string): Promise<boolean> {
  const ligne = await queryOne<{ compte: number }>(
    `INSERT INTO ai_usage (student_id, jour, compte) VALUES ($1, current_date, 1)
     ON CONFLICT (student_id, jour) DO UPDATE SET compte = ai_usage.compte + 1
     RETURNING compte`,
    [studentId],
  );
  return (ligne?.compte ?? 0) <= QUOTA_QUOTIDIEN;
}

export async function resumeDe(
  projectId: string,
  studentId: string | null,
  checklist: EtapeChecklist[] = [],
): Promise<Resume | null> {
  const projet = await queryOne<Projet>(
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

  const repli = parRegles(projet, entrees, checklist);
  const hash = empreinte(entrees, checklist);

  // Cache : ni le journal ni la checklist n'ont bougé, le résumé non plus.
  const enCache = await queryOne<{
    objectif: string;
    fait: string[];
    en_cours: string[];
    reste_a_faire: string[];
    risque: Resume["risqueAbandon"];
    pourquoi: string;
    provider: Resume["source"];
  }>(
    `SELECT objectif, fait, en_cours, reste_a_faire, risque, pourquoi, provider
     FROM project_summaries WHERE project_id = $1 AND source_hash = $2`,
    [projectId, hash],
  );

  if (enCache) {
    return {
      ...repli,
      objectif: enCache.objectif,
      faitCeQui: enCache.fait,
      enCours: enCache.en_cours,
      resteAFaire: enCache.reste_a_faire,
      risqueAbandon: enCache.risque,
      pourquoi: enCache.pourquoi,
      source: enCache.provider,
    };
  }

  // Rien à résumer, ou personne à qui imputer un appel modèle (consultation
  // anonyme d'un projet public) : le repli suffit, on n'appelle aucun modèle.
  if ((entrees.length === 0 && checklist.length === 0) || !studentId) return repli;

  const sousQuota = await tentativeAutorisee(studentId);

  let resume: Resume | null = null;
  if (sousQuota && env.geminiKey) {
    try {
      resume = await parGemini(projet, entrees, checklist, repli);
    } catch (erreur) {
      console.error("[resume] Gemini indisponible :", erreur);
    }
  }
  if (!resume && sousQuota && env.anthropicKey) {
    try {
      resume = await parClaude(projet, entrees, checklist, repli);
    } catch (erreur) {
      console.error("[resume] Claude indisponible :", erreur);
    }
  }
  // Une panne ou un quota atteint ne doit jamais vider l'écran : le repli par
  // règles est toujours disponible, et il dit la même chose en moins bien.
  if (!resume) return repli;

  await query(
    `INSERT INTO project_summaries
       (project_id, objectif, fait, en_cours, reste_a_faire, derniere_activite, risque, pourquoi, source_hash, provider)
     VALUES ($1, $2, $3, $4, $5, $6, $7::risque_abandon, $8, $9, $10)
     ON CONFLICT (project_id) DO UPDATE SET
       objectif = EXCLUDED.objectif, fait = EXCLUDED.fait, en_cours = EXCLUDED.en_cours,
       reste_a_faire = EXCLUDED.reste_a_faire,
       derniere_activite = EXCLUDED.derniere_activite,
       risque = EXCLUDED.risque, pourquoi = EXCLUDED.pourquoi,
       source_hash = EXCLUDED.source_hash, provider = EXCLUDED.provider, genere_le = now()`,
    [
      projectId,
      resume.objectif,
      resume.faitCeQui,
      resume.enCours,
      resume.resteAFaire,
      resume.derniereActivite,
      resume.risqueAbandon,
      resume.pourquoi,
      hash,
      resume.source,
    ],
  );

  return resume;
}
