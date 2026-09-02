// config.js
(function() {
    let savedInstance = localStorage.getItem('limazon_api_target');
    
    // Schutz vor falschen Text-Strings im LocalStorage!
    if (savedInstance === "undefined" || savedInstance === "null" || savedInstance === "") {
        savedInstance = null;
        localStorage.removeItem('limazon_api_target'); // Räumt den Müll direkt auf
    }
    
    // Die Basis-Domain OHNE das /api am Ende!
    const defaultApi = "https://api.limazon.v6.rocks"; 
    
    // Global verfügbar machen
    window.LIMO_API = savedInstance ? savedInstance : defaultApi;
})();