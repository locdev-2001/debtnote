#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
backup_directory=$(realpath "${1:?Truyền thư mục backup cần kiểm tra}")
(cd "$backup_directory" && sha256sum -c SHA256SUMS)
restore_database="debtnote_restore_$(date +%s)_$RANDOM"
node scripts/production-command.mjs postgres createdb "$restore_database"
trap 'node scripts/production-command.mjs postgres dropdb "$restore_database"' EXIT
node scripts/production-command.mjs postgres pg_restore --dbname="$restore_database" --no-owner --exit-on-error "$backup_directory/database.dump"
node scripts/production-command.mjs postgres psql --dbname="$restore_database" -X -c 'SELECT count(*) AS so_khoan FROM debts; SELECT count(*) AS so_thanh_toan FROM payments;'
tar tzf "$backup_directory/uploads.tar.gz" > /dev/null
echo 'Đã khôi phục thử vào DB riêng và đọc được kho ảnh. DB đang dùng không bị thay đổi.'
