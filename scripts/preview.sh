#!/usr/bin/env bash
# Lokale preview voor desktop + telefoon (zelfde wifi of tijdelijke tunnel).
# Gebruik:
#   ./scripts/preview.sh           # laptop + telefoon op zelfde wifi
#   ./scripts/preview.sh --tunnel  # tijdelijke URL (Cloudflare Quick Tunnel)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-8080}"
USE_TUNNEL=0

for arg in "$@"; do
  case "$arg" in
    --tunnel|-t) USE_TUNNEL=1 ;;
    --help|-h)
      cat <<EOF
Gebruik: ./scripts/preview.sh [--tunnel]

  (standaard)  Server op alle netwerkinterfaces. Open op telefoon via
               http://<jouw-LAN-IP>:${PORT} (zelfde wifi als laptop).

  --tunnel     Start ook een Cloudflare Quick Tunnel. Handig buiten huis.
               Vereist cloudflared (brew install cloudflared).
               De URL is tijdelijk en bereikbaar voor wie de link heeft.

Omgevingsvariabele: PORT=8080 (default)
EOF
      exit 0
      ;;
    *)
      echo "Onbekende optie: $arg (probeer --help)" >&2
      exit 1
      ;;
  esac
done

lan_ip() {
  local ip=""
  if command -v ip >/dev/null 2>&1; then
    ip="$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for (i=1;i<=NF;i++) if ($i=="src") {print $(i+1); exit}}' || true)"
  fi
  if [[ -z "${ip}" ]] && command -v ifconfig >/dev/null 2>&1; then
    ip="$(ifconfig 2>/dev/null | awk '/inet / && $2 != "127.0.0.1" {print $2; exit}' || true)"
  fi
  if [[ -z "${ip}" ]]; then
    ip="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
  fi
  echo "${ip:-<onbekend>}"
}

port_in_use() {
  if command -v lsof >/dev/null 2>&1; then
    lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1
    return $?
  fi
  if command -v ss >/dev/null 2>&1; then
    ss -ltn "sport = :$PORT" 2>/dev/null | grep -q ":$PORT"
    return $?
  fi
  return 1
}

ensure_cloudflared() {
  if command -v cloudflared >/dev/null 2>&1; then
    return 0
  fi
  echo "cloudflared ontbreekt." >&2
  echo "Installeer: brew install cloudflared" >&2
  echo "Of: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/" >&2
  exit 1
}

cleanup() {
  if [[ -n "${SERVER_PID:-}" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  if [[ -n "${TUNNEL_PID:-}" ]] && kill -0 "$TUNNEL_PID" 2>/dev/null; then
    kill "$TUNNEL_PID" 2>/dev/null || true
    wait "$TUNNEL_PID" 2>/dev/null || true
  fi
  [ -n "${SITE:-}" ] && rm -rf "$SITE" || true
}
trap cleanup EXIT INT TERM

cd "$ROOT"

# Serveer alleen wat ook op de site komt, via koppelingen in een tijdelijke
# map. Zo zijn .git/, scripts/ en de rest van de werkmap niet
# bereikbaar, ook niet via de tunnel. Bewerken blijft live werken, want de
# koppelingen wijzen naar de echte bestanden.
SITE="$(mktemp -d)"
for f in *.html favicon.ico robots.txt sitemap.xml css js img fonts o .well-known; do
  [ -e "$f" ] && ln -s "$ROOT/$f" "$SITE/$f"
done

if port_in_use; then
  echo "Poort ${PORT} is al in gebruik. Stop dat proces of kies PORT=8090 ./scripts/preview.sh" >&2
  exit 1
fi

LAN_IP="$(lan_ip)"

echo ""
echo "Freelance-site preview"
echo "----------------------"
echo "Laptop:   http://127.0.0.1:${PORT}"
echo "Telefoon (zelfde wifi): http://${LAN_IP}:${PORT}"
if [[ "$LAN_IP" == "<onbekend>" ]] || [[ "$LAN_IP" == 172.* ]]; then
  echo ""
  echo "Tip: staat je telefoon op dezelfde wifi? Zoek het IP van je laptop in"
  echo "     Systeemvoorkeuren → Netwerk (vaak 192.168.x.x)."
fi
echo ""
echo "Stoppen: Ctrl+C"
echo ""

python3 -m http.server "$PORT" --bind 0.0.0.0 --directory "$SITE" &
SERVER_PID=$!

sleep 0.5
if ! kill -0 "$SERVER_PID" 2>/dev/null; then
  echo "Server startte niet." >&2
  exit 1
fi
if ! curl -sf "http://127.0.0.1:${PORT}/" >/dev/null; then
  echo "Server is niet bereikbaar op poort ${PORT}." >&2
  exit 1
fi

if [[ "$USE_TUNNEL" -eq 1 ]]; then
  ensure_cloudflared
  echo "Tunnel starten (Cloudflare Quick Tunnel)…"
  echo "De trycloudflare.com-URL verschijnt hieronder."
  echo ""
  cloudflared tunnel --url "http://127.0.0.1:${PORT}"
else
  wait "$SERVER_PID"
fi
