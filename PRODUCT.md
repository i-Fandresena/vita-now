# PRODUCT.md — Aura++ (SOA)

> Ce fichier cadre tout le développement du hackathon. Claude Code, Impeccable, et tout agent doivent le lire avant toute génération de code ou d'interface. Toute fonctionnalité, tout écran, toute animation qui contredit ce document doit être refusé ou signalé, même si demandé rapidement en cours de route.

---

## 1. Contexte (à ne jamais perdre de vue)

Hackathon 24h, ENI Fianarantsoa. Sujet : une lettre fictive ("Soa") qui décrit deux échecs distincts :
1. **L'abandon** — un effort s'arrête vers le 3e-4e jour, faute de signal de progression.
2. **La disparition** — un effort terminé (un mémoire académique) ne sert jamais à personne, faute d'être retrouvé au bon moment.

La lettre **rejette explicitement** deux catégories de solutions :
- "Un nouveau GitHub ou un Notion revisité" (outils de stockage/organisation de plus)
- Les mécaniques de motivation qu'elle a déjà testées et qui ont échoué : *"pas de streak à casser, pas de score, pas de niveau suivant"*

**Toute proposition de score, streak, leaderboard, badge, ou message de motivation type Duolingo est un contre-sens vis-à-vis du sujet.** Ce n'est pas une question de goût, c'est écrit dans le texte source. Refuser ces patterns même si suggérés en cours de développement sous pression de temps.

---

## 2. Ce que Aura++ EST

Un produit, deux mécaniques, une seule infrastructure technique :

1. **Matching de blocage** — un étudiant bloqué (code, concept, question) obtient un fragment pertinent issu du corpus de l'école (mémoires, projets abandonnés) via recherche sémantique. Jamais le code brut copiable : le raisonnement, les choix, les impasses.
2. **Capsule de reprise** — à l'inactivité détectée sur un projet, génération d'une fiche factuelle (où j'en étais, ce qui bloquait, un micro-pas de 5-10 min) — silencieuse, non culpabilisante, sans notion de streak.
3. **Boucle de retour** — quand un fragment sert à quelqu'un d'autre, l'auteur original reçoit un signal factuel ("ton travail a aidé X sur Y"). C'est le seul "signal de progression" du produit, et il n'est ni un score ni une compétition.

## 2bis. Ce que Aura++ N'EST PAS

- ❌ Pas de leaderboard, pas de classement, pas de podium
- ❌ Pas de points, pas de badges, pas de niveaux
- ❌ Pas de messages motivationnels ("Ton futur toi te remerciera")
- ❌ Pas de gestion multi-projets en parallèle comme feature ("gérer plusieurs projets pour être plus productif" contredit le sujet)
- ❌ Pas de module entreprise/recrutement/CV dynamique dans le MVP (slide de vision uniquement, zéro ligne de code)
- ❌ Pas d'intégration GitHub/Gmail réelle dans le MVP (mock/roadmap slide uniquement)
- ❌ Pas d'app mobile native, pas d'extension VS Code fonctionnelle (roadmap slide uniquement)

---

## 3. Scope technique — Web only

**Une seule cible : web responsive.** Pas de natif, pas de build mobile, pas de packaging d'extension pendant le hackathon.

- Le jury voit la démo sur un écran/projecteur → une web app suffit à 100%.
- Responsive obligatoire (le layout doit tenir sur mobile si un membre du jury regarde sur son téléphone après coup), mais ce n'est **pas un axe de développement**, juste une contrainte CSS de base (Tailwind gère ça nativement).
- Mentionner en pitch (slide, pas code) : "V2 — extension VS Code pour capture en temps réel, app mobile pour les notifications."

### Stack

- **Frontend** : React + Vite, Tailwind CSS, shadcn/ui pour les composants de base
- **Backend** : Node/Express (ou FastAPI si plus rapide à générer) — API REST minimale
- **Base de données** : PostgreSQL + pgvector (pas de vector DB dédiée, cohérent avec les choix déjà faits sur d'autres projets)
- **IA** : Claude API pour extraction de connaissance, résumé, matching sémantique
- **Auth** : mock/minimal pour la démo, pas de vrai SSO
- **Déploiement** : local ou Vercel/Railway pour la démo — pas de scalabilité réelle à traiter en 24h, juste à mentionner en pitch

---

## 4. Direction visuelle — anti-références actives

**Ton** : sobre, feutré, sérieux. Jamais ludique. Zéro chrome de gamification.

**Palette** : sombre, cohérente avec le style "Midnight Executive" déjà utilisé sur d'autres projets (navy profond, accents discrets, pas de dégradés criards).

**Interdits explicites (à faire respecter par le detecteur de slop) :**
- Pas de dégradé violet/glassmorphism générique
- Pas de fond crème + serif haute-contraste + accent terracotta (look IA n°1)
- Pas de fond noir + accent acide générique (look IA n°2)
- Pas d'emoji-badge, pas de barre de progression façon jeu vidéo
- Pas de numérotation décorative (01/02/03) sauf si le contenu est réellement une séquence

**Écrans clés :**
1. **Accueil** : une seule barre de recherche, presque vide. Le vide est intentionnel.
2. **Carte "fragment retrouvé"** : origine, raisonnement, jamais le code brut en avant.
3. **Le moment du pitch** : notification de retour à l'auteur ("ton travail a aidé quelqu'un"). C'est l'instant émotionnel central de toute la démo — concentrer ici le meilleur de la finition visuelle et de l'animation, pas ailleurs.

**Budget d'animation** : un seul geste soigné (l'ouverture du fragment façon "dossier qui s'entrouvre") + la notification de retour. Tout le reste reste statique et net. Ne jamais décorer par défaut — chaque animation doit se justifier.

---

## 5. Intégration 3D — usage restreint, un seul moment

**Faisable et pertinent, mais avec discipline.** Le risque principal du 3D en hackathon : temps perdu en réglages de performance/lumière, rendu qui rame sur le poste du jury, ou décoration qui contredit le ton sobre du produit.

**Règle : un seul élément 3D, sur un seul écran, jamais en fond permanent.**

Candidat le plus pertinent : la scène d'ouverture du "fragment retrouvé" — un objet simple (dossier stylisé, ou fragment de code qui se déplie) en React Three Fiber, léger, sans texture lourde, qui renforce la métaphore centrale du produit (l'élan qui reprend forme). Pas de scène 3D sur l'écran d'accueil, pas de particules d'ambiance permanentes — ça contredirait la sobriété visée et risque de faire "IA générique tape-à-l'œil" plutôt que "produit premium".

**Stack recommandée** : React Three Fiber (déjà disponible directement dans l'environnement React, pas d'installation lourde), pas Spline (dépendance externe à un éditeur visuel, gain de temps nul en 24h) ni Three.js brut (plus verbeux que R3F pour ce besoin ponctuel).

**Fallback obligatoire** : si le rendu 3D prend plus de 45 min à stabiliser, basculer immédiatement sur une version SVG/CSS de la même métaphore (dossier qui s'ouvre en 2D). Le produit ne doit jamais dépendre du 3D pour fonctionner en démo — c'est un bonus, pas une fondation.

---

## 6. Skills à utiliser — ordre et rôle précis

**Ne pas empiler tous les skills de direction créative en parallèle** — un seul pilote esthétique à la fois pour éviter des tokens de design contradictoires.

| Ordre | Skill | Rôle | Commande |
|---|---|---|---|
| 1 | **Impeccable** | Pilote créatif principal — détecteur de slop actif, `DESIGN.md`/`PRODUCT.md` (ce fichier) comme source de vérité persistante | `npx impeccable install` puis `/impeccable init` (donner ce PRODUCT.md comme brief) |
| 2 | **shadcn (skill officiel)** | Couche d'exécution mécanique — composants corrects, pas de props hallucinées | voir `ui.shadcn.com/docs/skills` |
| 3 | **React Three Fiber** (usage manuel, pas de skill dédié nécessaire vu l'usage restreint) | Le seul élément 3D du produit (voir section 5) | — |
| 4 | **emilkowalski/skills — `review-animations` uniquement** | Audit final des 2-3 animations clés en fin de production, pas de génération de masse | `npx skills add emilkowalski/skills --skill review-animations --agent claude-code` |
| — | **frontend-design (Anthropic, déjà présent)** | Filet de sécurité conceptuel en arrière-plan, ne pas l'utiliser comme pilote actif en parallèle d'Impeccable | déjà disponible, pas d'installation |
| — | **ui-ux-pro-max-skill** | Volontairement écarté pour ce hackathon — redondant avec Impeccable, risque d'incohérence de tokens sous 24h | ne pas installer |

**Instruction explicite à Claude Code** : avant toute génération d'UI, relire ce PRODUCT.md et vérifier chaque proposition contre la section 2bis. En cas de doute sur une fonctionnalité ou un style, signaler explicitement le conflit plutôt que de trancher silencieusement.

---

## 7. Plan de match 24h (repères, pas un planning rigide)

- **H0–H1** : verrouillage du token system avec Impeccable (`/impeccable init` sur ce PRODUCT.md), scaffolding du projet (Vite + Tailwind + shadcn)
- **H1–H4** : pipeline d'extraction/matching sémantique (backend, pgvector, Claude API) — c'est le cœur technique risqué, à sécuriser en premier
- **H4–H8** : écran de recherche + carte "fragment retrouvé", données de démo (corpus de test : quelques mémoires/projets simulés ou réels)
- **H8–H12** : capsule de reprise (détection d'inactivité simulée pour la démo + génération de fiche)
- **H12–H16** : boucle de retour à l'auteur (le moment clé du pitch) + intégration 3D restreinte (avec fallback si dépassement de budget temps)
- **H16–H20** : passe `review-animations`, `/impeccable audit`, nettoyage, responsive check
- **H20–H24** : répétition du pitch, scénario de démo scripté (question réelle → matching → notification live), marge de sécurité

---

## 8. Ce qui va en slide de pitch, jamais en code

- Business plan / rentabilisation
- Module entreprise (score de fiabilité, talent discovery, marketplace, partenariats)
- Intégrations GitHub/Gmail réelles
- App mobile native, extension VS Code fonctionnelle
- "Dette de contexte" collective (métrique visible par filière) — bonne idée, mais V2

---

*Document de cadrage — à fournir tel quel à Impeccable (`/impeccable init`) et à relire par Claude Code avant toute session de génération de code ou d'interface.*
