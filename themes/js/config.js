// config.js
(function() {
    const savedInstance = localStorage.getItem('limazon_api_target');
    
    // Die Basis-Domain OHNE das /api am Ende!
    const defaultApi = "https://api.limazon.v6.rocks"; 
    
    // Global für alle anderen Skripte verfügbar machen
    window.LIMO_API = savedInstance ? savedInstance : defaultApi;
})();