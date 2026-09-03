// security.js - Zentrale Security & API Logik für Limazon

const API_HOST = new URL(window.LIMO_API).hostname;
const FP_STORAGE_KEY = "limo_fingerprint";

// ------------------------------------------------------------
// Hilfsfunktionen für Cookies (Multi-Layer Storage)
// ------------------------------------------------------------

function setFpCookie(value) {
    const days = 365; // 1 Jahr Gültigkeit
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    // SameSite=Lax schützt vor einigen CSRF-Angriffen
    document.cookie = `${FP_STORAGE_KEY}=${value}; expires=${date.toUTCString()}; path=/; SameSite=Lax`;
}

function getFpCookie() {
    const nameEQ = FP_STORAGE_KEY + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i].trim();
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

// ------------------------------------------------------------
// Fingerprint laden & Selbstheilung
// ------------------------------------------------------------

let localFp = localStorage.getItem(FP_STORAGE_KEY);
let cookieFp = getFpCookie();

// Nimm den, der existiert
let visitorId = localFp || cookieFp;

if (visitorId) {
    // Selbstheilung: Falls einer von beiden fehlt, stelle ihn aus dem anderen wieder her
    if (!localFp) {
        localStorage.setItem(FP_STORAGE_KEY, visitorId);
        console.log("🔒 [Security] Fingerprint aus Cookie im LocalStorage wiederhergestellt.");
    }
    if (!cookieFp) {
        setFpCookie(visitorId);
        console.log("🔒 [Security] Fingerprint aus LocalStorage im Cookie wiederhergestellt.");
    }
    console.log("🔒 [Security] Bekanntes Gerät erkannt:", visitorId);
} else {
    console.log("🔒 [Security] Neues Gerät. Generiere Fingerprint...");
    generateAndSaveFingerprint();
}

// ------------------------------------------------------------
// Globales Fetch patchen
// ------------------------------------------------------------

const originalFetch = window.fetch.bind(window);

window.fetch = async function(resource, init = {}) {
    let config = {
        credentials: "include",
        ...init
    };

    let url;
    try {
        url = new URL(resource instanceof Request ? resource.url : resource, location.href);
    } catch {
        return originalFetch(resource, config);
    }

    if (url.hostname === API_HOST) {
        config.credentials = "include";
        const headers = new Headers(config.headers || {});

        // Aktuellsten Fingerprint immer direkt aus der Variable nehmen
        if (visitorId) {
            headers.set("x-device-fingerprint", visitorId);
        }

        if (
            config.body &&
            typeof config.body === "object" &&
            !(config.body instanceof FormData) &&
            !(config.body instanceof Blob) &&
            !(config.body instanceof URLSearchParams) &&
            !(config.body instanceof ArrayBuffer)
        ) {
            config.body = JSON.stringify(config.body);
        }

        if (typeof config.body === "string" && !headers.has("Content-Type")) {
            headers.set("Content-Type", "application/json");
        }

        config.headers = headers;
    }

    const response = await originalFetch(resource, config);

    if (!response.ok) {
        console.warn(`⚠️ ${config.method || "GET"} ${url.pathname} -> ${response.status}`);
    }

    return response;
};

// ------------------------------------------------------------
// Axios absichern
// ------------------------------------------------------------

if (typeof axios !== "undefined") {
    axios.defaults.withCredentials = true;
    if (visitorId) {
        axios.defaults.headers.common["x-device-fingerprint"] = visitorId;
    }
}

// ------------------------------------------------------------
// Komfortfunktion für JSON
// ------------------------------------------------------------

window.fetchJSON = async function(url, options = {}) {
    const res = await fetch(url, options);
    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`${res.status}: ${txt}`);
    }
    return res.json();
};

// ------------------------------------------------------------
// Fingerprint erzeugen
// ------------------------------------------------------------

function generateAndSaveFingerprint() {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@fingerprintjs/fingerprintjs@4/dist/fp.min.js";
    script.async = true;

    script.onload = () => {
        FingerprintJS.load()
            .then(fp => fp.get())
            .then(result => {
                visitorId = result.visitorId;
                
                // An beiden Orten speichern
                localStorage.setItem(FP_STORAGE_KEY, visitorId);
                setFpCookie(visitorId);

                console.log("🔒 [Security] Neuer Fingerprint gespeichert:", visitorId);

                if (typeof axios !== "undefined") {
                    axios.defaults.headers.common["x-device-fingerprint"] = visitorId;
                }
            })
            .catch(err => {
                console.error("Fingerprint Fehler:", err);
            });
    };

    script.onerror = err => {
        console.error("FingerprintJS konnte nicht geladen werden:", err);
    };

    document.head.appendChild(script);
}