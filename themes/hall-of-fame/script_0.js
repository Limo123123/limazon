
        const API_BASE = 'https://api.limazon.v6.rocks/api';

        async function init() {
            try {
                const res = await fetch(`${API_BASE}/hall-of-fame`);
                if(!res.ok) throw new Error("Netzwerkfehler");
                const data = await res.json();
                
                renderPage(data);
                
                const date = new Date(data.lastUpdated);
                document.getElementById('last-updated').innerText = `LETZTES UPDATE: ${date.toLocaleTimeString()} Uhr`;

            } catch(e) {
                console.error(e);
                document.getElementById('status-msg').innerText = "Fehler beim Laden der Daten.";
                document.getElementById('status-msg').classList.remove('hidden');
            }
        }

        function renderPage(data) {
            data.categories.forEach(cat => {
                if (cat.id === 'money_magnates') {
                    renderPodiumAndList(cat.entries, 'money', 'USD');
                } else if (cat.id === 'token_titans') {
                    renderPodiumAndList(cat.entries, 'tokens', 'TOKEN');
                } else if (cat.id === 'infinity_club') {
                    renderInfinity(cat.members);
                }
            });
        }

        function renderPodiumAndList(entries, type, currency) {
            const podiumContainer = document.getElementById(`podium-${type}`);
            const listContainer = document.getElementById(`list-${type}`);
            
            // Top 3 fürs Podium
            // Array muss sortiert sein: [2. Platz, 1. Platz, 3. Platz] für die Optik
            // Daten kommen als [1, 2, 3, 4, 5]
            
            // Safe check
            if(!entries || entries.length === 0) {
                podiumContainer.innerHTML = '<p class="text-gray-500">Keine Daten.</p>';
                return;
            }

            const top3 = [];
            // Logik: Platz 2 links, Platz 1 mitte, Platz 3 rechts
            if(entries[1]) top3.push({ ...entries[1], rank: 2 });
            if(entries[0]) top3.push({ ...entries[0], rank: 1 });
            if(entries[2]) top3.push({ ...entries[2], rank: 3 });

            // Render Podium
            podiumContainer.innerHTML = top3.map(u => {
                let val = 0;
                if(currency === 'USD') val = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'USD' }).format(u.balance);
                else val = u.tokens.toLocaleString() + " T";

                const avatarUrl = `https://ui-avatars.com/api/?name=${u.username}&background=random&color=fff&size=128`;

                return `
                    <div class="podium-place rank-${u.rank}">
                        <div class="rank-number">${u.rank}</div>
                        <img src="${avatarUrl}" class="avatar-circle">
                        <div class="text-white font-bold text-sm mb-1 truncate w-full">${u.username}</div>
                        <div class="text-xs text-gray-400 font-mono mb-2">${val}</div>
                        <div class="podium-bar"></div>
                    </div>
                `;
            }).join('');

            // Render List (Platz 4+)
            const rest = entries.slice(3);
            if(rest.length > 0) {
                listContainer.innerHTML = rest.map((u, i) => {
                    let val = 0;
                    if(currency === 'USD') val = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'USD' }).format(u.balance);
                    else val = u.tokens.toLocaleString() + " T";
                    
                    return `
                        <div class="list-item">
                            <div class="flex items-center gap-4">
                                <span class="font-mono text-gray-500 text-lg w-6 text-center">${i + 4}</span>
                                <span class="font-bold text-gray-200">${u.username}</span>
                            </div>
                            <span class="font-mono text-gray-400 text-sm">${val}</span>
                        </div>
                    `;
                }).join('');
            } else {
                listContainer.innerHTML = '';
            }
        }

        function renderInfinity(members) {
            const container = document.getElementById('infinity-list');
            if(!members || members.length === 0) {
                container.innerHTML = '<p class="text-amber-100/40">Noch keine Mitglieder.</p>';
                return;
            }
            container.innerHTML = members.map(m => `
                <div class="infinity-tag">
                    <span>∞</span>
                    <span>${m}</span>
                </div>
            `).join('');
        }

        // Start
        document.addEventListener('DOMContentLoaded', init);

    