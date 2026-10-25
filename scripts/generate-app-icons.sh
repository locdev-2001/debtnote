#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
source_icon=design-assets/brand/logo-mascot-v1.png
icon_directory=apps/web/public
mkdir -p "$icon_directory/visuals"
magick "$source_icon" -resize 256x256 -quality 90 -strip "$icon_directory/visuals/brand-mark.webp"
encoded_mark=$(base64 < "$icon_directory/visuals/brand-mark.webp" | tr -d '\n')
printf '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><title>Logo Debtnote</title><image href="data:image/webp;base64,%s" width="512" height="512"/></svg>\n' "$encoded_mark" > "$icon_directory/favicon.svg"
for icon_size in 192 512; do
  magick "$source_icon" -resize "${icon_size}x${icon_size}" -strip "$icon_directory/icon-$icon_size.png"
done
magick "$source_icon" -resize 384x384 -background white -gravity center -extent 512x512 -strip "$icon_directory/icon-maskable-512.png"
magick "$source_icon" -resize 150x150 -background white -gravity center -extent 180x180 -strip "$icon_directory/apple-touch-icon.png"
magick "$source_icon" -resize 64x64 -strip "$icon_directory/favicon.png"
printf '%s\n' 'Đã xuất bộ icon từ logo mascot.'
