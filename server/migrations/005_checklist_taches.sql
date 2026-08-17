-- =====================================================================
-- Checklist — sous-tâches et durée estimée
--
-- Un seul niveau de sous-tâches (pas imposé en base, l'interface s'en charge
-- — voir HANDOFF.md). `duree_heures` reste nullable : les lignes créées avant
-- cette migration n'en ont pas ; c'est le formulaire qui la rend obligatoire
-- pour toute nouvelle tâche/sous-tâche.
-- =====================================================================

ALTER TABLE checklist_items
  ADD COLUMN parent_id uuid REFERENCES checklist_items(id) ON DELETE CASCADE,
  ADD COLUMN duree_heures numeric(6,1);

CREATE INDEX checklist_items_parent_idx ON checklist_items (parent_id);
