// config.js
(function() {
    let savedInstance = localStorage.getItem('limazon_api_target');
    
    // Schutz vor falschen Text-Strings im LocalStorage!
    if (savedInstance === "undefined" || savedInstance === "null" || savedInstance === "") {
        savedInstance = null;
        localStorage.removeItem('limazon_api_target');
    }
    
    const defaultApi = "https://limazon.slimo.dev"; 
    
    // Global verfügbar machen
    window.LIMO_API = savedInstance ? savedInstance : defaultApi;
    
    // NEU: Die E-Mail Adresse, bei der man einen Invite-Code anfragen kann
    window.LIMO_INVITE_EMAIL = "tfl@toens.net"; 
})();