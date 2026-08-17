-- =====================================================================
-- Réglages de plateforme — les leviers globaux du centre d'administration.
--
-- Hors cadrage : addition demandée directement (« maîtrise absolue sur
-- l'ensemble de la plateforme »). Une seule table clé/valeur plutôt qu'une
-- colonne par réglage : ces valeurs sont lues toutes ensemble, écrites une
-- par une depuis un formulaire, et la liste bougera encore. Une table à une
-- ligne et N colonnes imposerait une migration à chaque nouveau levier.
--
-- `valeur` est en JSONB et non en texte : `annonce` est un objet
-- (titre + corps), les autres sont des booléens. Un `text` obligerait à
-- sérialiser à la main des deux côtés.
-- =====================================================================

CREATE TABLE IF NOT EXISTS platform_settings (
  cle     text PRIMARY KEY,
  valeur  jsonb NOT NULL,
  maj_le  timestamptz NOT NULL DEFAULT now()
);

-- Les valeurs par défaut sont **aussi** codées dans `server/src/reglages.ts` :
-- une plateforme dont la table est vide doit démarrer ouverte, pas bloquée.
-- Ces insertions ne servent donc qu'à rendre l'état lisible en base.
INSERT INTO platform_settings (cle, valeur) VALUES
  ('inscriptionsOuvertes',           'true'::jsonb),
  ('inscriptionsEntrepriseOuvertes', 'true'::jsonb),
  ('copiloteActif',                  'true'::jsonb),
  ('maintenance',                    'false'::jsonb),
  ('annonce',                        'null'::jsonb)
ON CONFLICT (cle) DO NOTHING;
