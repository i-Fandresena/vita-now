-- =====================================================================
-- Résumé IA — provider Gemini + modération d'usage
--
-- `provider` remplace la valeur `source` codée en dur ("claude") renvoyée
-- jusqu'ici sur un hit de cache : sans elle, un résumé produit par Gemini
-- et mis en cache s'afficherait comme généré par Claude au chargement
-- suivant.
--
-- `ai_usage` compte les appels modèle réels (pas les lectures de cache) par
-- étudiant et par jour calendaire, pour tenir un usage modéré du plan
-- gratuit. En base plutôt qu'en mémoire : le service redémarre plusieurs
-- fois par jour en développement, un compteur en mémoire remis à zéro à
-- chaque redémarrage ne protégerait plus rien.
-- =====================================================================

ALTER TABLE project_summaries
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'journal';

CREATE TABLE ai_usage (
  student_id  uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  jour        date NOT NULL DEFAULT current_date,
  compte      int NOT NULL DEFAULT 0,
  PRIMARY KEY (student_id, jour)
);
