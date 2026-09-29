#!/usr/bin/env bash
# Controleert dat er geen adres op de site staat: geen postcode, geen straat
# met huisnummer en geen straat of postcode in de gestructureerde data.
# Rik wil zijn woonadres nergens op de site, ook niet in de voet, de
# algemene voorwaarden of de privacyverklaring.
# Gebruik: ./scripts/check-adres.sh [map]   (standaard de projectmap)
set -euo pipefail

ROOT="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
cd "$ROOT"

bestanden=()
for f in *.html sitemap.xml robots.txt js/*.js; do
  [ -e "$f" ] && bestanden+=("$f")
done

# Postcode, zoals 1234 AB, ook met een harde spatie ertussen.
postcode='\b[1-9][0-9]{3}([[:space:]]|&nbsp;|&#160;)?[A-Z]{2}\b'
# Straat met huisnummer, zoals Voorbeeldlaan 12.
straat='\b[A-Z][a-z]+(straat|laan|weg|plein|singel|gracht|kade|dreef|hof|park|dijk|pad|steeg)[[:space:]]+[0-9]+'
# Straat of postcode in de JSON-LD.
jsonld='"(streetAddress|postalCode)"'

status=0
for patroon in "$postcode" "$straat" "$jsonld"; do
  if grep -n -E "$patroon" "${bestanden[@]}"; then
    status=1
  fi
done

if [ "$status" -ne 0 ]; then
  echo "Er staat iets op de site dat op een adres lijkt. Haal het weg, of pas dit script aan als het vals alarm is."
  exit 1
fi

echo "Geen adres gevonden (${#bestanden[@]} bestanden gecontroleerd)."
