-- =====================================================================
-- M2 — une étape peut être explicitement bloquée.
--
-- Sans cet état, un rappel ne pouvait qu'inférer une difficulté d'après
-- l'inactivité. Le choix appartient à l'étudiant : une tâche simplement
-- longue n'est pas automatiquement un blocage.
-- =====================================================================

ALTER TABLE checklist_items
  ADD COLUMN IF NOT EXISTS bloque boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS checklist_items_bloques_idx
  ON checklist_items (project_id)
  WHERE bloque AND NOT fait;
