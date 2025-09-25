# Connect Database

- Problem: Wie verbinde ich meine App mit der Datenbank?
- Lösung: Verbindungstring konfigurieren und Client initialisieren.
- Ergebnis: Erfolgreiche Verbindung und erste Abfrage.

## Beispiel (Pseudo)

```bash
export DATABASE_URL="postgres://user:pass@localhost:5432/app"
```

```js
import { Client } from 'pg'
const client = new Client({ connectionString: process.env.DATABASE_URL })
await client.connect()
const rows = await client.query('select now()')
console.log(rows)
```
