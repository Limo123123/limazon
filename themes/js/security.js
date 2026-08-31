// security.js - Zentrale Security & API Logik für Limazon

const API_HOST = new URL(window.LIMO_API).hostname;
const FP_STORAGE_KEY = "limo_fingerprint";

// ------------------------------------------------------------
// Fingerprint laden
// ------------------------------------------------------------

let visitorId = localStorage.getItem(FP_STORAGE_KEY);

if (visitorId) {
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

    // URL bestimmen
    let url;

    try {
        url = new URL(
            resource instanceof Request ? resource.url : resource,
            location.href
        );
    } catch {
        return originalFetch(resource, config);
    }

    // Nur unsere API verändern
    if (url.hostname === API_HOST) {

        config.credentials = "include";

        const headers = new Headers(config.headers || {});

        // Fingerprint
        const fp = localStorage.getItem(FP_STORAGE_KEY);

        if (fp) {
            headers.set("x-device-fingerprint", fp);
        }

        // Body automatisch zu JSON machen
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

        // JSON Content-Type automatisch setzen
        if (
            typeof config.body === "string" &&
            !headers.has("Content-Type")
        ) {
            headers.set("Content-Type", "application/json");
        }

        config.headers = headers;
    }

    const response = await originalFetch(resource, config);

    if (!response.ok) {
        console.warn(
            `⚠️ ${config.method || "GET"} ${url.pathname} -> ${response.status}`
        );
    }

    return response;
};

// ------------------------------------------------------------
// Axios absichern
// ------------------------------------------------------------

if (typeof axios !== "undefined") {

    axios.defaults.withCredentials = true;

    const fp = localStorage.getItem(FP_STORAGE_KEY);

    if (fp) {
        axios.defaults.headers.common["x-device-fingerprint"] = fp;
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

                localStorage.setItem(FP_STORAGE_KEY, visitorId);

                console.log(
                    "🔒 [Security] Neuer Fingerprint gespeichert:",
                    visitorId
                );

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