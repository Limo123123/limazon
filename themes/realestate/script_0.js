
        const API_BASE_URL = 'https://api.limazon.v6.rocks';

        async function fetchAuth(url, options = {}) {
            options.credentials = 'include';
            return fetch(url, options);
        }

        document.addEventListener('DOMContentLoaded', async () => {
            await loadData();
        });

        function showLocalAlert(msg, isError = false) {
            const box = document.getElementById('alert-box');
            box.innerText = msg;
            box.className = `mb-6 p-4 rounded-xl font-bold text-center block ${isError ? 'bg-red-900/50 text-red-200 border border-red-500' : 'bg-green-900/50 text-green-200 border border-green-500'}`;
            setTimeout(() => box.classList.add('hidden'), 5000);
        }

        async function loadData() {
            try {
                // User & Balance
                const meRes = await fetchAuth(`${API_BASE_URL}/api/auth/me`);
                if (meRes.ok) {
                    const user = await meRes.json();
                    document.getElementById('user-balance').innerText = `$${user.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
                    window.currentUserId = user.userId;
                }

                // Markt & Home & Invites parallel laden
                const [marketRes, homeRes, inviteRes] = await Promise.all([
                    fetchAuth(`${API_BASE_URL}/api/realestate/market`),
                    fetchAuth(`${API_BASE_URL}/api/realestate/my-home`),
                    fetchAuth(`${API_BASE_URL}/api/realestate/wg/my-invites`)
                ]);

                const marketData = await marketRes.json();
                renderMarket(marketData.houses);

                const homeData = await homeRes.json();
                renderMyHome(homeData);

                const inviteData = await inviteRes.json();
                renderInvites(inviteData.invites);

            } catch (e) { console.error("Data Load Error:", e); }
        }

        function renderMarket(houses) {
            const grid = document.getElementById('market-grid');
            grid.innerHTML = '';
            houses.forEach(h => {
                const isSpecial = h.id === 'bunker';
                grid.innerHTML += `
                    <div class="glass-panel p-8 rounded-[2rem] house-card flex flex-col h-full bg-black/20 ${isSpecial ? 'bunker-glow' : ''}">
                        <div class="text-7xl mb-6 text-center drop-shadow-2xl">${h.img}</div>
                        <h3 class="text-2xl font-black text-white mb-2">${h.name}</h3>
                        <p class="text-gray-400 text-sm mb-6 flex-grow leading-relaxed">${h.desc}</p>
                        
                        <div class="space-y-2 mb-8">
                            <div class="flex justify-between text-[11px] uppercase tracking-widest font-bold">
                                <span class="text-gray-500">🛡️ Tresor-Schutz</span>
                                <span class="text-green-400">${Math.round(h.protection * 100)}%</span>
                            </div>
                            <div class="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                                <div class="bg-green-500 h-full" style="width: ${h.protection * 100}%"></div>
                            </div>
                            <div class="flex justify-between text-[11px] uppercase tracking-widest font-bold pt-2">
                                <span class="text-gray-500">👥 Max. Bewohner</span>
                                <span class="text-blue-400">${h.maxRoommates + 1} Personen</span>
                            </div>
                        </div>

                        <button onclick="buyHouse('${h.id}')" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-blue-900/20 uppercase tracking-widest text-xs">
                            Erwerben: $${h.price.toLocaleString()}
                        </button>
                    </div>
                `;
            });
        }

        function renderMyHome(data) {
            const section = document.getElementById('my-home-section');
            if (!data.hasHome) {
                section.classList.add('hidden');
                return;
            }
            section.classList.remove('hidden');

            const details = data.details;
            document.getElementById('my-home-name').innerText = details.name;
            document.getElementById('my-home-desc').innerText = details.desc;
            document.getElementById('my-home-icon').innerText = details.img;
            document.getElementById('my-home-protection').innerText = `${Math.round(details.protection * 100)}%`;
            document.getElementById('my-home-energy').innerText = `x${details.energyBonus || 1.0}`;

            // NEU: Miete pro Kopf berechnen (Mitbewohner + Besitzer)
            const totalResidents = data.roommates.length + 1; 
            const splitRent = Math.floor(details.rent / totalResidents);
            document.getElementById('my-home-rent').innerText = `$${splitRent.toLocaleString()}`;

            const roleEl = document.getElementById('my-home-role-badge');
            roleEl.innerText = data.isOwner ? "Eigentümer" : "Mitbewohner";
            roleEl.className = data.isOwner ?
                "inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" :
                "inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-blue-500/20 text-blue-400 border border-blue-500/30";

            if (data.isOwner) {
                document.getElementById('wg-management').classList.remove('hidden');
                document.getElementById('leave-btn-container').classList.add('hidden');
                document.getElementById('owner-actions-container').classList.remove('hidden');
                document.getElementById('slots-info').innerText = `Besetzt: ${data.roommates.length} / ${details.maxRoommates}`;

                const rList = document.getElementById('roommate-list');
                rList.innerHTML = '';
                if (data.roommates.length === 0) {
                    rList.innerHTML = '<p class="text-xs text-gray-600 py-4 text-center">Keine Untermieter vorhanden.</p>';
                } else {
                    data.roommates.forEach(r => {
                        rList.innerHTML += `
                            <div class="bg-white/5 px-4 py-3 rounded-xl text-xs flex justify-between items-center text-white border border-white/5 group">
                                <span class="font-bold">@${r.username}</span>
                                <button onclick="removeUser('${r._id}')" class="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-400 font-black tracking-widest uppercase text-[10px]">Kick</button>
                            </div>`;
                    });
                }
            } else {
                document.getElementById('wg-management').classList.add('hidden');
                document.getElementById('owner-actions-container').classList.add('hidden');
                document.getElementById('leave-btn-container').classList.remove('hidden');
            }
        }

        function renderInvites(invites) {
            const container = document.getElementById('invites-section');
            const list = document.getElementById('invites-list');
            if (!invites || invites.length === 0) {
                container.classList.add('hidden');
                return;
            }
            container.classList.remove('hidden');
            list.innerHTML = '';
            invites.forEach(inv => {
                list.innerHTML += `
                    <div class="glass-panel p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-center border-l-4 border-yellow-500 gap-4 bg-yellow-500/5">
                        <div class="text-center sm:text-left">
                            <p class="text-sm font-bold text-white">Einladung von <span class="text-yellow-400">@${inv.ownerName}</span></p>
                            <p class="text-xs text-gray-500">Möchtest du in das Objekt "${inv.houseName}" einziehen?</p>
                        </div>
                        <div class="flex gap-2">
                            <button onclick="respondInvite('${inv._id}', 'accept')" class="bg-green-600 hover:bg-green-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all">Einziehen</button>
                            <button onclick="respondInvite('${inv._id}', 'decline')" class="bg-white/10 hover:bg-white/20 text-gray-300 px-5 py-2 rounded-xl text-xs font-bold transition-all">Ablehnen</button>
                        </div>
                    </div>`;
            });
        }

        async function buyHouse(houseId) {
            if (!confirm("Immobilie kaufen? Dein aktueller Wohnsitz wird automatisch gekündigt/verkauft.")) return;
            const res = await fetchAuth(`${API_BASE_URL}/api/realestate/buy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ houseId })
            });
            const data = await res.json();
            if (res.ok) { showLocalAlert(data.message); setTimeout(() => location.reload(), 1500); }
            else showLocalAlert(data.error, true);
        }

        async function inviteRoommate() {
            const username = document.getElementById('invite-username').value;
            if (!username) return;
            const res = await fetchAuth(`${API_BASE_URL}/api/realestate/wg/invite`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUsername: username })
            });
            const data = await res.json();
            if (res.ok) { showLocalAlert(data.message); document.getElementById('invite-username').value = ''; }
            else showLocalAlert(data.error, true);
        }

        async function respondInvite(inviteId, action) {
            const res = await fetchAuth(`${API_BASE_URL}/api/realestate/wg/respond`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ inviteId, action })
            });
            const data = await res.json();
            if (res.ok) location.reload();
            else showLocalAlert(data.error, true);
        }

        async function sellHouse() {
            if (!confirm("Möchtest du dein Haus wirklich verkaufen? Du erhältst 75% des Kaufpreises zurück. Deine Mitbewohner werden sofort obdachlos!")) return;

            try {
                const res = await fetchAuth(`${API_BASE_URL}/api/realestate/sell`, { method: 'POST' });
                const data = await res.json();
                if (res.ok) {
                    alert(data.message);
                    location.reload();
                } else {
                    alert(data.error);
                }
            } catch (e) { console.error(e); }
        }

        async function removeUser(targetUserId = null) {
            const msg = targetUserId ? "Diesen Mitbewohner wirklich vor die Tür setzen?" : "Möchtest du die WG wirklich verlassen?";
            if (!confirm(msg)) return;

            const res = await fetchAuth(`${API_BASE_URL}/api/realestate/wg/remove`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId })
            });
            if (res.ok) location.reload();
            else showLocalAlert("Fehler beim WG-Update", true);
        }
    