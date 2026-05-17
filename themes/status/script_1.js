
        // --- Theme Toggle Logic ---
        const html = document.documentElement;
        const themeToggle = document.getElementById('themeToggle');
        const themeIcon = document.getElementById('themeIcon');

        if (localStorage.theme === 'light' || (!('theme' in localStorage) && !window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            html.classList.remove('dark');
            themeIcon.textContent = '☀️';
        }

        themeToggle.addEventListener('click', () => {
            html.classList.toggle('dark');
            const isDark = html.classList.contains('dark');
            localStorage.theme = isDark ? 'dark' : 'light';
            themeIcon.textContent = isDark ? '🌙' : '☀️';
        });

        // --- Chart.js Setup ---
        const MAX_DATA_POINTS = 20; // Zeigt die letzten X Ticks an
        let cpuChartInstance = null;
        let ramChartInstance = null;
        
        // Globale Daten-Arrays für die Graphen
        const timeLabels = [];
        const cpuOverallData = [];
        const coreDatasetsMap = {}; // Speichert die Daten-Arrays für jeden Kern dynamisch
        const ramData = [];

        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 0 }, // Animation aus für flüssiges Polling
            
            interaction: {
                mode: 'index',
                intersect: false,
            },
            
            scales: {
                y: { min: 0, max: 100, grid: { color: 'rgba(139, 148, 158, 0.15)' } },
                x: { grid: { display: false } }
            },
            plugins: {
                legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } },
                
                tooltip: {
                    enabled: true,
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': ' + context.parsed.y + '%';
                        }
                    }
                }
            },
            elements: { 
                point: { 
                    radius: 0,           // Punkt im Normalzustand unsichtbar
                    hitRadius: 10,       // Trefferfläche für die Maus
                    hoverRadius: 4       // Punkt taucht auf, wenn man drüberfährt
                } 
            } 
        };

        // Farbpalette für dynamische Kerne
        const coreColors = ['#3b82f6', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'];

        // --- Hilfsfunktion: Uptime Formatieren ---
        function formatUptime(seconds) {
            const d = Math.floor(seconds / (3600 * 24));
            const h = Math.floor(seconds % (3600 * 24) / 3600);
            const m = Math.floor(seconds % 3600 / 60);
            return `${d}d ${h}h ${m}m`;
        }

        // --- Fetch & Update Logic ---
        async function fetchStatus() {
            try {
                // Wir nutzen jetzt den neuen Metrics Endpoint
                const res = await fetch('https://api.limazon.v6.rocks/api/status/metrics');
                const data = await res.json();

                const nowStr = new Date(data.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                // UI Banner Updates
                document.getElementById('serviceName').textContent = `Limo Backend (${data.system.platform})`;
                document.getElementById('dbStatus').textContent = data.database.status === 'online' ? 'Online' : 'Fehler';
                document.getElementById('uptime').textContent = formatUptime(data.system.uptime);
                document.getElementById('workers').textContent = data.cluster.workers;
                document.getElementById('lastCheck').textContent = nowStr;

                const dot = document.getElementById('statusDot');
                const statusText = document.getElementById('systemStatusText');
                
                dot.classList.remove('animate-pulse', 'bg-gray-400', 'bg-green-500', 'bg-red-500', 'bg-yellow-500');
                
                if (res.ok) {
                    dot.classList.add('bg-green-500');
                    statusText.textContent = 'System online & Metriken aktiv';
                    statusText.className = 'text-xl font-semibold text-green-600 dark:text-green-400';
                } else {
                    throw new Error("Bad Response");
                }

                // --- DATEN FÜR GRAPHEN AUFBEREITEN ---
                
                // Labels rotieren
                timeLabels.push(nowStr);
                if (timeLabels.length > MAX_DATA_POINTS) timeLabels.shift();

                // RAM aktualisieren
                ramData.push(data.memory.percent);
                if (ramData.length > MAX_DATA_POINTS) ramData.shift();
                
                document.getElementById('ramDetails').textContent = 
                    `Gesamt: ${(data.memory.totalBytes / 1024 / 1024 / 1024).toFixed(1)} GB | Genutzt: ${(data.memory.usedBytes / 1024 / 1024 / 1024).toFixed(1)} GB | Node.js Prozess: ${data.memory.nodeProcessMB} MB`;

                // RAM Chart initialisieren/updaten
                if (!ramChartInstance) {
                    const ctxRam = document.getElementById('ramChart').getContext('2d');
                    ramChartInstance = new Chart(ctxRam, {
                        type: 'line',
                        data: {
                            labels: timeLabels,
                            datasets: [{
                                label: 'RAM Auslastung',
                                data: ramData,
                                borderColor: '#f59e0b',
                                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                                fill: true,
                                tension: 0.4,
                                borderWidth: 2
                            }]
                        },
                        options: chartOptions
                    });
                } else {
                    ramChartInstance.update();
                }

                // CPU aktualisieren
                cpuOverallData.push(data.cpu.overallPercent);
                if (cpuOverallData.length > MAX_DATA_POINTS) cpuOverallData.shift();

                // CPU Chart Initialisieren (geschieht nur beim ersten erfolgreichen Fetch)
                if (!cpuChartInstance) {
                    const cpuDatasets = [
                        {
                            label: 'Gesamt CPU',
                            data: cpuOverallData,
                            borderColor: '#ef4444',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            borderWidth: 3,
                            fill: true,
                            tension: 0.3
                        }
                    ];

                    // Für jeden Kern ein eigenes Dataset erstellen
                    data.cpu.cores.forEach((core, idx) => {
                        coreDatasetsMap[core.coreId] = [core.percent];
                        cpuDatasets.push({
                            label: `Core ${core.coreId}`,
                            data: coreDatasetsMap[core.coreId],
                            borderColor: coreColors[idx % coreColors.length],
                            borderWidth: 1.5,
                            borderDash: [5, 5], // Gestrichelte Linien für die Cores zur besseren Unterscheidung
                            tension: 0.3,
                            fill: false
                        });
                    });

                    const ctxCpu = document.getElementById('cpuChart').getContext('2d');
                    cpuChartInstance = new Chart(ctxCpu, {
                        type: 'line',
                        data: {
                            labels: timeLabels,
                            datasets: cpuDatasets
                        },
                        options: chartOptions
                    });
                } else {
                    // Wenn Chart schon existiert, nur Arrays updaten
                    data.cpu.cores.forEach(core => {
                        if(coreDatasetsMap[core.coreId]) {
                            coreDatasetsMap[core.coreId].push(core.percent);
                            if (coreDatasetsMap[core.coreId].length > MAX_DATA_POINTS) {
                                coreDatasetsMap[core.coreId].shift();
                            }
                        }
                    });
                    cpuChartInstance.update();
                }

            } catch (error) {
                console.error("Fetch Error:", error);
                const dot = document.getElementById('statusDot');
                dot.classList.remove('animate-pulse', 'bg-gray-400', 'bg-green-500', 'bg-yellow-500');
                dot.classList.add('bg-red-500');
                
                const statusText = document.getElementById('systemStatusText');
                statusText.textContent = 'Schwerer Systemausfall (Offline)';
                statusText.className = 'text-xl font-semibold text-red-600 dark:text-red-500';
                
                document.getElementById('dbStatus').textContent = 'Keine Verbindung';
            }
        }

        // Initialer Fetch und dann Polling alle 3 Sekunden (wie beim Backend gefordert)
        fetchStatus();
        setInterval(fetchStatus, 3000);
    