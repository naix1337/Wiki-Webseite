@echo off
echo Starte Docs Wiki Server...

cd /d "%~dp0"

REM Prüfe und installiere benötigte Pakete
if not exist node_modules\http-server\bin\http-server (
    echo http-server nicht gefunden. Installiere http-server...
    call npm install http-server --save-dev
)

if not exist node_modules\json-server\bin\json-server.js (
    echo json-server nicht gefunden. Installiere json-server...
    call npm install json-server --save-dev
)

REM Erstelle db.json falls nicht vorhanden
if not exist db.json (
    echo { "docs": [], "guides": [], "faq": [], "users": [] } > db.json
    echo Beispiel-Datenbank db.json erstellt
)

echo.
echo Starte Backend-Server auf http://localhost:3000
echo Starte Frontend-Server auf http://localhost:8080
echo.
echo Drücke Strg+C um beide Server zu beenden
echo.

REM Starte beide Server in einem Prozess
start "Backend-Server" cmd /c "node node_modules\json-server\bin\json-server.js --watch db.json --port 3000"
start "Frontend-Server" cmd /c "node node_modules\http-server\bin\http-server -c-1 --cors -p 8080 ."

REM Öffne den Browser automatisch
timeout /t 2 > nul
start http://localhost:8080/index.html

echo Server erfolgreich gestartet!
echo Browser sollte sich automatisch öffnen mit http://localhost:8080/index.html
echo.
echo Warte auf Benutzeraktion...
pause