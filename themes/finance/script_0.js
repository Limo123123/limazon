
        const API_URL = 'https://api.limazon.v6.rocks'; 
        let currentTab = 'market';
        let marketData = { stocks: [], crypto: {} };
        let portfolioData = null;
        let selectedAsset = null;
        let searchTimer = null;
        let chartInstance = null;
        let pfChartInstance = null;
        let isPolling = false;

        document.addEventListener('DOMContentLoaded', () => {
            loadPortfolio();
            loadStocks(); 
            loadCrypto();
            pollData();
        });

        async function pollData() {
            if(isPolling) return;
            isPolling = true;
            
            await loadPortfolio();
            await loadCrypto();
            
            isPolling = false;
            setTimeout(pollData, 10000);
        }

        async function loadPortfolio() {
            try {
                const res = await fetch(`${API_URL}/api/finance/portfolio/full`, { credentials: 'include' });
                if(res.ok) {
                    portfolioData = await res.json();
                    const nw = portfolioData.netWorth || 0;
                    document.getElementById('header-networth').innerText = '$ ' + nw.toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2});
                    if(currentTab === 'portfolio') renderPortfolio();
                }
            } catch(e) { console.error("Portfolio Load Error", e); }
        }

        async function loadCrypto() {
            try {
                const res = await fetch(`${API_URL}/api/finance/market`, { credentials: 'include' });
                if(res.ok) {
                    const d = await res.json();
                    marketData.crypto = d.crypto;
                    if(currentTab === 'crypto') renderCrypto();
                }
            } catch(e) { console.error("Crypto Load Error", e); }
        }

        async function loadStocks(searchQuery = "") {
            const grid = document.getElementById('stocks-grid');
            if(searchQuery.length > 0) {
                grid.innerHTML = '<div class="col-span-full py-32 text-center"><div class="loader mx-auto mb-4"></div><p class="text-blue-400 text-sm font-mono animate-pulse">Suche läuft...</p></div>';
            }

            try {
                const url = `${API_URL}/api/stocks?limit=50` + (searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '');
                const res = await fetch(url, { credentials: 'include' });
                
                if(res.ok) {
                    const data = await res.json();
                    marketData.stocks = data;
                    if(currentTab === 'market') renderStocks(marketData.stocks);
                }
            } catch(e) { console.error("Stock Load Error", e); }
        }

        function handleSearch() {
            clearTimeout(searchTimer);
            const query = document.getElementById('stock-search').value;
            if(query.length === 0) {
                loadStocks();
                return;
            }
            searchTimer = setTimeout(() => { loadStocks(query); }, 600);
        }

        function renderStocks(list) {
            const grid = document.getElementById('stocks-grid');
            if(!list || !list.length) {
                grid.innerHTML = '<div class="col-span-full text-center py-20 text-gray-500">Keine Aktien gefunden.</div>';
                return;
            }

            grid.innerHTML = list.map(s => {
                const isUp = s.changePercent >= 0;
                const colorClass = isUp ? 'glow-green' : 'glow-red';
                const chartColor = isUp ? '#10b981' : '#ef4444';
                const sign = isUp ? '+' : '';
                const histData = JSON.stringify(s.history || []); 

                return `
                <div class="glass-card rounded-2xl p-4 cursor-pointer group relative overflow-hidden flex flex-col justify-between h-[140px]" 
                     onclick='openTradeModal("stock", "${s.id}", ${histData})'>
                    
                    <div class="flex justify-between items-start relative z-10">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl overflow-hidden shadow-inner">
                                ${s.image ? `<img src="${s.image}" class="w-full h-full object-cover">` : '📈'}
                            </div>
                            <div class="overflow-hidden">
                                <div class="font-bold text-white leading-tight truncate w-28 text-sm">${s.name}</div>
                                <div class="text-[10px] text-gray-500 font-mono tracking-wider font-bold">${s.symbol}</div>
                            </div>
                        </div>
                    </div>

                    <div class="relative z-10 mt-auto">
                        <div class="font-mono font-bold text-white text-xl tracking-tight">$${s.price.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                        <div class="text-xs font-bold ${colorClass}">${sign}${s.changePercent.toFixed(2)}%</div>
                    </div>

                    <div class="absolute bottom-0 right-0 w-32 h-16 opacity-30 group-hover:opacity-60 transition-opacity">
                        <canvas id="chart-stock-${s.id}" data-hist='${histData}' data-color="${chartColor}"></canvas>
                    </div>
                </div>`;
            }).join('');

            requestAnimationFrame(() => {
                list.forEach(s => initSparkline(`chart-stock-${s.id}`));
            });
        }

        function renderCrypto() {
            const grid = document.getElementById('crypto-grid');
            const coins = marketData.crypto || {};
            const keys = Object.keys(coins);
            
            grid.innerHTML = keys.map(k => {
                const c = coins[k];
                const price = c.price || 0;
                const change = c.lastChange || 0;
                const isUp = change >= 0;
                const histData = JSON.stringify(c.history || []);
                const chartColor = isUp ? '#10b981' : '#ef4444';

                return `
                <div class="glass-card rounded-2xl p-5 flex justify-between items-center cursor-pointer hover:border-blue-500/30 group relative overflow-hidden" 
                     onclick='openTradeModal("crypto", "${k}", ${histData})'>
                    
                    <div class="flex items-center gap-4 relative z-10">
                        <div class="w-12 h-12 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center font-bold text-xl shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                            ${c.symbol[0]}
                        </div>
                        <div>
                            <div class="font-bold text-lg text-white">${c.name}</div>
                            <div class="text-xs text-gray-500 font-mono font-bold">${c.symbol}</div>
                        </div>
                    </div>
                    <div class="text-right relative z-10">
                        <div class="font-mono text-xl text-white font-bold">$${price.toFixed(2)}</div>
                        <div class="text-sm ${isUp?'text-green-400':'text-red-400'} font-bold">${isUp?'+':''}${change.toFixed(2)}%</div>
                    </div>

                    <div class="absolute bottom-0 left-1/2 w-32 h-16 opacity-10 group-hover:opacity-30 transition-opacity">
                        <canvas id="chart-crypto-${k}" data-hist='${histData}' data-color="${chartColor}"></canvas>
                    </div>
                </div>`;
            }).join('');

            requestAnimationFrame(() => {
                keys.forEach(k => initSparkline(`chart-crypto-${k}`));
            });
        }

        function renderPortfolio() {
            if(!portfolioData) return;
            
            document.getElementById('stat-cash').innerText = '$ ' + portfolioData.balance.toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 0});
            const invested = portfolioData.netWorth - portfolioData.balance;
            document.getElementById('stat-invested').innerText = '$ ' + invested.toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 0});
            document.getElementById('pf-chart-total').innerText = '$' + (portfolioData.netWorth / 1000).toFixed(1) + 'k';

            const list = document.getElementById('portfolio-list');
            let html = "";
            
            portfolioData.stocks.forEach(s => html += createAssetRow('📈', s.name, `${s.quantity} Stk.`, s.quantity * s.currentPrice, (s.currentPrice - s.buyPrice)*s.quantity, 'stock', s.id, s.image));
            portfolioData.crypto.forEach(c => html += createAssetRow('🪙', c.name, `${c.quantity.toFixed(4)}`, c.quantity * c.currentPrice, 0, 'crypto', c.id, null, true));
            
            list.innerHTML = html || '<div class="p-8 text-center text-gray-500 text-sm">Dein Portfolio ist leer.</div>';
            updatePortfolioChart();
        }

        function createAssetRow(icon, name, sub, val, profit, type, id, img, hideProfit=false) {
            const isProf = profit >= 0;
            const imgHtml = img ? `<img src="${img}" class="w-full h-full object-cover">` : icon;
            return `
            <div class="flex justify-between items-center p-4 hover:bg-white/5 cursor-pointer transition group" onclick='openTradeModal("${type}", "${id}", [])'>
                <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-lg overflow-hidden border border-white/5 group-hover:border-white/20 transition-colors">${imgHtml}</div>
                    <div><div class="font-bold text-white text-sm truncate w-32 md:w-auto">${name}</div><div class="text-xs text-gray-500 font-mono font-bold">${sub}</div></div>
                </div>
                <div class="text-right"><div class="font-mono text-white font-bold text-sm">$${val.toLocaleString('de-DE', {minimumFractionDigits: 2})}</div>${hideProfit?'':`<div class="text-xs ${isProf?'text-green-400':'text-red-400'} font-bold">${isProf?'+':''}$${profit.toFixed(2)}</div>`}</div>
            </div>`;
        }

        function initSparkline(id) {
            const cvs = document.getElementById(id);
            if(!cvs || Chart.getChart(id)) return;
            
            try {
                const rawHist = JSON.parse(cvs.getAttribute('data-hist'));
                const color = cvs.getAttribute('data-color');
                if(!rawHist || rawHist.length < 2) return; 

                new Chart(cvs.getContext('2d'), {
                    type: 'line',
                    data: { labels: rawHist.map((_, i) => i), datasets: [{ data: rawHist, borderColor: color, borderWidth: 2, pointRadius: 0, fill: false, tension: 0.4 }] },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: false, tooltip: false }, scales: { x: { display: false }, y: { display: false } }, animation: false, layout: { padding: 0 } }
                });
            } catch(e) {}
        }

        function updatePortfolioChart() {
            const ctx = document.getElementById('portfolioChart');
            if(!ctx || !portfolioData) return;
            
            const cash = portfolioData.balance || 0;
            let stocks = 0; if(portfolioData.stocks) portfolioData.stocks.forEach(s => stocks += s.quantity * s.currentPrice);
            let crypto = 0; if(portfolioData.crypto) portfolioData.crypto.forEach(c => crypto += c.quantity * c.currentPrice);
            
            if(pfChartInstance) { pfChartInstance.data.datasets[0].data = [cash, stocks, crypto]; pfChartInstance.update(); }
            else {
                pfChartInstance = new Chart(ctx, {
                    type: 'doughnut',
                    data: { labels: ['Cash', 'Stocks', 'Crypto'], datasets: [{ data: [cash, stocks, crypto], backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6'], borderWidth: 0 }] },
                    options: { responsive: true, cutout: '85%', plugins: { legend: false }, animation: { animateScale: true } }
                });
            }
        }

        function openTradeModal(type, id, historyData) {
            let asset = null;
            if(type === 'stock') {
                const s = marketData.stocks.find(x => x.id == id) || (portfolioData?.stocks.find(x => x.id == id));
                if(s) asset = { id: s.id, type: 'stock', name: s.name, price: s.price || s.currentPrice, symbol: s.symbol || 'STK', img: s.image };
            } else {
                const c = marketData.crypto ? marketData.crypto[id] : null;
                const pc = portfolioData?.crypto.find(x => x.id == id);
                
                if(c) asset = { id: id, type: 'crypto', name: c.name, price: c.price, symbol: c.symbol };
                else if (pc) asset = { id: id, type: 'crypto', name: pc.name, price: pc.currentPrice, symbol: id.toUpperCase() };
            }

            if(!asset) return;
            selectedAsset = asset;

            document.getElementById('modal-title').innerText = asset.name;
            document.getElementById('modal-symbol').innerText = asset.symbol;
            document.getElementById('modal-type').innerText = type.toUpperCase();
            document.getElementById('modal-price').innerText = '$' + (asset.price || 0).toFixed(2);
            document.getElementById('trade-amount').value = '';
            document.getElementById('trade-total').innerText = '$0.00';
            
            const iconEl = document.getElementById('modal-icon');
            iconEl.innerHTML = asset.img ? `<img src="${asset.img}" class="w-full h-full object-cover rounded-xl">` : (type==='stock'?'📈':'🪙');

            let owned = 0;
            if(portfolioData) {
                const list = type === 'stock' ? portfolioData.stocks : portfolioData.crypto;
                const item = list.find(x => x.id == id);
                if(item) owned = item.quantity;
            }
            document.getElementById('modal-owned').innerText = owned;

            const modal = document.getElementById('trade-modal');
            const bg = document.getElementById('modal-bg');
            const content = document.getElementById('modal-content');
            modal.classList.remove('hidden');
            
            if(historyData && historyData.length > 0) renderMainChart(historyData, asset.price);
            else if(chartInstance) chartInstance.destroy();

            setTimeout(() => {
                bg.classList.remove('opacity-0');
                content.classList.remove('translate-y-full', 'opacity-0');
                if(window.innerWidth >= 640) content.classList.remove('sm:translate-y-10');
            }, 10);
        }

        function renderMainChart(data, currentPrice) {
            const ctx = document.getElementById('mainChart').getContext('2d');
            let chartData = data;
            const isUp = chartData[chartData.length-1] >= chartData[0];
            const color = isUp ? '#10b981' : '#ef4444';

            if(chartInstance) chartInstance.destroy();

            const gradient = ctx.createLinearGradient(0, 0, 0, 160);
            gradient.addColorStop(0, isUp ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)');
            gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

            chartInstance = new Chart(ctx, {
                type: 'line',
                data: { labels: chartData.map((_, i) => i), datasets: [{ data: chartData, borderColor: color, borderWidth: 3, backgroundColor: gradient, fill: true, pointRadius: 0, tension: 0.4 }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: false, tooltip: { enabled: true, mode: 'index', intersect: false } }, scales: { x: { display: false }, y: { display: false } }, interaction: { mode: 'nearest', axis: 'x', intersect: false }, animation: { duration: 800 } }
            });
        }

        function closeTradeModal() {
            const modal = document.getElementById('trade-modal');
            const bg = document.getElementById('modal-bg');
            const content = document.getElementById('modal-content');
            
            bg.classList.add('opacity-0');
            content.classList.add('translate-y-full', 'opacity-0');
            if(window.innerWidth >= 640) content.classList.add('sm:translate-y-10');

            setTimeout(() => {
                modal.classList.add('hidden');
                selectedAsset = null;
            }, 300);
        }

        function updateTotal() { 
            if(!selectedAsset) return; 
            const val = parseFloat(document.getElementById('trade-amount').value) || 0; 
            document.getElementById('trade-total').innerText = '$' + (val * selectedAsset.price).toLocaleString('de-DE', {minimumFractionDigits: 2}); 
        }

        async function executeTrade(action) {
            if(!selectedAsset) return;
            const qty = parseFloat(document.getElementById('trade-amount').value);
            if(!qty || qty <= 0) return alert("Ungültige Menge");
            const endpoint = selectedAsset.type === 'stock' ? `${API_URL}/api/stonks/${action}` : `${API_URL}/api/finance/trade`;
            const body = selectedAsset.type === 'stock' ? { productId: selectedAsset.id, quantity: qty } : { coinId: selectedAsset.id, amount: qty, type: action };
            try {
                const res = await fetch(endpoint, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body), credentials: 'include' });
                const d = await res.json();
                if(res.ok) { alert(d.message); closeTradeModal(); loadPortfolio(); } else { alert(d.error); }
            } catch(e) { alert("Verbindungsfehler"); }
        }

        function switchTab(t) {
            currentTab = t;
            ['market', 'crypto', 'portfolio'].forEach(x => {
                document.getElementById(`view-${x}`).classList.add('hidden');
                document.getElementById(`btn-${x}`).classList.remove('active', 'text-white');
            });
            document.getElementById(`view-${t}`).classList.remove('hidden');
            document.getElementById(`btn-${t}`).classList.add('active', 'text-white');
            if(t === 'market' && marketData.stocks.length > 0 && document.getElementById('stock-search').value === "") renderStocks(marketData.stocks);
            if(t === 'portfolio') { renderPortfolio(); }
            if(t === 'crypto') renderCrypto();
        }
    