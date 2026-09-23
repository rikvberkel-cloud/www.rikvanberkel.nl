#!/usr/bin/env bash
# Controleert dat elke lokale href en src in de HTML bestaat.
# Gebruik: ./scripts/check-links.sh [map]   (standaard de projectmap)
set -euo pipefail

ROOT="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$ROOT"

refs="$(mktemp)"
trap 'rm -f "$refs"' EXIT

for page in *.html; do
  [ -e "$page" ] || continue
  grep -oE '(href|src)="[^"]+"' "$page" \
    | sed -E 's/^(href|src)="//; s/"$//' \
    | grep -vE '^(https?:|mailto:|tel:|data:|#)' \
    | sed 's/#.*//' \
    | sed "s|^|$page |" >> "$refs" || true
done

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
