// security.js - Zentrale Security & Fingerprint Logik für Limazon

const API_URL_CHECK = 'api.limazon.v6.rocks';

// 1. Zuerst den Fetch-Interceptor global und SOFORT definieren!
const originalFetch = window.fetch;
window.fetch = async function(...args) {
    let [resource, config] = args;
    if (!config) config = {};
    if (!config.headers) config.headers = {};
    
    // A. Credentials für DEINE API hinzufügen (verhindert den 404 Fehler in alten HTMLs!)
    if (typeof resource === 'string' && resource.includes(API_URL_CHECK)) {
        config.credentials = 'include';
    }

    // B. Fingerprint hinzufügen, falls bereits im LocalStorage vorhanden
    const currentFp = localStorage.getItem('limo_fingerprint');
    if (currentFp) {
        if (config.headers instanceof Headers) {
            config.headers.append('x-device-fingerprint', currentFp);
        } else {
            config.headers['x-device-fingerprint'] = currentFp;
        }
    }
    
    return originalFetch(resource, config);
};

// Falls du irgendwo axios nutzt, sichern wir das auch gleich ab
if (typeof axios !== 'undefined') {
    axios.defaults.withCredentials = true; 
    const savedFp = localStorage.getItem('limo_fingerprint');
    if (savedFp) axios.defaults.headers.common['x-device-fingerprint'] = savedFp;
}

// 2. Fingerprint Logik ausführen
let visitorId = localStorage.getItem('limo_fingerprint');

if (visitorId) {
    console.log("🔒 [Security] Bekanntes Gerät erkannt: " + visitorId);
} else {
    console.log("🔒 [Security] Neues Gerät. Generiere Fingerprint...");
    generateAndSaveFingerprint();
}

// 3. Funktion zum Generieren (wird nur 1x pro Gerät/Cache-Lebensdauer ausgeführt)
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
                
                // Für axios nachziehen, fetch greift ab jetzt automatisch auf localStorage zu
                if (typeof axios !== 'undefined') {
                    axios.defaults.headers.common['x-device-fingerprint'] = visitorId;
                }
            })
            .catch(err => console.error("Fehler beim Berechnen des Fingerprints:", err));
    };

    script.onerror = (err) => console.error("Konnte fp.min.js nicht laden:", err);
    document.head.appendChild(script);
}