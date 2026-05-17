
        const API_URL = 'https://api.limazon.v6.rocks';
        let currentUser = null;

        document.getElementById('date-display').innerText = new Date().toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        checkAuth();

        async function checkAuth() {
            try {
                const res = await fetch(API_URL + '/api/auth/me', { credentials: 'include' });
                if (res.ok) {
                    currentUser = await res.json();
                    if (currentUser.isAdmin) document.getElementById('admin-box').classList.remove('hidden');
                }
                loadNews();
            } catch (e) { loadNews(); }
        }

        async function loadNews() {
            try {
                const res = await fetch(API_URL + '/api/news');
                const data = await res.json();
                renderNews(data.news);
            } catch (e) { console.error(e); }
        }

        function renderNews(news) {
            const container = document.getElementById('news-feed');
            container.innerHTML = '';

            if (news.length === 0) {
                container.innerHTML = '<div class="text-center py-10 font-sans text-gray-500">Noch keine Nachrichten heute. Die Welt schläft.</div>';
                return;
            }

            news.forEach((n, index) => {
                const isMain = index === 0;
                const date = new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const authorClass = n.category === 'Offiziell' ? 'text-red-600 font-bold' : 'text-gray-500';

                // Admin Delete Button Logik
                const deleteBtn = (currentUser && currentUser.isAdmin)
                    ? `<button onclick="deleteNews('${n._id}')" class="text-xs text-red-400 hover:text-red-600 font-bold border border-red-200 px-2 py-1 rounded ml-4">LÖSCHEN 🗑️</button>`
                    : '';

                const html = `
                    <article class="bg-white p-6 shadow-sm border border-gray-200 news-card ${isMain ? 'md:p-10 border-b-4 border-black' : ''}">
                        <div class="flex justify-between items-center mb-2 font-sans text-xs uppercase tracking-wide text-gray-400">
                            <span>${n.category || 'News'}</span>
                            <div class="flex items-center">
                                <span>${date} Uhr</span>
                                ${deleteBtn} </div>
                        </div>
                        <h2 class="${isMain ? 'text-4xl md:text-5xl' : 'text-2xl'} font-bold leading-tight mb-4 text-gray-900">
                            ${n.headline}
                        </h2>
                        <p class="${isMain ? 'text-xl text-gray-700' : 'text-base text-gray-600'} leading-relaxed mb-4">
                            ${n.content}
                        </p>
                        <div class="flex justify-between items-center border-t pt-4 mt-4 font-sans text-sm">
                            <span class="${authorClass}">Von ${n.author}</span>
                            <button onclick="likeNews('${n._id}')" class="flex items-center gap-1 text-gray-500 hover:text-red-500 transition cursor-pointer">
                                ❤️ <span id="likes-${n._id}">${n.likes || 0}</span>
                            </button>
                        </div>
                    </article>
                `;
                container.innerHTML += html;
            });
        }

        async function deleteNews(id) {
            if (!confirm("Diesen Artikel wirklich löschen?")) return;
            try {
                const res = await fetch(API_URL + '/api/admin/news/' + id, { method: 'DELETE', credentials: 'include' });
                if (res.ok) {
                    loadNews(); // Neu laden
                } else {
                    alert("Fehler beim Löschen.");
                }
            } catch (e) { alert("Serverfehler."); }
        }

        async function likeNews(id) {
            if (!currentUser) return alert("Bitte einloggen.");
            try {
                await fetch(API_URL + '/api/news/' + id + '/like', { method: 'POST', credentials: 'include' });
                const el = document.getElementById('likes-' + id);
                el.innerText = parseInt(el.innerText) + 1;
            } catch (e) { }
        }

        async function postAdminNews() {
            const h = document.getElementById('admin-headline').value;
            const c = document.getElementById('admin-content').value;
            if (!h || !c) return alert("Bitte alles ausfüllen.");

            const res = await fetch(API_URL + '/api/admin/news', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ headline: h, content: c }), credentials: 'include'
            });
            if (res.ok) {
                document.getElementById('admin-headline').value = '';
                document.getElementById('admin-content').value = '';
                loadNews();
            }
        }

        async function triggerAiNews() {
            const btn = document.getElementById('btn-ai-trigger');
            const originalText = btn.innerHTML;
            btn.innerHTML = `<span class="animate-spin">⚙️</span>...`;
            btn.disabled = true;
            try {
                const res = await fetch(API_URL + '/api/admin/news/trigger-ai', { method: 'POST', credentials: 'include' });
                if (res.ok) loadNews();
                else alert("Fehler.");
            } catch (e) { alert("Verbindungsfehler."); }
            finally { btn.innerHTML = originalText; btn.disabled = false; }
        }
    