-- L'historique IA est plafonné à vingt conversations par étudiant. Les
-- messages des conversations plus anciennes sont supprimés par cascade.

WITH classes AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY student_id
           ORDER BY updated_at DESC, created_at DESC
         ) AS rang
  FROM copilot_conversations
)
DELETE FROM copilot_conversations AS conversation
USING classes
WHERE conversation.id = classes.id
  AND classes.rang > 20;
