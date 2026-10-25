#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ ! -f .env.production ]]; then bash scripts/production-init.sh; fi
export RELEASE_TAG="${RELEASE_TAG:-$(git rev-parse --short=12 HEAD)}"
mkdir -p .local
command -v docker > /dev/null || { echo 'Cần cài Docker Engine và Docker Compose v2 trên server.' >&2; exit 1; }
compose=(docker compose --env-file .env.production -f compose.production.yaml)
"${compose[@]}" build api web
"${compose[@]}" up -d --wait postgres redis
if [[ $("${compose[@]}" exec -T postgres psql -U debtnote -d debtnote -Atc "SELECT to_regclass('public.accounts') IS NOT NULL") == t ]]; then
  bash scripts/production-backup.sh
fi
"${compose[@]}" run --rm --no-deps api pnpm --filter @debtnote/database db:migrate
"${compose[@]}" up -d --wait api worker web
curl --fail --silent http://127.0.0.1:18080/readyz
umask 077
if [[ -f .local/current-release ]]; then cp .local/current-release .local/previous-release; fi
printf '%s\n' "$RELEASE_TAG" > .local/current-release
printf '\nĐã chạy bản %s trên 127.0.0.1:18080. Kiểm tra domain sau khi Nginx proxy đã cấu hình.\n' "$RELEASE_TAG"
