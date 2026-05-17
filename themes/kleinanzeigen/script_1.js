
        const API_BASE = 'https://api.limazon.v6.rocks/api'; 
        const fetchOpts = { credentials: 'include' };

        let currentUser = {};
        let cropper = null;
        let activeChatId = null;
        let chatInterval = null;
        let globalChats = []; 
        let currentMarketplaceAds = []; // NEU: Speichert alle geladenen Anzeigen zwischen

        async function init() {
            try {
                const meRes = await fetch(`${API_BASE}/auth/me`, fetchOpts);
                if (meRes.ok) {
                    const data = await meRes.json();
                    currentUser = { id: data.userId, username: data.username, isAdmin: data.isAdmin || data.isRealAdmin };
                }
                const invRes = await fetch(`${API_BASE}/delivery/inventory`, fetchOpts);
                if (invRes.ok) {
                    const inv = await invRes.json();
                    const select = document.getElementById('ad-inventory-select');
                    select.innerHTML = '<option value="">-- Wähle ein Item --</option>';
                    inv.forEach(item => {
                        select.innerHTML += `<option value="${item.productId}">${item.icon} ${item.name} (${item.quantityOwned}x)</option>`;
                    });
                }
            } catch(e) { console.error("Init Error", e); }
            showView('marketplace');
        }

        function showView(viewId) {
            document.querySelectorAll('main > section').forEach(el => el.classList.add('hidden'));
            document.getElementById(`${viewId}-view`).classList.remove('hidden');
            
            clearInterval(chatInterval); 
            activeChatId = null;
            document.getElementById('chat-header').querySelector('span').innerText = "Wähle einen Chat aus";
            document.getElementById('chat-messages').innerHTML = "";
            document.getElementById('make-offer-btn').classList.add('hidden');

            if(viewId === 'marketplace') loadAds();
            if(viewId === 'dashboard') loadDashboard();
            if(viewId === 'createAd') toggleLimazonFields();
        }

        function toggleLimazonFields() {
            const type = document.getElementById('ad-type').value;
            const limazonFields = document.getElementById('limazon-fields');
            const imgSection = document.getElementById('image-upload-section');
            const imgInputUrl = document.getElementById('ad-image-url');

            if(type === 'limazon') {
                limazonFields.classList.remove('hidden'); limazonFields.classList.add('grid');
                imgSection.classList.add('hidden');
                imgInputUrl.removeAttribute('required');
            } else {
                limazonFields.classList.add('hidden'); limazonFields.classList.remove('grid');
                imgSection.classList.remove('hidden');
                imgInputUrl.setAttribute('required', 'true');
            }
        }

        // --- CROPPER ---
        document.getElementById('image-input').addEventListener('change', e => {
            const file = e.target.files[0];
            if (!file) return;
            document.getElementById('cropper-image').src = URL.createObjectURL(file);
            document.getElementById('crop-modal').classList.remove('hidden');
            if (cropper) cropper.destroy();
            cropper = new Cropper(document.getElementById('cropper-image'), { aspectRatio: 4/3, viewMode: 1 });
        });

        function closeCropper() {
            document.getElementById('crop-modal').classList.add('hidden');
            if (cropper) cropper.destroy();
            document.getElementById('image-input').value = ""; 
        }

        async function uploadCroppedImage() {
            const btn = document.getElementById('upload-btn');
            btn.innerText = "⏳ Lädt hoch..."; btn.disabled = true;
            cropper.getCroppedCanvas({ width: 800, height: 600 }).toBlob(async (blob) => {
                const formData = new FormData(); formData.append('image', blob, 'ad.jpg');
                try {
                    const res = await fetch(`${API_BASE}/cdn/upload`, { method: 'POST', body: formData, ...fetchOpts });
                    const data = await res.json();
                    if(res.ok) {
                        document.getElementById('ad-image-url').value = data.url;
                        document.getElementById('final-image-preview').src = data.url;
                        document.getElementById('image-preview-container').classList.remove('hidden');
                        closeCropper();
                    } else alert(data.error);
                } catch(e) { alert("Upload Fehler."); } finally { btn.innerText = "Hochladen"; btn.disabled = false; }
            }, 'image/jpeg', 0.8);
        }

        // --- MARKETPLACE ---
        async function loadAds() {
            const grid = document.getElementById('ads-grid');
            grid.innerHTML = '<div class="col-span-full text-center">Lade...</div>';
            try {
                const res = await fetch(`${API_BASE}/classifieds`, fetchOpts);
                const data = await res.json();
                if(data.ads?.length > 0) {
                    currentMarketplaceAds = data.ads; // In globaler Variable merken
                    grid.innerHTML = data.ads.map(ad => {
                        const isOwner = currentUser.username === ad.sellerUsername;
                        const canDelete = isOwner || currentUser.isAdmin;
                        const img = ad.type === 'limazon' ? 'https://placehold.co/400x300/e0f2fe/1e3a8a?text=In-Game+Item' : (ad.imageUrl || 'https://placehold.co/400x300?text=Kein+Bild');
                        
                        // Wir machen die GESAMTE Karte klickbar. 
                        // event.stopPropagation() auf den Buttons verhindert, dass man beim Klicken auf "Kaufen" aus Versehen auch das Modal öffnet.
                        return `
                        <div class="bg-white border rounded-xl overflow-hidden shadow hover:shadow-lg transition flex flex-col group cursor-pointer" onclick="openAdDetails('${ad._id}')">
                            <div class="h-40 bg-gray-100 relative overflow-hidden">
                                <img src="${img}" class="w-full h-full object-cover group-hover:scale-105 transition duration-300">
                                <span class="absolute top-2 left-2 ${ad.type === 'limazon' ? 'bg-blue-600' : 'bg-gray-800'} text-white text-xs font-bold px-2 py-1 rounded shadow">${ad.type === 'limazon' ? '💎 Digital' : '📦 Physisch'}</span>
                                <div class="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition flex items-center justify-center">
                                    <span class="bg-black text-white px-3 py-1 rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition">Details ansehen</span>
                                </div>
                            </div>
                            <div class="p-4 flex-grow flex flex-col pb-2">
                                <h3 class="font-bold text-lg leading-tight mb-1 truncate" title="${ad.title}">${ad.title}</h3>
                                <p class="text-xl font-black text-brand mb-2">$${ad.price.toLocaleString()}</p>
                                <p class="text-sm text-gray-600 line-clamp-2 flex-grow">${ad.description}</p>
                                <div class="flex items-center justify-between mt-3 pt-3 border-t text-xs text-gray-500 mb-2">
                                    <span>👤 ${ad.sellerUsername}</span>
                                    ${canDelete ? `<button onclick="event.stopPropagation(); deleteAd('${ad._id}')" class="text-red-500 hover:underline font-bold">🗑️ Löschen</button>` : ''}
                                </div>
                            </div>
                            <div class="px-4 pb-4 flex gap-2">
                                ${ad.type === 'limazon' && !isOwner ? `<button onclick="event.stopPropagation(); buyAd('${ad._id}')" class="flex-1 bg-brand text-white font-bold py-2 rounded hover:bg-brandHover shadow-sm">Kaufen</button>` : ''}
                                ${!isOwner ? `<button onclick="event.stopPropagation(); startChat('${ad._id}')" class="flex-1 bg-gray-100 text-gray-800 font-bold py-2 rounded hover:bg-gray-200 border shadow-sm">Nachricht</button>` : ''}
                            </div>
                        </div>`
                    }).join('');
                } else {
                    currentMarketplaceAds = [];
                    grid.innerHTML = '<div class="col-span-full text-center py-10">Keine Anzeigen vorhanden.</div>';
                }
            } catch(e) { grid.innerHTML = '<div class="text-red-500 col-span-full">Fehler beim Laden.</div>'; }
        }

        // --- AD DETAILS MODAL LOGIK ---
        function openAdDetails(adId) {
            const ad = currentMarketplaceAds.find(a => a._id === adId);
            if(!ad) return;

            const isOwner = currentUser.username === ad.sellerUsername;
            const canDelete = isOwner || currentUser.isAdmin;
            const img = ad.type === 'limazon' ? 'https://placehold.co/800x600/e0f2fe/1e3a8a?text=In-Game+Item' : (ad.imageUrl || 'https://placehold.co/800x600?text=Kein+Bild');

            document.getElementById('modal-ad-title').innerText = ad.title;
            document.getElementById('modal-ad-img').src = img;
            document.getElementById('modal-ad-type').innerText = ad.type === 'limazon' ? '💎 Digitales Item' : '📦 Physisches Objekt';
            document.getElementById('modal-ad-type').className = `inline-block text-white text-xs font-bold px-2 py-1 rounded w-max mb-3 ${ad.type === 'limazon' ? 'bg-blue-600' : 'bg-gray-800'}`;
            document.getElementById('modal-ad-price').innerText = `$${ad.price.toLocaleString()}`;
            document.getElementById('modal-ad-seller').innerText = ad.sellerUsername;
            document.getElementById('modal-ad-desc').innerText = ad.description; 

            // Aktions-Buttons generieren
            let actionsHtml = '';
            if (canDelete) {
                actionsHtml += `<button onclick="deleteAd('${ad._id}'); closeAdDetails();" class="text-red-500 hover:bg-red-50 px-4 py-2 rounded font-bold border border-red-200 transition">🗑️ Anzeige löschen</button>`;
            }
            
            // Spacer um den Rest nach rechts zu drücken
            actionsHtml += `<div class="flex-grow"></div>`;
            
            if (!isOwner) {
                actionsHtml += `<button onclick="startChat('${ad._id}'); closeAdDetails();" class="bg-gray-800 text-white font-bold py-2 px-6 rounded hover:bg-black transition shadow">Nachricht schreiben</button>`;
            }
            if (ad.type === 'limazon' && !isOwner) {
                actionsHtml += `<button onclick="buyAd('${ad._id}'); closeAdDetails();" class="bg-brand text-white font-bold py-2 px-8 rounded hover:bg-brandHover transition shadow text-lg">Direkt Kaufen</button>`;
            }

            document.getElementById('modal-ad-actions').innerHTML = actionsHtml;
            document.getElementById('ad-details-modal').classList.remove('hidden');
        }

        function closeAdDetails() {
            document.getElementById('ad-details-modal').classList.add('hidden');
        }


        // --- DASHBOARD (EIGENE ANZEIGEN & CHATS) ---
        async function loadDashboard() {
            try {
                // Eigene Anzeigen
                const adsRes = await fetch(`${API_BASE}/classifieds/me`, fetchOpts);
                const adsData = await adsRes.json();
                const adsList = document.getElementById('my-ads-list');
                
                if(adsData.ads?.length > 0) {
                    adsList.innerHTML = adsData.ads.map(ad => `
                        <div class="p-3 border rounded bg-gray-50 flex flex-col gap-2">
                            <div class="flex justify-between items-start">
                                <strong class="truncate block">${ad.title}</strong>
                                <span class="text-xs px-2 py-1 rounded font-bold ${ad.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}">${ad.status.toUpperCase()}</span>
                            </div>
                            <div class="flex justify-between items-center mt-1">
                                <span class="font-bold text-brand">$${ad.price}</span>
                            </div>
                            <div class="flex justify-between items-center mt-2 gap-2">
                                ${ad.status === 'active' && ad.type === 'real' ? `<button onclick="markAsSold('${ad._id}')" class="flex-1 text-xs bg-gray-800 text-white px-2 py-2 rounded hover:bg-black font-bold transition">Verkauft</button>` : ''}
                                <button onclick="deleteAd('${ad._id}')" class="flex-1 text-xs bg-red-500 text-white px-2 py-2 rounded hover:bg-red-600 font-bold transition">🗑️ Löschen</button>
                            </div>
                        </div>
                    `).join('');
                } else adsList.innerHTML = '<p class="text-sm text-gray-500">Keine eigenen Anzeigen.</p>';

                // Chats
                const chatRes = await fetch(`${API_BASE}/classifieds/chats`, fetchOpts);
                const chatData = await chatRes.json();
                const chatList = document.getElementById('chat-list');

                if(chatData.chats?.length > 0) {
                    globalChats = chatData.chats; 

                    chatList.innerHTML = globalChats.map(c => `
                        <div class="flex justify-between items-center p-3 border-b hover:bg-gray-100 transition group">
                            <div onclick="openChat('${c._id}')" class="cursor-pointer flex-grow overflow-hidden">
                                <div class="font-bold text-sm text-gray-800">${c.partnerName}</div>
                                <div class="text-xs text-brand font-semibold truncate">${c.adTitle}</div>
                                <div class="text-xs text-gray-500 truncate mt-1">${c.lastMessagePreview || 'Noch keine Nachricht'}</div>
                            </div>
                            <button onclick="deleteChat('${c._id}')" class="ml-2 text-red-500 opacity-50 hover:opacity-100 p-2 transition" title="Chat löschen">🗑️</button>
                        </div>
                    `).join('');
                } else {
                    globalChats = [];
                    chatList.innerHTML = '<p class="text-sm text-gray-500">Keine Nachrichten.</p>';
                }

            } catch(e) { console.error("Dashboard Fehler:", e); }
        }

        // --- CHAT LOGIK ---
        async function startChat(adId) {
            try {
                const res = await fetch(`${API_BASE}/classifieds/${adId}/chat`, { method: 'POST', ...fetchOpts });
                const data = await res.json();
                
                if(res.ok) { 
                    showView('dashboard');
                    await loadDashboard(); 
                    openChat(data.chat._id); 
                } else {
                    alert(data.error);
                }
            } catch(e) { 
                alert('Netzwerkfehler beim Starten des Chats.'); 
            }
        }

        async function openChat(chatId) {
            const chat = globalChats.find(c => c._id === chatId);
            if (!chat) return;

            activeChatId = chatId;
            
            document.getElementById('chat-header').querySelector('span').innerText = `Chat mit ${chat.partnerName} (${chat.adTitle})`;
            document.getElementById('chat-input').disabled = false;
            document.getElementById('chat-send-btn').disabled = false;
            
            const offerBtn = document.getElementById('make-offer-btn');
            
            if (String(currentUser.id) === String(chat.sellerId)) {
                offerBtn.classList.remove('hidden');
                offerBtn.style.display = 'block'; 
            } else {
                offerBtn.classList.add('hidden');
                offerBtn.style.display = 'none';
            }
            
            fetchMessages();
            clearInterval(chatInterval);
            chatInterval = setInterval(fetchMessages, 3000);
        }

        async function fetchMessages() {
            if(!activeChatId) return;
            try {
                const res = await fetch(`${API_BASE}/chat/chats/${activeChatId}/messages?limit=50`, fetchOpts);
                if(!res.ok) return;
                const data = await res.json();
                
                const box = document.getElementById('chat-messages');
                const isScrolledToBottom = box.scrollHeight - box.clientHeight <= box.scrollTop + 10;

                box.innerHTML = data.messages.map(m => {
                    const isMe = m.senderUsername === currentUser.username;
                    
                    if (!m.isOffer) {
                        return `
                        <div class="flex flex-col ${isMe ? 'items-end' : 'items-start'} w-full">
                            <span class="text-[10px] text-gray-400 mx-2">${m.senderUsername}</span>
                            <div class="px-4 py-2 rounded-2xl max-w-[80%] ${isMe ? 'bg-brand text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'}">
                                ${m.content}
                            </div>
                        </div>`;
                    }

                    if (m.offerStatus === 'pending') {
                        if (isMe) {
                            return `
                            <div class="flex flex-col items-end w-full">
                                <div class="px-4 py-3 rounded-2xl max-w-[80%] bg-blue-100 text-blue-800 border border-blue-200 rounded-br-none text-sm">
                                    ⏳ <b>Angebot über $${m.offerAmount.toLocaleString()} gesendet.</b><br>Warte auf Antwort...
                                </div>
                            </div>`;
                        } else {
                            return `
                            <div class="flex flex-col items-start w-full">
                                <div class="px-4 py-3 rounded-2xl max-w-[80%] bg-yellow-100 text-yellow-900 border border-yellow-200 rounded-bl-none shadow-sm">
                                    <b class="text-base mb-1 block">🤝 Kaufangebot erhalten!</b>
                                    ${m.senderUsername} bietet dir den Artikel für <b>$${m.offerAmount.toLocaleString()}</b> an.<br>
                                    <div class="flex gap-2 mt-2">
                                        <button onclick="respondToOffer('${m._id}', 'accept')" class="bg-green-500 text-white px-3 py-1 rounded text-sm font-bold hover:bg-green-600">Kaufen</button>
                                        <button onclick="respondToOffer('${m._id}', 'decline')" class="bg-red-500 text-white px-3 py-1 rounded text-sm font-bold hover:bg-red-600">Ablehnen</button>
                                    </div>
                                </div>
                            </div>`;
                        }
                    } else if (m.offerStatus === 'accepted') {
                        return `
                        <div class="flex flex-col ${isMe ? 'items-end' : 'items-start'} w-full">
                            <div class="px-4 py-2 rounded-2xl max-w-[80%] bg-green-500 text-white font-bold text-center">
                                ✅ Verkauft für $${m.offerAmount.toLocaleString()}!
                            </div>
                        </div>`;
                    } else {
                        return `
                        <div class="flex flex-col ${isMe ? 'items-end' : 'items-start'} w-full">
                            <div class="px-4 py-2 rounded-2xl max-w-[80%] bg-red-100 text-red-500 line-through text-sm">
                                Angebot über $${m.offerAmount.toLocaleString()} abgelehnt.
                            </div>
                        </div>`;
                    }
                }).join('');

                if(isScrolledToBottom) box.scrollTop = box.scrollHeight;
            } catch(e) {}
        }

        document.getElementById('chat-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            if(!activeChatId) return;
            const input = document.getElementById('chat-input');
            const msg = input.value.trim();
            if(!msg) return;

            input.value = '';
            try {
                await fetch(`${API_BASE}/chat/chats/${activeChatId}/messages`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ content: msg }),
                    ...fetchOpts
                });
                fetchMessages();
            } catch(e) {}
        });

        // --- ANGEBOTE ---
        async function promptOffer() {
            const amountStr = prompt("Für welchen Preis ($) möchtest du den Artikel jetzt verbindlich anbieten?");
            if (!amountStr) return;
            const amount = parseFloat(amountStr);
            if (isNaN(amount) || amount <= 0) return alert("Ungültiger Preis.");

            try {
                const res = await fetch(`${API_BASE}/classifieds/chats/${activeChatId}/offer`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount }),
                    ...fetchOpts
                });
                const data = await res.json();
                if(res.ok) fetchMessages();
                else alert(data.error);
            } catch(e) { alert("Fehler beim Senden des Angebots."); }
        }

        async function respondToOffer(messageId, action) {
            if (action === 'accept' && !confirm("Willst du den Artikel jetzt verbindlich kaufen? Das Geld wird abgebucht.")) return;
            try {
                const res = await fetch(`${API_BASE}/classifieds/offers/${messageId}/respond`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action }),
                    ...fetchOpts
                });
                const data = await res.json();
                if(res.ok) {
                    alert(data.message);
                    fetchMessages();
                    loadDashboard(); 
                } else alert(data.error);
            } catch(e) { alert("Fehler beim Beantworten."); }
        }

        // --- AKTIONEN ---
        document.getElementById('create-ad-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const errorDiv = document.getElementById('form-error');
            errorDiv.classList.add('hidden');

            const type = document.getElementById('ad-type').value;
            const payload = {
                title: document.getElementById('ad-title').value,
                description: document.getElementById('ad-desc').value,
                price: document.getElementById('ad-price').value,
                type: type
            };

            if (type === 'limazon') {
                const select = document.getElementById('ad-inventory-select');
                if(!select.value) return showErr('Bitte wähle ein Item aus deinem Inventar.');
                payload.productId = select.value;
                payload.quantity = document.getElementById('ad-quantity').value;
                payload.imageUrl = null; 
            } else {
                const imgUrl = document.getElementById('ad-image-url').value;
                if(!imgUrl) return showErr('Bitte lade zuerst ein Bild hoch!');
                payload.imageUrl = imgUrl;
            }

            function showErr(msg) {
                errorDiv.innerText = msg;
                errorDiv.classList.remove('hidden');
            }

            try {
                const res = await fetch(`${API_BASE}/classifieds`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), ...fetchOpts });
                const data = await res.json();
                if(res.ok) { 
                    alert('Anzeige veröffentlicht!'); 
                    e.target.reset(); 
                    document.getElementById('image-preview-container').classList.add('hidden');
                    document.getElementById('ad-image-url').value = '';
                    showView('dashboard'); 
                    init(); 
                } else showErr(data.error || 'Fehler beim Speichern.');
            } catch (err) { showErr('Netzwerkfehler.'); }
        });

        async function buyAd(adId) {
            if(!confirm('Sicher über Escrow kaufen?')) return;
            try {
                const res = await fetch(`${API_BASE}/classifieds/${adId}/buy`, { method: 'POST', ...fetchOpts });
                const data = await res.json();
                if(res.ok) { alert('Erfolgreich gekauft!'); loadAds(); } 
                else alert(data.error);
            } catch (e) {}
        }

        async function markAsSold(adId) {
            if(!confirm('Anzeige als verkauft markieren?')) return;
            try {
                const res = await fetch(`${API_BASE}/classifieds/${adId}/sold`, { method: 'PATCH', ...fetchOpts });
                if(res.ok) loadDashboard();
                else alert((await res.json()).error);
            } catch(e){}
        }

        async function deleteAd(adId) {
            if(!confirm('Anzeige löschen?')) return;
            try {
                const res = await fetch(`${API_BASE}/classifieds/${adId}`, { method: 'DELETE', ...fetchOpts });
                if(res.ok) { loadAds(); loadDashboard(); init(); }
                else alert((await res.json()).error || "Fehler beim Löschen");
            } catch (e) {}
        }

        async function deleteChat(chatId) {
            if(!confirm('Diesen Chat wirklich löschen?')) return;
            try {
                const res = await fetch(`${API_BASE}/classifieds/chats/${chatId}`, { method: 'DELETE', ...fetchOpts });
                if(res.ok) {
                    if(activeChatId === chatId) showView('dashboard');
                    else loadDashboard();
                }
            } catch (e) {}
        }

        init();
    