
        const API_URL = 'https://api.limazon.v6.rocks';
        let isSpinning = false;
        let currentBalance = 0;
        let totalRotation = 0; // Speichert die Gesamtdrehung, damit wir nicht zurückspringen

        // Auth Helper
        async function fetchAuth(url, options = {}) {
            const defaults = { credentials: 'include', headers: { 'Content-Type': 'application/json' } };
            return fetch(url, { ...defaults, ...options });
        }

        // Init
        document.addEventListener('DOMContentLoaded', async () => {
            await Promise.all([updateBalance(), loadStats()]);
        });

        // Quick Bet Functions
        function setBet(amount) {
            const input = document.getElementById('bet-amount');
            let current = parseFloat(input.value) || 0;
            input.value = current + amount;
        }
        function multiplyBet(factor) {
            const input = document.getElementById('bet-amount');
            let current = parseFloat(input.value) || 0;
            if(current > 0) input.value = current * factor;
        }
        function setAllIn() {
            document.getElementById('bet-amount').value = Math.floor(currentBalance);
        }

        // Data Loading
        async function updateBalance() {
            try {
                const res = await fetchAuth(`${API_URL}/api/auth/me`);
                const data = await res.json();
                if (data.balance !== undefined) {
                    currentBalance = data.balance;
                    document.getElementById('user-balance').innerText = `$${data.balance.toFixed(2)}`;
                }
            } catch(e) {}
        }

        async function loadStats() {
            try {
                const res = await fetchAuth(`${API_URL}/api/casino/stats`);
                const data = await res.json();
                if(data.stats) {
                    document.getElementById('stat-wins').innerText = data.stats.wins || 0;
                    document.getElementById('stat-losses').innerText = data.stats.losses || 0;
                    const profit = data.stats.netProfit || 0;
                    const el = document.getElementById('stat-profit');
                    el.innerText = (profit >= 0 ? '+' : '') + `$${profit.toFixed(0)}`;
                    el.className = 'stat-val ' + (profit >= 0 ? 'text-green-400' : 'text-red-400');
                }
            } catch(e) {}
        }

        // THE GAME
        async function play(choice) {
            if (isSpinning) return;

            const input = document.getElementById('bet-amount');
            const amount = parseFloat(input.value);
            const msg = document.getElementById('result-msg');

            if (!amount || amount <= 0) {
                msg.innerHTML = '<span class="text-orange-500">Ungültiger Einsatz!</span>';
                return;
            }
            if (amount > currentBalance) {
                msg.innerHTML = '<span class="text-red-500">Zu wenig Geld!</span>';
                return;
            }

            // Lock UI
            isSpinning = true;
            document.getElementById('btn-heads').disabled = true;
            document.getElementById('btn-tails').disabled = true;
            msg.innerText = "Münze fliegt...";
            
            try {
                const res = await fetchAuth(`${API_URL}/api/casino/flip`, {
                    method: 'POST',
                    body: JSON.stringify({ betAmount: amount, side: choice })
                });
                const data = await res.json();

                if (!res.ok) {
                    msg.innerHTML = `<span class="text-red-500">${data.error || "Fehler"}</span>`;
                    resetUI();
                    return;
                }

                // Animation Logic
                const coin = document.getElementById('coin');
                
                // Wir addieren IMMER Rotationen dazu, damit sie sich weiterdreht
                // 5 volle Drehungen (1800) + Ergebnis
                const extraSpins = 1800; 
                
                // Ziel-Winkel berechnen
                // Wenn wir aktuell bei 0 sind und Tails wollen -> 180
                // Wenn wir bei 180 sind und Heads wollen -> 360 (was visuell 0 ist)
                // Wir müssen also basierend auf `totalRotation` rechnen.
                
                let targetAngle = 0;
                if (data.resultSide === 'tails') {
                    // Tails ist bei 180, 540, 900... (ungerade Vielfache von 180)
                    targetAngle = 180;
                } else {
                    // Heads ist bei 0, 360, 720... (gerade Vielfache von 180)
                    targetAngle = 0;
                }

                // Wir wollen, dass die Münze sich mindestens `extraSpins` weit dreht
                // und dann beim korrekten Winkel landet.
                // Trick: Wir runden die aktuelle Rotation auf das nächste Vielfache von 360
                // und addieren dann das Ziel.
                
                totalRotation += extraSpins;
                
                // Feinjustierung des Ziels
                const currentMod = totalRotation % 360; // Wo stehen wir im Kreis?
                const adjustment = targetAngle - currentMod;
                totalRotation += adjustment;

                // CSS Apply
                coin.style.transition = "transform 3s cubic-bezier(0.25, 1, 0.5, 1)";
                coin.style.transform = `rotateY(${totalRotation}deg)`;

                // Wait for animation
                setTimeout(() => {
                    // Result handling
                    currentBalance = data.newBalance;
                    document.getElementById('user-balance').innerText = `$${currentBalance.toFixed(2)}`;
                    
                    if (data.won) {
                        msg.innerHTML = `<span class="text-green-400 text-2xl drop-shadow-md">🎉 GEWONNEN! +$${data.payout.toFixed(2)}</span>`;
                    } else {
                        msg.innerHTML = `<span class="text-red-500">💸 Verloren...</span>`;
                    }
                    
                    loadStats();
                    resetUI();
                }, 3000);

            } catch (err) {
                msg.innerText = "Netzwerkfehler!";
                resetUI();
            }
        }

        function resetUI() {
            isSpinning = false;
            document.getElementById('btn-heads').disabled = false;
            document.getElementById('btn-tails').disabled = false;
        }

    