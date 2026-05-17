
        const API_BASE = 'https://api.limazon.v6.rocks/api';
        const fetchOptions = { credentials: 'include', headers: { 'Content-Type': 'application/json' } };
        let currentUser = null;

        async function init() {
            try {
                const authRes = await fetch(`${API_BASE}/auth/me`, fetchOptions);
                if (!authRes.ok) {
                    document.getElementById('global-subtitle').innerText = "Bitte logge dich zuerst ein.";
                    return;
                }
                currentUser = await authRes.json();
                loadRathausData();
            } catch (e) {
                showToast("Fehler bei der Verbindung zum Server.", "error");
            }
        }

        async function loadRathausData() {
            try {
                const res = await fetch(`${API_BASE}/mayor/election`, fetchOptions);
                const data = await res.json();

                document.getElementById('citizen-view').classList.add('hidden');
                document.getElementById('election-view').classList.add('hidden');
                document.getElementById('mayor-view').classList.add('hidden');

                const isMeMayor = (data.currentMayor === currentUser.username);
                document.getElementById('global-subtitle').innerHTML = `Bürgerakte: <span class="font-bold text-white">${currentUser.username}</span>`;

                if (data.isActive) {
                    document.getElementById('election-view').classList.remove('hidden');
                    renderElection(data);
                } else if (isMeMayor) {
                    document.getElementById('mayor-view').classList.remove('hidden');
                } else {
                    document.getElementById('citizen-view').classList.remove('hidden');
                    document.getElementById('current-mayor-name').innerHTML = 
                        data.currentMayor !== "Niemand" ? `<span class="text-3xl">👑</span><br>${data.currentMayor}` : `Anarchie<br><span class="text-sm font-normal opacity-50 block mt-2">(Kein Bürgermeister)</span>`;
                }

                if (currentUser.isRealAdmin) {
                    document.getElementById('admin-view').classList.remove('hidden');
                }

            } catch (e) {
                showToast("Konnte Akten nicht laden.", "error");
            }
        }

        function renderElection(data) {
            document.getElementById('election-end-date').innerText = new Date(data.endsAt).toLocaleString('de-DE');
            
            const statusText = document.getElementById('vote-status-text');
            if (data.hasVoted) {
                statusText.innerHTML = "✅ Deine Stimme ist in der Urne.";
                statusText.className = "text-sm font-bold bg-emerald-500/10 text-emerald-400 py-3 px-4 rounded-xl border border-emerald-500/20 inline-block mx-auto";
            } else {
                statusText.innerHTML = "Wähle weise!";
                statusText.className = "text-sm font-bold bg-slate-800/80 text-white py-3 px-4 rounded-xl border border-slate-700 inline-block mx-auto";
            }

            const container = document.getElementById('candidates-container');
            container.innerHTML = '';

            if (!data.candidates || data.candidates.length === 0) {
                container.innerHTML = '<p class="col-span-2 text-center text-slate-500 text-sm">Keine aktiven Kandidaten gefunden.</p>';
                return;
            }

            data.candidates.forEach(cand => {
                const isMe = (cand.username === currentUser.username);
                
                let html = `
                    <div class="glass p-4 rounded-2xl border border-slate-700 flex flex-col justify-between h-full hover:border-amber-500/50 transition">
                        <div class="text-center mb-5 mt-2">
                            <div class="w-12 h-12 bg-slate-800 rounded-full mx-auto flex items-center justify-center text-xl font-bold text-white border-2 ${cand.isCurrentMayor ? 'border-amber-400' : 'border-slate-600'} mb-3">
                                ${cand.username.substring(0, 1).toUpperCase()}
                            </div>
                            <div class="text-sm font-bold text-white truncate leading-tight">${cand.isCurrentMayor ? '<span class="text-amber-400">👑</span> ' : ''}${cand.username}</div>
                            <div class="text-amber-400 font-mono text-xs mt-1 font-bold bg-amber-400/10 inline-block px-2 py-0.5 rounded-md">${cand.votes} Stimme(n)</div>
                        </div>
                `;

                if (data.hasVoted) {
                    if (data.myVoteId === cand.id) {
                        html += `<button class="w-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 py-2.5 rounded-xl font-bold text-xs" disabled>Deine Wahl</button>`;
                    } else {
                        html += `<button class="w-full bg-slate-800/50 text-slate-500 py-2.5 rounded-xl font-bold text-xs" disabled>Gewählt</button>`;
                    }
                } else if (isMe) {
                    html += `<button class="w-full bg-slate-800/50 text-slate-500 py-2.5 rounded-xl font-bold text-xs border border-slate-700" disabled>Du selbst</button>`;
                } else {
                    html += `<button class="w-full bg-amber-600 text-white py-2.5 rounded-xl font-bold text-xs hover:bg-amber-500 transition active:scale-95 shadow-md shadow-amber-600/20" onclick="voteFor('${cand.id}', '${cand.username}')">Wählen</button>`;
                }

                html += `</div>`;
                container.innerHTML += html;
            });
        }

        async function voteFor(candidateId, candidateName) {
            if (!confirm(`Stimme wirklich an ${candidateName} vergeben? Dies ist endgültig.`)) return;

            try {
                const res = await fetch(`${API_BASE}/mayor/vote`, {
                    ...fetchOptions, method: 'POST', body: JSON.stringify({ candidateId })
                });
                const data = await res.json();
                if (res.ok) {
                    showToast(data.message, "success");
                    loadRathausData(); 
                } else showToast(data.error || "Fehler", "error");
            } catch (e) { showToast("Netzwerkfehler", "error"); }
        }

        function updateTaxDisplay() {
            document.getElementById('tax-display').innerText = parseFloat(document.getElementById('tax-slider').value).toFixed(1);
        }

        async function setTaxes() {
            const rate = parseFloat(document.getElementById('tax-slider').value);
            const btn = document.getElementById('btn-tax');
            const ogText = btn.innerText;
            btn.disabled = true; btn.innerText = "Speichert...";

            try {
                const res = await fetch(`${API_BASE}/mayor/taxes`, {
                    ...fetchOptions, method: 'POST', body: JSON.stringify({ newRatePercent: rate })
                });
                const data = await res.json();
                if (res.ok) showToast(data.message, "success");
                else showToast(data.error, "error");
            } catch (e) { showToast("Fehler.", "error"); }
            btn.disabled = false; btn.innerText = ogText;
        }

        async function triggerStimulus() {
            if (!confirm("Willst du wirklich ein Konjunkturpaket aus der Staatskasse ausschütten?")) return;
            const btn = document.getElementById('btn-stimulus');
            const ogText = btn.innerText;
            btn.disabled = true; btn.innerText = "Fließt...";

            try {
                const res = await fetch(`${API_BASE}/mayor/stimulus`, { ...fetchOptions, method: 'POST' });
                const data = await res.json();
                if (res.ok) showToast(data.message, "success");
                else showToast(data.error, "error");
            } catch (e) { showToast("Fehler.", "error"); }
            btn.disabled = false; btn.innerText = ogText;
        }

        async function pardonInmate() {
            if (!confirm("Gerichtsverhandlung sofort abbrechen und Freispruch erteilen?")) return;
            const btn = document.getElementById('btn-pardon');
            const ogText = btn.innerText;
            btn.disabled = true; btn.innerText = "Begnadigt...";

            try {
                const res = await fetch(`${API_BASE}/mayor/pardon`, { ...fetchOptions, method: 'POST' });
                const data = await res.json();
                if (res.ok) showToast(data.message, "success");
                else showToast(data.error, "error");
            } catch (e) { showToast("Fehler.", "error"); }
            btn.disabled = false; btn.innerText = ogText;
        }

        async function startElection() {
            if (!confirm("Neuwahlen ausrufen? (3 Tage)")) return;
            try {
                const res = await fetch(`${API_BASE}/admin/mayor/start`, { ...fetchOptions, method: 'POST', body: JSON.stringify({ days: 3 }) });
                const data = await res.json();
                if (res.ok) { showToast(data.message, "success"); loadRathausData(); }
                else showToast(data.error, "error");
            } catch (e) { showToast("Fehler.", "error"); }
        }

        async function endElection() {
            if (!confirm("Wahl SOFORT beenden und Sieger krönen?")) return;
            try {
                const res = await fetch(`${API_BASE}/admin/mayor/end`, { ...fetchOptions, method: 'POST' });
                const data = await res.json();
                if (res.ok) { showToast(data.message, "success"); loadRathausData(); }
                else showToast(data.error, "error");
            } catch (e) { showToast("Fehler.", "error"); }
        }

        function showToast(message, type = 'success') {
            const container = document.getElementById('toast-container');
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.innerHTML = `<span class="mr-2">${type === 'success' ? '✅' : '❌'}</span> ${message}`;
            container.appendChild(toast);
            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 300);
            }, 4000);
        }

        window.onload = init;
    