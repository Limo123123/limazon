
        const API = 'https://api.limazon.v6.rocks/api';

        const SKIN_COLORS = [
            { id: 'c_red', hex: '#c51111', price: 0, name: 'Klassisch Rot' },
            { id: 'c_blue', hex: '#132ed1', price: 0, name: 'Dunkelblau' },
            { id: 'c_green', hex: '#117f2d', price: 0, name: 'Dunkelgrün' },
            { id: 'c_pink', hex: '#ed54ba', price: 500, name: 'Hot Pink' },
            { id: 'c_orange', hex: '#ef7d0d', price: 500, name: 'Orange' },
            { id: 'c_yellow', hex: '#f5f557', price: 500, name: 'Gelb' },
            { id: 'c_black', hex: '#3f474e', price: 1500, name: 'Schwarz' },
            { id: 'c_white', hex: '#d6e0f0', price: 1500, name: 'Weiß' },
            { id: 'c_purple', hex: '#6b2fbb', price: 2000, name: 'Lila' },
            { id: 'c_cyan', hex: '#38fedc', price: 2000, name: 'Cyan' },
            { id: 'c_gold', hex: '#ffd700', price: 50000, name: 'Solid Gold' }
        ];

        const MAP_SIZES = {
            'carton': { w: 1000, h: 1000 },
            'trailer': { w: 1500, h: 1000 },
            'apartment': { w: 2000, h: 1500 },
            'mansion': { w: 3000, h: 2000 },
            'island': { w: 4000, h: 4000 }
        };

        let currentTab = 'limea_shop';
        let currentMode = 'build';
        let userBalance = 0;

        let limeaCatalog = [];
        let limeaInventory = {};

        let playerSettings = JSON.parse(localStorage.getItem('au_settings')) || {
            color: '#c51111',
            unlockedColors: ['c_red', 'c_blue', 'c_green']
        };

        let placedItems = [];
        let selectedItem = null;
        let isDragging = false, dragTarget = null, startX, startY, initialX, initialY;
        let isPanning = false, panStartX, panStartY, scrollLeftStart, scrollTopStart;

        // Feedback System
        function showToast(msg, type = 'success') {
            const toast = document.getElementById('toast');
            toast.innerText = msg;
            toast.className = `toast show ${type === 'error' ? 'error' : ''}`;
            setTimeout(() => { toast.classList.remove('show'); }, 3000);
        }

        async function fetchApi(endpoint, method = 'GET', body = null) {
            const options = { method, headers: { 'Content-Type': 'application/json' }, credentials: 'include' };
            if (body) options.body = JSON.stringify(body);
            const res = await fetch(API + endpoint, options);
            return await res.json();
        }

        async function init() {
            try {
                const data = await fetchApi('/limea/editor-data');
                if (data.error) { alert(data.error); window.location.href = '/'; return; }

                userBalance = data.balance;
                document.getElementById('bal-display').innerText = `$${userBalance.toLocaleString()}`;

                limeaCatalog = data.catalog || [];
                data.inventory.forEach(inv => { limeaInventory[inv.productId] = inv.quantityOwned; });

                const houseId = data.home ? data.home.id : 'apartment';
                const size = MAP_SIZES[houseId] || MAP_SIZES['apartment'];
                const roomEl = document.getElementById('room');
                roomEl.style.width = size.w + 'px';
                roomEl.style.height = size.h + 'px';

                const homeData = await fetchApi('/realestate/my-home');
                if (homeData.hasHome && homeData.amongUsMap) {
                    homeData.amongUsMap.forEach(itemData => {
                        if (limeaInventory[itemData.id] && limeaInventory[itemData.id] > 0) {
                            limeaInventory[itemData.id]--;
                            spawnElementDOM(itemData.id, itemData.uid, itemData.x, itemData.y, itemData.r);
                        }
                    });
                }

                renderSidebar();
                setupPanTool();

                document.getElementById('editor-area').addEventListener('pointerdown', (e) => {
                    if (e.target.id === 'editor-area' || e.target.id === 'room') deselectAll();
                });

                document.getElementById('loading').style.display = 'none';
            } catch (e) {
                document.getElementById('loading').style.display = 'none';
                console.error("Init Error", e);
            }
        }

        function updateBalance(amount) {
            userBalance += amount;
            document.getElementById('bal-display').innerText = `$${userBalance.toLocaleString()}`;
        }

        function switchTab(tab) {
            currentTab = tab;
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.getElementById(`tab-${tab}`).classList.add('active');

            document.getElementById('editor-tools').style.display = (tab === 'limea_shop' || tab === 'inv' || tab === 'mapstore') ? 'flex' : 'none';
            renderSidebar();
        }

        async function renderSidebar() {
            const list = document.getElementById('sidebar-list');
            list.innerHTML = '';

            if (currentTab === 'limea_shop') {
                limeaCatalog.forEach(item => {
                    list.innerHTML += `
                        <div class="list-item">
                            <div class="item-icon">${item.icon}</div>
                            <div class="item-details">
                                <div class="item-name">${item.name}</div>
                                <div style="color:#fbc02d; font-size:0.85rem; font-weight:bold;">$${item.price}</div>
                            </div>
                            <div class="buy-area">
                                <input type="number" id="qty-${item.id}" value="1" min="1" max="99">
                                <button class="btn-buy" onclick="buyItem('${item.id}')">Kaufen</button>
                            </div>
                        </div>
                    `;
                });
            }
            else if (currentTab === 'inv') {
                let hasItems = false;
                limeaCatalog.forEach(item => {
                    const qty = limeaInventory[item.id] || 0;
                    if (qty > 0) {
                        hasItems = true;
                        list.innerHTML += `
                            <div class="list-item">
                                <div class="item-icon">${item.icon}</div>
                                <div class="item-details">
                                    <div class="item-name">${item.name}</div>
                                    <div style="color:#aaa; font-size:0.8rem">Im Lager: ${qty}x</div>
                                </div>
                                <button class="btn-place" onclick="placeItem('${item.id}')">Bauen</button>
                            </div>
                        `;
                    }
                });
                if (!hasItems) list.innerHTML = '<div style="color:#888; padding:20px; text-align:center;">Dein Lager ist leer.<br>Geh in den Store!</div>';
            }
            else if (currentTab === 'mapstore') {
                list.innerHTML = '<div style="color:#aaa; text-align:center; margin-top:20px;">Lade Community Maps...</div>';
                try {
                    const storeData = await fetchApi('/limea/layouts');
                    list.innerHTML = '';
                    if (storeData.layouts && storeData.layouts.length > 0) {
                        storeData.layouts.forEach(l => {
                            list.innerHTML += `
                                <div class="store-card">
                                    <div class="store-title">${l.name}</div>
                                    <div class="store-author">Erstellt von: ${l.creatorName}</div>
                                    <button class="btn-buy" style="width:100%" onclick='applyStoreLayout(${JSON.stringify(l.layout)})'>Map laden</button>
                                </div>
                            `;
                        });
                    } else {
                        list.innerHTML = '<div style="color:#888; text-align:center;">Keine Maps im Store gefunden.</div>';
                    }
                } catch (e) { list.innerHTML = '<div style="color:#ff4458; text-align:center;">Fehler beim Laden des Stores.</div>'; }
            }
            else if (currentTab === 'wardrobe') {
                let html = `<div class="wardrobe-container">
                    <div class="character-preview" id="charPreview">
                        <canvas id="previewCanvas" width="100" height="120"></canvas>
                    </div>
                    <h3 style="margin-bottom: 5px;">Wähle deine Farbe</h3>
                    <div class="color-grid">`;

                SKIN_COLORS.forEach(c => {
                    const isUnlocked = playerSettings.unlockedColors.includes(c.id);
                    const isActive = playerSettings.color === c.hex;

                    if (isUnlocked) {
                        html += `<div class="color-swatch ${isActive ? 'active' : ''}" 
                                      style="background-color: ${c.hex};" 
                                      onclick="equipColor('${c.hex}')"
                                      title="${c.name}"></div>`;
                    } else {
                        html += `<div class="color-swatch locked" 
                                      style="background-color: ${c.hex};" 
                                      onclick="switchTab('shop')"
                                      title="Zum Store - ${c.name}"></div>`;
                    }
                });

                html += `</div></div>`;
                list.innerHTML = html;
                drawPreview(playerSettings.color);
            }
            else if (currentTab === 'shop') {
                list.innerHTML = '<div style="padding: 10px; color:#aaa; text-align:center; margin-bottom:10px;">Kaufe neue Farben für deinen Crewmate!</div>';
                let hasUnbought = false;
                SKIN_COLORS.forEach(c => {
                    const isUnlocked = playerSettings.unlockedColors.includes(c.id);
                    if (!isUnlocked) {
                        hasUnbought = true;
                        list.innerHTML += `
                            <div class="list-item">
                                <div class="item-icon" style="background:${c.hex}; width:30px; height:30px; border-radius:50%;"></div>
                                <div class="item-details">
                                    <div class="item-name">${c.name}</div>
                                    <div class="item-price">$${c.price.toLocaleString()}</div>
                                </div>
                                <button class="btn-buy" onclick="buyColor('${c.id}', ${c.price})">Kaufen</button>
                            </div>
                        `;
                    }
                });
                if (!hasUnbought) {
                    list.innerHTML += '<div style="text-align:center; color:#4CAF50; padding:20px; font-weight:bold;">Du hast bereits alle Farben gekauft!</div>';
                }
            }
        }

        // --- SHOP & WARDROBE LOGIK ---
        async function buyItem(id) {
            const qtyInput = document.getElementById(`qty-${id}`);
            const qty = parseInt(qtyInput.value) || 1;

            const res = await fetchApi('/limea/buy', 'POST', { itemId: id, quantity: qty });
            if (res.error) showToast(res.error, 'error');
            else {
                limeaInventory[id] = (limeaInventory[id] || 0) + qty;
                if (res.newBalance !== undefined) updateBalance(res.newBalance - userBalance);
                qtyInput.value = 1;
                showToast(`Erfolgreich ${qty}x gekauft!`);
            }
        }

        function equipColor(hex) {
            playerSettings.color = hex;
            localStorage.setItem('au_settings', JSON.stringify(playerSettings));
            renderSidebar();
            showToast("Farbe angezogen!");
        }

        async function buyColor(id, price) {
            if (userBalance < price) {
                showToast(`Zu wenig Geld! Kostet $${price.toLocaleString()}.`, 'error');
                return;
            }
            if (price > 0) {
                try {
                    // Nutzt jetzt unseren neuen, sauberen Endpunkt
                    const res = await fetchApi('/amongus/buy-skin', 'POST', { skinId: id, price: price });
                    if (res.error) return showToast(res.error, 'error');
                    updateBalance(-price);
                } catch (e) { return showToast("Kauf fehlgeschlagen.", 'error'); }
            }

            playerSettings.unlockedColors.push(id);
            localStorage.setItem('au_settings', JSON.stringify(playerSettings));
            showToast("Farbe freigeschaltet!");
            renderSidebar();
        }

        function drawPreview(color) {
            const cvs = document.getElementById('previewCanvas');
            if (!cvs) return;
            const ctx = cvs.getContext('2d');
            ctx.clearRect(0, 0, cvs.width, cvs.height);

            const x = 50, y = 60, size = 35;

            ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.ellipse(x, y + size - 2, size, size / 2.5, 0, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#000'; ctx.lineWidth = 4; ctx.stroke();
            ctx.fillStyle = '#90caf9'; ctx.beginPath(); ctx.ellipse(x + 5, y - 5, size * 0.6, size * 0.35, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        }

        // --- MAP BUILDER & KOLLISION ---
        function getBounds(el, x, y) {
            let w = parseInt(el.style.width); let h = parseInt(el.style.height);
            let r = parseInt(el.dataset.rotation) || 0;
            let cx = x + w / 2; let cy = y + h / 2;
            if (r === 90 || r === 270) return { left: cx - h / 2, right: cx + h / 2, top: cy - w / 2, bottom: cy + w / 2 };
            return { left: x, right: x + w, top: y, bottom: y + h };
        }

        function checkCollision(boundsA, boundsB) {
            // Toleranz von 2 Pixeln, damit Sachen perfekt nebeneinander rutschen können
            return (boundsA.left < boundsB.right - 2 && boundsA.right > boundsB.left + 2 &&
                boundsA.top < boundsB.bottom - 2 && boundsA.bottom > boundsB.top + 2);
        }

        function shouldCollide(layerA, layerB) {
            if (!layerA) layerA = 'base';
            if (!layerB) layerB = 'base';
            if (layerA === 'floor' || layerB === 'floor') return false;

            if (layerA === 'decor' && layerB === 'decor') return false;

            if ((layerA === 'decor' && layerB === 'base') || (layerA === 'base' && layerB === 'decor')) return false;
            if (layerA === 'wall' && layerB === 'wall') return false;
            return true;
        }

        function placeItem(id) {
            if (currentMode === 'pan') setMode('build');
            if (limeaInventory[id] <= 0) return;

            const itemDef = limeaCatalog.find(i => i.id === id);
            if (!itemDef) return;

            const room = document.getElementById('room');
            const editorArea = document.getElementById('editor-area');
            const editorRect = editorArea.getBoundingClientRect();
            const roomRect = room.getBoundingClientRect();

            // Berechne die Mitte der aktuellen Kamera-Ansicht
            let vpCenterX = (editorRect.width / 2) - roomRect.left;
            let vpCenterY = (editorRect.height / 2) - roomRect.top;

            let startX = Math.round(vpCenterX / 20) * 20;
            let startY = Math.round(vpCenterY / 20) * 20;

            // Suche freien Platz (Anti-Overlap & Map-Grenzen)
            let placed = false;
            let dummyEl = { style: { width: itemDef.w + 'px', height: itemDef.h + 'px' }, dataset: { rotation: 0, layer: itemDef.layer || 'base' } };

            for (let offset = 0; offset < 600; offset += 20) {
                const offsets = [
                    { dx: 0, dy: 0 },
                    { dx: offset, dy: 0 }, { dx: -offset, dy: 0 },
                    { dx: 0, dy: offset }, { dx: 0, dy: -offset },
                    { dx: offset, dy: offset }, { dx: -offset, dy: -offset },
                    { dx: offset, dy: -offset }, { dx: -offset, dy: offset }
                ];

                for (let pos of offsets) {
                    let testX = startX + pos.dx;
                    let testY = startY + pos.dy;

                    let bounds = getBounds(dummyEl, testX, testY);

                    // Map-Kollision (darf nicht außerhalb spawnen!)
                    if (bounds.left < 0 || bounds.top < 0 || bounds.right > room.clientWidth || bounds.bottom > room.clientHeight) continue;

                    // Objekt-Kollision (Darf nicht in andere Möbel/Wände glitchen)
                    let collides = false;
                    for (let other of placedItems) {
                        let oBounds = getBounds(other, parseInt(other.style.left), parseInt(other.style.top));
                        if (checkCollision(bounds, oBounds) && shouldCollide(dummyEl.dataset.layer, other.dataset.layer)) {
                            collides = true; break;
                        }
                    }

                    if (!collides) {
                        startX = testX;
                        startY = testY;
                        placed = true;
                        break;
                    }
                }
                if (placed) break;
            }

            // Abziehen und Spawnen
            limeaInventory[id]--;
            renderSidebar();

            const uid = 'map_uid_' + Date.now() + Math.floor(Math.random() * 1000);
            const el = spawnElementDOM(id, uid, startX, startY, 0);
            if (el) selectItem(el);
        }

        function spawnElementDOM(id, uid, x, y, rotation) {
            const itemDef = limeaCatalog.find(i => i.id === id);
            if (!itemDef) return null;

            const el = document.createElement('div');
            el.className = 'map-piece';
            el.dataset.id = itemDef.id;
            el.dataset.uid = uid;
            el.dataset.rotation = rotation;
            el.innerHTML = itemDef.icon;

            const layer = itemDef.layer || 'base';
            el.dataset.layer = layer;

            let z = 20;
            if (layer === 'floor' || layer === 'vent') z = 10;
            if (layer === 'task') z = 25;
            if (layer === 'wall') z = 30;
            el.style.zIndex = z;

            el.style.width = itemDef.w + 'px';
            el.style.height = itemDef.h + 'px';
            el.style.backgroundColor = itemDef.bg;
            el.style.left = x + 'px';
            el.style.top = y + 'px';
            el.style.transform = `rotate(${rotation}deg)`;

            el.addEventListener('pointerdown', startDrag);
            el.addEventListener('click', (e) => { e.stopPropagation(); selectItem(el); });

            document.getElementById('room').appendChild(el);
            placedItems.push(el);
            return el;
        }

        function setMode(mode) {
            currentMode = mode;
            document.getElementById('tool-build').classList.toggle('active', mode === 'build');
            document.getElementById('tool-pan').classList.toggle('active', mode === 'pan');
            document.getElementById('room').classList.toggle('pan-mode', mode === 'pan');
            document.getElementById('editor-area').style.cursor = mode === 'pan' ? 'grab' : 'default';
            deselectAll();
        }

        function setupPanTool() {
            const editorArea = document.getElementById('editor-area');
            editorArea.addEventListener('pointerdown', (e) => {
                if (currentMode === 'pan') {
                    isPanning = true; panStartX = e.clientX; panStartY = e.clientY;
                    scrollLeftStart = editorArea.scrollLeft; scrollTopStart = editorArea.scrollTop;
                    editorArea.style.cursor = 'grabbing';
                }
            });
            window.addEventListener('pointermove', (e) => {
                if (!isPanning) return;
                editorArea.scrollLeft = scrollLeftStart - (e.clientX - panStartX);
                editorArea.scrollTop = scrollTopStart - (e.clientY - panStartY);
            });
            window.addEventListener('pointerup', () => { if (isPanning) { isPanning = false; editorArea.style.cursor = 'grab'; } });
        }

        function startDrag(e) {
            if (currentMode === 'pan') return;
            if (e.target !== this && !this.contains(e.target)) return;

            isDragging = true; dragTarget = this; selectItem(dragTarget);
            dragTarget.classList.add('dragging');
            startX = e.clientX; startY = e.clientY;
            initialX = parseInt(dragTarget.style.left); initialY = parseInt(dragTarget.style.top);

            document.addEventListener('pointermove', onDrag);
            document.addEventListener('pointerup', endDrag);
            dragTarget.setPointerCapture(e.pointerId);
        }

        function onDrag(e) {
            if (!isDragging || !dragTarget) return;

            let dx = e.clientX - startX;
            let dy = e.clientY - startY;

            let targetX = initialX + dx;
            let targetY = initialY + dy;

            // 1. Berechne den Offset der Bounding-Box bei Rotation
            let w = parseInt(dragTarget.style.width);
            let h = parseInt(dragTarget.style.height);
            let r = parseInt(dragTarget.dataset.rotation) || 0;

            let offsetX = 0;
            let offsetY = 0;
            if (r === 90 || r === 270) {
                offsetX = (w / 2) - (h / 2);
                offsetY = (h / 2) - (w / 2);
            }

            // 2. Wende den Offset an, um die VISUELLE obere linke Ecke zu bekommen
            let visualX = targetX + offsetX;
            let visualY = targetY + offsetY;

            // 3. HIER IST DAS SNAPPING-GEHEIMNIS:
            // Wenn Shift gedrückt ist, snappen wir auf 2 Pixel genau (fast fließend). Sonst auf 10 Pixel.
            let snapSize = e.shiftKey ? 2 : 10;
            visualX = Math.round(visualX / snapSize) * snapSize;
            visualY = Math.round(visualY / snapSize) * snapSize;

            // 4. Zurückrechnen auf die echten DOM X/Y Werte
            let newX = visualX - offsetX;
            let newY = visualY - offsetY;

            // 5. Grenzen der Map checken (damit man es nicht aus der Map schieben kann)
            let bounds = getBounds(dragTarget, newX, newY);
            let room = document.getElementById('room');

            if (bounds.left < 0) newX += (0 - bounds.left);
            if (bounds.top < 0) newY += (0 - bounds.top);
            if (bounds.right > room.clientWidth) newX -= (bounds.right - room.clientWidth);
            if (bounds.bottom > room.clientHeight) newY -= (bounds.bottom - room.clientHeight);

            dragTarget.style.left = newX + 'px';
            dragTarget.style.top = newY + 'px';
        }

        function endDrag(e) {
            isDragging = false; if (!dragTarget) return;
            dragTarget.classList.remove('dragging');
            dragTarget.releasePointerCapture(e.pointerId);
            document.removeEventListener('pointermove', onDrag);
            document.removeEventListener('pointerup', endDrag);

            let myBounds = getBounds(dragTarget, parseInt(dragTarget.style.left), parseInt(dragTarget.style.top));
            let isColliding = false;

            for (let other of placedItems) {
                if (other === dragTarget) continue;
                let otherBounds = getBounds(other, parseInt(other.style.left), parseInt(other.style.top));
                if (checkCollision(myBounds, otherBounds)) {
                    if (shouldCollide(dragTarget.dataset.layer, other.dataset.layer)) {
                        isColliding = true; break;
                    }
                }
            }

            if (isColliding) {
                dragTarget.style.left = initialX + 'px';
                dragTarget.style.top = initialY + 'px';
                dragTarget.style.borderColor = "red";
                showToast("Dort ist kein Platz!", "error");
                setTimeout(() => dragTarget.style.borderColor = "", 300);
            }
        }

        function selectItem(el) {
            if (currentMode === 'pan') return;
            deselectAll(); selectedItem = el; el.classList.add('selected');

            const itemDef = limeaCatalog.find(i => i.id === el.dataset.id);
            document.getElementById('selected-name').innerText = itemDef ? itemDef.name : "Objekt";
            document.getElementById('item-controls').style.display = 'flex';
        }

        function deselectAll() {
            placedItems.forEach(el => el.classList.remove('selected'));
            selectedItem = null; document.getElementById('item-controls').style.display = 'none';
        }

        function rotateSelected() {
            if (!selectedItem) return;
            let oldR = parseInt(selectedItem.dataset.rotation) || 0;
            let newR = (oldR + 90) % 360;
            selectedItem.dataset.rotation = newR;

            let bounds = getBounds(selectedItem, parseInt(selectedItem.style.left), parseInt(selectedItem.style.top));
            let collision = false;

            for (let other of placedItems) {
                if (other === selectedItem) continue;
                let oBounds = getBounds(other, parseInt(other.style.left), parseInt(other.style.top));
                if (checkCollision(bounds, oBounds) && shouldCollide(selectedItem.dataset.layer, other.dataset.layer)) {
                    collision = true; break;
                }
            }

            if (collision) {
                selectedItem.dataset.rotation = oldR;
                selectedItem.style.borderColor = "red";
                showToast("Kein Platz zum Drehen!", "error");
                setTimeout(() => selectedItem.style.borderColor = "", 300);
            } else {
                selectedItem.style.transform = `rotate(${newR}deg)`;
            }
        }

        function removeSelected() {
            if (!selectedItem) return;
            limeaInventory[selectedItem.dataset.id] = (limeaInventory[selectedItem.dataset.id] || 0) + 1;
            selectedItem.remove();
            placedItems = placedItems.filter(el => el !== selectedItem);
            deselectAll();
            if (currentTab === 'inv' || currentTab === 'limea_shop') renderSidebar();
        }

        function applyStoreLayout(layoutArray) {
            if (!confirm("Dein jetziges Layout wird überschrieben. Fortfahren?")) return;

            placedItems.forEach(el => {
                limeaInventory[el.dataset.id] = (limeaInventory[el.dataset.id] || 0) + 1;
                el.remove();
            });
            placedItems = [];
            deselectAll();

            let missingItems = 0;
            layoutArray.forEach(itemData => {
                if (limeaInventory[itemData.id] && limeaInventory[itemData.id] > 0) {
                    limeaInventory[itemData.id]--;
                    spawnElementDOM(itemData.id, itemData.uid, itemData.x, itemData.y, itemData.r);
                } else {
                    missingItems++;
                }
            });

            if (missingItems > 0) showToast(`Layout geladen! Dir fehlten ${missingItems} Möbel aus dem Store.`, 'error');
            else showToast("Layout erfolgreich übernommen!");

            renderSidebar();
        }

        async function saveMap() {
            const mapData = [];
            document.querySelectorAll('.map-piece').forEach(node => {
                const itemDef = limeaCatalog.find(c => c.id === node.dataset.id);

                mapData.push({
                    id: node.dataset.id,
                    uid: node.dataset.uid,
                    x: parseInt(node.style.left) || 0,
                    y: parseInt(node.style.top) || 0,
                    w: parseInt(node.style.width) || 40,
                    h: parseInt(node.style.height) || 40,
                    r: parseInt(node.dataset.rotation) || 0,
                    layer: node.dataset.layer || 'base',
                    bg: node.style.backgroundColor || '#333',
                    icon: itemDef ? itemDef.icon : ''
                });
            });

            try {
                const res = await fetchApi('/realestate/my-home/amongus-map', 'POST', { mapLayout: mapData });
                if (res.error) showToast(res.error, 'error');
                else showToast("Map erfolgreich gespeichert!");
            } catch (e) { showToast("Fehler beim Speichern.", 'error'); }
        }

        window.onload = init;
    