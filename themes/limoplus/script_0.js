
        const API_BASE = 'https://api.limazon.v6.rocks/api';
        const fetchOpts = { credentials: 'include', headers: { 'Content-Type': 'application/json' } };

        async function init() {
            try {
                const authRes = await fetch(`${API_BASE}/auth/me`, fetchOpts);
                if (!authRes.ok) return showToast("Bitte logge dich ein.", "error");
                loadSubscriptions();
            } catch (e) {
                showToast("Verbindungsfehler.", "error");
            }
        }

        async function loadSubscriptions() {
            const container = document.getElementById('subs-container');
            try {
                const res = await fetch(`${API_BASE}/subscriptions`, fetchOpts);
                const data = await res.json();

                if (!res.ok) throw new Error(data.error);

                container.innerHTML = '';

                data.catalog.forEach(sub => {
                    const isActive = data.active.includes(sub.id);
                    
                    const btnClass = isActive 
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-600 hover:text-white' 
                        : 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-500 border-transparent';
                    
                    const btnText = isActive ? 'Kündigen' : 'Abonnieren';
                    const activeBadge = isActive 
                        ? `<div class="absolute top-4 right-4 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg uppercase tracking-wider animate-pulse">Aktiv</div>` 
                        : '';

                    container.innerHTML += `
                        <div class="glass p-6 rounded-2xl border border-slate-700 flex flex-col relative transition duration-300 ${isActive ? 'active-sub' : 'hover:border-cyan-500/50'}">
                            ${activeBadge}
                            <div class="text-5xl mb-4 drop-shadow-lg">${sub.icon}</div>
                            <h3 class="text-xl font-bold text-white mb-1">${sub.name}</h3>
                            <div class="text-cyan-400 font-mono font-bold mb-3 bg-cyan-500/10 inline-block px-3 py-1 rounded-lg w-max">
                                $${sub.costPerDay.toLocaleString('de-DE')} / Tag
                            </div>
                            <p class="text-xs text-slate-400 mb-6 flex-grow leading-relaxed">${sub.desc}</p>
                            
                            <button onclick="toggleSub('${sub.id}', '${sub.name}', ${isActive}, ${sub.costPerDay})" 
                                class="w-full border ${btnClass} font-bold py-3 rounded-xl transition active:scale-95 text-sm uppercase tracking-wide">
                                ${btnText}
                            </button>
                        </div>
                    `;
                });

            } catch (e) {
                container.innerHTML = '<p class="col-span-full text-center text-rose-500 font-bold">Fehler beim Laden der Abos.</p>';
            }
        }

        async function toggleSub(subId, name, isActive, cost) {
            const actionText = isActive ? `Willst du ${name} wirklich kündigen?` : `Willst du ${name} für $${cost} pro Tag abonnieren? (Der erste Tag wird sofort fällig!)`;
            if (!confirm(actionText)) return;

            try {
                const res = await fetch(`${API_BASE}/subscriptions/toggle`, {
                    ...fetchOpts,
                    method: 'POST',
                    body: JSON.stringify({ subId })
                });
                const data = await res.json();

                if (res.ok) {
                    showToast(data.message, "success");
                    loadSubscriptions(); // UI sofort updaten
                } else {
                    showToast(data.error, "error");
                }
            } catch (e) {
                showToast("Fehler bei der Transaktion.", "error");
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

        window.onload = init;
    