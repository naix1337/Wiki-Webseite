@echo off
echo Starte Backend-Server...
echo Server läuft auf http://localhost:3000
cd /d "%~dp0"
if exist node_modules\json-server\bin\json-server.js (
    node node_modules\json-server\bin\json-server.js --watch db.json --port 3000
) else (
    echo json-server nicht gefunden. Installiere json-server...
    npm install json-server --save-dev
    if not exist db.json (
        echo { "docs": [], "guides": [], "faq": [], "users": [] } > db.json
        echo Beispiel-Datenbank db.json erstellt
    )
    node node_modules\json-server\bin\json-server.js --watch db.json --port 3000
)