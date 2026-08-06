#!/usr/bin/env bash
# =============================================================================
# Amorçage du dépôt GitHub — tâches 0.9 et 0.10 de la phase 0.
#
# Prérequis :
#   1. GitHub CLI installé   → winget install GitHub.cli
#   2. Authentifié           → gh auth login
#
# Usage :
#   bash scripts/github-bootstrap.sh
#
# Le script est IDEMPOTENT : le relancer ne duplique rien. Il s'arrête à la
# première erreur non anticipée.
# =============================================================================
set -euo pipefail

COMPTE="nihainapro-ui"
DEPOT="habitum"
NWO="$COMPTE/$DEPOT"

bleu() { printf '\n\033[1;34m== %s\033[0m\n' "$1"; }
ok()   { printf '   \033[0;32mok\033[0m %s\n' "$1"; }
warn() { printf '   \033[0;33m!\033[0m  %s\n' "$1"; }

command -v gh >/dev/null || { echo "GitHub CLI absent. winget install GitHub.cli"; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "Non authentifié. gh auth login"; exit 1; }

# -----------------------------------------------------------------------------
bleu "0.9 — Dépôt distant"
# -----------------------------------------------------------------------------
if gh repo view "$NWO" >/dev/null 2>&1; then
  ok "le dépôt $NWO existe déjà"
else
  gh repo create "$NWO" --private --source=. --remote=origin \
    --description "Gestionnaire d'habitudes local-first. Aucun compte, aucune donnée qui sort de l'appareil. FR/EN." \
    --push
  ok "dépôt privé créé et poussé"
fi

git remote get-url origin >/dev/null 2>&1 || git remote add origin "https://github.com/$NWO.git"
git push -u origin main 2>/dev/null || ok "main déjà à jour"

bleu "Intégrité du prototype après transfert"
TAILLE=$(gh api "repos/$NWO/contents/public/prototype/Habitum.dc.html" --jq '.size' 2>/dev/null || echo 0)
if [ "$TAILLE" = "336613" ]; then
  ok "Habitum.dc.html : 336 613 octets, intact"
else
  warn "Habitum.dc.html fait $TAILLE octets, 336613 attendus — vérifier .gitattributes"
fi

# -----------------------------------------------------------------------------
bleu "0.9 — Protection de main"
# -----------------------------------------------------------------------------
# ⚠ Sur un compte personnel GitHub Free, la protection de branche n'est
# disponible que pour les dépôts PUBLICS. Sur un dépôt privé, elle exige
# GitHub Pro. L'appel échouera donc proprement, sans interrompre le script :
# la CI tournera quand même, elle ne sera simplement pas bloquante.
if gh api -X PUT "repos/$NWO/branches/main/protection" --input - >/dev/null 2>&1 <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["verify (node 20)", "verify (node 22)", "e2e"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": { "required_approving_review_count": 1 },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_linear_history": true
}
JSON
then
  ok "main protégée : PR obligatoire, CI verte requise, pas de force-push"
else
  warn "protection refusée — attendu sur un dépôt PRIVÉ en plan Free."
  warn "Options : passer le dépôt en public, ou souscrire GitHub Pro."
  warn "En attendant, la CI tourne mais ne bloque pas la fusion."
fi

# -----------------------------------------------------------------------------
bleu "0.10 — Labels"
# -----------------------------------------------------------------------------
creer_label() { gh label create "$1" --color "$2" --description "$3" --force >/dev/null && ok "$1"; }
creer_label "prio:critique" b60205 "Bloque tout le reste"
creer_label "prio:haute"    d93f0b "Indispensable au lancement"
creer_label "prio:moyenne"  fbca04 "Confort"
creer_label "prio:faible"   0e8a16 "Optionnel ou après lancement"
creer_label "type:defaut"   e11d21 "Défaut relevé par l'audit"
creer_label "type:tache"    1d76db "Tâche du backlog"
creer_label "type:doc"      0052cc "Documentation"
creer_label "type:securite" b60205 "Sécurité ou dépendance vulnérable"
for n in 0 1 2 3 4 5 6 7; do creer_label "phase:$n" c5def5 "Phase $n du plan d'exécution"; done

# -----------------------------------------------------------------------------
bleu "0.10 — Jalons"
# -----------------------------------------------------------------------------
creer_jalon() {
  if gh api "repos/$NWO/milestones" --jq '.[].title' 2>/dev/null | grep -qxF "$1"; then
    ok "$1 (déjà présent)"
  else
    gh api -X POST "repos/$NWO/milestones" -f title="$1" -f description="$2" >/dev/null && ok "$1"
  fi
}
creer_jalon "v0.1 Fondations"     "Git, CI/CD, tests moteur, pipeline vert"
creer_jalon "v0.2 Données"        "Dexie, dépôts, migrations, importeur, seed"
creer_jalon "v0.3 Coque"          "Zustand, annulation, rail, palette, routes statiques"
creer_jalon "v0.4 Système visuel" "Primitives, polices, i18n branchée, thèmes, contraste"
creer_jalon "v0.5 Vues"           "Les onze écrans, mêmes chiffres que le prototype"
creer_jalon "v0.6 PWA"            "Notifications réelles, onboarding, offline, cache dérivé"
creer_jalon "v0.9 Qualité"        "8 parcours, non-régression visuelle, a11y, montées majeures"
creer_jalon "v1.0 Lancement"      "Production, vérifications post-déploiement, runbook"

# -----------------------------------------------------------------------------
bleu "0.10 — Issues des 28 défauts de l'audit"
# -----------------------------------------------------------------------------
# Format : REF|PRIO|PHASE|JALON|ÉTAT|TITRE
DEFAUTS=$(cat <<'CSV'
D1|critique|0|v0.1 Fondations|clos|Le dépôt ne compile pas — apostrophe non échappée dans app-shell.tsx
D2|critique|0|v0.1 Fondations|clos|Aucun versionnement
D3|critique|0|v0.1 Fondations|clos|styles/tokens.css incompatible avec le prototype
D4|haute|0|v0.1 Fondations|clos|golden.json n'est consommé par aucun test TypeScript
D5|haute|0|v0.1 Fondations|clos|03-ARCHITECTURE déclare 4 types d'objectif au lieu de 7
D6|haute|3|v0.4 Système visuel|ouvert|i18n branchée mais inutilisée — 311 clés, 0 atteignable
D7|haute|3|v0.4 Système visuel|ouvert|Polices Space Grotesk et JetBrains Mono jamais chargées
D8|haute|3|v0.4 Système visuel|ouvert|Le prototype charge Google Fonts — RGPD et promesse produit
D9|haute|0|v0.1 Fondations|clos|Aucun en-tête de sécurité
D10|haute|5|v0.6 PWA|ouvert|Aucune page d'erreur ni état vide systématique
D11|moyenne|7|v0.9 Qualité|ouvert|4 vulnérabilités npm dont 3 hautes — montées majeures requises
D12|haute|2|v0.3 Coque|ouvert|Les 12 routes sont dynamiques — invocation serverless par affichage
D13|haute|0|v0.1 Fondations|clos|npm run verify n'exécutait ni build ni format:check
D14|haute|0|v0.1 Fondations|clos|Modèle incomplet — Profile, ShoppingItem, deletedAt, horodatages
D15|haute|0|v0.1 Fondations|clos|Settings.weekStart inimplémentable — startOfWeek absente
D16|moyenne|0|v0.1 Fondations|clos|Mode 'every' sans start — origine du cycle instable
D17|moyenne|0|v0.1 Fondations|clos|date-fns déclarée mais jamais importée
D18|moyenne|0|v0.1 Fondations|clos|ESLint échoue sur next-env.d.ts après un build
D19|moyenne|0|v0.1 Fondations|clos|Couverture insuffisante et aucun job e2e en CI
D20|moyenne|0|v0.1 Fondations|clos|Divergence Supabase / Neon entre les documents
D21|moyenne|0|v0.1 Fondations|clos|Le backlog référence une arborescence src/ inexistante
D22|moyenne|0|v0.1 Fondations|clos|Documentation contredite par le code
D23|faible|7|v0.9 Qualité|ouvert|exactOptionalPropertyTypes désactivé dans un tsconfig strict
D24|moyenne|0|v0.1 Fondations|clos|CI sans permissions, actions non épinglées, pas de concurrency
D25|moyenne|5|v0.6 PWA|ouvert|Aucune PWA — manifeste, icônes, service worker, favicon
D26|moyenne|2|v0.3 Coque|ouvert|Accessibilité inférieure au prototype, thème figé
D27|moyenne|0|v0.1 Fondations|clos|Pas de SECURITY.md, CONTRIBUTING.md ni politique de confidentialité
D28|moyenne|6|v1.0 Lancement|ouvert|SEO nul et vitrine non construite
CSV
)

while IFS='|' read -r ref prio phase jalon etat titre; do
  [ -z "${ref:-}" ] && continue
  if gh issue list --search "\"$ref —\" in:title" --state all --json title --jq '.[].title' 2>/dev/null | grep -q "^$ref —"; then
    ok "$ref (déjà présente)"
    continue
  fi
  corps="Défaut relevé par l'audit du 6 août 2026.

**Détail et preuves :** \`docs/AUDIT-PRODUCTION-2026-08-06.md\` § 2.5
**Traitement prévu :** phase $phase — \`docs/superpowers/plans/2026-08-06-habitum-phases-execution.md\`"
  num=$(gh issue create --title "$ref — $titre" \
        --label "type:defaut,prio:$prio,phase:$phase" \
        --milestone "$jalon" --body "$corps" | grep -o '[0-9]*$')
  if [ "$etat" = "clos" ]; then
    gh issue close "$num" --comment "Levé par la phase 0 (fondations), livrée le 6 août 2026. Voir CHANGELOG.md." >/dev/null
    ok "$ref créée puis fermée (levée en phase 0)"
  else
    ok "$ref créée"
  fi
done <<< "$DEFAUTS"

# -----------------------------------------------------------------------------
bleu "Récapitulatif"
# -----------------------------------------------------------------------------
gh repo view "$NWO" --json name,visibility,url --jq '"   dépôt   : \(.url) (\(.visibility))"'
printf '   issues  : %s ouvertes, %s fermées\n' \
  "$(gh issue list --state open  --json number --jq 'length')" \
  "$(gh issue list --state closed --json number --jq 'length')"
printf '   jalons  : %s\n' "$(gh api "repos/$NWO/milestones" --jq 'length')"
printf '\n   Suivre la CI : gh run watch\n\n'
