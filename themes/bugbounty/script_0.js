
        const API_URL = 'https://api.limazon.v6.rocks'; // URL ANPASSEN!

        // --- INIT ---
        async function init() {
            loadShop();
            tryLoadAdminReports(); // Versuch, Admin-Daten zu laden
        }

        // --- SHOP LADEN ---
        async function loadShop() {
            try {
                const res = await fetch(`${API_URL}/api/bug-bounty/shop`, { credentials: 'include' });
                const data = await res.json();
                
                document.getElementById('user-coins').innerText = `${data.deltaCoins || 0} ∆`;

                const container = document.getElementById('shop-container');
                if(!data.items) return;

                container.innerHTML = data.items.map(item => `
                    <div class="shop-card p-4 rounded flex flex-col justify-between h-full relative overflow-hidden group">
                        <div class="absolute top-0 right-0 bg-gray-800 text-cyan-400 text-xs px-2 py-1 rounded-bl">${item.cost} ∆</div>
                        <div>
                            <h3 class="font-bold text-white mb-1">${item.name}</h3>
                            <p class="text-xs text-gray-400 mb-4">${item.desc}</p>
                        </div>
                        <button onclick="buyItem('${item.id}')" class="w-full border border-cyan-800 hover:bg-cyan-900/30 text-cyan-500 text-sm py-2 rounded transition-colors">
                            KAUFEN
                        </button>
                    </div>
                `).join('');

            } catch (e) { console.error(e); }
        }

        // --- ADMIN: REPORTS LADEN ---
        async function tryLoadAdminReports() {
            try {
                const res = await fetch(`${API_URL}/api/admin/bugs`, { credentials: 'include' });
                
                // Wenn 401/403, dann ist man kein Admin -> Abbrechen
                if(!res.ok) return; 

                const data = await res.json();
                const container = document.getElementById('reports-list');
                const adminArea = document.getElementById('admin-area');
                
                // Admin Bereich sichtbar machen
                adminArea.style.display = 'block';

                if(!data.reports || data.reports.length === 0) {
                    container.innerHTML = '<p class="text-gray-500">Keine Reports vorhanden.</p>';
                    return;
                }

                container.innerHTML = data.reports.map(rep => {
                    const date = new Date(rep.createdAt).toLocaleString();
                    const statusClass = rep.status === 'resolved' ? 'status-resolved' : (rep.status === 'rejected' ? 'status-rejected' : 'status-open');
                    
                    // Buttons nur anzeigen, wenn Status noch 'open' ist
                    const actions = rep.status === 'open' ? `
                        <div class="mt-3 flex gap-3">
                            <button onclick="resolveReport('${rep._id}', 'resolved', true)" class="bg-green-900 text-green-300 px-3 py-1 rounded text-sm hover:bg-green-800">✅ Genehmigen (+1 ∆)</button>
                            <button onclick="resolveReport('${rep._id}', 'rejected', false)" class="bg-red-900 text-red-300 px-3 py-1 rounded text-sm hover:bg-red-800">❌ Ablehnen</button>
                        </div>
                    ` : `<div class="mt-2 text-xs text-gray-500">Bearbeitet.</div>`;

                    return `
                        <div class="report-card">
                            <div class="flex justify-between">
                                <h3 class="font-bold text-white">${rep.title}</h3>
                                <span class="text-xs uppercase font-bold ${statusClass}">${rep.status}</span>
                            </div>
                            <div class="text-xs text-gray-400 mb-2">Von: <b class="text-white">${rep.username}</b> am ${date}</div>
                            <div class="bg-black p-2 rounded text-sm text-gray-300 mb-2 whitespace-pre-wrap">${rep.description}</div>
                            ${rep.steps ? `<div class="text-xs text-gray-500 italic">Steps: ${rep.steps}</div>` : ''}
                            ${actions}
                        </div>
                    `;
                }).join('');

            } catch (e) { console.log("Kein Admin-Zugriff oder Fehler."); }
        }

        // --- ADMIN: STATUS ÄNDERN ---
        async function resolveReport(id, status, giveReward) {
            if(!confirm(`Status wirklich auf ${status.toUpperCase()} setzen?`)) return;

            try {
                const res = await fetch(`${API_URL}/api/admin/bugs/${id}/resolve`, { 
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    credentials: 'include',
                    body: JSON.stringify({ status, giveReward })
                });
                const json = await res.json();
                
                if(res.ok) {
                    alert(json.message);
                    tryLoadAdminReports(); // Liste neu laden
                } else {
                    alert("Fehler: " + json.error);
                }
            } catch(e) { alert("Fehler."); }
        }

        // --- KAUFEN ---
        async function buyItem(itemId) {
            if(!confirm(`Item für Delta-Coins kaufen?`)) return;

            try {
                const res = await fetch(`${API_URL}/api/bug-bounty/buy`, { 
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    credentials: 'include',
                    body: JSON.stringify({ itemId })
                });
                const json = await res.json();

                if(res.ok) {
                    alert(json.message);
                    loadShop(); 
                } else {
                    alert("Fehler: " + json.error);
                }
            } catch(e) { alert("Serverfehler."); }
        }

        // --- REPORT SENDEN ---
        document.getElementById('bugForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button');
            const originalText = btn.innerText;
            btn.innerText = "SENDE DATEN...";
            btn.disabled = true;

            const payload = {
                title: document.getElementById('title').value,
                description: document.getElementById('desc').value,
                steps: document.getElementById('steps').value
            };

            try {
                const res = await fetch(`${API_URL}/api/bugs`, { 
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    credentials: 'include',
                    body: JSON.stringify(payload)
                });
                const json = await res.json();
                
                if (res.ok) {
                    alert(json.message);
                    e.target.reset();
                    // Wenn man selbst Admin ist, Liste sofort aktualisieren, damit man seinen eigenen Report sieht
                    tryLoadAdminReports(); 
                } else {
                    alert("Fehler: " + json.error);
                }
            } catch (err) {
                alert("Netzwerkfehler.");
            } finally {
                btn.innerText = originalText;
                btn.disabled = false;
            }
        });

        init();
    