-- =====================================================================
-- Copilote IA — conversations privées par étudiant
--
-- Les échanges sont séparés par rôle afin qu'un étudiant puisse reprendre
-- une discussion de pilotage sans mélanger son entraînement de soutenance.
-- Ils sont supprimés avec le compte (ON DELETE CASCADE).
-- =====================================================================

CREATE TABLE copilot_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('pilotage', 'technique', 'soutenance')),
  author      text NOT NULL CHECK (author IN ('user', 'assistant')),
  content     text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 4000),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX copilot_messages_student_role_created_idx
  ON copilot_messages (student_id, role, created_at DESC);

CREATE TABLE copilot_usage (
  student_id  uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  jour        date NOT NULL DEFAULT current_date,
  compte      int NOT NULL DEFAULT 0,
  PRIMARY KEY (student_id, jour)
);
