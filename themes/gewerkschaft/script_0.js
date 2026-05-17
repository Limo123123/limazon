
        const API_BASE_URL = 'https://api.limazon.v6.rocks';
        let currentUser = null;

        // Init: User laden, dann Streiks laden
        document.addEventListener('DOMContentLoaded', async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/api/auth/me`, { credentials: 'include' });
                if (res.ok) {
                    currentUser = await res.json();
                    document.getElementById('user-avatar').innerText = currentUser.username.substring(0, 2).toUpperCase();
                } else {
                    window.location.href = 'index.html'; // Fallback falls nicht eingeloggt
                }
            } catch (e) { console.error(e); }
            
            loadStrikes();
        });

        // Hilfsfunktion für Fetch mit Cookies
        async function fetchAuth(url, options = {}) {
            options.credentials = 'include';
            return fetch(url, options);
        }

        // Alert Box anzeigen (Bank Style)
        function showAlert(msg, isError = false) {
            const box = document.getElementById('alert-box');
            box.innerText = msg;
            box.className = `mb-6 text-center p-4 rounded-xl font-bold text-sm block shadow-lg fade-in ${isError ? 'bg-red-900/30 text-red-400 border border-red-500/30' : 'bg-emerald-900/30 text-emerald-400 border border-emerald-500/30'}`;
            setTimeout(() => { box.classList.add('hidden'); }, 5000);
        }

        // Streiks vom Server laden
        async function loadStrikes() {
            const list = document.getElementById('strikes-list');
            try {
                const res = await fetchAuth(`${API_BASE_URL}/api/strikes`);
                const data = await res.json();

                if (!res.ok) throw new Error(data.error);

                if (data.strikes.length === 0) {
                    list.innerHTML = `
                        <div class="glass p-8 rounded-xl text-center flex flex-col items-center justify-center opacity-70">
                            <span class="text-4xl mb-3">🕊️</span>
                            <span class="text-slate-400 text-sm font-medium">Die Straßen sind friedlich.<br>Aktuell keine Proteste.</span>
                        </div>`;
                    return;
                }

                list.innerHTML = '';
                data.strikes.forEach(strike => {
                    const isActive = strike.status === 'active';
                    const isCreator = currentUser && strike.strikers && strike.strikers[0] === currentUser.userId;
                    const isAdmin = currentUser && currentUser.isAdmin;

                    // Design je nach Status (Pending = Orange, Active = Rot)
                    const statusClass = isActive ? 'card-rebel' : 'glass border-l-4 border-amber-500';
                    const statusBadge = isActive 
                        ? `<span class="bg-black/30 text-white px-2 py-1 rounded text-[10px] font-bold tracking-widest uppercase flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-white animate-pulse"></span> Blockiert</span>` 
                        : `<span class="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-1 rounded text-[10px] font-bold tracking-widest uppercase">Wartet auf Hilfe</span>`;

                    let actionHtml = '';
                    
                    // NEU: Prüfen, ob der User bereits mitstreikt
                    const hasJoined = currentUser && strike.strikers && strike.strikers.includes(currentUser.userId);

                    // Timer anzeigen, wenn der Streik aktiv ist
                    let timerHtml = '';
                    if (isActive) {
                        const endTime = new Date(strike.expiresAt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                        timerHtml = `
                            <div class="mt-4 w-full bg-black/20 p-3 rounded-xl border border-white/5 text-center">
                                <span class="text-[10px] text-white/50 uppercase tracking-wider block">Blockade endet um</span>
                                <span class="text-sm font-mono font-bold text-white">${endTime} Uhr</span>
                            </div>`;
                    }

                    // Button anzeigen, wenn der User noch nicht dabei ist
                    let joinBtnHtml = '';
                    if (!hasJoined) {
                        joinBtnHtml = `
                            <button onclick="joinStrike('${strike._id}')" class="w-full mt-4 bg-amber-500 text-black hover:bg-amber-400 font-bold py-3 rounded-xl transition shadow-lg active:scale-95 text-sm">
                                ✊ Solidarität zeigen (Beitreten)
                            </button>`;
                    }

                    // Zusammenbauen
                    actionHtml = timerHtml + joinBtnHtml;

                    // Button: Beenden (Für Admin oder Ersteller)
                    let deleteBtn = '';
                    if (isCreator || isAdmin) {
                        deleteBtn = `
                            <button onclick="cancelStrike('${strike._id}')" class="w-full mt-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2 rounded-xl transition text-xs border border-slate-700">
                                ❌ Streik abbrechen
                            </button>`;
                    }

                    list.innerHTML += `
                        <div class="${statusClass} p-5 rounded-2xl strike-item relative overflow-hidden">
                            <div class="flex justify-between items-start mb-3">
                                <h3 class="text-lg font-bold text-white uppercase tracking-tight">${strike.module}</h3>
                                ${statusBadge}
                            </div>
                            
                            <div class="bg-black/20 p-3 rounded-xl border border-white/5 mb-3">
                                <p class="text-white/90 text-sm font-medium italic">"${strike.reason}"</p>
                            </div>
                            
                            <p class="text-xs text-white/60 mb-2 leading-relaxed">
                                <b class="text-white/80">Streikende:</b> ${strike.strikerNames.join(', ')}
                            </p>
                            
                            ${actionHtml}
                            ${deleteBtn}
                        </div>
                    `;
                });
            } catch (e) {
                list.innerHTML = `<div class="text-red-400 bg-red-900/20 border border-red-500/20 p-4 rounded-xl text-center text-sm">${e.message || "Verbindung zur Gewerkschaft fehlgeschlagen."}</div>`;
            }
        }

        // Einen neuen Streik einreichen
        async function proposeStrike(e) {
            e.preventDefault();
            const btn = document.getElementById('btn-propose');
            const moduleName = document.getElementById('strike-module').value;
            const reason = document.getElementById('strike-reason').value;

            btn.disabled = true;
            btn.innerText = "Sende Antrag...";

            try {
                const res = await fetchAuth(`${API_BASE_URL}/api/strikes/propose`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ moduleName, reason })
                });
                const data = await res.json();
                
                if (res.ok) {
                    showAlert(data.message);
                    document.getElementById('strike-reason').value = '';
                    loadStrikes();
                } else {
                    showAlert(data.error, true);
                }
            } catch (e) {
                showAlert("Ein Verbindungsfehler ist aufgetreten.", true);
            } finally {
                btn.disabled = false;
                btn.innerText = "Protest starten 🚩";
            }
        }

        // Einem offenen Streik beitreten
        async function joinStrike(id) {
            try {
                const res = await fetchAuth(`${API_BASE_URL}/api/strikes/join/${id}`, { method: 'POST' });
                const data = await res.json();
                
                if (res.ok) {
                    showAlert(data.message);
                    loadStrikes();
                } else {
                    showAlert(data.error, true);
                }
            } catch (e) {
                showAlert("Fehler beim Beitreten.", true);
            }
        }

        // Admin / Ersteller: Streik beenden
        async function cancelStrike(id) {
            if(!confirm("Bist du sicher, dass du den Streik auflösen willst? Die Arbeiter werden nicht erfreut sein!")) return;
            try {
                const res = await fetchAuth(`${API_BASE_URL}/api/strikes/${id}`, { method: 'DELETE' });
                const data = await res.json();
                
                if (res.ok) {
                    showAlert(data.message);
                    loadStrikes();
                } else {
                    showAlert(data.error, true);
                }
            } catch(e) { 
                showAlert("Fehler beim Beenden des Streiks.", true); 
            }
        }
    