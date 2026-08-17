-- =====================================================================
-- Résumé IA — distinguer « en cours » de « fait » et « reste à faire »
--
-- Une tâche principale non cochée dont au moins une sous-tâche est cochée
-- est « en cours », pas « reste à faire » — voir resume.ts (parRegles,
-- promptSysteme).
-- =====================================================================

ALTER TABLE project_summaries
  ADD COLUMN IF NOT EXISTS en_cours text[] NOT NULL DEFAULT '{}';
