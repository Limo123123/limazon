
        const API_URL = 'https://api.limazon.v6.rocks'; 
        let currentTab = 'public'; 
        let isInGang = false;
        let isLeader = false;
        let myGangId = null;

        document.addEventListener('DOMContentLoaded', () => {
            loadDashboard();
            setInterval(loadDashboard, 3000); 
        });

        async function loadDashboard() {
            try {
                const res = await fetch(`${API_URL}/api/gangs/dashboard`, { credentials: 'include' });
                const data = await res.json();
                if(res.ok) {
                    isInGang = data.inGang;
                    if(isInGang) {
                        isLeader = data.gang.isLeader;
                        myGangId = data.gang.id;
                    }
                    updateUIState(data);
                    renderChat(data);
                    renderZones(data.zones);
                    renderTopGangs(data.topGangs);
                }
            } catch(e) {}
        }

        function updateUIState(data) {
            // Balance anzeigen
            if(data.userBalance !== undefined) document.getElementById('my-balance').innerText = '$ ' + data.userBalance.toLocaleString();
            
            if (isInGang) {
                document.getElementById('view-no-gang').classList.add('hidden');
                document.getElementById('view-in-gang').classList.remove('hidden');
                
                const g = data.gang;
                document.getElementById('gang-name').innerText = g.name;
                document.getElementById('gang-tag').innerText = g.tag;
                document.getElementById('gang-balance').innerText = '$ ' + g.balance.toLocaleString();
                document.getElementById('gang-members-count').innerText = g.members.length + '/10';

                // --- UPGRADES ANZEIGEN & SHOP BUTTONS SPERREN ---
                const badgesContainer = document.getElementById('gang-badges');
                badgesContainer.innerHTML = "";
                const upgrades = g.upgrades || {};

                // Badges
                if(upgrades.bunker) badgesContainer.innerHTML += `<span title="Bunker" class="text-xl">🛡️</span>`;
                if(upgrades.lawyer) badgesContainer.innerHTML += `<span title="Anwalt" class="text-xl">⚖️</span>`;
                if(upgrades.weapons) badgesContainer.innerHTML += `<span title="Waffen" class="text-xl">⚔️</span>`;

                // Shop Buttons Logik
                const updateShopBtn = (type) => {
                    const btn = document.querySelector(`button[onclick="buyUpgrade('${type}')"]`);
                    if(btn) {
                        if(upgrades[type]) {
                            btn.innerText = "BESITZ";
                            btn.disabled = true;
                            btn.className = "btn-cyber border-green-600 text-green-600 cursor-default opacity-50";
                        } else {
                            btn.innerText = "KAUFEN";
                            btn.disabled = false;
                            btn.className = "btn-cyber text-xs";
                        }
                    }
                };
                updateShopBtn('bunker');
                updateShopBtn('lawyer');
                updateShopBtn('weapons');

                // Members
                const list = document.getElementById('member-list');
                list.innerHTML = g.members.map(m => {
                    const kickBtn = (isLeader && m._id !== g.leaderId) ? 
                        `<button onclick="kickMember('${m._id}')" class="text-[10px] text-red-500 border border-red-900 px-1 hover:bg-red-900 ml-2">KICK</button>` : '';
                    const promoBtn = (isLeader && m._id !== g.leaderId) ? 
                        `<button onclick="promoteMember('${m._id}')" class="text-[10px] text-yellow-500 border border-yellow-900 px-1 hover:bg-yellow-900">👑</button>` : '';
                    
                    return `
                    <div class="flex justify-between items-center bg-black/30 p-2 rounded border border-gray-800">
                        <span class="font-bold text-sm ${m._id === g.leaderId ? 'text-yellow-500' : 'text-gray-300'}">
                            ${m._id === g.leaderId ? '👑' : ''} ${m.username}
                        </span>
                        <div class="flex gap-1">${promoBtn}${kickBtn}</div>
                    </div>`;
                }).join('');

            } else {
                // Not in Gang
                document.getElementById('view-no-gang').classList.remove('hidden');
                document.getElementById('view-in-gang').classList.add('hidden');
                if(currentTab === 'private' || currentTab === 'shop') switchTab('public');
                document.getElementById('tab-private').disabled = true;
                document.getElementById('tab-shop').disabled = true;
            }
        }

        function renderZones(zones) {
            const container = document.getElementById('zones-list');
            if(!zones) return;

            container.innerHTML = zones.map(z => {
                let statusHtml = "";
                let btnHtml = "";

                if (z.isTaken) {
                    const myTag = document.getElementById('gang-tag').innerText;
                    const isOurs = isInGang && z.ownerTag === myTag;
                    
                    if (isOurs) {
                        statusHtml = `<span class="text-green-500 font-bold border border-green-900 bg-green-900/20 px-2 py-1 text-xs rounded">EIGENTUM</span>`;
                        btnHtml = `<button class="btn-cyber text-xs opacity-50 cursor-not-allowed border-green-600 text-green-600">GESICHERT</button>`;
                    } else {
                        statusHtml = `<span class="text-red-500 font-bold border border-red-900 bg-red-900/20 px-2 py-1 text-xs rounded">VON [${z.ownerTag}]</span>`;
                        // Time calculation
                        const left = Math.ceil((new Date(z.expiresAt) - new Date()) / 60000 / 60);
                        btnHtml = `<button class="btn-cyber text-xs opacity-50 cursor-not-allowed border-red-900 text-red-900">FREI IN ${left}h</button>`;
                    }
                } else {
                    statusHtml = `<span class="text-gray-400 border border-gray-700 bg-black px-2 py-1 text-xs rounded">VERFÜGBAR</span>`;
                    if (isLeader) {
                        btnHtml = `<button onclick="rentZone('${z.id}')" class="btn-cyber btn-gold text-xs">MIETEN</button>`;
                    } else {
                        btnHtml = `<button class="btn-cyber text-xs opacity-50" disabled>NUR LEADER</button>`;
                    }
                }

                return `
                <div class="flex items-center justify-between bg-black/40 border border-gray-800 p-4 rounded hover:border-violet-500/50 transition">
                    <div class="flex items-center gap-4">
                        <div class="text-4xl filter drop-shadow-[0_0_10px_rgba(139,92,246,0.3)]">${z.icon}</div>
                        <div>
                            <h3 class="text-lg text-white font-bold uppercase">${z.name}</h3>
                            <div class="flex items-center gap-2 mt-1">
                                <span class="text-yellow-500 font-mono text-xs">$${(z.cost/1000000).toFixed(1)}M / 24h</span>
                                ${statusHtml}
                            </div>
                        </div>
                    </div>
                    <div>${btnHtml}</div>
                </div>`;
            }).join('');
        }

        function switchTab(tab) {
            currentTab = tab;
            document.querySelectorAll('button[id^="tab-"]').forEach(b => {
                b.className = "flex-1 py-3 text-sm font-bold uppercase text-gray-500 border-b-2 border-transparent hover:text-gray-300 transition";
            });
            const activeBtn = document.getElementById(`tab-${tab}`);
            let color = "violet"; 
            if(tab === 'shop') color = "yellow";
            activeBtn.className = `flex-1 py-3 text-sm font-bold uppercase bg-${color}-900/20 text-white border-b-2 border-${color}-500 transition`;

            if(tab === 'shop') {
                document.getElementById('section-chat').classList.add('hidden');
                document.getElementById('section-shop').classList.remove('hidden');
            } else {
                document.getElementById('section-chat').classList.remove('hidden');
                document.getElementById('section-shop').classList.add('hidden');
                loadDashboard(); 
            }
        }

        function renderChat(data) {
            if(currentTab === 'shop') return;
            const msgs = currentTab === 'public' ? data.publicChat : (data.gang ? data.gang.privateChat : []);
            const container = document.getElementById('chat-window');
            let html = "";
            if(msgs.length === 0) html = `<div class="text-center text-gray-600 mt-10 opacity-50">Keine Nachrichten...</div>`;
            else {
                const displayMsgs = [...msgs].reverse(); 
                html = displayMsgs.map(m => {
                    const time = new Date(m.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    const isSystem = m.sender === 'SYSTEM' || m.sender === 'WAR-BOT';
                    const tagHtml = m.tag ? `<span class="tag-badge">${m.tag}</span>` : '';
                    return `
                    <div class="msg ${currentTab === 'private' ? 'private' : ''} ${isSystem ? 'system' : ''}">
                        <div class="flex items-baseline gap-2 mb-1">
                            <span class="text-xs text-gray-600 font-mono">[${time}]</span>
                            ${tagHtml}
                            <span class="font-bold text-xs ${isSystem ? '' : 'text-gray-300'}">${m.sender}:</span>
                        </div>
                        <div class="text-gray-200 break-words">${m.msg}</div>
                    </div>`;
                }).join('');
            }
            if(container.innerHTML !== html) { container.innerHTML = html; container.scrollTop = container.scrollHeight; }
        }

        // --- API CALLS ---
        async function apiCall(endpoint, body) {
            try {
                const res = await fetch(`${API_URL}/api/gangs/${endpoint}`, {
                    method: 'POST', headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(body), credentials: 'include'
                });
                const d = await res.json();
                if(res.ok) { 
                    if(d.message) alert(d.message); 
                    loadDashboard(); 
                } else alert(d.error);
            } catch(e) { alert("Verbindungsfehler"); }
        }

        function sendMessage() {
            const input = document.getElementById('chat-input');
            const msg = input.value.trim();
            if(!msg) return;
            input.value = "";
            apiCall('chat', { message: msg, type: currentTab });
        }
        function createGang() {
            const name = document.getElementById('create-name').value;
            const tag = document.getElementById('create-tag').value;
            if(confirm(`Gang gründen?`)) apiCall('create', { name, tag });
        }
        function depositMoney() {
            const amount = document.getElementById('deposit-amount').value;
            apiCall('deposit', { amount });
            document.getElementById('deposit-amount').value = "";
        }
        function leaveGang() { if(confirm("Wirklich verlassen?")) apiCall('leave', {}); }
        function kickMember(id) { if(confirm("Kicken?")) apiCall('kick', { targetId: id }); }
        function promoteMember(id) { if(confirm("Zum Leader machen?")) apiCall('promote', { targetId: id }); }
        function buyUpgrade(type) { if(confirm("Upgrade kaufen?")) apiCall('upgrade', { type }); }
        function attackGang(id) {
            if(!confirm("Krieg erklären und angreifen? (1h Cooldown)")) return;
            apiCall('attack', { targetGangId: id });
        }
        function rentZone(id) {
            if(!confirm("Zone mieten für 24h?")) apiCall('rent-zone', { zoneId: id });
        }
        function joinGang(id) { if(confirm("Beitreten?")) apiCall('join', { gangId: id }); }

        function renderTopGangs(list) {
            const tbody = document.getElementById('top-gangs-list');
            if(list.length === 0) { tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-gray-600">Leer...</td></tr>`; return; }
            tbody.innerHTML = list.map((g, i) => {
                let actionBtn = "";
                if (!isInGang) actionBtn = `<button onclick="joinGang('${g._id}')" class="text-xs bg-violet-900 text-violet-200 px-2 py-1 rounded hover:bg-violet-600">JOIN</button>`;
                else if (g._id !== myGangId) actionBtn = `<button onclick="attackGang('${g._id}')" class="text-xs bg-red-900 text-red-200 px-2 py-1 rounded hover:bg-red-600 border border-red-500 font-bold">⚔️ ATTACK</button>`;

                let rankColor = i===0 ? "text-yellow-400 font-bold" : "text-gray-500";
                return `
                <tr class="hover:bg-white/5 transition border-b border-gray-800">
                    <td class="p-2 ${rankColor}">#${i+1}</td>
                    <td class="p-2 font-mono font-bold text-violet-400">[${g.tag}]</td>
                    <td class="p-2 font-bold text-white">${g.name}</td>
                    <td class="p-2 text-right font-mono text-yellow-500">$${(g.balance/1000000).toFixed(1)}M</td>
                    <td class="p-2 text-center text-gray-400 text-xs">${g.memberCount}/10</td>
                    <td class="p-2 text-right">${actionBtn}</td>
                </tr>`;
            }).join('');
        }
    