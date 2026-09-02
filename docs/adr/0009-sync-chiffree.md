# ADR 0009 — Synchronisation chiffrée de bout en bout, sans compte, facultative

- **Statut** : accepté · 2026-09-01 (amende l'ADR-0002)

## Contexte

L'ADR-0002 a tranché « local-first, sans compte ni serveur », et la question la plus posée sur le
produit est restée la même : *puis-je l'utiliser sur mon téléphone et sur mon ordinateur ?* La
réponse honnête était « oui, en exportant un fichier et en l'important ». C'est une réponse, pas
un usage : personne n'exporte tous les soirs.

Le refus de l'ADR-0002 ne portait pas sur la synchronisation en soi. Il portait sur ce qu'elle
imposait d'habitude : un compte, une adresse électronique, un serveur qui lit vos données. La
question à instruire était donc précise — **peut-on synchroniser sans rien de tout cela ?**

## Décision

Oui, et c'est ce qui est livré.

- **Un code de vingt caractères tiré au sort sur 100 bits** remplace le compte. Il dérive par deux
  chemins HKDF distincts l'identifiant d'espace (qui part) et la clé de chiffrement (qui ne part
  jamais). Connaître l'un n'apprend rien sur l'autre.
- **Le chiffrement a lieu sur l'appareil, avant l'envoi** (AES-GCM). Le relais reçoit des octets,
  un identifiant opaque et une date de modification. Il ne peut rien lire, et aucun réglage ne
  peut le lui permettre.
- **La fonctionnalité est facultative et éteinte par défaut.** Sans `NEXT_PUBLIC_SYNC_URL`, la
  section de réglages n'existe pas, la CSP ne bouge pas d'un caractère, et la politique de
  confidentialité ne décrit pas de relais.
- **Le relais est un Worker Cloudflare + D1**, palier gratuit, sans journalisation — ni adresse IP,
  ni horodatage de requête. Un serveur qui ne peut pas lire les données mais garde qui se connecte
  quand n'est pas aveugle.

## Pourquoi un code tiré au sort, et non une phrase choisie

Le sel de dérivation est **fixe** : deux appareils qui ne se sont jamais parlé doivent obtenir la
même clé du même code. Un sel fixe rend une phrase choisie par l'utilisateur cassable hors ligne,
à loisir, sur le chiffré déjà collecté. Cent bits tirés au sort ferment ce chemin. C'est aussi
pourquoi l'alphabet retire `I`, `L`, `O` et `U` — le code doit pouvoir être lu à voix haute sans
ambiguïté, puisqu'il n'y a personne pour le réinitialiser.

## Le prix, et il est réel

- **Le code perdu n'est récupérable par personne**, éditeur compris. C'est la contrepartie directe
  du chiffrement de bout en bout : il n'y a pas de « mot de passe oublié » quand personne d'autre
  ne détient la clé. Écrit dans l'interface **avant** l'appairage, pas après.
- **Synchroniser n'est pas sauvegarder.** Ce qui est supprimé sur un appareil disparaît sur tous —
  c'est le but. L'export reste la seule copie de secours, et le rappel qui le dit ne bouge pas.
- **`connect-src` s'ouvre à une origine**, fixée à la construction. Jamais de joker : ouvrir la
  directive à `https:` rendrait décorative la politique que le site invite justement à vérifier
  dans l'onglet « Réseau ».
- **Aucune purge des espaces abandonnés.** Un code perdu laisse ses octets en base indéfiniment.
  Ce n'est pas une fuite — illisibles, rattachés à personne — mais c'est du stockage qui ne se
  libère jamais. Noté dans `sync-server/README.md` plutôt que tu.

## Ce que cela a obligé à corriger ailleurs

Huit affirmations du site devenaient fausses le jour où la synchronisation devenait possible :
« il n'y a pas de serveur du tout », « il n'existe aucun serveur qui les reçoive », « il n'y a pas
de synchronisation automatique : elle demanderait un compte et un serveur ». Toutes réécrites,
dans les deux langues, pour être vraies **dans les deux configurations**. La tournure qui y
parvient est toujours la même : « tant que vous n'activez pas la synchronisation » — exacte aussi
pour un déploiement sans relais, où rien ne peut être activé.

La section « Synchronisation » de la politique de confidentialité est, elle, **conditionnelle au
relais**. Les deux mensonges possibles coûtent cher en sens inverse : annoncer un envoi qui n'a pas
lieu inquiète pour rien, taire un envoi qui a lieu est bien pire.

## Une leçon de vérification, gardée ici parce qu'elle resservira

La CSP a bloqué le tout premier appairage réel : `connect-src 'self'` interdisait la requête avant
qu'elle parte, et l'écran annonçait une panne réseau qu'aucun réseau n'expliquait. **Aucun test
unitaire ne pouvait l'attraper** — ils ne servent pas d'en-têtes. Seul un test de bout en bout,
sur le build de production, l'a vu.

Symétriquement, trois tests de cette livraison étaient verts d'emblée et ne gardaient rien. Ils
n'ont été tenus pour acquis qu'après avoir été vus échouer sur mutation de l'invariant qu'ils
prétendaient protéger. **Un test qu'on n'a pas vu échouer ne garde rien.**
