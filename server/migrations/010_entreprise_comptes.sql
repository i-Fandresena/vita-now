-- =====================================================================
-- Comptes entreprise réels — hors cadrage, addition demandée directement.
--
-- Table séparée de `accounts` (et non `accounts.student_id` rendu nullable
-- + `company_id` ajouté) : `accounts` est déjà en production pour
-- l'authentification étudiant, et cette table dédiée évite d'y toucher.
-- `companies` garde son schéma actuel — un profil entreprise réel n'a besoin
-- d'aucune colonne supplémentaire.
-- =====================================================================

CREATE TABLE company_accounts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email         citext NOT NULL UNIQUE,
  mot_de_passe  text NOT NULL,
  cree_le       timestamptz NOT NULL DEFAULT now()
);
