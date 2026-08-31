# Work — projets et listes de tâches

**Date** : 2026-08-31
**État** : validé, en cours d'implémentation
**Portée** : une douzième vue, deux entités persistées, un éditeur

---

## 1. Ce que la vue résout

Habitum sait suivre des **habitudes** (récurrentes, journalisées), des **tâches**
(datées, cochées) et des **objectifs** (une cible, une échéance). Il ne sait pas
suivre un **travail à plusieurs étapes confié à des gens** : « refaire le site »,
« déménager », « préparer l'audit » — un contenant, des étapes, un responsable
par étape, un avancement.

C'est ce que Work ajoute.

## 2. Décisions tranchées avec le commanditaire

| Question | Réponse | Conséquence |
| --- | --- | --- |
| Les tâches de projet sont-elles les tâches existantes ? | **Non, entité séparée** | Work est cloisonné : ses tâches n'apparaissent ni dans Aujourd'hui, ni dans le calendrier, ni dans les statistiques. Deux notions de « tâche » coexistent, assumées. |
| Modèle de statut | **Trois états** : `todo` · `doing` · `done` | Pas de « bloqué ». |
| Responsable | **Texte libre** | Habitum est local-first, sans compte : un responsable ne peut être qu'un nom écrit à la main, pour déléguer à quelqu'un hors de l'application. |

### Ce que le cloisonnement coûte, écrit noir sur blanc

Une tâche de projet avec une échéance à demain **ne remontera pas** dans
« Aujourd'hui ». C'est le prix de la décision, et il est réel. Il est assumé
parce qu'il achète une chose : les champs de Work (responsable, trois états)
n'ont pas à contaminer l'entité `Task`, dont dépendent huit vues et les 62
valeurs de référence.

## 3. Modèle

Déclaré **une seule fois**, dans `lib/domain/types.ts`, statuts compris. C'est le
piège n°1 du `CLAUDE.md` : une liste de types recopiée quelque part finit par en
oublier un, et des entités disparaissent en silence.

```ts
export const PROJECT_STATUSES = ['todo', 'doing', 'done'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export interface Project {
  id: string;
  name: string;
  note: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface ProjectTask {
  id: string;
  projectId: string;
  name: string;
  /** Texte libre, `''` si personne. */
  assignee: string;
  /** `''` si pas d'échéance. */
  deadline: DateKey | '';
  status: ProjectStatus;
  note: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}
```

Formes calquées sur `Task` : `createdAt` / `updatedAt` / `deletedAt?`, effacement
logique compris.

### Fonctions du domaine (`lib/domain/projects.ts`)

Aucune ne touche React ni la persistance (règle 2 du `CLAUDE.md`).

- `groupProjectTasks(tasks)` → `Record<ProjectStatus, ProjectTask[]>` — les trois
  clés sont **toujours** présentes, vides comprises. Une clé absente est ce qui
  fait disparaître une colonne sans bruit.
- `projectProgress(tasks)` → `{ done, total, pct }`. **`total === 0` rend
  `pct === 0`**, jamais 100 : un projet vide n'est pas un projet fini (règle 3 —
  aucun chiffre fabriqué).
- `isOverdue(task, today)` → `deadline !== '' && deadline < today && status !== 'done'`.
  Une tâche terminée en retard n'est plus en retard : elle est faite.

## 4. Persistance — le circuit complet

C'est ici que se joue la seule vraie difficulté. Une entité neuve doit traverser
**cinq** endroits ; en oublier un la fait disparaître en silence, ce que le
`CLAUDE.md` désigne comme le défaut déjà payé.

| Endroit | Changement |
| --- | --- |
| `lib/data/db.ts` | `version(2).stores({ projects: 'id, updatedAt, deletedAt', projectTasks: 'id, projectId, status, deadline, updatedAt, deletedAt' })`. Dexie conserve les neuf tables existantes. |
| `lib/storage/keys.ts` | `DB_VERSION` 1 → 2. `lib/version.ts` l'expose ; `version.spec.ts` le lit. |
| `lib/data/export.ts` | Deux clés **neuves** : `proj` et `ptask`. Les noms existants ne bougent pas (règle 1). |
| `lib/data/import.ts` | Lecture des deux clés, **absentes tolérées** — une sauvegarde d'avant Work doit s'importer sans erreur. Le rapport d'import compte les deux entités. |
| `lib/data/seed.ts` | `resetAll()` vide les deux tables ; `seedDemo()` écrit un projet de démonstration. |

**Sans l'étape export/import, une sauvegarde perdrait les projets sans le dire.**
C'est le contrôle qui manque le plus souvent et le plus cher.

## 5. Interface

### Route et navigation

`/app/work`, entrée `navWork` dans le groupe **Suivi** (`grpTrack`), après
Objectifs. Les « onze vues » deviennent **douze** : une dizaine de commentaires,
documents et tests portent ce nombre et sont corrigés dans la même livraison.

Elle n'entre **pas** dans la barre basse : celle-ci garde ses quatre usages
quotidiens sous le pouce, et Work passe par le tiroir comme les sept autres.

### Composition

Deux niveaux dans une seule vue, sans sous-route :

1. **Aucun projet sélectionné** — la liste des projets. Par carte : nom, barre
   d'avancement réelle, `n/total`, et le nombre de tâches en retard s'il y en a.
2. **Un projet sélectionné** — ses tâches groupées par statut. **Trois sections
   empilées** sur téléphone, **trois colonnes** au-dessus de 1060 px.

**Pas de glisser-déposer.** Il est hostile au doigt, coûte un piège de focus et
une alternative clavier complète, et n'apporte rien qu'un sélecteur de statut sur
la ligne ne donne déjà. Le statut se change depuis la ligne.

### Éditeur

`EditorState` gagne deux `kind` : `'project'` et `'projectTask'`, plus un
`parentId?: string` — créer une tâche de projet suppose de savoir dans quel
projet, ce qu'un `id: null` seul ne dit pas.

Champs de `projectTask` : nom · responsable · échéance · statut · note.
Champs de `project` : nom · note.

## 6. Ce qui est écarté en v1

Nommé pour que le refus soit un choix, pas un oubli : pas de sous-tâches dans une
tâche de projet, pas de couleur de projet, pas d'archivage (la suppression
suffit), pas de réordonnancement manuel, pas de lien entre une tâche de projet et
une tâche du calendrier.

## 7. Contrôles

**Unitaires** (`tests/unit/projects.test.ts`) — les trois fonctions du domaine,
et en particulier : les trois clés de statut toujours présentes, `pct === 0` sur
un projet vide, une tâche terminée en retard n'est pas en retard.

**Aller-retour** (`tests/unit/backup.test.ts` étendu) — exporter puis importer
restitue projets et tâches. **Et une sauvegarde sans les clés `proj`/`ptask`
s'importe sans erreur** : c'est le cas de toutes celles produites avant
aujourd'hui.

**e2e** (`tests/e2e/vue-work.spec.ts`) — créer un projet, y créer une tâche, la
faire passer par les trois statuts, l'éditer, la supprimer ; état vide ; pas de
débordement horizontal aux quatre paliers ; accessible (axe).

**Comptage** (`tests/unit/nav-items.test.ts`) — douze vues, huit hors barre basse.
Ce test tient le nombre que la documentation répète.
