
        // API ENDPOINTS
        const BASE_URL = 'https://api.limazon.v6.rocks';
        const API_STATS = `${BASE_URL}/api/system/stats`;
        const API_PRODUCTS = `${BASE_URL}/api/products`;
        const API_HISTORY_BASE = `${BASE_URL}/api/products/`;
        const API_USERS = `${BASE_URL}/api/admin/users`; 
        const API_HUMANS = `${BASE_URL}/api/human/list`;
        const API_WHEELS = `${BASE_URL}/api/wheels/public`;

        // GLOBALE VARIABLEN
        let allProducts = [];
        let filteredProducts = [];
        let chartInstance = null;
        let currentPage = 1;
        const ITEMS_PER_PAGE = 12;

        let currentModalData = [];
        let currentModalType = '';

        const COLOR_UP = '#10b981'; const COLOR_DOWN = '#ef4444'; const COLOR_NEUTRAL = '#6366f1';

        // --- EASTER EGG LOGIK: KONAMI CODE ---
        const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
        let konamiIndex = 0;
        document.addEventListener('keydown', (e) => {
            if (e.key === konamiCode[konamiIndex]) {
                konamiIndex++;
                if (konamiIndex === konamiCode.length) {
                    activateMatrixMode();
                    konamiIndex = 0;
                }
            } else { konamiIndex = 0; }
        });

        function activateMatrixMode() {
            // 1. Das Kaninchen erscheint kurz
            const rabbit = document.getElementById('white-rabbit');
            rabbit.style.opacity = "1";
            
            // 2. Nach 1.5 Sekunden startet die Matrix
            setTimeout(() => {
                rabbit.style.opacity = "0";
                document.body.classList.add('matrix-active');
                document.getElementById('system-status-text').innerText = "SIMULATION ACTIVE";
                document.getElementById('top-gradient').classList.replace('from-indigo-900/20', 'from-emerald-900/50');
                showToast("Matrix Modus aktiviert. Folge dem weißen Kaninchen.", "emerald", "🐇");
                startMatrixRain();
            }, 1500);
        }

        // --- EASTER EGG LOGIK: RAGE CLICK (Jetzt auf dem Diagramm selbst) ---
        let rageClicks = 0;
        let rageTimer;
        function handleRageClick() {
            rageClicks++;
            clearTimeout(rageTimer);
            
            // Bei 5 Klicks im Diagramm rastet der Bildschirm aus
            if (rageClicks >= 5) {
                document.body.classList.add('animate-shake');
                showToast("Beruhig dich! Klicks bringen den Kurs auch nicht wieder hoch. 📉", "red", "⚠️");
                setTimeout(() => document.body.classList.remove('animate-shake'), 500);
                rageClicks = 0;
            } else {
                rageTimer = setTimeout(() => rageClicks = 0, 800);
            }
        }

        function showToast(msg, color = "red", icon = "⚠️") {
            const toast = document.getElementById('toast');
            document.getElementById('toast-message').innerText = msg;
            document.getElementById('toast-icon').innerText = icon;
            toast.className = `fixed bottom-[-100px] left-1/2 transform -translate-x-1/2 border text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 z-[100] backdrop-blur-md opacity-0 font-bold ${color === 'red' ? 'bg-red-900/90 border-red-500' : 'bg-emerald-900/90 border-emerald-500'}`;
            
            toast.style.bottom = "40px";
            toast.style.opacity = "1";
            setTimeout(() => { toast.style.bottom = "-100px"; toast.style.opacity = "0"; }, 3500);
        }

        // --- NORMALER CODE START ---
        function animateValue(obj, start, end, duration) {
            let startTimestamp = null;
            const step = (timestamp) => {
                if (!startTimestamp) startTimestamp = timestamp;
                const progress = Math.min((timestamp - startTimestamp) / duration, 1);
                obj.innerHTML = Math.floor(progress * (end - start) + start).toLocaleString();
                if (progress < 1) { window.requestAnimationFrame(step); }
            };
            window.requestAnimationFrame(step);
        }

        async function loadStats() {
            try {
                const res = await fetch(API_STATS);
                const d = await res.json();
                document.getElementById('stat-loc-total').innerText = d.loc.total.toLocaleString();
                document.getElementById('stat-loc-server').innerText = d.loc.server.toLocaleString();
                document.getElementById('stat-loc-front').innerText = d.loc.frontend.toLocaleString();
                animateValue(document.getElementById('stat-users'), 0, d.users, 1000);
                animateValue(document.getElementById('stat-products'), 0, d.products, 1000);
                animateValue(document.getElementById('stat-humans'), 0, d.humans, 1000);
                animateValue(document.getElementById('stat-wheels'), 0, d.wheels, 1000);
            } catch(e) { console.error(e); }
        }

        async function loadProducts() {
            try {
                const res = await fetch(API_PRODUCTS);
                const d = await res.json();
                allProducts = d.products.filter(p => !p.isTokenCard);
                applyMainSearch(); 
            } catch(e) { console.error(e); }
        }

        function applyMainSearch() {
            const term = document.getElementById('searchInput').value.toLowerCase();
            
            // EASTER EGG 2: ID-1337 GEISTER-AKTIE
            if (term === '1337' || term === 'liminati') {
                renderSecretStock();
                return;
            }

            filteredProducts = allProducts.filter(p => p.name.toLowerCase().includes(term) || p.id.toString().includes(term));
            document.getElementById('result-count').innerText = `${filteredProducts.length} gefunden`;
            document.getElementById('pagination-controls').style.display = 'flex';
            renderPage();
        }

        function renderSecretStock() {
            const grid = document.getElementById('product-grid');
            grid.innerHTML = '';
            document.getElementById('result-count').innerText = "1 Geheimnis gefunden";
            document.getElementById('pagination-controls').style.display = 'none';

            const card = document.createElement('div');
            card.className = "stat-card bg-purple-900/50 border border-purple-500 p-4 rounded-xl flex items-center gap-4 cursor-pointer shadow-glow-green";
            card.onclick = () => openSecretChart();

            card.innerHTML = `
                <div class="w-12 h-12 rounded-lg bg-black border border-purple-500 flex items-center justify-center text-2xl">👁️</div>
                <div class="flex-1 min-w-0">
                    <div class="font-bold text-white truncate text-purple-300">Limo Server-Anteile</div>
                    <div class="text-xs text-purple-400">ID: 1337</div>
                </div>
                <div class="flex items-stretch gap-3 text-right">
                    <div>
                        <div class="font-mono text-emerald-400 font-bold">∞ USD</div>
                        <div class="text-xs text-emerald-400 opacity-80 animate-pulse">TO THE MOON 🚀</div>
                    </div>
                    <div class="w-1.5 rounded-full bg-emerald-500 shadow-glow-green"></div>
                </div>
            `;
            grid.appendChild(card);
        }

        function openSecretChart() {
            document.getElementById('chart-modal').classList.remove('hidden');
            document.getElementById('chart-title').innerText = "Limo Server-Anteile (ID: 1337)";
            document.getElementById('chart-subtitle').innerText = "Server-Herzschlag (Anomalie entdeckt)";
            document.getElementById('chart-container').innerHTML = '';

            const secretData = [];
            let time = Date.now() - 300000;
            for(let i=0; i<30; i++) {
                const val = Math.sin(i) * 100 + 1000;
                secretData.push({ x: time + (i*10000), y: val });
            }

            if (chartInstance) chartInstance.destroy();

            chartInstance = new ApexCharts(document.querySelector("#chart-container"), {
                series: [{ name: 'Server Pulse', data: secretData }],
                chart: { type: 'area', height: 320, background: 'transparent', toolbar: { show: false }, animations: { enabled: true, easing: 'linear', dynamicAnimation: { speed: 1000 } } },
                theme: { mode: 'dark' },
                stroke: { curve: 'smooth', width: 3, colors: ['#a855f7'] },
                fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.2, stops: [0, 100], colorStops: [{ offset: 0, color: '#a855f7', opacity: 0.8 }, { offset: 100, color: '#000000', opacity: 0 }] } },
                grid: { borderColor: '#334155', strokeDashArray: 4 },
                xaxis: { type: 'datetime', labels: { style: { colors: '#94a3b8' } } },
                yaxis: { labels: { style: { colors: '#94a3b8' } }, tooltip: { enabled: true } },
                dataLabels: { enabled: false }
            });
            chartInstance.render();
        }

        function renderPage() {
            const grid = document.getElementById('product-grid');
            grid.innerHTML = '';
            const productsToShow = filteredProducts.slice((currentPage - 1) * ITEMS_PER_PAGE, ((currentPage - 1) * ITEMS_PER_PAGE) + ITEMS_PER_PAGE);

            if(productsToShow.length === 0) {
                grid.innerHTML = '<div class="text-slate-500 text-center col-span-full py-12">Keine Produkte.</div>';
            } else {
                productsToShow.forEach(prod => {
                    const card = document.createElement('div');
                    card.className = "stat-card bg-slate-800/50 border border-slate-700 p-4 rounded-xl flex items-center gap-4 cursor-pointer";
                    card.onclick = () => openChart(prod.id);
                    
                    const currentPrice = prod.currentPrice !== undefined ? prod.currentPrice : 0;
                    let previousPrice = prod.basePrice !== undefined ? prod.basePrice : currentPrice;
                    if (prod.priceHistory && prod.priceHistory.length > 1) {
                        previousPrice = prod.priceHistory[prod.priceHistory.length - 2].price;
                    }

                    const isPositiveTrend = currentPrice >= previousPrice; 
                    let changePercent = previousPrice > 0 ? ((currentPrice - previousPrice) / previousPrice) * 100 : 0;

                    const trendColorText = isPositiveTrend ? 'text-emerald-400' : 'text-red-400';
                    const trendBarBg = isPositiveTrend ? 'bg-emerald-500' : 'bg-red-500';
                    const trendShadow = isPositiveTrend ? 'shadow-glow-green' : 'shadow-glow-red';

                    card.innerHTML = `
                        <img src="${prod.image_url}" class="w-12 h-12 rounded-lg object-cover bg-slate-900 border border-slate-700">
                        <div class="flex-1 min-w-0">
                            <div class="font-bold text-white truncate">${prod.name}</div>
                            <div class="text-xs text-slate-400">ID: ${prod.id}</div>
                        </div>
                        <div class="flex items-stretch gap-3 text-right">
                            <div>
                                <div class="font-mono ${trendColorText} font-bold">$${currentPrice.toFixed(2)}</div>
                                <div class="text-xs ${trendColorText} opacity-80">${isPositiveTrend ? '▲' : '▼'} ${Math.abs(changePercent).toFixed(1)}%</div>
                            </div>
                            <div class="w-1.5 rounded-full ${trendBarBg} ${trendShadow}"></div>
                        </div>
                    `;
                    grid.appendChild(card);
                });
            }
            updatePaginationControls();
        }

        function updatePaginationControls() {
            const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE) || 1;
            if (currentPage > totalPages) currentPage = totalPages;
            document.getElementById('page-current').innerText = currentPage;
            document.getElementById('page-total').innerText = totalPages;
            document.getElementById('btn-prev').disabled = (currentPage === 1);
            document.getElementById('btn-next').disabled = (currentPage >= totalPages);
        }

        function changePage(step) {
            currentPage += step;
            renderPage();
            document.getElementById('searchInput').scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        document.getElementById('searchInput').addEventListener('input', () => {
            currentPage = 1; 
            applyMainSearch();
        });

        // --- NORMALES CHART ÖFFNEN ---
        async function openChart(productId) {
            document.getElementById('chart-modal').classList.remove('hidden');
            document.getElementById('chart-title').innerText = "Lade Daten...";
            document.getElementById('chart-subtitle').innerText = "Live Aktienkurs-Verlauf";
            document.getElementById('chart-container').innerHTML = '';

            try {
                const res = await fetch(`${API_HISTORY_BASE}${productId}/history`);
                const data = await res.json();
                document.getElementById('chart-title').innerText = data.name;

                const chartData = data.history.map(entry => ({ x: new Date(entry.timestamp).getTime(), y: entry.price }));

                let chartColor = COLOR_NEUTRAL;
                if (chartData.length > 1) {
                    chartColor = chartData[chartData.length - 1].y >= chartData[chartData.length - 2].y ? COLOR_UP : COLOR_DOWN;
                }

                if (chartInstance) chartInstance.destroy();

                chartInstance = new ApexCharts(document.querySelector("#chart-container"), {
                    series: [{ name: 'Preis ($)', data: chartData }],
                    chart: { type: 'area', height: 320, background: 'transparent', toolbar: { show: false }, animations: { enabled: false } },
                    theme: { mode: 'dark' },
                    stroke: { curve: 'smooth', width: 3, colors: [chartColor] },
                    fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.5, opacityTo: 0.1, stops: [0, 90, 100], colorStops: [{ offset: 0, color: chartColor, opacity: 0.6 }, { offset: 100, color: chartColor, opacity: 0.1 }] } },
                    grid: { borderColor: '#334155', strokeDashArray: 4 },
                    xaxis: { type: 'datetime', labels: { style: { colors: '#94a3b8' } } },
                    yaxis: { labels: { formatter: (value) => "$" + value.toFixed(2), style: { colors: '#94a3b8' } }, tooltip: { enabled: true } },
                    dataLabels: { enabled: false }
                });
                chartInstance.render();

            } catch(e) { document.getElementById('chart-title').innerText = "Fehler beim Laden des Charts"; }
        }

        function closeChartModal() { document.getElementById('chart-modal').classList.add('hidden'); }

        // --- DATA MODAL & SUCHEN ---
        async function openDataModal(type) {
            const modal = document.getElementById('data-modal');
            const listContainer = document.getElementById('data-list-container');
            const title = document.getElementById('data-modal-title');
            const icon = document.getElementById('data-modal-icon');
            const subtitle = document.getElementById('data-modal-subtitle');
            const searchInput = document.getElementById('modalSearchInput');

            modal.classList.remove('hidden');
            searchInput.value = '';
            listContainer.innerHTML = '<div class="text-center py-12 text-slate-500 animate-pulse">Lade Datenbank...</div>';
            currentModalType = type;

            try {
                if (type === 'products') { icon.innerText = "🛒"; title.innerText = "Alle Produkte"; subtitle.innerText = "Shop Inventar"; currentModalData = allProducts; } 
                else if (type === 'humans') { icon.innerText = "🎓"; title.innerText = "Alle Humans"; subtitle.innerText = "Human Grades Personen"; const res = await fetch(API_HUMANS); const data = await res.json(); currentModalData = data.humans || []; } 
                else if (type === 'wheels') { icon.innerText = "🎡"; title.innerText = "Glücksräder"; subtitle.innerText = "Öffentliche Glücksräder"; const res = await fetch(API_WHEELS); const data = await res.json(); currentModalData = data.wheels || []; } 
                else if (type === 'users') { icon.innerText = "👥"; title.innerText = "Alle Benutzer"; subtitle.innerText = "Registrierte Limazon Accounts"; const res = await fetch(API_USERS, { credentials: 'include' }); if (res.status === 401 || res.status === 403) { listContainer.innerHTML = `<div class="text-center py-12 text-red-400 bg-red-900/20 rounded-xl p-6">🔒 Zugriff verweigert.</div>`; return; } const data = await res.json(); currentModalData = data.users || []; }
                renderDataList(currentModalData, currentModalType);
            } catch (err) { listContainer.innerHTML = '<div class="text-center py-12 text-red-500">Fehler beim Laden.</div>'; }
        }

        document.getElementById('modalSearchInput').addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filteredData = currentModalData.filter(item => {
                if (currentModalType === 'users') return item.username.toLowerCase().includes(term);
                if (currentModalType === 'humans') return item.name.toLowerCase().includes(term);
                if (currentModalType === 'wheels') return item.name.toLowerCase().includes(term);
                if (currentModalType === 'products') return item.name.toLowerCase().includes(term) || item.id.toString().includes(term);
                return false;
            });
            renderDataList(filteredData, currentModalType);
        });

        function renderDataList(items, type) {
            const listContainer = document.getElementById('data-list-container');
            listContainer.innerHTML = '';
            if (items.length === 0) { listContainer.innerHTML = '<div class="text-center py-12 text-slate-500">Keine Einträge gefunden.</div>'; return; }

            items.forEach(item => {
                const row = document.createElement('div');
                row.className = "bg-slate-800 p-4 rounded-lg border border-slate-700 flex justify-between items-center";
                if (type === 'users') { row.innerHTML = `<div><div class="font-bold text-white">${item.username}</div><div class="text-xs text-slate-400">ID: ${item._id}</div></div><div class="text-right"><div class="text-emerald-400 font-mono">$${(item.balance || 0).toLocaleString()}</div></div>`; } 
                else if (type === 'humans') { row.innerHTML = `<div><div class="font-bold text-white">${item.name}</div></div><div class="text-right text-indigo-400 font-bold">∅ ${(item.totalAverage || 0).toFixed(2)}</div>`; } 
                else if (type === 'wheels') { row.innerHTML = `<div><div class="font-bold text-white">${item.name}</div></div><div class="text-right text-white font-mono">${item.totalSpins || 0} Spins</div>`; } 
                else if (type === 'products') { row.innerHTML = `<div class="flex items-center gap-3"><img src="${item.image_url}" class="w-10 h-10 rounded object-cover"><div class="font-bold text-white">${item.name}</div></div><div class="text-emerald-400 font-mono">$${(item.currentPrice || 0).toFixed(2)}</div>`; }
                listContainer.appendChild(row);
            });
        }

        function closeDataModal() { document.getElementById('data-modal').classList.add('hidden'); }

        // --- MATRIX RAIN JS ---
        function startMatrixRain() {
            const canvas = document.getElementById('matrix-canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            const letters = 'LIMAZON133701';
            const fontSize = 16;
            const columns = canvas.width / fontSize;
            const drops = Array(Math.floor(columns)).fill(1);

            function draw() {
                ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#0F0';
                ctx.font = fontSize + 'px monospace';
                for (let i = 0; i < drops.length; i++) {
                    const text = letters[Math.floor(Math.random() * letters.length)];
                    ctx.fillText(text, i * fontSize, drops[i] * fontSize);
                    if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
                    drops[i]++;
                }
            }
            setInterval(draw, 33);
        }

        setInterval(async () => {
            try {
                const resStats = await fetch(API_STATS);
                const d = await resStats.json();
                document.getElementById('stat-users').innerText = d.users.toLocaleString();
                document.getElementById('stat-products').innerText = d.products.toLocaleString();
                document.getElementById('stat-humans').innerText = d.humans.toLocaleString();
                document.getElementById('stat-wheels').innerText = d.wheels.toLocaleString();
            } catch(e) {}
            loadProducts(); 
        }, 15000);

        loadStats();
        loadProducts();
    