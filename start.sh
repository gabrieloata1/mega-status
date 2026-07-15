#!/bin/bash
# Inicia o servidor HTTP e o tunel Cloudflare
pkill -f "http.server" 2>/dev/null
pkill -f cloudflared 2>/dev/null
sleep 1

python3 -m http.server 8000 --directory "$(dirname "$0")" &
HTTP_PID=$!
echo "[OK] HTTP Server iniciado (PID: $HTTP_PID) - http://localhost:8000"
sleep 2

cloudflared tunnel --url http://localhost:8000 --no-autoupdate 2>&1 &
echo "[OK] Cloudflare Tunnel iniciado - aguardando URL..."

wait $HTTP_PID