
        const API_BASE = 'https://api.limazon.v6.rocks/api';

        async function init() {
            loadMostWanted();
            loadRecentAttackers();
        }

        // 1. Most Wanted laden
        async function loadMostWanted() {
            const list = document.getElementById('bountyList');
            try {
                const res = await fetch(`${API_BASE}/bounty/most-wanted`);
                const data = await res.json();
                
                if (data.bounties.length === 0) {
                    list.innerHTML = '<p class="empty">Momentan sind keine Kopfgelder ausgesetzt. Limazon ist (zu) friedlich.</p>';
                    return;
                }

                list.innerHTML = data.bounties.map(b => `
                    <div class="poster">
                        <div class="label">Wanted</div>
                        <div class="avatar">👤</div>
                        <h3>${b.username}</h3>
                        <div class="amount">$${b.pool.toLocaleString()}</div>
                        <div class="attacker-info">Zuletzt erhöht: ${new Date(b.updatedAt).toLocaleDateString()}</div>
                        <button style="margin-top:10px; width: 100%;" onclick="quickBounty('${b.targetUserId}', '${b.username}')">Kopfgeld erhöhen</button>
                    </div>
                `).join('');
            } catch (e) { console.error(e); }
        }

        // 2. Eigene Angreifer laden
        async function loadRecentAttackers() {
            const list = document.getElementById('attackerList');
            try {
                const res = await fetch(`${API_BASE}/bounty/attackers`, { credentials: 'include' });
                const data = await res.json();

                if (!data.attackers || data.attackers.length === 0) {
                    list.innerHTML = '<p class="empty">Bisher wurdest du nicht ausgeraubt. Glückspilz!</p>';
                    return;
                }

                list.innerHTML = data.attackers.reverse().map(a => `
                    <div class="attacker-item">
                        <div class="attacker-name">${a.name}</div>
                        <div class="attacker-info">Hat dir $${a.amount.toLocaleString()} geklaut</div>
                        <div style="display: flex; gap: 5px;">
                            <input type="number" id="amt-${a.id}" placeholder="Betrag" min="1000" value="5000">
                            <button onclick="placeBounty('${a.id}', '${a.name}')">Setzen</button>
                        </div>
                    </div>
                `).join('');
            } catch (e) { console.error(e); }
        }

        // 3. Kopfgeld setzen
        async function placeBounty(targetId, name) {
            const amount = document.getElementById(`amt-${targetId}`).value;
            if (!confirm(`Möchtest du wirklich $${amount} Kopfgeld auf ${name} aussetzen?`)) return;

            try {
                const res = await fetch(`${API_BASE}/bounty/place`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ targetUserId: targetId, amount: parseInt(amount) })
                });
                const result = await res.json();
                
                if (result.error) {
                    alert("Fehler: " + result.error);
                } else {
                    alert(result.message);
                    loadMostWanted();
                    loadRecentAttackers();
                }
            } catch (e) { alert("Serverfehler"); }
        }

        // Hilfsfunktion für Erhöhung in der Liste
        function quickBounty(id, name) {
            const amt = prompt(`Wie viel Kopfgeld möchtest du auf ${name} zusätzlich aussetzen? (Min. 1000)`, "5000");
            if (amt) {
                // Ein Dummy-Element-ID-Trick um placeBounty wiederzuverwenden
                const tempInput = document.createElement('input');
                tempInput.id = `amt-${id}`;
                tempInput.value = amt;
                document.body.appendChild(tempInput);
                placeBounty(id, name);
                document.body.removeChild(tempInput);
            }
        }

        init();
    