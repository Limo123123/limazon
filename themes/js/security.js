// security.js - Zentrale Security & Fingerprint Logik für Limazon

// 1. Prüfen, ob wir das Gerät schon kennen
let visitorId = localStorage.getItem('limo_fingerprint');

if (visitorId) {
    console.log("🔒 [Security] Bekanntes Gerät erkannt: " + visitorId);
    applyFingerprint(visitorId);
} else {
    console.log("🔒 [Security] Neues Gerät. Generiere Fingerprint...");
    generateAndSaveFingerprint();
}

// 2. Funktion zum Generieren (wird nur 1x pro Gerät/Cache-Lebensdauer ausgeführt)
function generateAndSaveFingerprint() {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@fingerprintjs/fingerprintjs@4/dist/fp.min.js';
    script.async = true;

    script.onload = () => {
        FingerprintJS.load()
            .then(fp => fp.get())
            .then(result => {
                visitorId = result.visitorId;
                // Hash bombenfest im LocalStorage verankern
                localStorage.setItem('limo_fingerprint', visitorId);
                console.log("🔒 [Security] Neuer Fingerprint gespeichert: " + visitorId);
                applyFingerprint(visitorId);
            })
            .catch(err => console.error("Fehler beim Berechnen des Fingerprints:", err));
    };

    script.onerror = (err) => console.error("Konnte fp.min.js nicht laden:", err);
    document.head.appendChild(script);
}

// 3. Funktion, die den Header an alle künftigen Requests tackert
function applyFingerprint(id) {
    // Wenn du AXIOS nutzt:
    if (typeof axios !== 'undefined') {
        axios.defaults.headers.common['x-device-fingerprint'] = id;
    }

    // Wenn du NATIVES FETCH nutzt:
    const originalFetch = window.fetch;
    window.fetch = async function() {
        let [resource, config] = arguments;
        if (!config) config = {};
        if (!config.headers) config.headers = {};
        
        if (config.headers instanceof Headers) {
            config.headers.append('x-device-fingerprint', id);
        } else {
            config.headers['x-device-fingerprint'] = id;
        }
        
        return originalFetch(resource, config);
    };
}