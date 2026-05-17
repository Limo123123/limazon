
        const API_BASE = 'https://api.limazon.v6.rocks';
        const chatBox = document.getElementById('chatBox');
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        const typingIndicator = document.getElementById('typingIndicator');
        
        let currentUser = null;
        let lastMessageCount = 0;
        let pollInterval;

        // Start
        document.addEventListener('DOMContentLoaded', async () => {
            await checkAuth();
            await loadChat();
            startPolling();
        });

        // Enter-Taste
        messageInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') sendMessage();
        });

        async function checkAuth() {
            try {
                const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
                if (!res.ok) throw new Error("Nicht eingeloggt");
                currentUser = await res.json();
            } catch (e) {
                window.location.href = '../index.html';
            }
        }

        async function loadChat() {
            try {
                const res = await fetch(`${API_BASE}/api/therapy/chat`, { credentials: 'include' });
                const data = await res.json();
                
                if (data.messages && data.messages.length > lastMessageCount) {
                    lastMessageCount = data.messages.length;
                    renderMessages(data.messages);
                    
                    // Wenn die letzte Nachricht vom Bot war, den Typing-Indikator verstecken
                    const lastMsg = data.messages[data.messages.length - 1];
                    if(lastMsg && lastMsg.isAi) {
                        typingIndicator.style.display = 'none';
                    }
                }
            } catch (e) { console.error("Konnte Chat nicht laden."); }
        }

        function renderMessages(messages) {
            // Behalte die Willkommens-Nachricht (das erste Kind-Element)
            const welcomeText = chatBox.children[0].outerHTML;
            chatBox.innerHTML = welcomeText;

            messages.forEach(msg => {
                const isMe = msg.senderId === currentUser.userId;
                const time = new Date(msg.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
                
                const div = document.createElement('div');
                div.className = `msg ${isMe ? 'msg-user' : 'msg-doc'}`;
                
                // Falls es der Arzt ist, füge "Dr. Limo" als kleinen Namenstitel hinzu
                const nameLabel = !isMe ? `<div class="text-[10px] text-cyan-400 font-bold mb-1">Dr. Limo</div>` : '';
                
                div.innerHTML = `
                    ${nameLabel}
                    <div>${msg.content}</div>
                    <div class="msg-time ${isMe ? 'text-sky-200' : 'text-slate-500'}">${time}</div>
                `;
                chatBox.appendChild(div);
            });
            
            scrollToBottom();
        }

        async function sendMessage() {
            const content = messageInput.value.trim();
            if (!content) return;

            // UI sofort updaten (Optimistic Update)
            messageInput.value = '';
            sendBtn.disabled = true;
            
            // Lokale Nachricht rendern
            const tempDiv = document.createElement('div');
            tempDiv.className = 'msg msg-user';
            tempDiv.innerHTML = `<div>${content}</div><div class="msg-time text-sky-200">Jetzt</div>`;
            chatBox.appendChild(tempDiv);
            scrollToBottom();

            // Typing Indikator anzeigen (Dr. Limo tippt...)
            typingIndicator.style.display = 'inline-block';

            try {
                await fetch(`${API_BASE}/api/therapy/chat/message`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ content })
                });
                // Das finale Laden passiert übers Polling
            } catch (e) {
                typingIndicator.style.display = 'none';
                alert("Senden fehlgeschlagen.");
            } finally {
                sendBtn.disabled = false;
                messageInput.focus();
            }
        }

        function scrollToBottom() {
            chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: 'smooth' });
        }

        // Smart Polling (Holt alle 3 Sekunden neue Nachrichten, wenn Dr. Limo geantwortet hat)
        function startPolling() {
            pollInterval = setInterval(loadChat, 3000);
        }
    