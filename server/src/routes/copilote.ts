import type { FastifyInstance } from "fastify";

import { query, queryOne, transaction } from "../db.js";
import { env } from "../env.js";
import { lireReglages } from "../reglages.js";
import { exigerSession } from "../session.js";

const ROLES = ["pilotage", "technique", "soutenance"] as const;
type RoleCopilote = (typeof ROLES)[number];

const LIMITE_QUOTIDIENNE = 30;
const HISTORIQUE_MODELE = 12;

interface LigneMessage {
  id: string;
  role: RoleCopilote;
  author: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  role: RoleCopilote;
  title: string;
  preview: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ConversationCourte {
  id: string;
  role: RoleCopilote;
  title: string;
}

function roleValide(value: unknown): value is RoleCopilote {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

function titrePour(message: string): string {
  const titre = message.replace(/\s+/g, " ").trim();
  return titre.length > 80 ? `${titre.slice(0, 77).trimEnd()}…` : titre;
}

function consignePour(role: RoleCopilote): string {
  const mission = {
    pilotage:
      "Tu aides à prioriser, découper une prochaine action concrète, repérer les dépendances et préparer un plan réaliste.",
    technique:
      "Tu aides à diagnostiquer une difficulté technique, à formuler des hypothèses vérifiables et à proposer une démarche de résolution.",
    soutenance:
      "Tu aides à préparer une démonstration, un pitch, des réponses aux questions du jury et les preuves à montrer.",
  }[role];

  return [
    "Tu es le Copilote IA de VITA'NOW, une plateforme de projets étudiants de l'ENI Fianarantsoa.",
    mission,
    "RÈGLE STRICTE DE PÉDAGOGIE ET CADRE PROFESSIONNEL : Tu réponds EXCLUSIVEMENT aux sujets d'apprentissage académique, d'informatique, de génie logiciel, de préparation de soutenance, d'organisation de projets et du milieu professionnel. Si l'utilisateur pose une question hors de ce cadre (cuisine, divertissement, bavardage, recettes, jeux hors-sujet, etc.), tu dois impérativement et poliment REFUSER de répondre en rappelant que tes échanges sont strictement réservés à l'accompagnement pédagogique et aux projets professionnels de l'étudiant.",
    "Réponds toujours en français, avec une réponse directe, structurée et utilisable immédiatement.",
    "Privilégie une prochaine action claire ; limite-toi à six points si une liste est utile.",
    "Ne prétends jamais avoir vu des fichiers, exécuté une commande, envoyé un message ou modifié un projet.",
    "Le contexte projet est fourni à titre indicatif : s'il manque une information, pose une question courte au lieu de l'inventer.",
    "Ne demande ni n'affiche de clé API, mot de passe, cookie ou donnée personnelle sensible.",
    "Évite le ton moralisateur et les encouragements génériques ; reste précis et factuel.",
  ].join("\n");
}

async function reserverUnTour(studentId: string): Promise<boolean> {
  const lignes = await query<{ compte: number }>(
    `INSERT INTO copilot_usage (student_id, jour, compte)
     VALUES ($1, current_date, 1)
     ON CONFLICT (student_id, jour) DO UPDATE
       SET compte = copilot_usage.compte + 1
       WHERE copilot_usage.compte < $2
     RETURNING compte`,
    [studentId, LIMITE_QUOTIDIENNE],
  );
  return lignes[0] !== undefined;
}

async function contexteProjet(studentId: string): Promise<string> {
  const projets = await query<{
    nom: string;
    objectif: string;
    statut: string;
    technos: string[];
    derniereActivite: string;
  }>(
    `SELECT nom, objectif, statut, technos, derniere_activite AS "derniereActivite"
     FROM projects
     WHERE owner_id = $1
     ORDER BY derniere_activite DESC
     LIMIT 6`,
    [studentId],
  );

  if (projets.length === 0) return "Aucun projet n'a encore été créé.";

  return projets
    .map(
      (projet) =>
        `- ${projet.nom} · ${projet.statut}\n  Objectif : ${projet.objectif || "non précisé"}\n  Technologies : ${projet.technos.join(", ") || "non précisées"}\n  Dernière activité : ${projet.derniereActivite}`,
    )
    .join("\n");
}

function reponseRepliPedagogique(
  role: RoleCopilote,
  message: string,
  contexte: string,
): string {
  if (role === "technique") {
    return [
      `Voici une démarche recommandée pour aborder ce point sur vos projets :\n`,
      `1. **Diagnostic de la difficulté** : Isoler l'erreur exacte ou le composant bloquant dans votre code.`,
      `2. **Vérification du contexte** : ${contexte.includes("Aucun") ? "Pensez à créer et renseigner les détails de votre projet." : "Vérifiez la configuration et la cohérence avec les technologies de vos projets actuels."}`,
      `3. **Plan d'action conseillé** : Découpez la résolution en sous-étapes testables isolément, puis documentez votre solution dans le journal de projet.`,
    ].join("\n");
  }

  if (role === "soutenance") {
    return [
      `Pour préparer votre présentation concernant : "${message.slice(0, 60)}" :\n`,
      `1. **Clarté du pitch** : Présentez le problème réel résolu avant de montrer la solution technique.`,
      `2. **Démonstration en direct** : Mettez en avant les fonctionnalités clés et l'architecture mise en place.`,
      `3. **Anticipation des questions** : Préparez les réponses sur vos choix d'ingénierie et la gestion des risques du projet.`,
    ].join("\n");
  }

  return [
    `Pour organiser la suite de votre travail :\n`,
    `1. **Priorité immédiate** : Concentrez-vous sur la prochaine tâche Kanban ayant le plus fort impact.`,
    `2. **Rythme & Journal** : Consignez les décisions d'architecture et les blocages résolus au fil de l'eau.`,
    `3. **Étape suivante** : Découpez votre objectif principal en sous-tâches estimées à moins de 4 heures chacune.`,
  ].join("\n");
}

async function reponseGemini(
  role: RoleCopilote,
  message: string,
  historique: LigneMessage[],
  contexte: string,
): Promise<string> {
  if (!env.geminiKey) throw new Error("Gemini non configuré");

  const contents = historique.map((item) => ({
    role: item.author === "assistant" ? "model" : "user",
    parts: [{ text: item.content }],
  }));
  contents.push({ role: "user", parts: [{ text: message }] });

  const reponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${env.geminiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: `${consignePour(role)}\n\nContexte des projets de l'étudiant :\n${contexte}` }],
        },
        contents,
        generationConfig: {
          maxOutputTokens: 800,
        },
      }),
      signal: AbortSignal.timeout(15_000),
    },
  );

  if (!reponse.ok) throw new Error(`Gemini : ${reponse.status}`);

  const charge = (await reponse.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const texte = charge.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!texte) throw new Error("Gemini a répondu sans texte exploitable");
  return texte.slice(0, 4000);
}

export async function routesCopilote(app: FastifyInstance): Promise<void> {
  app.get("/api/copilote/conversations", async (requete, reponse) => {
    const moi = await exigerSession(requete, reponse);
    if (!moi) return;

    const conversations = await query<Conversation>(
      `SELECT conversation.id, conversation.role, conversation.title,
              dernier.content AS preview,
              count(message.id)::int AS "messageCount",
              conversation.created_at AS "createdAt",
              conversation.updated_at AS "updatedAt"
       FROM copilot_conversations AS conversation
       LEFT JOIN copilot_messages AS message ON message.conversation_id = conversation.id
       LEFT JOIN LATERAL (
         SELECT content FROM copilot_messages
         WHERE conversation_id = conversation.id
         ORDER BY created_at DESC
         LIMIT 1
       ) AS dernier ON true
       WHERE conversation.student_id = $1
       GROUP BY conversation.id, dernier.content
       HAVING count(message.id) > 0
       ORDER BY conversation.updated_at DESC
       LIMIT 20`,
      [moi],
    );
    return { conversations };
  });

  app.get<{ Params: { id: string } }>("/api/copilote/conversations/:id/messages", async (requete, reponse) => {
    const moi = await exigerSession(requete, reponse);
    if (!moi) return;

    const conversation = await queryOne<ConversationCourte>(
      `SELECT id, role, title
       FROM copilot_conversations
       WHERE id = $1 AND student_id = $2`,
      [requete.params.id, moi],
    );
    if (!conversation) return reponse.code(404).send({ erreur: "Discussion introuvable." });

    const messages = await query<LigneMessage>(
      `SELECT id, role, author, content, created_at AS "createdAt"
       FROM copilot_messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [conversation.id],
    );
    return { conversation, messages };
  });

  app.get<{ Querystring: { role?: string } }>("/api/copilote/messages", async (requete, reponse) => {
    const moi = await exigerSession(requete, reponse);
    if (!moi) return;

    const role = requete.query.role;
    if (!roleValide(role)) {
      return reponse.code(400).send({ erreur: "Rôle du Copilote invalide." });
    }

    const messages = await query<LigneMessage>(
      `SELECT id, role, author, content, created_at AS "createdAt"
       FROM (
         SELECT id, role, author, content, created_at
         FROM copilot_messages
         WHERE student_id = $1 AND role = $2
         ORDER BY created_at DESC
         LIMIT 50
       ) conversation
       ORDER BY created_at ASC`,
      [moi, role],
    );
    return { messages };
  });

  app.post<{ Body: { role?: string; message?: string; conversationId?: string } }>(
    "/api/copilote/messages",
    async (requete, reponse) => {
      const moi = await exigerSession(requete, reponse);
      if (!moi) return;

      /* Coupure décidée depuis le centre d'administration. Seule l'écriture est
         bloquée : la lecture des conversations reste ouverte, sinon couper le
         Copilote effacerait de la vue tout ce qu'un étudiant y a déjà consigné.
         La maintenance générale, elle, est traitée en amont par le garde de
         `server.ts` — inutile de la revérifier ici. */
      if (!(await lireReglages()).copiloteActif) {
        return reponse
          .code(503)
          .send({ erreur: "Le Copilote IA est momentanément désactivé." });
      }

      const role = requete.body?.role;
      const message = requete.body?.message?.trim();
      const conversationId = requete.body?.conversationId;
      if (!roleValide(role)) {
        return reponse.code(400).send({ erreur: "Rôle du Copilote invalide." });
      }
      if (!message) return reponse.code(400).send({ erreur: "Écrivez un message pour le Copilote." });
      if (message.length > 4000) {
        return reponse.code(400).send({ erreur: "Le message ne peut pas dépasser 4 000 caractères." });
      }

      let conversation: ConversationCourte | null = null;
      if (conversationId) {
        conversation = await queryOne<ConversationCourte>(
          `SELECT id, role, title FROM copilot_conversations
           WHERE id = $1 AND student_id = $2`,
          [conversationId, moi],
        );
        if (!conversation) return reponse.code(404).send({ erreur: "Discussion introuvable." });
        if (conversation.role !== role) {
          return reponse.code(400).send({ erreur: "Le rôle ne correspond pas à cette discussion." });
        }
      }
      if (!(await reserverUnTour(moi))) {
        return reponse.code(429).send({ erreur: "La limite quotidienne du Copilote est atteinte. Réessayez demain." });
      }

      const [historique, contexte] = await Promise.all([
        query<LigneMessage>(
          `SELECT id, role, author, content, created_at AS "createdAt"
           FROM (
             SELECT id, role, author, content, created_at
             FROM copilot_messages
             WHERE conversation_id = $1
             ORDER BY created_at DESC
             LIMIT $2
           ) conversation
           ORDER BY "createdAt" ASC`,
          [conversation?.id ?? "00000000-0000-0000-0000-000000000000", HISTORIQUE_MODELE],
        ),
        contexteProjet(moi),
      ]);

      let texte: string;
      try {
        texte = await reponseGemini(role, message, historique, contexte);
      } catch (erreur) {
        requete.log.error(erreur, "Copilote Gemini indisponible — repli sur guidage pédagogique");
        texte = reponseRepliPedagogique(role, message, contexte);
      }

      const resultat = await transaction(async (client) => {
        let fil = conversation;
        if (!fil) {
          const cree = await client.query<ConversationCourte>(
            `INSERT INTO copilot_conversations (student_id, role, title)
             VALUES ($1, $2, $3)
             RETURNING id, role, title`,
            [moi, role, titrePour(message)],
          );
          fil = cree.rows[0]!;
        }
        await client.query(
          `INSERT INTO copilot_messages (student_id, role, conversation_id, author, content)
           VALUES ($1, $2, $3, 'user', $4)`,
          [moi, role, fil.id, message],
        );
        const assistant = await client.query<LigneMessage>(
          `INSERT INTO copilot_messages (student_id, role, conversation_id, author, content)
           VALUES ($1, $2, $3, 'assistant', $4)
           RETURNING id, role, author, content, created_at AS "createdAt"`,
          [moi, role, fil.id, texte],
        );
        await client.query(
          "UPDATE copilot_conversations SET updated_at = now() WHERE id = $1",
          [fil.id],
        );
        /* Une conversation est une unité d'historique, pas chaque message.
           On conserve les 20 fils les plus récents de l'étudiant et les
           messages des fils retirés suivent la cascade SQL. */
        await client.query(
          `DELETE FROM copilot_conversations
           WHERE id IN (
             SELECT id FROM (
               SELECT id FROM copilot_conversations
               WHERE student_id = $1
               ORDER BY updated_at DESC, created_at DESC
               OFFSET 20
             ) anciens
           )`,
          [moi],
        );
        return { assistant: assistant.rows[0]!, conversation: fil };
      });
      return resultat;
    },
  );

  app.delete<{ Querystring: { role?: string } }>("/api/copilote/messages", async (requete, reponse) => {
    const moi = await exigerSession(requete, reponse);
    if (!moi) return;

    const role = requete.query.role;
    if (!roleValide(role)) {
      return reponse.code(400).send({ erreur: "Rôle du Copilote invalide." });
    }
    await query("DELETE FROM copilot_messages WHERE student_id = $1 AND role = $2", [moi, role]);
    await query("DELETE FROM copilot_conversations WHERE student_id = $1 AND role = $2", [moi, role]);
    return { ok: true };
  });
}
