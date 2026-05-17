
        const API_BASE = 'https://api.limazon.v6.rocks/api';
        const icons = ['🚀', '💎', '🍔', '🍕', '🚗', '🐱', '🎮', '⚡'];
        let cards = [], flipped = [], matches = 0, score = 1000, timer = null, isProcessing = false;

        async function startGame() {
            try {
                // 1. Check Login
                const authCheck = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
                if (!authCheck.ok) {
                    alert("Du bist nicht eingeloggt!");
                    window.location.href = '../themes/games.html';
                    return;
                }

                // 2. Start Session (Token Abzug)
                const res = await fetch(`${API_BASE}/games/start`, { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify({ gameId: 'memory' }), 
                    credentials: 'include' 
                });

                if (!res.ok) {
                    const err = await res.json();
                    alert(err.error || "Nicht genug Tokens!");
                    return;
                }

                // 3. UI Reset
                document.getElementById('startBtn').classList.add('hidden');
                matches = 0; score = 1000; flipped = [];
                document.getElementById('score').innerText = score;
                document.getElementById('matches').innerText = '0/8';
                
                // 4. Karten mischen
                let pairIcons = [...icons, ...icons].sort(() => Math.random() - 0.5);
                const grid = document.getElementById('gameGrid');
                grid.innerHTML = '';
                
                pairIcons.forEach((ico) => {
                    const div = document.createElement('div');
                    div.className = 'card';
                    div.innerHTML = `<div class="card-inner hidden">${ico}</div>`;
                    div.onclick = () => reveal(div, ico);
                    grid.appendChild(div);
                });

                // 5. Timer starten (Punkte sinken)
                clearInterval(timer);
                timer = setInterval(() => {
                    if (score > 10) {
                        score--;
                        document.getElementById('score').innerText = score;
                    }
                }, 150);

            } catch (e) {
                alert("Verbindungsfehler!");
            }
        }

        function reveal(div, icon) {
            if (isProcessing || flipped.length >= 2 || div.classList.contains('flipped') || div.classList.contains('matched')) return;
            
            div.querySelector('.card-inner').classList.remove('hidden');
            div.classList.add('flipped');
            flipped.push({ div, icon });

            if (flipped.length === 2) {
                isProcessing = true;
                checkMatch();
            }
        }

        function checkMatch() {
            const [a, b] = flipped;
            if (a.icon === b.icon) {
                // Treffer
                setTimeout(() => {
                    a.div.classList.add('matched');
                    b.div.classList.add('matched');
                    matches++;
                    document.getElementById('matches').innerText = `${matches}/8`;
                    flipped = [];
                    isProcessing = false;
                    if (matches === icons.length) endGame();
                }, 300);
            } else {
                // Kein Treffer -> Zurückdrehen
                setTimeout(() => {
                    a.div.classList.remove('flipped');
                    b.div.classList.remove('flipped');
                    a.div.querySelector('.card-inner').classList.add('hidden');
                    b.div.querySelector('.card-inner').classList.add('hidden');
                    flipped = [];
                    isProcessing = false;
                }, 800);
            }
        }

        async function endGame() {
            clearInterval(timer);
            try {
                const res = await fetch(`${API_BASE}/games/submit-score`, { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify({ gameId: 'memory', score: score }), 
                    credentials: 'include' 
                });
                
                if (res.ok) {
                    alert(`Super! Du hast alle Paare gefunden. Score: ${score}`);
                }
            } catch (e) {}
            
            location.reload();
        }
    