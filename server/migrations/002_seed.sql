-- =====================================================================
-- VITA'NOW — corpus de démonstration
--
-- Idempotent : réexécutable sans doublon (TRUNCATE puis insertion).
-- Ne jamais lancer sur une base contenant de vraies données.
--
-- Le contenu est technique et vrai : un jury ouvre une fiche et lit le
-- raisonnement. Du faux-texte se repère en dix secondes et discrédite
-- tout le reste.
-- =====================================================================

BEGIN;

TRUNCATE
  students, accounts, skills, projects, journal_entries, project_summaries,
  fiches, fiche_uses, forum_threads, forum_replies, challenges,
  challenge_participants, ideas, idea_votes, idea_comments, mentor_profiles,
  mentor_requests, mentor_replies, points, badges, student_badges,
  teachers, cohorts, cohort_students, teacher_cohorts, supervisions,
  companies, opportunities, notifications, channel_prefs
RESTART IDENTITY CASCADE;

-- ── Étudiants ────────────────────────────────────────────────────────
INSERT INTO students (id, nom, initiales, universite, niveau, filiere, interets, disponibilites, objectifs, mentor, promo) VALUES
  ('11111111-1111-4111-8111-111111111111', 'Soa Rakotoarisoa', 'SR', 'ENI Fianarantsoa', 'M1', 'Génie logiciel',
   ARRAY['Applications hors ligne','Bases de données'], ARRAY['Soirs','Week-ends']::disponibilite[],
   'Terminer un projet du début à la fin, une fois.', false, '2026'),
  ('22222222-2222-4222-8222-222222222222', 'Hery Randrianasolo', 'HR', 'ENI Fianarantsoa', 'M2', 'Génie logiciel',
   ARRAY['Architecture','Java'], ARRAY['Week-ends']::disponibilite[],
   'Encadrer des plus jeunes sur des projets réels.', true, '2025'),
  ('33333333-3333-4333-8333-333333333333', 'Fanjaniaina Rabe', 'FR', 'ENI Fianarantsoa', 'L3', 'Réseaux',
   ARRAY['Réseau','Sécurité'], ARRAY['Soirs']::disponibilite[],
   'Comprendre ce que je déploie avant de le déployer.', false, '2027'),
  ('44444444-4444-4444-8444-444444444444', 'Miora Andrianina', 'MA', 'ENI Fianarantsoa', 'M2', 'Données',
   ARRAY['IA','Python'], ARRAY['Temps plein']::disponibilite[],
   'Publier un modèle que quelqu''un d''autre puisse réentraîner.', true, '2025');

INSERT INTO channel_prefs (student_id) SELECT id FROM students;

INSERT INTO skills (student_id, nom, maitrise, validee_par) VALUES
  ('11111111-1111-4111-8111-111111111111', 'TypeScript', 3, NULL),
  ('11111111-1111-4111-8111-111111111111', 'PostgreSQL', 2, NULL),
  ('22222222-2222-4222-8222-222222222222', 'Java', 4, 'Orange Madagascar'),
  ('22222222-2222-4222-8222-222222222222', 'Spring', 3, NULL),
  ('33333333-3333-4333-8333-333333333333', 'Réseau', 3, NULL),
  ('44444444-4444-4444-8444-444444444444', 'Python', 4, NULL);

-- ── Projets ──────────────────────────────────────────────────────────
INSERT INTO projects (id, owner_id, nom, description, type, statut, technos, objectif, duree_semaines, debut, fin, difficulte, derniere_activite, raison_abandon, public) VALUES
  ('a1111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111',
   'Carnet de terrain hors ligne',
   'Une application de saisie utilisable sans réseau, qui se synchronise au retour de la connexion.',
   'Académique', 'En cours', ARRAY['TypeScript','IndexedDB','PostgreSQL'],
   'Saisir sur le terrain sans réseau, sans jamais perdre une modification.',
   12, '2026-04-02', NULL, 'Ambitieux', now() - interval '9 days', NULL, true),

  ('a2222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333',
   'Supervision de liaison radio',
   'Tableau de bord de l''état des liaisons entre deux sites, avec alerte en cas de perte.',
   'Personnel', 'Abandonné', ARRAY['Python','SNMP'],
   'Voir une coupure avant que l''utilisateur ne la signale.',
   8, '2026-02-10', '2026-03-28', 'Intermédiaire', now() - interval '120 days',
   'Le matériel de test m''a été retiré au bout de six semaines. Le code lit déjà les compteurs SNMP et détecte une coupure ; il manque l''envoi de l''alerte et l''historique.',
   true),

  ('a3333333-3333-4333-8333-333333333333', '22222222-2222-4222-8222-222222222222',
   'Moteur de règles d''arbitrage',
   'Bibliothèque Java qui applique un jeu de règles métier déclaratives à un dossier.',
   'Académique', 'Terminé', ARRAY['Java','Spring'],
   'Remplacer 4000 lignes de si-alors par des règles lisibles par un métier.',
   16, '2025-09-15', '2026-01-20', 'Ambitieux', now() - interval '40 days', NULL, true),

  ('a4444444-4444-4444-8444-444444444444', '44444444-4444-4444-8444-444444444444',
   'Détection de doublons de dossiers',
   'Rapprochement de dossiers administratifs saisis plusieurs fois avec des orthographes différentes.',
   'Recherche', 'En pause', ARRAY['Python','PostgreSQL'],
   'Retrouver deux fiches de la même personne malgré les fautes de saisie.',
   10, '2026-05-05', NULL, 'Intermédiaire', now() - interval '21 days', NULL, true);

-- ── Journal ──────────────────────────────────────────────────────────
INSERT INTO journal_entries (project_id, nature, titre, corps, date, jalon) VALUES
  ('a1111111-1111-4111-8111-111111111111', 'Architecture',
   'Stockage local : IndexedDB plutôt que localStorage',
   'localStorage est synchrone et plafonne à 5 Mo. Une journée de saisie sur le terrain dépasse ce seuil, et chaque écriture bloquait le rendu pendant la frappe. IndexedDB est asynchrone et n''a pas cette limite.',
   now() - interval '38 days', 'Choix du stockage arrêté'),

  ('a1111111-1111-4111-8111-111111111111', 'Erreur',
   'Deux appareils, une modification perdue',
   'Les deux appareils modifient la même fiche hors ligne. À la synchronisation, le dernier arrivé écrase l''autre : la modification du premier disparaît sans que personne ne soit prévenu.',
   now() - interval '22 days', NULL),

  ('a1111111-1111-4111-8111-111111111111', 'Décision',
   'Horodatage seul : abandonné',
   'Comparer les dates de modification ne suffit pas — les horloges des appareils dérivent, et rien ne dit laquelle est juste. Je passe sur un compteur par appareil (horloge vectorielle) : on détecte le conflit au lieu de le trancher au hasard.',
   now() - interval '9 days', NULL),

  ('a2222222-2222-4222-8222-222222222222', 'Solution',
   'Lecture des compteurs SNMP',
   'Les compteurs d''erreurs de l''interface remontent bien via SNMP v2c. Une chute du débit se voit à la seconde.',
   now() - interval '135 days', 'Lecture opérationnelle'),

  ('a2222222-2222-4222-8222-222222222222', 'Erreur',
   'Faux positifs à chaque redémarrage',
   'Le redémarrage d''un équipement remet les compteurs à zéro, ce que le code interprétait comme une chute brutale. Il faut comparer les compteurs à leur valeur précédente et ignorer une remise à zéro.',
   now() - interval '124 days', NULL),

  ('a3333333-3333-4333-8333-333333333333', 'Architecture',
   'Les règles vivent en base, pas dans le code',
   'Les mettre en base permet à un utilisateur métier de les relire. Le coût est un chargement au démarrage et une validation stricte : une règle mal écrite ne doit pas partir en production.',
   now() - interval '160 days', 'Format des règles figé'),

  ('a3333333-3333-4333-8333-333333333333', 'Apprentissage',
   'Une règle ambiguë vaut mieux qu''une règle fausse',
   'Deux règles pouvaient s''appliquer au même dossier avec des résultats contraires. Plutôt que de choisir par ordre d''écriture, le moteur signale l''ambiguïté et laisse un humain trancher.',
   now() - interval '48 days', 'Livré'),

  ('a4444444-4444-4444-8444-444444444444', 'Décision',
   'Distance de Levenshtein : trop lente sur 200 000 dossiers',
   'La comparaison deux à deux est quadratique. Je passe par un index trigramme PostgreSQL pour ne comparer que les candidats plausibles.',
   now() - interval '21 days', NULL);

-- ── Fiches — la Mémoire IA ───────────────────────────────────────────
-- Deux fiches naissent d'un projet (project_id renseigné), une vient d'un
-- mémoire importé (project_id NULL) : c'est exactement le cas que la
-- nullabilité de la colonne doit permettre.
INSERT INTO fiches (author_id, project_id, titre, promesse, oeuvre, nature, annee, domaine, etat, raisonnement, choix, impasses, pistes) VALUES
  ('11111111-1111-4111-8111-111111111111', 'a1111111-1111-4111-8111-111111111111',
   'Synchroniser deux appareils hors ligne sans perdre de modification',
   'Pourquoi comparer les dates de modification ne suffit pas, et par quoi les remplacer.',
   'Carnet de terrain hors ligne', 'projet', 2026, 'Génie logiciel', 'arrêté',
   E'Deux appareils modifient la même fiche pendant qu''ils sont hors réseau. À la reconnexion, il faut décider laquelle des deux versions garder.\n\nLa première approche compare les dates de dernière modification et garde la plus récente. Elle est fausse pour une raison simple : les horloges des appareils dérivent. Un téléphone dont l''heure retarde de trois minutes perd systématiquement ses modifications, et personne ne s''en aperçoit — la donnée disparaît en silence.\n\nLa réponse est de renoncer à trancher automatiquement. Un compteur par appareil, incrémenté à chaque écriture, permet de savoir si deux versions descendent l''une de l''autre ou si elles ont divergé. Dans le premier cas on garde la plus récente sans risque. Dans le second, on ne choisit pas : on conserve les deux et on demande à l''utilisateur.',
   '[{"decision":"Horloges vectorielles plutôt qu''horodatage","rationale":"Détecte la divergence au lieu de la masquer."},{"decision":"IndexedDB plutôt que localStorage","rationale":"Asynchrone, et sans plafond à 5 Mo."}]'::jsonb,
   ARRAY['Comparer les dates de modification : les horloges dérivent, les pertes sont silencieuses','Verrou pessimiste sur la fiche : inutilisable hors ligne, c''est tout le sujet'],
   ARRAY['CRDT si les conflits deviennent trop fréquents pour être arbitrés à la main']),

  ('33333333-3333-4333-8333-333333333333', 'a2222222-2222-4222-8222-222222222222',
   'Détecter une coupure réseau sans crier au loup à chaque redémarrage',
   'Comment distinguer une vraie chute de débit d''une remise à zéro des compteurs.',
   'Supervision de liaison radio', 'projet', 2026, 'Réseaux', 'arrêté',
   E'Les compteurs d''erreurs d''une interface réseau ne donnent pas un débit : ils donnent un total depuis le démarrage de l''équipement. On en déduit un débit en comparant deux relevés successifs.\n\nLe piège est le redémarrage. Quand l''équipement redémarre, le compteur repart de zéro. La différence entre l''ancien relevé et le nouveau devient négative, et un code naïf l''interprète comme une chute brutale. Résultat : une alerte à chaque redémarrage, y compris ceux qui sont planifiés.\n\nLa correction tient en une ligne : si le nouveau relevé est inférieur au précédent, c''est un redémarrage, pas une chute. On repart du nouveau relevé sans produire d''alerte. Il faut aussi lire le compteur de temps depuis le démarrage pour confirmer.',
   '[{"decision":"SNMP v2c plutôt que v3","rationale":"Le parc ne supporte pas v3, et le réseau de supervision est isolé."}]'::jsonb,
   ARRAY['Alerter sur toute variation négative : une alerte par redémarrage, plus personne ne les lit'],
   ARRAY['Historiser les relevés pour distinguer une dégradation lente d''une coupure']),

  ('22222222-2222-4222-8222-222222222222', NULL,
   'Quand deux règles métier se contredisent, ne pas choisir',
   'Pourquoi l''ordre d''écriture est un mauvais arbitre, et ce qu''il faut faire à la place.',
   'Mémoire de fin d''études — moteur de règles d''arbitrage', 'mémoire', 2026, 'Génie logiciel', 'terminé',
   E'Un moteur de règles applique un jeu de conditions à un dossier. Tôt ou tard, deux règles s''appliquent au même dossier et donnent des résultats contraires.\n\nLa solution courante est de les ordonner : la première qui correspond gagne. C''est simple à implémenter et c''est un piège. L''ordre d''écriture n''a aucun sens métier — il reflète l''histoire du fichier, pas une intention. Une règle ajoutée en fin de fichier six mois plus tard change silencieusement le comportement de cas qui fonctionnaient.\n\nLe moteur livré ne tranche pas. Quand deux règles s''appliquent avec des résultats incompatibles, il produit une ambiguïté explicite, avec les deux règles en cause, et suspend le dossier pour arbitrage humain. Le nombre d''ambiguïtés est devenu la mesure de la qualité du jeu de règles.',
   '[{"decision":"Règles stockées en base","rationale":"Un utilisateur métier peut les relire sans lire du code."},{"decision":"Ambiguïté explicite plutôt qu''ordre de priorité","rationale":"L''ordre d''écriture ne porte aucune intention métier."}]'::jsonb,
   ARRAY['Priorité par ordre d''écriture : une règle ajoutée plus tard change des cas qui marchaient','Priorité numérique saisie à la main : personne ne sait quel nombre mettre au bout de trente règles'],
   ARRAY['Détection statique des paires de règles susceptibles de se recouvrir']);

-- ── Communauté ───────────────────────────────────────────────────────
INSERT INTO forum_threads (id, auteur_id, categorie, titre, corps, date) VALUES
  ('b1111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'BDD',
   'Index trigramme ou index plein texte pour du rapprochement de noms ?',
   'J''ai 200 000 dossiers et des noms saisis avec des fautes. Le plein texte trouve les mots exacts, le trigramme tolère les fautes mais coûte plus cher. Quelqu''un a tranché ?',
   now() - interval '5 days');

INSERT INTO forum_replies (thread_id, auteur_id, corps, date, de_mentor) VALUES
  ('b1111111-1111-4111-8111-111111111111', '44444444-4444-4444-8444-444444444444',
   'Trigramme (pg_trgm) pour la tolérance aux fautes, mais uniquement en pré-filtre : tu ramènes 50 candidats, puis tu affines avec une distance d''édition. Le tout-en-un est trop lent au-delà de 100 000 lignes.',
   now() - interval '4 days', true);

INSERT INTO ideas (id, auteur_id, titre, corps, date) VALUES
  ('c1111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333',
   'Un annuaire des pannes réseau déjà résolues à l''école',
   'À chaque panne, quelqu''un a déjà rencontré la même il y a deux ans. On repart toujours de zéro.',
   now() - interval '8 days');

INSERT INTO idea_votes (idea_id, student_id, sens) VALUES
  ('c1111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111', 'pour'),
  ('c1111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'pour');

INSERT INTO idea_comments (idea_id, auteur_id, corps, date) VALUES
  ('c1111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222',
   'C''est exactement ce que fait la recherche de fiches ici. Le déposer comme fiche plutôt que comme outil séparé ?',
   now() - interval '7 days');

INSERT INTO mentor_profiles (student_id, domaines, statut, presentation) VALUES
  ('22222222-2222-4222-8222-222222222222', ARRAY['Java','Architecture'], 'M2',
   'Je réponds surtout sur les questions de conception : découpage, règles métier, dette.'),
  ('44444444-4444-4444-8444-444444444444', ARRAY['Python','IA','Données'], 'M2',
   'Traitement de données et modèles. Je préfère les questions précises avec un jeu de données.');

-- ── Entreprise ───────────────────────────────────────────────────────
INSERT INTO companies (id, nom, secteur, technos_recherchees, profils_recherches, presentation) VALUES
  ('d1111111-1111-4111-8111-111111111111', 'Orange Madagascar', 'Télécommunications',
   ARRAY['Java','Python','Réseau'], ARRAY['Stagiaires','Alternants'],
   'Opérateur télécom. Nous recrutons sur projets réalisés, pas sur diplôme seul.');

INSERT INTO opportunities (company_id, titre, description, technos, duree_mois, profil, nature) VALUES
  ('d1111111-1111-4111-8111-111111111111', 'Supervision d''équipements — stage 4 mois',
   'Reprendre et industrialiser un outil de supervision de liaisons. Le prototype existe.',
   ARRAY['Python','SNMP'], 4, 'L3 ou M1, à l''aise en réseau', 'Stage');

-- ── Universités ──────────────────────────────────────────────────────
INSERT INTO teachers (id, nom, initiales, universite, departement) VALUES
  ('e1111111-1111-4111-8111-111111111111', 'Naina Ratsimbazafy', 'NR', 'ENI Fianarantsoa', 'Génie logiciel');

INSERT INTO cohorts (id, libelle, niveau, filiere, annee) VALUES
  ('f1111111-1111-4111-8111-111111111111', 'M1 Génie logiciel 2026', 'M1', 'Génie logiciel', '2026');

INSERT INTO teacher_cohorts VALUES
  ('e1111111-1111-4111-8111-111111111111', 'f1111111-1111-4111-8111-111111111111');

INSERT INTO cohort_students VALUES
  ('f1111111-1111-4111-8111-111111111111', '11111111-1111-4111-8111-111111111111');

INSERT INTO supervisions (project_id, teacher_id, cohort_id, observation, echeance) VALUES
  ('a1111111-1111-4111-8111-111111111111', 'e1111111-1111-4111-8111-111111111111',
   'f1111111-1111-4111-8111-111111111111',
   'Le journal est tenu et les impasses y sont écrites. Le sujet de la synchronisation est traité sérieusement.',
   '{"libelle":"Soutenance intermédiaire","date":"2026-08-15"}'::jsonb);

-- ── Reconnaissance ───────────────────────────────────────────────────
INSERT INTO badges (id, nom, description) VALUES
  ('premier-projet', 'Premier projet terminé', 'Un projet mené jusqu''au bout.'),
  ('documentation', 'Journal tenu', 'Dix entrées de journal sur un même projet.'),
  ('mentor', 'Mentor', 'A répondu à une demande d''aide.'),
  ('repris', 'Projet repris', 'A repris un projet arrêté par quelqu''un d''autre.');

INSERT INTO student_badges (student_id, badge_id) VALUES
  ('22222222-2222-4222-8222-222222222222', 'premier-projet'),
  ('22222222-2222-4222-8222-222222222222', 'mentor');

INSERT INTO points (student_id, motif, detail, date) VALUES
  ('22222222-2222-4222-8222-222222222222', 'projet-termine', 'Moteur de règles d''arbitrage', now() - interval '40 days'),
  ('44444444-4444-4444-8444-444444444444', 'pair-aide', 'Réponse sur le rapprochement de noms', now() - interval '4 days'),
  ('11111111-1111-4111-8111-111111111111', 'erreur-documentee', 'Modification perdue à la synchronisation', now() - interval '22 days');

-- Une fiche a déjà servi : sans cela, l'écran de retour à l'auteur est vide
-- au premier lancement, or c'est l'écran qui porte la thèse du produit.
INSERT INTO fiche_uses (fiche_id, student_id, a_servi_a, date)
SELECT f.id, '33333333-3333-4333-8333-333333333333',
       'Comprendre pourquoi ma synchro perdait des lignes',
       now() - interval '3 days'
FROM fiches f WHERE f.titre LIKE 'Synchroniser deux appareils%' LIMIT 1;

INSERT INTO notifications (student_id, nature, titre, corps, lu, cible) VALUES
  ('11111111-1111-4111-8111-111111111111', 'signal',
   'Ta fiche a servi à quelqu''un',
   'Fanjaniaina R. s''en est servi pour comprendre pourquoi sa synchro perdait des lignes.',
   false, '#/memoire'),
  ('11111111-1111-4111-8111-111111111111', 'reprise',
   'Carnet de terrain hors ligne',
   'Neuf jours sans entrée. La dernière portait sur le choix des horloges vectorielles.',
   false, '#/reprise');

COMMIT;
