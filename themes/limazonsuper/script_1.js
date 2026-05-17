
        // --- CONFIG & STATE ---
        const API_URL = 'https://api.limazon.v6.rocks/api';
        
        // Globale Variablen
        let products = [];
        let cart = [];
        let loggedInUser = null;
        let currentPage = 1;
        const itemsPerPage = 8;
        let filteredProducts = [];
        let inventoryData = []; // Zwischenspeicher für Inventar
        
        // Timer IDs
        let stonkInterval = null;
        let auctionInterval = null;
        
        // Temp Data
        let currentSellProductId = null;
        let currentAuctionProductId = null;
        let activeAuctionId = null;

        // --- CORE UTILS ---
        window.setLoading = (btnId, isLoading) => {
            const btn = document.getElementById(btnId);
            if(!btn) return;
            const spinner = btn.querySelector('.spinner') || btn.querySelector('.animate-spin');
            
            if(isLoading) {
                btn.disabled = true;
                if(spinner) spinner.classList.remove('hidden');
            } else {
                btn.disabled = false;
                if(spinner) spinner.classList.add('hidden');
            }
        };

        window.showToast = function(msg, type = 'info') {
            const el = document.getElementById('toast-container');
            el.textContent = msg;
            el.className = 'toast show shadow-lg font-medium text-sm'; 
            el.style.backgroundColor = type === 'error' ? '#ef4444' : (type === 'success' ? '#10b981' : '#333');
            setTimeout(() => el.classList.remove('show'), 3000);
        };

        async function apiCall(endpoint, options = {}) {
            options.credentials = 'include';
            try {
                const res = await fetch(`${API_URL}${endpoint}`, options);
                const isJson = res.headers.get('content-type')?.includes('application/json');
                const data = isJson ? await res.json() : null;
                if (!res.ok) throw new Error(data?.error || data?.message || `Fehler ${res.status}`);
                return data;
            } catch (err) {
                console.error(err);
                throw err;
            }
        }

        // --- AUTH & USER ---
        window.checkLogin = async function() {
            try {
                const user = await apiCall('/auth/me');
                window.updateUserInfo(user);
            } catch { window.updateUserInfo(null); }
        };

        window.updateUserInfo = function(user) {
            loggedInUser = user;
            const info = document.getElementById('user-info');
            const btns = document.getElementById('auth-buttons');
            const acts = document.getElementById('user-actions');
            const admin = document.getElementById('admin-toolbar');
            
            const balance = user && user.balance !== undefined ? user.balance.toFixed(2) : '0.00';
            const tokens = user && user.tokens !== undefined ? user.tokens : '0';
            const name = user && user.username ? user.username : 'Gast';

            document.getElementById('customer-name').textContent = name;
            document.getElementById('user-balance').textContent = balance;
            document.getElementById('account-tokens').textContent = tokens;
            document.getElementById('account-balance').textContent = balance;
            document.getElementById('account-username').textContent = name;

            if (user) {
                document.getElementById('user-balance-display').classList.remove('hidden');
                info.classList.remove('hidden');
                btns.classList.add('hidden');
                acts.classList.remove('hidden');
                if(user.isAdmin) admin.classList.remove('hidden'); else admin.classList.add('hidden');
                
                const chk = document.getElementById('account-infinity-money');
                const lck = document.getElementById('infinity-money-unlock-info');
                chk.checked = user.infinityMoney;
                if(user.isAdmin || user.unlockedInfinityMoney) { chk.disabled = false; lck.classList.add('hidden'); }
                else { chk.disabled = true; lck.classList.remove('hidden'); }

            } else {
                info.classList.add('hidden');
                btns.classList.remove('hidden');
                acts.classList.add('hidden');
                admin.classList.add('hidden');
            }
        };

        // --- ACCOUNT SETTINGS (FIXED) ---
        window.updateAccountSettings = async () => {
            const infMoney = document.getElementById('account-infinity-money').checked;
            try {
                const res = await apiCall('/account/settings', {
                    method: 'PATCH',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ infinityMoney: infMoney })
                });
                window.showToast(res.message || "Gespeichert", 'success');
                if(res.user) window.updateUserInfo(res.user);
            } catch(e) {
                window.showToast(e.message, 'error');
            }
        };

        window.openAuthModal = (mode) => {
            document.getElementById('auth-modal').classList.remove('hidden');
            document.getElementById('auth-modal-title').textContent = mode === 'login' ? 'Login' : 'Registrieren';
            const btn = document.getElementById('auth-submit-button');
            if(btn.querySelector('.btn-text')) btn.querySelector('.btn-text').textContent = mode === 'login' ? 'Login' : 'Registrieren';
            window.currentAuthMode = mode;
        };
        window.closeAuthModal = () => document.getElementById('auth-modal').classList.add('hidden');
        window.switchAuthMode = () => window.openAuthModal(window.currentAuthMode === 'login' ? 'register' : 'login');

        window.handleAuthFormSubmit = async (e) => {
            e.preventDefault();
            window.setLoading('auth-submit-button', true);
            const u = document.getElementById('auth-username').value;
            const p = document.getElementById('auth-password').value;
            const r = document.getElementById('auth-remember-me').checked;
            const err = document.getElementById('auth-error-message');
            err.classList.add('hidden');
            
            try {
                const ep = window.currentAuthMode === 'login' ? '/auth/login' : '/auth/register';
                await apiCall(ep, {
                    method: 'POST', headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({username: u, password: p, rememberMe: r})
                });
                window.showToast("Erfolgreich!", 'success');
                window.closeAuthModal();
                if(window.currentAuthMode==='login') window.checkLogin();
                else window.openAuthModal('login');
            } catch(e) {
                err.textContent = e.message; err.classList.remove('hidden');
            }
            window.setLoading('auth-submit-button', false);
        };

        window.logout = async () => {
            await apiCall('/auth/logout', {method:'POST'});
            window.location.reload();
        };

        // --- SHOP & PRODUCTS ---
        window.loadProducts = async (mode = 'initial') => {
            if(mode === 'initial') {
                document.getElementById('loading-status').classList.remove('hidden');
                document.getElementById('product-list').classList.add('hidden');
            }
            try {
                const data = await apiCall('/products');
                products = data.products || [];
                window.applySearch();
                if(mode === 'initial') {
                    document.getElementById('loading-status').classList.add('hidden');
                    document.getElementById('product-list').classList.remove('hidden');
                    document.getElementById('pagination-controls').classList.remove('hidden');
                }
            } catch(e) { window.showToast("Ladefehler Produkte", 'error'); }
        };

        window.applySearch = () => {
            const term = document.getElementById('search').value.toLowerCase();
            filteredProducts = products.filter(p => p.name.toLowerCase().includes(term));
            window.renderProducts();
        };

        window.renderProducts = () => {
            const list = document.getElementById('product-list');
            list.innerHTML = '';
            
            const pages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
            if(currentPage > pages) currentPage = pages;
            const start = (currentPage -1)*itemsPerPage;
            const sub = filteredProducts.slice(start, start+itemsPerPage);

            sub.forEach(p => {
                const inCart = cart.find(c=>c.id===p.id)?.quantity || 0;
                const stock = p.isTokenCard ? 9999 : (p.stock||0);
                const canAdd = stock - inCart > 0;
                
                const div = document.createElement('div');
                div.className = "product-card bg-white rounded-xl shadow-sm overflow-hidden flex flex-col relative transition-all";
                div.innerHTML = `
                    <div class="h-48 bg-gray-100 relative cursor-pointer" onclick="window.showProductDetails(${p.id})">
                        <img src="${p.image_url || 'https://placehold.co/300'}" class="w-full h-full object-cover">
                        ${p.isTokenCard ? '<span class="absolute top-2 right-2 bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded">TOKEN</span>' : ''}
                        ${stock<=0 && !p.isTokenCard ? '<span class="absolute top-2 right-2 bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded">AUSVERKAUFT</span>' : ''}
                    </div>
                    <div class="p-4 flex flex-col flex-grow">
                        <h3 class="font-bold truncate">${p.name}</h3>
                        <p class="text-xs text-gray-500 mb-2">ID: ${p.id}</p>
                        <div class="mt-auto flex justify-between items-center mb-3">
                            <span class="text-lg font-bold text-brand-600">${p.price}</span>
                            <span class="text-xs ${canAdd ? 'text-green-600' : 'text-red-500'} font-bold">${p.isTokenCard ? 'Digital' : stock+' Stk.'}</span>
                        </div>
                        <button onclick="window.addToCart(${p.id}, 1)" ${!canAdd?'disabled':''} class="w-full bg-gray-900 text-white py-2 rounded font-bold text-xs hover:bg-black disabled:opacity-50">
                            In den Korb
                        </button>
                    </div>
                `;
                list.appendChild(div);
            });
            document.getElementById('page-info').textContent = `${currentPage}/${pages}`;
            document.getElementById('prev').disabled = currentPage === 1;
            document.getElementById('next').disabled = currentPage >= pages;
        };

        document.getElementById('search').addEventListener('input', window.applySearch);
        document.getElementById('prev').onclick = () => { if(currentPage>1) { currentPage--; window.renderProducts(); }};
        document.getElementById('next').onclick = () => { if(currentPage < Math.ceil(filteredProducts.length/itemsPerPage)) { currentPage++; window.renderProducts(); }};

        // --- CART ---
        window.loadCart = () => {
            const c = document.cookie.match(/(^|;) ?cart=([^;]*)(;|$)/);
            if(c) try { cart = JSON.parse(decodeURIComponent(c[2])); } catch(e){cart=[];}
            window.updateCartCount();
        };
        window.updateCartCount = () => {
            const cnt = cart.reduce((a,b)=>a+b.quantity,0);
            const el = document.getElementById('cart-count');
            el.textContent = cnt; el.classList.toggle('hidden', cnt===0);
            document.cookie = `cart=${encodeURIComponent(JSON.stringify(cart))}; path=/; max-age=604800`;
        };
        window.addToCart = (id, q) => {
            const qty = parseInt(q)||1;
            const p = products.find(x=>x.id===id);
            if(!p) return;
            const ex = cart.find(x=>x.id===id);
            const cur = ex ? ex.quantity : 0;
            const max = p.isTokenCard ? 9999 : p.stock;
            if(cur+qty > max) { window.showToast('Bestand überschritten', 'error'); return; }
            if(ex) ex.quantity += qty;
            else cart.push({id:p.id, name:p.name, price:parseFloat(p.price.replace('$','')), quantity:qty, isTokenCard:p.isTokenCard});
            window.updateCartCount();
            window.renderProducts();
            window.showToast(`${qty}x ${p.name} im Korb`, 'success');
        };
        window.viewCart = () => {
            const list = document.getElementById('cart-items');
            list.innerHTML = '';
            let total = 0;
            cart.forEach((item,i) => {
                total += item.price * item.quantity;
                const d = document.createElement('div');
                d.className = "flex justify-between items-center bg-white p-3 rounded shadow-sm";
                d.innerHTML = `<div><div class="font-bold text-sm">${item.name}</div><div class="text-xs text-gray-500">$${item.price.toFixed(2)} x ${item.quantity}</div></div>
                <div class="flex items-center gap-3"><span class="font-bold">$${(item.price*item.quantity).toFixed(2)}</span><button onclick="window.removeFromCart(${i})" class="text-red-500"><i class="fas fa-trash"></i></button></div>`;
                list.appendChild(d);
            });
            document.getElementById('cart-total').textContent = total.toFixed(2);
            document.getElementById('cart-checkout-button').disabled = cart.length === 0;
            document.getElementById('cart-modal').classList.remove('hidden');
        };
        window.removeFromCart = (i) => { cart.splice(i,1); window.updateCartCount(); window.viewCart(); window.renderProducts(); };
        window.closeCart = () => document.getElementById('cart-modal').classList.add('hidden');
        
        window.checkout = () => {
            if(!loggedInUser) { window.closeCart(); window.openAuthModal('login'); return; }
            window.closeCart();
            const list = document.getElementById('checkout-items');
            list.innerHTML = '';
            let t = 0;
            cart.forEach(i => {
                t += i.price*i.quantity;
                list.innerHTML += `<div class="flex justify-between mb-1"><span>${i.quantity}x ${i.name}</span><span>$${(i.price*i.quantity).toFixed(2)}</span></div>`;
            });
            document.getElementById('checkout-total').textContent = t.toFixed(2);
            document.getElementById('checkout-modal').classList.remove('hidden');
        };
        window.closeCheckout = () => document.getElementById('checkout-modal').classList.add('hidden');
        
        window.confirmPurchase = async () => {
            window.setLoading('confirm-purchase-button', true);
            try {
                await apiCall('/purchase', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({cart})});
                // Local Storage History
                const h = JSON.parse(localStorage.getItem('orderHistory')||'[]');
                h.unshift({date:new Date().toISOString(), items:[...cart], total:parseFloat(document.getElementById('checkout-total').textContent)});
                localStorage.setItem('orderHistory', JSON.stringify(h));
                
                cart = []; window.updateCartCount(); window.closeCheckout();
                document.getElementById('thank-you-modal').classList.remove('hidden');
                window.loadProducts(); window.checkLogin();
            } catch(e) { window.showToast(e.message, 'error'); }
            window.setLoading('confirm-purchase-button', false);
        };

        // --- INVENTORY ---
        window.showMyInventory = async () => {
            if(!loggedInUser) { window.openAuthModal('login'); return; }
            const mod = document.getElementById('inventory-modal');
            const con = document.getElementById('inventory-content');
            con.innerHTML = '<div class="text-center"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div></div>';
            mod.classList.remove('hidden');
            
            try {
                const res = await apiCall('/inventory');
                const inv = res.inventory || [];
                window.inventoryData = inv; 
                con.innerHTML = '';
                if(inv.length === 0) con.innerHTML = '<p class="text-center text-gray-500">Leer.</p>';
                inv.forEach((i, idx) => {
                    const d = document.createElement('div');
                    d.className = "flex justify-between items-center bg-white p-3 rounded mb-2 shadow-sm";
                    d.innerHTML = `
                        <div class="flex items-center gap-3">
                            <img src="${i.productDetails.image_url}" class="w-12 h-12 object-cover rounded">
                            <div><div class="font-bold text-sm">${i.productDetails.name}</div><div class="text-xs text-gray-500">Menge: ${i.quantityOwned}</div></div>
                        </div>
                        <div class="flex flex-col gap-1">
                            <button onclick="window.openSellModal(${idx})" class="bg-green-100 text-green-700 text-xs px-2 py-1 rounded hover:bg-green-200">Verkaufen</button>
                            <button onclick="window.openCreateAuctionModal(${idx})" class="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded hover:bg-yellow-200">Versteigern</button>
                        </div>
                    `;
                    con.appendChild(d);
                });
            } catch(e) { con.innerHTML = `<p class="text-red-500 text-center">${e.message}</p>`; }
        };
        window.closeMyInventory = () => document.getElementById('inventory-modal').classList.add('hidden');

        // --- SELL ---
        window.openSellModal = (index) => {
            const item = window.inventoryData[index];
            if(!item) return;
            
            currentSellProductId = item.productId;
            document.getElementById('sell-product-name').textContent = item.productDetails.name;
            document.getElementById('sell-product-user-stock').textContent = item.quantityOwned;
            
            // ROBUSTER PREIS CHECK
            let priceVal = item.productDetails.price;
            if(!priceVal || priceVal === 0 || priceVal === "0" || priceVal === 'undefined') {
                const globalProd = products.find(p => p.id === item.productId);
                if(globalProd) priceVal = globalProd.price;
            }
            if(!priceVal) priceVal = "$0.00";
            
            document.getElementById('sell-product-original-price').textContent = priceVal;
            document.getElementById('sell-quantity').value = 1;
            document.getElementById('sell-quantity').max = item.quantityOwned;
            
            let numericPrice = 0;
            if(typeof priceVal === 'number') numericPrice = priceVal;
            else numericPrice = parseFloat(String(priceVal).replace(/[^0-9.]/g, '')) || 0;
            
            document.getElementById('sell-price').value = numericPrice.toFixed(2);
            document.getElementById('sell-product-modal').classList.remove('hidden');
            
            const inp = document.getElementById('sell-price');
            inp.oninput = () => {
                const p = parseFloat(inp.value);
                let chance = 100;
                if(p > numericPrice) chance = Math.max(5, 100 - ((p-numericPrice)/numericPrice)*200);
                document.getElementById('sell-probability').textContent = Math.round(chance)+'%';
            };
        };
        window.closeSellProductModal = () => document.getElementById('sell-product-modal').classList.add('hidden');
        window.handleSellProduct = async () => {
            const q = parseInt(document.getElementById('sell-quantity').value);
            const p = parseFloat(document.getElementById('sell-price').value);
            window.setLoading('confirm-sell-button', true);
            try {
                await apiCall('/products/sell', {
                    method: 'POST', headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({productId: currentSellProductId, quantity: q, sellPrice: p})
                });
                window.showToast("Verkauft!", 'success');
                window.closeSellProductModal();
                window.showMyInventory();
                window.checkLogin();
            } catch(e) { document.getElementById('sell-error-message').textContent = e.message; document.getElementById('sell-error-message').classList.remove('hidden'); }
            window.setLoading('confirm-sell-button', false);
        };

        // --- AUCTIONS ---
        window.openAuctionHouse = () => {
            if(!loggedInUser) { window.openAuthModal('login'); return; }
            document.getElementById('auction-house-modal').classList.remove('hidden');
            window.renderAuctions();
            if(auctionInterval) clearInterval(auctionInterval);
            auctionInterval = setInterval(window.renderAuctions, 15000);
        };
        window.closeAuctionHouse = () => {
            document.getElementById('auction-house-modal').classList.add('hidden');
            clearInterval(auctionInterval);
        };
        window.renderAuctions = async () => {
            const con = document.getElementById('auction-house-content');
            try {
                const res = await apiCall('/auctions');
                const aucs = res.auctions || [];
                con.innerHTML = '';
                if(aucs.length===0) { con.innerHTML = '<p class="col-span-full text-center text-gray-500">Keine Auktionen.</p>'; return; }
                
                aucs.forEach(a => {
                    const end = new Date(a.endTime);
                    const now = new Date();
                    const diff = Math.max(0, Math.floor((end-now)/1000));
                    const hrs = Math.floor(diff/3600);
                    const mins = Math.floor((diff%3600)/60);
                    
                    const div = document.createElement('div');
                    div.className = "bg-white p-3 rounded shadow hover:shadow-md cursor-pointer border transition";
                    div.onclick = () => window.openAuctionDetail(a._id);
                    div.innerHTML = `
                        <img src="${a.productImageUrl}" class="w-full h-32 object-cover rounded mb-2">
                        <div class="font-bold text-sm truncate">${a.productName}</div>
                        <div class="text-xs text-gray-500">Verkäufer: ${a.sellerUsername}</div>
                        <div class="flex justify-between items-center mt-2">
                            <span class="font-bold text-blue-600">$${a.currentBid.toFixed(2)}</span>
                            <span class="text-xs bg-gray-100 px-2 py-1 rounded font-mono">${hrs}h ${mins}m</span>
                        </div>
                    `;
                    con.appendChild(div);
                });
            } catch(e) { con.innerHTML = '<p class="text-red-500">Fehler beim Laden.</p>'; }
        };

        window.openAuctionDetail = async (id) => {
            activeAuctionId = id;
            const mod = document.getElementById('auction-detail-modal');
            mod.classList.remove('hidden');
            try {
                const res = await apiCall(`/auctions/${id}`);
                const a = res.auction;
                document.getElementById('auction-detail-name').textContent = a.productName;
                document.getElementById('auction-detail-image').src = a.productImageUrl;
                document.getElementById('auction-detail-bid').textContent = a.currentBid.toFixed(2);
                document.getElementById('auction-detail-seller').textContent = a.sellerUsername;
                document.getElementById('auction-detail-highest-bidder').textContent = a.highestBidderUsername || '-';
                
                const hist = document.getElementById('auction-bid-history');
                hist.innerHTML = '';
                (a.bids || []).forEach(b => {
                    hist.innerHTML += `<div class="flex justify-between border-b py-1"><span>$${b.amount.toFixed(2)} (${b.bidderUsername})</span><span class="text-gray-400">${new Date(b.timestamp).toLocaleTimeString()}</span></div>`;
                });
                document.getElementById('auction-detail-time').textContent = new Date(a.endTime).toLocaleString();
            } catch(e) { window.showToast('Fehler Details', 'error'); mod.classList.add('hidden'); }
        };

        window.handleBid = async () => {
            const amt = parseFloat(document.getElementById('bid-amount').value);
            window.setLoading('confirm-bid-button', true);
            const err = document.getElementById('auction-detail-error');
            err.textContent = "";
            try {
                await apiCall(`/auctions/${activeAuctionId}/bid`, {
                    method: 'POST', headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({bidAmount: amt})
                });
                window.showToast("Gebot platziert!", 'success');
                window.openAuctionDetail(activeAuctionId); 
                window.checkLogin();
            } catch(e) { err.textContent = e.message; }
            window.setLoading('confirm-bid-button', false);
        };

        window.openCreateAuctionModal = (index) => {
             const item = window.inventoryData[index];
             if(!item) return;
             
            currentAuctionProductId = item.productId;
            document.getElementById('create-auction-product-name').textContent = item.productDetails.name;
            document.getElementById('create-auction-product-image').src = item.productDetails.image_url;
            document.getElementById('create-auction-user-stock').textContent = item.quantityOwned;
            document.getElementById('create-auction-quantity').value = 1;
            document.getElementById('create-auction-quantity').max = item.quantityOwned;
            document.getElementById('create-auction-modal').classList.remove('hidden');
        };
        window.closeCreateAuctionModal = () => document.getElementById('create-auction-modal').classList.add('hidden');
        window.handleCreateAuction = async () => {
            const q = parseInt(document.getElementById('create-auction-quantity').value);
            const start = parseFloat(document.getElementById('create-auction-start-bid').value);
            const dur = parseInt(document.getElementById('create-auction-duration').value);
            window.setLoading('confirm-create-auction-button', true);
            try {
                await apiCall('/auctions', {
                    method:'POST', headers:{'Content-Type':'application/json'},
                    body: JSON.stringify({productId: currentAuctionProductId, quantity:q, startingBid:start, durationInHours:dur})
                });
                window.showToast("Auktion gestartet!", 'success');
                window.closeCreateAuctionModal();
                window.closeMyInventory(); 
            } catch(e) { document.getElementById('create-auction-error-message').textContent=e.message; document.getElementById('create-auction-error-message').classList.remove('hidden'); }
            window.setLoading('confirm-create-auction-button', false);
        };

        // --- STONKS ---
        window.openStonkMarket = () => {
            if(!loggedInUser) { window.openAuthModal('login'); return; }
            document.getElementById('stonks-market-modal').classList.remove('hidden');
            window.renderStonkMarket();
            if(stonkInterval) clearInterval(stonkInterval);
            stonkInterval = setInterval(window.renderStonkMarket, 5000); 
        };
        window.closeStonkMarket = () => {
            document.getElementById('stonks-market-modal').classList.add('hidden');
            clearInterval(stonkInterval);
        };
        window.renderStonkMarket = async () => {
            const con = document.getElementById('stonks-market-content');
            if(con.children.length === 0) con.innerHTML = '<div class="col-span-full text-center"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div></div>';
            
            try {
                const [pRes, portRes] = await Promise.all([
                    apiCall('/products'),
                    apiCall('/stonks/portfolio')
                ]);
                
                const stocks = pRes.products.filter(p => !p.isTokenCard && p.currentPrice !== undefined);
                const portfolio = portRes.portfolio || [];
                const term = document.getElementById('stonk-search').value.toLowerCase();
                const filtered = stocks.filter(s => s.name.toLowerCase().includes(term));

                con.innerHTML = '';
                filtered.forEach(s => {
                    const owned = portfolio.find(x => x.productId === s.id);
                    const color = Math.random() > 0.5 ? 'text-green-500' : 'text-red-500'; 
                    const div = document.createElement('div');
                    div.className = "bg-white p-3 rounded-lg shadow border cursor-pointer hover:border-green-400 transition relative";
                    if(owned) div.classList.add('ring-2', 'ring-blue-100');
                    div.onclick = function() { window.openStonkDetail(s.id); };
                    div.innerHTML = `
                        <div class="flex justify-between items-start mb-2">
                            <img src="${s.image_url}" class="w-10 h-10 rounded object-cover">
                            ${owned ? '<span class="text-[10px] bg-blue-100 text-blue-600 font-bold px-1 rounded">OWNED</span>' : ''}
                        </div>
                        <h4 class="font-bold text-sm truncate">${s.name}</h4>
                        <div class="mt-2 flex justify-between items-end">
                            <div class="text-xl font-bold text-gray-800">$${s.currentPrice.toFixed(2)}</div>
                            <div class="text-xs ${color} font-mono">24h %</div> 
                        </div>
                    `;
                    con.appendChild(div);
                });
            } catch(e) { con.innerHTML = `<p class="text-red-500">Fehler: ${e.message}</p>`; }
        };

        window.openStonkDetail = async (pid) => {
            const mod = document.getElementById('stonk-detail-modal');
            mod.classList.remove('hidden');
            document.getElementById('stonk-detail-name').textContent = "Lade...";
            
            try {
                const [pRes, portRes] = await Promise.all([apiCall('/products'), apiCall('/stonks/portfolio')]);
                const s = pRes.products.find(x => x.id === pid);
                const port = portRes.portfolio.find(x => x.productId === pid);
                
                document.getElementById('stonk-detail-name').textContent = s.name;
                document.getElementById('stonk-detail-image').src = s.image_url;
                document.getElementById('stonk-detail-price').textContent = s.currentPrice.toFixed(2);
                document.getElementById('stonk-portfolio-quantity').textContent = port ? port.quantityShares : 0;
                document.getElementById('stonk-portfolio-avg-price').textContent = port ? `$${port.averageBuyPrice.toFixed(2)}` : '$0.00';
                
                const inp = document.getElementById('stonk-trade-quantity');
                inp.value = '';
                const est = document.getElementById('stonk-trade-estimated-value');
                est.textContent = "Est: $0.00";
                inp.oninput = () => { est.textContent = `Est: $${((parseInt(inp.value)||0) * s.currentPrice).toFixed(2)}`; };

                // Rebind buttons
                const bBuy = document.getElementById('stonk-buy-button');
                const bSell = document.getElementById('stonk-sell-button');
                
                // Remove listeners hack
                const nBuy = bBuy.cloneNode(true);
                const nSell = bSell.cloneNode(true);
                bBuy.parentNode.replaceChild(nBuy, bBuy);
                bSell.parentNode.replaceChild(nSell, bSell);

                nBuy.onclick = () => window.handleStonkTrade(pid, 'buy');
                nSell.onclick = () => window.handleStonkTrade(pid, 'sell');

            } catch(e) { window.showToast("Fehler beim Laden", 'error'); mod.classList.add('hidden'); }
        };

        window.handleStonkTrade = async (pid, type) => {
            const q = parseInt(document.getElementById('stonk-trade-quantity').value);
            if(!q || q<=0) return;
            const btnId = type === 'buy' ? 'stonk-buy-button' : 'stonk-sell-button';
            window.setLoading(btnId, true);
            const err = document.getElementById('stonk-trade-error');
            err.textContent = "";
            try {
                await apiCall(`/stonks/${type}`, {
                    method: 'POST', headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({productId: pid, quantity: q})
                });
                window.showToast("Trade erfolgreich!", 'success');
                window.openStonkDetail(pid); 
                window.renderStonkMarket(); 
                window.checkLogin(); 
            } catch(e) { err.textContent = e.message; }
            window.setLoading(btnId, false);
        };

        // --- TOKENS & PORTFOLIO ---
        window.openMyPortfolio = () => { document.getElementById('my-portfolio-modal').classList.remove('hidden'); window.renderPortfolio(); };
        window.closeMyPortfolio = () => document.getElementById('my-portfolio-modal').classList.add('hidden');
        window.renderPortfolio = async () => {
            const body = document.getElementById('my-portfolio-content');
            body.innerHTML = '<tr><td colspan="7" class="text-center p-4">Lade...</td></tr>';
            try {
                const res = await apiCall('/stonks/portfolio');
                const port = res.portfolio || [];
                body.innerHTML = '';
                let total = 0;
                port.forEach(p => {
                    const val = p.quantityShares * p.currentPrice;
                    const cost = p.quantityShares * p.averageBuyPrice;
                    const prof = val - cost;
                    total += val;
                    const row = document.createElement('tr');
                    row.className = "border-b";
                    row.innerHTML = `
                        <td class="p-3 font-bold">${p.name}</td>
                        <td class="p-3 text-right">${p.quantityShares}</td>
                        <td class="p-3 text-right">$${p.averageBuyPrice.toFixed(2)}</td>
                        <td class="p-3 text-right">$${p.currentPrice.toFixed(2)}</td>
                        <td class="p-3 text-right font-bold">$${val.toFixed(2)}</td>
                        <td class="p-3 text-right ${prof>=0?'text-green-600':'text-red-600'}">${prof.toFixed(2)}</td>
                        <td class="p-3 text-center"><button onclick="window.openStonkDetail(${p.productId})" class="text-blue-500 text-xs underline">Handeln</button></td>
                    `;
                    body.appendChild(row);
                });
                document.getElementById('portfolio-total-value').textContent = `$${total.toFixed(2)}`;
            } catch(e) { body.innerHTML = '<tr><td colspan="7" class="text-red-500 p-4">Fehler.</td></tr>'; }
        };

        window.showMyTokenCodes = async () => {
            document.getElementById('my-token-codes-modal').classList.remove('hidden');
            const con = document.getElementById('my-token-codes-content');
            con.innerHTML = 'Lade...';
            try {
                const res = await apiCall('/tokens/my-codes');
                const codes = res.codes || [];
                con.innerHTML = '';
                codes.forEach(c => {
                    con.innerHTML += `<div class="bg-gray-50 p-2 border rounded flex justify-between items-center mb-1">
                        <div><div class="font-mono font-bold text-green-700">${c.code}</div><div class="text-xs text-gray-500">${c.tokenAmount} Tokens</div></div>
                        <button onclick="navigator.clipboard.writeText('${c.code}')" class="text-xs bg-white border px-2 py-1 rounded">Copy</button>
                    </div>`;
                });
            } catch(e) { con.innerHTML = 'Fehler.'; }
        };
        window.closeMyTokenCodesModal = () => document.getElementById('my-token-codes-modal').classList.add('hidden');
        window.mergeTokenCodes = async () => { /* ...existing logic but with window. ... */
             // Kurzfassung der Logik wie vorher
             const v = document.getElementById('merge-token-value').value;
             const c = document.getElementById('merge-token-count').value;
             try { await apiCall('/tokens/merge', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({tokenValue:parseInt(v), count:parseInt(c)})}); window.showMyTokenCodes(); }
             catch(e) { window.showToast(e.message, 'error'); }
        };

        window.redeemTokenCode = async () => {
            const c = document.getElementById('redeem-token-code').value;
            try {
                await apiCall('/tokens/redeem', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({code:c}) });
                window.showToast("Eingelöst!", 'success');
                window.checkLogin();
                document.getElementById('redeem-token-code').value = '';
            } catch(e) { window.showToast(e.message, 'error'); }
        };

        window.convertDollarsToTokens = async () => {
            const amt = parseFloat(document.getElementById('dollars-to-tokens-amount').value);
            try {
                await apiCall('/tokens/convert-dollars-to-tokens', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({dollarAmount:amt})});
                window.checkLogin(); window.showToast("Umgewandelt!", 'success');
            } catch(e) { document.getElementById('dollars-to-tokens-message').textContent=e.message; }
        };
        
        window.convertTokensToDollars = async () => {
            const amt = parseInt(document.getElementById('tokens-to-dollars-amount').value);
            try {
                await apiCall('/tokens/convert-tokens-to-dollars', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({tokenAmount:amt})});
                window.checkLogin(); window.showToast("Umgewandelt!", 'success');
            } catch(e) { document.getElementById('tokens-to-dollars-message').textContent=e.message; }
        };

        window.showOrderHistory = async () => {
            const mod = document.getElementById('order-history-modal');
            const con = document.getElementById('order-history-content');
            mod.classList.remove('hidden');
            const h = JSON.parse(localStorage.getItem('orderHistory')||'[]');
            con.innerHTML = '';
            if(h.length===0) con.innerHTML = "Keine lokale Historie.";
            h.forEach(o => {
                let items = "";
                o.items.forEach(i => items += `<div>${i.quantity}x ${i.name}</div>`);
                con.innerHTML += `<div class="bg-gray-50 p-3 rounded shadow-sm border mb-2">
                    <div class="flex justify-between font-bold text-sm"><span>${new Date(o.date).toLocaleDateString()}</span><span>$${o.total.toFixed(2)}</span></div>
                    <div class="text-xs text-gray-500 mt-1">${items}</div>
                </div>`;
            });
        };
        window.closeOrderHistory = () => document.getElementById('order-history-modal').classList.add('hidden');
        window.clearOrderHistory = () => { localStorage.removeItem('orderHistory'); window.showOrderHistory(); };

        // --- ADMIN & HELPERS ---
        window.openGenerateTokenCodesModal = () => document.getElementById('generate-token-codes-modal').classList.remove('hidden');
        window.closeGenerateTokenCodesModal = () => document.getElementById('generate-token-codes-modal').classList.add('hidden');
        window.handleGenerateTokenCodes = async () => {
            const amt = parseInt(document.getElementById('generate-token-amount').value);
            const cnt = parseInt(document.getElementById('generate-token-count').value);
            const dis = document.getElementById('generated-codes-display');
            dis.innerHTML = "Generiere...";
            try {
                const res = await apiCall('/admin/generate-token-code', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({tokenAmount:amt, count:cnt})});
                dis.innerHTML = '';
                (res.codes||[]).forEach(c => dis.innerHTML += `<div>${c.code}</div>`);
            } catch(e) { dis.innerHTML = e.message; }
        };

        window.openAddProductModal = () => document.getElementById('add-product-modal').classList.remove('hidden');
        window.closeAddProductModal = () => document.getElementById('add-product-modal').classList.add('hidden');
        window.submitProduct = async () => {
            // ... (Simple implementation)
             const n = document.getElementById('product-name').value;
            const i = document.getElementById('product-image').value;
            const p = document.getElementById('product-price').value;
            const s = parseInt(document.getElementById('product-stock').value);
            try {
                await apiCall('/products', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name:n, image_url:i, price:p, stock:s})});
                window.showToast("Erstellt!", 'success'); window.closeAddProductModal(); window.loadProducts();
            } catch(e) { window.showToast(e.message, 'error'); }
        };
        window.resetProductStock = async (z) => {
            if(!confirm("Sicher?")) return;
            try{ await apiCall(z?'/admin/zero-stock':'/products/reset', {method:'PATCH'}); window.showToast("Reset OK", 'success'); window.loadProducts(); }
            catch(e){ window.showToast(e.message, 'error'); }
        };
        
        // --- REAL PDF INVOICE ---
        window.generateInvoice = () => {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            
            doc.setFontSize(20);
            doc.text("Limazon Rechnung", 14, 22);
            doc.setFontSize(10);
            doc.text(`Datum: ${new Date().toLocaleDateString()}`, 14, 30);
            doc.text(`Kunde: ${loggedInUser ? loggedInUser.username : 'Gast'}`, 14, 35);

            // Holen der letzten Bestellung aus localStorage, da `lastPurchasedCart` beim Reload verloren geht
            const history = JSON.parse(localStorage.getItem('orderHistory') || '[]');
            const lastOrder = history[0]; 
            const items = lastOrder ? lastOrder.items : [];

            if(items.length > 0) {
                 const tableRows = items.map(item => [
                    item.name,
                    item.quantity,
                    `$${item.price.toFixed(2)}`,
                    `$${(item.price * item.quantity).toFixed(2)}`
                ]);

                doc.autoTable({
                    head: [['Produkt', 'Menge', 'Einzelpreis', 'Gesamt']],
                    body: tableRows,
                    startY: 45,
                });
                
                const total = items.reduce((acc, i) => acc + (i.price*i.quantity), 0);
                doc.text(`Summe: $${total.toFixed(2)}`, 14, doc.lastAutoTable.finalY + 10);
            } else {
                doc.text("Keine Artikeldaten gefunden.", 14, 50);
            }

            doc.save(`Rechnung_${Date.now()}.pdf`);
        };

        // --- CLOSING HELPERS (Overlays) ---
        window.closeProductDetails = () => document.getElementById('product-detail-modal').classList.add('hidden');
        window.closeAccountModal = () => document.getElementById('account-modal').classList.add('hidden');
        window.openAccountModal = () => { if(!loggedInUser) { window.openAuthModal('login'); return; } document.getElementById('account-modal').classList.remove('hidden'); };

        // --- INIT ---
        window.onload = async () => {
            window.loadCart();
            await window.checkLogin();
            await window.loadProducts('initial');
        };

    