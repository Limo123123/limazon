// config.js
(function() {
    let savedInstance = localStorage.getItem('limazon_api_target');
    
    // Schutz vor falschen Text-Strings im LocalStorage!
    if (savedInstance === "undefined" || savedInstance === "null" || savedInstance === "") {
        savedInstance = null;
        localStorage.removeItem('limazon_api_target');
    }
    
    // Standard-API ermitteln
    let defaultApi = "https://api.limazon.v6.rocks"; 
    
    // Wenn das Frontend über die Backup-Domain aufgerufen wird, nimm automatisch das Backup-Backend!
    if (window.location.hostname === "lizapp2.duckdns.org") {
        defaultApi = "https://lizse2.duckdns.org";
    }
    
    // Global verfügbar machen (User-Auswahl überschreibt den Standard)
    window.LIMO_API = savedInstance ? savedInstance : defaultApi;
})();