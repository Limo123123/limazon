# Limazon Frontend - AI Guidelines & Context

Dieses Projekt ist das Frontend für Limazon, ein browserbasiertes Multiplayer-Wirtschafts- und Social-Spiel. Es ist als Multi-Tenant-System aufgebaut: Ein einziger Frontend-Code bedient mehrere Backend-Instanzen.

## 1. Dynamische API-URLs (WICHTIG!)
- Schreibe **niemals** hartcodierte Backend-URLs (wie `https://api.limazon.v6.rocks`) in den Code.
- Nutze für alle API-Aufrufe (`fetch`) IMMER die globale Variable `window.LIMO_API`.
- Beispiel: `fetch(window.LIMO_API + '/api/endpoint', ...)`
- Wenn nur der Hostname benötigt wird (z. B. für WebSockets oder Cookies), nutze: `new URL(window.LIMO_API).hostname`.

## 2. Config & Security Scripts (Manuelles Patcher-Skript)
- Wenn du neue HTML-Dateien erstellst, binde im `<head>` IMMER als erstes die Config und dann die Security ein:
  `<script src="/themes/js/config.js"></script>`
  `<script src="/themes/js/security.js"></script>`
- **Wichtiger Hinweis für die KI:** Erinnere den User bei der Erstellung neuer HTML-Dateien kurz daran, sein lokales Skript `autopatch-security.py` auszuführen, damit die korrekten Zeitstempel (`?v=...`) generiert und die Reihenfolge final gesichert wird.

## 3. Styling & UI
- Wir nutzen Tailwind CSS via CDN (`<script src="https://cdn.tailwindcss.com"></script>`). Die Browser-Warnung bezüglich "not for production" ist bekannt und wird ignoriert.
- Das Design-Thema ist "Dark Mode". Nutze `bg-slate-900`, `text-slate-400`, Neon-Akzente (`text-blue-500`, `text-purple-500`) und Glassmorphismus (`backdrop-blur`).

## 4. State Management & Authentifizierung
- Der API-Endpunkt wird vom User über ein Dropdown gewählt und in `localStorage.getItem('limazon_api_target')` gespeichert. Die `config.js` kümmert sich um das korrekte Routing.
- Die Authentifizierung läuft über Session-Cookies. Du MUSST bei jedem einzelnen `fetch()`-Aufruf zwingend `credentials: 'include'` mitsenden, sonst wird der Request vom Backend blockiert.

## 5. Error Handling (403 & 423) & Modul-System
Das Frontend verfügt über eine globale Fehlerbehandlung (`limo-global.js`).
- **HTTP 403 (Forbidden):** Tritt auf, wenn der Admin ein Modul deaktiviert hat (z.B. für Schul-Server).
- **HTTP 423 (Locked):** Tritt auf, wenn die Gewerkschaft dieses Modul erfolgreich bestreikt.

**Du musst im Frontend für diese Fehler keine eigene UI bauen!** 
Das Python-Skript `autopatch-security.py` liest den HTML-Dateinamen (z.B. `casino.html`) aus und setzt automatisch `<script src="..." data-page="casino"></script>`. Die `limo-global.js` überschreibt `window.fetch`, fängt diese Fehlercodes bei API-Anfragen vollautomatisch ab und wirft ein bildschirmfüllendes Absperrband-Overlay (Rot für Streik, Grau für Deaktiviert) über die Seite.