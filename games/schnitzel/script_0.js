
        // --- KONFIGURATION ---
        const API_BASE_URL = 'https://api.limazon.v6.rocks';
        
        let score = 0;
        let timeLeft = 30;
        let gameActive = false;
        let spawnTimer, clockTimer;

        const startBtn = document.getElementById('start-btn');
        const overlay = document.getElementById('overlay');
        const playArea = document.getElementById('play-area');
        const scoreDisplay = document.getElementById('score-val');
        const timerDisplay = document.getElementById('timer-val');
        
        const wrapper = document.getElementById('alice-face-wrapper');
        const redOverlay = document.getElementById('alice-red-overlay');
        const speech = document.getElementById('speech-bubble');
        
        const msgTitle = document.getElementById('msg-title');
        const msgDesc = document.getElementById('msg-desc');

        const quotes = [
            "Das ist MEIN Schnitzel!",
            "Verbotspartei!!",
            "Unerhört!",
            "Finger weg von meinem Fleisch!",
            "Frechheit!",
            "Tofu kommt mir nicht ins Haus!",
            "Das wird man ja wohl noch essen dürfen!",
            "Brokkoli ist Teufelszeug!",
            "Die da oben wollen uns die Panade verbieten!",
            "Für mein Schnitzel gehe ich auf die Barrikaden!",
            "Mein Körper braucht Fleisch!",
            "Wer hat den Tofu hier reingeschmuggelt?!",
            "Ich rufe gleich die Polizei!",
            "Fleisch ist mein Gemüse!",
            "Das ist eine gezielte Schikane!",
            "Zitronenscheibe drauf und Ruhe ist!",
            "Ich fordere ein Schnitzel-Grundrecht!",
            "Hör auf, mir auf dem Teller rumzutippen!",
            "NIEMAND NIMMT MIR MEIN SCHNITZEL WEG!"
        ];

        // Verhindert Standard-Touch-Events, damit das Tippen snappier wird
        playArea.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
        
        startBtn.addEventListener('click', initGame);

        async function initGame() {
            startBtn.innerText = "LÄDT...";
            startBtn.disabled = true;

            // 1. API Call: Token abziehen (WICHTIG: credentials 'include' für Cookies!)
            try {
                const response = await fetch(`${API_BASE_URL}/api/games/start`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include', 
                    body: JSON.stringify({ gameId: 'schnitzel' })
                });
                const data = await response.json();

                if (!response.ok) {
                    alert(data.error || "Nicht genug Tokens oder Serverfehler!");
                    startBtn.innerText = "SPIELEN";
                    startBtn.disabled = false;
                    return;
                }
            } catch (err) {
                alert("Verbindung zu api.limazon.v6.rocks fehlgeschlagen.");
                startBtn.innerText = "SPIELEN";
                startBtn.disabled = false;
                return;
            }

            startGame();
        }

        function startGame() {
            gameActive = true;
            score = 0;
            timeLeft = 30;
            startBtn.disabled = false;
            
            overlay.classList.add('hidden');
            playArea.innerHTML = '';
            scoreDisplay.innerText = score;
            timerDisplay.innerText = timeLeft;
            
            // Alice Reset
            wrapper.style.transform = 'scale(1)';
            wrapper.classList.remove('shaking');
            redOverlay.style.opacity = 0;
            speech.style.opacity = 0;

            clockTimer = setInterval(tick, 1000);
            spawnTimer = setInterval(spawnItem, 600); // Handyspieler sind oft schneller, daher 600ms
        }

        function tick() {
            timeLeft--;
            timerDisplay.innerText = timeLeft;
            if (timeLeft <= 0) endGame();
        }

        function spawnItem() {
            if (!gameActive) return;

            const item = document.createElement('div');
            item.className = 'game-item';
            
            // 85% Chance auf Schnitzel, 15% auf Brokkoli
            const isSchnitzel = Math.random() > 0.15;
            item.innerText = isSchnitzel ? '🥩' : '🥦';
            
            // Sichere Zufallskoordinaten für Handys berechnen
            const itemSize = 80; 
            // Halte Abstand von oben (UI Bar + Gesicht)
            const minY = 240; 
            const maxX = playArea.clientWidth - itemSize;
            const maxY = playArea.clientHeight - itemSize - 20;
            
            const x = Math.max(0, Math.random() * maxX);
            const y = Math.max(minY, Math.random() * maxY);
            
            item.style.left = x + 'px';
            item.style.top = y + 'px';

            // 'touchstart' reagiert auf Handys ein paar Millisekunden schneller als 'click'
            item.addEventListener('touchstart', (e) => {
                e.preventDefault(); // Verhindert doppelten Klick
                handleHit(item, isSchnitzel, e.touches[0].clientX, e.touches[0].clientY);
            });
            item.addEventListener('mousedown', (e) => {
                handleHit(item, isSchnitzel, e.clientX, e.clientY);
            });

            playArea.appendChild(item);

            // Item verschwindet wieder (je mehr Punkte, desto schneller verschwinden sie)
            const lifespan = Math.max(700, 1500 - (score * 15)); 
            setTimeout(() => {
                if (item.parentNode) item.remove();
            }, lifespan);
        }

        function handleHit(item, isSchnitzel, x, y) {
            if (!gameActive) return;
            
            if (isSchnitzel) {
                score++;
                createFeedback("+1", x, y, "#2ecc71");
                updateAlice(true);
            } else {
                score = Math.max(0, score - 5); // Harte Strafe für Veggie-Klick
                createFeedback("-5", x, y, "#e74c3c");
                updateAlice(false);
            }
            
            scoreDisplay.innerText = score;
            item.remove();
        }

        function updateAlice(wasGood) {
            if (wasGood) {
                // Wut-Faktor berechnen (Max bei ca. 50 Punkten)
                let rageLevel = Math.min(score / 50, 1);
                
                // Rotfilter hochdrehen (bis max 80% Deckkraft, damit man das Bild noch sieht)
                redOverlay.style.opacity = rageLevel * 0.8;
                
                // Gesicht wird größer
                wrapper.style.transform = `scale(${1 + (rageLevel * 0.4)})`;
                
                // Ab Score 15 fängt sie an zu beben
                if (score > 15) {
                    wrapper.classList.add('shaking');
                }

                // Sprechblase zufällig anzeigen lassen
                if (Math.random() > 0.7) showQuote();
            } else {
                // Beruhigt sich kurz bei Tofu
                redOverlay.style.opacity = 0;
                wrapper.classList.remove('shaking');
                wrapper.style.transform = 'scale(1)';
                
                speech.innerText = "Na also, geht doch!";
                speech.style.opacity = 1;
                setTimeout(() => { if(gameActive) speech.style.opacity = 0; }, 1500);
            }
        }

        function showQuote() {
            speech.innerText = quotes[Math.floor(Math.random() * quotes.length)];
            speech.style.opacity = 1;
            setTimeout(() => { speech.style.opacity = 0; }, 1500);
        }

        function createFeedback(text, x, y, color) {
            const splat = document.createElement('div');
            splat.className = 'splat';
            splat.innerText = text;
            // Etwas versetzt über dem Finger anzeigen
            splat.style.left = (x - 20) + 'px';
            splat.style.top = (y - 50) + 'px';
            splat.style.color = color;
            document.body.appendChild(splat);
            setTimeout(() => splat.remove(), 600);
        }

        async function endGame() {
            gameActive = false;
            clearInterval(clockTimer);
            clearInterval(spawnTimer);
            wrapper.classList.remove('shaking');
            redOverlay.style.opacity = 0;

            // Score ans Backend senden
            try {
                await fetch(`${API_BASE_URL}/api/games/submit-score`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ gameId: 'schnitzel', score: score, seed: 'random' })
                });
            } catch (err) {
                console.error("Konnte Score nicht speichern.");
            }

            // UI für Spielende
            msgTitle.innerText = "ZEIT ABGELAUFEN!";
            msgDesc.innerHTML = `Du hast <b>${score}</b> Schnitzel in Sicherheit gebracht!<br><br>Alice' Blutdruck ist auf 240.`;
            startBtn.innerText = "NOCHMAL SPIELEN";
            overlay.classList.remove('hidden');
        }
    