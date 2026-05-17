
        const API = 'https://api.limazon.v6.rocks';

        let users = [];
        let products = [];
        let prodPage = 1, prodPerPage = 12, prodFilter = "";
        let userPage = 1, userPerPage = 15, userFilter = "";

        checkAuth();

        async function checkAuth() {
            try {
                const res = await fetch(API + '/api/auth/me', { credentials: 'include' });
                if (res.ok) {
                    const u = await res.json();
                    if (!u.isAdmin) return alert("Kein Zutritt!");
                    loadUsers();
                    loadProducts();
                    if (!document.getElementById('tab-system').classList.contains('hidden')) refreshHealth();
                } else { window.location.href = '/'; }
            } catch (e) { alert("Verbindungsfehler"); }
        }

        function switchTab(id) {
            document.querySelectorAll('main > div').forEach(d => d.classList.add('hidden'));
            document.getElementById('tab-' + id).classList.remove('hidden');
            document.querySelectorAll('nav a').forEach(a => a.classList.remove('active'));
            document.getElementById('nav-' + id).classList.add('active');
            if (id === 'system') refreshHealth();
        }

        function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

        // ========================
        // === USER MANAGEMENT ===
        // ========================
        async function loadUsers() {
            const res = await fetch(API + '/api/admin/users', { credentials: 'include' });
            const data = await res.json();
            users = data.users;
            users.sort((a, b) => b.balance - a.balance);
            renderUsers();
        }

        function handleUserSearch(val) { userFilter = val.toLowerCase(); userPage = 1; renderUsers(); }
        function changeUserPage(delta) { userPage += delta; renderUsers(); }

        function renderUsers() {
            const list = document.getElementById('user-list');
            const empty = document.getElementById('user-empty');
            const pag = document.getElementById('user-pagination');

            let filtered = users.filter(u => u.username.toLowerCase().includes(userFilter));

            const totalPages = Math.ceil(filtered.length / userPerPage) || 1;
            if (userPage > totalPages) userPage = totalPages;
            if (userPage < 1) userPage = 1;

            const start = (userPage - 1) * userPerPage;
            const end = start + userPerPage;
            const pageItems = filtered.slice(start, end);

            document.getElementById('user-page-disp').innerText = userPage;
            document.getElementById('user-page-total').innerText = totalPages;
            document.getElementById('btn-user-prev').disabled = userPage === 1;
            document.getElementById('btn-user-next').disabled = userPage === totalPages;

            pag.classList.toggle('hidden', filtered.length === 0);
            if (filtered.length === 0) { list.innerHTML = ''; empty.classList.remove('hidden'); return; }
            empty.classList.add('hidden');

            list.innerHTML = pageItems.map(u => {
                const tok = (u.tokens !== undefined && u.tokens !== null) ? u.tokens.toLocaleString() : "0";
                const balClass = u.balance < 0 ? "text-red-500 font-bold" : "text-emerald-400";
                const bal = u.balance ? u.balance.toLocaleString() : "0";

                let badges = "";

                // Entweder die Custom-Rolle anzeigen (z.B. MODERATOR, ADMIN) ...
                if (u.role && u.role !== 'user') {
                    badges += `<span class="bg-blue-600 text-xs px-2 py-1 rounded mr-1 uppercase">${u.role}</span>`;
                }
                else if (u.isAdmin) {
                    badges += '<span class="bg-indigo-600 text-xs px-2 py-1 rounded mr-1">ADMIN</span>';
                }
                if (u.infinityMoney || u.unlockedInfinityMoney) {
                    badges += '<span class="bg-cyan-900 text-cyan-300 text-xs px-2 py-1 rounded border border-cyan-700">∞</span>';
                }
                if (badges === "") badges = '<span class="text-slate-500 text-xs">User</span>';

                return `
                <tr class="border-b border-slate-800 hover:bg-slate-800/50">
                    <td class="p-3 font-bold">${u.username}</td>
                    <td class="p-3 ${balClass}">$${bal}</td>
                    <td class="p-3 text-amber-400">${tok} T</td>
                    <td class="p-3">${badges}</td>
                    <td class="p-3 text-right whitespace-nowrap">
                        <button onclick="impersonateUser('${u._id}', '${u.username}')" class="text-green-400 hover:text-white mr-3" title="Als User einloggen (Impersonate)">🎭</button>
                        <button onclick="fineUser('${u._id}', '${u.username}')" class="text-yellow-500 hover:text-yellow-300 mr-3" title="Strafe">🚓</button>
                        <button onclick="openEditUser('${u._id}')" class="text-blue-400 hover:text-white mr-3" title="Bearbeiten">✏️</button>
                        <button onclick="deleteUser('${u._id}')" class="text-red-500 hover:text-white mr-3" title="Löschen">🗑️</button>
                        <button onclick="banUser('${u._id}', '${u.username}')" class="text-purple-500 hover:text-white font-bold" title="BAN">🔨</button>
                    </td>
                </tr>`;
            }).join('');
        }

        // ========================
        // 🚨 IMPERSONATE (Als User einloggen)
        // ========================
        async function impersonateUser(targetId, targetUsername) {
            const adminPw = prompt(`🎭 IMPERSONATION\nMöchtest du dich als "${targetUsername}" einloggen?\n\nBitte bestätige dies mit DEINEM Admin-Passwort:`);
            if (!adminPw) return;

            try {
                // 1. Temp-Code vom Backend anfordern
                const genRes = await fetch(`${API}/api/admin/users/${targetId}/temp-login-code`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ adminPassword: adminPw }),
                    credentials: 'include'
                });

                const genData = await genRes.json();
                if (!genRes.ok) {
                    return alert(genData.error || "Fehler beim Generieren des Codes.");
                }

                const tempCode = genData.tempCode;

                // 2. Mit dem erhaltenen Temp-Code den Login ausführen
                const loginRes = await fetch(`${API}/api/auth/temp-login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: targetUsername, tempCode: tempCode }),
                    credentials: 'include'
                });

                const loginData = await loginRes.json();
                if (!loginRes.ok) {
                    return alert(loginData.error || "Fehler beim Temp-Login.");
                }

                // 3. Bei Erfolg -> Abflug auf die Hauptseite!
                alert(`✅ Erfolgreich als ${targetUsername} eingeloggt!\nDu wirst nun zum Hub weitergeleitet.`);
                window.location.href = '/';

            } catch (err) {
                console.error(err);
                alert("Netzwerk- oder Serverfehler bei der Impersonation.");
            }
        }

        function openEditUser(id) {
            const u = users.find(x => x._id === id);
            if (!u) return;
            document.getElementById('edit-u-id').value = id;
            document.getElementById('edit-u-name').value = u.username;
            document.getElementById('edit-u-bal').value = u.balance;
            document.getElementById('edit-u-tok').value = u.tokens || 0;

            document.getElementById('edit-u-admin').checked = u.isAdmin || false;
            document.getElementById('edit-u-infinity').checked = u.infinityMoney || u.unlockedInfinityMoney || false;

            document.getElementById('edit-u-pass').value = "";
            document.getElementById('modal-user').classList.remove('hidden');
        }

        async function saveUser() {
            const id = document.getElementById('edit-u-id').value;
            const body = {
                balance: document.getElementById('edit-u-bal').value,
                tokens: document.getElementById('edit-u-tok').value,
                isAdmin: document.getElementById('edit-u-admin').checked,
                infinityMoney: document.getElementById('edit-u-infinity').checked,
            };

            await fetch(API + '/api/admin/users/' + id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'include' });

            const pass = document.getElementById('edit-u-pass').value;
            if (pass) {
                await fetch(API + '/api/admin/users/' + id + '/reset-pw', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ newPassword: pass }), credentials: 'include' });
            }
            closeModal('modal-user');
            loadUsers();
        }

        async function deleteUser(id) {
            if (!confirm("User wirklich löschen?")) return;
            await fetch(API + '/api/admin/users/' + id, { method: 'DELETE', credentials: 'include' });
            loadUsers();
        }

        async function fineUser(id, name) {
            const amountStr = prompt(`👮 Strafe für ${name}: Betrag eingeben`, "500");
            if (!amountStr) return;
            const amount = parseFloat(amountStr);
            if (isNaN(amount) || amount <= 0) return alert("Ungültig.");
            try {
                await fetch(API + '/api/admin/users/' + id + '/fine', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount, reason: "Admin Action" }), credentials: 'include'
                });
                loadUsers();
            } catch (e) { alert("Fehler."); }
        }

        async function banUser(id, name) {
            if (!confirm(`⛔ BAN: ${name} wirklich löschen und IP sperren?`)) return;
            try {
                await fetch(API + '/api/admin/banUser', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetUserId: id }), credentials: 'include'
                });
                loadUsers();
            } catch (err) { alert("Fehler."); }
        }

        // ========================
        // === PRODUCT MANAGEMENT ===
        // ========================
        async function loadProducts() {
            document.getElementById('product-list-container').innerHTML = '';
            document.getElementById('product-loader').classList.remove('hidden');
            document.getElementById('product-pagination').classList.add('hidden');
            try {
                // Wir laden die Produkte über den offenen Endpoint, damit wir das String-Format bekommen
                const res = await fetch(API + '/api/products', { credentials: 'include' });
                const data = await res.json();
                products = data.products;
                renderProducts();
            } catch (e) { console.error(e); }
            finally { document.getElementById('product-loader').classList.add('hidden'); }
        }

        function handleProductSearch(val) { prodFilter = val.toLowerCase(); prodPage = 1; renderProducts(); }
        function changeProductPage(delta) { prodPage += delta; renderProducts(); }

        function renderProducts() {
            const list = document.getElementById('product-list-container');
            const pag = document.getElementById('product-pagination');
            let filtered = products.filter(p => (p.name || "").toLowerCase().includes(prodFilter) || String(p.id).toLowerCase().includes(prodFilter));

            const totalPages = Math.ceil(filtered.length / prodPerPage) || 1;
            if (prodPage > totalPages) prodPage = totalPages;
            if (prodPage < 1) prodPage = 1;

            const start = (prodPage - 1) * prodPerPage;
            const end = start + prodPerPage;
            const pageItems = filtered.slice(start, end);

            document.getElementById('prod-page-disp').innerText = prodPage;
            document.getElementById('prod-page-total').innerText = totalPages;
            document.getElementById('btn-prod-prev').disabled = prodPage === 1;
            document.getElementById('btn-prod-next').disabled = prodPage === totalPages;

            pag.classList.toggle('hidden', filtered.length === 0);
            if (filtered.length === 0) { list.innerHTML = `<div class="col-span-full text-center text-slate-500 py-10">Keine Produkte.</div>`; return; }

            list.innerHTML = pageItems.map(p => {
                // FIX: currentPrice für Börsenprodukte, price für normale
                let displayPrice = p.currentPrice !== undefined ? `$${p.currentPrice}` : p.price;
                const stockDisplay = p.stock !== undefined ? p.stock : "0";

                return `
                <div class="content-card flex flex-col justify-between h-full border border-slate-700 hover:border-indigo-500 transition">
                    <div>
                        <div class="flex justify-between items-start mb-2">
                            <span class="font-bold text-lg text-white truncate pr-2">${p.name || "Unbekannt"}</span>
                            <span class="text-emerald-400 font-mono whitespace-nowrap">${displayPrice}</span>
                        </div>
                        <p class="text-xs text-slate-500 mb-2 font-mono">ID: ${p.id} | Stock: ${stockDisplay}</p>
                    </div>
                    <div class="flex gap-2 border-t border-slate-700 pt-3 mt-auto">
                        <button onclick="openEditProduct('${p.id}')" class="btn bg-slate-700 text-xs flex-1 hover:bg-slate-600">Edit</button>
                        <button onclick="deleteProduct('${p.id}')" class="btn btn-danger text-xs hover:bg-red-700">Del</button>
                    </div>
                </div>`;
            }).join('');
        }

        function openEditProduct(id) {
            if (!id) {
                document.getElementById('edit-p-oid').value = "";
                document.getElementById('edit-p-id').value = "";
                document.getElementById('edit-p-name').value = "";
                document.getElementById('edit-p-price').value = "";
                document.getElementById('edit-p-stock').value = "999";
                document.getElementById('edit-p-img').value = "";
                document.getElementById('edit-p-desc').value = "";
            } else {
                const p = products.find(x => x.id === id || String(x.id) === String(id));
                if (!p) return;

                // Da wir die Produkte über /api/products geladen haben, fehlt die MongoDB _id.
                // Wir nutzen daher die numerische 'id' für Updates.
                document.getElementById('edit-p-oid').value = p.id;
                document.getElementById('edit-p-id').value = p.id || "";
                document.getElementById('edit-p-name').value = p.name || "";

                // Preis-Feld aufbereiten (Börsen-Preis bevorzugen)
                const editablePrice = p.currentPrice !== undefined ? p.currentPrice : (p.price || "0").replace(/[^0-9.]/g, '');
                document.getElementById('edit-p-price').value = editablePrice;

                document.getElementById('edit-p-stock').value = (p.stock !== undefined) ? p.stock : 0;
                document.getElementById('edit-p-img').value = p.image_url || "";
                document.getElementById('edit-p-desc').value = p.description || "";
            }
            document.getElementById('modal-product').classList.remove('hidden');
        }
        function editProduct() { openEditProduct(null); }

        async function saveProduct() {
            const isUpdate = document.getElementById('edit-p-oid').value !== "";
            const numId = parseInt(document.getElementById('edit-p-id').value) || document.getElementById('edit-p-id').value;

            const body = {
                id: numId,
                name: document.getElementById('edit-p-name').value,
                price: document.getElementById('edit-p-price').value,
                stock: parseInt(document.getElementById('edit-p-stock').value),
                image_url: document.getElementById('edit-p-img').value,
                description: document.getElementById('edit-p-desc').value
            };

            // Wenn Update, schicken wir den Request an die Engine
            if (isUpdate) {
                await fetch(API + '/api/admin/engine', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        mode: 'db',
                        collection: 'products',
                        operation: 'updateOne',
                        filter: { id: numId },
                        payload: { $set: body }
                    }),
                    credentials: 'include'
                });
            } else {
                // Neues Produkt (Nutzt deinen regulären Endpoint, da er IDs generiert)
                await fetch(API + '/api/products', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                    credentials: 'include'
                });
            }

            closeModal('modal-product');

            // WICHTIG: Cache neu laden, damit die Änderungen sofort im Admin Panel sichtbar sind
            await fetch(API + '/api/admin/engine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: 'db', collection: 'dummy', operation: 'dummy' }), // Trick um Server kurz aufzuwecken
                credentials: 'include'
            });
            setTimeout(loadProducts, 1000);
        }

        async function deleteProduct(id) {
            if (!confirm("Produkt löschen? (Das löscht es auch aus den Inventaren der User!)")) return;
            const numId = parseInt(id) || id;
            await fetch(API + '/api/admin/products/' + numId, { method: 'DELETE', credentials: 'include' });
            setTimeout(loadProducts, 500);
        }

        // --- SYSTEM ACTIONS ---
        async function revokeInfinityGlobal() {
            if (!confirm("🚨 ALARM: Soll Infinity Money bei ALLEN normalen Usern entfernt werden?")) return;
            await fetch(API + '/api/admin/system/revoke-infinity', { method: 'POST', credentials: 'include' });
            loadUsers();
        }
        async function resetEconomyGlobal() {
            if (!confirm("🚨 TOTAL-RESET (> 100k)?")) return;
            await fetch(API + '/api/admin/system/reset-rich-users', { method: 'POST', credentials: 'include' });
            loadUsers();
        }
        async function resetStock(zero) {
            const endpoint = zero ? '/api/admin/zero-stock' : '/api/products/reset';
            if (!confirm(zero ? "Lager auf 0 setzen?" : "Lager auffüllen?")) return;
            await fetch(API + endpoint, { method: 'PATCH', credentials: 'include' });
            setTimeout(loadProducts, 500);
        }
        async function forceTax() {
            if (!confirm("⚠️ Steuern (0,5%) bei Reichen einziehen?")) return;
            const res = await fetch(API + '/api/admin/system/force-tax', { method: 'POST', credentials: 'include' });
            const d = await res.json();
            alert(d.message);
            loadUsers();
        }
        async function fixImages() {
            await fetch(API + '/api/admin/system/fix-images', { method: 'POST', credentials: 'include' });
            setTimeout(loadProducts, 500);
        }
        async function fixDecimals() {
            await fetch(API + '/api/admin/system/fix-decimals', { method: 'POST', credentials: 'include' });
            loadUsers();
        }
        async function triggerNormalize() {
            await fetch(API + '/api/admin/system/normalize', { method: 'POST', credentials: 'include' });
            loadUsers();
        }
        async function triggerAI() {
            await fetch(API + '/api/admin/news/trigger-ai', { method: 'POST', credentials: 'include' });
            alert("News generiert.");
        }
        async function resetHumanGrades() {
            if (!confirm("Human Grades DB resetten?")) return;
            await fetch(API + '/api/human/admin/reset-defaults', { method: 'POST', credentials: 'include' });
            alert("Reset ausgeführt.");
        }
        async function refreshHealth() {
            const container = id => document.getElementById('health-stats').children[id].querySelector('.stat-value');
            try {
                const res = await fetch(API + '/api/admin/health-check', { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    container(0).innerText = data.memory || "N/A";
                    container(1).innerText = data.uptime || "N/A";
                    container(2).innerHTML = data.dbStatus === "Connected ✅" ? '<span class="text-green-400">Online</span>' : '<span class="text-red-500">Offline</span>';
                    container(3).innerText = data.productCacheSize || "0";
                }
            } catch (e) { }
        }
    