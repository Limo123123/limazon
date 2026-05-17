
        const API_URL = 'https://api.limazon.v6.rocks';
        let currentCaseId = null;
        let timerInterval = null;

        // --- INIT ---
        document.addEventListener('DOMContentLoaded', () => {
            loadCourtData();
        });

        // --- LOAD DATA ---
        async function loadCourtData() {
            try {
                const res = await fetch(`${API_URL}/api/court/status`, { credentials: 'include' });
                const data = await res.json();
                renderActiveCase(data.activeCase);
                renderArchive(data.archive);
            } catch (e) {
                console.error("Court Error:", e);
                document.getElementById('active-case').innerHTML = '<div class="text-center text-red-500 mt-10">Verbindungsfehler zum Gerichtshof.</div>';
            }
        }

        // --- RENDER ACTIVE CASE ---
        function renderActiveCase(c) {
            const container = document.getElementById('active-case');
            
            // 1. SZENARIO: KEIN FALL VORHANDEN
            if (!c) {
                container.innerHTML = `
                    <div class="text-center py-10 opacity-50 animate-fade-in">
                        <span class="text-6xl grayscale">🏛️</span>
                        <h2 class="text-3xl font-law text-white mt-6 uppercase tracking-widest">Gerichtshof geschlossen</h2>
                        <p class="font-data text-sm mt-3 text-gray-400">Aktuell sind keine offenen Verfahren anhängig.</p>
                        <p class="font-data text-xs mt-1 text-gray-600">Komm später wieder oder reiche selbst Klage ein.</p>
                    </div>`;
                return;
            }

            // Global ID setzen
            currentCaseId = c.id;
            const shortId = c.id.substring(c.id.length - 6).toUpperCase();

            // 2. ZEIT STATUS (Timer oder Overtime Warnung)
            // FIX: Wir nutzen Flexbox statt absolute, damit nichts abgeschnitten wird.
            // Mit -mt-6 ziehen wir es optisch nach oben.
            let timeStatusHTML = '';
            
            if (c.isOvertime) {
                timeStatusHTML = `
                    <div class="flex justify-center -mt-6 mb-6 relative z-20">
                        <div class="bg-red-600 text-white px-6 py-2 text-xs font-bold uppercase tracking-widest shadow-xl rounded-full border border-red-400 animate-pulse">
                            ⚠️ Verlängerung: ${c.votesNeeded} Stimmen fehlen
                        </div>
                    </div>`;
            } else {
                timeStatusHTML = `
                    <div class="flex justify-center -mt-6 mb-6 relative z-20">
                        <div class="bg-gray-900 text-gold px-6 py-2 text-xs font-bold uppercase tracking-widest shadow-xl rounded-full border border-gold">
                            Urteil in: <span id="verdict-timer" class="text-white ml-2">--:--:--</span>
                        </div>
                    </div>`;
            }

            // 3. HTML ZUSAMMENBAUEN
            container.innerHTML = `
                ${timeStatusHTML}

                <div class="flex flex-col md:flex-row justify-between items-start mb-8 border-b border-gray-800 pb-6 animate-fade-in relative z-10">
                    <div>
                        <span class="text-xs font-data text-red-500 bg-red-950/30 px-3 py-1 border border-red-900 rounded">AKTE #${shortId}</span>
                        <h2 class="text-3xl font-law text-white mt-3 uppercase">${c.crime}</h2>
                    </div>
                    <div class="text-right mt-4 md:mt-0">
                        <div class="text-xs text-gray-500 font-data uppercase tracking-widest">Vorsitzender Richter</div>
                        <div class="text-gold font-law text-xl">The Community</div>
                    </div>
                </div>

                <div class="flex flex-col md:flex-row items-center justify-between gap-10 mb-12 relative bg-black/20 p-6 rounded-lg border border-white/5 animate-fade-in z-10">
                    
                    <div class="flex-1 text-center group w-full">
                        <div class="relative inline-block">
                            <img src="${c.accusedAvatar}" class="w-32 h-32 rounded-full border-4 border-red-900/60 shadow-2xl grayscale group-hover:grayscale-0 transition duration-500">
                            <div class="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-red-900 text-white text-[10px] px-3 py-1 font-bold uppercase tracking-wider rounded border border-red-500">Angeklagter</div>
                        </div>
                        <h3 class="text-3xl font-law text-white mt-5">${c.accused}</h3>
                    </div>

                    <div class="w-16 h-16 bg-gradient-to-br from-yellow-600 to-yellow-800 rounded-full flex items-center justify-center font-law font-black text-xl text-black shadow-lg z-10 border-2 border-yellow-400">VS</div>

                    <div class="flex-1 text-center group w-full">
                        <div class="relative inline-block">
                            <img src="${c.plaintiffAvatar}" class="w-32 h-32 rounded-full border-4 border-green-900/60 shadow-2xl grayscale group-hover:grayscale-0 transition duration-500">
                            <div class="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-green-900 text-white text-[10px] px-3 py-1 font-bold uppercase tracking-wider rounded border border-green-500">Kläger</div>
                        </div>
                        <h3 class="text-3xl font-law text-white mt-5">${c.plaintiff}</h3>
                    </div>
                </div>

                <div class="bg-black/40 p-8 border-l-4 border-gold mb-10 relative animate-fade-in z-10">
                    <span class="absolute top-0 right-0 bg-gold text-black text-[10px] px-2 py-0.5 font-bold uppercase">Beweismittel A</span>
                    <h4 class="text-gold font-law uppercase text-sm mb-3 tracking-widest">Tatvorwurf</h4>
                    <p class="font-serif italic text-xl leading-relaxed text-gray-300">"${c.description}"</p>
                </div>

                <div id="voting-area" class="animate-fade-in z-10 relative">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        
                        <button onclick="castVote('guilty')" class="btn-verdict btn-guilty py-8 px-6 bg-red-950/20 border-2 border-red-900/50 rounded-xl flex flex-col items-center justify-center gap-4 group cursor-pointer">
                            <span class="text-5xl group-hover:scale-110 transition duration-300 drop-shadow-lg">🔨</span>
                            <div>
                                <span class="block font-law font-black text-red-500 text-3xl tracking-[0.2em] uppercase mb-1 drop-shadow-md">Schuldig</span>
                                <span class="block text-xs text-red-400/60 font-data uppercase tracking-wider">Bestrafen</span>
                            </div>
                        </button>

                        <button onclick="castVote('innocent')" class="btn-verdict btn-innocent py-8 px-6 bg-green-950/20 border-2 border-green-900/50 rounded-xl flex flex-col items-center justify-center gap-4 group cursor-pointer">
                            <span class="text-5xl group-hover:scale-110 transition duration-300 drop-shadow-lg">⚖️</span>
                            <div>
                                <span class="block font-law font-black text-green-500 text-3xl tracking-[0.2em] uppercase mb-1 drop-shadow-md">Unschuldig</span>
                                <span class="block text-xs text-green-400/60 font-data uppercase tracking-wider">Freisprechen</span>
                            </div>
                        </button>
                    </div>
                    
                    <div class="flex justify-between text-xs font-data text-gray-400 mb-2 px-1">
                        <span id="guilty-perc" class="text-red-400 font-bold">${c.stats.guiltyPerc}%</span>
                        <span class="uppercase tracking-widest opacity-50">Öffentliche Meinung</span>
                        <span id="innocent-perc" class="text-green-400 font-bold">${c.stats.innocentPerc}%</span>
                    </div>
                    <div class="vote-bar-bg border border-white/10">
                        <div id="bar-guilty" class="vote-fill-guilty" style="width: ${c.stats.guiltyPerc}%"></div>
                        <div id="bar-innocent" class="vote-fill-innocent" style="width: ${c.stats.innocentPerc}%"></div>
                    </div>
                    <div class="text-center mt-3 text-xs text-gray-600 font-data">
                        <span id="total-votes" class="text-white font-bold">${c.stats.total}</span> Stimmen abgegeben
                    </div>
                </div>

                <div id="stamp-guilty" class="stamp-mark stamp-guilty border-red-600 text-red-600">SCHULDIG</div>
                <div id="stamp-innocent" class="stamp-mark stamp-innocent border-green-600 text-green-600">FREISPRUCH</div>
            `;

            // 4. NACHBEARBEITUNG
            
            // Wenn User schon gevotet hat: Stempel zeigen & Buttons sperren
            if (c.myVote) {
                setTimeout(() => { showStamp(c.myVote); lockVoting(); }, 50);
            }
            
            // Timer starten (wenn nicht in Overtime und Enddatum vorhanden)
            if (!c.isOvertime && c.endsAt) {
                startTimer(c.endsAt);
            }
        }

        // --- RENDER ARCHIVE ---
        function renderArchive(archive) {
            const container = document.getElementById('archive-list');
            container.innerHTML = '';

            if (!archive || archive.length === 0) {
                container.innerHTML = '<div class="text-center text-gray-600 text-xs py-4">Noch keine abgeschlossenen Fälle.</div>';
                return;
            }

            archive.forEach(item => {
                const isGuilty = item.verdict === 'guilty';
                const badgeColor = isGuilty ? 'red' : 'green';
                const verdictText = isGuilty ? 'VERURTEILT' : 'FREISPRUCH';
                const shortId = item.id.substring(item.id.length - 6).toUpperCase();

                const html = `
                <div class="flex items-center justify-between p-5 bg-white/5 border border-white/10 rounded hover:bg-white/10 transition cursor-default">
                    <div class="flex items-center gap-6">
                        <span class="text-gray-600 font-mono text-xs">#${shortId}</span>
                        <div class="flex flex-col">
                            <span class="text-gray-200 font-bold text-lg">${item.title}</span>
                            <span class="text-gray-500 text-xs uppercase tracking-wide">${item.crime}</span>
                        </div>
                    </div>
                    <div class="px-4 py-2 bg-${badgeColor}-900/30 text-${badgeColor}-400 border border-${badgeColor}-900/50 rounded text-xs font-bold uppercase tracking-wider">
                        ${verdictText}
                    </div>
                </div>`;
                container.innerHTML += html;
            });
        }

        // --- ACTIONS ---
        async function castVote(verdict) {
            if (!currentCaseId) return;
            try {
                const res = await fetch(`${API_URL}/api/court/vote`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ caseId: currentCaseId, verdict: verdict }),
                    credentials: 'include'
                });
                const data = await res.json();
                if (res.ok) {
                    showStamp(verdict); lockVoting();
                    setTimeout(loadCourtData, 500);
                } else { alert(data.error); }
            } catch (e) { alert("Fehler"); }
        }

        document.getElementById('prosecute-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button');
            const originalText = btn.innerText;
            btn.innerText = "Sende..."; btn.disabled = true;

            const accused = document.getElementById('accused-name').value;
            const crime = document.getElementById('crime-type').value;
            const desc = document.getElementById('evidence-text').value;

            try {
                const res = await fetch(`${API_URL}/api/court/file`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ accused, crime, description: desc }),
                    credentials: 'include'
                });
                const data = await res.json();
                if (res.ok) {
                    alert("Anklage erfolgreich! Kosten: $5.000");
                    closeFileCaseModal(); loadCourtData();
                    document.getElementById('accused-name').value = "";
                    document.getElementById('evidence-text').value = "";
                } else { alert(data.error); }
            } catch (e) { alert("Fehler"); }
            btn.innerText = originalText; btn.disabled = false;
        });

        // --- TIMER & UI HELPER ---
        function startTimer(isoDate) {
            const target = new Date(isoDate).getTime();
            if (timerInterval) clearInterval(timerInterval);

            function tick() {
                const el = document.getElementById('verdict-timer');
                if (!el) return;
                const now = new Date().getTime();
                const diff = target - now;
                if (diff < 0) {
                    el.innerText = "BEENDET...";
                    clearInterval(timerInterval);
                    setTimeout(loadCourtData, 2000); // Reload für neuen Status
                    return;
                }
                const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const s = Math.floor((diff % (1000 * 60)) / 1000);
                el.innerText = `${h < 10 ? "0" + h : h}h ${m < 10 ? "0" + m : m}m ${s < 10 ? "0" + s : s}s`;
            }
            tick(); timerInterval = setInterval(tick, 1000);
        }

        function showStamp(verdict) {
            const stamp = document.getElementById(`stamp-${verdict}`);
            if (stamp) stamp.classList.add('stamped');
        }

        function lockVoting() {
            const area = document.getElementById('voting-area');
            if (area) { area.style.pointerEvents = 'none'; area.style.opacity = '0.5'; }
        }

        function openFileCaseModal() {
            const modal = document.getElementById('file-case-modal');
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('open'), 10);
        }
        function closeFileCaseModal() {
            const modal = document.getElementById('file-case-modal');
            modal.classList.remove('open');
            setTimeout(() => modal.style.display = 'none', 300);
        }
    