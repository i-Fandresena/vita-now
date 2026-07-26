import type { FragmentRepository } from "@/domain/repository";
import type {
  AuthorSignal,
  Fragment,
  FragmentDraft,
  ResumptionCapsule,
  SearchHit,
} from "@/domain/types";

import { CLES, charger, enregistrer } from "@/lib/persistence";

import { CURRENT_USER, DEMO_CAPSULE, FRAGMENTS } from "./corpus";

/**
 * Implémentation de démonstration du port `FragmentRepository`.
 *
 * Le classement est lexical et déterministe — la même question donne toujours
 * le même résultat, exigence de SPEC.md « Demo Mode ». En production,
 * cette classe est remplacée par un appel pgvector + Claude ; l'interface ne
 * change pas, donc aucun écran n'est touché.
 */

const STOP_WORDS = new Set([
  "le", "la", "les", "un", "une", "des", "de", "du", "au", "aux", "et", "ou",
  "en", "dans", "sur", "pour", "par", "avec", "sans", "que", "qui", "quoi",
  "comment", "pourquoi", "je", "j", "mon", "ma", "mes", "ne", "pas", "est",
  "sont", "a", "à", "ce", "cette", "il", "elle", "on", "y", "d", "l",
]);

/** Marques diacritiques combinantes, isolées par la décomposition NFD. */
const COMBINING_MARKS = new RegExp("[\\u0300-\\u036f]", "g");

/** Retire accents et casse : « hors-ligne » et « HORS LIGNE » doivent matcher. */
function normalize(value: string): string {
  return value.normalize("NFD").replace(COMBINING_MARKS, "").toLowerCase();
}

function tokenize(query: string): string[] {
  return normalize(query)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

interface Scored {
  fragment: Fragment;
  score: number;
  matched: string[];
}

function score(fragment: Fragment, tokens: string[]): Scored {
  const signals = fragment.signals.map((s) => ({ raw: s, norm: normalize(s) }));
  const haystackTitle = normalize(fragment.title);
  const haystackBody = normalize(`${fragment.reasoning} ${fragment.promise}`);

  const matched = new Set<string>();
  let total = 0;

  for (const token of tokens) {
    const exact = signals.find((s) => s.norm === token);
    if (exact) {
      total += 3;
      matched.add(exact.raw);
      continue;
    }

    // Correspondance partielle : « synchro » doit atteindre « synchronisation ».
    const partial =
      token.length >= 4 &&
      signals.find((s) => s.norm.includes(token) || token.includes(s.norm));
    if (partial) {
      total += 2;
      matched.add(partial.raw);
      continue;
    }

    if (haystackTitle.includes(token)) {
      total += 2;
      matched.add(token);
      continue;
    }

    if (haystackBody.includes(token)) {
      total += 1;
      matched.add(token);
    }
  }

  return { fragment, score: total, matched: [...matched] };
}

/** Latence simulée, annulable. Sous les 2 s exigées par SPEC.md. */
function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Recherche annulée", "AbortError"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Recherche annulée", "AbortError"));
      },
      { once: true },
    );
  });
}

/** Ce que la Mémoire IA conserve d'une session à l'autre. */
interface MemoirePersistee {
  /** Uniquement les dépôts locaux : le corpus livré est reconstruit au chargement. */
  deposes: Fragment[];
  signals: AuthorSignal[];
}

export class InMemoryFragmentRepository implements FragmentRepository {
  private readonly fragments: Fragment[];
  private readonly signals: AuthorSignal[];

  constructor() {
    /* Seuls les dépôts locaux sont relus ; le corpus livré vient toujours du
       code. Persister les cinq mémoires d'origine les figerait dans le
       navigateur : une correction de contenu ne serait jamais reprise, et un
       poste de démonstration afficherait une version périmée sans qu'on
       comprenne pourquoi. */
    const sauvegarde = charger<MemoirePersistee>(CLES.memoire);
    this.fragments = [...(sauvegarde?.deposes ?? []), ...FRAGMENTS];
    this.signals = sauvegarde?.signals ?? [];
  }

  /** Ne sauvegarde que ce qui a été produit localement (cf. constructeur). */
  private sauver(): void {
    const livres = new Set(FRAGMENTS.map((f) => f.id));
    enregistrer<MemoirePersistee>(CLES.memoire, {
      deposes: this.fragments.filter((f) => !livres.has(f.id)),
      signals: this.signals,
    });
  }

  async search(query: string, options?: { signal?: AbortSignal }): Promise<SearchHit[]> {
    await wait(420, options?.signal);

    const tokens = tokenize(query);
    if (tokens.length === 0) return [];

    const scored = this.fragments
      .map((fragment) => score(fragment, tokens))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.fragment.id.localeCompare(b.fragment.id));

    const best = scored[0]?.score ?? 1;

    return scored.map(({ fragment, score: value, matched }) => ({
      fragment,
      // Normalisé sur le meilleur résultat : c'est une correspondance relative,
      // jamais une note absolue qu'on pourrait lire comme un score.
      relevance: Math.min(1, value / best),
      why: fragment.promise,
      matchedOn: matched,
    }));
  }

  async getById(id: string): Promise<Fragment | null> {
    return this.fragments.find((fragment) => fragment.id === id) ?? null;
  }

  async capsuleForCurrentProject(): Promise<ResumptionCapsule | null> {
    return DEMO_CAPSULE;
  }

  async declareUse(fragmentId: string, helpedWith: string): Promise<AuthorSignal> {
    await wait(260);

    const fragment = await this.getById(fragmentId);
    if (!fragment) throw new Error(`Fragment inconnu : ${fragmentId}`);

    const signal: AuthorSignal = {
      id: `s-${fragmentId}-${Date.now().toString(36)}`,
      fragmentId,
      fragmentTitle: fragment.title,
      author: fragment.author,
      helpedWith,
      helpedAt: new Date().toISOString(),
    };

    this.signals.push(signal);
    this.sauver();
    return signal;
  }

  async latestSignal(fragmentId: string): Promise<AuthorSignal | null> {
    const stored = [...this.signals].reverse().find((s) => s.fragmentId === fragmentId);
    if (stored) return stored;

    // Reconstruction : accéder directement à l'URL du signal, ou recharger la
    // page pendant la démonstration, doit donner le même écran.
    const fragment = await this.getById(fragmentId);
    if (!fragment) return null;

    return {
      id: `s-${fragmentId}-reconstruit`,
      fragmentId,
      fragmentTitle: fragment.title,
      author: fragment.author,
      helpedWith: DEMO_CAPSULE.projectTitle,
      helpedAt: new Date().toISOString(),
    };
  }

  async deposit(draft: FragmentDraft): Promise<Fragment> {
    await wait(360);

    const fragment: Fragment = {
      // Horodaté plutôt qu'indexé : un identifiant tiré de `length` se
      // réattribuerait au dépôt suivant une fois l'état relu, et deux
      // fragments distincts partageraient la même URL.
      id: `f-local-${Date.now().toString(36)}`,
      title: draft.title,
      promise: draft.reasoning.slice(0, 160),
      origin: {
        work: draft.work,
        kind: draft.kind,
        year: new Date().getFullYear(),
        field: CURRENT_USER.field,
        status: draft.status,
      },
      author: CURRENT_USER,
      reasoning: draft.reasoning,
      choices: [],
      deadEnds: draft.deadEnds.filter((entry) => entry.trim().length > 0),
      leads: [],
      signals: tokenize(`${draft.title} ${draft.reasoning}`),
    };

    this.fragments.unshift(fragment);
    this.sauver();
    return fragment;
  }
}
