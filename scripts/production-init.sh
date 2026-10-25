#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ -e .env.production ]]; then
  echo 'Đã có .env.production; giữ nguyên cấu hình và khóa mã hóa.'
  exit 0
fi
umask 077
app_data_key=$(openssl rand -hex 32)
postgres_password=$(openssl rand -hex 24)
cat > .env.production <<CONFIG
APP_ORIGIN=https://debtnote.robertnguyen.io.vn
APP_DATA_KEY=$app_data_key
POSTGRES_PASSWORD=$postgres_password
API_PORT=3001
LOG_LEVEL=info
CONFIG
echo 'Đã tạo .env.production. Giữ bản sao khóa cùng bản backup.'
