
        // API Base URL aktualisiert auf deinen Produktions-Server
        const API_BASE = 'https://api.limazon.v6.rocks/api'; 

        document.addEventListener('DOMContentLoaded', () => {
            fetchDashboardData();
            setInterval(fetchDashboardData, 30000); 
        });

        async function fetchDashboardData() {
            await Promise.all([loadMyChildren(), loadOrphans()]);
        }

        // Gradient Farben für die Balken
        function getGradientForValue(value) {
            if (value > 60) return 'linear-gradient(90deg, #059669, #10b981)'; // Grün
            if (value > 25) return 'linear-gradient(90deg, #d97706, #f59e0b)'; // Gelb
            return 'linear-gradient(90deg, #b91c1c, #ef4444)'; // Rot
        }

        function showToast(message, isError = false) {
            const toast = document.getElementById('toast');
            toast.textContent = message;
            toast.style.borderLeftColor = isError ? 'var(--danger)' : 'var(--primary)';
            toast.style.display = 'block';
            setTimeout(() => { toast.style.display = 'none'; }, 4000);
        }

        async function loadMyChildren() {
            try {
                const res = await fetch(`${API_BASE}/tinda/my-children`, { credentials: 'include' });
                if (!res.ok) throw new Error("Nicht eingeloggt oder Serverfehler");
                const data = await res.json();
                
                const grid = document.getElementById('children-grid');
                grid.innerHTML = ''; 

                if (!data.children || data.children.length === 0) {
                    grid.innerHTML = '<div class="empty-state">Du hast aktuell keine Kinder. Zeit, auf Tinda aktiv zu werden!</div>';
                    document.body.classList.remove('siren-active');
                    document.getElementById('jugendamt-warning').style.display = 'none';
                    return;
                }

                let isAnyChildCritical = false;

                data.children.forEach(child => {
                    if (child.isCritical) isAnyChildCritical = true;

                    // SICHERHEITS-CHECK: Werte streng zwischen 0 und 100 einklemmen!
                    const safeHunger = Math.min(100, Math.max(0, child.hunger));
                    const safeFun = Math.min(100, Math.max(0, child.fun));

                    const card = document.createElement('div');
                    card.className = 'card';
                    card.innerHTML = `
                        <h3>${child.name}</h3>
                        <div class="partner-name">Mit: ${child.partnerName}</div>
                        
                        <div class="bar-container" title="Hunger">
                            <div class="bar-fill" style="width: ${safeHunger}%; background: ${getGradientForValue(safeHunger)};"></div>
                            <span class="bar-label">Hunger</span>
                            <span class="bar-value">${safeHunger}%</span>
                        </div>

                        <div class="bar-container" title="Spaß">
                            <div class="bar-fill" style="width: ${safeFun}%; background: ${getGradientForValue(safeFun)};"></div>
                            <span class="bar-label">Zuneigung</span>
                            <span class="bar-value">${safeFun}%</span>
                        </div>

                        <div class="btn-group">
                            <button class="btn-feed" onclick="feedChild('${child.chatId}')">🍼 Füttern ($50)</button>
                            <button class="btn-chat" onclick="openChat('${child.chatId}')">💬 Kümmern</button>
                        </div>
                    `;
                    grid.appendChild(card);
                });
                
                if (isAnyChildCritical) {
                    document.body.classList.add('siren-active');
                    document.getElementById('jugendamt-warning').style.display = 'block';
                } else {
                    document.body.classList.remove('siren-active');
                    document.getElementById('jugendamt-warning').style.display = 'none';
                }

            } catch (err) {
                console.error(err);
                document.getElementById('children-grid').innerHTML = '<div class="empty-state">Fehler beim Laden der Kinder.</div>';
            }
        }

        async function loadOrphans() {
            try {
                const res = await fetch(`${API_BASE}/orphanage/list`, { credentials: 'include' });
                if (!res.ok) throw new Error("Fehler beim Laden");
                const data = await res.json();
                
                const grid = document.getElementById('orphanage-grid');
                grid.innerHTML = '';

                if (!data.orphans || data.orphans.length === 0) {
                    grid.innerHTML = '<div class="empty-state">Das Kinderheim ist leer. Alle Kinder haben ein gutes Zuhause!</div>';
                    return;
                }

                data.orphans.forEach(orphan => {
                    const card = document.createElement('div');
                    card.className = 'card';
                    card.innerHTML = `
                        <h3>🧸 ${orphan.childName}</h3>
                        <div class="partner-name">Gerettet vor: ${orphan.originalParentName}</div>
                        <p style="font-size: 0.85rem; margin: 5px 0; color: var(--text-muted);">
                            Vom Jugendamt gesichert am:<br>
                            ${new Date(orphan.takenAwayAt).toLocaleString('de-DE')}
                        </p>
                        <div class="btn-group">
                            <button class="btn-adopt" onclick="adoptChild('${orphan._id}')">🏡 Adoptieren ($10k)</button>
                        </div>
                    `;
                    grid.appendChild(card);
                });

            } catch (err) {
                console.error(err);
                document.getElementById('orphanage-grid').innerHTML = '<div class="empty-state">Fehler beim Laden des Adoptionscenters.</div>';
            }
        }

        async function feedChild(chatId) {
            try {
                const res = await fetch(`${API_BASE}/tinda/child/${chatId}/feed`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include'
                });
                const data = await res.json();
                
                if (res.ok) {
                    showToast(data.message);
                    loadMyChildren(); 
                } else {
                    showToast(data.error, true);
                }
            } catch (err) {
                showToast("Fehler bei der Verbindung zum Server.", true);
            }
        }

        async function adoptChild(orphanId) {
            if (!confirm("Bist du sicher, dass du dieses Kind adoptieren willst? Die Gebühr beträgt $10.000.")) return;

            try {
                const res = await fetch(`${API_BASE}/orphanage/adopt`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ orphanId })
                });
                const data = await res.json();
                
                if (res.ok) {
                    showToast(data.message);
                    fetchDashboardData(); 
                } else {
                    showToast(data.error, true);
                }
            } catch (err) {
                showToast("Fehler bei der Verbindung zum Server.", true);
            }
        }

        function openChat(chatId) {
            // Leitet direkt zur Tinda Seite weiter und übergibt die Chat ID in der URL
            window.location.href = `/themes/tinda.html?chatId=${chatId}`;
        }
    