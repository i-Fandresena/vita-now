-- Cycle de vie du compte étudiant : une désactivation conserve les données et
-- peut être annulée par une reconnexion ; une suppression retire la ligne
-- student et déclenche les cascades déjà définies par le schéma.

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS desactive_le timestamptz;

CREATE INDEX IF NOT EXISTS students_actifs_idx
  ON students (id)
  WHERE desactive_le IS NULL;
