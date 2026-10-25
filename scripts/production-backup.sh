#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
umask 077
backup_root="${BACKUP_DIR:-$PWD/.local/backups}"
mkdir -p "$backup_root"
backup_directory=$(mktemp -d "$backup_root/$(date -u +%Y%m%dT%H%M%SZ)-XXXXXX")
node scripts/production-command.mjs postgres pg_dump -Fc -f "$backup_directory/database.dump"
upload_directory=$(node scripts/production-command.mjs upload-directory)
tar czf "$backup_directory/uploads.tar.gz" -C "$upload_directory" .
environment_file=$(node scripts/production-command.mjs environment-path)
cp "$environment_file" "$backup_directory/environment"
if [[ -f .local/current-release ]]; then cp .local/current-release "$backup_directory/revision"; else git rev-parse HEAD > "$backup_directory/revision"; fi
(cd "$backup_directory" && sha256sum database.dump uploads.tar.gz > SHA256SUMS)
printf 'Đã backup: %s\n' "$backup_directory"
