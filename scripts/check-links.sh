#!/usr/bin/env bash
# Controleert dat elke lokale verwijzing bestaat: href en src in de HTML, de
# kandidaten in srcset, en url() in css/*.css. Een versie achter het adres,
# zoals ?v=20261022, en een anker tellen niet mee. Een pad vanaf de root, zoals
# /css/style.css op de 404-pagina, wordt gezocht vanaf de projectmap.
# Gebruik: ./scripts/check-links.sh [map]   (standaard de projectmap)
set -euo pipefail

ROOT="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$ROOT"

refs="$(mktemp)"
trap 'rm -f "$refs"' EXIT

for page in *.html; do
  [ -e "$page" ] || continue
  {
    grep -oE '(href|src)="[^"]+"' "$page" | sed -E 's/^(href|src)="//; s/"$//' || true
    grep -oE 'srcset="[^"]+"' "$page" | sed -E 's/^srcset="//; s/"$//' | tr ',' '\n' | awk '{print $1}' || true
  } \
    | grep -vE '^(https?:|mailto:|tel:|data:|#)' \
    | sed 's/[?#].*//; s|^/||' \
    | awk -v page="$page" 'NF { print page, $0 }' >> "$refs" || true
done

# De fonts staan alleen in de CSS, als url("../fonts/..."), gezien vanuit css/.
for css in css/*.css; do
  [ -e "$css" ] || continue
  grep -oE "url\([\"']?[^\"')]+" "$css" \
    | sed -E "s/^url\([\"']?//" \
    | grep -vE '^(https?:|data:)' \
    | sed 's/[?#].*//; s|^\.\./||; s|^/||' \
    | awk -v page="$css" 'NF { print page, $0 }' >> "$refs" || true
done

# Niets gevonden betekent een verkeerde map, geen schone site.
if [ ! -s "$refs" ]; then
  echo "Geen verwijzingen gevonden in $ROOT. Klopt de map?" >&2
  exit 2
fi

status=0
while read -r page target; do
  [ -n "${target:-}" ] || continue
  if [ ! -e "$target" ]; then
    echo "ONTBREEKT: $target, verwezen vanuit $page"
    status=1
  fi
done < "$refs"

if [ "$status" -ne 0 ]; then
  echo "Er wordt verwezen naar bestanden die er niet zijn."
  exit 1
fi

echo "Alle lokale verwijzingen bestaan ($(wc -l < "$refs") gecontroleerd)."
