# Getting Started

In 3 Schritten loslegen:

1. Dieses Verzeichnis mit einem statischen Server starten (z. B. via Python):
   ```bash
   python -m http.server 8080
   ```
2. Im Browser öffnen: `http://localhost:8080/my-docs-spa/#/docs`
3. Inhalte in `public/docs` bearbeiten.

Minimalbeispiel:

```md
# Hello World
Deine erste Seite!
```

Erwartetes Ergebnis: Die Seite rendert Markdown, Tabs und Sidebar sind sichtbar.
