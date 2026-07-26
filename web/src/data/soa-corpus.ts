import type {
  Account,
  Badge,
  Cohort,
  MentorRequest,
  PointEntry,
  Supervision,
  Teacher,
  Challenge,
  Company,
  ForumThread,
  Idea,
  JournalEntry,
  MentorProfile,
  Notification,
  Opportunity,
  Project,
  ReliabilityScore,
  Student,
} from "@/domain/soa";
import { POINT_VALUES, scoreGlobal } from "@/domain/soa";

/**
 * soa-corpus.ts — le corpus de démonstration de la plateforme.
 *
 * Règle qui a guidé l'écriture : **aucun contenu de remplissage.** Chaque
 * projet, chaque entrée de journal, chaque sujet de forum raconte une vraie
 * situation d'étudiant en informatique. La démonstration ne tient que si le
 * jury peut lire n'importe quel écran au hasard et le trouver crédible.
 *
 * Le fil rouge est celui de la lettre : Soa a commencé PHP, puis Java, puis
 * un projet de suivi des semis. Les deux premiers sont abandonnés au 3e-4e
 * jour, le troisième est en sommeil depuis quatre jours — et c'est exactement
 * ce que le fragment `f-sync-conflits` (corpus.ts) a résolu en 2022.
 */

const JOUR = 86_400_000;
const ilYA = (jours: number) => new Date(Date.now() - jours * JOUR).toISOString();

/* ── M1 — Étudiants ─────────────────────────────────────────────────────── */

export const CURRENT_STUDENT_ID = "s-soa";

export const STUDENTS: Student[] = [
  {
    id: "s-soa",
    nom: "Soa Rakotoarisoa",
    initiales: "SR",
    universite: "ENI Fianarantsoa",
    niveau: "L3",
    filiere: "Génie logiciel",
    technos: [
      { nom: "Java", maitrise: 2 },
      { nom: "PHP", maitrise: 2 },
      { nom: "TypeScript", maitrise: 3 },
      { nom: "PostgreSQL", maitrise: 2 },
    ],
    interets: ["Applications hors-ligne", "Agriculture", "Systèmes répartis"],
    disponibilites: ["Soirs", "Week-ends"],
    objectifs: "Terminer un projet du début à la fin, une fois.",
    mentor: false,
    promo: "2026",
  },
  {
    id: "s-hery",
    nom: "Hery Rakotomalala",
    initiales: "HR",
    universite: "ENI Fianarantsoa",
    niveau: "M2",
    filiere: "Génie logiciel",
    technos: [
      { nom: "Java", maitrise: 4, valideePar: "Orange Madagascar" },
      { nom: "PostgreSQL", maitrise: 4 },
      { nom: "Kotlin", maitrise: 3 },
    ],
    interets: ["Systèmes répartis", "Synchronisation", "Terrain"],
    disponibilites: ["Soirs"],
    objectifs: "Transmettre ce que mon mémoire a coûté à apprendre.",
    mentor: true,
    promo: "2022",
  },
  {
    id: "s-mirana",
    nom: "Mirana Andrianina",
    initiales: "MA",
    universite: "ENI Fianarantsoa",
    niveau: "M1",
    filiere: "Vision par ordinateur",
    technos: [
      { nom: "Python", maitrise: 4 },
      { nom: "OpenCV", maitrise: 3 },
      { nom: "React", maitrise: 2 },
    ],
    interets: ["OCR", "Documents administratifs", "Accessibilité"],
    disponibilites: ["Week-ends", "Vacances"],
    objectifs: "Publier un jeu de données OCR malgache ouvert.",
    mentor: true,
    promo: "2023",
  },
  {
    id: "s-tiana",
    nom: "Tiana Ravelojaona",
    initiales: "TR",
    universite: "ENI Fianarantsoa",
    niveau: "M2",
    filiere: "Traitement automatique des langues",
    technos: [
      { nom: "Python", maitrise: 4 },
      { nom: "Elasticsearch", maitrise: 3 },
      { nom: "PostgreSQL", maitrise: 3 },
    ],
    interets: ["Indexation", "Langue malgache", "Recherche"],
    disponibilites: ["Soirs", "Week-ends"],
    objectifs: "Rendre le malgache cherchable correctement.",
    mentor: true,
    promo: "2021",
  },
  {
    id: "s-naina",
    nom: "Naina Rasoanaivo",
    initiales: "NR",
    universite: "ENI Fianarantsoa",
    niveau: "L3",
    filiere: "Systèmes répartis",
    technos: [
      { nom: "Go", maitrise: 3 },
      { nom: "Java", maitrise: 3 },
      { nom: "Redis", maitrise: 2 },
    ],
    interets: ["Files d'attente", "SMS", "Zones blanches"],
    disponibilites: ["Soirs", "Week-ends"],
    objectifs: "Faire marcher quelque chose là où le réseau ne passe pas.",
    mentor: false,
    promo: "2023",
  },
  {
    id: "s-fanja",
    nom: "Fanjaniaina Rakoto",
    initiales: "FR",
    universite: "ENI Fianarantsoa",
    niveau: "L2",
    filiere: "Génie logiciel",
    technos: [
      { nom: "PHP", maitrise: 2 },
      { nom: "JavaScript", maitrise: 2 },
      { nom: "MySQL", maitrise: 2 },
    ],
    interets: ["Web", "Caches", "Performance"],
    disponibilites: ["Week-ends"],
    objectifs: "Comprendre pourquoi mon cache ment.",
    mentor: false,
    promo: "2024",
  },
  {
    id: "s-lova",
    nom: "Lova Andriamanana",
    initiales: "LA",
    universite: "ENI Fianarantsoa",
    niveau: "M1",
    filiere: "Génie logiciel",
    technos: [
      { nom: "React", maitrise: 4 },
      { nom: "TypeScript", maitrise: 4 },
      { nom: "Node.js", maitrise: 3 },
    ],
    interets: ["Interfaces", "Accessibilité", "Design système"],
    disponibilites: ["Soirs", "Vacances"],
    objectifs: "Monter une équipe pour un projet qui sort vraiment.",
    mentor: true,
    promo: "2023",
  },
  {
    id: "s-toky",
    nom: "Toky Randrianasolo",
    initiales: "TR",
    universite: "ENI Fianarantsoa",
    niveau: "L2",
    filiere: "Réseaux",
    technos: [
      { nom: "Linux", maitrise: 3 },
      { nom: "Python", maitrise: 2 },
      { nom: "Réseau", maitrise: 3 },
    ],
    interets: ["Supervision", "Réseaux locaux", "Auto-hébergement"],
    disponibilites: ["Soirs"],
    objectifs: "Superviser le réseau de l'école avec mes propres outils.",
    mentor: false,
    promo: "2024",
  },
];

export const CURRENT_STUDENT: Student = STUDENTS[0]!;

export function studentById(id: string): Student | undefined {
  return STUDENTS.find((s) => s.id === id);
}

/* ── M2 — Projets ───────────────────────────────────────────────────────── */

export const PROJECTS: Project[] = [
  {
    id: "p-semis",
    nom: "Suivi des semis — coopérative d'Antsirabe",
    description:
      "Une application de terrain pour saisir les semis parcelle par parcelle, " +
      "utilisable sans réseau et synchronisée quand la connexion revient.",
    type: "Académique",
    status: "En cours",
    technos: ["TypeScript", "PostgreSQL", "IndexedDB"],
    objectif:
      "Qu'un technicien agricole puisse saisir une journée entière hors ligne " +
      "et retrouver ses données intactes le lendemain.",
    dureeSemaines: 14,
    debut: ilYA(52),
    difficulte: "Ambitieux",
    ownerId: "s-soa",
    derniereActivite: ilYA(4),
    public: true,
    depot: {
      hote: "GitHub",
      slug: "soa-r/suivi-semis",
      commitsParSemaine: [4, 7, 9, 6, 11, 8, 5, 9, 12, 6, 2, 0],
      branches: ["main", "sync/merge", "ui/saisie"],
    },
  },
  {
    id: "p-quiz",
    nom: "Quiz de révision hors-ligne",
    description:
      "Un générateur de fiches de révision à partir des cours en PDF, consultable " +
      "sans connexion dans le bus.",
    type: "Personnel",
    status: "Terminé",
    technos: ["TypeScript", "React"],
    objectif: "Réviser sans dépendre de la 3G.",
    dureeSemaines: 5,
    debut: ilYA(160),
    fin: ilYA(118),
    difficulte: "Découverte",
    ownerId: "s-soa",
    derniereActivite: ilYA(118),
    public: true,
    presentation: {
      captures: ["Écran de révision", "Import d'un PDF de cours"],
      architecture:
        "Extraction PDF côté navigateur, stockage IndexedDB, aucune API. " +
        "Le choix du tout-client vient d'une contrainte : pas de serveur à payer.",
      documentation:
        "README avec le format de fiche attendu et les limites connues de " +
        "l'extraction sur les PDF scannés.",
    },
  },
  {
    id: "p-blog-php",
    nom: "Blog personnel en PHP",
    description:
      "Un blog écrit à la main pour apprendre PHP sans framework, avec un " +
      "petit moteur de templates maison.",
    type: "Personnel",
    status: "Abandonné",
    technos: ["PHP", "MySQL"],
    objectif: "Comprendre PHP en le pratiquant plutôt qu'en lisant un cours.",
    dureeSemaines: 3,
    debut: ilYA(300),
    fin: ilYA(296),
    difficulte: "Découverte",
    ownerId: "s-soa",
    derniereActivite: ilYA(296),
    public: true,
    raisonAbandon:
      "Arrêté au 4e jour. Le moteur de templates marchait, mais je ne voyais " +
      "aucune différence entre la veille et le lendemain, donc j'ai arrêté.",
  },
  {
    id: "p-biblio-java",
    nom: "Gestion de bibliothèque en Java",
    description:
      "Une application de bureau pour gérer les emprunts de la bibliothèque " +
      "de l'école, en Java/Swing.",
    type: "Académique",
    status: "Abandonné",
    technos: ["Java", "SQLite"],
    objectif: "Rendre un TP qui serve vraiment à la bibliothèque.",
    dureeSemaines: 6,
    debut: ilYA(230),
    fin: ilYA(226),
    difficulte: "Intermédiaire",
    ownerId: "s-soa",
    derniereActivite: ilYA(226),
    public: true,
    raisonAbandon:
      "Bloquée trois jours sur une NullPointerException dans le chargement " +
      "des emprunts. Personne à qui demander, donc j'ai laissé tomber.",
  },
  {
    id: "p-portfolio",
    nom: "Portfolio en ligne",
    description:
      "Une page qui montre ce que j'ai construit, pour les candidatures de stage.",
    type: "Personnel",
    status: "Idée",
    technos: ["React"],
    objectif: "Avoir quelque chose à montrer qui ne soit pas un CV.",
    dureeSemaines: 2,
    debut: ilYA(9),
    difficulte: "Découverte",
    ownerId: "s-soa",
    derniereActivite: ilYA(9),
    public: false,
  },

  /* Projets d'autres étudiants — alimentent Renaissance (M15) et la communauté. */
  {
    id: "p-ocr-actes",
    nom: "OCR des actes d'état civil",
    description:
      "Numériser et rendre cherchables les registres manuscrits de la commune, " +
      "malgré un éclairage de photocopie très inégal.",
    type: "Recherche",
    status: "Terminé",
    technos: ["Python", "OpenCV"],
    objectif: "Retrouver un acte en dix secondes au lieu d'une demi-journée.",
    dureeSemaines: 20,
    debut: ilYA(700),
    fin: ilYA(540),
    difficulte: "Ambitieux",
    ownerId: "s-mirana",
    derniereActivite: ilYA(540),
    public: true,
  },
  {
    id: "p-sms-queue",
    nom: "File d'attente SMS pour zones blanches",
    description:
      "Acheminer des relevés depuis des villages sans data, en encodant les " +
      "messages dans des SMS et en gérant les pertes.",
    type: "Académique",
    status: "Abandonné",
    technos: ["Go", "Redis"],
    objectif: "Un relevé quotidien qui arrive, même sans data.",
    dureeSemaines: 10,
    debut: ilYA(210),
    fin: ilYA(150),
    difficulte: "Ambitieux",
    ownerId: "s-naina",
    derniereActivite: ilYA(150),
    public: true,
    raisonAbandon:
      "L'encodage des accusés de réception marchait, mais je n'ai jamais " +
      "réussi à tester à l'échelle. Faute de terrain, j'ai arrêté avant la fin.",
  },
  {
    id: "p-cache-web",
    nom: "Cache applicatif pour un site à faible bande passante",
    description:
      "Un cache maison devant une API lente, qui a fini par servir des données " +
      "périmées sans que personne s'en aperçoive.",
    type: "Personnel",
    status: "Abandonné",
    technos: ["PHP", "Redis"],
    objectif: "Diviser par cinq le temps de chargement.",
    dureeSemaines: 4,
    debut: ilYA(120),
    fin: ilYA(96),
    difficulte: "Intermédiaire",
    ownerId: "s-fanja",
    derniereActivite: ilYA(96),
    public: true,
    raisonAbandon:
      "Le cache mentait : il servait des prix périmés. Je n'ai pas su décider " +
      "quoi invalider et quand, donc j'ai tout retiré.",
  },
  {
    id: "p-supervision",
    nom: "Supervision du réseau de l'école",
    description:
      "Une sonde légère qui relève la disponibilité des salles machines et " +
      "affiche une carte en temps réel.",
    type: "Personnel",
    status: "En cours",
    technos: ["Python", "Linux", "Réseau"],
    objectif: "Savoir quelle salle est tombée avant que les étudiants le disent.",
    dureeSemaines: 8,
    debut: ilYA(40),
    difficulte: "Intermédiaire",
    ownerId: "s-toky",
    derniereActivite: ilYA(2),
    public: true,
  },
  {
    id: "p-design-system",
    nom: "Design system pour les projets de l'ENI",
    description:
      "Des composants React communs pour que les projets étudiants arrêtent de " +
      "repartir d'une page blanche.",
    type: "Open source",
    status: "En cours",
    technos: ["React", "TypeScript"],
    objectif: "Qu'un projet démarre avec une interface correcte en une heure.",
    dureeSemaines: 12,
    debut: ilYA(70),
    difficulte: "Intermédiaire",
    ownerId: "s-lova",
    derniereActivite: ilYA(1),
    public: true,
  },
];

export function projectById(id: string): Project | undefined {
  return PROJECTS.find((p) => p.id === id);
}

/* ── M3 — Journal de progression ────────────────────────────────────────── */

export const JOURNAL: JournalEntry[] = [
  {
    id: "j-1",
    projectId: "p-semis",
    kind: "Architecture",
    titre: "Stockage local : IndexedDB plutôt que localStorage",
    corps:
      "localStorage est synchrone et plafonne à 5 Mo. Une journée de saisie sur " +
      "40 parcelles avec photos dépasse ça. IndexedDB est pénible à écrire mais " +
      "c'est le seul choix qui tient sur le terrain.",
    date: ilYA(50),
    jalon: "Choix du stockage",
  },
  {
    id: "j-2",
    projectId: "p-semis",
    kind: "Solution",
    titre: "La saisie fonctionne entièrement hors ligne",
    corps:
      "Formulaire, validation et écriture locale sont bouclés. Testé en mode " +
      "avion sur 40 parcelles : rien ne se perd.",
    date: ilYA(38),
    jalon: "Saisie hors ligne",
  },
  {
    id: "j-3",
    projectId: "p-semis",
    kind: "Erreur",
    titre: "La file de synchronisation renvoyait deux fois la même parcelle",
    corps:
      "Je vidais la file après l'envoi, pas après l'accusé de réception. Une " +
      "coupure au mauvais moment et la parcelle repartait au retour du réseau.",
    date: ilYA(24),
  },
  {
    id: "j-4",
    projectId: "p-semis",
    kind: "Solution",
    titre: "File vidée à l'accusé, pas à l'envoi",
    corps:
      "Chaque élément porte un identifiant d'idempotence. Le serveur ignore un " +
      "identifiant déjà vu, et la file ne se vide qu'après sa réponse.",
    date: ilYA(22),
    jalon: "Synchronisation montante",
  },
  {
    id: "j-5",
    projectId: "p-semis",
    kind: "Apprentissage",
    titre: "Un envoi réussi n'est pas une écriture confirmée",
    corps:
      "C'est évident écrit comme ça. Ça m'a coûté deux jours parce que je " +
      "raisonnais en « la requête est partie » au lieu de « le serveur a écrit ».",
    date: ilYA(22),
  },
  {
    id: "j-6",
    projectId: "p-semis",
    kind: "Décision",
    titre: "Repousser la descente des données du serveur",
    corps:
      "Tant que la montée n'est pas fiable, faire redescendre les données " +
      "créerait des conflits que je ne sais pas encore arbitrer.",
    date: ilYA(12),
  },
  {
    id: "j-7",
    projectId: "p-semis",
    kind: "Erreur",
    titre: "Deux terminaux modifient la même parcelle",
    corps:
      "Le technicien et le chef de coopérative ont saisi la même parcelle le " +
      "même matin. Deux versions arrivent, et rien ne dit laquelle garder. " +
      "L'horloge des terminaux n'est pas fiable : l'un avait trois heures de retard.",
    date: ilYA(4),
  },

  {
    id: "j-8",
    projectId: "p-blog-php",
    kind: "Solution",
    titre: "Moteur de templates maison en 60 lignes",
    corps:
      "Remplacement de {{variable}} par expression régulière, avec échappement " +
      "HTML par défaut. Suffisant pour un blog.",
    date: ilYA(298),
    jalon: "Moteur de templates",
  },
  {
    id: "j-9",
    projectId: "p-blog-php",
    kind: "Apprentissage",
    titre: "Échapper par défaut, dés-échapper explicitement",
    corps:
      "L'inverse — échapper à la demande — laisse toujours passer un oubli. " +
      "Le défaut sûr doit être le défaut tout court.",
    date: ilYA(297),
  },
  {
    id: "j-10",
    projectId: "p-biblio-java",
    kind: "Erreur",
    titre: "NullPointerException au chargement des emprunts",
    corps:
      "Un emprunt sans date de retour donne un null que le formatteur ne gère " +
      "pas. J'ai cherché trois jours du mauvais côté, dans la couche base.",
    date: ilYA(227),
  },
  {
    id: "j-11",
    projectId: "p-quiz",
    kind: "Architecture",
    titre: "Tout côté client, aucun serveur",
    corps:
      "Extraction PDF dans le navigateur. Plus lent, mais rien à héberger et " +
      "rien à payer — la seule façon que le projet survive à la fin du semestre.",
    date: ilYA(150),
    jalon: "Choix d'architecture",
  },
  {
    id: "j-12",
    projectId: "p-quiz",
    kind: "Solution",
    titre: "Livré et utilisé par la promo",
    corps:
      "Onze camarades l'utilisent pour les partiels. Le format de fiche est " +
      "documenté dans le README.",
    date: ilYA(118),
    jalon: "Livraison",
  },
];

export function journalFor(projectId: string): JournalEntry[] {
  return JOURNAL.filter((e) => e.projectId === projectId).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

/* ── M8 — Forum ─────────────────────────────────────────────────────────── */

export const THREADS: ForumThread[] = [
  {
    id: "t-npe",
    categorie: "Java",
    titre: "NullPointerException seulement au chargement, jamais à la saisie",
    corps:
      "Mon application plante à l'ouverture de la liste des emprunts, mais " +
      "l'enregistrement marche. Je cherche du côté de la base depuis trois jours.",
    auteurId: "s-soa",
    date: ilYA(226),
    resoluPar: "r-npe-2",
    reponses: [
      {
        id: "r-npe-1",
        auteurId: "s-naina",
        corps:
          "Regarde d'abord ce que tu affiches, pas ce que tu lis. Une valeur " +
          "nulle en base est légitime ; un formatteur qui ne la gère pas ne l'est pas.",
        date: ilYA(225),
        deMentor: false,
      },
      {
        id: "r-npe-2",
        auteurId: "s-hery",
        corps:
          "C'est presque toujours la date de retour d'un emprunt en cours : elle " +
          "est nulle par définition tant que le livre n'est pas rendu. Ton " +
          "formatteur de date reçoit null et tombe. Traite le cas « pas encore " +
          "rendu » comme un état, pas comme une donnée manquante.",
        date: ilYA(225),
        deMentor: true,
      },
    ],
  },
  {
    id: "t-conflits",
    categorie: "BDD",
    titre: "Arbitrer deux écritures concurrentes sans horloge fiable",
    corps:
      "Deux terminaux hors ligne modifient la même ligne. Au retour du réseau, " +
      "j'ai deux versions. Les horodatages des terminaux ne sont pas fiables.",
    auteurId: "s-soa",
    date: ilYA(3),
    reponses: [
      {
        id: "r-conflits-1",
        auteurId: "s-hery",
        corps:
          "N'essaie pas de décider qui a raison avec le temps. Décide avec le " +
          "champ : certains se remplacent, d'autres s'additionnent. Mon mémoire " +
          "de 2022 traite exactement ce cas, il est dans le corpus.",
        date: ilYA(3),
        deMentor: true,
      },
    ],
    ressource: {
      libelle: "Mémoire — Conflits de synchronisation (2022)",
      url: "#/fragment/f-sync-conflits",
    },
  },
  {
    id: "t-cache",
    categorie: "PHP",
    titre: "Mon cache sert des prix périmés, quoi invalider ?",
    corps:
      "J'ai mis un cache devant l'API produits. Les temps de chargement sont " +
      "bons mais les prix affichés sont faux pendant des heures.",
    auteurId: "s-fanja",
    date: ilYA(98),
    reponses: [
      {
        id: "r-cache-1",
        auteurId: "s-tiana",
        corps:
          "La question n'est pas quand expirer, c'est qui invalide. Si c'est " +
          "l'écriture du prix qui purge la clé, la durée de vie devient un filet " +
          "de sécurité et non la règle.",
        date: ilYA(97),
        deMentor: true,
      },
    ],
  },
  {
    id: "t-accents",
    categorie: "IA",
    titre: "Indexer du malgache : que faire des diacritiques ?",
    corps:
      "Ma recherche ne trouve rien si l'utilisateur tape sans accents, et trouve " +
      "trop si je les retire partout.",
    auteurId: "s-tiana",
    date: ilYA(300),
    reponses: [
      {
        id: "r-accents-1",
        auteurId: "s-mirana",
        corps:
          "Indexe les deux formes et pondère : la forme accentuée compte plus. " +
          "Tu gardes le rappel sans perdre la précision.",
        date: ilYA(299),
        deMentor: true,
      },
    ],
  },
  {
    id: "t-hooks",
    categorie: "React",
    titre: "Comment annuler une requête devenue obsolète ?",
    corps:
      "Quand l'utilisateur tape vite, les réponses arrivent dans le désordre et " +
      "un ancien résultat écrase le récent.",
    auteurId: "s-toky",
    date: ilYA(15),
    resoluPar: "r-hooks-1",
    reponses: [
      {
        id: "r-hooks-1",
        auteurId: "s-lova",
        corps:
          "AbortController, et tu annules dans le nettoyage de l'effet. La " +
          "requête obsolète est coupée avant de pouvoir écrire dans l'état.",
        date: ilYA(15),
        deMentor: true,
      },
    ],
  },
  {
    id: "t-vlan",
    categorie: "Réseau",
    titre: "Segmenter les salles machines sans matériel administrable",
    corps:
      "L'école n'a que des commutateurs non administrables. Je voudrais isoler " +
      "la salle des serveurs du reste.",
    auteurId: "s-toky",
    date: ilYA(30),
    reponses: [
      {
        id: "r-vlan-1",
        auteurId: "s-naina",
        corps:
          "Sans matériel administrable, tu ne feras pas de VLAN. Fais le filtrage " +
          "sur la passerelle Linux et documente-le : c'est moins propre, mais " +
          "c'est vrai et ça tient.",
        date: ilYA(29),
        deMentor: false,
      },
    ],
  },
];

/* ── M10 — Challenges ───────────────────────────────────────────────────── */

export const CHALLENGES: Challenge[] = [
  {
    id: "c-java-90",
    titre: "Challenge Java 90 jours",
    description:
      "Trois mois pour mener un projet Java du premier commit à une livraison " +
      "documentée. Un point de progression par semaine, pas de classement.",
    dureeJours: 90,
    techno: "Java",
    debut: ilYA(28),
    participants: [
      { studentId: "s-soa", semaines: [true, true, false, false] },
      { studentId: "s-naina", semaines: [true, true, true, true] },
      { studentId: "s-hery", semaines: [true, true, true, false] },
      { studentId: "s-fanja", semaines: [true, false, false, false] },
    ],
  },
  {
    id: "c-orange",
    titre: "Orange Challenge — application de terrain",
    description:
      "Concevoir une application utilisable sans réseau pour un usage de terrain " +
      "réel. Encadrement par des développeurs seniors d'Orange Madagascar.",
    dureeJours: 60,
    techno: "Mobile",
    debut: ilYA(10),
    sponsorId: "e-orange",
    recompense: "Stage de 4 mois + accompagnement technique",
    participants: [
      { studentId: "s-soa", semaines: [true] },
      { studentId: "s-lova", semaines: [true] },
      { studentId: "s-toky", semaines: [false] },
    ],
  },
  {
    id: "c-doc",
    titre: "Documenter un projet abandonné",
    description:
      "Reprendre un projet arrêté — le sien ou celui d'un autre — et écrire ce " +
      "qui bloquait, pour que le suivant ne reparte pas de zéro.",
    dureeJours: 21,
    techno: "Toutes",
    debut: ilYA(6),
    participants: [
      { studentId: "s-fanja", semaines: [true] },
      { studentId: "s-naina", semaines: [true] },
    ],
  },
];

/* ── M14 — Idées soumises au vote ───────────────────────────────────────── */

export const IDEAS: Idea[] = [
  {
    id: "i-cantine",
    auteurId: "s-fanja",
    titre: "Application de réservation de repas à la cantine",
    corps:
      "Réserver son repas la veille pour éviter le gaspillage et la file. " +
      "PHP + MySQL, deux mois.",
    date: ilYA(5),
    votesPour: ["s-soa", "s-toky", "s-naina"],
    votesReserve: ["s-lova"],
    commentaires: [
      {
        auteurId: "s-lova",
        corps:
          "L'idée est bonne mais le vrai obstacle n'est pas technique : il faut " +
          "que la cantine accepte de changer sa façon de compter. Parle-leur avant " +
          "d'écrire une ligne.",
        date: ilYA(4),
      },
    ],
  },
  {
    id: "i-covoit",
    auteurId: "s-toky",
    titre: "Covoiturage entre étudiants sur l'axe Fianarantsoa–Ambositra",
    corps: "Mise en relation simple, sans paiement en ligne. React + Node.",
    date: ilYA(12),
    votesPour: ["s-soa", "s-lova"],
    votesReserve: ["s-naina", "s-hery"],
    commentaires: [
      {
        auteurId: "s-hery",
        corps:
          "Attention : sans masse critique d'utilisateurs, ce genre de service " +
          "ne démarre jamais. Vise d'abord une seule promo.",
        date: ilYA(11),
      },
    ],
  },
  {
    id: "i-archive",
    auteurId: "s-soa",
    titre: "Archive consultable des mémoires de l'ENI",
    corps:
      "Rendre les mémoires cherchables par problème résolu, pas par titre. " +
      "C'est ce qui m'aurait fait gagner trois semaines.",
    date: ilYA(20),
    votesPour: ["s-hery", "s-mirana", "s-tiana", "s-lova", "s-naina"],
    votesReserve: [],
    commentaires: [
      {
        auteurId: "s-tiana",
        corps:
          "Je signe. Mon mémoire n'a été lu par personne depuis la soutenance, " +
          "et il répond à une question que je vois passer sur le forum tous les ans.",
        date: ilYA(19),
      },
    ],
  },
];

/* ── M18 — Mentorat ─────────────────────────────────────────────────────── */

export const MENTORS: MentorProfile[] = [
  {
    studentId: "s-hery",
    domaines: ["Java", "Systèmes répartis", "PostgreSQL"],
    statut: "M2",
    presentation:
      "Mémoire sur la synchronisation hors ligne. Je réponds surtout aux " +
      "questions d'architecture — le code, vous savez déjà l'écrire.",
    disponible: true,
  },
  {
    studentId: "s-mirana",
    domaines: ["Python", "Vision par ordinateur", "OCR"],
    statut: "M1",
    presentation:
      "Traitement d'images sur des documents de mauvaise qualité. Venez avec " +
      "un échantillon, pas avec une description.",
    disponible: true,
  },
  {
    studentId: "s-tiana",
    domaines: ["Recherche", "Indexation", "TAL"],
    statut: "Alumni",
    presentation:
      "Indexation de textes en malgache. Je peux relire une conception de " +
      "schéma de recherche avant que vous écriviez la requête.",
    disponible: false,
  },
  {
    studentId: "s-lova",
    domaines: ["React", "TypeScript", "Accessibilité"],
    statut: "M1",
    presentation:
      "Interfaces et design systems. Je relis volontiers un écran avant qu'il " +
      "parte en soutenance.",
    disponible: true,
  },
];

/* ── E1 — Entreprises ───────────────────────────────────────────────────── */

export const COMPANIES: Company[] = [
  {
    id: "e-orange",
    nom: "Orange Madagascar",
    secteur: "Télécommunications",
    technosRecherchees: ["Java", "Kotlin", "PostgreSQL"],
    profilsRecherches: ["Stagiaires", "Alternants"],
    presentation:
      "Nous cherchons des profils qui ont mené un projet jusqu'au bout, même " +
      "petit. Un projet terminé nous en dit plus qu'une liste de technologies.",
  },
  {
    id: "e-ingenosya",
    nom: "Ingenosya",
    secteur: "Services numériques",
    technosRecherchees: ["React", "TypeScript", "Node.js"],
    profilsRecherches: ["Juniors", "Stagiaires"],
    presentation:
      "Éditeur de logiciels à Antananarivo. Nous regardons les projets repris : " +
      "savoir continuer le travail d'un autre est le cœur du métier.",
  },
  {
    id: "e-agrivia",
    nom: "Agrivia",
    secteur: "Agritech",
    technosRecherchees: ["Python", "PostgreSQL", "Mobile hors-ligne"],
    profilsRecherches: ["Stagiaires"],
    presentation:
      "Outils numériques pour les coopératives agricoles. Le terrain est sans " +
      "réseau : c'est notre contrainte principale, et notre critère de recrutement.",
  },
];

/* ── M13 / E2 — Opportunités ────────────────────────────────────────────── */

export const OPPORTUNITIES: Opportunity[] = [
  {
    id: "o-agrivia-terrain",
    titre: "Application de collecte agricole hors-ligne",
    companyId: "e-agrivia",
    description:
      "Reprendre et industrialiser un prototype de saisie de terrain : " +
      "synchronisation différée, arbitrage des conflits, déploiement sur " +
      "tablettes Android d'entrée de gamme.",
    technos: ["TypeScript", "PostgreSQL", "IndexedDB"],
    dureeMois: 4,
    profil: "L3 ou M1, ayant déjà livré un projet avec persistance locale.",
    nature: "Stage",
    publieeLe: ilYA(6),
  },
  {
    id: "o-orange-flutter",
    titre: "Application Flutter de relevé technique",
    companyId: "e-orange",
    description:
      "Développer une application de relevé pour les techniciens réseau, avec " +
      "un mode dégradé complet quand la couverture manque.",
    technos: ["Flutter", "Dart"],
    dureeMois: 3,
    profil: "M1/M2, avec possibilité de stage à l'issue du projet.",
    nature: "Projet",
    publieeLe: ilYA(14),
  },
  {
    id: "o-ingenosya-front",
    titre: "Alternance développement front-end",
    companyId: "e-ingenosya",
    description:
      "Participer au design system interne et à la refonte de deux applications " +
      "métier. Accompagnement par un développeur senior.",
    technos: ["React", "TypeScript"],
    dureeMois: 12,
    profil: "M1, portfolio de projets terminés exigé.",
    nature: "Alternance",
    publieeLe: ilYA(2),
  },
];

/* ── E4 — Scores de fiabilité ───────────────────────────────────────────── */

function score(
  studentId: string,
  parts: Omit<ReliabilityScore, "global" | "studentId">,
): ReliabilityScore {
  return { studentId, ...parts, global: scoreGlobal(parts) };
}

export const RELIABILITY: ReliabilityScore[] = [
  score("s-soa", {
    regularite: 62,
    projetsTermines: 40,
    documentation: 78,
    collaboration: 55,
    entraide: 70,
  }),
  score("s-hery", {
    regularite: 88,
    projetsTermines: 92,
    documentation: 95,
    collaboration: 80,
    entraide: 96,
  }),
  score("s-lova", {
    regularite: 90,
    projetsTermines: 75,
    documentation: 82,
    collaboration: 94,
    entraide: 85,
  }),
  score("s-naina", {
    regularite: 74,
    projetsTermines: 50,
    documentation: 68,
    collaboration: 72,
    entraide: 66,
  }),
  score("s-mirana", {
    regularite: 80,
    projetsTermines: 85,
    documentation: 90,
    collaboration: 65,
    entraide: 78,
  }),
  score("s-fanja", {
    regularite: 48,
    projetsTermines: 25,
    documentation: 52,
    collaboration: 60,
    entraide: 58,
  }),
  score("s-toky", {
    regularite: 70,
    projetsTermines: 35,
    documentation: 45,
    collaboration: 62,
    entraide: 64,
  }),
];

export function reliabilityFor(studentId: string): ReliabilityScore | undefined {
  return RELIABILITY.find((r) => r.studentId === studentId);
}

/* ── M12 — Badges ───────────────────────────────────────────────────────── */

/**
 * SPEC.md §2bis : secondaires et hors du chemin de reprise. Ils vivent dans un
 * onglet du profil, jamais dans un bandeau global.
 */
export const BADGES: Badge[] = [
  {
    id: "b-premier",
    nom: "Premier projet terminé",
    description: "Un projet mené du début à la livraison.",
    obtenuLe: ilYA(118),
  },
  {
    id: "b-doc",
    nom: "Documentation",
    description: "Un projet livré avec une documentation utilisable par un tiers.",
    obtenuLe: ilYA(118),
  },
  {
    id: "b-impasse",
    nom: "Impasse documentée",
    description:
      "Une raison d'abandon écrite honnêtement, pour que le suivant gagne du temps.",
    obtenuLe: ilYA(296),
  },
  {
    id: "b-repris",
    nom: "Projet repris",
    description: "Reprendre un projet arrêté par quelqu'un d'autre.",
  },
  {
    id: "b-mentor",
    nom: "Mentor",
    description: "Accompagner un étudiant sur au moins un blocage résolu.",
  },
];

/* ── M20 — Notifications ────────────────────────────────────────────────── */

export const NOTIFICATIONS: Notification[] = [
  {
    id: "n-1",
    kind: "reprise",
    titre: "Suivi des semis",
    corps:
      "Le projet est en sommeil depuis 4 jours. Ce qui bloquait : l'arbitrage " +
      "entre deux versions d'une même parcelle.",
    date: ilYA(0),
    lu: false,
    cible: "#/reprise",
  },
  {
    id: "n-2",
    kind: "forum",
    titre: "Hery a répondu à ton sujet",
    corps:
      "« N'essaie pas de décider qui a raison avec le temps. Décide avec le champ. »",
    date: ilYA(3),
    lu: false,
    cible: "#/communaute/sujet/t-conflits",
  },
  {
    id: "n-3",
    kind: "opportunite",
    titre: "Agrivia cherche un profil comme le tien",
    corps:
      "Stage de 4 mois sur la collecte agricole hors-ligne — les technos " +
      "correspondent à ton projet en cours.",
    date: ilYA(6),
    lu: false,
    cible: "#/opportunites",
  },
  {
    id: "n-4",
    kind: "challenge",
    titre: "Challenge Java 90 jours — semaine 3",
    corps: "Tu n'as pas encore posé de point cette semaine.",
    date: ilYA(7),
    lu: true,
    cible: "#/challenges/c-java-90",
  },
  {
    id: "n-5",
    kind: "mentorat",
    titre: "Lova s'est rendu disponible",
    corps: "React, TypeScript, accessibilité — relecture d'écran avant soutenance.",
    date: ilYA(9),
    lu: true,
    cible: "#/mentorat",
  },
];

/* ── M1 — Comptes ───────────────────────────────────────────────────────── */

/**
 * Le cadrage prévoit quatre fournisseurs d'identité. Ici aucun mot de passe
 * n'est vérifié : le compte identifie, il ne protège pas. L'écran de connexion
 * le dit explicitement plutôt que de le laisser croire.
 */
export const ACCOUNTS: Account[] = [
  {
    studentId: "s-soa",
    email: "soa@eni.mg",
    motDePasse: "vitanow2026",
    provider: "universite",
    demo: true,
  },
  {
    studentId: "s-hery",
    email: "hery@eni.mg",
    motDePasse: "vitanow2026",
    provider: "email",
    demo: true,
  },
  {
    studentId: "s-lova",
    email: "lova@eni.mg",
    motDePasse: "vitanow2026",
    provider: "google",
    demo: true,
  },
  {
    studentId: "s-fanja",
    email: "fanja@eni.mg",
    motDePasse: "vitanow2026",
    provider: "email",
    demo: true,
  },
  {
    studentId: "s-naina",
    email: "naina@eni.mg",
    motDePasse: "vitanow2026",
    provider: "github",
    demo: true,
  },
];

/**
 * Ce que chaque compte de démonstration permet de montrer.
 *
 * Le choix n'est pas arbitraire : une démonstration se joue mieux en changeant
 * de personne qu'en changeant d'écran. Voir la reprise depuis le compte de Soa,
 * puis le retour à l'auteur depuis celui d'Hery, raconte la boucle du produit
 * bien mieux que deux onglets ouverts côte à côte.
 */
export const DEMO_ROLES: Record<string, string> = {
  "soa@eni.mg":
    "Le parcours principal — un projet en sommeil, une capsule de reprise, des projets arrêtés et documentés.",
  "hery@eni.mg":
    "L'auteur du corpus. Mentor, mémoire de 2022, c'est lui qui reçoit le retour quand son travail sert.",
  "lova@eni.mg": "Mentor React, profil le mieux noté en collaboration.",
  "fanja@eni.mg":
    "Le profil qui démarre — peu de projets terminés, une impasse documentée.",
  "naina@eni.mg": "Un projet arrêté faute de terrain, disponible à la reprise.",
};

/* ── M12 — Points SOA ───────────────────────────────────────────────────── */

/**
 * Journal des points, plutôt qu'un compteur.
 *
 * Un total nu (« 245 points ») ne dit pas ce qui a été fait ; la liste, si.
 * C'est aussi ce qui permet de retirer la mécanique du chemin de travail sans
 * perdre l'information : chaque ligne est un fait daté, pas un score.
 */
export const POINTS: PointEntry[] = [
  { studentId: "s-soa", reason: "projet-termine", detail: "Quiz de révision hors-ligne", date: ilYA(118) },
  { studentId: "s-soa", reason: "erreur-documentee", detail: "Blog PHP — raison d'arrêt écrite", date: ilYA(296) },
  { studentId: "s-soa", reason: "erreur-documentee", detail: "Bibliothèque Java — raison d'arrêt écrite", date: ilYA(226) },
  { studentId: "s-soa", reason: "erreur-documentee", detail: "File de synchronisation en double", date: ilYA(24) },
  { studentId: "s-soa", reason: "solution-partagee", detail: "File vidée à l'accusé, pas à l'envoi", date: ilYA(22) },

  { studentId: "s-hery", reason: "projet-termine", detail: "Mémoire — conflits de synchronisation", date: ilYA(700) },
  { studentId: "s-hery", reason: "pair-aide", detail: "NullPointerException au chargement des emprunts", date: ilYA(225) },
  { studentId: "s-hery", reason: "pair-aide", detail: "Arbitrage sans horloge fiable", date: ilYA(3) },
  { studentId: "s-hery", reason: "solution-partagee", detail: "Décider avec le champ, pas avec le temps", date: ilYA(3) },

  { studentId: "s-mirana", reason: "projet-termine", detail: "OCR des actes d'état civil", date: ilYA(540) },
  { studentId: "s-mirana", reason: "pair-aide", detail: "Indexation des diacritiques malgaches", date: ilYA(299) },

  { studentId: "s-lova", reason: "pair-aide", detail: "Annulation de requête obsolète", date: ilYA(15) },
  { studentId: "s-lova", reason: "solution-partagee", detail: "AbortController dans le nettoyage d'effet", date: ilYA(15) },

  { studentId: "s-tiana", reason: "pair-aide", detail: "Invalidation de cache par l'écriture", date: ilYA(97) },
  { studentId: "s-naina", reason: "pair-aide", detail: "Filtrage sur passerelle sans VLAN", date: ilYA(29) },
  { studentId: "s-naina", reason: "erreur-documentee", detail: "File SMS — jamais testée à l'échelle", date: ilYA(150) },
  { studentId: "s-fanja", reason: "erreur-documentee", detail: "Cache servant des prix périmés", date: ilYA(96) },
];

export function pointsFor(studentId: string): number {
  return POINTS.filter((p) => p.studentId === studentId).reduce(
    (total, p) => total + POINT_VALUES[p.reason],
    0,
  );
}

/* ── M18 — Demandes de mentorat ─────────────────────────────────────────── */

export const MENTOR_REQUESTS: MentorRequest[] = [
  {
    id: "mr-1",
    mentorId: "s-hery",
    studentId: "s-fanja",
    blocage:
      "Je n'arrive pas à décider quoi invalider dans mon cache. J'ai essayé une " +
      "durée de vie de 5 minutes, mais les prix restent faux entre-temps.",
    date: ilYA(94),
    statut: "résolu",
    reponses: [
      {
        auteurId: "s-hery",
        corps:
          "Inverse la question : ce n'est pas au cache d'expirer, c'est à " +
          "l'écriture du prix de purger la clé. La durée de vie devient un filet " +
          "de sécurité, plus la règle.",
        date: ilYA(93),
      },
      {
        auteurId: "s-fanja",
        corps: "Ça marche. J'ai écrit l'entrée de journal correspondante.",
        date: ilYA(92),
      },
    ],
  },
];

/* ── Universités — enseignants, promotions, encadrement ─────────────────── */

export const TEACHERS: Teacher[] = [
  {
    id: "t-randria",
    nom: "Pr. Randrianarisoa",
    initiales: "PR",
    universite: "ENI Fianarantsoa",
    departement: "Génie logiciel",
    promotions: ["c-l3-gl", "c-m1-gl"],
  },
];

export const CURRENT_TEACHER: Teacher = TEACHERS[0]!;

export const COHORTS: Cohort[] = [
  {
    id: "c-l3-gl",
    libelle: "L3 Génie logiciel",
    niveau: "L3",
    filiere: "Génie logiciel",
    annee: "2025-2026",
    studentIds: ["s-soa", "s-naina", "s-toky"],
  },
  {
    id: "c-m1-gl",
    libelle: "M1 Génie logiciel",
    niveau: "M1",
    filiere: "Génie logiciel",
    annee: "2025-2026",
    studentIds: ["s-lova", "s-mirana"],
  },
];

/**
 * Encadrement des projets académiques.
 *
 * L'observation de l'enseignant est **factuelle et non notée** : le cadrage
 * parle de « suivi pédagogique », pas d'évaluation. Une note transformerait
 * l'outil en carnet de correction, et le journal cesserait aussitôt d'être
 * honnête — personne n'écrit « je suis bloqué depuis trois jours » sous l'œil
 * de celui qui le notera.
 */
export const SUPERVISIONS: Supervision[] = [
  {
    projectId: "p-semis",
    teacherId: "t-randria",
    cohortId: "c-l3-gl",
    observation:
      "Le journal est tenu et lisible. Le blocage sur l'arbitrage des versions " +
      "est un vrai sujet de recherche, pas un défaut de méthode.",
    echeance: { libelle: "Rendu intermédiaire", date: ilYA(-14) },
  },
  {
    projectId: "p-supervision",
    teacherId: "t-randria",
    cohortId: "c-l3-gl",
    echeance: { libelle: "Démonstration en salle", date: ilYA(-21) },
  },
  {
    projectId: "p-design-system",
    teacherId: "t-randria",
    cohortId: "c-m1-gl",
    observation: "Rythme régulier. Le périmètre mériterait d'être resserré.",
  },
];
