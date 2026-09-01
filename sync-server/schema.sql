-- sync-server/schema.sql
-- Une seule table. Le serveur ne sait rien du produit : ni utilisateurs, ni
-- habitudes, ni dates. Des octets, un horodatage qu'il compare sans le
-- comprendre, et un compteur.
CREATE TABLE IF NOT EXISTS lignes (
  espace     TEXT NOT NULL,
  kind       TEXT NOT NULL,
  id         TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  seq        INTEGER NOT NULL,
  blob       TEXT NOT NULL,
  PRIMARY KEY (espace, kind, id)
);

-- La seule requête chaude : « ce qui a changé depuis mon curseur ».
CREATE INDEX IF NOT EXISTS idx_lignes_curseur ON lignes (espace, seq);

-- Compteur monotone par espace. Le curseur de lecture NE PEUT PAS être une
-- date : deux appareils aux horloges décalées rateraient des lignes.
CREATE TABLE IF NOT EXISTS compteurs (
  espace TEXT PRIMARY KEY,
  seq    INTEGER NOT NULL DEFAULT 0
);
