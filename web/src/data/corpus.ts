import type { Author, Fragment, ResumptionCapsule } from "@/domain/types";

/**
 * corpus.ts — le corpus de démonstration.
 *
 * SPEC.md « Demo Mode » : données préchargées, réponses déterministes,
 * aucun écran vide. Ce fichier remplace temporairement l'index pgvector.
 *
 * Le contenu n'est pas du remplissage. Chaque fragment porte un raisonnement
 * réel et des impasses réelles, parce que la démonstration ne tient que si le
 * jury peut lire le texte et le trouver crédible. En particulier, le blocage
 * de la capsule de reprise (§ bas de fichier) est exactement ce que le premier
 * fragment a résolu trois ans plus tôt — c'est tout le propos du produit.
 */

const AUTHORS = {
  hery: {
    id: "a-hery",
    name: "Hery Rakotomalala",
    cohort: "2022",
    field: "Génie logiciel",
  },
  mirana: {
    id: "a-mirana",
    name: "Mirana Andrianina",
    cohort: "2023",
    field: "Vision par ordinateur",
  },
  tiana: {
    id: "a-tiana",
    name: "Tiana Ravelojaona",
    cohort: "2021",
    field: "Traitement automatique des langues",
  },
  naina: {
    id: "a-naina",
    name: "Naina Rasoanaivo",
    cohort: "2023",
    field: "Systèmes répartis",
  },
  fanja: {
    id: "a-fanja",
    name: "Fanjaniaina Rakoto",
    cohort: "2024",
    field: "Génie logiciel",
  },
} as const satisfies Record<string, Author>;

export const CURRENT_USER: Author = {
  id: "a-soa",
  name: "Soa",
  cohort: "2026",
  field: "Génie logiciel",
};

export const FRAGMENTS: Fragment[] = [
  {
    id: "f-sync-conflits",
    title: "Résoudre les conflits de synchronisation sans horloge fiable",
    promise:
      "Décrit comment décider quelle version l'emporte quand on ne peut faire " +
      "confiance ni à l'horloge des appareils, ni à l'ordre d'arrivée.",
    origin: {
      work: "Collecte de données agricoles hors-ligne dans le Haut-Matsiatra",
      kind: "mémoire",
      year: 2022,
      field: "Génie logiciel",
      status: "terminé",
    },
    author: AUTHORS.hery,
    reasoning:
      "Le problème n'était pas la synchronisation, mais la confiance dans le temps. " +
      "Les terminaux des agents restaient trois à cinq jours sans réseau, et leurs " +
      "horloges dérivaient — jusqu'à quarante minutes d'écart entre deux appareils " +
      "d'une même équipe. Toute stratégie fondée sur « le plus récent gagne » " +
      "attribuait donc la victoire à l'appareil le plus en retard.\n\n" +
      "Le déclic a été d'arrêter de chercher quel enregistrement était le plus " +
      "récent, et de commencer à décrire ce que chaque appareil savait au moment " +
      "de l'écriture. À partir de là, un conflit cesse d'être une anomalie à " +
      "trancher automatiquement : c'est une information — deux personnes ont " +
      "observé la même parcelle et ne sont pas d'accord. Le système n'a pas à " +
      "choisir à leur place, il doit rendre le désaccord visible.",
    choices: [
      {
        decision: "Vecteurs de version par champ, pas par enregistrement",
        rationale:
          "Deux agents modifient rarement la même colonne. Au niveau de " +
          "l'enregistrement, 60 % des écritures entraient en conflit ; au niveau du " +
          "champ, moins de 2 %.",
      },
      {
        decision: "Journal d'opérations en ajout seul sur le terminal",
        rationale:
          "Permet de rejouer une synchronisation ratée sans perdre la saisie. " +
          "L'agent ne recommence jamais sa journée.",
      },
    ],
    deadEnds: [
      "Trois semaines sur une implémentation complète de CRDT (LWW-Element-Set). Surdimensionné pour le besoin réel, et impossible à expliquer à l'encadrant.",
      "Horodatage posé par le serveur à la réception : casse la causalité. Un relevé saisi le matin arrivait après celui du soir si le réseau revenait dans le mauvais ordre.",
      "Résolution automatique silencieuse : les agents ont cessé de faire confiance à l'application dès qu'ils ont vu une valeur changer sans explication.",
    ],
    leads: [
      "Un identifiant d'appareil plus un compteur monotone local suffisent, si l'on accepte une résolution manuelle sur les cas restants.",
      "Montrer les deux versions côte à côte plutôt que fusionner : la décision revient à celui qui était sur le terrain.",
    ],
    excerpt: {
      caption: "La signature qui a débloqué le reste — l'implémentation est venue après.",
      language: "typescript",
      code: "type Resolution<T> =\n  | { kind: 'accepté'; value: T }\n  | { kind: 'désaccord'; local: T; remote: T }\n\nfunction resolve<T>(\n  local: Versioned<T>,\n  remote: Versioned<T>,\n): Resolution<T>",
    },
    signals: [
      "synchronisation",
      "sync",
      "hors-ligne",
      "offline",
      "conflit",
      "conflits",
      "fusion",
      "merge",
      "crdt",
      "horloge",
      "réplication",
      "terrain",
      "mobile",
      "version",
      "causalité",
      "concurrence",
    ],
  },
  {
    id: "f-ocr-lumiere",
    title: "Pourquoi notre lecture de plaques échouait tous les jours à 14 h",
    promise:
      "Montre comment distinguer une défaillance du modèle d'une défaillance de " +
      "l'acquisition, avant d'y passer deux mois.",
    origin: {
      work: "Lecture automatique des plaques à l'entrée du campus",
      kind: "projet",
      year: 2023,
      field: "Vision par ordinateur",
      status: "arrêté",
    },
    author: AUTHORS.mirana,
    reasoning:
      "Le taux de reconnaissance passait de 94 % le matin à 41 % en début " +
      "d'après-midi. Nous avons cherché pendant deux mois dans le modèle — " +
      "architecture, augmentation de données, régularisation. Rien n'a bougé.\n\n" +
      "Le problème était dans la caméra. À l'heure où le soleil est au zénith, la " +
      "plaque réfléchit assez pour saturer le capteur, et l'exposition automatique " +
      "compensait sur le reste de la scène. Aucune quantité de données " +
      "d'entraînement ne récupère une information que le capteur n'a pas " +
      "enregistrée.\n\n" +
      "La leçon qui vaut au-delà de ce projet : avant d'accuser le modèle, " +
      "regarder une image d'entrée du cas qui échoue. Nous ne l'avions jamais fait.",
    choices: [
      {
        decision: "Exposition verrouillée en dur plutôt que corrigée après coup",
        rationale:
          "Un capteur saturé ne contient plus l'information. Le post-traitement " +
          "ne peut qu'inventer.",
      },
    ],
    deadEnds: [
      "Deux mois d'augmentation de données synthétiques (rotation, bruit, contraste) sur un problème qui n'était pas dans le modèle.",
      "Changement d'architecture vers un réseau plus profond : coût d'entraînement multiplié par quatre, précision identique.",
    ],
    leads: [
      "Constituer le jeu de validation par heure de la journée, pas au hasard — la moyenne masquait complètement l'effondrement de 14 h.",
    ],
    signals: [
      "ocr",
      "vision",
      "reconnaissance",
      "plaque",
      "image",
      "modèle",
      "précision",
      "dataset",
      "entraînement",
      "luminosité",
      "caméra",
      "capteur",
      "régression",
    ],
  },
  {
    id: "f-indexation-malgache",
    title: "Indexer du texte en malgache : le piège de la tokenisation empruntée",
    promise:
      "Explique pourquoi les bibliothèques d'indexation courantes dégradent le " +
      "sens sur une langue agglutinante, et par quoi les remplacer.",
    origin: {
      work: "Moteur de recherche documentaire pour les archives de la bibliothèque",
      kind: "mémoire",
      year: 2021,
      field: "Traitement automatique des langues",
      status: "terminé",
    },
    author: AUTHORS.tiana,
    reasoning:
      "Toutes les bibliothèques disponibles supposent une langue où le sens tient " +
      "dans la racine et où les affixes sont du bruit. En malgache, les préfixes " +
      "verbaux portent l'essentiel : mampianatra et mianatra ne désignent pas la " +
      "même action, et un racinisateur générique les réduit au même jeton.\n\n" +
      "Nous avons cessé de chercher un racinisateur et construit une table de " +
      "préfixes productifs à partir du corpus lui-même. Moins élégant qu'un " +
      "algorithme, mais on peut le lire, le corriger, et l'expliquer à un " +
      "bibliothécaire.",
    choices: [
      {
        decision: "Table de préfixes dérivée du corpus plutôt qu'algorithme importé",
        rationale:
          "Vérifiable à la main. Sur un corpus de 4 000 documents, la précision " +
          "est passée de 0,52 à 0,81.",
      },
    ],
    deadEnds: [
      "Portage du racinisateur Snowball : détruit les préfixes verbaux, donc le sens.",
      "Normalisation agressive des accents : fusionne des mots distincts.",
    ],
    leads: [
      "La même approche devrait tenir pour toute langue agglutinante peu dotée — le coût est la table, pas le code.",
    ],
    signals: [
      "recherche",
      "indexation",
      "malgache",
      "texte",
      "nlp",
      "tokenisation",
      "racinisation",
      "stemming",
      "langue",
      "corpus",
      "pertinence",
      "documentaire",
    ],
  },
  {
    id: "f-file-sms",
    title: "Une file de notifications qui survit à une coupure de trois jours",
    promise:
      "Reformule la fiabilité d'une file d'attente comme une question de " +
      "validité dans le temps plutôt que de garantie de livraison.",
    origin: {
      work: "Alertes SMS pour le suivi des vaccinations en zone rurale",
      kind: "projet",
      year: 2023,
      field: "Systèmes répartis",
      status: "arrêté",
    },
    author: AUTHORS.naina,
    reasoning:
      "Nous avions traité la question comme un problème de livraison : réessayer " +
      "jusqu'à ce que ça passe. Après la première coupure longue, les " +
      "destinataires ont reçu onze messages d'un coup, dont quatre devenus faux.\n\n" +
      "La bonne question n'était pas « comment garantir la livraison » mais " +
      "« qu'est-ce qui reste vrai après trois jours ». Un rappel de rendez-vous " +
      "passé ne doit pas partir. Nous avons ajouté une date de péremption à chaque " +
      "message, et la file s'est vidée d'elle-même.",
    choices: [
      {
        decision: "Péremption par message, décidée à l'émission",
        rationale:
          "Déplace la responsabilité vers celui qui connaît le sens du message, " +
          "pas vers l'infrastructure.",
      },
      {
        decision: "Clé d'idempotence stable côté métier",
        rationale:
          "Un réessai après reprise réseau ne crée pas un doublon même si " +
          "l'accusé de réception s'est perdu.",
      },
    ],
    deadEnds: [
      "Réessai exponentiel sans plafond : la file grossissait plus vite qu'elle ne se vidait.",
      "Déduplication par contenu du message : deux rappels légitimes le même jour étaient écrasés.",
    ],
    leads: [
      "Le même raisonnement s'applique aux notifications applicatives : une notification a une durée de validité, pas seulement une priorité.",
    ],
    signals: [
      "sms",
      "notification",
      "notifications",
      "file",
      "queue",
      "réessai",
      "retry",
      "idempotence",
      "réseau",
      "couverture",
      "coupure",
      "livraison",
      "asynchrone",
    ],
  },
  {
    id: "f-cache-menteur",
    title: "Un cache qui ment : invalider sans jamais savoir si le serveur répond",
    promise:
      "Traite le problème du cache périmé par l'affichage plutôt que par " +
      "l'invalidation — et évite d'optimiser la mauvaise couche.",
    origin: {
      work: "Consultation des relevés de notes en connexion intermittente",
      kind: "mémoire",
      year: 2024,
      field: "Génie logiciel",
      status: "terminé",
    },
    author: AUTHORS.fanja,
    reasoning:
      "Une stratégie « cache d'abord, réseau ensuite » affiche instantanément une " +
      "donnée périmée sans le dire. Les étudiants consultaient une note déjà " +
      "corrigée et venaient réclamer au secrétariat.\n\n" +
      "La correction n'a pas été technique mais d'affichage : dater visiblement la " +
      "donnée. « Relevé au 12 mars, 14 h 03 » suffit à rendre le cache honnête. " +
      "Le même cache, sans changer une ligne de sa logique, a cessé de poser " +
      "problème dès qu'il a arrêté de prétendre être à jour.",
    choices: [
      {
        decision: "Horodatage de la donnée visible, systématiquement",
        rationale:
          "Le coût d'un cache périmé n'est pas la péremption, c'est le fait de la cacher.",
      },
    ],
    deadEnds: [
      "Réduction du délai d'expiration à trente secondes : consommation de données multipliée, problème inchangé.",
      "Invalidation poussée par le serveur : suppose une connexion permanente, exactement ce qui manque.",
    ],
    leads: [
      "Toute donnée affichée hors ligne devrait porter sa date d'obtention, au même titre qu'une source porte sa référence.",
    ],
    signals: [
      "cache",
      "invalidation",
      "hors-ligne",
      "offline",
      "périmé",
      "obsolète",
      "service worker",
      "pwa",
      "fraîcheur",
      "affichage",
      "réseau",
    ],
  },
];

const DAY = 86_400_000;

/**
 * La capsule décrit un blocage qui est **exactement** ce que le fragment
 * `f-sync-conflits` a résolu en 2022. C'est le pivot de la démonstration :
 * le produit ne suggère pas une lecture, il rend un travail passé utilisable.
 */
export const DEMO_CAPSULE: ResumptionCapsule = {
  projectId: "p-semis",
  projectTitle: "Suivi des semis — coopérative d'Antsirabe",
  lastActivity: new Date(Date.now() - 4 * DAY).toISOString(),
  where:
    "Le formulaire de saisie enregistre correctement en local et la file de " +
    "synchronisation part vers le serveur. Rien ne redescend encore.",
  blocking:
    "Deux terminaux qui modifient la même parcelle produisent deux versions, et " +
    "la règle qui décide laquelle l'emporte n'est pas écrite.",
  nextStep: {
    action:
      "Ouvrir sync/merge.ts et écrire uniquement la signature de resolve(local, remote). Sans l'implémenter.",
    minutes: 7,
  },
};
