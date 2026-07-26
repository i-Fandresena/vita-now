# VITA'NOW — Mémoire Collective & Plateforme de Projets Étudiants

> **« Ne plus laisser disparaître le travail réel. »**  
> VITA'NOW est une plateforme conçue pour valoriser l'effort académique et personnel des étudiants de l'**ENI Fianarantsoa**. Elle combat l'abandon précoce des projets et la perte des connaissances techniques acquises lors des travaux universitaires.

---

🌐 **Déploiement Production** : [https://aura.icpp-conformite.cloud](https://aura.icpp-conformite.cloud)  
📦 **Dépôt GitHub** : [https://github.com/i-Fandresena/vita-now](https://github.com/i-Fandresena/vita-now)

---

## 🎯 Problématiques traitées

1. **L'abandon** : Les projets personnels s'arrêtent trop souvent au 3ᵉ ou 4ᵉ jour faute d'un signal clair de progression et de régularité.
2. **La disparition** : Les mémoires académiques et projets terminés dorment dans des cartons ou des clés USB sans servir aux étudiants des promotions suivantes qui font face aux mêmes difficultés.

VITA'NOW résout ces deux écueils grâce à un **journal de décisions**, des **capsules de reprise** et un **moteur de recherche dans le mémoire collectif**.

---

## ✨ Fonctionnalités Principales

### 🚀 1. Tableau de bord & Reprise Assistée
- **QG de l'étudiant** : Vue d'ensemble des projets en cours, rythme d'écriture hebdomadaire et statistiques.
- **Capsule de reprise** : Reprenez un projet en sommeil avec une action immédiate guidée en 15 minutes.
- **Journal de projet** : Consignez les jalons, les décisions d'architecture et les impasses documentées.

### 🧠 2. Mémoire Collective (Recherche IA & Fragments)
- **Base de connaissances mutualisée** : Recherche par mots-clés ou concepts dans les projets passés.
- **Fragments & Impasses** : Consultez des blocs de code réels, des choix d'architecture motivés et des erreurs résolues.

### 🏆 3. Classements & Système de Prix
- **Grand Prix VITA'NOW 2026** : Sélection automatique du **Meilleur Projet de l'Année** basée sur le score de maturité (jalons, entrées de journal, statut livré).
- **Lauréats par Domaine & Secteur** : Classements automatiques par filière (Génie logiciel, Données & IA, Réseaux, Systèmes).
- **Régularité & Entraide** : Valorisation de la constance et du soutien entre étudiants.

### 💼 4. Espace Entreprise & Talent Discovery
- **Passerelle Université – Entreprise** : Publication d'offres de projets, stages et alternances.
- **Validation de compétences** : Les entreprises peuvent valider officiellement des compétences démontrées par les étudiants sur des projets réels.

### 🔑 5. Authentification & Sécurité
- **Cryptage Argon2id** pour la protection des mots de passe.
- **Masquage / Démasquage du mot de passe** avec bouton œil interactif sur tous les formulaires.

---

## 🛠️ Stack Technique

- **Frontend** : React 19, TypeScript, Vite 8, TailwindCSS, Framer Motion, Lucide React icons.
- **Backend API** : Node.js (v22), Fastify 5, PostgreSQL avec Hachage Argon2.
- **Base de Données** : PostgreSQL 15+ (Extensions `citext`, `pgcrypto`, `unaccent`).
- **Serveur & Nginx** : Nginx 1.24, TLS Let's Encrypt (Certbot), Systemd.

---

## 🚀 Démarrage Rapide en Local

### 1. Prérequis
- **Node.js** v22+
- **npm** v10+
- *(Optionnel pour le mode API)* **PostgreSQL 15+**

---

### 2. Installation du projet

```bash
git clone https://github.com/i-Fandresena/vita-now.git
cd vita-now
```

---

### 3. Mode Démonstration (Standalone — Sans Base de Données)

Le frontend peut fonctionner de façon 100 % autonome avec un corpus local complet :

```bash
cd web
npm install
npm run dev
```

L'application est disponible immédiatement sur `http://localhost:5173`.

---

### 4. Mode Complète avec API & PostgreSQL

#### A. Initialisation de la Base de Données
```bash
sudo -u postgres psql -c "CREATE USER vitanow WITH PASSWORD 'vitanow_secret';"
sudo -u postgres psql -c "CREATE DATABASE vitanow OWNER vitanow;"
sudo -u postgres psql -d vitanow -f server/migrations/001_schema.sql
sudo -u postgres psql -d vitanow -f server/migrations/002_seed.sql
```

#### B. Configuration & Lancement du Serveur Backend
```bash
cd server
npm install
cp .env.example .env
# Renseigner DATABASE_URL=postgres://vitanow:vitanow_secret@localhost:5432/vitanow
npm run dev
```

#### C. Lancement du Frontend connecté à l'API
```bash
cd ../web
VITE_MODE_API=1 npm run dev
```

---

## 📁 Structure du Projet

```text
vita-now/
├── deploy/                  # Scripts et configurations de déploiement VPS (Nginx, Systemd)
├── server/                  # API Fastify, routes auth/etat/projets, migrations PostgreSQL
│   ├── migrations/          # Schémas SQL (001_schema.sql, 002_seed.sql)
│   └── src/                 # Code source TypeScript de l'API
└── web/                     # Application Frontend React 19 + Vite
    ├── src/
    │   ├── app/             # Routeur hash, Shell de navigation, SOA Store
    │   ├── data/            # Client HTTP & corpus de démonstration
    │   ├── domain/          # Modèle de domaine TypeScript
    │   ├── screens/         # Écrans (Dashboard, Projets, Mémoire, Profil, Classements)
    │   └── ui/              # Composants UI réutilisables (Button, Input, Layout)
    └── index.html
```

---

## 👨‍💻 Auteur & Crédits

Projet développé avec passion par **Fandresena** ([@i-Fandresena](https://github.com/i-Fandresena)) dans le cadre de la plateforme **VITA'NOW** pour l'ENI Fianarantsoa.

---
*Licence MIT — Libres d'innover et de transmettre.*
