
        const BACKEND_URL = 'https://api.limazon.v6.rocks'; 
        
        const ROOM_SIZES = {
            'carton': { w: 300, h: 300 },
            'trailer': { w: 500, h: 300 },
            'treehouse': { w: 400, h: 400 },
            'apartment': { w: 600, h: 500 },
            'suburb': { w: 800, h: 600 },
            'mansion': { w: 1000, h: 800 },
            'bunker': { w: 1200, h: 1000 },
            'penthouse': { w: 1200, h: 900 },
            'yacht': { w: 1400, h: 600 },
            'island': { w: 2000, h: 2000 },
            'moonbase': { w: 1500, h: 1500 }
        };

        let catalog = [];
        let inventory = {};
        let placedFurniture = [];
        let isOwner = false;
        let currentTab = 'shop';
        let selectedItem = null;
        let currentMode = 'build';
        let myHouseId = '';
        let isAdmin = false;

        let isDragging = false;
        let dragTarget = null;
        let startX, startY, initialX, initialY;

        let isPanning = false;
        let panStartX, panStartY, scrollLeftStart, scrollTopStart;

        async function fetchApi(endpoint, method = 'GET', body = null) {
            const options = { method, headers: { 'Content-Type': 'application/json' }, credentials: 'include' };
            if (body) options.body = JSON.stringify(body);
            const res = await fetch(BACKEND_URL + endpoint, options);
            return await res.json();
        }

        async function init() {
            const urlParams = new URLSearchParams(window.location.search);
            const visitId = urlParams.get('visit');
            let data;
            
            if (visitId) {
                data = await fetchApi(`/api/limea/visit/${visitId}`);
                if (data.error) { alert(data.error); history.back(); return; }
                
                document.getElementById('sidebar').style.display = 'none';
                document.getElementById('save-btn').style.display = 'none';
                document.getElementById('editor-tools').style.display = 'none';
                document.getElementById('header-logo').innerText = `Zu Besuch bei ${data.home.ownerName} 🏠`;
                document.getElementById('room').classList.add('visitor-mode');
                
                isOwner = false;
                catalog = data.catalog;
                myHouseId = data.home.id; 
            } else {
                data = await fetchApi('/api/limea/editor-data');
                if (data.error) { alert(data.error); window.location.href = '/'; return; }

                document.getElementById('bal-display').innerText = `$${data.balance.toLocaleString()}`;
                catalog = data.catalog;
                isOwner = data.home.isOwner;
                myHouseId = data.home.id; 
                isAdmin = data.isAdmin || false; 

                if (!isOwner) {
                    alert(`Du bist nur Untermieter in ${data.home.name}. Du darfst dich umsehen, aber nichts verändern.`);
                    document.getElementById('save-btn').style.display = 'none';
                    document.getElementById('editor-tools').style.display = 'none';
                }

                data.inventory.forEach(inv => { inventory[inv.productId] = inv.quantityOwned; });
                renderSidebar();
            }

            const roomSize = ROOM_SIZES[myHouseId] || { w: 600, h: 400 }; 
            const roomEl = document.getElementById('room');
            roomEl.style.width = roomSize.w + 'px';
            roomEl.style.height = roomSize.h + 'px';

            if (data.home.layout && data.home.layout.length > 0) {
                data.home.layout.forEach(itemData => {
                    if (inventory[itemData.id] && inventory[itemData.id] > 0) inventory[itemData.id]--;
                    spawnFurnitureDOM(itemData.id, itemData.uid, itemData.x, itemData.y, itemData.r);
                });
            }

            document.getElementById('loading').style.display = 'none';
            
            // DIE FEHLENDEN FUNKTIONSAUFRUFE
            setupPanTool(); 
            setupToolbarDrag();

            document.getElementById('editor-area').addEventListener('pointerdown', (e) => {
                if(e.target.id === 'editor-area' || e.target.id === 'room') deselectAll();
            });
        }

        // --- DIE FEHLENDEN FUNKTIONEN (SetMode, Dragging, Panning) ---
        function setMode(mode) {
            currentMode = mode;
            document.getElementById('tool-build').classList.toggle('active', mode === 'build');
            document.getElementById('tool-pan').classList.toggle('active', mode === 'pan');
            document.getElementById('room').classList.toggle('pan-mode', mode === 'pan');
            
            const editorArea = document.getElementById('editor-area');
            editorArea.style.cursor = mode === 'pan' ? 'grab' : 'default';
            deselectAll();
        }

        function setupToolbarDrag() {
            const toolsWindow = document.getElementById('editor-tools');
            const dragHandle = document.getElementById('tools-drag-handle');
            let toolsDragging = false;
            let tbStartX, tbStartY, tbInitialX, tbInitialY;

            dragHandle.addEventListener('pointerdown', (e) => {
                toolsDragging = true;
                tbStartX = e.clientX;
                tbStartY = e.clientY;
                const rect = toolsWindow.getBoundingClientRect();
                tbInitialX = rect.left;
                tbInitialY = rect.top;
                dragHandle.setPointerCapture(e.pointerId);
            });

            dragHandle.addEventListener('pointermove', (e) => {
                if (!toolsDragging) return;
                const dx = e.clientX - tbStartX;
                const dy = e.clientY - tbStartY;
                toolsWindow.style.left = (tbInitialX + dx) + 'px';
                toolsWindow.style.top = (tbInitialY + dy) + 'px';
                toolsWindow.style.right = 'auto'; 
            });

            dragHandle.addEventListener('pointerup', (e) => {
                toolsDragging = false;
                dragHandle.releasePointerCapture(e.pointerId);
            });
        }

        function setupPanTool() {
            const editorArea = document.getElementById('editor-area');
            
            editorArea.addEventListener('pointerdown', (e) => {
                if (currentMode === 'pan') {
                    isPanning = true;
                    panStartX = e.clientX;
                    panStartY = e.clientY;
                    scrollLeftStart = editorArea.scrollLeft;
                    scrollTopStart = editorArea.scrollTop;
                    editorArea.style.cursor = 'grabbing';
                }
            });

            window.addEventListener('pointermove', (e) => {
                if (!isPanning) return;
                const dx = e.clientX - panStartX;
                const dy = e.clientY - panStartY;
                editorArea.scrollLeft = scrollLeftStart - dx;
                editorArea.scrollTop = scrollTopStart - dy;
            });

            window.addEventListener('pointerup', () => {
                if (isPanning) {
                    isPanning = false;
                    editorArea.style.cursor = 'grab';
                }
            });
        }

        // --- SIDEBAR & SHOP ---
        function switchTab(tab) {
            currentTab = tab;
            document.getElementById('tab-shop').classList.toggle('active', tab === 'shop');
            document.getElementById('tab-inv').classList.toggle('active', tab === 'inv');
            document.getElementById('tab-store').classList.toggle('active', tab === 'store');
            
            document.getElementById('search-bar-container').style.display = tab === 'store' ? 'none' : 'block';
            renderSidebar();
        }

        async function renderSidebar() {
            const list = document.getElementById('sidebar-list');
            const searchTerm = document.getElementById('search-input') ? document.getElementById('search-input').value.toLowerCase() : '';
            list.innerHTML = '';

            if (currentTab === 'store') {
                list.innerHTML = '<div style="color:#aaa; text-align:center;">Lade Store...</div>';
                const storeData = await fetchApi('/api/limea/layouts');
                if(!storeData.layouts) return;

                list.innerHTML = '';
                storeData.layouts.forEach(l => {
                    let missingCount = 0;
                    const requiredItems = {};
                    l.layout.forEach(item => requiredItems[item.id] = (requiredItems[item.id] || 0) + 1);
                    
                    const totalOwned = {};
                    for(const id in inventory) totalOwned[id] = inventory[id];
                    placedFurniture.forEach(el => totalOwned[el.dataset.id] = (totalOwned[el.dataset.id] || 0) + 1);

                    for(const [id, reqQty] of Object.entries(requiredItems)) {
                        const ownedQty = totalOwned[id] || 0;
                        if(ownedQty < reqQty) missingCount += (reqQty - ownedQty);
                    }

                    list.innerHTML += `
                        <div class="store-card">
                            <div class="store-title">${l.name}</div>
                            <div class="store-author">von ${l.creatorName} (${l.houseId})</div>
                            ${missingCount > 0 ? `<div class="store-missing">Fehlende Möbel: ${missingCount} Stück</div>` : '<div style="color:#44db95; font-size:0.8rem; margin-bottom:10px;">Du hast alles!</div>'}
                            <div style="display:flex; gap:5px;">
                                <button class="buy-btn" style="flex:1;" onclick='applyStoreLayout(${JSON.stringify(l.layout)})'>Übernehmen</button>
                                ${isAdmin ? `<button class="buy-btn" style="background:#ff4458;" onclick="deleteStoreLayout('${l._id}')" title="Als Admin löschen">🗑️</button>` : ''}
                            </div>
                        </div>
                    `;
                });
                return;
            }

            const filteredCatalog = catalog.filter(item => item.name.toLowerCase().includes(searchTerm));

            if (currentTab === 'shop') {
                filteredCatalog.forEach(item => {
                    list.innerHTML += `
                        <div class="list-item">
                            <div class="item-icon">${item.icon}</div>
                            <div class="item-details">
                                <div class="item-name">${item.name}</div>
                                <div class="item-price">$${item.price}</div>
                            </div>
                            <div class="buy-area">
                                <input type="number" id="qty-${item.id}" value="1" min="1" max="99">
                                <button class="buy-btn" onclick="buyItem('${item.id}')">Kaufen</button>
                            </div>
                        </div>
                    `;
                });
            } else if (currentTab === 'inv') {
                filteredCatalog.forEach(item => {
                    const available = inventory[item.id] || 0;
                    if (available > 0) {
                        list.innerHTML += `
                            <div class="list-item">
                                <div class="item-icon">${item.icon}</div>
                                <div class="item-details">
                                    <div class="item-name">${item.name}</div>
                                    <div class="item-qty">Im Lager: ${available}x</div>
                                </div>
                                <button class="btn-place" onclick="placeItem('${item.id}')" ${!isOwner ? 'disabled' : ''}>Bauen</button>
                            </div>
                        `;
                    }
                });
                if (list.innerHTML === '') list.innerHTML = '<div style="color:#aaa; text-align:center; padding:20px;">Nichts gefunden oder Lager leer.</div>';
            }
        }

        async function buyItem(id) {
            const qtyInput = document.getElementById(`qty-${id}`);
            const qty = parseInt(qtyInput.value) || 1;

            const res = await fetchApi('/api/limea/buy', 'POST', { itemId: id, quantity: qty });
            if (res.error) alert(res.error);
            else {
                inventory[id] = (inventory[id] || 0) + qty;
                if (res.newBalance !== undefined) {
                    document.getElementById('bal-display').innerText = `$${res.newBalance.toLocaleString()}`;
                }
                qtyInput.value = 1; 
                alert(`Erfolgreich ${qty}x gekauft!`);
            }
        }

        // --- PLATZIEREN & DOM ---
        function placeItem(id) {
            if (inventory[id] <= 0 || !isOwner) return;
            
            // Wenn man im "Hand-Modus" ist, wechsle sofort zum Bauen-Werkzeug
            if (currentMode === 'pan') setMode('build');

            const itemDef = catalog.find(i => i.id === id);
            if (!itemDef) return;

            const room = document.getElementById('room');
            const editorArea = document.getElementById('editor-area');
            
            // 1. Finde heraus, wo der User gerade hinschaut (Mitte des sichtbaren Bereichs)
            const editorRect = editorArea.getBoundingClientRect();
            const roomRect = room.getBoundingClientRect();
            
            // Berechnet die Mitte der Kamera relativ zum Haus
            let vpCenterX = (editorRect.width / 2) - roomRect.left;
            let vpCenterY = (editorRect.height / 2) - roomRect.top;

            // Grenzen checken (verhindern, dass es außerhalb der Wände spawnt)
            if (vpCenterX < 0) vpCenterX = 20;
            if (vpCenterY < 0) vpCenterY = 20;
            if (vpCenterX > room.clientWidth - itemDef.w) vpCenterX = room.clientWidth - itemDef.w - 20;
            if (vpCenterY > room.clientHeight - itemDef.h) vpCenterY = room.clientHeight - itemDef.h - 20;

            let startX = Math.round(vpCenterX / 10) * 10;
            let startY = Math.round(vpCenterY / 10) * 10;

            // 2. Anti-Overlap: Finde freien Platz!
            let placed = false;
            let dummyEl = { style: {width: itemDef.w+'px', height: itemDef.h+'px'}, dataset: {rotation: 0, layer: itemDef.layer || 'base'} };

            // Sucht spiralförmig in immer größeren Radien nach einem freien Platz
            for(let offset = 0; offset < 600; offset += 20) {
                const offsets = [
                    {dx: 0, dy: 0},
                    {dx: offset, dy: 0}, {dx: -offset, dy: 0},
                    {dx: 0, dy: offset}, {dx: 0, dy: -offset},
                    {dx: offset, dy: offset}, {dx: -offset, dy: -offset},
                    {dx: offset, dy: -offset}, {dx: -offset, dy: offset}
                ];

                for(let pos of offsets) {
                    let testX = startX + pos.dx;
                    let testY = startY + pos.dy;
                    
                    // Wand-Kollision
                    if (testX < 0 || testY < 0 || testX + itemDef.w > room.clientWidth || testY + itemDef.h > room.clientHeight) continue;
                    
                    // Möbel-Kollision (prüft auch die Ebenen, z.B. Teppiche ignorieren)
                    let bounds = getBounds(dummyEl, testX, testY);
                    let collides = false;
                    for(let other of placedFurniture) {
                        let oBounds = getBounds(other, parseInt(other.style.left), parseInt(other.style.top));
                        if(checkCollision(bounds, oBounds) && shouldCollide(dummyEl.dataset.layer, other.dataset.layer)) {
                            collides = true; break;
                        }
                    }
                    // Platz gefunden!
                    if(!collides) {
                        startX = testX;
                        startY = testY;
                        placed = true;
                        break;
                    }
                }
                if(placed) break;
            }

            // Aus dem Inventar abziehen und ins Haus setzen
            inventory[id]--; 
            renderSidebar();

            const uid = 'uid_' + Date.now() + Math.floor(Math.random() * 1000);
            const el = spawnFurnitureDOM(id, uid, startX, startY, 0);
            selectItem(el);
        }

        function spawnFurnitureDOM(id, uid, x, y, rotation) {
            const itemDef = catalog.find(i => i.id === id);
            if (!itemDef) return null;

            const el = document.createElement('div');
            el.className = 'furniture-piece';
            el.dataset.id = id;
            el.dataset.uid = uid;
            el.dataset.rotation = rotation;
            el.innerHTML = itemDef.icon;
            
            const layer = itemDef.layer || 'base';
            el.dataset.layer = layer;
            
            let z = 20;
            if(layer === 'floor') z = 10;
            if(layer === 'decor') z = 30;
            el.style.zIndex = z;

            el.style.width = itemDef.w + 'px';
            el.style.height = itemDef.h + 'px';
            el.style.backgroundColor = itemDef.bg;
            el.style.left = x + 'px';
            el.style.top = y + 'px';
            el.style.transform = `rotate(${rotation}deg)`;

            if (isOwner) {
                el.addEventListener('pointerdown', startDrag);
                el.addEventListener('click', (e) => { e.stopPropagation(); selectItem(el); });
            }

            document.getElementById('room').appendChild(el);
            placedFurniture.push(el);
            return el;
        }

        // --- HITBOX & KOLLISION ---
        function getBounds(el, x, y) {
            let w = parseInt(el.style.width);
            let h = parseInt(el.style.height);
            let r = parseInt(el.dataset.rotation) || 0;
            let cx = x + w / 2;
            let cy = y + h / 2;
            if (r === 90 || r === 270) {
                return { left: cx - h/2, right: cx + h/2, top: cy - w/2, bottom: cy + w/2 };
            } else {
                return { left: x, right: x + w, top: y, bottom: y + h };
            }
        }

        function checkCollision(boundsA, boundsB) {
            return (boundsA.left < boundsB.right - 1 && boundsA.right > boundsB.left + 1 && 
                    boundsA.top < boundsB.bottom - 1 && boundsA.bottom > boundsB.top + 1);
        }

        function shouldCollide(layerA, layerB) {
            if (!layerA) layerA = 'base';
            if (!layerB) layerB = 'base';
            if (layerA === 'floor' || layerB === 'floor') return false;
            if ((layerA === 'decor' && layerB === 'base') || (layerA === 'base' && layerB === 'decor')) return false;
            return true; 
        }

        // --- DRAG & DROP ---
        function startDrag(e) {
            if(!isOwner || currentMode === 'pan') return; 
            if(e.target !== this && !this.contains(e.target)) return; 

            isDragging = true;
            dragTarget = this;
            selectItem(dragTarget);

            dragTarget.classList.add('dragging');
            startX = e.clientX;
            startY = e.clientY;
            initialX = parseInt(dragTarget.style.left);
            initialY = parseInt(dragTarget.style.top);

            document.addEventListener('pointermove', onDrag);
            document.addEventListener('pointerup', endDrag);
            dragTarget.setPointerCapture(e.pointerId);
        }

        function onDrag(e) {
            if (!isDragging || !dragTarget) return;

            let dx = e.clientX - startX;
            let dy = e.clientY - startY;

            // Das wichtige 10px Grid Snapping
            let newX = Math.round((initialX + dx) / 10) * 10;
            let newY = Math.round((initialY + dy) / 10) * 10;

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
            isDragging = false;
            if(!dragTarget) return;
            
            dragTarget.classList.remove('dragging');
            dragTarget.releasePointerCapture(e.pointerId);
            document.removeEventListener('pointermove', onDrag);
            document.removeEventListener('pointerup', endDrag);

            let myBounds = getBounds(dragTarget, parseInt(dragTarget.style.left), parseInt(dragTarget.style.top));
            let isColliding = false;

            for (let other of placedFurniture) {
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
                setTimeout(() => dragTarget.style.borderColor = "", 300);
            }
        }

        function selectItem(el) {
            if (currentMode === 'pan') return;
            deselectAll();
            selectedItem = el;
            el.classList.add('selected');
            
            const itemDef = catalog.find(i => i.id === el.dataset.id);
            document.getElementById('selected-name').innerText = itemDef ? itemDef.name : "Objekt";
            document.getElementById('item-controls').style.display = 'flex';
        }

        function deselectAll() {
            placedFurniture.forEach(el => el.classList.remove('selected'));
            selectedItem = null;
            document.getElementById('item-controls').style.display = 'none';
        }

        function rotateSelected() {
            if (!selectedItem) return;
            let oldR = parseInt(selectedItem.dataset.rotation) || 0;
            let newR = (oldR + 90) % 360;
            
            selectedItem.dataset.rotation = newR;
            let bounds = getBounds(selectedItem, parseInt(selectedItem.style.left), parseInt(selectedItem.style.top));
            let room = document.getElementById('room');
            
            let collision = false;
            
            if (bounds.left < 0 || bounds.top < 0 || bounds.right > room.clientWidth || bounds.bottom > room.clientHeight) {
                collision = true;
            }

            if (!collision) {
                for (let other of placedFurniture) {
                    if (other === selectedItem) continue;
                    let oBounds = getBounds(other, parseInt(other.style.left), parseInt(other.style.top));
                    if (checkCollision(bounds, oBounds) && shouldCollide(selectedItem.dataset.layer, other.dataset.layer)) { 
                        collision = true; break; 
                    }
                }
            }

            if (collision) {
                selectedItem.dataset.rotation = oldR;
                selectedItem.style.borderColor = "red";
                setTimeout(() => selectedItem.style.borderColor = "", 300);
            } else {
                selectedItem.style.transform = `rotate(${newR}deg)`;
            }
        }

        function removeSelected() {
            if (!selectedItem) return;
            const id = selectedItem.dataset.id;
            
            inventory[id] = (inventory[id] || 0) + 1; 
            selectedItem.remove(); 
            placedFurniture = placedFurniture.filter(el => el !== selectedItem); 
            
            deselectAll();
            if(currentTab === 'inv') renderSidebar();
        }

        // --- SPEICHERN, IMPORT, EXPORT, KI ---
        function getLayoutData() {
            const layoutData = [];
            const roomNodes = document.getElementById('room').children;
            for (let i = 0; i < roomNodes.length; i++) {
                const node = roomNodes[i];
                if (node.classList.contains('furniture-piece')) {
                    layoutData.push({
                        id: node.dataset.id,
                        uid: node.dataset.uid,
                        x: parseInt(node.style.left) || 0,
                        y: parseInt(node.style.top) || 0,
                        r: parseInt(node.dataset.rotation) || 0
                    });
                }
            }
            return layoutData;
        }

        async function saveLayout() {
            if (!isOwner) return;
            const res = await fetchApi('/api/realestate/my-home/layout', 'POST', { layout: getLayoutData() });
            if (res.error) alert(res.error);
            else alert(res.message);
        }

        function exportLayout() {
            const layout = getLayoutData();
            const blob = new Blob([JSON.stringify(layout, null, 2)], {type: "application/json"});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "limea_layout.json";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }

        function importLayout(event) {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const newLayout = JSON.parse(e.target.result);
                    if (Array.isArray(newLayout)) {
                        applyStoreLayout(newLayout);
                    } else {
                        alert("Die Datei enthält kein gültiges Layout.");
                    }
                } catch(err) { alert("Ungültige JSON-Datei!"); }
            };
            reader.readAsText(file);
            event.target.value = ''; 
        }

        async function publishLayout() {
            if(!isOwner) return;
            const name = prompt("Gib deinem Layout einen coolen Namen für den Store:");
            if(!name) return;
            
            const res = await fetchApi('/api/limea/layouts/publish', 'POST', { name, houseId: myHouseId, layout: getLayoutData() });
            if (res.error) alert(res.error);
            else { alert(res.message); switchTab('store'); }
        }

        async function deleteStoreLayout(layoutId) {
            if(!confirm("Als Admin dieses Layout WIRKLICH endgültig löschen?")) return;
            
            const res = await fetchApi(`/api/limea/admin/layouts/${layoutId}`, 'DELETE');
            if (res.error) alert(res.error);
            else {
                alert(res.message);
                renderSidebar(); 
            }
        }

        function applyStoreLayout(layoutArray) {
            if(!isOwner) return;
            if(!confirm("Dein jetziges Layout wird überschrieben. Fortfahren?")) return;
            
            clearRoom();
            let missingItems = 0;

            layoutArray.forEach(itemData => {
                if (inventory[itemData.id] && inventory[itemData.id] > 0) {
                    inventory[itemData.id]--;
                    spawnFurnitureDOM(itemData.id, itemData.uid, itemData.x, itemData.y, itemData.r);
                } else {
                    missingItems++;
                }
            });

            if (missingItems > 0) alert(`Layout geladen! Dir fehlten aber ${missingItems} Möbelstücke, diese wurden weggelassen.`);
            else alert("Perfekt! Das Layout wurde 1 zu 1 übernommen.");
            
            if (currentTab === 'inv') renderSidebar();
        }

        function clearRoom() {
            placedFurniture.forEach(el => {
                inventory[el.dataset.id] = (inventory[el.dataset.id] || 0) + 1;
                el.remove();
            });
            placedFurniture = [];
            deselectAll();
        }

        function magicAutoFill() {
            if (!isOwner) return;
            if (!confirm("Die KI räumt alles ab und baut dir eine neue Bude. Sicher?")) return;
            
            clearRoom();
            
            const room = document.getElementById('room');
            const rw = room.clientWidth;
            const rh = room.clientHeight;
            
            for (const [id, qty] of Object.entries(inventory)) {
                let remaining = qty;
                for(let i=0; i<qty; i++) {
                    if(remaining <= 0) break;
                    
                    const itemDef = catalog.find(c => c.id === id);
                    if(!itemDef) continue;

                    for(let attempts=0; attempts<100; attempts++) {
                        let x = Math.floor(Math.random() * (rw / 10)) * 10;
                        let y = Math.floor(Math.random() * (rh / 10)) * 10;
                        let r = (Math.floor(Math.random() * 4)) * 90; 
                        
                        if (['f_bed_single', 'f_bed_double', 'f_bed_boxspring', 'f_wardrobe', 'f_kitchen'].includes(id)) {
                            const wall = Math.floor(Math.random() * 4);
                            if(wall === 0) { y = 0; r = 0; } 
                            if(wall === 1) { x = 0; r = 270; } 
                        }

                        let dummyEl = { style: {width: itemDef.w+'px', height: itemDef.h+'px'}, dataset: {rotation: r, layer: itemDef.layer || 'base'} };
                        let bounds = getBounds(dummyEl, x, y);
                        
                        if (bounds.left < 0 || bounds.top < 0 || bounds.right > rw || bounds.bottom > rh) continue; 
                        
                        let collides = false;
                        for(let other of placedFurniture) {
                            let oBounds = getBounds(other, parseInt(other.style.left), parseInt(other.style.top));
                            if(checkCollision(bounds, oBounds) && shouldCollide(dummyEl.dataset.layer, other.dataset.layer)) {
                                collides = true; break;
                            }
                        }
                        
                        if(!collides) {
                            inventory[id]--;
                            spawnFurnitureDOM(id, 'uid_' + Date.now() + Math.random(), x, y, r);
                            break; 
                        }
                    }
                }
            }
            if (currentTab === 'inv') renderSidebar();
        }

        window.onload = init;
    