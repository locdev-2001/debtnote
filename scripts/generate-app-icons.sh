#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

if command -v magick >/dev/null 2>&1; then
  image_converter=(magick)
elif command -v convert >/dev/null 2>&1; then
  image_converter=(convert)
else
  printf '%s\n' 'Cần ImageMagick để xuất icon PNG từ favicon.svg.' >&2
  exit 1
fi

icon_directory=apps/web/public
source_icon="$icon_directory/favicon.svg"
brand_background="$(node --input-type=module - "$source_icon" <<'JS'
import { readFileSync } from 'node:fs';
const logoSource = readFileSync(process.argv[2], 'utf8');
const background = logoSource.match(/<rect\b[^>]*\bfill="(#[a-f0-9]{6})"/i)?.[1];
if (!background) throw new Error('Không tìm thấy màu nền của logo.');
process.stdout.write(background);
JS
)"

for icon_size in 192 512; do
  "${image_converter[@]}" -background none -density 768 "$source_icon" -resize "${icon_size}x${icon_size}" -colors 128 -define png:color-type=3 -strip "$icon_directory/icon-$icon_size.png"
done

"${image_converter[@]}" -background "$brand_background" -density 768 "$source_icon" -resize 512x512 -flatten -colors 128 -define png:color-type=3 -strip "$icon_directory/icon-maskable-512.png"
"${image_converter[@]}" -background "$brand_background" -density 768 "$source_icon" -resize 180x180 -flatten -colors 128 -define png:color-type=3 -strip "$icon_directory/apple-touch-icon.png"
printf '%s\n' 'Đã xuất bộ icon ứng dụng từ favicon.svg.'
