
        const API_BASE_URL = 'https://api.limazon.v6.rocks';
        let currentUser = null;

        // Fetch Helper
        async function fetchAuth(url, options = {}) {
            options.credentials = 'include';
            return fetch(url, options);
        }

        // --- INIT ---
        document.addEventListener('DOMContentLoaded', async () => {
            await checkAuth();
            await loadIdeas();
        });

        async function checkAuth() {
            try {
                const res = await fetchAuth(`${API_BASE_URL}/api/auth/me`);
                if(res.ok) {
                    currentUser = await res.json();
                    document.getElementById('idea-form').classList.remove('hidden');
                } else {
                    document.getElementById('login-warning').classList.remove('hidden');
                }
            } catch(e) {}
        }

        // --- SUBMIT ---
        document.getElementById('idea-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('btn-submit');
            const msg = document.getElementById('form-msg');
            const title = document.getElementById('idea-title').value;
            const desc = document.getElementById('idea-description').value;

            btn.disabled = true;
            btn.innerText = "...";
            msg.innerText = "";

            try {
                const res = await fetchAuth(`${API_BASE_URL}/api/ideas`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, description: desc })
                });
                
                const data = await res.json();

                if(res.ok) {
                    msg.innerHTML = '<span class="text-green-400">Gesendet! Danke.</span>';
                    document.getElementById('idea-form').reset();
                    loadIdeas();
                } else {
                    msg.innerHTML = `<span class="text-red-400">${data.error || 'Fehler'}</span>`;
                }
            } catch(e) {
                msg.innerHTML = '<span class="text-red-400">Verbindungsfehler.</span>';
            } finally {
                btn.disabled = false;
                btn.innerText = "ABSENDEN";
                setTimeout(() => { msg.innerText = ""; }, 3000);
            }
        });

        // --- LOAD LIST ---
        async function loadIdeas() {
            try {
                const res = await fetchAuth(`${API_BASE_URL}/api/ideas`);
                const data = await res.json();
                renderList(data.ideas || []);
            } catch(e) {
                document.getElementById('ideas-list').innerHTML = '<div class="text-red-500 text-center">Fehler beim Laden.</div>';
            }
        }

        function renderList(ideas) {
            const list = document.getElementById('ideas-list');
            list.innerHTML = '';

            if(ideas.length === 0) {
                list.innerHTML = '<div class="text-center text-gray-500 py-10">Noch keine Ideen. Sei der Erste!</div>';
                return;
            }

            ideas.forEach(idea => {
                const date = new Date(idea.createdAt).toLocaleDateString('de-DE');
                const card = document.createElement('div');
                card.className = 'idea-card p-6 rounded-xl relative group';
                
                // Status Logic
                let statusClass = 'status-new';
                let statusText = 'NEU';
                if(idea.status === 'in-progress') { statusClass = 'status-in-progress'; statusText = 'IN ARBEIT'; }
                if(idea.status === 'done') { statusClass = 'status-done'; statusText = 'ERLEDIGT'; }
                if(idea.status === 'rejected') { statusClass = 'status-rejected'; statusText = 'ABGELEHNT'; }

                // Admin Controls
                let adminHtml = '';
                if(currentUser && currentUser.isAdmin) {
                    adminHtml = `
                        <div class="mt-4 pt-4 border-t border-white/5 flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <select onchange="updateStatus('${idea._id}', this.value)" class="bg-black text-xs text-white border border-gray-700 rounded p-1">
                                <option value="new" ${idea.status==='new'?'selected':''}>Neu</option>
                                <option value="in-progress" ${idea.status==='in-progress'?'selected':''}>WIP</option>
                                <option value="done" ${idea.status==='done'?'selected':''}>Fertig</option>
                                <option value="rejected" ${idea.status==='rejected'?'selected':''}>Abgelehnt</option>
                            </select>
                            <button onclick="deleteIdea('${idea._id}')" class="text-xs bg-red-900/50 text-red-400 px-2 py-1 rounded hover:bg-red-900">DEL</button>
                        </div>
                    `;
                }

                card.innerHTML = `
                    <div class="flex justify-between items-start mb-2">
                        <h3 class="text-xl font-bold text-white">${escapeHtml(idea.title)}</h3>
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </div>
                    <p class="text-gray-300 text-sm leading-relaxed mb-4">${escapeHtml(idea.description)}</p>
                    
                    <div class="flex justify-between items-center text-xs text-gray-500 font-mono">
                        <div class="flex items-center gap-2">
                            <div class="w-6 h-6 rounded-full bg-blue-900/50 flex items-center justify-center text-blue-400 font-bold">
                                ${idea.submitterUsername.charAt(0).toUpperCase()}
                            </div>
                            <span>${escapeHtml(idea.submitterUsername)}</span>
                        </div>
                        <span>${date}</span>
                    </div>
                    ${adminHtml}
                `;
                list.appendChild(card);
            });
        }

        // --- ADMIN ACTIONS ---
        async function updateStatus(id, status) {
            try {
                await fetchAuth(`${API_BASE_URL}/api/ideas/${id}/status`, {
                    method: 'PATCH',
                    headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({status})
                });
                loadIdeas();
            } catch(e) { alert("Fehler"); }
        }

        async function deleteIdea(id) {
            if(!confirm("Löschen?")) return;
            try {
                await fetchAuth(`${API_BASE_URL}/api/ideas/${id}`, { method: 'DELETE' });
                loadIdeas();
            } catch(e) { alert("Fehler"); }
        }

        function escapeHtml(text) {
            if (!text) return text;
            return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
        }

    