#!/bin/bash
echo "Starte Frontend-Server..."
echo "Server läuft auf http://localhost:8080"
cd "$(dirname "$0")"
if [ -f "node_modules/http-server/bin/http-server" ]; then
    node node_modules/http-server/bin/http-server -p 8080
else
    echo "http-server nicht gefunden. Installiere http-server..."
    npm install http-server --save-dev
    node node_modules/http-server/bin/http-server -p 8080
fi