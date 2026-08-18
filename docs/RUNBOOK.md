# Runbook d'incident — Habitum

**À qui il sert :** à la personne d'astreinte, à 3 h du matin, qui n'a pas écrit ce code.
Tout ce qui suit doit être exécutable sans rien relire d'autre.

**Ce que ce document suppose :** l'application est déployée et `vars.SITE_URL` est renseignée
(tâche 8.9). Tant que ce n'est pas le cas, la sonde ne tourne pas et il n'y a rien à surveiller.

---

## 1. Revenir en arrière — une minute

**Vercel** → projet → onglet **Deployments** → sélectionner le déploiement précédent →
**« Promote to Production »**.

C'est tout. Il n'y a **aucune migration de base à défaire côté serveur, parce qu'il n'y a pas
de base côté serveur.** Le déploiement précédent reste conservé par la plateforme ; le
rollback est une réaffectation d'alias, pas une reconstruction.

**Sur Cloudflare Pages** (si la décision C a tranché ainsi) : Deployments → déploiement
précédent → **Rollback**.

> **Le rollback doit avoir été exécuté au moins une fois pour de vrai**, hors incident, et la
> date consignée ci-dessous. Une procédure jamais essayée n'est pas une procédure.
>
> | Date | Par | Résultat |
> |---|---|---|
> | _à remplir à la première mise en production_ | | |

### Ce que le rollback ne répare pas

Les données vivent **sur l'appareil de l'utilisateur**, dans IndexedDB. Revenir à la version
précédente du code ne défait pas une écriture déjà faite dans le navigateur de quelqu'un.
C'est la raison pour laquelle la seule urgence réelle du produit est § 3.

---

## 2. Niveaux de gravité

| Niveau | Définition | Délai | Geste |
|---|---|---|---|
| **S1** | Perte ou corruption de données utilisateur, ou application inutilisable | immédiat | Rollback, puis § 3 |
| **S2** | Une vue cassée, ou une fonction majeure indisponible | 24 h | Correctif, déploiement normal |
| **S3** | Défaut visuel, libellé, cas limite | prochaine version | Issue, pas d'astreinte |

Un doute entre deux niveaux se tranche vers le HAUT. Le coût d'un rollback inutile est de
cinq minutes ; celui d'un S1 traité en S2 est irréversible.

---

## 3. Le seul incident S1 réellement possible

Habitum n'a pas de serveur : il n'y a ni fuite de base, ni panne d'API, ni file d'attente
saturée. **Le seul incident critique est une régression de la couche de données** qui
corromprait ou effacerait les données locales des utilisateurs.

### Signaux

- des signalements « mes habitudes ont disparu », « mes séries sont revenues à zéro » ;
- des erreurs de migration Dexie dans le journal local (Réglages → Journal d'erreurs) ;
- un rapport d'import qui écarte massivement (`gardées` très inférieur à `lues`).

### Réaction, dans cet ordre

1. **Rollback immédiat** (§ 1). On arrête l'hémorragie avant de comprendre.
2. **Établir le périmètre** : quelle version a été servie, pendant combien de temps, et quelle
   migration Dexie elle exécutait au premier chargement.
3. **Communiquer la procédure de restauration AVANT de publier le correctif.** L'utilisateur
   qui découvre le problème doit trouver la marche à suivre, pas une version corrigée qui
   n'a plus rien à restaurer :
   - Réglages → **Restaurer la copie de secours** (prise automatiquement avant tout import et
     avant toute réinitialisation) ;
   - à défaut, réimporter le dernier fichier d'export.
4. **Reproduire sur une base copiée**, jamais sur celle d'un utilisateur.
5. Corriger, ajouter le test de non-régression **d'abord**, puis redéployer.

### Ce qu'il ne faut pas faire

Publier un correctif qui relance une migration sur une base déjà abîmée. Une migration
s'exécute une fois par version de schéma : si elle a fait des dégâts, la rejouer les aggrave.

---

## 4. Détection — et ses limites

| Canal | Ce qu'il voit | Délai |
|---|---|---|
| Sonde `healthcheck.yml` | l'application répond en HTTP 200 | cron, ouvre une issue critique |
| CI sur `main` | la chaîne est verte | à chaque push |
| Signalements GitHub | tout le reste | dépend des utilisateurs |

**Sans télémétrie, on ne détecte pas un incident par les métriques.** C'est le prix assumé de
la promesse produit — aucune donnée ne quitte l'appareil, donc rien ne remonte, y compris les
erreurs. Deux conséquences, et il faut les tenir ensemble :

- la sonde ne voit qu'une chose : le site répond. Une application qui répond 200 en effaçant
  les données de qui l'ouvre est, pour elle, en parfaite santé ;
- **le canal de signalement doit donc être visible depuis l'application.** C'est ce que fait
  la page de version (Réglages → À propos) : elle donne la version, la version de schéma
  Dexie et la date de construction, c'est-à-dire ce qui rend un rapport exploitable.

---

## 5. Signalement

- **Anomalie ordinaire** : issue GitHub, gabarit « Anomalie ». Joindre ce qu'affiche
  Réglages → À propos.
- **Faille de sécurité** : avis de sécurité privé, **jamais** une issue publique. Voir
  `SECURITY.md`.
- **Perte de données** : issue étiquetée `prio:critique`, et prévenir l'astreinte directement.

---

## 6. Numéros utiles

| Quoi | Où |
|---|---|
| Déploiements et rollback | Vercel → projet → Deployments |
| Sonde | Actions → `healthcheck.yml` |
| Chaîne de vérification | Actions → `CI` |
| Budget de performance | Actions → `Lighthouse` |
| Non-régression visuelle | Actions → `CI` → job `visuel` |
| Journal d'erreurs d'un utilisateur | dans SON navigateur : Réglages → Journal d'erreurs |
