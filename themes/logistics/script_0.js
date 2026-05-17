
        const API_BASE = 'https://api.limazon.v6.rocks/api';
        const fetchOpts = { credentials: 'include', headers: { 'Content-Type': 'application/json' } };
        let currentProviders = [];
        let selectedProviderId = null;

        async function init() {
            await Promise.all([loadInventory(), loadProviders()]);
        }

        async function loadInventory() {
            try {
                const res = await fetch(`${API_BASE}/delivery/inventory`, fetchOpts);
                const items = await res.json();
                const select = document.getElementById('product-select');
                
                select.innerHTML = '<option value="">Bitte Item auswählen...</option>';
                
                if (items.length === 0) {
                    select.innerHTML = '<option value="">Dein Inventar ist leer!</option>';
                    document.getElementById('send-btn').disabled = true;
                    document.getElementById('send-all-btn').disabled = true;
                    document.getElementById('send-btn').classList.add('opacity-50', 'cursor-not-allowed');
                    document.getElementById('send-all-btn').classList.add('opacity-50', 'cursor-not-allowed');
                    return;
                }

                const categories = {};
                items.forEach(item => {
                    if (!categories[item.category]) categories[item.category] = [];
                    categories[item.category].push(
                        `<option value="${item.productId}">${item.icon} ${item.name} (Besitz: ${item.quantityOwned})</option>`
                    );
                });

                for (const [catName, options] of Object.entries(categories)) {
                    select.innerHTML += `<optgroup label="--- ${catName.toUpperCase()} ---">${options.join('')}</optgroup>`;
                }
            } catch (e) {
                alert("Fehler beim Laden des Inventars.");
            }
        }

        async function loadProviders() {
            try {
                const res = await fetch(`${API_BASE}/delivery/providers`, fetchOpts);
                currentProviders = await res.json();
                
                const container = document.getElementById('providers-container');
                container.innerHTML = '';
                
                currentProviders.forEach(p => {
                    container.innerHTML += `
                        <div class="provider-card border border-slate-700 bg-slate-800/50 p-3 rounded-xl cursor-pointer hover:border-orange-500/50 transition relative overflow-hidden group" 
                             id="prov-${p.id}" onclick="selectProvider('${p.id}')">
                            <div class="font-bold text-sm text-white mb-1 leading-tight">${p.name}</div>
                            <div class="flex flex-col gap-1 mt-2">
                                <span class="text-[11px] text-slate-400 font-mono flex items-center gap-1">⏱️ ca. ${p.timeMins} Min</span>
                                <span class="text-[12px] text-orange-400 font-mono font-bold flex items-center gap-1">💸 $${p.cost.toLocaleString('de-DE')}</span>
                            </div>
                        </div>
                    `;
                });
            } catch (e) { alert("Konnte Tarife nicht laden."); }
        }

        function selectProvider(providerId) {
            document.querySelectorAll('.provider-card').forEach(el => {
                el.classList.remove('border-orange-500', 'bg-orange-500/10', 'ring-2', 'ring-orange-500/50');
                el.classList.add('border-slate-700', 'bg-slate-800/50');
            });
            const selected = document.getElementById(`prov-${providerId}`);
            selected.classList.remove('border-slate-700', 'bg-slate-800/50');
            selected.classList.add('border-orange-500', 'bg-orange-500/10', 'ring-2', 'ring-orange-500/50');
            selectedProviderId = providerId;
        }

        async function sendPackage() {
            const productId = document.getElementById('product-select').value;
            const quantity = document.getElementById('quantity').value;
            const target = document.getElementById('target-username').value.trim();

            if (!productId || !target || !selectedProviderId) return alert("Bitte wähle Item, Empfänger und einen Tarif!");

            const btn = document.getElementById('send-btn');
            const ogText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = `<span class="animate-spin">⏳</span> Versendet...`;

            try {
                const res = await fetch(`${API_BASE}/delivery/send`, {
                    ...fetchOpts, 
                    method: 'POST', 
                    body: JSON.stringify({
                        targetUsername: target,
                        productId: productId,
                        quantity: quantity,
                        providerId: selectedProviderId 
                    })
                });
                const data = await res.json();
                
                if(res.ok) {
                    alert("Erfolg: " + (data.message || "Paket versendet!"));
                    document.getElementById('target-username').value = '';
                    document.getElementById('quantity').value = '1';
                    selectedProviderId = null;
                    await init(); 
                } else {
                    alert("Fehler: " + data.error);
                }
            } catch (e) { 
                alert("Fehler beim Versand."); 
            }
            
            btn.disabled = false;
            btn.innerHTML = ogText;
        }

        async function sendAllInventory() {
            const target = document.getElementById('target-username').value.trim();
            if (!target || !selectedProviderId) return alert("Bitte wähle einen Empfänger und einen Lieferdienst!");
            if (!confirm("Möchtest du wirklich dein KOMPLETTES Inventar versenden? Dies kann nicht rückgängig gemacht werden!")) return;

            const btn = document.getElementById('send-all-btn');
            const ogText = btn.innerHTML;
            btn.disabled = true; 
            btn.innerHTML = `<span class="animate-spin">⏳</span> LKW wird beladen...`;

            try {
                const res = await fetch(`${API_BASE}/delivery/send-all`, {
                    ...fetchOpts, 
                    method: 'POST', 
                    body: JSON.stringify({ targetUsername: target, providerId: selectedProviderId })
                });
                const data = await res.json();
                
                if(res.ok) {
                    alert("Erfolg: " + (data.message || "Umzug beauftragt!"));
                    document.getElementById('target-username').value = '';
                    selectedProviderId = null;
                    await init(); 
                } else {
                    alert("Fehler: " + data.error);
                }
            } catch (e) { 
                alert("Fehler beim Umzug."); 
            }
            
            btn.disabled = false; 
            btn.innerHTML = ogText;
        }

        window.onload = init;
    