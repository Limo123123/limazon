
        const API_URL = 'https://api.limazon.v6.rocks'; 
        let fullCatalog = [];

        function showDetails(type) {
            document.getElementById('intro-text').style.display = 'none';
            document.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('active-btn'));
            const btn = document.getElementById(`btn-${type}`);
            if(btn) btn.classList.add('active-btn');
            document.querySelectorAll('.details-panel').forEach(p => p.classList.remove('active'));
            const panel = document.getElementById(`panel-${type}`);
            if(panel) {
                panel.classList.add('active');
                if(type === 'achieve') loadAchievementCatalog();
                if(window.innerWidth < 1024) {
                    setTimeout(() => { panel.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100);
                }
            }
        }

        async function loadBalance() {
            try {
                const res = await fetch(`${API_URL}/api/auth/me`, { credentials: 'include' });
                if(res.ok) {
                    const data = await res.json();
                    document.getElementById('balance-display').innerText = '$ ' + formatMoney(data.balance);
                }
            } catch(e) {}
        }

        async function buyService(serviceType) {
            // Confirmation for expensive schufa hack
            if (serviceType === 'schufa_hack') {
                if (!confirm("Willst du wirklich $2.5 Millionen zahlen, um deine Schufa-Akte zu reinigen?")) return;
            }

            const btn = event.target.closest('button');
            const originalText = btn.innerText;
            btn.innerText = "...";
            btn.disabled = true;

            let body = { service: serviceType };
            if(serviceType === 'leak') body.target = document.getElementById('target-user').value;

            try {
                const res = await fetch(`${API_URL}/api/yakuza/buy`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                    credentials: 'include'
                });
                
                const data = await res.json();

                if(res.ok) {
                    if(serviceType === 'leak' && data.leak) {
                        displayLeak(data.leak);
                        btn.innerText = "FERTIG";
                    } else if (serviceType === 'fakeid') {
                        alert("Identität gefälscht! Wir leiten dich neu, um die Akten zu aktualisieren.");
                        window.location.href = '/themes/crime.html'; 
                    } else if (serviceType.startsWith('badge_')) {
                        alert(data.message || "Gekauft!");
                        btn.innerText = "GEKAUFT";
                        loadBalance(); loadAchievementCatalog();
                    } else {
                        alert(data.message); // Hier kommt die Erfolgsmeldung für Schufa Hack an
                        btn.innerText = "ERFOLGREICH";
                        loadBalance();
                    }
                    if(data.newBalance) document.getElementById('balance-display').innerText = '$ ' + formatMoney(data.newBalance);
                } else {
                    alert(data.error || "Fehler.");
                    btn.innerText = originalText;
                }
            } catch(e) {
                alert("Verbindungsfehler");
                btn.innerText = originalText;
            }
            btn.disabled = false;
        }

        function displayLeak(data) {
            const container = document.getElementById('leak-result');
            let cds = "Keine";
            if(data.cooldowns && Object.keys(data.cooldowns).length > 0) {
                cds = Object.keys(data.cooldowns).map(k => {
                    if(!data.cooldowns[k]) return null;
                    const diff = new Date(data.cooldowns[k]) - new Date();
                    const min = Math.ceil(diff / 60000);
                    return diff > 0 ? `${k.replace('At','').toUpperCase()}: ${min}m` : null;
                }).filter(Boolean).join(", ");
                if(cds === "") cds = "BEREIT";
            }
            container.innerHTML = `
<span class="data-key">> ID:</span> <span class="data-val">${data._id}</span>
<span class="data-key">> NAME:</span> <span class="data-alert font-bold text-lg">${data.username}</span>
----------------
<span class="data-key">BANK:</span> <span class="data-val">$${data.balance.toLocaleString()}</span>
<span class="data-key">TOKENS:</span> <span class="data-val">${data.tokens.toLocaleString()}</span>
<span class="data-key">INFINITY:</span> <span class="data-alert">${data.infinity ? 'JA' : 'NEIN'}</span>
----------------
<span class="data-key">COOLDOWN:</span> <span class="data-val text-yellow-400">${cds}</span>
<span class="data-key">ASSETS:</span> <span class="data-val">${data.inventorySize} Items</span>
<span class="data-key">RARES:</span> <span class="data-val text-purple-400">${data.rareItems.length > 0 ? data.rareItems.join(', ') : 'N/A'}</span>`;
            container.classList.remove('hidden');
        }

        async function loadAchievementCatalog() {
            try {
                const res = await fetch(`${API_URL}/api/yakuza/catalog`, { credentials: 'include' });
                const data = await res.json();
                fullCatalog = data.catalog; 
                const myBadges = data.owned || []; 
                renderCatalog(fullCatalog, myBadges);
            } catch (e) {
                document.getElementById('achievement-list').innerHTML = '<div class="text-red-500 font-mono">CONNECTION LOST.</div>';
            }
        }

        function renderCatalog(items, ownedBadges) {
            const list = document.getElementById('achievement-list');
            list.innerHTML = '';
            const ownedItems = items.filter(i => ownedBadges.includes(i.id));
            const missingItems = items.filter(i => !ownedBadges.includes(i.id));
            missingItems.sort((a, b) => b.price - a.price);
            ownedItems.sort((a, b) => b.price - a.price);
            const sortedItems = [...missingItems, ...ownedItems];

            sortedItems.forEach(item => {
                const isOwned = ownedBadges.includes(item.id);
                const isExclusive = ['badge_yakuza', 'badge_hacker', 'badge_rich', 'badge_illuminati', 'badge_hunter'].includes(item.id);
                let priceDisplay = '$' + (item.price / 1000000).toFixed(1) + 'M';
                if(item.price >= 1000000000) priceDisplay = '$' + (item.price / 1000000000).toFixed(1) + 'B';
                if(item.price < 1000000) priceDisplay = '$' + (item.price / 1000).toFixed(0) + 'k';
                let containerClass = "flex justify-between items-center p-2 border-l-4 transition group mb-1";
                let btnHtml = "";
                if (isOwned) {
                    containerClass += " border-green-600 bg-green-950/20 opacity-60 hover:opacity-100";
                    btnHtml = `<div class="flex flex-col items-end"><span class="text-green-500 text-xl">✔️</span><span class="text-[10px] text-green-700 font-mono">GEKAUFT</span></div>`;
                } else {
                    if(isExclusive) containerClass += " border-red-600 bg-red-950/30 hover:bg-red-900/50";
                    else containerClass += " border-gray-600 bg-black hover:bg-white/5";
                    btnHtml = `<button onclick="buyService('badge_${item.id}')" class="font-mono text-sm bg-white text-black px-3 py-1 hover:bg-red-600 hover:text-white transition transform skew-x-[-10deg] font-bold shadow-lg">${priceDisplay}</button>`;
                }
                const div = document.createElement('div');
                div.className = containerClass;
                div.innerHTML = `<div class="flex items-center gap-3 overflow-hidden"><span class="text-3xl filter drop-shadow-md">${item.icon || '🏆'}</span><div class="flex flex-col"><span class="font-bold uppercase text-base ${isOwned ? 'text-green-400' : 'text-white group-hover:text-red-500'} transition leading-none">${item.title}</span><span class="text-[10px] text-gray-400 truncate w-40 font-mono mt-1">${item.desc}</span></div></div><div class="text-right pl-2">${btnHtml}</div>`;
                list.appendChild(div);
            });
        }

        function filterCatalog(mode) {
            const list = document.getElementById('achievement-list');
            for(let div of list.children) {
                const isOwned = div.innerHTML.includes('✔️'); 
                const isOni = div.className.includes('border-red-600');
                if (mode === 'all') div.style.display = 'flex';
                else if (mode === 'owned') div.style.display = isOwned ? 'flex' : 'none';
                else if (mode === 'missing') div.style.display = !isOwned ? 'flex' : 'none';
                else if (mode === 'exclusive') div.style.display = isOni ? 'flex' : 'none';
            }
        }

        function formatMoney(amount) { return amount.toLocaleString('de-DE'); }
        document.addEventListener('DOMContentLoaded', loadBalance);
    