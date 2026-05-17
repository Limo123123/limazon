
        const API_BASE = 'https://api.limazon.v6.rocks/api';

        let currentTargetUser = null;
        let currentOpenPin = null;
        let isOwnProfile = false; // Merken, ob wir unser eigenes Profil sehen

        async function fetchAuth(url, options = {}) {
            const defaults = { credentials: 'include', headers: { 'Content-Type': 'application/json' } };
            return fetch(url, { ...defaults, ...options });
        }

        // --- FEED ---
        async function loadFeed(query = '', username = '') {
            let url = `${API_BASE}/limterest/feed?`;
            if (query) url += `q=${encodeURIComponent(query)}&`;
            if (username) url += `username=${encodeURIComponent(username)}`;

            const titleEl = document.getElementById('page-title');
            if (username) titleEl.innerText = `Pins von @${username}`;
            else if (query) titleEl.innerText = `Suche: "${query}"`;
            else titleEl.innerText = "Entdecken";

            try {
                const res = await fetchAuth(url);
                const data = await res.json();
                renderGrid(data.pins, 'grid');
            } catch (e) { console.error(e); }
        }

        function renderGrid(pins, containerId) {
            const container = document.getElementById(containerId);
            container.innerHTML = '';
            if (!pins || pins.length === 0) {
                container.innerHTML = '<div style="color:#555; width:100%; text-align:center;">Nichts gefunden.</div>';
                return;
            }
            pins.forEach(pin => {
                const div = document.createElement('div');
                div.className = 'pin';
                const pinDataString = encodeURIComponent(JSON.stringify(pin));
                const avatarUrl = `https://ui-avatars.com/api/?name=${pin.username}&background=random&color=fff`;

                div.innerHTML = `
                    <img src="${pin.imageUrl}" onclick="openPinDetail('${pinDataString}')" onerror="this.src='https://placehold.co/400x300?text=Fehler'">
                    <div class="pin-overlay">
                        <div class="pin-title">${pin.title}</div>
                        <div class="user-tag" onclick="openProfile('${pin.username}')">
                            <img src="${avatarUrl}" class="user-avatar-small">
                            <span>${pin.username}</span>
                        </div>
                    </div>
                `;
                container.appendChild(div);
            });
        }

        // --- PIN DETAIL ---
        async function openPinDetail(pinDataString) {
            try {
                const pin = JSON.parse(decodeURIComponent(pinDataString));
                currentOpenPin = pin;

                document.getElementById('pinMenu').classList.remove('show');
                const btnSave = document.getElementById('btnSave');
                btnSave.innerText = "Lade...";
                btnSave.style.background = "";

                // Fill Data
                document.getElementById('detailImg').src = pin.imageUrl;
                document.getElementById('detailTitle').innerText = pin.title;
                document.getElementById('detailUsername').innerText = pin.username;
                document.getElementById('detailUserAvatar').src = `https://ui-avatars.com/api/?name=${pin.username}&background=random&color=fff`;
                document.getElementById('detailLink').href = pin.imageUrl;
                document.getElementById('detailDesc').innerText = pin.description || "Keine Beschreibung.";

                document.getElementById('detailUserTag').onclick = () => {
                    closeModals(); openProfile(pin.username);
                };

                const tagsContainer = document.getElementById('detailTags');
                tagsContainer.innerHTML = '';
                if (pin.tags) pin.tags.forEach(tag => {
                    const chip = document.createElement('span');
                    chip.className = 'tag-chip';
                    chip.innerText = "#" + tag;
                    chip.onclick = () => { closeModals(); loadFeed(tag); };
                    tagsContainer.appendChild(chip);
                });

                document.getElementById('modalPinDetail').classList.add('show');

                // Check Status (Is Saved?)
                try {
                    const res = await fetchAuth(`${API_BASE}/limterest/pin/${pin._id}/is-saved`);
                    const data = await res.json();
                    if (data.isSaved) {
                        btnSave.innerText = "Gemerkt";
                        btnSave.style.background = "black";
                    } else {
                        btnSave.innerText = "Merken";
                        btnSave.style.background = ""; // Reset to Primary Color
                    }
                } catch (e) { btnSave.innerText = "Merken"; }

            } catch (e) { console.error(e); }
        }

        async function saveCurrentPin() {
            if (!currentOpenPin) return;
            const btn = document.getElementById('btnSave');
            const originalText = btn.innerText;
            btn.innerText = "...";

            try {
                const res = await fetchAuth(`${API_BASE}/limterest/pin/${currentOpenPin._id}/save`, { method: 'POST' });
                const data = await res.json();
                if (data.isSaved) {
                    btn.innerText = "Gemerkt"; btn.style.background = "black";
                } else {
                    btn.innerText = "Merken"; btn.style.background = "";
                }
            } catch (e) {
                btn.innerText = originalText; alert("Fehler.");
            }
        }

        function shareCurrentPin() {
            if (!currentOpenPin) return;
            navigator.clipboard.writeText(currentOpenPin.imageUrl).then(() => {
                alert("Link kopiert!"); document.getElementById('pinMenu').classList.remove('show');
            });
        }
        function togglePinMenu() { document.getElementById('pinMenu').classList.toggle('show'); }
        function downloadCurrentPin() {
            if (currentOpenPin) window.open(currentOpenPin.imageUrl, '_blank');
        }
        function reportPin() {
            if (currentOpenPin && confirm("Melden?")) alert("Gemeldet.");
        }

        // --- PROFILE & TABS ---
        async function openProfile(username) {
            currentTargetUser = username;
            isOwnProfile = false;

            const modal = document.getElementById('modalProfile');
            const grid = document.getElementById('userPinGrid');
            const tabs = document.getElementById('profileTabs');

            grid.innerHTML = '<div style="text-align:center; padding:20px; color:#aaa;">Lade...</div>';
            modal.classList.add('show');
            tabs.style.display = 'none'; // Default hidden

            try {
                // 1. Check if it's ME
                const meRes = await fetchAuth(`${API_BASE}/auth/me`);
                const me = await meRes.json();
                if (me.username === username) {
                    isOwnProfile = true;
                    tabs.style.display = 'flex'; // Show tabs
                    document.getElementById('btnFollow').style.display = 'none'; // Hide follow on self
                } else {
                    document.getElementById('btnFollow').style.display = 'inline-block';
                }

                // 2. Load User Data
                const res = await fetchAuth(`${API_BASE}/limterest/user/${username}`);
                const data = await res.json();

                document.getElementById('profName').innerText = data.username;
                document.getElementById('profBio').innerText = data.bio;
                document.getElementById('statPins').innerText = data.stats.pins;
                document.getElementById('statFollowers').innerText = data.stats.followers;
                document.getElementById('profAvatar').src = `https://ui-avatars.com/api/?name=${data.username}&size=200&background=random`;

                const btn = document.getElementById('btnFollow');
                if (data.isFollowing) {
                    btn.innerText = "Abonniert"; btn.classList.add('following');
                } else {
                    btn.innerText = "Abonnieren"; btn.classList.remove('following');
                }

                // 3. Load Created Pins (Default)
                switchProfileTab('created');

            } catch (e) { grid.innerHTML = 'Fehler beim Laden.'; }
        }

        async function switchProfileTab(tab) {
            const btns = document.querySelectorAll('.tab-btn');
            btns.forEach(b => b.classList.remove('active'));
            // Button active state logic (simple based on index/order assumption or text)
            if (tab === 'created') btns[0].classList.add('active');
            else btns[1].classList.add('active');

            const grid = document.getElementById('userPinGrid');
            grid.innerHTML = 'Lade...';

            if (tab === 'created') {
                document.getElementById('profileGridTitle').innerText = "Erstellte Pins";
                const res = await fetchAuth(`${API_BASE}/limterest/feed?username=${encodeURIComponent(currentTargetUser)}`);
                const data = await res.json();
                renderGrid(data.pins, 'userPinGrid');
            } else if (tab === 'saved') {
                document.getElementById('profileGridTitle').innerText = "Gemerkte Pins (Geheim)";
                const res = await fetchAuth(`${API_BASE}/limterest/my-saved`);
                const data = await res.json();
                renderGrid(data.pins, 'userPinGrid');
            }
        }

        async function toggleFollow() {
            if (!currentTargetUser) return;
            try {
                const res = await fetchAuth(`${API_BASE}/limterest/user/${currentTargetUser}/follow`, { method: 'POST' });
                const data = await res.json();
                const btn = document.getElementById('btnFollow');
                let count = parseInt(document.getElementById('statFollowers').innerText);
                if (data.isFollowing) {
                    btn.innerText = "Abonniert"; btn.classList.add('following');
                    document.getElementById('statFollowers').innerText = count + 1;
                } else {
                    btn.innerText = "Abonnieren"; btn.classList.remove('following');
                    document.getElementById('statFollowers').innerText = Math.max(0, count - 1);
                }
            } catch (e) { alert("Fehler."); }
        }

        async function openMyProfile() {
            try {
                const res = await fetchAuth(`${API_BASE}/auth/me`);
                const me = await res.json();
                openProfile(me.username);
            } catch (e) { }
        }

        // --- HELPERS ---
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') loadFeed(searchInput.value); });
        function resetFeed() { searchInput.value = ''; loadFeed(); }
        function openAddModal() { document.getElementById('modalAdd').classList.add('show'); }
        async function submitPin() {
            const title = document.getElementById('inpTitle').value;
            const url = document.getElementById('inpUrl').value;
            const tags = document.getElementById('inpTags').value;
            if (!url) return alert("URL fehlt!");
            try {
                const res = await fetchAuth(`${API_BASE}/limterest/pin`, {
                    method: 'POST', body: JSON.stringify({ title, imageUrl: url, tags })
                });
                if (res.ok) { closeModals(); loadFeed(); } else alert("Fehler");
            } catch (e) { alert("Netzwerkfehler"); }
        }
        function closeModals() { document.querySelectorAll('.modal').forEach(m => m.classList.remove('show')); }
        window.onclick = function (event) {
            if (!event.target.closest('.btn-icon') && !event.target.closest('.dropdown-menu')) {
                document.getElementById('pinMenu').classList.remove('show');
            }
        }

        loadFeed();
    