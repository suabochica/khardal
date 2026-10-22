#!/usr/bin/env bash
set -euo pipefail
umask 077

compose=(docker compose --env-file .env.woocommerce)
[[ -f docker-compose.yml && -f .env.woocommerce ]] || { printf '%s\n' 'Run from the project root after woo:init.' >&2; exit 1; }
[[ -n "$("${compose[@]}" ps --status running -q db)" ]] || { printf '%s\n' 'Start the local database with woo:up first.' >&2; exit 1; }
running="$("${compose[@]}" ps --status running -q wordpress)"
backup="$PWD/backups/woocommerce/$(date -u +%Y%m%dT%H%M%SZ)-$RANDOM"
mkdir -p "$PWD/backups/woocommerce"
mkdir "$backup"
restart() {
  if [[ -n "$running" ]]; then "${compose[@]}" up -d --wait wordpress; fi
}
trap restart EXIT
if [[ -n "$running" ]]; then "${compose[@]}" stop wordpress; fi

# No other WP-CLI/catalog writer should run during this short maintenance window.
"${compose[@]}" exec -T db sh -c 'MYSQL_PWD="$MARIADB_ROOT_PASSWORD" exec mariadb-dump --user=root --single-transaction --routines --events --databases "$MARIADB_DATABASE"' | gzip > "$backup/database.sql.gz"
"${compose[@]}" run --rm --no-deps -T --entrypoint tar setup -czf - -C /var/www/html . > "$backup/wordpress.tar.gz"
cp .env.woocommerce "$backup/local-environment.env"
"${compose[@]}" config --images > "$backup/images.txt"
for name in database.sql.gz wordpress.tar.gz local-environment.env images.txt; do
  hash="$(sha256sum "$backup/$name")"
  printf '%s  %s\n' "${hash%% *}" "$name"
done > "$backup/SHA256SUMS"
node scripts/woocommerce/backup-verify.mjs "$backup"
printf 'Backup created: %s\n' "$backup"
