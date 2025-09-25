#!/bin/bash
echo "Starte Backend-Server..."
echo "Server läuft auf http://localhost:3000"
cd "$(dirname "$0")"
if [ -f "node_modules/json-server/bin/json-server.js" ]; then
    node node_modules/json-server/bin/json-server.js --watch db.json --port 3000
else
    echo "json-server nicht gefunden. Installiere json-server..."
    npm install json-server --save-dev
    if [ ! -f "db.json" ]; then
        echo '{ "docs": [], "guides": [], "faq": [], "users": [] }' > db.json
        echo "Beispiel-Datenbank db.json erstellt"
    fi
    node node_modules/json-server/bin/json-server.js --watch db.json --port 3000
fi