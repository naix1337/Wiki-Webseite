# Setup Server

- Problem: Wie hoste ich die Docs lokal?
- Lösung: Einen einfachen statischen Server starten.
- Ergebnis: Docs unter `http://localhost:8080/` erreichbar.

## Schritte

1. In das Projektverzeichnis wechseln
2. Server starten
   ```bash
   python -m http.server 8080
   ```
3. Browser öffnen: `http://localhost:8080/my-docs-spa/#/docs`
