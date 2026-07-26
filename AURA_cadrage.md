# SOA — Compte-rendu de brainstorm (Hackathon ENI, 24h)

## Contexte du sujet

Hackathon "Lettre venue du futur" : une lettre écrite par "Soa", un personnage fictif, qui raconte des cycles répétés de démarrage puis d'abandon de projets personnels (lecture, PHP, Java...), interrompus systématiquement autour du 3e-4e jour par manque de signal de progression. Un contre-exemple existe dans la lettre : un mémoire académique, terminé par obligation, mais jamais consulté par personne après coup — alors qu'un étudiant de première année pourrait buter sur exactement le même problème.

Deux échecs distincts sont explicitement nommés dans le texte :

1. L'abandon — l'effort s'arrête faute de signal de progression ("pas de streak, pas de score, pas de niveau suivant").
2. La disparition — l'effort terminé (le mémoire) ne sert jamais à personne car personne ne sait qu'il existe au bon moment.

La lettre exclut explicitement une classe de solutions : "tu penses peut-être à me refaire un nouveau GitHub ou un Notion revisité : j'en ai déjà testé des centaines. Ils dorment tous, eux aussi."

Contrainte de production : réalisation en 24h avec Claude Code et les skills Claude comme stack de développement.

## Liste condensée des fonctionnalités envisagées (brainstorm équipe)

1. Comptes et profils étudiants
- Authentification (email, Google, GitHub, université en option future)
- Profil : nom, université, niveau (L1-M2), filière, technos maîtrisées, centres d'intérêt, disponibilités, objectifs personnels

2. Gestion de projets
- Projet académique ou personnel (startup, app perso, open source, recherche)
- Champs : nom, description, type, technos, objectif, durée, dates, difficulté
- Statuts : Idée / En cours / En pause / Abandonné / Terminé

3. Journal de progression (Timeline)
- Historique horodaté par projet : décisions, erreurs, solutions trouvées, changements d'architecture, apprentissages

4. Intégration GitHub / GitLab
- Création automatique de repo, synchronisation commits, branches, historique
- Statistiques : fréquence de commits, progression estimée

5. Résumé intelligent par IA
- Analyse code + README + commits + tâches + discussions
- Génère : objectif, ce qui est fait, ce qui reste à faire, dernière activité, risque d'abandon

6. Assistant IA de reprise de projet
- Fonction "Reprendre mon projet" : rappelle dernière action, dernier blocage, propose les prochaines étapes concrètes
- Objectif affiché : "ne jamais recommencer de zéro"

7. Système anti-abandon
- Détection d'inactivité (ex. après 7 jours) → notification
- Messages de motivation façon Duolingo ("Ton futur toi te remerciera", "Tu étais déjà arrivé à 60%")
- Rappel intelligent orienté action ("Corrige cette erreur Java pendant 20 minutes")

8. Communauté étudiante
- Forum technique par catégorie (Java, PHP, React, IA, BDD, Réseau)
- Discussions et partage de ressources par projet

9. Groupes de progression
- Fonction "Trouver des compagnons" : recherche de coéquipiers par niveau/techno/objectif/disponibilité, matching automatique

10. Challenges de projets
- Ex. "Challenge Java 90 jours" avec participants, suivi de progression hebdomadaire

11. Leaderboard
- Classements académiques (meilleur projet par catégorie), par progression, par contribution

12. Système de mérite et récompenses
- Badges (premier projet terminé, 100 commits, mentor, projet repris, meilleure documentation)
- Points SOA gagnés en terminant un projet, aidant un pair, partageant une solution, documentant une erreur

13. Appels à projets / opportunités
- Entreprises ou étudiants publient des projets à réaliser (ex. app Flutter, 3 mois, possibilité de stage)

14. Validation d'idée avant projet
- La communauté vote et commente une idée avant que l'étudiant ne démarre

15. Projet abandonné / Renaissance
- Les projets abandonnés restent visibles publiquement avec leur état (%, raison d'abandon)
- D'autres étudiants peuvent les reprendre, continuer, améliorer

16. Portfolio automatique
- Génération auto d'un portfolio : projets terminés, technos, contributions, badges, vidéos

17. Présentation des projets
- Screenshots, vidéo de démo, documentation, architecture, lien Git — pour concours

18. Système de mentorat
- Étudiants avancés (L3, M1/M2, alumni) deviennent mentors : conseillent, répondent, guident

19. Analytics personnel étudiant
- Dashboard : projets commencés/terminés, progression moyenne, techno la plus utilisée

20. Notifications
- Canaux : email, push mobile, notification web
- Types : rappel projet, réponse forum, nouveau membre, challenge, opportunité

21. Application mobile (future)
- Suivi quotidien, notifications, communauté, progression, challenges

## Module Entreprise (monétisation envisagée)

Constat de départ du brainstorm : un CV classique (Java, React, Laravel, Git) ne dit pas si la personne termine ses projets, sait travailler en équipe, résout des problèmes, est motivée. SOA prétend révéler cela.

1. Profil entreprise : secteur, technologies recherchées, type de profils recherchés (stagiaires, alternants, juniors)
2. Publication d'opportunités : offres de projets réels (pas seulement des offres d'emploi classiques) avec durée, technos, profil recherché
3. Recrutement basé sur les preuves : l'entreprise voit projets terminés, projets abandonnés repris, contributions, technos maîtrisées avec niveau, score de documentation
4. Score de fiabilité projet ("Project Reliability Score") : indicateur d'engagement (pas d'intelligence) basé sur régularité, projets terminés, documentation, collaboration, entraide
5. Talent Discovery : une entreprise cherche des profils selon critères précis (ex. "5 étudiants Java, 3+ projets terminés, actifs 6 mois, disponibles stage") et reçoit un matching en %
6. Programme "Entreprise Mentor" : une entreprise sponsorise un challenge encadré par des développeurs seniors et observe les talents émerger
7. Challenges sponsorisés : ex. "Orange Challenge" avec prix (stage + accompagnement), visibilité et recrutement pour l'entreprise
8. Stage et recrutement direct : à la fin d'un projet, SOA propose une mise en relation avec des entreprises intéressées par ce type de profil
9. Validation des compétences par projet : une entreprise valide formellement un rôle tenu sur un projet (ex. "Backend Developer, validé par Entreprise ABC, 2026") comme preuve
10. Marketplace de projets étudiants : une entreprise peut découvrir des prototypes étudiants et proposer de les tester, financer, ou recruter le créateur

Avertissement noté dans le brainstorm lui-même : SOA ne doit pas devenir uniquement un "LinkedIn étudiant" — la philosophie affichée est que l'entreprise arrive après l'apprentissage, pas avant ; l'étudiant est valorisé parce qu'il a construit, appris et persévéré, pas parce qu'il sait vendre son profil.

## Architecture globale envisagée (schéma de principe)

SOA

Étudiants  
↓  
Projets + Progression + Communauté  
↓  
Mémoire IA SOA  
↙︎                ↘︎  
Entreprises        Universités  
Stages             Suivi pédagogique  
Emplois            Projets académiques  
Challenges         Classements

## Points de tension identifiés en interne (à date, non résolus)

- Le système anti-abandon (module 7) reprend des mécaniques de motivation (streaks, messages type Duolingo) que le texte source de la lettre décrit explicitement comme déjà expérimentées et inefficaces par le personnage principal.
- Le leaderboard et le système de points/badges (modules 11-12) réintroduisent un système de score et de niveaux, alors que la lettre insiste sur leur absence comme partie du problème vécu par le personnage.
- Le nombre total de modules (21 + 10 sous-modules entreprise) représente un périmètre large pour une réalisation en 24h.
- Le module Entreprise, bien que le brainstorm signale lui-même le risque de dérive vers un "LinkedIn étudiant", comporte 10 fonctionnalités distinctes (score de fiabilité, matching, marketplace, validation de compétences, etc.).
- Certaines fonctionnalités (groupes de progression, gestion multi-projets) pourraient encourager la dispersion entre plusieurs projets simultanés, un comportement que le personnage de la lettre décrit comme faisant partie de son propre cycle d'abandon.

## Note finale

Document produit pour analyse comparative par d'autres modèles IA — brainstorm brut de l'équipe, non filtré par recommandation externe.