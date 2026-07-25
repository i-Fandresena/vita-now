# Product_2.0.md — Aura++

> Single Source of Truth pour tout le développement.

## Vision
Aura++ transforme les efforts académiques en connaissances réutilisables. Notre objectif n'est pas de gérer des projets mais d'empêcher que les efforts disparaissent dans le silence.

## North Star Metric
Nombre de projets repris grâce à un fragment existant.

## Principes non négociables
- Toute fonctionnalité doit aider à reprendre ou transmettre un projet.
- Refuser toute fonctionnalité assimilable à GitHub/Notion/Trello.
- Refuser gamification : badges, points, streaks, classements.
- Privilégier la compréhension plutôt que la productivité.
- Une fonctionnalité incomplète est supprimée du MVP.

## Le problème
1. Les projets sont abandonnés.
2. Les projets terminés deviennent introuvables.
3. Les connaissances ne se transmettent pas.

## MVP
### 1. Matching de blocage
Recherche sémantique dans les mémoires/projets.
Retourne :
- raisonnement
- choix d'architecture
- erreurs
- pistes
Jamais de copie brute de code.

### 2. Capsule de reprise
Après inactivité :
- où j'en étais
- ce qui bloque
- prochaine action de 5-10 minutes

### 3. Boucle de retour
Lorsque le fragment aide quelqu'un :
notification factuelle à l'auteur.

## Happy Path
Recherche → Fragment retrouvé → Compréhension → Reprise du projet → Nouveau fragment → Réutilisation → Notification.

## UX
Sobre, silencieuse, premium.
Le vide est intentionnel.
Chaque animation doit servir le récit.

## Démo
Ouverture :
« Chaque année, des centaines de projets disparaissent. Aujourd'hui, nous allons en sauver un. »
Puis :
1. recherche
2. fragment retrouvé
3. résolution
4. notification à l'auteur

## Architecture
Frontend : React + Vite + Tailwind + shadcn/ui
Backend : Express ou FastAPI
DB : PostgreSQL + pgvector
IA : Claude API
Déploiement : Vercel/Railway ou local.

## Demo Mode
- Données préchargées
- Aucun écran vide
- Réponses IA déterministes
- Pas de dépendance critique Internet

## Roadmap V2
- GitHub
- Gmail
- VS Code
- CV dynamique
- Entreprises
- Mobile

## Règles Claude Code
Avant chaque génération :
1. Relire ce document.
2. Vérifier qu'aucune règle n'est violée.
3. Préférer la simplicité.
4. Si une proposition contredit la vision, la refuser explicitement.

## Checklist avant merge
- Vision respectée
- UX cohérente
- Démo fluide
- Temps de réponse <2 s
- Aucun élément de gamification
- Aucun écran inutile
