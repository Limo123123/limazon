
        const API_BASE_URL = 'https://api.limazon.v6.rocks';
        let currentUser = null;
        let globalAlbum = [];

        let albumCurrentPage = 1;
        const albumItemsPerPage = 10;
        let albumSearchQuery = "";
        let globalUniverses = [];
        let selectedAlbumUniverse = "all";
        let selectedInventoryUniverse = "all";

        async function fetchAuth(url, options = {}) { options.credentials = 'include'; return fetch(url, options); }

        document.addEventListener('DOMContentLoaded', async () => { await checkAuth(); });

        async function checkAuth() {
            try {
                const res = await fetchAuth(`${API_BASE_URL}/api/auth/me`);
                if (res.ok) {
                    currentUser = await res.json();
                    document.getElementById('app-container').classList.remove('hidden');
                    updateBalanceDisplay(currentUser.balance);
                    if (currentUser.isAdmin) document.getElementById('btn-admin-tab').classList.remove('hidden');

                    await loadUniverses();
                    await loadAlbumData();
                    await loadTrades();
                    await loadBattles();
                    await loadBattleHistory(); // NEU
                } else {
                    document.getElementById('login-warning').classList.remove('hidden');
                }
            } catch (e) { console.error(e); }
        }

        function switchTab(tabId, btnElement) {
            document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
            btnElement.classList.add('active');
            if (tabId === 'tab-trade') loadTrades();
            if (tabId === 'tab-arena') {
                loadBattles();
                loadBattleHistory();
            }
        }

        function updateBalanceDisplay(amount) {
            document.getElementById('user-balance').innerText = `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }

        function showAlert(msg, isError = false) {
            const box = document.getElementById('alert-box');
            box.innerText = msg;
            box.className = `mb-4 md:mb-6 text-center p-3 md:p-4 rounded-lg md:rounded-xl font-bold text-xs md:text-sm transition-all block mx-2 md:mx-0 shadow-lg ${isError ? 'bg-red-900/80 text-red-100 border border-red-500/50' : 'bg-green-900/80 text-green-100 border border-green-500/50'}`;
            setTimeout(() => { box.classList.add('hidden'); }, 4000);
        }

        async function loadAlbumData() {
            try {
                const res = await fetchAuth(`${API_BASE_URL}/api/teachermon/album`);
                const data = await res.json();
                if (res.ok) {
                    globalAlbum = data.album;
                    albumCurrentPage = 1;
                    renderAlbum(); renderInventory(); updateTradeSelects(); updateArenaSelects();
                    if (currentUser && currentUser.isAdmin) renderAdminCardList();
                }
            } catch (e) { showAlert("Fehler beim Laden.", true); }
        }

        // Hilfsfunktion für Bilder/Icons der Karten
        function getCardGraphic(cardId) {
            const card = globalAlbum.find(c => c.id === cardId);
            if (!card) return '❓';
            if (card.img.startsWith('http')) return `<img src="${card.img}" class="w-8 h-8 rounded-md object-cover inline">`;
            return `<span class="text-xl">${card.img}</span>`;
        }
        function getCardName(cardId) {
            const card = globalAlbum.find(c => c.id === cardId);
            return card ? card.name : "Unbekannte Karte";
        }

        function getRarityStyles(rarity) {
            const styles = {
                common: { border: 'rarity-common', text: 'text-orange-400' },
                rare: { border: 'rarity-rare', text: 'text-blue-400' },
                premium: { border: 'rarity-premium', text: 'text-yellow-400' },
                episch: { border: 'rarity-episch', text: 'text-green-400' },
                legendaer: { border: 'rarity-legendaer', text: 'text-purple-400 drop-shadow-[0_0_5px_rgba(168,85,247,0.8)]' }
            };
            return styles[rarity] || styles.common;
        }

        // KARTEN HTML GENERATOR
        function createCardHTML(card, showLock = false, isInventory = false) {
            const rStyles = getRarityStyles(card.rarity);
            const lockClass = (showLock && !card.owned) ? 'card-locked' : '';
            const isItem = card.cardType === 'item' || card.cardType === 'event';

            let actionHtml = '';
            if (isInventory && card.duplicates > 0) {
                actionHtml = `<div class="absolute -top-2 -right-2 md:-top-3 md:-right-3 bg-red-600 border border-red-400 text-white rounded-full w-6 h-6 md:w-8 md:h-8 flex items-center justify-center font-black text-xs md:text-sm shadow-xl z-20">${card.duplicates + 1}</div>
                    <button onclick="sellCard('${card.id}')" class="mt-3 w-full bg-white/10 hover:bg-green-600/80 border border-white/20 text-white py-1.5 md:py-2 rounded-md md:rounded-lg text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all">Alle ${card.duplicates}x verkaufen</button>`;
            } else if (isInventory) {
                actionHtml = `<div class="mt-3 text-center text-[10px] md:text-xs text-gray-500 font-bold tracking-widest bg-black/20 py-1.5 rounded-md md:rounded-lg">Im Album</div>`;
            }

            let mediaHtml = card.img.startsWith('http')
                ? `<div class="w-full h-24 md:h-36 mb-2 md:mb-4 rounded-lg md:rounded-xl overflow-hidden border border-white/10 shadow-inner bg-black/50"><img src="${card.img}" class="w-full h-full object-cover object-top" loading="lazy"></div>`
                : `<div class="text-4xl md:text-6xl text-center mb-2 md:mb-4 pt-2 drop-shadow-md filter">${card.img || '❓'}</div>`;

            // STATS ODER EFFEKT TEXT
            let statsHtml = '';
            if (isItem) {
                statsHtml = `<div class="flex-grow bg-black/40 rounded-lg p-2 md:p-3 text-[10px] md:text-xs italic text-yellow-100 border border-yellow-500/30 text-center flex items-center justify-center shadow-inner">${card.effectText || card.skills || 'Kein Effekt'}</div>`;
            } else {
                if (!card.universe || card.universe === 'teachermon') {
                    statsHtml = `<div class="flex-grow bg-black/40 rounded-lg md:rounded-xl p-2 md:p-3 text-[9px] md:text-xs font-mono space-y-1 md:space-y-2 border border-white/5">
                        <div class="flex justify-between items-center"><span class="text-gray-400">☕</span> <span class="text-white font-bold">${card.kalterKaffee || 0}</span></div>
                        <div class="flex justify-between items-center"><span class="text-gray-400">😩</span> <span class="text-white font-bold">${card.gequaelt || 0}</span></div>
                        <div class="flex justify-between items-center"><span class="text-gray-400">🧠</span> <span class="text-white font-bold">${card.intelligenz || 0}</span></div>
                    </div>`;
                } else {
                    let customHtml = '';
                    if (card.customStats) {
                        for (let [key, val] of Object.entries(card.customStats)) {
                            customHtml += `<div class="flex justify-between items-center"><span class="text-gray-400 capitalize truncate pr-1">${key}</span> <span class="text-white font-bold">${val}</span></div>`;
                        }
                    }
                    statsHtml = `<div class="flex-grow bg-black/40 rounded-lg md:rounded-xl p-2 md:p-3 text-[9px] md:text-xs font-mono space-y-1 md:space-y-2 border border-white/5">${customHtml}</div>`;
                }
            }

            let skillHtml = '';
            if (!isItem) {
                skillHtml = `<div class="mt-2 md:mt-3 text-center w-full">
                                <span class="text-[8px] md:text-[10px] text-gray-500 uppercase font-bold tracking-wider">Skill</span><br>
                                <span class="text-[10px] md:text-xs text-purple-300 italic leading-snug line-clamp-3 overflow-hidden text-ellipsis block mx-auto break-words" title="${card.skills}">"${card.skills}"</span>
                             </div>`;
            }

            // Universums-Badge oben links
            let uniBadge = (card.universe && card.universe !== 'teachermon') ? `<span class="absolute top-2 left-2 bg-blue-600/80 backdrop-blur-md text-white text-[8px] px-2 py-0.5 rounded-full z-10 uppercase font-bold border border-white/20">${card.universe}</span>` : '';
            let typeBadge = isItem ? `<span class="absolute top-2 right-2 bg-yellow-600/80 backdrop-blur-md text-white text-[8px] px-2 py-0.5 rounded-full z-10 uppercase font-bold border border-white/20">${card.cardType}</span>` : '';

            return `<div class="card-wrapper ${lockClass} h-full"><div class="glass-panel p-3 md:p-5 rounded-xl md:rounded-2xl relative h-full flex flex-col ${rStyles.border} bg-black/40">${uniBadge}${typeBadge}${actionHtml}${mediaHtml}
                        <h3 class="font-bold text-sm md:text-lg text-center text-white mb-1 leading-tight">${card.name}</h3>
                        <div class="text-center mb-2 md:mb-4"><span class="text-[9px] md:text-xs uppercase font-black tracking-widest ${rStyles.text} bg-black/30 px-2 py-0.5 rounded-full">${card.rarity}</span></div>
                        ${statsHtml}
                        ${skillHtml}
                    </div></div>`;
        }

        // --- SEARCH & PAGINATION ---
        function handleSearch() { albumSearchQuery = document.getElementById('album-search').value.toLowerCase(); albumCurrentPage = 1; renderAlbum(); }
        function changePage(delta) { albumCurrentPage += delta; renderAlbum(); }
        function handleUniverseFilter() {
            selectedAlbumUniverse = document.getElementById('album-universe-filter').value;
            albumCurrentPage = 1;
            renderAlbum();
        }

        function renderAlbum() {
            const grid = document.getElementById('album-grid');
            grid.innerHTML = '';

            const filtered = globalAlbum.filter(c => {
                const matchesSearch = c.name.toLowerCase().includes(albumSearchQuery) || c.rarity.toLowerCase().includes(albumSearchQuery);
                const cardUniverse = c.universe || 'teachermon';
                const matchesUniverse = (selectedAlbumUniverse === 'all') || (cardUniverse === selectedAlbumUniverse);
                return matchesSearch && matchesUniverse;
            });

            const totalPages = Math.ceil(filtered.length / albumItemsPerPage) || 1;
            if (albumCurrentPage > totalPages) albumCurrentPage = totalPages;
            if (albumCurrentPage < 1) albumCurrentPage = 1;

            const start = (albumCurrentPage - 1) * albumItemsPerPage;
            const pagedCards = filtered.slice(start, start + albumItemsPerPage);

            document.getElementById('collection-progress').innerText = `${globalAlbum.filter(c => c.owned).length}/${globalAlbum.length} gesammelt`;
            document.getElementById('page-indicator').innerText = `Seite ${albumCurrentPage} / ${totalPages}`;
            document.getElementById('btn-prev-page').disabled = albumCurrentPage === 1;
            document.getElementById('btn-next-page').disabled = albumCurrentPage === totalPages;

            if (pagedCards.length === 0) {
                grid.innerHTML = '<div class="col-span-full text-center text-gray-500 py-10">Keine Karten in dieser Auswahl gefunden.</div>';
                return;
            }

            pagedCards.forEach(card => grid.innerHTML += createCardHTML(card, true, false));
        }

        function renderInventory() {
            const grid = document.getElementById('inventory-grid');
            grid.innerHTML = '';
            const ownedCards = globalAlbum.filter(c => {
                const isOwned = c.owned;
                const cardUniverse = c.universe || 'teachermon';
                const matchesUniverse = (selectedInventoryUniverse === 'all') || (cardUniverse === selectedInventoryUniverse);
                return isOwned && matchesUniverse;
            });

            if (ownedCards.length === 0) {
                grid.innerHTML = '<div class="col-span-full text-center py-10 text-gray-500 text-sm">Keine Karten in dieser Kategorie gefunden.</div>';
                return;
            }

            ownedCards.forEach(card => grid.innerHTML += createCardHTML(card, false, true));
        }

        // --- PACKS & VERKAUF ---
        async function claimDaily() { const btn = document.getElementById('btn-daily'); btn.disabled = true; try { const res = await fetchAuth(`${API_BASE_URL}/api/teachermon/pack/daily`, { method: 'POST' }); const data = await res.json(); if (res.ok) showPackModal([data.card], "🎁 Daily Pack!"); else showAlert(data.error, true); } catch (e) { } finally { btn.disabled = false; } }
        async function buyPack() {
            const universe = document.getElementById('pack-universe').value;
            const btn = document.getElementById('btn-buy'); btn.disabled = true;
            try { const res = await fetchAuth(`${API_BASE_URL}/api/teachermon/pack/buy`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ universe }) }); const data = await res.json(); if (res.ok) { updateBalanceDisplay(data.newBalance); showPackModal(data.cards, "🃏 Booster Pack!"); } else showAlert(data.error, true); } catch (e) { } finally { btn.disabled = false; }
        }
        async function buyMultiPacks() {
            const universe = document.getElementById('pack-universe').value;
            const btn = document.getElementById('btn-buy-multi'); btn.disabled = true;
            try { const res = await fetchAuth(`${API_BASE_URL}/api/teachermon/pack/buy-multi`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ universe }) }); const data = await res.json(); if (res.ok) { updateBalanceDisplay(data.newBalance); showPackModal(data.cards, "🚀 10x Packs!"); } else showAlert(data.error, true); } catch (e) { } finally { btn.disabled = false; }
        }
        async function sellCard(cardId) { try { const res = await fetchAuth(`${API_BASE_URL}/api/teachermon/sell`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cardId }) }); if (res.ok) { showAlert((await res.json()).message); await checkAuth(); } else showAlert((await res.json()).error, true); } catch (e) { } }
        async function sellAllDupes() { const btn = document.getElementById('btn-sell-all'); btn.disabled = true; try { const res = await fetchAuth(`${API_BASE_URL}/api/teachermon/sell-all`, { method: 'POST' }); if (res.ok) { showAlert((await res.json()).message); await checkAuth(); } else showAlert((await res.json()).error, true); } catch (e) { } finally { btn.disabled = false; } }

        function showPackModal(cards, title) {
            document.getElementById('modal-title').innerText = title;
            const container = document.getElementById('modal-cards'); container.innerHTML = '';
            cards.forEach((card, index) => {
                const rStyles = getRarityStyles(card.rarity);
                let mediaHtml = card.img.startsWith('http') ? `<img src="${card.img}" class="w-24 h-24 md:w-32 md:h-32 object-cover rounded-xl shadow-lg border border-white/20 mb-3 md:mb-4">` : `<div class="text-5xl md:text-7xl mb-3 md:mb-4 drop-shadow-xl filter">${card.img || '❓'}</div>`;
                container.innerHTML += `<div class="glass-panel p-4 md:p-6 rounded-xl md:rounded-2xl flex flex-col items-center justify-center w-36 h-52 md:w-56 md:h-72 reveal-anim ${rStyles.border} bg-black/80" style="animation-delay: ${index * 0.1}s">${mediaHtml}<h3 class="font-bold text-sm md:text-xl text-center text-white mb-2 leading-tight">${card.name}</h3><span class="text-[10px] md:text-xs uppercase font-black tracking-widest ${rStyles.text} bg-black/50 px-2 py-1 rounded-full border border-white/10">${card.rarity}</span></div>`;
            });
            document.getElementById('pack-modal').classList.remove('hidden');
        }
        function closeModal() { document.getElementById('pack-modal').classList.add('hidden'); loadAlbumData(); }

        // --- SATANSKREIS ---
        async function sacrificeCards() {
            const btn = document.getElementById('btn-sacrifice');
            const rarity = document.getElementById('sacrifice-rarity').value;
            btn.disabled = true;
            btn.innerHTML = '🔥 Opfere... 🔥';
            try {
                const res = await fetchAuth(`${API_BASE_URL}/api/teachermon/satanic-circle`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ rarityToSacrifice: rarity })
                });
                const data = await res.json();
                if (res.ok) {
                    showAlert(data.message);
                    showPackModal([data.summonedCard], "😈 Dämonische Beschwörung!");
                    await loadAlbumData();
                } else {
                    showAlert(data.error, true);
                }
            } catch (e) {
                showAlert("Die Geister antworten nicht.", true);
            } finally {
                btn.disabled = false;
                btn.innerHTML = '🔥 Beschwören 🔥';
            }
        }

        // --- TRADING ---
        function updateTradeSelects() {
            const selOffer = document.getElementById('trade-offer'); const selWant = document.getElementById('trade-want');
            const dupes = globalAlbum.filter(c => c.owned && c.duplicates > 0);
            selOffer.innerHTML = dupes.length > 0 ? '<option value="">-- Wähle doppelte Karte --</option>' : '<option value="">Keine doppelten Karten.</option>';
            dupes.forEach(c => selOffer.innerHTML += `<option value="${c.id}">${c.name} (${c.rarity}) - ${c.duplicates}x</option>`);
            selWant.innerHTML = '<option value="">-- Wähle Wunschkarte --</option>';
            globalAlbum.forEach(c => selWant.innerHTML += `<option value="${c.id}">${c.name} (${c.rarity})</option>`);
        }
        async function createTrade() {
            const o = document.getElementById('trade-offer').value; const w = document.getElementById('trade-want').value;
            if (!o || !w) return showAlert("Bitte wähle beide aus.", true);
            try { const res = await fetchAuth(`${API_BASE_URL}/api/teachermon/trades/create`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ offerCardId: o, wantCardId: w }) }); if (res.ok) { showAlert("Angebot aufgeben!"); await loadAlbumData(); loadTrades(); } else showAlert((await res.json()).error, true); } catch (e) { }
        }
        async function loadTrades() {
            const list = document.getElementById('trade-list'); list.innerHTML = '<div class="text-center text-gray-500 py-4 text-sm">Lade...</div>';
            try {
                const res = await fetchAuth(`${API_BASE_URL}/api/teachermon/trades`); const data = await res.json();
                if (data.trades.length === 0) return list.innerHTML = '<div class="glass-panel p-6 text-center text-gray-400 rounded-xl text-sm">Keine aktiven Angebote.</div>';
                list.innerHTML = '';
                data.trades.forEach(t => {
                    const isMyTrade = t.offererId === currentUser.userId;
                    const canAccept = !isMyTrade && globalAlbum.some(c => c.id === t.wantCardId && c.owned && c.duplicates > 0);
                    let btnHtml = isMyTrade ? `<button onclick="cancelTrade('${t._id}')" class="bg-red-900/50 hover:bg-red-600 text-red-200 px-3 py-2 rounded-lg text-xs font-bold w-full sm:w-auto mt-2 sm:mt-0">Abbrechen</button>` : canAccept ? `<button onclick="acceptTrade('${t._id}')" class="bg-green-600 hover:bg-green-500 text-white px-3 py-2 rounded-lg text-xs font-bold w-full sm:w-auto mt-2 sm:mt-0">Tauschen</button>` : `<div class="text-[10px] text-gray-500 border border-gray-700 px-2 py-1 rounded w-full sm:w-auto text-center mt-2 sm:mt-0">Fehlt dir doppelt</div>`;
                    const imgO = t.offerCard.img.startsWith('http') ? `<img src="${t.offerCard.img}" class="w-8 h-8 rounded-md object-cover inline">` : `<span class="text-2xl">${t.offerCard.img}</span>`;
                    const imgW = t.wantCard.img.startsWith('http') ? `<img src="${t.wantCard.img}" class="w-8 h-8 rounded-md object-cover inline">` : `<span class="text-2xl">${t.wantCard.img}</span>`;
                    list.innerHTML += `<div class="glass-panel p-3 md:p-4 rounded-xl flex flex-col sm:flex-row justify-between items-center sm:items-end gap-3 bg-black/40 border-l-2 border-green-500/50"><div class="flex items-center gap-2 md:gap-4 text-center sm:text-left w-full sm:w-auto justify-between sm:justify-start"><div class="bg-black/50 p-2 rounded-lg border border-white/5 flex-1 sm:flex-none"><span class="block text-[9px] text-gray-500 uppercase tracking-widest mb-1">Bietet</span><div class="flex items-center justify-center sm:justify-start gap-2">${imgO} <span class="text-xs md:text-sm font-bold truncate max-w-[80px] md:max-w-none">${t.offerCard.name}</span></div></div><span class="text-gray-600 font-black">⇄</span><div class="bg-black/50 p-2 rounded-lg border border-white/5 flex-1 sm:flex-none"><span class="block text-[9px] text-gray-500 uppercase tracking-widest mb-1">Sucht</span><div class="flex items-center justify-center sm:justify-start gap-2">${imgW} <span class="text-xs md:text-sm font-bold truncate max-w-[80px] md:max-w-none">${t.wantCard.name}</span></div></div></div><div class="flex flex-col items-center sm:items-end w-full sm:w-auto"><span class="text-[10px] md:text-xs text-gray-400 font-mono mb-1">@${t.offererUsername}</span>${btnHtml}</div></div>`;
                });
            } catch (e) { }
        }
        async function acceptTrade(id) { try { await fetchAuth(`${API_BASE_URL}/api/teachermon/trades/accept/${id}`, { method: 'POST' }); await loadAlbumData(); loadTrades(); } catch (e) { } }
        async function cancelTrade(id) { try { await fetchAuth(`${API_BASE_URL}/api/teachermon/trades/${id}`, { method: 'DELETE' }); await loadAlbumData(); loadTrades(); } catch (e) { } }

        // --- ARENA ---
        function toggleArenaView(view) {
            if (view === 'open') {
                document.getElementById('btn-arena-open').className = "flex-1 sm:flex-none px-4 py-2 rounded text-sm font-bold bg-red-600 text-white shadow-md transition-all";
                document.getElementById('btn-arena-history').className = "flex-1 sm:flex-none px-4 py-2 rounded text-sm font-bold text-gray-400 hover:text-white transition-all";
                document.getElementById('battle-list').classList.remove('hidden');
                document.getElementById('battle-history-list').classList.add('hidden');
            } else {
                document.getElementById('btn-arena-history').className = "flex-1 sm:flex-none px-4 py-2 rounded text-sm font-bold bg-gray-700 text-white shadow-md transition-all";
                document.getElementById('btn-arena-open').className = "flex-1 sm:flex-none px-4 py-2 rounded text-sm font-bold text-gray-400 hover:text-white transition-all";
                document.getElementById('battle-list').classList.add('hidden');
                document.getElementById('battle-history-list').classList.remove('hidden');
            }
        }

        function updateArenaSelects() {
            const selArena = document.getElementById('arena-card');
            const battleReady = globalAlbum.filter(c => c.owned && (!c.cardType || (c.cardType !== 'item' && c.cardType !== 'event')));
            selArena.innerHTML = battleReady.length > 0 ? '<option value="">-- Wähle Kämpfer --</option>' : '<option value="">Du hast keine kampffähigen Karten.</option>';
            battleReady.forEach(c => selArena.innerHTML += `<option value="${c.id}">${c.name} (${c.rarity}) [${c.universe || 'teachermon'}]</option>`);
            updateArenaStatOptions();
        }

        function updateArenaStatOptions() {
            const selCard = document.getElementById('arena-card').value;
            const selStat = document.getElementById('arena-stat');
            selStat.innerHTML = '';

            if (!selCard) {
                selStat.innerHTML = '<option value="">Wähle erst eine Karte...</option>';
                return;
            }

            const card = globalAlbum.find(c => c.id === selCard);
            if (!card.universe || card.universe === 'teachermon') {
                selStat.innerHTML += `<option value="kalterKaffee">☕ Kalter Kaffee / Tag</option>`;
                selStat.innerHTML += `<option value="gequaelt">😩 Gequälte Schüler</option>`;
                selStat.innerHTML += `<option value="intelligenz">🧠 Intelligenz</option>`;
            } else if (card.customStats) {
                for (let key of Object.keys(card.customStats)) {
                    selStat.innerHTML += `<option value="${key}">${key.charAt(0).toUpperCase() + key.slice(1)}</option>`;
                }
            } else {
                selStat.innerHTML = '<option value="">Diese Karte hat keine Werte.</option>';
            }
        }

        async function createBattle() {
            const cardId = document.getElementById('arena-card').value; const stat = document.getElementById('arena-stat').value;
            if (!cardId || !stat) return showAlert("Wähle Kämpfer und Kategorie.", true);
            try { const res = await fetchAuth(`${API_BASE_URL}/api/teachermon/battles/create`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cardId, stat }) }); if (res.ok) { showAlert((await res.json()).message); await loadAlbumData(); loadBattles(); } else showAlert((await res.json()).error, true); } catch (e) { }
        }

        async function loadBattles() {
            const list = document.getElementById('battle-list'); list.innerHTML = '<div class="text-center text-gray-500 text-sm col-span-full">Lade...</div>';
            try {
                const res = await fetchAuth(`${API_BASE_URL}/api/teachermon/battles`); const data = await res.json();
                if (data.battles.length === 0) return list.innerHTML = '<div class="glass-panel p-6 text-center text-gray-400 rounded-xl text-sm col-span-full">Keine Kämpfe aktiv.</div>';
                list.innerHTML = '';

                const standardStatNames = { 'kalterKaffee': '☕ Kaffee/Tag', 'gequaelt': '😩 Gequälte Schüler', 'intelligenz': '🧠 Intelligenz' };

                data.battles.forEach(b => {
                    const isMyBattle = b.challengerId === currentUser.userId;
                    const statName = standardStatNames[b.stat] || b.stat.toUpperCase();
                    const uniTag = b.universe ? `<span class="bg-blue-600 px-2 py-0.5 rounded-full text-[8px] ml-2 uppercase">${b.universe}</span>` : '';

                    const btn = isMyBattle ? `<div class="bg-black/30 px-3 py-2 rounded text-xs text-gray-500 font-bold border border-white/5">Wartet auf Gegner...</div>` : `<button onclick="openBattleModal('${b._id}', '${b.stat}', '${b.universe || 'teachermon'}')" class="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-red-500/30 w-full transition-colors">Herausfordern!</button>`;
                    list.innerHTML += `<div class="glass-panel p-4 rounded-xl flex flex-col justify-between bg-black/40 border-l-4 border-red-500"><div class="mb-3"><span class="text-xs text-red-400 font-bold uppercase tracking-widest">Gegner</span><div class="text-lg font-bold text-white flex items-center">@${b.challengerUsername} ${uniTag}</div></div><div class="mb-4"><span class="text-[10px] text-gray-500 uppercase block mb-1">Kategorie</span><div class="bg-black/50 px-3 py-2 rounded-lg border border-white/10 text-sm font-mono text-purple-300">${statName}</div></div>${btn}</div>`;
                });
            } catch (e) { }
        }

        // LÄDT DIE KAMPF-HISTORIE
        async function loadBattleHistory() {
            const list = document.getElementById('battle-history-list');
            try {
                const res = await fetchAuth(`${API_BASE_URL}/api/teachermon/battles/history`);
                const data = await res.json();
                
                if (!data.history || data.history.length === 0) {
                    list.innerHTML = '<div class="glass-panel p-6 text-center text-gray-400 rounded-xl text-sm">Noch keine Kämpfe bestritten.</div>';
                    return;
                }

                list.innerHTML = '';
                const standardStatNames = { 'kalterKaffee': '☕ Kaffee', 'gequaelt': '😩 Opfer', 'intelligenz': '🧠 IQ' };

                data.history.forEach(b => {
                    // Herausfinden, wer ich bin und wer der Gegner
                    const isChallenger = b.challengerId === currentUser.userId;
                    
                    const myCardId = isChallenger ? b.challengerCardId : b.acceptorCardId;
                    const oppCardId = isChallenger ? b.acceptorCardId : b.challengerCardId;
                    const oppName = isChallenger ? b.acceptorUsername : b.challengerUsername;

                    // Wer hat gewonnen?
                    let statusColor = "border-gray-500";
                    let statusText = "UNENTSCHIEDEN";
                    
                    if (b.winnerId === null) {
                        statusColor = "border-gray-500";
                        statusText = "UNENTSCHIEDEN";
                    } else if (b.winnerId === currentUser.userId) {
                        statusColor = "border-green-500";
                        statusText = "GEWONNEN";
                    } else {
                        statusColor = "border-red-500";
                        statusText = "VERLOREN";
                    }

                    const statName = standardStatNames[b.stat] || b.stat.toUpperCase();
                    const dateStr = new Date(b.resolvedAt).toLocaleDateString('de-DE', {day: '2-digit', month: '2-digit', hour: '2-digit', minute:'2-digit'});

                    // HTML Aufbau
                    list.innerHTML += `
                    <div class="glass-panel p-3 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-3 bg-black/40 border-l-4 ${statusColor}">
                        
                        <div class="flex items-center gap-4 w-full sm:w-auto">
                            <div class="text-center w-20">
                                <div class="text-xs text-gray-400 mb-1">Du</div>
                                <div class="bg-black/50 p-1 rounded-lg border border-white/10 flex flex-col items-center justify-center">
                                    ${getCardGraphic(myCardId)}
                                    <span class="text-[10px] truncate max-w-[70px] mt-1">${getCardName(myCardId)}</span>
                                </div>
                            </div>

                            <div class="text-center font-black text-gray-600 text-lg">VS</div>

                            <div class="text-center w-20">
                                <div class="text-xs text-red-400 mb-1 truncate">@${oppName}</div>
                                <div class="bg-black/50 p-1 rounded-lg border border-white/10 flex flex-col items-center justify-center">
                                    ${getCardGraphic(oppCardId)}
                                    <span class="text-[10px] truncate max-w-[70px] mt-1">${getCardName(oppCardId)}</span>
                                </div>
                            </div>
                        </div>

                        <div class="flex flex-col items-center sm:items-end w-full sm:w-auto">
                            <span class="text-[10px] font-bold tracking-widest ${statusColor.replace('border-', 'text-')}">${statusText}</span>
                            <span class="text-xs text-purple-300 font-mono mt-1">${statName}</span>
                            <span class="text-[9px] text-gray-500 mt-2">${dateStr}</span>
                        </div>
                    </div>`;
                });
            } catch (e) {
                list.innerHTML = '<div class="text-center text-red-500 py-4 text-sm">Fehler beim Laden der Historie.</div>';
            }
        }

        function openBattleModal(battleId, stat, requiredUniverse) {
            document.getElementById('battle-modal-id').value = battleId;
            const sel = document.getElementById('battle-accept-card');

            const standardStatNames = { 'kalterKaffee': '☕ Kaffee/Tag', 'gequaelt': '😩 Gequälte Schüler', 'intelligenz': '🧠 Intelligenz' };
            document.getElementById('battle-modal-desc').innerText = `Es wird gekämpft um: ${standardStatNames[stat] || stat.toUpperCase()} (Nur Universum: ${requiredUniverse})`;

            const ownedValid = globalAlbum.filter(c => c.owned && (c.universe || 'teachermon') === requiredUniverse && c.cardType !== 'item' && c.cardType !== 'event');

            sel.innerHTML = ownedValid.length > 0 ? '<option value="">-- Wähle Kämpfer --</option>' : '<option value="">Du hast keine passende Karte für dieses Universum.</option>';

            ownedValid.forEach(c => {
                let statVal = 0;
                if (requiredUniverse === 'teachermon') statVal = c[stat];
                else statVal = c.customStats ? c.customStats[stat] : 0;
                sel.innerHTML += `<option value="${c.id}">${c.name} (${c.rarity}) - Wert: ${statVal || 0}</option>`;
            });

            document.getElementById('battle-modal').classList.remove('hidden');
        }
        function closeBattleModal() { document.getElementById('battle-modal').classList.add('hidden'); }
        async function confirmBattle() {
            const battleId = document.getElementById('battle-modal-id').value; const cardId = document.getElementById('battle-accept-card').value;
            if (!cardId) return alert("Wähle eine Karte!");
            try { const res = await fetchAuth(`${API_BASE_URL}/api/teachermon/battles/accept/${battleId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cardId }) }); const data = await res.json(); closeBattleModal(); if (res.ok) { showAlert(data.message); await loadAlbumData(); loadBattles(); loadBattleHistory(); } else showAlert(data.error, true); } catch (e) { }
        }

        // --- ADMIN ---
        function renderAdminCardList() {
            const list = document.getElementById('admin-card-list'); const search = document.getElementById('admin-search').value.toLowerCase(); list.innerHTML = '';
            const filtered = globalAlbum.filter(c => c.name.toLowerCase().includes(search) || c.rarity.toLowerCase().includes(search));
            if (filtered.length === 0) return list.innerHTML = '<div class="text-gray-500 text-sm">Nichts gefunden.</div>';
            filtered.forEach(card => {
                const img = card.img.startsWith('http') ? `<img src="${card.img}" class="w-8 h-8 rounded-md object-cover">` : `<span class="text-2xl">${card.img}</span>`;
                list.innerHTML += `<div class="flex justify-between items-center bg-black/30 p-3 rounded-lg border border-white/5"><div class="flex items-center gap-3">${img}<div><div class="font-bold text-sm text-white">${card.name}</div><div class="text-[10px] text-gray-400 uppercase tracking-widest">${card.rarity} | ${card.universe || 'Teachermon'}</div></div></div><button onclick="deleteCardAdmin('${card.id}')" class="bg-red-900/80 hover:bg-red-700 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors">Löschen</button></div>`;
            });
        }

        async function loadUniverses() {
            try {
                const res = await fetchAuth(`${API_BASE_URL}/api/teachermon/universes`);
                if (res.ok) {
                    const data = await res.json();
                    globalUniverses = data.universes;
                    renderUniverseDropdowns();
                }
            } catch (e) { console.error("Fehler beim Laden der Universen."); }
        }

        function renderUniverseDropdowns() {
            const shopSelect = document.getElementById('pack-universe');
            const adminSelect = document.getElementById('ac-universe');
            const albumFilterSelect = document.getElementById('album-universe-filter');
            const invFilterSelect = document.getElementById('inventory-universe-filter');
            const listHtml = document.getElementById('admin-universe-list');

            if (shopSelect) shopSelect.innerHTML = '';
            if (adminSelect) adminSelect.innerHTML = '';
            if (albumFilterSelect) albumFilterSelect.innerHTML = '<option value="all">🌌 Alle Universen</option>';
            if (invFilterSelect) invFilterSelect.innerHTML = '<option value="all">🎒 Alle Besessenen (Gesamt)</option>';
            if (listHtml) listHtml.innerHTML = '';

            globalUniverses.forEach(uni => {
                const optionHTML = `<option value="${uni.id}">${uni.name}</option>`;
                if (shopSelect) shopSelect.innerHTML += optionHTML;
                if (adminSelect) adminSelect.innerHTML += optionHTML;
                if (albumFilterSelect) albumFilterSelect.innerHTML += optionHTML;
                if (invFilterSelect) invFilterSelect.innerHTML += optionHTML;

                if (listHtml) {
                    const isProtected = uni.id === 'teachermon';
                    const delBtn = isProtected ? '' : `<button onclick="deleteUniverse('${uni.id}')" class="text-red-500 hover:text-red-400 text-xs font-bold">Löschen</button>`;
                    listHtml.innerHTML += `<div class="flex justify-between items-center bg-black/30 p-2 rounded border border-white/5"><div class="text-sm font-bold text-white">${uni.name} <span class="text-[10px] text-gray-500 font-mono">(${uni.id})</span></div>${delBtn}</div>`;
                }
            });

            renderDynamicStatInputs();
        }

        function handleInventoryUniverseFilter() {
            selectedInventoryUniverse = document.getElementById('inventory-universe-filter').value;
            renderInventory();
        }

        function renderDynamicStatInputs() {
            const container = document.getElementById('dynamic-stats-container');
            const selectedUniId = document.getElementById('ac-universe').value;
            const cardType = document.getElementById('ac-type').value;

            container.innerHTML = '';

            if (cardType === 'item' || cardType === 'event') {
                container.innerHTML = '<div class="col-span-full text-center text-gray-500 text-xs py-2">Sonderkarten haben keine Kampfwerte. Nutze das "Effekt Text" Feld.</div>';
                return;
            }

            const uni = globalUniverses.find(u => u.id === selectedUniId);
            if (!uni || !uni.stats || uni.stats.length === 0) {
                container.innerHTML = '<div class="col-span-full text-center text-red-400 text-xs py-2">Dieses Universum hat keine Stats definiert.</div>';
                return;
            }

            uni.stats.forEach(stat => {
                container.innerHTML += `
            <div>
                <label class="block text-[10px] md:text-xs text-gray-400 mb-1 truncate capitalize capitalize-first">${stat}</label>
                <input type="number" data-stat-name="${stat}" value="0" class="dynamic-stat-input input-holo w-full p-2 rounded-lg text-sm">
            </div>
        `;
            });
        }

        async function createUniverse(e) {
            e.preventDefault();
            const payload = {
                id: document.getElementById('au-id').value,
                name: document.getElementById('au-name').value,
                statsString: document.getElementById('au-stats').value
            };
            try {
                const res = await fetchAuth(`${API_BASE_URL}/api/teachermon/admin/universes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                const data = await res.json();
                if (res.ok) { showAlert(data.message); document.getElementById('admin-universe-form').reset(); loadUniverses(); }
                else showAlert(data.error, true);
            } catch (e) { }
        }

        async function deleteUniverse(id) {
            if (!confirm("Sicher? Alte Karten dieses Universums bleiben in der Datenbank, können aber nicht mehr gezogen werden.")) return;
            try {
                const res = await fetchAuth(`${API_BASE_URL}/api/teachermon/admin/universes/${id}`, { method: 'DELETE' });
                if (res.ok) { showAlert("Universum gelöscht"); loadUniverses(); }
            } catch (e) { }
        }

        async function createCard(e) {
            e.preventDefault();

            const universe = document.getElementById('ac-universe').value;
            const cardType = document.getElementById('ac-type').value;

            const payload = {
                name: document.getElementById('ac-name').value,
                rarity: document.getElementById('ac-rarity').value,
                universe: universe,
                cardType: cardType,
                effectText: document.getElementById('ac-skill').value,
                skills: document.getElementById('ac-skill').value,
                img: document.getElementById('ac-img').value,
                stats: {} 
            };

            const statInputs = document.querySelectorAll('.dynamic-stat-input');
            statInputs.forEach(input => {
                const statName = input.getAttribute('data-stat-name');
                const value = parseInt(input.value) || 0;

                if (universe === 'teachermon') {
                    payload[statName] = value;
                } else {
                    payload.stats[statName] = value;
                }
            });

            try {
                const res = await fetchAuth(`${API_BASE_URL}/api/teachermon/admin/cards`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                const data = await res.json();
                if (res.ok) {
                    showAlert(data.message);
                    document.getElementById('ac-name').value = '';
                    document.getElementById('ac-skill').value = '';
                    document.getElementById('ac-img').value = '';
                    loadAlbumData();
                }
                else showAlert(data.error, true);
            } catch (e) { }
        }

        async function deleteCardAdmin(id) {
            if (!confirm("ACHTUNG! Willst du diese Karte wirklich löschen? Alle Besitzer bekommen ihr Geld erstattet.")) return;
            try { const res = await fetchAuth(`${API_BASE_URL}/api/teachermon/admin/cards/${id}`, { method: 'DELETE' }); if (res.ok) { showAlert((await res.json()).message); loadAlbumData(); } else showAlert((await res.json()).error, true); } catch (e) { }
        }
    