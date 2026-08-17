-- =====================================================================
-- Checklist de projet ("post-it")
--
-- Définie par l'étudiant à la création du projet. Volontairement séparée
-- de `avancement()` (M15) : ce dernier reste dérivé uniquement du journal
-- (une case cochée par l'étudiant lui-même n'est pas une preuve fiable
-- d'avancement — voir le commentaire sur `projects.raison_abandon` dans
-- 001_schema.sql). La checklist a donc sa propre jauge, affichée à part
-- ("X/Y étapes cochées"), qui ne touche jamais à `derniere_activite` ni au
-- calcul d'avancement.
-- =====================================================================

CREATE TABLE checklist_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  libelle     text NOT NULL,
  fait        boolean NOT NULL DEFAULT false,
  ordre       int NOT NULL DEFAULT 0,
  cree_le     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX checklist_items_project_idx ON checklist_items (project_id, ordre);
