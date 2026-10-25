#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
umask 077
backup_directory="${BACKUP_DIR:-$PWD/.local/backups}/$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$backup_directory"
compose=(docker compose --env-file .env.production -f compose.production.yaml)
"${compose[@]}" exec -T postgres pg_dump -U debtnote -d debtnote -Fc > "$backup_directory/database.dump"
"${compose[@]}" run --rm --no-deps -T api tar czf - -C /data uploads > "$backup_directory/uploads.tar.gz"
cp .env.production "$backup_directory/environment"
git rev-parse HEAD > "$backup_directory/revision"
sha256sum "$backup_directory/database.dump" "$backup_directory/uploads.tar.gz" > "$backup_directory/SHA256SUMS"
printf 'Đã backup: %s\n' "$backup_directory"
