
        const API_URL = 'https://api.limazon.v6.rocks/api';
        const fetchOptions = { headers: { 'Content-Type': 'application/json' }, credentials: 'include' };

        // Formular absenden
        document.getElementById('requestForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button');
            const originalText = btn.innerText;
            btn.innerText = "Sendet..."; btn.disabled = true;

            const payload = {
                type: document.getElementById('reqType').value,
                amount: document.getElementById('reqAmount').value,
                reason: document.getElementById('reqReason').value
            };

            try {
                const res = await fetch(`${API_URL}/requests`, { ...fetchOptions, method: 'POST', body: JSON.stringify(payload) });
                const data = await res.json();
                if (res.ok) {
                    alert("Erfolg: " + data.message);
                    document.getElementById('requestForm').reset();
                } else {
                    alert("Fehler: " + data.error);
                }
            } catch (err) {
                alert("Verbindungsfehler.");
            } finally {
                btn.innerText = originalText; btn.disabled = false;
            }
        });

        // Admin Tickets laden
        async function loadAdminRequests() {
            const list = document.getElementById('ticketList');
            try {
                const res = await fetch(`${API_URL}/admin/requests`, fetchOptions);
                if (res.ok) {
                    document.getElementById('adminPanel').classList.remove('hidden');
                    const data = await res.json();
                    renderTickets(data.requests);
                }
            } catch (err) { console.error("Kein Admin-Zugriff."); }
        }

        function renderTickets(requests) {
            const list = document.getElementById('ticketList');
            if (!requests || requests.length === 0) {
                list.innerHTML = '<div class="glass p-6 rounded-xl text-center text-emerald-400 text-sm font-bold border border-emerald-500/20">Keine offenen Anträge! 🎉</div>';
                return;
            }

            list.innerHTML = '';
            requests.forEach(req => {
                const date = new Date(req.createdAt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
                list.innerHTML += `
                    <div class="glass p-5 rounded-xl border border-slate-700 relative" id="ticket-${req._id}">
                        <div class="flex justify-between items-start mb-3">
                            <div>
                                <span class="text-white font-bold block">${req.username}</span>
                                <span class="text-[10px] text-slate-400 font-mono">${date}</span>
                            </div>
                            <span class="bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2 py-1 rounded border border-indigo-500/30 uppercase">${req.type}</span>
                        </div>
                        <div class="bg-slate-900/50 p-3 rounded-lg mb-4 text-sm text-slate-300 border border-slate-800">
                            <p class="mb-2"><strong>Grund:</strong> ${req.reason}</p>
                            ${req.amount > 0 ? `<p class="text-emerald-400 font-mono"><strong>Forderung:</strong> $${req.amount}</p>` : ''}
                        </div>
                        <div class="flex gap-3">
                            <button onclick="processTicket('${req._id}', 'approve')" class="flex-1 bg-emerald-600/20 text-emerald-400 border border-emerald-600/50 py-2 rounded-lg font-bold text-sm hover:bg-emerald-600 hover:text-white transition">Genehmigen</button>
                            <button onclick="processTicket('${req._id}', 'reject')" class="flex-1 bg-rose-600/20 text-rose-400 border border-rose-600/50 py-2 rounded-lg font-bold text-sm hover:bg-rose-600 hover:text-white transition">Ablehnen</button>
                        </div>
                    </div>
                `;
            });
        }

        async function processTicket(id, action) {
            if (!confirm(`Antrag wirklich ${action === 'approve' ? 'GENEHMIGEN' : 'ABLEHNEN'}?`)) return;
            try {
                const res = await fetch(`${API_URL}/admin/requests/${id}/process`, { ...fetchOptions, method: 'POST', body: JSON.stringify({ action }) });
                const data = await res.json();
                if (res.ok) {
                    document.getElementById(`ticket-${id}`).remove();
                    // Wenn die Liste leer ist, neu laden um die "Leer"-Nachricht anzuzeigen
                    if(document.getElementById('ticketList').children.length === 0) loadAdminRequests();
                } else alert("Fehler: " + data.error);
            } catch (err) { alert("Verarbeitungsfehler."); }
        }

        // Init initialisieren
        loadAdminRequests();
    