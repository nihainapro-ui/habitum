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
  PRIMARY KEY (espace, kind, id),
  -- Filet de sécurité : avec l'incrément atomique de `compteurs` (voir
  -- src/index.ts), deux lignes du même espace ne devraient JAMAIS partager un
  -- `seq`. Cette contrainte ne devrait donc jamais se déclencher — c'est
  -- justement pourquoi elle a sa place. Si elle se déclenche un jour, c'est
  -- que l'invariant est cassé ailleurs, et une erreur SQL explicite vaut
  -- mieux qu'une ligne sautée en silence à la frontière d'une page : la
  -- lecture trie sur `seq` sans départage, et le curseur rendu est le `seq`
  -- de la dernière ligne servie.
  UNIQUE (espace, seq)
);

-- La seule requête chaude : « ce qui a changé depuis mon curseur ».
CREATE INDEX IF NOT EXISTS idx_lignes_curseur ON lignes (espace, seq);

-- Compteur monotone par espace. Le curseur de lecture NE PEUT PAS être une
-- date : deux appareils aux horloges décalées rateraient des lignes.
CREATE TABLE IF NOT EXISTS compteurs (
  espace TEXT PRIMARY KEY,
  seq    INTEGER NOT NULL DEFAULT 0
);
