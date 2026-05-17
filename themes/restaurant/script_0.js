
        const API_URL = 'https://api.limazon.v6.rocks';
        let menuData = [];
        let cart = {}; // { itemId: quantity }

        document.addEventListener('DOMContentLoaded', () => {
            loadMenu();
            loadStatus();
        });

        // --- DATA ---
        async function loadMenu() {
            try {
                const res = await fetch(`${API_URL}/api/restaurant/menu`, { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    menuData = data.menu;
                    renderMenu('all');
                }
            } catch (e) { console.error(e); }
        }

        async function loadStatus() {
            try {
                // 1. User Daten laden (Guthaben)
                const resUser = await fetch(`${API_URL}/api/auth/me`, { credentials: 'include' });
                
                if (resUser.ok) {
                    const u = await resUser.json();
                    
                    // KORREKTUR: min 2, max 2 (damit es immer z.B. "10,50" ist)
                    const moneyText = '$ ' + u.balance.toLocaleString('de-DE', {
                        minimumFractionDigits: 2, 
                        maximumFractionDigits: 2 
                    });
                    
                    // Alle möglichen IDs updaten
                    const idsToUpdate = ['mobile-balance', 'desktop-balance', 'user-balance'];
                    
                    idsToUpdate.forEach(id => {
                        const el = document.getElementById(id);
                        if (el) {
                            el.innerText = moneyText;
                            el.classList.remove('text-red-500'); 
                            el.classList.add('text-green-400');
                        }
                    });
                } else {
                    // Nicht eingeloggt
                    ['mobile-balance', 'desktop-balance'].forEach(id => {
                        const el = document.getElementById(id);
                        if (el) {
                            el.innerText = "Login?";
                            el.className = "font-mono font-bold text-red-500 text-xs";
                        }
                    });
                }

                // 2. Energie Status laden
                const resStat = await fetch(`${API_URL}/api/restaurant/status`, { credentials: 'include' });
                if (resStat.ok) {
                    const d = await resStat.json();
                    const enEl = document.getElementById('energy-text');
                    const barEl = document.getElementById('energy-bar');
                    const bubbleEl = document.getElementById('user-energy');

                    if (enEl) enEl.innerText = d.energy + '%';
                    if (barEl) barEl.style.width = d.energy + '%';
                    
                    if (bubbleEl) {
                        bubbleEl.innerText = d.energy + '%';
                        if (d.energy < 30) {
                            bubbleEl.className = "w-10 h-10 rounded-full bg-red-900/20 flex items-center justify-center font-mono font-bold text-xs text-red-400 border border-red-500/50";
                        } else {
                            bubbleEl.className = "w-10 h-10 rounded-full bg-green-900/20 flex items-center justify-center font-mono font-bold text-xs text-green-400 border border-green-500/50";
                        }
                    }
                }

            } catch (e) {
                console.error("Status Error:", e);
            }
        }
        
        async function loadHistory() {
            const list = document.getElementById('history-list');
            list.innerHTML = '<div class="py-10 text-center text-gray-500">Lade...</div>';
            try {
                const res = await fetch(`${API_URL}/api/restaurant/history`, { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    if (data.history.length === 0) { list.innerHTML = '<div class="py-10 text-center text-gray-500">Keine Einträge.</div>'; return; }

                    list.innerHTML = data.history.map(h => {
                        const date = new Date(h.date).toLocaleString('de-DE', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                        return `
                        <div class="glass-panel p-4 rounded-xl flex justify-between items-center">
                            <div>
                                <div class="text-xs text-gray-500 mb-1">${date}</div>
                                <div class="text-sm font-bold text-white">${h.items.map(i => i.name).join(', ')}</div>
                            </div>
                            <div class="text-right">
                                <div class="font-mono text-red-400 font-bold">-$${h.cost.toFixed(2)}</div>
                                <div class="text-[10px] text-yellow-500 font-bold">+${h.energyGained}% Energy</div>
                            </div>
                        </div>`;
                    }).join('');
                }
            } catch (e) { list.innerHTML = '<div class="text-red-500">Fehler.</div>'; }
        }

        // --- UI ---
        function switchView(view) {
            // Update Desktop Nav
            document.getElementById('nav-menu').className = view === 'menu' ? "px-4 py-2 rounded-lg text-sm font-bold transition bg-pink-600 text-white shadow-lg" : "px-4 py-2 rounded-lg text-sm font-bold transition bg-white/5 text-gray-400 hover:text-white";
            document.getElementById('nav-history').className = view === 'history' ? "px-4 py-2 rounded-lg text-sm font-bold transition bg-pink-600 text-white shadow-lg" : "px-4 py-2 rounded-lg text-sm font-bold transition bg-white/5 text-gray-400 hover:text-white";

            // Update Mobile Nav
            document.getElementById('mob-nav-menu').className = view === 'menu' ? "flex-1 py-2 rounded-lg text-sm font-bold text-center bg-pink-600 text-white shadow" : "flex-1 py-2 rounded-lg text-sm font-bold text-center text-gray-400";
            document.getElementById('mob-nav-history').className = view === 'history' ? "flex-1 py-2 rounded-lg text-sm font-bold text-center bg-pink-600 text-white shadow" : "flex-1 py-2 rounded-lg text-sm font-bold text-center text-gray-400";

            // Content
            if (view === 'menu') {
                document.getElementById('view-menu').classList.remove('hidden');
                document.getElementById('view-history').classList.add('hidden');
            } else {
                document.getElementById('view-menu').classList.add('hidden');
                document.getElementById('view-history').classList.remove('hidden');
                loadHistory();
            }
        }

        function filterMenu(type, btn) {
            document.querySelectorAll('.cat-btn').forEach(b => b.className = "cat-btn inactive-tab border px-4 py-2 rounded-lg text-xs font-bold uppercase whitespace-nowrap transition hover:text-white border-white/10");
            btn.className = "cat-btn active-tab border px-4 py-2 rounded-lg text-xs font-bold uppercase whitespace-nowrap transition shadow-lg shadow-pink-900/30";
            renderMenu(type);
        }

        function renderMenu(type) {
            const grid = document.getElementById('menu-grid');
            const items = type === 'all' ? menuData : menuData.filter(i => i.type === type);

            grid.innerHTML = items.map(item => {
                const qty = cart[item.id] || 0;
                const activeClass = qty > 0 ? 'border-pink-500 bg-pink-500/5' : 'border-white/5 bg-white/5';

                return `
                <div class="menu-card rounded-xl p-4 border ${activeClass} flex gap-4">
                    <div class="text-4xl w-16 h-16 rounded-lg bg-black/40 flex items-center justify-center shadow-inner border border-white/5">
                        ${item.icon}
                    </div>
                    <div class="flex-grow flex flex-col justify-between">
                        <div class="flex justify-between items-start">
                            <div>
                                <h3 class="font-bold text-white text-lg leading-tight">${item.name}</h3>
                                <p class="text-[10px] text-gray-500">${item.desc}</p>
                            </div>
                            <div class="text-right">
                                <div class="font-mono font-bold text-pink-400">$${item.price.toFixed(0)}</div>
                                <div class="text-[10px] text-yellow-600 font-bold">⚡ ${item.energy}%</div>
                            </div>
                        </div>
                        
                        <div class="flex justify-end mt-2">
                            <div class="flex items-center bg-black/50 rounded-lg border border-white/10">
                                <button onclick="changeQty('${item.id}', -1)" class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded-l-lg transition font-bold">-</button>
                                <span class="w-8 text-center font-mono text-sm font-bold text-white" id="qty-${item.id}">${qty}</span>
                                <button onclick="changeQty('${item.id}', 1)" class="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded-r-lg transition font-bold">+</button>
                            </div>
                        </div>
                    </div>
                </div>`;
            }).join('');
        }

        // --- CART LOGIC ---
        function changeQty(id, delta) {
            if (!cart[id]) cart[id] = 0;
            cart[id] += delta;
            if (cart[id] <= 0) delete cart[id];

            const el = document.getElementById(`qty-${id}`);
            if (el) {
                el.innerText = cart[id] || 0;
                const card = el.closest('.menu-card');
                if (cart[id]) {
                    card.classList.remove('border-white/5', 'bg-white/5');
                    card.classList.add('border-pink-500', 'bg-pink-500/5');
                } else {
                    card.classList.add('border-white/5', 'bg-white/5');
                    card.classList.remove('border-pink-500', 'bg-pink-500/5');
                }
            }
            updateCartUI();
        }

        function updateCartUI() {
            let total = 0;
            let count = 0;
            let itemsHtml = "";

            for (const [id, qty] of Object.entries(cart)) {
                const item = menuData.find(i => i.id === id);
                if (item) {
                    total += item.price * qty;
                    count += qty;
                    itemsHtml += `
                    <div class="flex justify-between items-center text-sm py-1 border-b border-white/5 last:border-0">
                        <div class="text-gray-300">${qty}x ${item.name}</div>
                        <div class="font-mono text-white">$${(item.price * qty).toFixed(2)}</div>
                    </div>`;
                }
            }

            // Desktop Sidebar
            const dList = document.getElementById('desktop-cart-list');
            if (dList) dList.innerHTML = count > 0 ? itemsHtml : '<div class="text-sm text-gray-500 text-center py-4">Wähle Gerichte aus.</div>';
            const dTotal = document.getElementById('desktop-cart-total');
            if (dTotal) dTotal.innerText = '$ ' + total.toLocaleString('de-DE', { minimumFractionDigits: 2 });
            const dBtn = document.getElementById('desktop-order-btn');
            if (dBtn) dBtn.disabled = count === 0;

            // Mobile Bar
            const mBar = document.getElementById('mobile-cart');
            const mTotal = document.getElementById('mobile-cart-total');
            const mCount = document.getElementById('mobile-cart-count');

            if (mTotal) mTotal.innerText = '$ ' + total.toLocaleString('de-DE', { minimumFractionDigits: 2 });
            if (mCount) mCount.innerText = count;

            if (mBar) {
                if (count > 0) mBar.classList.remove('translate-y-full');
                else mBar.classList.add('translate-y-full');
            }
        }

        async function placeOrder() {
            let itemIds = [];
            for (const [id, qty] of Object.entries(cart)) {
                for (let i = 0; i < qty; i++) itemIds.push(id);
            }

            const btns = [document.getElementById('desktop-order-btn'), document.getElementById('mobile-order-btn')];
            btns.forEach(b => { if (b) { b.disabled = true; b.innerText = "Sende..."; } });

            try {
                const res = await fetch(`${API_URL}/api/restaurant/order`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ itemIds }), credentials: 'include'
                });
                const d = await res.json();

                if (res.ok) {
                    alert(d.message);
                    cart = {};
                    renderMenu(document.querySelector('.cat-btn.active-tab').innerText === 'Alle' ? 'all' : 'burger');
                    updateCartUI();
                    loadStatus();
                } else { alert(d.error); }
            } catch (e) { alert("Verbindungsfehler"); }

            btns.forEach(b => {
                if (b) {
                    b.disabled = false;
                    if (b.id === 'mobile-order-btn') b.innerHTML = 'BESTELLEN (<span id="mobile-cart-count">0</span>)';
                    else b.innerText = "KOSTENPFLICHTIG BESTELLEN";
                }
            });
            updateCartUI();
        }
    