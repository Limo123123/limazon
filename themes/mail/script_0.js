
        const API_BASE = 'https://api.limazon.v6.rocks/api';
        const fetchOptions = { credentials: 'include', headers: { 'Content-Type': 'application/json' } };

        // Admin-Dropdown Logik
        document.getElementById('mail-target').addEventListener('change', (e) => {
            const nameContainer = document.getElementById('mail-target-name-container');
            if (e.target.value === 'single') {
                nameContainer.classList.remove('hidden');
            } else {
                nameContainer.classList.add('hidden');
                document.getElementById('mail-target-name').value = '';
            }
        });

        async function init() {
            try {
                const authRes = await fetch(`${API_BASE}/auth/me`, fetchOptions);
                if (!authRes.ok) return alert("Bitte einloggen.");
                const user = await authRes.json();
                
                if (user.isRealAdmin) document.getElementById('admin-panel').classList.remove('hidden');
                loadMails();
            } catch (e) { console.error("Init Error:", e); }
        }

        async function loadMails() {
            const container = document.getElementById('inbox-container');
            try {
                const res = await fetch(`${API_BASE}/mail/inbox`, fetchOptions);
                const data = await res.json();

                container.innerHTML = '';
                if (!data.mails || data.mails.length === 0) {
                    container.innerHTML = '<div class="glass p-8 rounded-xl text-center text-slate-400 text-sm font-medium border border-slate-800">Dein Postfach ist leer. 📭</div>';
                    return;
                }

                data.mails.forEach(mail => {
                    const isUnread = !mail.isRead;
                    const dateStr = new Date(mail.createdAt).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                    
                    let rewardHtml = '';
                    if (mail.rewards) {
                        if (mail.isClaimed) {
                            rewardHtml = `
                                <div class="mt-4 bg-slate-800/50 border border-slate-700 p-3 rounded-xl text-center opacity-70">
                                    <span class="text-xs text-slate-400 font-bold uppercase tracking-wider">✅ Belohnung eingelöst</span>
                                </div>`;
                        } else {
                            // Erstelle einen kleinen Text, was drin ist
                            let rewardDetails = [];
                            if(mail.rewards.money) rewardDetails.push(`<span class="text-emerald-400 font-mono">$${mail.rewards.money.toLocaleString('de-DE')}</span>`);
                            if(mail.rewards.tokens) rewardDetails.push(`<span class="text-amber-400 font-mono">${mail.rewards.tokens} Tokens</span>`);
                            if(mail.rewards.badge) rewardDetails.push(`<span class="text-purple-400">Badge</span>`);

                            rewardHtml = `
                                <div class="mt-4 bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl text-center shadow-inner">
                                    <p class="text-sm font-bold text-white mb-1">🎁 Belohnung verfügbar!</p>
                                    <p class="text-xs text-slate-300 mb-3">Enthält: ${rewardDetails.join(' • ')}</p>
                                    <button class="bg-emerald-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-emerald-500 transition active:scale-95 text-sm shadow-lg shadow-emerald-600/20 w-full" onclick="claimReward('${mail._id}')">
                                        Jetzt einlösen
                                    </button>
                                </div>`;
                        }
                    }

                    // Ungelesene Mails bekommen einen dicken linken Rand und einen leichten Glow
                    const unreadClasses = isUnread ? 'border-l-4 border-l-indigo-500 bg-indigo-900/10' : 'border border-slate-700';
                    const iconColor = isUnread ? 'text-indigo-400' : 'text-slate-500';

                    container.innerHTML += `
                        <div class="glass p-5 rounded-2xl shadow-md ${unreadClasses} transition relative" id="mail-${mail._id}">
                            <div class="flex justify-between items-start mb-3">
                                <div class="flex items-center gap-2">
                                    <span class="${iconColor} text-lg">📩</span>
                                    <span class="text-sm font-bold text-slate-300 uppercase tracking-wider">${mail.sender}</span>
                                </div>
                                <span class="text-[10px] text-slate-500 font-mono">${dateStr}</span>
                            </div>
                            
                            <h3 class="text-lg font-bold text-white mb-2 leading-tight">${mail.subject}</h3>
                            <div class="bg-slate-900/50 p-4 rounded-xl text-sm text-slate-300 whitespace-pre-wrap border border-slate-800 leading-relaxed">${mail.content}</div>
                            
                            ${rewardHtml}
                        </div>
                    `;

                    // Wenn ungelesen, automatisch im Backend als gelesen markieren
                    if (isUnread) {
                        fetch(`${API_BASE}/mail/${mail._id}/read`, { ...fetchOptions, method: 'POST' });
                    }
                });

            } catch (e) {
                container.innerHTML = '<p class="text-center text-red-500 font-bold">Fehler beim Laden.</p>';
            }
        }

        async function claimReward(mailId) {
            try {
                const res = await fetch(`${API_BASE}/mail/${mailId}/claim`, { ...fetchOptions, method: 'POST' });
                const data = await res.json();
                
                if (res.ok) {
                    alert(data.message);
                    loadMails(); // Lade neu, um den Status auf "eingelöst" zu setzen
                } else {
                    alert("Fehler: " + data.error);
                }
            } catch (e) {
                alert("Fehler beim Einlösen.");
            }
        }

        // Für Admins
        async function sendAdminMail() {
            if(!confirm("Mail wirklich absenden?")) return;

            let target = document.getElementById('mail-target').value;
            if (target === 'single') target = document.getElementById('mail-target-name').value.trim();

            const subject = document.getElementById('mail-subject').value.trim();
            const content = document.getElementById('mail-content').value.trim();

            if(!subject || !content) return alert("Betreff und Nachricht dürfen nicht leer sein!");

            const money = parseInt(document.getElementById('mail-reward-money').value) || 0;
            const tokens = parseInt(document.getElementById('mail-reward-tokens').value) || 0;
            const badge = document.getElementById('mail-reward-badge').value.trim();

            let rewards = null;
            if (money > 0 || tokens > 0 || badge) {
                rewards = {};
                if (money > 0) rewards.money = money;
                if (tokens > 0) rewards.tokens = tokens;
                if (badge) rewards.badge = badge;
            }

            const payload = {
                target: target,
                subject: subject,
                content: content,
                rewards: rewards
            };

            const btn = document.querySelector('#admin-panel button');
            const ogText = btn.innerHTML;
            btn.innerHTML = "Sende...";
            btn.disabled = true;

            try {
                const res = await fetch(`${API_BASE}/admin/mail/send`, {
                    ...fetchOptions,
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                alert(res.ok ? "Erfolg: " + data.message : "Fehler: " + data.error);
                
                if(res.ok) {
                    document.getElementById('mail-subject').value = '';
                    document.getElementById('mail-content').value = '';
                    document.getElementById('mail-reward-money').value = '';
                    document.getElementById('mail-reward-tokens').value = '';
                    document.getElementById('mail-reward-badge').value = '';
                    loadMails(); // Damit der Admin seine eigene Mail sieht (falls 'all' gewählt)
                }
            } catch (e) {
                alert("Verbindungsfehler beim Versenden.");
            } finally {
                btn.innerHTML = ogText;
                btn.disabled = false;
            }
        }

        window.onload = init;
    