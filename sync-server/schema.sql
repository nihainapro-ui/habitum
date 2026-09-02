-- sync-server/schema.sql
-- Une seule table. Le serveur ne sait rien du produit : ni utilisateurs, ni
-- habitudes, ni dates. Des octets, et un horodatage qu'il compare sans le
-- comprendre.
--
-- PAS DE TABLE DE COMPTEUR SÉPARÉE. Un `seq` réservé à part, puis rattaché à
-- une ligne dans un second aller-retour D1, ouvre une fenêtre : une requête
-- peut réserver un numéro bas et être préemptée avant d'écrire sa ligne,
-- pendant qu'une autre réserve un numéro haut et écrit aussitôt. Un GET dans
-- cet intervalle voit le numéro haut, avance le curseur du client au-delà —
-- et quand la ligne au numéro bas s'écrit enfin, plus aucun client ne la
-- redemandera. Elle est perdue, DÉFINITIVEMENT et SILENCIEUSEMENT. Le `seq`
-- doit donc naître DANS la même instruction que l'écriture de la ligne (voir
-- `src/index.ts`, `INSERT ... VALUES (..., (SELECT COALESCE(MAX(seq), 0) + 1
-- FROM lignes WHERE espace = ?), ...)`) : un numéro ne peut alors jamais
-- exister sans que la ligne qui le porte soit déjà écrite et lisible.
CREATE TABLE IF NOT EXISTS lignes (
  espace     TEXT NOT NULL,
  kind       TEXT NOT NULL,
  id         TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  seq        INTEGER NOT NULL,
  blob       TEXT NOT NULL,
  PRIMARY KEY (espace, kind, id),
  -- Filet de sécurité : avec le calcul du `seq` À L'INTÉRIEUR de l'écriture
  -- (voir ci-dessus), deux lignes du même espace ne devraient JAMAIS partager
  -- un `seq`. Cette contrainte ne devrait donc jamais se déclencher — c'est
  -- justement pourquoi elle a sa place. Si elle se déclenche un jour, c'est
  -- que l'invariant est cassé ailleurs, et une erreur SQL explicite vaut
  -- mieux qu'une ligne sautée en silence à la frontière d'une page : la
  -- lecture trie sur `seq` sans départage, et le curseur rendu est le `seq`
  -- de la dernière ligne servie.
  UNIQUE (espace, seq)
);

-- La seule requête chaude : « ce qui a changé depuis mon curseur ».
CREATE INDEX IF NOT EXISTS idx_lignes_curseur ON lignes (espace, seq);

-- Note : la mise à jour d'une ligne EXISTANTE lui donne un `seq` plus grand
-- et libère l'ancien, qu'aucune ligne ne reprend jamais. Les numéros d'un
-- espace peuvent donc être NON CONTIGUS — `1, 3, 4`, par exemple. C'est
-- normal et sans conséquence : le curseur de lecture ne demande jamais un
-- numéro précis, seulement « ce qui est strictement supérieur à N ». Ne pas
-- « corriger » ces trous.

-- Date de DERNIER ACCÈS par espace, en millisecondes depuis 1970.
--
-- Une table à part, et non une colonne de `lignes` : la question posée est
-- « cet espace sert-il encore ? », qui n'a qu'une réponse par espace. La
-- porter sur chaque ligne obligerait à la réécrire partout à chaque passage,
-- et à faire un MAX() sur toute la table pour la relire.
--
-- POURQUOI PAS `MAX(updated_at)` DE `lignes`, qui existe déjà. Parce que cet
-- horodatage vient du CLIENT : il décrit quand l'utilisateur a modifié son
-- habitude, pas quand le serveur a eu de ses nouvelles. Une horloge d'appareil
-- déréglée — c'est fréquent — ferait expirer un espace vivant, ou en
-- maintiendrait un mort pour des années. `touche_le` est posé par le serveur,
-- avec sa propre horloge, et ne ment donc pas.
CREATE TABLE IF NOT EXISTS espaces (
  espace    TEXT PRIMARY KEY,
  touche_le INTEGER NOT NULL
);

-- La seule requête de la purge : « quels espaces n'ont plus donné signe de vie ».
CREATE INDEX IF NOT EXISTS idx_espaces_touche ON espaces (touche_le);
