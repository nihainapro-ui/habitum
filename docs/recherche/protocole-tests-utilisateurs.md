# Protocole — tests utilisateurs Habitum

**Établi le 17 août 2026**, phase 7 tâche 8.7 (plan 8).
**État : NON PASSÉ.** Le protocole est prêt ; les séances demandent cinq personnes réelles.

---

## Pourquoi ce n'est pas optionnel

La **décision E** a tranché contre la télémétrie : aucune donnée ne quitte l'appareil, donc
rien ne remonte — ni les parcours, ni les abandons, ni les erreurs. Le produit n'a par
conséquent **aucune mesure d'usage**, et il n'en aura pas.

Ces séances sont donc la seule source d'information sur ce que les gens font réellement. Les
sauter ne laisse pas une lacune, il laisse un **vide total** : on ne saurait rien, et on
croirait savoir, parce que l'équipe se sert du produit tous les jours et le trouve évident.

---

## Ce qu'il faut

- **Cinq personnes**, qui n'ont jamais vu Habitum ni le prototype. Trois suffisent à trouver
  les blocages grossiers ; cinq attrapent la majorité des malentendus.
- Un profil mêlé : au moins une personne qui n'utilise **aucune** application d'habitudes, et
  au moins une qui en utilise une (HabitNow, Streaks, Habitica…). La seconde arrive avec des
  attentes ; la première arrive sans vocabulaire.
- **Aucune assistance.** L'observateur ne montre rien, ne corrige rien, ne répond à aucune
  question par autre chose que « qu'est-ce que vous feriez ? ». C'est difficile, et c'est tout
  l'exercice.
- Un compte **vierge** à chaque séance, pas le jeu de démonstration.
- 30 minutes par personne.

---

## Les trois parcours

### 1. Première ouverture — *l'indicateur qui prédit la rétention*

**Consigne :** « Vous venez d'installer cette application. Faites-en ce que vous voudriez en
faire. »

**Ce qu'on mesure :** le **temps jusqu'à la première habitude créée**, chronomètre déclenché
à l'affichage du premier écran.

**Ce qu'on observe :** les trois écrans d'accueil sont-ils lus ou passés ? La personne
comprend-elle qu'aucun compte n'est demandé — ou le cherche-t-elle ? Choisit-elle le jeu de
démonstration, et si oui, comprend-elle ensuite que ces données ne sont pas les siennes ?

> **Hypothèse à réfuter :** l'équipe croit que « pas de compte » est un argument immédiat.
> Il est possible qu'il soit d'abord une inquiétude — « où sont mes données, alors ? »

### 2. Une semaine simulée — *le suivi quotidien est-il évident ?*

**Consigne :** « Voici ce que vous avez fait ces trois derniers jours. Reportez-le. » Fournir
une liste papier : une habitude cochée deux jours sur trois, une habitude quantifiée avec des
valeurs, une tâche faite, une tâche reportée.

**Ce qu'on mesure :** le nombre de gestes ratés, et le temps du report complet.

**Ce qu'on observe :** trouve-t-elle la vue « Aujourd'hui » ou reste-t-elle sur le tableau de
bord ? Comprend-elle le compteur `−` / `+` ? Sait-elle revenir à hier ? Voit-elle que les
séries se mettent à jour, et y attache-t-elle de l'importance ?

> **Point le plus exposé :** une habitude à plafond (« pas plus de 2 cafés »). Sa case ne se
> coche pas d'avance — c'est correct, c'est la règle G9, et c'est probablement surprenant.
> Vérifier si la surprise devient un malentendu.

### 3. Changement d'appareil — *l'export est-il trouvable ?*

**Consigne :** « Vous changez de téléphone. Emportez vos données. »

**Ce qu'on mesure :** trouvé ou pas, et en combien de temps.

**Ce qu'on observe :** cherche-t-elle un compte, une synchronisation, un nuage ? Va-t-elle
dans Réglages ? Comprend-elle ce qu'est le fichier téléchargé ? Saurait-elle le réimporter ?

> **C'est le parcours qui décide si la promesse « local-first » est tenable.** Sans compte,
> l'export EST la sauvegarde. S'il n'est pas trouvable, la promesse devient un risque.

---

## Ce qu'il faut consigner

Dans `docs/recherche/tests-utilisateurs-2026-XX.md`, une section par personne :

1. **Les chiffres** : temps jusqu'à la première habitude · temps du report · export trouvé
   (oui/non, en combien de temps).
2. **Ce qui a bloqué** — l'endroit exact, pas la paraphrase.
3. **Ce qui a été mal compris** — ce que la personne croyait que ça faisait.
4. **LES MOTS EMPLOYÉS**, verbatim. C'est le livrable le plus précieux, et le plus facile à
   perdre : ils valent mieux que les nôtres pour la vitrine, les libellés et les guides.
   Noter « suivi » si la personne dit « suivi », même si l'interface dit « journalisation ».

Puis une synthèse : ce qui se corrige avant la v1.0, ce qui part au backlog, ce qui relève du
parti pris et qu'on assume.

---

## Ce que ces séances ne remplacent pas

Elles ne disent rien de la **rétention** — trente minutes ne montrent pas si quelqu'un revient
le onzième jour. Sans télémétrie, cette question restera ouverte, et il faut l'écrire plutôt
que d'espérer que le temps jusqu'à la première habitude y réponde. Il la prédit ; il ne la
mesure pas.
