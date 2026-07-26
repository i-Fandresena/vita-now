import { API_ACTIVE, ErreurApi } from "@/data/api";

/**
 * sync.ts — le pont entre un store synchrone et un serveur qui ne l'est pas.
 *
 * **Le problème.** Les ~25 mutations du store sont synchrones : `createProject`
 * rend un `Project` immédiatement, et l'écran navigue vers lui dans la foulée.
 * Les rendre `async` obligerait à modifier les neuf écrans qui les appellent,
 * chacun avec son état d'attente et son chemin d'échec — une refonte à haut
 * risque, pour un gain que l'utilisateur ne verrait pas.
 *
 * **Le choix.** L'écriture locale reste immédiate ; l'appel au serveur part
 * derrière. C'est le motif « optimiste » des applications qui fonctionnent
 * hors ligne, et il convient ici pour une raison précise : ces écritures ne
 * peuvent pas être refusées pour une raison métier que l'utilisateur ignorerait.
 * Le serveur revalide (appartenance, format), mais un cas légitime côté client
 * est un cas légitime côté serveur.
 *
 * **Ce que ça implique, et qu'il faut assumer.** Si le réseau tombe, l'écran
 * montre un état que le serveur n'a pas. On ne le masque pas : `onEchec`
 * remonte l'erreur, et le rechargement suivant repart de la vérité du serveur.
 * C'est un compromis, pas une victoire — il est acceptable parce que la
 * perte tient à une action, jamais à un corpus entier.
 *
 * Les identifiants sont générés **par le client** et transmis au serveur
 * (`idPropose` côté API). Sans cela, l'écran naviguerait vers un identifiant
 * local que le serveur n'a jamais vu, et un rechargement donnerait un écran
 * vide.
 */

type Ecouteur = (message: string) => void;
const ecouteurs = new Set<Ecouteur>();

/** S'abonner aux échecs d'écriture distante. Rend la fonction de désabonnement. */
export function surEchecSync(ecouteur: Ecouteur): () => void {
  ecouteurs.add(ecouteur);
  return () => ecouteurs.delete(ecouteur);
}

function signaler(message: string): void {
  for (const ecouteur of ecouteurs) ecouteur(message);
}

/**
 * Lance une écriture distante sans bloquer l'appelant.
 *
 * Sans API active, ne fait rien : le mode démonstration reste intégralement
 * fonctionnel, et c'est ce qui permet de montrer le produit même serveur
 * éteint.
 */
export function pousser(travail: () => Promise<unknown>, quoi: string): void {
  if (!API_ACTIVE) return;

  void travail().catch((erreur: unknown) => {
    const detail =
      erreur instanceof ErreurApi
        ? erreur.message
        : erreur instanceof Error
          ? erreur.message
          : "réseau indisponible";

    // Journalisé en plus d'être signalé : le message à l'écran est court par
    // nécessité, la console garde la trace complète pour qui débogue.
    console.error(`[sync] ${quoi} : ${detail}`, erreur);
    signaler(`« ${quoi} » n'a pas pu être enregistré — ${detail}`);
  });
}

/**
 * Un identifiant utilisable comme clé primaire côté serveur.
 *
 * `crypto.randomUUID` n'existe pas sur les navigateurs anciens ni hors
 * contexte sécurisé (http en IP nue, ce qui arrive en démonstration sur un
 * réseau local). Le repli produit un UUID v4 de même forme à partir de
 * `getRandomValues`, et à défaut de `Math.random` — moins solide, mais une
 * collision sur quelques dizaines d'objets reste hors de portée, et un écran
 * qui ne s'affiche pas serait pire.
 */
export function nouvelUuid(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();

  const octets = new Uint8Array(16);
  if (c?.getRandomValues) {
    c.getRandomValues(octets);
  } else {
    for (let i = 0; i < 16; i++) octets[i] = Math.floor(Math.random() * 256);
  }

  // Version 4, variante RFC 4122 — le serveur valide ce format.
  octets[6] = (octets[6]! & 0x0f) | 0x40;
  octets[8] = (octets[8]! & 0x3f) | 0x80;

  const hex = [...octets].map((o) => o.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
