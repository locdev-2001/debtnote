#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
for executable in node pnpm pm2 psql pg_dump curl; do
  command -v "$executable" > /dev/null || { printf 'Thiếu %s trong PATH của tài khoản triển khai.\n' "$executable" >&2; exit 1; }
done
node --input-type=module -e 'const [major, minor] = process.versions.node.split(".").map(Number); if (!((major === 22 && minor >= 18) || (major === 24 && minor >= 11) || major > 24)) { console.error("Cần Node.js 22.18+ hoặc 24.11+."); process.exit(1); }'
if [[ ! -f .env.production ]]; then bash scripts/production-init.sh; fi
node scripts/production-command.mjs check
node scripts/production-command.mjs prepare
pnpm install --frozen-lockfile --prod=false
node scripts/production-command.mjs run pnpm build
if [[ $(node scripts/production-command.mjs postgres psql -X -Atc "SELECT to_regclass('public.accounts') IS NOT NULL") == t ]]; then
  bash scripts/production-backup.sh
fi
node scripts/production-command.mjs run pnpm --filter @debtnote/database db:migrate
pm2 startOrRestart ecosystem.config.cjs --update-env
api_url=$(node scripts/production-command.mjs api-url)
for attempt in {1..30}; do
  if curl --fail --silent "$api_url/readyz" > /dev/null; then break; fi
  sleep 1
done
curl --fail --silent "$api_url/readyz"
node scripts/production-command.mjs run pnpm worker:probe
pm2 save
umask 077
if [[ -f .local/current-release ]]; then cp .local/current-release .local/previous-release; fi
git rev-parse HEAD > .local/current-release
printf '\nĐã chạy API/worker qua PM2. Web: %s/apps/web/dist\n' "$PWD"
