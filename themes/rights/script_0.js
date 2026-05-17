
        // API Basis-URL direkt auf deine Domain gesetzt
        const API_BASE = 'https://api.limazon.v6.rocks/api/admin'; 
        
        let allUsers = [];
        let allRoles = [];
        let allPermissions = [];
        let selectedUserId = null;

        // Init
        async function init() {
            await Promise.all([fetchUsers(), fetchRoles(), fetchPermissions()]);
            renderUserList();
            renderRoleOptions();
            renderPermissionsGrid();
            
            // Suchfeld Event
            document.getElementById('searchInput').addEventListener('input', renderUserList);
            // Dropdown Event
            document.getElementById('roleSelect').addEventListener('change', handleRoleChange);
        }

        // --- Fetch Daten vom Server (MIT CREDENTIALS!) ---
        async function fetchUsers() {
            try {
                const res = await fetch(`${API_BASE}/users`, { credentials: 'include' });
                if (!res.ok) throw new Error("Unauthorized");
                const data = await res.json();
                allUsers = data.users || [];
            } catch (e) {
                console.error("Fehler beim Laden der Nutzer:", e);
                document.getElementById('userList').innerHTML = `<p style="color:red;">Fehler: Nicht eingeloggt oder keine Admin-Rechte.</p>`;
            }
        }

        async function fetchRoles() {
            try {
                const res = await fetch(`${API_BASE}/roles`, { credentials: 'include' });
                const data = await res.json();
                allRoles = data.roles || [];
            } catch (e) {
                console.error("Fehler beim Laden der Rollen:", e);
            }
        }

        async function fetchPermissions() {
            try {
                const res = await fetch(`${API_BASE}/permissions`, { credentials: 'include' });
                const data = await res.json();
                allPermissions = data.permissions || [];
            } catch (e) {
                console.error("Fehler beim Laden der Berechtigungen:", e);
            }
        }

        // --- Rendern ---
        function renderUserList() {
            const list = document.getElementById('userList');
            const search = document.getElementById('searchInput').value.toLowerCase();
            if (allUsers.length === 0) return; // Verhindert leeren Überschreib-Fehler
            
            list.innerHTML = '';

            const filteredUsers = allUsers.filter(u => u.username.toLowerCase().includes(search));

            filteredUsers.forEach(user => {
                const div = document.createElement('div');
                div.className = `user-card ${user._id === selectedUserId ? 'active' : ''}`;
                
                // Legacy Fix: Wenn keine Rolle da ist, aber isAdmin = true, zeige Admin
                let displayRole = user.role || 'user';
                if (!user.role && user.isAdmin) displayRole = 'admin';

                div.innerHTML = `
                    <div class="user-name">${user.username}</div>
                    <div class="user-role">${displayRole}</div>
                `;
                div.onclick = () => selectUser(user);
                list.appendChild(div);
            });
        }

        function renderRoleOptions() {
            const select = document.getElementById('roleSelect');
            select.innerHTML = '';
            allRoles.forEach(role => {
                const opt = document.createElement('option');
                opt.value = role.id;
                opt.textContent = `${role.name} - ${role.description}`;
                select.appendChild(opt);
            });
        }

        function renderPermissionsGrid() {
            const grid = document.getElementById('permissionsGrid');
            grid.innerHTML = '';
            allPermissions.forEach(perm => {
                grid.innerHTML += `
                    <label class="perm-card" id="card_${perm.id}">
                        <input type="checkbox" value="${perm.id}" id="cb_${perm.id}">
                        <div class="perm-info">
                            <div class="perm-title">${perm.name}</div>
                            <div class="perm-desc">${perm.description}</div>
                        </div>
                    </label>
                `;
            });
        }

        // --- Logik ---
        function selectUser(user) {
            selectedUserId = user._id;
            document.getElementById('emptyState').style.display = 'none';
            document.getElementById('editorPanel').style.display = 'block';
            document.getElementById('editUserName').textContent = `Rechte für: ${user.username}`;
            
            // Setzte Rolle (Fallback logic für alte Admins)
            let userRole = user.role || 'user';
            if (!user.role && user.isAdmin) userRole = 'admin';
            
            document.getElementById('roleSelect').value = userRole;

            // Setze Checkboxen basierend auf User-Permissions
            const userPerms = user.permissions || [];
            allPermissions.forEach(perm => {
                const cb = document.getElementById(`cb_${perm.id}`);
                cb.checked = userPerms.includes(perm.id);
            });

            handleRoleChange(); // UI aktualisieren (Sperren/Entsperren)
            renderUserList(); // Aktiv-Klasse setzen
        }

        function handleRoleChange() {
            const currentRole = document.getElementById('roleSelect').value;
            const roleObj = allRoles.find(r => r.id === currentRole);
            
            allPermissions.forEach(perm => {
                const cb = document.getElementById(`cb_${perm.id}`);
                const card = document.getElementById(`card_${perm.id}`);
                
                if (currentRole === 'custom') {
                    // Custom: Checkboxen sind anklickbar, Zustand bleibt wie vom User gesetzt
                    card.classList.remove('disabled');
                    cb.disabled = false;
                } else {
                    // Vordefiniert: Checkboxen sperren und je nach Gruppen-Rechten anhaken
                    card.classList.add('disabled');
                    cb.disabled = true;
                    if (roleObj && (roleObj.permissions.includes('ALL') || roleObj.permissions.includes(perm.id))) {
                        cb.checked = true;
                    } else {
                        cb.checked = false;
                    }
                }
            });
        }

        async function saveUser() {
            if (!selectedUserId) return;
            const role = document.getElementById('roleSelect').value;
            
            // Sammle angehakte Permissions (NUR wichtig, wenn Custom)
            const permissions = [];
            if (role === 'custom') {
                allPermissions.forEach(perm => {
                    if (document.getElementById(`cb_${perm.id}`).checked) {
                        permissions.push(perm.id);
                    }
                });
            }

            const payload = { role: role };
            if (role === 'custom') payload.permissions = permissions;

            try {
                // HIER IST DER FIX: credentials: 'include' hinzugefügt
                const res = await fetch(`${API_BASE}/users/${selectedUserId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(payload)
                });
                
                if (res.ok) {
                    alert('Erfolgreich gespeichert!');
                    await fetchUsers(); // Daten neu laden
                    selectUser(allUsers.find(u => u._id === selectedUserId)); // UI Refreshen
                } else {
                    const data = await res.json();
                    alert('Fehler: ' + data.error);
                }
            } catch (e) {
                alert('Netzwerkfehler');
            }
        }

        // Start
        init();
    