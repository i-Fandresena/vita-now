import type { FragmentRepository } from "@/domain/repository";
import type {
  AuthorSignal,
  Fragment,
  FragmentDraft,
  ResumptionCapsule,
  SearchHit,
} from "@/domain/types";

import { api, type ResultatDistant, type UsageDistant } from "./api";
import { DEMO_CAPSULE } from "./corpus";

/**
 * HttpFragmentRepository — le port de la Mémoire IA, servi par l'API.
 *
 * C'est la promesse du HANDOFF §4 tenue pour de vrai : les trois écrans qui
 * passent par ce port (Fiche, Signal, Dépôt) ne changent pas d'une ligne.
 * Seule l'implémentation change, et elle est choisie dans le provider.
 *
 * Ce que le serveur ne produit pas encore est signalé ici plutôt que masqué —
 * une méthode qui ment sur ce qu'elle sait est plus coûteuse qu'une méthode
 * qui l'avoue.
 */
export class HttpFragmentRepository implements FragmentRepository {
  async search(
    query: string,
    options?: { signal?: AbortSignal },
  ): Promise<SearchHit[]> {
    const { resultats } = await api.rechercher(query, options?.signal);
    return resultats.map(versHit);
  }

  async getById(id: string): Promise<Fragment | null> {
    try {
      const brut = await api.fiche(id);
      return versFragment(brut);
    } catch {
      // 404 comme panne réseau : l'écran a un état « introuvable » et c'est
      // le bon dans les deux cas.
      return null;
    }
  }

  /**
   * La capsule de reprise vient du store (`useSoa().capsule`), qui la dérive du
   * journal. Ce port-ci est modelé sur l'ancien périmètre et n'a pas d'endpoint
   * correspondant ; renvoyer la capsule de démonstration garde l'écran plein
   * plutôt que de le vider — et aucun écran ne dépend de ce chemin depuis que
   * `CapsuleScreen` lit le store.
   */
  async capsuleForCurrentProject(): Promise<ResumptionCapsule | null> {
    return DEMO_CAPSULE;
  }

  async declareUse(fragmentId: string, helpedWith: string): Promise<AuthorSignal> {
    await api.declarerUsage(fragmentId, helpedWith);

    // On relit le dernier usage plutôt que de fabriquer la réponse : c'est le
    // serveur qui horodate, et l'écran de retour affiche cette date.
    const signal = await this.latestSignal(fragmentId);
    if (signal) return signal;

    throw new Error("L'usage a été enregistré mais n'a pas pu être relu.");
  }

  async latestSignal(fragmentId: string): Promise<AuthorSignal | null> {
    try {
      const { usages } = await api.usages(fragmentId);
      const dernier = usages[0];
      if (!dernier) return null;

      const fiche = await this.getById(fragmentId);
      return versSignal(dernier, fragmentId, fiche);
    } catch {
      return null;
    }
  }

  /**
   * Le dépôt d'une fiche n'a pas encore d'endpoint : la table `fiches` existe,
   * la route d'écriture non. Échouer explicitement vaut mieux qu'accepter en
   * silence un dépôt qui n'arriverait nulle part — l'écran affiche l'erreur,
   * l'utilisateur sait que son texte n'est pas parti.
   */
  async deposit(_draft: FragmentDraft): Promise<Fragment> {
    throw new Error(
      "Le dépôt de fiche n'est pas encore servi par l'API. Rien n'a été enregistré.",
    );
  }
}

/* ── Conversions ───────────────────────────────────────────────────────── */

function versHit(r: ResultatDistant): SearchHit {
  return {
    fragment: {
      id: r.id,
      title: r.titre,
      promise: r.promesse,
      origin: {
        work: r.origine.oeuvre,
        kind: r.origine.nature as "mémoire" | "projet",
        year: r.origine.annee,
        field: r.origine.domaine,
        status: r.origine.etat as "terminé" | "arrêté",
      },
      author: {
        id: r.auteur.nom,
        name: r.auteur.nom,
        cohort: r.auteur.promo,
        field: r.origine.domaine,
      },
      reasoning: "",
      choices: [],
      deadEnds: [],
      leads: [],
      signals: [],
    },
    relevance: r.pertinence,
    why: r.pourquoi,
    // `ts_headline` rend les passages trouvés avec les mots entourés de
    // guillemets français. On en extrait les termes pour l'affichage des
    // correspondances, ce qui rend le résultat vérifiable.
    matchedOn: [...r.extraits.matchAll(/«([^»]+)»/g)].map((m) => m[1]!.trim()),
  };
}

function versFragment(b: Record<string, unknown>): Fragment {
  const origine = {
    work: String(b["oeuvre"] ?? ""),
    kind: String(b["nature"] ?? "mémoire") as "mémoire" | "projet",
    year: Number(b["annee"] ?? new Date().getFullYear()),
    field: String(b["domaine"] ?? ""),
    status: String(b["etat"] ?? "terminé") as "terminé" | "arrêté",
  };

  return {
    id: String(b["id"]),
    title: String(b["titre"] ?? ""),
    promise: String(b["promesse"] ?? ""),
    origin: origine,
    author: {
      id: String(b["auteur_nom"] ?? ""),
      name: String(b["auteur_nom"] ?? ""),
      cohort: String(b["auteur_promo"] ?? ""),
      field: origine.field,
    },
    reasoning: String(b["raisonnement"] ?? ""),
    choices: Array.isArray(b["choix"])
      ? (b["choix"] as { decision: string; rationale: string }[])
      : [],
    deadEnds: Array.isArray(b["impasses"]) ? (b["impasses"] as string[]) : [],
    leads: Array.isArray(b["pistes"]) ? (b["pistes"] as string[]) : [],
    excerpt: (b["extrait"] as Fragment["excerpt"]) ?? undefined,
    signals: [],
  };
}

function versSignal(
  u: UsageDistant,
  fragmentId: string,
  fiche: Fragment | null,
): AuthorSignal {
  return {
    id: u.id,
    fragmentId,
    fragmentTitle: fiche?.title ?? "",
    author: fiche?.author ?? { id: "", name: "", cohort: "", field: "" },
    helpedWith: u.a_servi_a,
    helpedAt: u.date,
  };
}
