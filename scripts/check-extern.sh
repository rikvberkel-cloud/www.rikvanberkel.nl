#!/usr/bin/env bash
# Controleert of de externe links op de site nog werken, zoals de links naar
# de media op Publicaties. Draait elke maand in GitHub Actions, want zulke
# links verdwijnen zonder dat iets aan de site verandert.
# Gebruik: ./scripts/check-extern.sh [map]   (standaard de projectmap)
#
# Kapot, dus rood: 404, 410, een serverfout of geen verbinding, na twee
# nieuwe pogingen. Alleen een waarschuwing: 401, 403, 429 en 999. Zo
# blokkeren sites als LinkedIn een controle zonder dat de link kapot is.
set -euo pipefail

ROOT="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$ROOT"

shopt -s nullglob
paginas=(*.html)
if [ "${#paginas[@]}" -eq 0 ]; then
  echo "Geen pagina's gevonden in $ROOT. Klopt de map?" >&2
  exit 2
fi

mapfile -t links < <(grep -ohE 'href="https?://[^"]+"' "${paginas[@]}" \
  | sed -e 's/^href="//' -e 's/"$//' -e 's/&amp;/\&/g' \
  | grep -v '^https://www\.rikvanberkel\.nl/' | sort -u)

# De eigen site valt erbuiten, die controleert check-links.sh.
# Niets te controleren betekent een verkeerde map of een kapotte zoekregel.
if [ "${#links[@]}" -eq 0 ]; then
  echo "Geen externe links gevonden in $ROOT." >&2
  exit 2
fi

kapot=0
for url in "${links[@]}"; do
  code=$(curl -sS -L -o /dev/null -w '%{http_code}' --max-time 20 \
    --retry 2 --retry-delay 5 \
    -A 'Mozilla/5.0 (compatible; linkcontrole rikvanberkel.nl)' \
    "$url" 2>/dev/null) || true
  code="${code:-000}"
  case "$code" in
    2??) echo "ok    $code $url" ;;
    401|403|429|999) echo "let op $code $url (site blokkeert de controle, kijk zelf)" ;;
    *) echo "KAPOT $code $url"; kapot=1 ;;
  esac
done

if [ "$kapot" -ne 0 ]; then
  echo "Er zijn kapotte externe links. Zoek een nieuwe link of een archiefversie." >&2
  exit 1
fi
echo "Alle ${#links[@]} externe links gecontroleerd."
