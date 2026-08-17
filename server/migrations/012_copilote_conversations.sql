-- =====================================================================
-- Copilote IA — fils de discussion persistants
--
-- Les messages existaient déjà, regroupés uniquement par rôle. Cette
-- migration les conserve dans une conversation "Historique" par étudiant et
-- par rôle, puis impose qu'un message appartienne à un fil précis.
-- =====================================================================

CREATE TABLE IF NOT EXISTS copilot_conversations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('pilotage', 'technique', 'soutenance')),
  title       text NOT NULL DEFAULT 'Nouvelle discussion' CHECK (char_length(title) BETWEEN 1 AND 120),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE copilot_messages
  ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES copilot_conversations(id) ON DELETE CASCADE;

WITH anciennes_conversations AS (
  INSERT INTO copilot_conversations (student_id, role, title, created_at, updated_at)
  SELECT student_id, role, 'Historique', min(created_at), max(created_at)
  FROM copilot_messages
  WHERE conversation_id IS NULL
  GROUP BY student_id, role
  RETURNING id, student_id, role
)
UPDATE copilot_messages AS message
SET conversation_id = conversation.id
FROM anciennes_conversations AS conversation
WHERE message.student_id = conversation.student_id
  AND message.role = conversation.role
  AND message.conversation_id IS NULL;

ALTER TABLE copilot_messages
  ALTER COLUMN conversation_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS copilot_conversations_student_updated_idx
  ON copilot_conversations (student_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS copilot_messages_conversation_created_idx
  ON copilot_messages (conversation_id, created_at ASC);
