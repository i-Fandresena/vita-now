-- =====================================================================
-- VITA'NOW — schéma initial
--
-- Dérivé de web/src/domain/soa.ts, lui-même dérivé de AURA_cadrage.md.
-- Les valeurs de statut, de niveau et de catégorie sont **celles du
-- cadrage, en français, telles qu'écrites**. Ne pas les traduire ni en
-- inventer d'autres : c'est ce qui garantit que la base, le code et le
-- document de référence parlent la même langue.
--
-- PostgreSQL 16+.
-- =====================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;     -- e-mails insensibles à la casse

-- ---------------------------------------------------------------------
-- Recherche plein texte française
--
-- Pourquoi pas pgvector : le corpus se compte en dizaines de documents,
-- pas en millions. La FTS de PostgreSQL y donne un résultat comparable
-- sans dépendance externe, sans coût par requête et sans risque de panne
-- réseau pendant une démonstration. (Et l'API Claude n'expose pas
-- d'endpoint d'embeddings — voir HANDOFF §1.)
--
-- La configuration `fr` ajoute `unaccent` devant le stemmer français :
-- sans elle, « modele » ne trouve pas « modèle », ce qui est le cas le
-- plus fréquent quand on tape vite sur un téléphone.
-- ---------------------------------------------------------------------
DROP TEXT SEARCH CONFIGURATION IF EXISTS fr;
CREATE TEXT SEARCH CONFIGURATION fr (COPY = french);
ALTER TEXT SEARCH CONFIGURATION fr
  ALTER MAPPING FOR hword, hword_part, word
  WITH unaccent, french_stem;

-- Enveloppe immuable autour de `array_to_string`.
--
-- Une colonne générée exige une expression IMMUTABLE, et `array_to_string`
-- est déclarée STABLE — non pas parce qu'elle dépend de quoi que ce soit,
-- mais parce que sa signature est polymorphe (`anyarray`) : pour un type
-- d'élément quelconque, la fonction de sortie pourrait ne pas être immuable.
--
-- Ici l'argument est concrètement `text[]`, et concaténer du texte avec un
-- séparateur ne dépend d'aucun réglage de session. La déclarer IMMUTABLE est
-- donc exact, et non un contournement : c'est la restriction du type qui
-- rétablit la propriété que le polymorphisme avait fait perdre.
CREATE OR REPLACE FUNCTION texte_liste(text[])
  RETURNS text
  LANGUAGE sql
  IMMUTABLE STRICT PARALLEL SAFE
AS $$ SELECT array_to_string($1, ' ') $$;

-- ---------------------------------------------------------------------
-- Domaines énumérés — repris à la lettre du cadrage
-- ---------------------------------------------------------------------
CREATE TYPE niveau          AS ENUM ('L1', 'L2', 'L3', 'M1', 'M2');
CREATE TYPE disponibilite   AS ENUM ('Soirs', 'Week-ends', 'Vacances', 'Temps plein');
CREATE TYPE auth_provider   AS ENUM ('email', 'google', 'github', 'universite');
CREATE TYPE projet_statut   AS ENUM ('Idée', 'En cours', 'En pause', 'Abandonné', 'Terminé');
CREATE TYPE projet_type     AS ENUM ('Académique', 'Personnel', 'Startup', 'Open source', 'Recherche');
CREATE TYPE difficulte      AS ENUM ('Découverte', 'Intermédiaire', 'Ambitieux');
CREATE TYPE journal_nature  AS ENUM ('Décision', 'Erreur', 'Solution', 'Architecture', 'Apprentissage');
CREATE TYPE forum_categorie AS ENUM ('Java', 'PHP', 'React', 'IA', 'BDD', 'Réseau');
CREATE TYPE fiche_nature    AS ENUM ('mémoire', 'projet');
CREATE TYPE fiche_etat      AS ENUM ('terminé', 'arrêté');
CREATE TYPE point_motif     AS ENUM ('projet-termine', 'pair-aide', 'solution-partagee', 'erreur-documentee');
CREATE TYPE opportunite_nature AS ENUM ('Projet', 'Stage', 'Alternance');
CREATE TYPE mentor_statut   AS ENUM ('L3', 'M1', 'M2', 'Alumni');
CREATE TYPE demande_statut  AS ENUM ('en attente', 'en cours', 'résolu');
CREATE TYPE notif_nature    AS ENUM ('reprise', 'forum', 'challenge', 'opportunite', 'signal', 'mentorat');
CREATE TYPE risque_abandon  AS ENUM ('Faible', 'Modéré', 'Élevé');

-- =====================================================================
-- M1 — Comptes et profils étudiants
-- =====================================================================

CREATE TABLE students (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom             text NOT NULL,
  initiales       text NOT NULL,
  universite      text NOT NULL,
  niveau          niveau NOT NULL,
  filiere         text NOT NULL,
  interets        text[] NOT NULL DEFAULT '{}',
  disponibilites  disponibilite[] NOT NULL DEFAULT '{}',
  objectifs       text NOT NULL DEFAULT '',
  -- M18 — un étudiant avancé peut devenir mentor.
  mentor          boolean NOT NULL DEFAULT false,
  promo           text NOT NULL,
  cree_le         timestamptz NOT NULL DEFAULT now()
);

-- L'authentification est séparée du profil : le cadrage prévoit quatre
-- fournisseurs (M1), et une même personne peut en cumuler plusieurs.
-- `mot_de_passe` est nullable — un compte Google n'en a pas.
CREATE TABLE accounts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  email         citext,
  provider      auth_provider NOT NULL,
  -- Empreinte argon2id. Jamais le mot de passe lui-même, jamais un hash
  -- rapide (bcrypt/sha) : ce sont des comptes étudiants réutilisés ailleurs.
  mot_de_passe  text,
  cree_le       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, email)
);
CREATE INDEX ON accounts (student_id);

-- E3 — « technos maîtrisées avec niveau ». Table à part et non tableau :
-- E5 (Talent Discovery) filtre dessus, et E9 valide une compétence
-- précise par une entreprise nommée.
CREATE TABLE skills (
  student_id   uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  nom          text NOT NULL,
  -- 1 découverte · 2 pratiqué · 3 à l'aise · 4 avancé. Jamais affiché en score.
  maitrise     smallint NOT NULL CHECK (maitrise BETWEEN 1 AND 4),
  -- E9 — validation formelle par une entreprise.
  validee_par  text,
  PRIMARY KEY (student_id, nom)
);

-- =====================================================================
-- M2 — Projets
-- =====================================================================

CREATE TABLE projects (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id          uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  nom               text NOT NULL,
  description       text NOT NULL DEFAULT '',
  type              projet_type NOT NULL,
  statut            projet_statut NOT NULL DEFAULT 'Idée',
  technos           text[] NOT NULL DEFAULT '{}',
  objectif          text NOT NULL DEFAULT '',
  duree_semaines    smallint NOT NULL DEFAULT 4,
  debut             date NOT NULL DEFAULT current_date,
  -- Renseignée quand le projet est Terminé ou Abandonné.
  fin               date,
  difficulte        difficulte NOT NULL DEFAULT 'Intermédiaire',
  -- Pilote la détection d'inactivité (M7). Maintenue par l'API à chaque
  -- écriture au journal, pas calculée à la lecture : le seuil des 7 jours
  -- doit pouvoir se requêter sans parcourir tout le journal.
  derniere_activite timestamptz NOT NULL DEFAULT now(),
  -- M15 — « les projets abandonnés restent visibles avec leur état
  -- (%, raison) ». Le pourcentage vient du journal, jamais d'une saisie.
  raison_abandon    text,
  public            boolean NOT NULL DEFAULT true,
  -- M17 — présentation, et M4 — dépôt Git rattaché.
  -- En JSONB : ces deux objets sont toujours lus en entier avec le projet
  -- et ne sont jamais filtrés champ par champ. Les normaliser produirait
  -- quatre tables pour zéro requête supplémentaire.
  presentation      jsonb,
  depot             jsonb,
  cree_le           timestamptz NOT NULL DEFAULT now(),

  -- Un projet arrêté sans raison n'aide personne à le reprendre : c'est
  -- exactement ce que M15 demande d'éviter.
  CONSTRAINT abandon_motive
    CHECK (statut <> 'Abandonné' OR raison_abandon IS NOT NULL)
);
CREATE INDEX ON projects (owner_id);
CREATE INDEX ON projects (statut);
CREATE INDEX ON projects (derniere_activite);   -- M7 — balayage d'inactivité

-- =====================================================================
-- M3 — Journal de progression
-- =====================================================================

CREATE TABLE journal_entries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  nature      journal_nature NOT NULL,
  titre       text NOT NULL,
  corps       text NOT NULL,
  date        timestamptz NOT NULL DEFAULT now(),
  -- Une entrée peut marquer une étape franchie du projet.
  jalon       text
);
CREATE INDEX ON journal_entries (project_id, date DESC);

-- =====================================================================
-- M5 — Résumé intelligent
--
-- Table à part, et non colonnes sur `projects` : le résumé est produit par
-- l'API Claude, il coûte un appel réseau et de l'argent. Le stocker avec sa
-- date et l'empreinte du journal dont il dérive permet de ne le régénérer
-- que lorsque le journal a réellement changé.
-- =====================================================================

CREATE TABLE project_summaries (
  project_id        uuid PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  objectif          text NOT NULL,
  fait              text[] NOT NULL DEFAULT '{}',
  reste_a_faire     text[] NOT NULL DEFAULT '{}',
  derniere_activite text NOT NULL,
  risque            risque_abandon NOT NULL,
  -- Le cadrage exige le motif du risque : sans lui l'indication est opaque.
  pourquoi          text NOT NULL,
  -- Empreinte du journal ayant servi à produire ce résumé. Si elle diffère
  -- de l'empreinte courante, le résumé est périmé et sera régénéré.
  source_hash       text NOT NULL,
  genere_le         timestamptz NOT NULL DEFAULT now()
);

-- =====================================================================
-- Les fiches — la Mémoire IA
--
-- DÉCISION STRUCTURANTE. Avant la base, deux corpus coexistaient sans
-- aucune clé commune : les « fragments » de la recherche d'un côté, les
-- projets de l'espace étudiant de l'autre. Une fiche et un projet étaient
-- deux univers disjoints.
--
-- Ici, `project_id` les relie : **une fiche naît d'un projet**. C'est la
-- thèse du produit rendue littérale — ce qu'on a vécu devient ce qui sert
-- à quelqu'un d'autre.
--
-- La colonne reste nullable, et c'est délibéré : un mémoire déposé par un
-- ancien étudiant, ou importé par l'école, n'a pas de projet correspondant
-- dans l'outil. Le rendre obligatoire interdirait le cas que la lettre de
-- Soa décrit en premier — le mémoire terminé que personne ne retrouve.
-- =====================================================================

CREATE TABLE fiches (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id    uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  -- Nullable : un mémoire importé n'a pas de projet dans l'outil.
  project_id   uuid REFERENCES projects(id) ON DELETE SET NULL,

  titre        text NOT NULL,
  -- Ce que la fiche promet d'expliquer. Sert de `why` dans les résultats
  -- de recherche : sans cette phrase, un résultat demande un acte de foi.
  promesse     text NOT NULL,

  -- Origine — d'où vient ce savoir.
  oeuvre       text NOT NULL,
  nature       fiche_nature NOT NULL,
  annee        smallint NOT NULL,
  domaine      text NOT NULL,
  etat         fiche_etat NOT NULL,

  -- Le raisonnement, en prose. C'est le cœur : jamais du code brut.
  raisonnement text NOT NULL,
  -- Choix d'architecture (décision + justification), impasses, pistes.
  -- En JSONB : toujours lus avec la fiche, jamais filtrés séparément.
  choix        jsonb NOT NULL DEFAULT '[]'::jsonb,
  impasses     text[] NOT NULL DEFAULT '{}',
  pistes       text[] NOT NULL DEFAULT '{}',
  extrait      jsonb,

  cree_le      timestamptz NOT NULL DEFAULT now(),

  -- Index de recherche, maintenu par la base elle-même.
  --
  -- Colonne générée plutôt que déclencheur : impossible d'oublier de la
  -- rafraîchir après une écriture, et impossible qu'elle diverge du
  -- contenu. Les poids disent l'importance relative — un mot du titre
  -- pèse plus qu'un mot enfoui dans le raisonnement.
  recherche tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('fr', coalesce(titre, '')),        'A') ||
    setweight(to_tsvector('fr', coalesce(promesse, '')),     'B') ||
    setweight(to_tsvector('fr', coalesce(oeuvre, '')),       'C') ||
    setweight(to_tsvector('fr', coalesce(raisonnement, '')), 'D') ||
    setweight(to_tsvector('fr', texte_liste(impasses)), 'D')
  ) STORED
);
CREATE INDEX fiches_recherche_idx ON fiches USING gin (recherche);
CREATE INDEX ON fiches (author_id);
CREATE INDEX ON fiches (project_id);

-- Le geste qui déclenche le retour à l'auteur : déclarer qu'une fiche a
-- servi. C'est la boucle qui répond au second échec de la lettre — l'effort
-- terminé qui ne sert jamais à personne.
CREATE TABLE fiche_uses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fiche_id    uuid NOT NULL REFERENCES fiches(id) ON DELETE CASCADE,
  -- Qui s'en est servi. Nullable : la déclaration doit rester possible
  -- même hors session, sinon on perd le signal pour protéger une donnée
  -- que personne ne réclame.
  student_id  uuid REFERENCES students(id) ON DELETE SET NULL,
  -- Ce que ça a débloqué, dans les mots de la personne aidée.
  a_servi_a   text NOT NULL,
  date        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON fiche_uses (fiche_id, date DESC);

-- =====================================================================
-- M8 — Forum
-- =====================================================================

CREATE TABLE forum_threads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auteur_id   uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  categorie   forum_categorie NOT NULL,
  titre       text NOT NULL,
  corps       text NOT NULL,
  date        timestamptz NOT NULL DEFAULT now(),
  -- « partage de ressources par projet »
  ressource   jsonb,
  recherche tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('fr', coalesce(titre, '')), 'A') ||
    setweight(to_tsvector('fr', coalesce(corps, '')), 'B')
  ) STORED
);
CREATE INDEX forum_recherche_idx ON forum_threads USING gin (recherche);
CREATE INDEX ON forum_threads (categorie, date DESC);

CREATE TABLE forum_replies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   uuid NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
  auteur_id   uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  corps       text NOT NULL,
  date        timestamptz NOT NULL DEFAULT now(),
  -- M18 — une réponse de mentor est signalée comme telle.
  de_mentor   boolean NOT NULL DEFAULT false
);
CREATE INDEX ON forum_replies (thread_id, date);

-- La réponse qui résout le sujet. Contrainte différée en table séparée
-- plutôt qu'en colonne sur `forum_threads` : une référence circulaire
-- entre deux tables complique toute insertion.
ALTER TABLE forum_threads
  ADD COLUMN resolu_par uuid REFERENCES forum_replies(id) ON DELETE SET NULL;

-- =====================================================================
-- M10 — Challenges  ·  E7 — sponsorisés
-- =====================================================================

CREATE TABLE challenges (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titre        text NOT NULL,
  description  text NOT NULL DEFAULT '',
  duree_jours  smallint NOT NULL,
  techno       text NOT NULL,
  debut        date NOT NULL,
  sponsor_id   uuid,          -- FK ajoutée après la table companies
  recompense   text
);

CREATE TABLE challenge_participants (
  challenge_id uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  student_id   uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  -- « suivi de progression hebdomadaire » — une case par semaine.
  semaines     boolean[] NOT NULL DEFAULT '{}',
  rejoint_le   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (challenge_id, student_id)
);

-- =====================================================================
-- M14 — Validation d'idée
-- =====================================================================

CREATE TABLE ideas (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auteur_id  uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  titre      text NOT NULL,
  corps      text NOT NULL,
  date       timestamptz NOT NULL DEFAULT now(),
  -- Renseigné si l'idée est devenue un projet.
  projet_id  uuid REFERENCES projects(id) ON DELETE SET NULL
);

-- Table plutôt que deux tableaux d'identifiants : c'est ce qui empêche
-- qu'une même personne vote deux fois, et permet de changer d'avis.
CREATE TABLE idea_votes (
  idea_id     uuid NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  student_id  uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  sens        text NOT NULL CHECK (sens IN ('pour', 'reserve')),
  date        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (idea_id, student_id)
);

CREATE TABLE idea_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id     uuid NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  auteur_id   uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  corps       text NOT NULL,
  date        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON idea_comments (idea_id, date);

-- =====================================================================
-- M18 — Mentorat
-- =====================================================================

CREATE TABLE mentor_profiles (
  student_id    uuid PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  domaines      text[] NOT NULL DEFAULT '{}',
  statut        mentor_statut NOT NULL,
  presentation  text NOT NULL DEFAULT '',
  disponible    boolean NOT NULL DEFAULT true
);

CREATE TABLE mentor_requests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id   uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  student_id  uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  blocage     text NOT NULL,
  date        timestamptz NOT NULL DEFAULT now(),
  statut      demande_statut NOT NULL DEFAULT 'en attente',
  CONSTRAINT pas_son_propre_mentor CHECK (mentor_id <> student_id)
);
CREATE INDEX ON mentor_requests (mentor_id, date DESC);

CREATE TABLE mentor_replies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  uuid NOT NULL REFERENCES mentor_requests(id) ON DELETE CASCADE,
  auteur_id   uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  corps       text NOT NULL,
  date        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON mentor_replies (request_id, date);

-- =====================================================================
-- M12 — Points  ·  M11 — Classements
--
-- Journal d'événements, jamais un compteur. Un total se recalcule ;
-- l'historique, lui, dit *pourquoi* — et SPEC §2bis exige que ces
-- mécaniques restent explicables plutôt que d'être un score nu.
-- =====================================================================

CREATE TABLE points (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  motif       point_motif NOT NULL,
  detail      text NOT NULL,
  date        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON points (student_id, date DESC);

CREATE TABLE badges (
  id           text PRIMARY KEY,
  nom          text NOT NULL,
  description  text NOT NULL
);

CREATE TABLE student_badges (
  student_id  uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  badge_id    text NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  obtenu_le   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, badge_id)
);

-- =====================================================================
-- Universités — la branche du schéma d'architecture
--
-- RÈGLE STRUCTURANTE : **aucune note n'est saisissable.** Le cadrage parle
-- de suivi pédagogique, pas d'évaluation. Un journal relu comme une copie
-- cesse d'être honnête, et un journal malhonnête ne sert plus à reprendre
-- un projet. Il n'y a donc aucune colonne « note » ici, et il ne doit pas
-- y en avoir : l'enseignant voit qui décroche et depuis quand, il n'évalue pas.
-- =====================================================================

CREATE TABLE teachers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom          text NOT NULL,
  initiales    text NOT NULL,
  universite   text NOT NULL,
  departement  text NOT NULL
);

CREATE TABLE cohorts (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  libelle   text NOT NULL,
  niveau    niveau NOT NULL,
  filiere   text NOT NULL,
  annee     text NOT NULL
);

CREATE TABLE cohort_students (
  cohort_id   uuid NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  student_id  uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  PRIMARY KEY (cohort_id, student_id)
);

CREATE TABLE teacher_cohorts (
  teacher_id  uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  cohort_id   uuid NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  PRIMARY KEY (teacher_id, cohort_id)
);

CREATE TABLE supervisions (
  project_id   uuid PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
  teacher_id   uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  cohort_id    uuid NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
  -- Observation de l'enseignant — factuelle. Ce n'est pas une note, et la
  -- distinction est le sujet même de cette section.
  observation  text,
  echeance     jsonb
);

-- =====================================================================
-- Module Entreprise (E1–E10)
-- =====================================================================

CREATE TABLE companies (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom                  text NOT NULL,
  secteur              text NOT NULL,
  technos_recherchees  text[] NOT NULL DEFAULT '{}',
  -- « stagiaires, alternants, juniors »
  profils_recherches   text[] NOT NULL DEFAULT '{}',
  presentation         text NOT NULL DEFAULT ''
);

ALTER TABLE challenges
  ADD CONSTRAINT challenges_sponsor_fk
  FOREIGN KEY (sponsor_id) REFERENCES companies(id) ON DELETE SET NULL;

-- M13 / E2 — « Entreprises **ou étudiants** publient ». L'émetteur est
-- l'un ou l'autre, jamais imposé, et jamais les deux.
CREATE TABLE opportunities (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid REFERENCES companies(id) ON DELETE CASCADE,
  student_id   uuid REFERENCES students(id) ON DELETE CASCADE,
  titre        text NOT NULL,
  description  text NOT NULL DEFAULT '',
  technos      text[] NOT NULL DEFAULT '{}',
  duree_mois   smallint NOT NULL,
  profil       text NOT NULL DEFAULT '',
  nature       opportunite_nature NOT NULL,
  publiee_le   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT un_seul_emetteur CHECK (
    (company_id IS NOT NULL AND student_id IS NULL) OR
    (company_id IS NULL AND student_id IS NOT NULL)
  )
);

-- =====================================================================
-- M20 — Notifications
-- =====================================================================

CREATE TABLE notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  nature      notif_nature NOT NULL,
  titre       text NOT NULL,
  corps       text NOT NULL DEFAULT '',
  date        timestamptz NOT NULL DEFAULT now(),
  lu          boolean NOT NULL DEFAULT false,
  -- Route à ouvrir au clic — le cadrage exige des notifications actionnables.
  cible       text
);
CREATE INDEX ON notifications (student_id, lu, date DESC);

-- « Canaux : email, push mobile, notification web ». Le web est le seul
-- qui fonctionne sans service externe ; les deux autres sont des
-- préférences tant qu'aucun expéditeur n'est branché.
CREATE TABLE channel_prefs (
  student_id  uuid PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  web         boolean NOT NULL DEFAULT true,
  email       boolean NOT NULL DEFAULT false,
  push        boolean NOT NULL DEFAULT false
);

COMMIT;
