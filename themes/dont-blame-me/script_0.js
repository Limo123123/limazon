
        const API_URL = 'https://api.limazon.v6.rocks'; 
        
        // --- RENDER LOGIC ---

        function renderCard(post) {
            const container = document.createElement('div');
            container.className = 'card-container group';

            // 1. ARTWORK (Oben)
            const artDiv = document.createElement('div');
            artDiv.className = 'art-header';
            
            const p = post.imageParams || {};
            // Fallback zu einem dunklen Rot-Ton, falls die DB nichts liefert, sonst die DB-Farbe
            artDiv.style.backgroundColor = p.backgroundColor || '#2a0a0a';
            
            const title = document.createElement('h2');
            title.className = 'art-text';
            title.innerText = "Don't Blame Me";
            // Fallback zu Weiß oder einem hellen Rot
            title.style.color = p.textColor || '#ffcccc';
            // Mehr Font-Auswahl
            const fonts = ['Playfair Display', 'Cinzel', 'Old Standard TT', 'serif'];
            title.style.fontFamily = p.fontFamily && fonts.includes(p.fontFamily) ? p.fontFamily : fonts[Math.floor(Math.random() * fonts.length)];
            
            title.style.fontSize = (parseInt(p.fontSize || 24) * 1.6) + 'px'; 
            title.style.fontWeight = '900';
            
            const overlay = document.createElement('div');
            overlay.className = 'art-overlay';

            artDiv.appendChild(overlay);
            artDiv.appendChild(title);

            // 2. CONTENT (Unten)
            const bodyDiv = document.createElement('div');
            bodyDiv.className = 'card-body';

            const avatarUrl = `https://ui-avatars.com/api/?name=${post.username}&background=111&color=900&size=48&bold=true`;
            
            bodyDiv.innerHTML = `
                <div class="flex-grow">
                    <p class="text-2xl text-gray-200 font-serif leading-tight italic">"${post.reason}"</p>
                </div>
                <div class="flex items-center gap-3 pt-4 border-t border-red-900/30 mt-2">
                    <img src="${avatarUrl}" class="w-8 h-8 rounded-full opacity-80 border border-red-900/50">
                    <span class="text-xs font-mono text-red-400/70 uppercase tracking-wider">${post.username}</span>
                </div>
            `;

            container.appendChild(artDiv);
            container.appendChild(bodyDiv);
            return container;
        }

        async function fetchPosts() {
            try {
                const response = await fetch(`${API_URL}/api/dont-blame-me`);
                const data = await response.json();
                const container = document.getElementById('posts-container');

                container.innerHTML = ''; 
                
                if(!data.posts || data.posts.length === 0) {
                    container.innerHTML = '<div class="text-center text-gray-500 text-xl w-full col-span-full mt-10">Noch keine Einträge. Sei der Erste!</div>';
                    return;
                }

                data.posts.forEach(post => {
                    const card = renderCard(post);
                    container.appendChild(card);
                });
            } catch (error) {
                console.error(error);
                document.getElementById('posts-container').innerHTML = '<div class="text-red-500 text-center col-span-full py-10">Fehler beim Laden der Datenbank.</div>';
            }
        }

        // --- FORM HANDLING ---
        const postForm = document.getElementById('post-form');
        const reasonInput = document.getElementById('reason-input');
        const charCount = document.getElementById('char-count');
        const errorBox = document.getElementById('error-message');

        if(reasonInput) {
            reasonInput.addEventListener('input', () => {
                const len = reasonInput.value.length;
                charCount.innerText = `${len}/140`;
                if(len > 120) charCount.classList.add('text-red-500');
                else charCount.classList.remove('text-red-500');
            });
        }

        if (postForm) {
            postForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const reason = reasonInput.value.trim();
                const btn = document.getElementById('submit-btn');

                errorBox.classList.add('hidden');
                
                if (!reason) return;

                btn.disabled = true;
                btn.innerText = "SENDE...";

                try {
                    const response = await fetch(`${API_URL}/api/dont-blame-me`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ reason }),
                        credentials: 'include'
                    });

                    if (response.ok) {
                        reasonInput.value = '';
                        charCount.innerText = '0/140';
                        fetchPosts();
                    } else {
                        const d = await response.json();
                        errorBox.innerText = d.error || "Fehler beim Senden.";
                        errorBox.classList.remove('hidden');
                    }
                } catch (error) {
                    errorBox.innerText = "Verbindungsfehler.";
                    errorBox.classList.remove('hidden');
                } finally {
                    btn.disabled = false;
                    btn.innerText = "VERÖFFENTLICHEN";
                }
            });
        }
        
        async function checkLoginStatus() {
            try {
                const res = await fetch(`${API_URL}/api/auth/me`, { credentials: 'include' });
                if(res.ok) {
                    document.getElementById('user-area').classList.remove('hidden');
                    document.getElementById('guest-area').classList.add('hidden');
                } else {
                    document.getElementById('user-area').classList.add('hidden');
                    document.getElementById('guest-area').classList.remove('hidden');
                }
            } catch(e) {}
        }

        function openLogin() {
            alert("Bitte logge dich über das Hauptportal ein.");
            window.location.href = '../index.html'; 
        }

        // Init
        document.addEventListener('DOMContentLoaded', () => {
            fetchPosts();
            checkLoginStatus();
        });

    