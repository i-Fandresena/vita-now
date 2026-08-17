-- =====================================================================
-- Photo de profil et CV — hors cadrage, addition demandée directement.
--
-- Les fichiers eux-mêmes vivent sur le disque (server/uploads/{photos,cv}),
-- pas en base : ces colonnes ne portent que l'URL publique et, pour le CV,
-- le nom de fichier d'origine (utile pour l'attribut `download`).
-- =====================================================================

ALTER TABLE students
  ADD COLUMN photo_url text,
  ADD COLUMN cv_url text,
  ADD COLUMN cv_nom text;
