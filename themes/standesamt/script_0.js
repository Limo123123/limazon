
        const API_BASE = 'https://api.limazon.v6.rocks/api';
        const fetchOpts = { credentials: 'include', headers: { 'Content-Type': 'application/json' } };

        async function loadData() {
            try {
                const res = await fetch(`${API_BASE}/standesamt/status`, fetchOpts);
                if (!res.ok) {
                    showToast("Bitte logge dich ein.", "error");
                    return;
                }
                const data = await res.json();

                // Ringe ins Select laden
                const select = document.getElementById('ring-select');
                if (select.options.length <= 1) { 
                    for (const [key, ring] of Object.entries(data.rings)) {
                        select.innerHTML += `<option value="${key}">${ring.icon} ${ring.name} - $${ring.price.toLocaleString('de-DE')}</option>`;
                    }
                }

                // Anträge rendern
                const inbox = document.getElementById('incoming-list');
                inbox.innerHTML = '';
                if (data.incoming.length === 0) {
                    inbox.innerHTML = '<p class="text-slate-500 text-sm text-center py-2 border border-dashed border-slate-700 rounded-lg">Niemand hat dir einen Antrag gemacht. 💔</p>';
                }
                
                data.incoming.forEach(p => {
                    const dateStr = new Date(p.createdAt).toLocaleDateString('de-DE');
                    inbox.innerHTML += `
                        <div class="bg-slate-800/50 border border-rose-500/30 p-4 rounded-xl relative overflow-hidden">
                            <div class="absolute right-2 top-2 text-4xl opacity-10">💍</div>
                            <p class="text-sm text-slate-300 mb-1">
                                <strong class="text-white font-bold text-lg">${p.senderName}</strong> fragt dich!
                            </p>
                            <p class="text-xs text-slate-400 font-mono mb-4">
                                Ring: ${p.ringDetails.icon} ${p.ringDetails.name} • ${dateStr}
                            </p>
                            <div class="flex gap-2 relative z-10">
                                <button onclick="respond('${p._id}', 'accept')" class="flex-1 bg-emerald-600/20 text-emerald-400 border border-emerald-600/50 py-2 rounded-lg font-bold text-sm hover:bg-emerald-600 hover:text-white transition active:scale-95">JA!</button>
                                <button onclick="respond('${p._id}', 'decline')" class="flex-1 bg-slate-700 text-slate-300 border border-slate-600 py-2 rounded-lg font-bold text-sm hover:bg-rose-600 hover:text-white hover:border-rose-600 transition active:scale-95">Nein</button>
                            </div>
                        </div>
                    `;
                });

                // Ehepartner rendern
                const spousesList = document.getElementById('spouses-list');
                spousesList.innerHTML = '';
                
                const taxBadge = document.getElementById('tax-badge');
                if (data.spouses.length > 0) {
                    taxBadge.classList.remove('hidden');
                } else {
                    taxBadge.classList.add('hidden');
                }

                if (data.spouses.length === 0) {
                    spousesList.innerHTML = '<p class="text-slate-500 text-sm text-center py-2 border border-dashed border-slate-700 rounded-lg">Du bist glücklicher Single. 🧘‍♂️</p>';
                }

                data.spouses.forEach(s => {
                    const dateStr = new Date(s.date).toLocaleDateString('de-DE');
                    spousesList.innerHTML += `
                        <div class="bg-slate-800/50 border border-slate-700 p-4 rounded-xl flex justify-between items-center group hover:border-rose-500/50 transition">
                            <div>
                                <h3 class="text-white font-bold flex items-center gap-2">
                                    <span class="text-rose-500">💖</span> ${s.name}
                                </h3>
                                <p class="text-[11px] text-slate-400 font-mono mt-1">
                                    ${s.ring} • Seit: ${dateStr}
                                </p>
                            </div>
                            <button onclick="divorce('${s.id}', '${s.name}')" class="bg-rose-500/10 text-rose-400 border border-rose-500/30 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-rose-600 hover:text-white transition active:scale-95 whitespace-nowrap">
                                Scheidung
                            </button>
                        </div>
                    `;
                });

            } catch (e) {
                showToast("Fehler beim Laden der Akten.", "error");
            }
        }

        async function propose() {
            const target = document.getElementById('target-username').value.trim();
            const ring = document.getElementById('ring-select').value;
            
            if (!target || !ring) return showToast("Bitte wähle eine Person und einen Ring.", "error");

            const btn = document.querySelector('button[onclick="propose()"]');
            const ogText = btn.innerHTML;
            btn.innerHTML = `<span class="animate-spin">⏳</span> Kaufe Ring...`;
            btn.disabled = true;

            try {
                const res = await fetch(`${API_BASE}/standesamt/propose`, {
                    ...fetchOpts, method: 'POST', body: JSON.stringify({ targetUsername: target, ringType: ring })
                });
                const data = await res.json();
                
                if (res.ok) {
                    showToast(data.message, "success");
                    document.getElementById('target-username').value = '';
                    document.getElementById('ring-select').value = '';
                    loadData();
                } else {
                    showToast(data.error, "error");
                }
            } catch (e) { 
                showToast("Der Ring ist ins Gulli gefallen.", "error"); 
            } finally {
                btn.innerHTML = ogText;
                btn.disabled = false;
            }
        }

        async function respond(proposalId, action) {
            try {
                const res = await fetch(`${API_BASE}/standesamt/respond`, {
                    ...fetchOpts, method: 'POST', body: JSON.stringify({ proposalId, action })
                });
                const data = await res.json();
                
                if (res.ok) {
                    showToast(data.message, "success");
                    loadData();
                } else {
                    showToast(data.error, "error");
                }
            } catch (e) { 
                showToast("Fehler bei der Antwort.", "error"); 
            }
        }

        async function divorce(targetId, name) {
            if (!confirm(`Willst du dich wirklich von ${name} scheiden lassen? Das kostet $25.000 Anwaltsgebühren und landet in den LNN News!`)) return;
            
            try {
                const res = await fetch(`${API_BASE}/standesamt/divorce`, {
                    ...fetchOpts, method: 'POST', body: JSON.stringify({ targetId })
                });
                const data = await res.json();
                
                if (res.ok) {
                    showToast(data.message, "success");
                    loadData();
                } else {
                    showToast(data.error, "error");
                }
            } catch (e) { 
                showToast("Die Anwälte streiken.", "error"); 
            }
        }

        function showToast(message, type = 'success') {
            const container = document.getElementById('toast-container');
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.innerHTML = `<span class="mr-2">${type === 'success' ? '✅' : '❌'}</span> ${message}`;
            container.appendChild(toast);

            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 300);
            }, 4000);
        }

        window.onload = loadData;
    