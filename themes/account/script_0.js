
        // --- CONFIG ---
        const API_BASE = 'https://api.limazon.v6.rocks'; 
        const STORAGE_KEY = 'limazon_saved_accounts';

        let currentUser = null;
        let savedAccounts = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

        document.addEventListener('DOMContentLoaded', () => {
            renderSidebar();
            checkAuth();
        });

        // --- AUTH LOGIC ---

        async function checkAuth() {
            try {
                const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    await loadFullProfile(data);
                } else {
                    showLoginScreen();
                }
            } catch (err) {
                console.error(err);
                showLoginScreen();
                showNotify("Server nicht erreichbar", "error");
            }
        }

        async function loadFullProfile(userData) {
            currentUser = userData;
            try {
                const profRes = await fetch(`${API_BASE}/api/profile/${userData.username}`, { credentials: 'include' });
                if(profRes.ok) {
                    const profData = await profRes.json();
                    currentUser.bio = profData.profile.bio;
                    currentUser.isInventoryPublic = profData.profile.isInventoryPublic;
                    currentUser.achievements = profData.profile.achievements || [];
                }
            } catch(e) { console.warn("Profil-Meta-Daten Fehler", e); }

            document.getElementById('loading-view').style.display = 'none';
            document.getElementById('login-view').style.display = 'none';
            document.getElementById('dashboard-view').style.display = 'flex';
            
            updateDashboardUI();
            
            if(!savedAccounts.find(a => a.username.toLowerCase() === userData.username.toLowerCase())) {
                showNotify("Tipp: Logge dich über '+' in der Leiste ein, um das Passwort zu speichern.", "info");
            }
            renderSidebar();
        }

        function showLoginScreen() {
            document.getElementById('loading-view').style.display = 'none';
            document.getElementById('dashboard-view').style.display = 'none';
            document.getElementById('login-view').style.display = 'flex';
            renderSidebar();
        }

        async function performMainLogin() {
            const u = document.getElementById('main-login-user').value;
            const p = document.getElementById('main-login-pass').value;
            if(!u || !p) return showNotify("Bitte alles ausfüllen", "error");

            try {
                const res = await fetch(`${API_BASE}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: u, password: p }),
                    credentials: 'include'
                });

                if(res.ok) {
                    saveAccountLocally(u, p);
                    checkAuth(); 
                } else {
                    const d = await res.json();
                    showNotify(d.error || "Login fehlgeschlagen", "error");
                }
            } catch(e) { showNotify("Serverfehler", "error"); }
        }

        function saveAccountLocally(u, p) {
            const existingIdx = savedAccounts.findIndex(a => a.username.toLowerCase() === u.toLowerCase());
            const accObj = { username: u, auth: btoa(p) };
            
            if(existingIdx >= 0) savedAccounts[existingIdx] = accObj;
            else savedAccounts.push(accObj);
            
            localStorage.setItem(STORAGE_KEY, JSON.stringify(savedAccounts));
            renderSidebar();
        }

        function handleLogout() {
            fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' })
                .then(() => {
                    currentUser = null;
                    showLoginScreen();
                });
        }

        // --- SIDEBAR & SWITCHING ---

        function renderSidebar() {
            const sidebar = document.getElementById('account-sidebar');
            sidebar.innerHTML = '';
            
            savedAccounts.forEach(acc => {
                const wrapper = document.createElement('div');
                wrapper.className = 'avatar-wrapper';

                const avatar = document.createElement('div');
                avatar.className = 'account-avatar';
                avatar.textContent = acc.username.charAt(0).toUpperCase();
                avatar.title = `Zu ${acc.username} wechseln`;
                avatar.onclick = () => switchAccount(acc);
                
                if(currentUser && acc.username.toLowerCase() === currentUser.username.toLowerCase()) {
                    avatar.classList.add('active');
                }

                const delBtn = document.createElement('div');
                delBtn.className = 'remove-account-btn';
                delBtn.textContent = '×';
                delBtn.title = 'Entfernen';
                delBtn.onclick = (e) => removeSavedAccount(e, acc.username);

                wrapper.appendChild(avatar);
                wrapper.appendChild(delBtn);
                sidebar.appendChild(wrapper);
            });

            const addBtn = document.createElement('div');
            addBtn.className = 'add-account-btn';
            addBtn.textContent = '+';
            addBtn.title = 'Neuer Login';
            addBtn.onclick = () => {
                document.getElementById('main-login-user').value = '';
                document.getElementById('main-login-pass').value = '';
                if(currentUser) handleLogout();
                else showLoginScreen();
            };
            sidebar.appendChild(addBtn);
        }

        function removeSavedAccount(e, username) {
            e.stopPropagation();
            if(!confirm(`"${username}" aus der Liste entfernen?`)) return;
            savedAccounts = savedAccounts.filter(a => a.username.toLowerCase() !== username.toLowerCase());
            localStorage.setItem(STORAGE_KEY, JSON.stringify(savedAccounts));
            renderSidebar();
        }

        async function switchAccount(account) {
            if(currentUser && currentUser.username.toLowerCase() === account.username.toLowerCase()) return;

            if(account.auth) {
                try {
                    const password = atob(account.auth);
                    showNotify(`Wechsle zu ${account.username}...`, "info");
                    
                    await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' });
                    
                    const res = await fetch(`${API_BASE}/api/auth/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username: account.username, password: password }),
                        credentials: 'include'
                    });

                    if(res.ok) {
                        checkAuth();
                    } else {
                        showNotify("Passwort wohl geändert. Bitte neu einloggen.", "error");
                        handleLogout();
                    }
                } catch(e) { console.error(e); }
            } else {
                handleLogout();
            }
        }

        // --- DASHBOARD UI ---

        function formatNumber(num, isMoney = false) {
            if (num > 1000000000000) return (isMoney ? '$' : '') + (num / 1000000000000).toFixed(2) + ' Bio.';
            if (num > 1000000000) return (isMoney ? '$' : '') + (num / 1000000000).toFixed(2) + ' Mrd.';
            if (num > 1000000) return (isMoney ? '$' : '') + (num / 1000000).toFixed(2) + ' Mio.';
            return (isMoney ? '$' : '') + num.toLocaleString(undefined, {minimumFractionDigits: isMoney ? 2 : 0});
        }

        function updateDashboardUI() {
            document.getElementById('profile-username').textContent = currentUser.username;
            document.getElementById('profile-avatar').textContent = currentUser.username.charAt(0).toUpperCase();
            document.getElementById('profile-role').textContent = currentUser.isAdmin ? 'Administrator 🛡️' : 'Mitglied';
            document.getElementById('profile-id').textContent = 'ID: ' + currentUser.userId;

            // Stats (Balance & Tokens)
            const balEl = document.getElementById('stat-balance');
            balEl.textContent = formatNumber(currentUser.balance, true);
            balEl.title = '$' + currentUser.balance.toLocaleString();

            const tokEl = document.getElementById('stat-tokens');
            tokEl.textContent = formatNumber(currentUser.tokens, false);
            tokEl.title = currentUser.tokens.toLocaleString();

            // NEU: Schufa Score rendern
            const schufaEl = document.getElementById('stat-schufa');
            if (schufaEl) {
                const score = currentUser.schufaScore || 500;
                schufaEl.textContent = score;
                // Farben je nach Wert setzen
                if(score < 400) schufaEl.style.color = 'var(--danger)';
                else if(score > 750) schufaEl.style.color = 'var(--success)';
                else schufaEl.style.color = 'var(--text-main)';
            }

            document.getElementById('settings-bio').value = currentUser.bio || '';
            document.getElementById('settings-public-inv').checked = !!currentUser.isInventoryPublic;

            fetchShareCode();

            if(currentUser.isAdmin || currentUser.unlockedInfinityMoney) {
                document.getElementById('admin-settings-card').style.display = 'block';
                document.getElementById('settings-infinity').checked = !!currentUser.infinityMoney;
                document.getElementById('settings-infinity').onchange = (e) => toggleInfinity(e.target.checked);
            }

            const badgeContainer = document.getElementById('badge-container');
            badgeContainer.innerHTML = '';
            if(currentUser.achievements && currentUser.achievements.length > 0) {
                currentUser.achievements.forEach(badgeId => {
                    const badge = document.createElement('div');
                    badge.className = 'badge-item';
                    let icon = '🏅'; 
                    if(badgeId.includes('million')) icon = '💎';
                    if(badgeId.includes('admin')) icon = '🛡️';
                    if(badgeId.includes('bug')) icon = '🐛';
                    badge.textContent = icon;
                    badge.title = badgeId;
                    badgeContainer.appendChild(badge);
                });
            } else {
                badgeContainer.innerHTML = '<p style="color:var(--text-muted)">Keine Abzeichen.</p>';
            }
        }

        // --- ACTIONS ---

        async function saveProfileSettings() {
            const bio = document.getElementById('settings-bio').value;
            const isPublic = document.getElementById('settings-public-inv').checked;
            try {
                const res = await fetch(`${API_BASE}/api/profile/edit`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ bio, isInventoryPublic: isPublic }), credentials: 'include'
                });
                if(res.ok) showNotify("Gespeichert!", "success");
            } catch(e) { showNotify("Fehler", "error"); }
        }

        async function toggleInfinity(enabled) {
            try {
                await fetch(`${API_BASE}/api/account/settings`, {
                    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ infinityMoney: enabled }), credentials: 'include'
                });
                showNotify("Einstellung gespeichert", "success");
            } catch(e) {}
        }

        async function changeUsername() {
            const newNameInput = document.getElementById('new-username').value;
            const newName = newNameInput ? newNameInput.trim() : ""; // Sichert uns ab, dass keine Leerzeichen übergeben werden
            const pw = document.getElementById('username-confirm-pw').value;
            
            if(newName.length < 3) return showNotify("Der Name ist zu kurz.", "error");
            if(!pw) return showNotify("Bitte Passwort zur Bestätigung eingeben.", "error");

            try {
                const res = await fetch(`${API_BASE}/api/account/username`, {
                    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ newUsername: newName, password: pw }), credentials: 'include'
                });
                
                if(res.ok) {
                    showNotify("Geändert! Bitte neu einloggen.", "success");
                    const idx = savedAccounts.findIndex(a => a.username.toLowerCase() === currentUser.username.toLowerCase());
                    if(idx >= 0) {
                        savedAccounts[idx].username = newName;
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(savedAccounts));
                    }
                    
                    // Felder leeren
                    document.getElementById('username-confirm-pw').value = '';
                    document.getElementById('new-username').value = '';
                    
                    setTimeout(() => handleLogout(), 1500);
                } else {
                    const errData = await res.json();
                    showNotify(errData.error || "Fehler beim Ändern", "error");
                }
            } catch(e) { 
                showNotify("Serverfehler", "error"); 
            }
        }

        async function changePassword() {
            const cur = document.getElementById('current-pw').value;
            const n = document.getElementById('new-pw').value;
            const c = document.getElementById('confirm-pw').value;
            if(n !== c) return showNotify("Passwörter stimmen nicht überein.", "error");

            try {
                const res = await fetch(`${API_BASE}/api/account/password`, {
                    method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ currentPassword: cur, newPassword: n }), credentials: 'include'
                });
                if(res.ok) {
                    showNotify("Passwort geändert!", "success");
                    const idx = savedAccounts.findIndex(a => a.username.toLowerCase() === currentUser.username.toLowerCase());
                    if(idx >= 0) {
                        savedAccounts[idx].auth = btoa(n);
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(savedAccounts));
                    }
                    document.getElementById('current-pw').value = '';
                    document.getElementById('new-pw').value = '';
                    document.getElementById('confirm-pw').value = '';
                } else {
                    const d = await res.json();
                    showNotify(d.error, "error");
                }
            } catch(e) { showNotify("Fehler", "error"); }
        }

        async function fetchShareCode() {
            try {
                const res = await fetch(`${API_BASE}/api/chat/me/sharecode`, { credentials: 'include' });
                const d = await res.json();
                document.getElementById('profile-sharecode').textContent = d.userShareCode || '---';
            } catch(e) {}
        }

        async function regenerateShareCode() {
            if(!confirm("Code erneuern?")) return;
            try {
                const res = await fetch(`${API_BASE}/api/chat/me/sharecode/regenerate`, { method: 'POST', credentials: 'include' });
                const d = await res.json();
                document.getElementById('profile-sharecode').textContent = d.userShareCode;
            } catch(e) {}
        }

        function openDeleteModal() { document.getElementById('delete-modal').style.display = 'flex'; }
        
        async function performDelete() {
            const pw = document.getElementById('delete-confirm-pw').value;
            if(!pw) return showNotify("Bitte Passwort eingeben.", "error");

            try {
                const res = await fetch(`${API_BASE}/api/account/me`, {
                    method: 'DELETE', 
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: pw }), 
                    credentials: 'include'
                });
                
                if(res.ok) {
                    savedAccounts = savedAccounts.filter(a => a.username.toLowerCase() !== currentUser.username.toLowerCase());
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedAccounts));
                    alert("Account gelöscht. Auf Wiedersehen!");
                    window.location.reload();
                } else {
                    const data = await res.json();
                    showNotify(data.error || "Fehler beim Löschen", "error");
                }
            } catch(e) { 
                showNotify("Netzwerkfehler", "error"); 
            }
        }

        // --- DSGVO EXPORT & VISUALIZER ---
        async function downloadExport() {
            try {
                showNotify("Export wird generiert... Bitte warten.", "info");
                const res = await fetch(`${API_BASE}/api/account/export`, { credentials: 'include' });
                
                if (res.ok) {
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `limazon_export_${currentUser.username}_${Date.now()}.json`;
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                    showNotify("Download erfolgreich gestartet!", "success");
                } else {
                    showNotify("Fehler beim Erstellen des Exports.", "error");
                }
            } catch(e) {
                showNotify("Netzwerkfehler beim Export.", "error");
            }
        }

        document.getElementById('import-file').addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(event) {
                try {
                    const data = JSON.parse(event.target.result);
                    const out = document.getElementById('visualizer-output');
                    out.style.display = 'block';

                    const prof = data.profile || {};
                    const assets = data.assets || {};
                    const meta = data.metadata || {};

                    out.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 10px; margin-bottom: 15px;">
                            <h3 style="color: var(--accent); margin: 0;">Akte: ${prof.username || 'Unbekannt'}</h3>
                            <span style="font-size: 0.8rem; color: var(--text-muted);">Export vom: ${new Date(meta.exportedAt).toLocaleDateString('de-DE')}</span>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                            <div>
                                <p style="color: var(--text-muted); font-size: 0.8rem; margin-bottom: 5px;">FINANZEN</p>
                                <p><strong>Guthaben:</strong> $${(prof.balance || 0).toLocaleString()}</p>
                                <p><strong>Tokens:</strong> ${(prof.tokens || 0).toLocaleString()}</p>
                                <p><strong>Schufa-Score:</strong> ${prof.schufaScore || 'N/A'}</p>
                                <p><strong>Steuern gezahlt:</strong> $${(prof.totalTaxesPaid || 0).toLocaleString()}</p>
                            </div>
                            <div>
                                <p style="color: var(--text-muted); font-size: 0.8rem; margin-bottom: 5px;">KARRIERE & LEBEN</p>
                                <p><strong>Job:</strong> ${prof.job || 'Arbeitslos'} (Lvl ${prof.jobLevel || 0})</p>
                                <p><strong>Verheiratet mit:</strong> ${prof.isMarriedTo || 'Single'}</p>
                                <p><strong>Admin-Status:</strong> ${prof.isAdmin ? 'Ja 🛡️' : 'Nein'}</p>
                            </div>
                        </div>

                        <div style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 6px;">
                            <p style="color: var(--text-muted); font-size: 0.8rem; margin-bottom: 5px;">BESITZTÜMER</p>
                            <span style="margin-right: 15px;">📦 Items: <strong>${(assets.inventory || []).length}</strong></span>
                            <span style="margin-right: 15px;">📈 Aktien: <strong>${(assets.stocks || []).length}</strong></span>
                            <span style="margin-right: 15px;">🏠 Häuser: <strong>${(assets.realEstate || []).length}</strong></span>
                            <span>🐾 Haustiere: <strong>${(assets.pets || []).length}</strong></span>
                        </div>
                    `;
                } catch (err) {
                    showNotify("Ungültige JSON Datei!", "error");
                    document.getElementById('visualizer-output').style.display = 'none';
                }
            };
            reader.readAsText(file);
        });

        // --- TAB NAVIGATION ---
        function switchTab(tabId) {
            document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
            document.getElementById(`tab-${tabId}`).classList.add('active');
            
            const btns = document.querySelectorAll('.tab-btn');
            if(tabId==='overview') btns[0].classList.add('active');
            if(tabId==='security') btns[1].classList.add('active');
            if(tabId==='danger') btns[2].classList.add('active');
        }

        function showNotify(msg, type) {
            const el = document.getElementById('notification');
            el.textContent = msg;
            el.className = `notification show ${type}`;
            setTimeout(() => el.classList.remove('show'), 3000);
        }
    