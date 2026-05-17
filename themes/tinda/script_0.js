
        // --- CONFIG ---
        const BACKEND_URL = 'https://api.limazon.v6.rocks'; // URL ANPASSEN falls nötig

        let stack = [];
        let currentCard = null;
        let activeChatId = null;
        let pollingInterval = null;
        
        let activePartnerName = "";
        let activeIsMarried = false;
        let activeChatType = null; // Wichtig für Kinder/Familien Unterscheidung

        async function api(endpoint, method = 'GET', body = null) {
            try {
                const options = { method, headers: { 'Content-Type': 'application/json' }, credentials: 'include' };
                if (body) options.body = JSON.stringify(body);
                const res = await fetch(`${BACKEND_URL}${endpoint}`, options);
                return await res.json();
            } catch (err) { console.error(err); return null; }
        }

        // --- SWIPE ---
        async function loadStack() {
            const container = document.getElementById('stack-container');
            container.innerHTML = '<div class="loading">Lade Profile...</div>';
            const data = await api('/api/tinda/stack');
            if (data && data.stack) {
                stack = data.stack;
                renderNextCard();
            } else {
                container.innerHTML = '<div class="empty-stack">Fehler beim Laden.</div>';
            }
        }

        function renderNextCard() {
            const container = document.getElementById('stack-container');
            if (stack.length === 0) {
                container.innerHTML = '<div class="empty-stack">Keine neuen Leute.<br>Klick auf ↻ um Reset zu machen! Oder probiere erst die Flamme oben rechts!</div>';
                currentCard = null;
                return;
            }
            currentCard = stack[0];
            const imgUrl = currentCard.image_url && currentCard.image_url.startsWith('http') ? currentCard.image_url : 'https://placehold.co/400x600/222/fff?text=No+Image';
            
            const displayAge = currentCard.age ? `, ${currentCard.age}` : '';
            
            container.innerHTML = `
                <div class="tinda-card" style="background-image: url('${imgUrl}');">
                    <div class="card-info">
                        <h2>${currentCard.name}${displayAge}</h2>
                        <p>${currentCard.categoryId || 'Unbekannt'}</p>
                        <div class="bio">${currentCard.bio || ''}</div>
                        ${currentCard.averages && currentCard.totalAverage ? `<p style="color:#44db95">⭐ ${currentCard.totalAverage.toFixed(1)}</p>` : ''}
                    </div>
                </div>`;
        }

        async function swipe(direction) {
            if (!currentCard) return;
            const cardEl = document.querySelector('.tinda-card');
            cardEl.style.transform = direction === 'left' ? 'translate(-150%, 20px) rotate(-30deg)' : 'translate(150%, 20px) rotate(30deg)';
            cardEl.style.opacity = '0';
            
            api('/api/tinda/swipe', 'POST', { humanId: currentCard._id, direction }).then(res => {
                if (res && res.match) showMatchPopup(res.humanName);
            });
            setTimeout(() => { stack.shift(); renderNextCard(); }, 300);
        }

        // --- RESET FEATURE ---
        async function resetNopes() {
            if(!confirm("Willst du alle Leute zurückholen, die du weggeswiped hast?")) return;
            const res = await api('/api/tinda/reset-swipes', 'POST');
            alert(res.message);
            loadStack();
        }

        // --- MATCHES & SEARCH ---
        async function loadMatches() {
            const container = document.getElementById('match-list-container');
            container.innerHTML = '<div class="loading">Lade Chats...</div>';
            const data = await api('/api/chat/chats');
            if (data && data.chats) {
                // Erlaubt nun auch Kinder- und Familienchats
                const tindaChats = data.chats.filter(c => ['tinda', 'tinda_child', 'tinda_family'].includes(c.type));
                
                if (tindaChats.length === 0) {
                    container.innerHTML = '<div class="empty-stack">Noch keine Matches.</div>';
                    return;
                }
                
                container.innerHTML = tindaChats.map(chat => {
                    let displayName = chat.tindaPartnerName;
                    let typeIcon = '';
                    let marriedIcon = chat.isMarried && chat.type === 'tinda' ? '💍' : '';

                    if(chat.type === 'tinda_child') {
                        displayName = chat.childName;
                        typeIcon = '👶';
                    }
                    if(chat.type === 'tinda_family') {
                        displayName = "Familie " + chat.tindaPartnerName;
                        typeIcon = '👨‍👩‍👧‍👦';
                    }
                    
                    const img = 'https://placehold.co/50x50/333/fff?text=' + displayName.charAt(0);
                    const safeName = displayName.replace(/'/g, "\\'");
                    
                    return `
                        <div class="match-item" onclick="openChat('${chat._id}', '${safeName}', ${!!chat.isMarried}, '${chat.type}')">
                            <img class="match-avatar" src="${img}">
                            <div class="match-info">
                                <div class="match-name">${displayName} ${marriedIcon} ${typeIcon}</div>
                                <div class="match-preview">${chat.lastMessagePreview || '...'}</div>
                            </div>
                        </div>`;
                }).join('');
            }
        }

        let searchTimeout;
        function searchPeople(term) {
            clearTimeout(searchTimeout);
            const resultsDiv = document.getElementById('search-results');
            if(term.length < 2) { resultsDiv.style.display = 'none'; return; }
            
            searchTimeout = setTimeout(async () => {
                const data = await api(`/api/tinda/search?q=${term}`);
                if(data && data.results && data.results.length > 0) {
                    resultsDiv.innerHTML = data.results.map( p => `
                        <div class="search-item" onclick="startDirectChat('${p._id}')">
                            <img src="${p.image_url && p.image_url.startsWith('http') ? p.image_url : 'https://placehold.co/30/333/fff?text=' + p.name.charAt(0)}">
                            <span>${p.name} (${p.categoryId || 'Human'})</span>
                        </div>
                    `).join('');
                    resultsDiv.style.display = 'block';
                } else {
                    resultsDiv.style.display = 'none';
                }
            }, 300);
        }

        async function startDirectChat(humanId) {
            document.getElementById('search-results').style.display = 'none';
            document.querySelector('.search-input').value = '';
            const res = await api('/api/tinda/match/direct', 'POST', { humanId });
            if(res && res.success) {
                openChat(res.chat._id, res.chat.tindaPartnerName, false, res.chat.type);
            } else {
                alert("Fehler beim Starten des Chats.");
            }
        }

        // --- CHAT ---
        async function openChat(chatId, name, isMarried, type = 'tinda') {
            activeChatId = chatId;
            activePartnerName = name;
            activeIsMarried = isMarried;
            activeChatType = type;
            
            document.getElementById('chat-window').style.display = 'flex';
            
            // Name im Header je nach Chat anpassen
            let headerName = name;
            if (isMarried && type === 'tinda') headerName += ' 💍';
            if (type === 'tinda_child') headerName += ' 👶';
            if (type === 'tinda_family') headerName += ' 👨‍👩‍👧‍👦';

            document.getElementById('chat-header-name').innerText = headerName;
            document.getElementById('chat-header-img').src = 'https://placehold.co/50x50/333/fff?text=' + name.charAt(0);
            
            renderRelationshipBar();
            
            await loadMessages();
            if (pollingInterval) clearInterval(pollingInterval);
            pollingInterval = setInterval(loadMessages, 3000);
        }
        
        // UI Logik für Beziehungsstatus & Kinder
        function renderRelationshipBar() {
            const bar = document.getElementById('relationship-bar');
            
            // Bei Kinder-Chats: Shortcut zum Dashboard anbieten
            if (activeChatType === 'tinda_child' || activeChatType === 'tinda_family') {
                bar.innerHTML = `
                    <button class="rel-btn" style="background: #2ecc71; color: white;" onclick="window.location.href='/themes/family-dashboard.html'">🍼 Zum Familien-Dashboard</button>
                `;
                return;
            }

            if (activeIsMarried) {
                bar.innerHTML = `
                    <button class="rel-btn btn-allowance" onclick="getSharedAllowance()">🏦 Taschengeld ($1.500)</button>
                    <button class="rel-btn btn-child" onclick="haveChild()">👶 Kind bekommen</button>
                    <button class="rel-btn btn-divorce" onclick="divorcePartner()">💔 Scheidung ($5.000)</button>
                `;
            } else {
                bar.innerHTML = `
                    <button class="rel-btn btn-marry" onclick="marryPartner()">💍 Heiraten ($10.000)</button>
                `;
            }
        }

        // --- NEU: Kind bekommen ---
        async function haveChild() {
            const childName = prompt(`Herzlichen Glückwunsch! Wie soll das Kind von dir und ${activePartnerName} heißen?`);
            if (!childName || childName.trim().length < 2) return;

            const res = await api(`/api/tinda/chat/${activeChatId}/have-child`, 'POST', { childName });
            if (res && res.error) {
                alert(res.error);
            } else {
                alert(res.message);
                loadMessages(); 
            }
        }

        async function marryPartner() {
            if(!confirm(`Möchtest du ${activePartnerName} wirklich heiraten?\nDas kostet $10.000 für die Feier und ihr zieht zusammen.`)) return;
            const res = await api(`/api/tinda/chat/${activeChatId}/marry`, 'POST');
            if(res && res.error) {
                alert(res.error);
            } else {
                activeIsMarried = true;
                document.getElementById('chat-header-name').innerText = activePartnerName + ' 💍';
                renderRelationshipBar();
                loadMessages();
            }
        }

        async function divorcePartner() {
            if(!confirm(`Willst du dich wirklich von ${activePartnerName} scheiden lassen?\nDas kostet $5.000 Anwaltskosten und wirft deinen Partner aus deiner Wohnung.`)) return;
            const res = await api(`/api/tinda/chat/${activeChatId}/divorce`, 'POST');
            if(res && res.error) {
                alert(res.error);
            } else {
                activeIsMarried = false;
                document.getElementById('chat-header-name').innerText = activePartnerName;
                renderRelationshipBar();
                loadMessages();
            }
        }

        async function getSharedAllowance() {
            const res = await api(`/api/tinda/chat/${activeChatId}/shared-account`, 'POST');
            if(res && res.error) {
                alert(res.error);
            } else {
                alert(`Erfolg! Du hast $1.500 vom gemeinsamen Konto abgehoben. Neues Guthaben: $${res.newBalance.toLocaleString()}`);
                loadMessages(); // Lade Chat neu (für mögliche KI Reaktion)
            }
        }

        async function deleteCurrentChat() {
            if(!activeChatId) return;
            if(!confirm("Diesen Chat und das Match wirklich löschen?")) return;
            
            await api(`/api/tinda/chat/${activeChatId}`, 'DELETE');
            closeChat();
        }

        async function loadMessages() {
            if (!activeChatId) return;
            const data = await api(`/api/chat/chats/${activeChatId}/messages?limit=30`);
            if (data && data.messages) {
                const container = document.getElementById('messages-container');
                const shouldScroll = container.scrollTop + container.clientHeight >= container.scrollHeight - 50;
                
                container.innerHTML = data.messages.map(msg => {
                    if (msg.isSystem) {
                        return `<div class="message msg-system">${msg.content}</div>`;
                    }
                    const style = msg.isAi ? 'msg-other' : 'msg-me';
                    // Bei Familienchats wird von der KI teils der Name davor geschrieben, das lassen wir einfach als Content stehen
                    return `<div class="message ${style}">${msg.content}</div>`;
                }).join('');
                
                if (shouldScroll) container.scrollTop = container.scrollHeight;
            }
        }

        async function sendMessage() {
            const input = document.getElementById('msg-input');
            const text = input.value.trim();
            if (!text || !activeChatId) return;
            
            input.value = '';
            const container = document.getElementById('messages-container');
            container.innerHTML += `<div class="message msg-me" style="opacity:0.5">${text}</div>`;
            container.scrollTop = container.scrollHeight;
            
            await api(`/api/tinda/chat/${activeChatId}/message`, 'POST', { content: text });
            loadMessages();
        }

        async function sendMoneyPrompt() {
            if (!activeChatId) return;
            
            const amountStr = prompt(`Wie viel Geld möchtest du senden?\n(Achtung: Das Geld ist danach weg!)`);
            if (!amountStr) return;

            const amount = parseFloat(amountStr);
            if (isNaN(amount) || amount <= 0) {
                alert("Bitte eine gültige Zahl größer als 0 eingeben.");
                return;
            }

            if (!confirm(`Wirklich $${amount.toLocaleString()} senden?`)) return;

            const container = document.getElementById('messages-container');
            container.innerHTML += `<div class="message msg-system" style="opacity:0.5">💸 Sende $${amount.toLocaleString()}...</div>`;
            container.scrollTop = container.scrollHeight;

            const res = await api(`/api/tinda/chat/${activeChatId}/transfer`, 'POST', { amount });
            
            if (res && res.error) {
                alert("Fehler: " + res.error);
            }
            loadMessages(); 
        }

        function closeChat() {
            document.getElementById('chat-window').style.display = 'none';
            activeChatId = null;
            activePartnerName = "";
            activeIsMarried = false;
            activeChatType = null;
            if (pollingInterval) clearInterval(pollingInterval);
            loadMatches();
        }

        function showMatchPopup(name) { document.getElementById('match-partner-name').innerText = name; document.getElementById('match-overlay').style.display = 'flex'; }
        function closeMatchPopup() { document.getElementById('match-overlay').style.display = 'none'; }
        function goToMatches() { closeMatchPopup(); showMatches(); }
        function handleEnter(e) { if (e.key === 'Enter') sendMessage(); }

        function showSwipe() {
            document.getElementById('swipe-view').style.display = 'flex';
            document.getElementById('matches-view').style.display = 'none';
            document.querySelectorAll('.nav-btn')[0].classList.remove('active');
            document.querySelectorAll('.nav-btn')[1].classList.add('active');
            loadStack();
        }
        function showMatches() {
            document.getElementById('swipe-view').style.display = 'none';
            document.getElementById('matches-view').style.display = 'flex';
            document.querySelectorAll('.nav-btn')[0].classList.add('active');
            document.querySelectorAll('.nav-btn')[1].classList.remove('active');
            loadMatches();
        }

        window.onload = async () => {
            // URL checken: Kommen wir vom Family-Dashboard?
            const urlParams = new URLSearchParams(window.location.search);
            const autoOpenChatId = urlParams.get('chatId');

            if (autoOpenChatId) {
                // Wechsel direkt in die Chat-Ansicht
                document.getElementById('swipe-view').style.display = 'none';
                document.getElementById('matches-view').style.display = 'flex';
                
                // Wir müssen kurz die Chats vom Server holen, um Namen & Typ zu kennen
                const data = await api('/api/chat/chats');
                if (data && data.chats) {
                    const targetChat = data.chats.find(c => c._id === autoOpenChatId);
                    
                    if (targetChat) {
                        let displayName = targetChat.tindaPartnerName;
                        if(targetChat.type === 'tinda_child') displayName = targetChat.childName;
                        if(targetChat.type === 'tinda_family') displayName = "Familie " + targetChat.tindaPartnerName;
                        
                        // Öffne den Chat sofort
                        openChat(targetChat._id, displayName, !!targetChat.isMarried, targetChat.type);
                    } else {
                        // Chat nicht gefunden (vielleicht Jugendamt war da?) -> Normal laden
                        loadStack();
                    }
                }
            } else {
                // Ganz normaler Tinda-Start (Swipen)
                loadStack();
            }
        };
    