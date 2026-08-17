-- =====================================================================
-- Calendrier personnel — événements et rappels.
--
-- Hors cadrage (aucun module ne le demande) : une addition, pas une brique
-- manquante. `type = 'Deadline'` porte à lui seul le sens de « deadline
-- critique » compté dans l'en-tête du calendrier — pas de booléen à côté.
-- =====================================================================

CREATE TYPE evenement_type AS ENUM ('Réunion', 'Deadline', 'Session', 'Autre');

CREATE TABLE events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  titre       text NOT NULL,
  date        date NOT NULL,
  -- NULL = toute la journée.
  heure       time,
  type        evenement_type NOT NULL DEFAULT 'Autre',
  project_id  uuid REFERENCES projects(id) ON DELETE SET NULL,
  cree_le     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON events (student_id, date);

-- Nouvelle nature de notification pour les rappels d'événement (M7 étendu,
-- voir server/src/rappels.ts).
ALTER TYPE notif_nature ADD VALUE 'evenement';
