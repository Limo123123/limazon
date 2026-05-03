// js/limo-global.js

document.addEventListener("DOMContentLoaded", () => {
    if (!document.getElementById('limo-global-styles')) {
        const style = document.createElement('style');
        style.id = 'limo-global-styles';
        style.innerHTML = `
            @keyframes fadeInOverlay { from { opacity: 0; } to { opacity: 1; } }
            @keyframes slideUpCard { from { transform: translateY(50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            
            #strike-overlay {
                position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
                background-color: rgba(15, 23, 42, 0.95);
                backdrop-filter: blur(12px);
                z-index: 999999; display: flex; flex-direction: column; justify-content: center; align-items: center;
                color: white; font-family: 'Space Grotesk', sans-serif;
                animation: fadeInOverlay 0.3s ease-out forwards;
            }
            .strike-hidden { display: none !important; }
            
            .barricade-tape {
                width: 100%; height: 24px; position: absolute;
                background: repeating-linear-gradient(45deg, #f59e0b, #f59e0b 20px, #1e293b 20px, #1e293b 40px);
                box-shadow: 0 4px 20px rgba(0,0,0,0.8); z-index: 10;
            }
            .barricade-tape.top { top: 0; }
            .barricade-tape.bottom { bottom: 0; }
            
            .strike-glass-card {
                background: rgba(30, 41, 59, 0.85);
                border: 1px solid rgba(255, 255, 255, 0.15);
                padding: 30px; border-radius: 24px; max-width: 450px; width: 90%;
                max-height: 85vh; overflow-y: auto; z-index: 50; 
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
                animation: slideUpCard 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                text-align: center; position: relative;
            }
            
            .strike-title { color: #f8fafc; font-size: 1.8rem; font-weight: 700; margin: 0; }
            .strike-subtitle { color: #ef4444; font-size: 1rem; font-weight: 700; margin-bottom: 20px; text-transform: uppercase; }
            
            .strike-reason-box {
                background: #0f172a; border: 1px solid #334155; border-radius: 16px;
                padding: 15px; margin-bottom: 20px; text-align: left;
            }
            
            .strike-btn {
                width: 100%; padding: 16px; background: #4f46e5;
                color: white; border: none; border-radius: 12px; font-weight: bold; font-size: 1rem;
                cursor: pointer; transition: all 0.2; box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.3);
            }
            .strike-btn:hover { background: #6366f1; transform: translateY(-2px); }
            
            .striker-tag {
                display: inline-block; background: rgba(245, 158, 11, 0.1); color: #f59e0b;
                padding: 4px 10px; border-radius: 6px; margin: 3px; font-size: 0.85rem; font-weight: bold;
                border: 1px solid rgba(245, 158, 11, 0.2);
            }
        `;
        document.head.appendChild(style);
    }

    if (!document.getElementById('strike-overlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'strike-overlay';
        overlay.className = 'strike-hidden';
        overlay.innerHTML = `
            <div class="barricade-tape top"></div>
            <div class="strike-glass-card">
                <h1 class="strike-title">ZUGRIFF VERWEIGERT</h1>
                <h2 class="strike-subtitle" id="st-title">Modul gesperrt</h2>
                <div class="strike-reason-box">
                    <p id="st-reason" style="color:#f8fafc; font-size:1rem; font-style:italic; margin:0;"></p>
                </div>
                <div id="st-leaders" style="margin-bottom: 20px;"></div>
                <p style="color: #666; font-size: 0.8rem;">Ende: <b id="st-end"></b></p>
                <button class="strike-btn" onclick="window.exitStrikeArea()">Verstanden</button>
            </div>
            <div class="barricade-tape bottom"></div>
        `;
        document.body.appendChild(overlay);
    }

    const pageType = document.currentScript ? document.currentScript.getAttribute('data-page') : 'unknown';
    
    window.exitStrikeArea = function() {
        // HIER SIND JETZT ALLE 10 DRIN:
        const gameModules = ['teachermon', 'casino', 'restaurant', 'jobs', 'crime', 'gangs', 'auctions'];
        const socialModules = ['limonews', 'limterest', 'realestate'];

        if (gameModules.includes(pageType)) {
            window.location.href = 'games.html'; // Schickt Gamer zurück zur Spieleliste
        } else {
            window.location.href = '/index.html'; // Alles andere zurück zum Portal
        }
    };
});

const originalFetch = window.fetch;
window.fetch = async function(...args) {
    const response = await originalFetch(...args);
    if (response.status === 423) {
        response.clone().json().then(data => {
            if (data.error === "STRIKE_ACTIVE") {
                document.getElementById('st-title').innerText = `MODUL: ${data.strikeData.module.toUpperCase()}`;
                document.getElementById('st-reason').innerText = `"${data.strikeData.reason}"`;
                document.getElementById('st-leaders').innerHTML = data.strikeData.strikers.map(s => `<span class="striker-tag">✊ ${s}</span>`).join('');
                document.getElementById('st-end').innerText = new Date(data.strikeData.endsAt).toLocaleString('de-DE');
                document.getElementById('strike-overlay').classList.remove('strike-hidden');
            }
        }).catch(e => console.error(e));
    }
    return response;
};