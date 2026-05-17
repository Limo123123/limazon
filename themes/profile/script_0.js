
        const API_URL = 'https://api.limazon.v6.rocks';
        const urlParams = new URLSearchParams(window.location.search);
        let targetUser = urlParams.get('user'); 
        let currentUser = null;

        init();

        async function init() {
            try {
                const res = await fetch(API_URL + '/api/auth/me', { credentials: 'include' });
                if(res.ok) currentUser = await res.json();
            } catch(e) {}

            if(!targetUser && currentUser) targetUser = currentUser.username;
            else if (!targetUser && !currentUser) { window.location.href = '/'; return; }

            loadProfile(targetUser);
        }

        async function loadProfile(username) {
            try {
                const res = await fetch(API_URL + '/api/profile/' + username, { credentials: 'include' });
                if(!res.ok) return alert("User nicht gefunden");
                const data = await res.json();
                renderProfile(data.profile, data.allAchievements, data.isOwner);
            } catch(e) { console.error(e); }
        }

        function renderProfile(p, allAchievements, isOwner) {
            // Header
            document.getElementById('p-username').innerText = p.username;
            document.getElementById('p-avatar').innerText = p.username.substring(0,2).toUpperCase();
            document.getElementById('p-bio').innerText = p.bio || "Keine Beschreibung vorhanden.";
            
            // Edit & Settings (nur Owner)
            if(isOwner) {
                document.getElementById('btn-edit').classList.remove('hidden');
                document.getElementById('edit-bio-input').value = p.bio || "";
                document.getElementById('edit-public-inv').checked = p.isInventoryPublic;
            }

            // --- INVENTAR LOGIK ---
            const invGrid = document.getElementById('inv-grid');
            const invCountBadge = document.getElementById('inv-count');
            const invPrivMsg = document.getElementById('inv-private-msg');
            const invEmptyMsg = document.getElementById('inv-empty-msg');

            invGrid.innerHTML = '';
            invPrivMsg.classList.add('hidden');
            invEmptyMsg.classList.add('hidden');

            if (p.hideInventory) {
                // Privat
                invPrivMsg.classList.remove('hidden');
                invCountBadge.innerText = "🔒";
            } else if (!p.inventory || p.inventory.length === 0) {
                // Leer
                invEmptyMsg.classList.remove('hidden');
                invCountBadge.innerText = "0";
            } else {
                // Anzeigen
                let totalItems = 0;
                p.inventory.forEach(item => {
                    totalItems += item.quantity;
                    const imgHtml = item.image ? `<img src="${item.image}" class="w-full h-full object-cover">` : `<span class="text-2xl">📦</span>`;
                    
                    invGrid.innerHTML += `
                        <div class="bg-slate-800 rounded-xl p-2 border border-slate-700 flex flex-col items-center gap-1 relative group" title="${item.name}">
                            <div class="w-12 h-12 rounded-lg bg-slate-900 overflow-hidden flex items-center justify-center">
                                ${imgHtml}
                            </div>
                            <span class="text-[10px] text-center truncate w-full font-bold">${item.name}</span>
                            <span class="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] px-1.5 rounded-bl-lg font-bold shadow">${item.quantity}</span>
                        </div>
                    `;
                });
                invCountBadge.innerText = totalItems;
            }

            // --- ACHIEVEMENTS ---
            const grid = document.getElementById('achievement-grid');
            grid.innerHTML = '';
            let unlockedCount = 0;

            allAchievements.forEach(ach => {
                const hasIt = p.achievements.includes(ach.id);
                if(hasIt) unlockedCount++;

                const statusClass = hasIt ? 'badge-unlocked bg-indigo-600/20 border-indigo-500/50' : 'badge-locked bg-slate-800/50 border-slate-700';
                const textClass = hasIt ? 'text-white' : 'text-slate-500';

                grid.innerHTML += `
                    <div class="border ${statusClass} rounded-xl p-4 flex flex-col items-center text-center transition hover:scale-105">
                        <div class="text-4xl mb-2">${ach.icon}</div>
                        <h4 class="font-bold text-sm ${textClass}">${ach.title}</h4>
                        <p class="text-[10px] text-slate-400 mt-1 leading-tight">${ach.desc}</p>
                    </div>
                `;
            });

            document.getElementById('achieve-counter').innerText = `${unlockedCount}/${allAchievements.length}`;

            // Mini Badges
            const mini = document.getElementById('p-badges-mini');
            mini.innerHTML = '';
            if(p.isAdmin) mini.innerHTML += '<span class="bg-indigo-500 text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">Admin</span>';
            const joined = new Date(p.joinDate).toLocaleDateString();
            mini.innerHTML += `<span class="bg-slate-700 text-slate-300 text-[10px] px-2 py-0.5 rounded">Seit ${joined}</span>`;
        }

        function toggleInventory() {
            const content = document.getElementById('inventory-content');
            const arrow = document.getElementById('inv-arrow');
            content.classList.toggle('hidden');
            if(content.classList.contains('hidden')) arrow.style.transform = "rotate(0deg)";
            else arrow.style.transform = "rotate(180deg)";
        }

        function searchUser(name) {
            if(!name) return;
            window.location.href = `?user=${encodeURIComponent(name)}`;
        }

        function openEditModal() { document.getElementById('edit-modal').classList.remove('hidden'); }

        async function saveProfile() {
            const newBio = document.getElementById('edit-bio-input').value;
            const isPublic = document.getElementById('edit-public-inv').checked;
            const btn = document.querySelector('#edit-modal button:last-child');
            btn.innerText = "Speichere...";
            
            try {
                const res = await fetch(API_URL + '/api/profile/edit', {
                    method: 'POST', headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({ bio: newBio, isInventoryPublic: isPublic }), credentials: 'include'
                });
                if(res.ok) {
                    document.getElementById('edit-modal').classList.add('hidden');
                    loadProfile(targetUser);
                } else alert("Fehler beim Speichern.");
            } catch(e) { alert("Verbindungsfehler"); }
            finally { btn.innerText = "Speichern"; }
        }
    