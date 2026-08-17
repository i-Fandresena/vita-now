-- =====================================================================
-- Lien optionnel entre un projet et l'appel à projet (M13, "opportunities",
-- nature = "Projet") qui l'a motivé.
--
-- `ON DELETE SET NULL`, pas CASCADE : la disparition d'un appel à projet ne
-- doit jamais effacer le projet qu'il a inspiré — juste rompre le lien.
-- =====================================================================

ALTER TABLE projects
  ADD COLUMN opportunite_id uuid REFERENCES opportunities(id) ON DELETE SET NULL;
