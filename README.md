# Random Commander

Random Commander ist eine React-App zum Ziehen zufälliger Commander-Karten. Das Projekt ist nun ein Monorepo: Das React-Frontend bleibt für die Benutzeroberfläche zuständig, während die Spring-Boot-API den Zugriff auf Scryfall bündelt.

## Projektstruktur

- frontend/ – React 19 und Vite
- backend/ – Spring Boot 3 API (Java 17)

## Lokal starten

Voraussetzungen: Node.js 20.19+, Java 17 und Maven 3.9+.

1. Im Projektstamm npm install ausführen.
2. In backend/ mvn spring-boot:run ausführen.
3. In einem zweiten Terminal im Projektstamm npm run dev ausführen.

Das Frontend läuft standardmäßig auf http://localhost:5173. Vite leitet alle Anfragen nach /api an das Spring-Boot-Backend auf Port 8080 weiter.

## API

Alle Endpunkte liegen unter /api/scryfall/cards:

- GET /random?query=... – eine zufällige Karte
- GET /named/exact?name=... – Karte mit exaktem Namen
- GET /named/fuzzy?name=... – Karte mit unscharfer Namenssuche
- GET /search?query=... – alle Treffer einer Scryfall-Suche

Die API validiert die Parameter, leitet Fehler von Scryfall kontrolliert weiter und begrenzt mehrseitige Suchen über SCRYFALL_MAX_SEARCH_PAGES (Standard: 10).

## Deployment

Das Frontend kann wie bisher auf Vercel deployt werden. Als Root Directory des Vercel-Projekts frontend/ auswählen und die Build-Einstellungen von Vite automatisch erkennen lassen. Für die Produktionsumgebung muss dort die Variable VITE_API_BASE_URL auf die öffentliche API-Adresse inklusive /api gesetzt werden, zum Beispiel https://api.example.com/api.

Das Backend ist als Docker-Container unter backend/Dockerfile vorbereitet und kann beispielsweise auf Render, Railway, Fly.io oder Google Cloud Run laufen. Dort die Variable CORS_ALLOWED_ORIGINS auf die Vercel-Domain setzen, zum Beispiel https://random-commander.vercel.app. Der Port wird über PORT übernommen.

Der Spielverlauf bleibt in diesem ersten Schritt absichtlich im Browser Local Storage. Eine PostgreSQL-Anbindung für geteilte, serverseitige Spielverläufe ist der nächste sinnvolle Ausbau.
