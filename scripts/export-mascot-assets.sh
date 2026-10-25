#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

if command -v magick >/dev/null 2>&1; then
  image_converter=(magick)
elif command -v convert >/dev/null 2>&1; then
  image_converter=(convert)
else
  printf '%s\n' 'Cần ImageMagick để xuất WebP từ ảnh gốc.' >&2
  exit 1
fi

for mascot_state in welcome settled reminder; do
  "${image_converter[@]}" "design-assets/mascot/$mascot_state.png" -quality 86 -define webp:alpha-quality=100 "apps/web/public/visuals/mascot-$mascot_state.webp"
done
printf '%s\n' 'Đã xuất 3 ảnh mascot WebP, giữ nền trong suốt và ảnh PNG gốc.'
