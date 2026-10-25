#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
backup_directory="${1:?Truyền thư mục backup cần kiểm tra}"
compose=(docker compose --env-file .env.production -f compose.production.yaml)
restore_database="restore_check_$(date +%s)_$RANDOM"
"${compose[@]}" exec -T postgres createdb -U debtnote "$restore_database"
trap '"${compose[@]}" exec -T postgres dropdb -U debtnote "$restore_database"' EXIT
"${compose[@]}" exec -T postgres pg_restore -U debtnote -d "$restore_database" --no-owner --exit-on-error < "$backup_directory/database.dump"
"${compose[@]}" exec -T postgres psql -U debtnote -d "$restore_database" -c 'SELECT count(*) AS so_khoan FROM debts; SELECT count(*) AS so_thanh_toan FROM payments;'
tar tzf "$backup_directory/uploads.tar.gz" > /dev/null
echo 'Đã khôi phục thử vào DB riêng và đọc được kho ảnh. DB đang dùng không bị thay đổi.'
