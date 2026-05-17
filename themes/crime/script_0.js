
        const API_URL = 'https://api.limazon.v6.rocks';
        let heistInterval = null;

        // UI Tabs Logic
        function switchTab(tabName) {
            // Hide all content
            ['rob', 'heist', 'security'].forEach(t => {
                document.getElementById(`tab-${t}`).classList.add('hidden');
                const btn = document.getElementById(`tab-${t}-btn`);
                btn.classList.remove('active', 'active-heist');
                btn.style.color = '#666';
            });

            // Show selected
            document.getElementById(`tab-${tabName}`).classList.remove('hidden');
            const activeBtn = document.getElementById(`tab-${tabName}-btn`);

            // Special color for Heist tab
            if (tabName === 'heist') {
                activeBtn.classList.add('active-heist');
                updateHeistData();
                if (!heistInterval) heistInterval = setInterval(updateHeistData, 5000);
            } else {
                activeBtn.classList.add('active');
                if (heistInterval) { clearInterval(heistInterval); heistInterval = null; }
            }

            if (tabName === 'security') loadSecurityData();
        }

        // --- HEIST LOGIC ---
        function logHeist(msg, type = 'info') {
            const con = document.getElementById('heist-console');
            const line = document.createElement('div');
            let colorClass = 'text-green-500';
            if (type === 'err') colorClass = 'text-red-500';
            if (type === 'warn') colorClass = 'text-yellow-500';

            // Timestamp
            const time = new Date().toLocaleTimeString('de-DE', { hour12: false });

            line.className = `mb-1 ${colorClass} font-mono text-xs`;
            line.innerHTML = `<span class="opacity-50">[${time}]</span> ${msg}`;

            con.prepend(line);
            if (con.children.length > 30) con.lastChild.remove();
        }

        async function updateHeistData() {
            try {
                const res = await fetch(`${API_URL}/api/heist/info`, { credentials: 'include' });
                const data = await res.json();

                // Pot
                const potEl = document.getElementById('heist-pot');
                // Kurze Version für die Anzeige
                potEl.innerText = formatMoneySmart(data.treasuryBalance);
                // Volle Version als Tooltip (wenn man mit der Maus drauf bleibt)
                potEl.title = '$' + data.treasuryBalance.toLocaleString('de-DE');

                // Firewall Visuals
                const integrity = data.integrity.toFixed(1);
                document.getElementById('fw-percent').innerText = integrity + '%';
                const bar = document.getElementById('fw-bar');
                bar.style.width = integrity + '%';

                const fwContainer = document.getElementById('firewall-container');
                const btnRaid = document.getElementById('btn-raid');
                const btnHack = document.getElementById('btn-hack');
                const raidText = document.getElementById('raid-subtext');
                const fwText = document.getElementById('fw-status-text');

                if (data.isOpen) {
                    fwContainer.classList.add('fw-open');
                    fwText.innerText = "SYSTEM EXPOSED";
                    fwText.className = "text-green-500 animate-pulse";
                    bar.style.width = '100%'; // Full green

                    btnHack.disabled = true;
                    btnHack.classList.add('opacity-30');

                    btnRaid.disabled = false;
                    btnRaid.classList.remove('bg-black', 'text-yellow-600/50', 'border-yellow-600/30', 'cursor-not-allowed');
                    btnRaid.classList.add('bg-yellow-600', 'text-black', 'hover:bg-yellow-500', 'shadow-yellow-500/50', 'shadow-lg');
                    raidText.innerText = "COST: $2000 | 60% CHANCE";
                } else {
                    fwContainer.classList.remove('fw-open');
                    fwText.innerText = "FIREWALL INTEGRITY";
                    fwText.className = "text-red-400";

                    btnHack.disabled = false;
                    btnHack.classList.remove('opacity-30');

                    // Reset Raid Button Style
                    btnRaid.disabled = true;
                    btnRaid.className = "btn-glitch bg-black border border-yellow-600/30 text-yellow-600/50 py-6 rounded flex flex-col items-center gap-1 cursor-not-allowed";
                    raidText.innerText = "LOCKED (WAIT FOR 0%)";
                }

            } catch (e) { console.error(e); }
        }

        async function doHack() {
            const btn = document.getElementById('btn-hack');
            btn.disabled = true;
            btn.classList.add('opacity-50');

            logHeist("Injecting payload...", "warn");

            try {
                const res = await fetch(`${API_URL}/api/heist/hack`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include'
                });
                const json = await res.json();

                if (res.ok) {
                    logHeist("ACCESS GRANTED: " + json.message);
                    updateHeistData();
                    startHackCooldown(60);
                } else {
                    logHeist("ACCESS DENIED: " + json.error, "err");
                    if (json.error.includes("überhitzt")) {
                        setTimeout(() => { btn.disabled = false; btn.classList.remove('opacity-50'); }, 5000);
                    } else {
                        btn.disabled = false; btn.classList.remove('opacity-50');
                    }
                }
            } catch (e) {
                logHeist("Connection lost.", "err");
                btn.disabled = false; btn.classList.remove('opacity-50');
            }
        }

        function startHackCooldown(seconds) {
            const btn = document.getElementById('btn-hack');
            const originalHTML = btn.innerHTML;
            let left = seconds;

            const interval = setInterval(() => {
                left--;
                btn.innerHTML = `<span class="text-2xl">⏳</span><span class="text-xs font-mono">COOLDOWN ${left}s</span>`;
                if (left <= 0) {
                    clearInterval(interval);
                    btn.innerHTML = originalHTML;
                    btn.disabled = false;
                    btn.classList.remove('opacity-50');
                }
            }, 1000);
        }

        async function doRaid() {
            if (!confirm("Einsatztrupp losschicken ($2000)?")) return;
            logHeist("Deploying squad...", "warn");
            try {
                const res = await fetch(`${API_URL}/api/heist/start`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include'
                });
                const json = await res.json();
                if (res.ok) {
                    if (json.success) {
                        logHeist("💰 PAYDAY! " + json.message);
                        alert("ERFOLG! " + json.message);
                    } else {
                        logHeist("💀 BUSTED! " + json.message, "err");
                        alert("GESCHEITERT! " + json.message);
                    }
                    updateHeistData();
                } else {
                    logHeist("Error: " + json.error, "err");
                }
            } catch (e) { logHeist("Network error", "err"); }
        }

        // --- ROBBERY LOGIC ---
        async function commitCrime() {
            const target = document.getElementById('target-name').value;
            const btn = document.getElementById('btn-start-rob');
            const resBox = document.getElementById('rob-result');

            if (!target) return;

            btn.disabled = true;
            btn.innerText = "CALCULATING...";
            resBox.className = "hidden";

            try {
                const response = await fetch(`${API_URL}/api/crime/rob`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ targetUsername: target })
                });

                const data = await response.json();
                btn.disabled = false;
                btn.innerText = "EXECUTE ROBBERY";

                resBox.classList.remove('hidden');

                if (response.ok) {
                    if (data.success) {
                        resBox.className = "p-4 rounded border text-center bg-green-900/30 border-green-500 text-green-400";
                        resBox.innerHTML = `<strong class="text-xl">ERFOLG!</strong><br>${data.message}<br><small class="opacity-70">Chance: ${data.chanceWas}%</small>`;
                    } else {
                        resBox.className = "p-4 rounded border text-center bg-red-900/30 border-red-500 text-red-400";
                        resBox.innerHTML = `<strong class="text-xl">FEHLSCHLAG!</strong><br>${data.message}<br><small class="opacity-70">Chance: ${data.chanceWas}%</small>`;
                    }
                } else {
                    resBox.className = "p-4 rounded border text-center bg-red-900/30 border-red-500 text-red-400";
                    resBox.innerText = data.error || "Server Fehler.";
                }

            } catch (e) {
                btn.disabled = false;
                alert("Netzwerkfehler");
            }
        }

        // --- SECURITY LOGIC ---
        async function loadSecurityData() {
            try {
                const response = await fetch(`${API_URL}/api/crime/security`, { credentials: 'include' });
                const data = await response.json();

                const riskEl = document.getElementById('risk-display');
                const detailsEl = document.getElementById('risk-details');

                if (data.isProtected) {
                    riskEl.innerText = "0%";
                    riskEl.className = "text-3xl font-bold text-blue-400";
                    detailsEl.innerText = "Safe Mode aktiv (Admin/Armutsschutz).";
                } else {
                    riskEl.innerText = data.riskPercent + "%";
                    const val = parseFloat(data.riskPercent);
                    if (val < 20) riskEl.className = "text-3xl font-bold text-green-400";
                    else if (val < 40) riskEl.className = "text-3xl font-bold text-yellow-400";
                    else riskEl.className = "text-3xl font-bold text-red-500 animate-pulse";

                    let info = "Basisrisiko";
                    if (data.hasAlarm) info += " + Alarmanlage (-15% Risiko)";
                    else info += " (Keine Alarmanlage)";
                    detailsEl.innerText = info;
                }

                const list = document.getElementById('log-list');
                list.innerHTML = "";
                if (data.logs && data.logs.length > 0) {
                    data.logs.forEach(log => {
                        const div = document.createElement('div');
                        const date = new Date(log.timestamp).toLocaleString();

                        if (log.success) {
                            div.className = "bg-red-900/20 border-l-4 border-red-500 p-3 rounded text-sm";
                            div.innerHTML = `<div class="flex justify-between font-bold text-red-300"><span>EINBRUCH!</span> <span>${date}</span></div>
                                             <div><span class="text-white">${log.attackerName}</span> stahl <span class="text-red-400">$${log.amountLost}</span></div>`;
                        } else {
                            div.className = "bg-green-900/20 border-l-4 border-green-500 p-3 rounded text-sm";
                            div.innerHTML = `<div class="flex justify-between font-bold text-green-300"><span>ABGEWEHRT</span> <span>${date}</span></div>
                                             <div><span class="text-white">${log.attackerName}</span> ist gescheitert.</div>`;
                        }
                        list.appendChild(div);
                    });
                } else {
                    list.innerHTML = '<div class="text-center text-gray-600 text-xs py-4">Keine Einträge in der Sicherheits-Datenbank.</div>';
                }

            } catch (e) { console.error(e); }
        }

        // Hilfsfunktion für große Zahlen (K, Mio, Mrd, Bio)
        function formatMoneySmart(amount) {
            if (amount >= 1.0e+12) return '$' + (amount / 1.0e+12).toFixed(2) + ' Bio.'; // Trillion (US) / Billion (DE)
            if (amount >= 1.0e+9) return '$' + (amount / 1.0e+9).toFixed(2) + ' Mrd.'; // Billion (US) / Milliarde (DE)
            if (amount >= 1.0e+6) return '$' + (amount / 1.0e+6).toFixed(2) + ' Mio.';
            if (amount >= 1.0e+3) return '$' + (amount / 1.0e+3).toFixed(2) + ' k';
            return '$' + amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }

        // --- YAKUZA SECRET ACCESS ---
    const skullBtn = document.getElementById('secret-skull');
    let skullClicks = 0;
    let skullTimer = null;

    skullBtn.addEventListener('click', () => {
        skullClicks++;
        
        // Visuelles Feedback: Kurzer Glitch bei jedem Klick
        skullBtn.classList.add('trigger-active');
        setTimeout(() => skullBtn.classList.remove('trigger-active'), 200);

        // Reset Timer: Wenn man aufhört zu klicken, setzt sich der Zähler zurück
        clearTimeout(skullTimer);
        skullTimer = setTimeout(() => {
            skullClicks = 0;
        }, 1000); // Man hat 1 Sekunde Pause erlaubt zwischen Klicks

        // Feedback im Log (zum Testen, kann man später entfernen)
        console.log("Knock knock...", skullClicks);

        // TRIGGER BEI 7 KLICKS
        if (skullClicks >= 7) {
            activateYakuzaMode();
        }
    });

    function activateYakuzaMode() {
        // Zähler stoppen
        clearTimeout(skullTimer);
        skullClicks = 0;

        // 1. Visueller Effekt (Roter Blitz)
        const flash = document.getElementById('secret-flash');
        flash.style.opacity = '1';
        
        // 2. Sound (Optional, falls du einen hast)
        // let audio = new Audio('glitch_sound.mp3'); audio.play();

        // 3. Weiterleitung nach kurzer Verzögerung
        setTimeout(() => {
            // HIER PFAD ZUM SCHWARZMARKT ANPASSEN
            window.location.href = 'blackmarket.html'; 
        }, 300);
    }
    