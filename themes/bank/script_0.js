
        const API_URL = 'https://api.limazon.v6.rocks';
        let currentUser = null;
        let searchTimeout = null;
        let currentLoanData = null; // Speichert Daten für Kredite

        checkAuth();

        async function checkAuth() {
            try {
                const res = await fetch(API_URL + '/api/auth/me', { credentials: 'include' });
                if (res.ok) {
                    currentUser = await res.json();
                    document.getElementById('login-overlay').classList.add('hidden');
                    updateUI();
                    loadTransactions();
                } else document.getElementById('login-overlay').classList.remove('hidden');
            } catch (e) { document.getElementById('login-overlay').classList.remove('hidden'); }
        }

        // --- FORMATIERUNG ---
        function formatBigNumber(num, isCurrency = true) {
            const SAFE_MAX = Number.MAX_SAFE_INTEGER;
            if (num > SAFE_MAX) return isCurrency ? "$ ∞" : "∞ Tokens";

            if (num < 1000000000000) {
                const formatted = new Intl.NumberFormat('de-DE', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }).format(num);
                return isCurrency ? `$ ${formatted}` : `${formatted} Tokens`;
            }

            const compact = new Intl.NumberFormat('en-US', {
                notation: "compact",
                compactDisplay: "short",
                maximumFractionDigits: 1
            }).format(num);

            return isCurrency ? `$ ${compact}` : `${compact} Tokens`;
        }

        function getSchufaColorClass(score) {
            if(score >= 750) return 'schufa-good';
            if(score >= 400) return 'schufa-ok';
            return 'schufa-bad';
        }

        function updateFeePreview() {
            const amountInput = document.getElementById('tx-amount').value;
            const amount = parseFloat(amountInput) || 0;
            const isHigh = document.getElementById('tx-high-limit').checked;
            const previewBox = document.getElementById('fee-preview');
            const type = document.getElementById('tx-type').value;

            if (!isHigh) {
                previewBox.classList.add('hidden');
                return;
            }

            previewBox.classList.remove('hidden');
            const fee = amount * 0.01; 
            const receive = amount - fee;
            const symbol = type === 'money' ? '$' : 'T';
            
            const fmt = (n) => {
                if(n > 1000000000000) return new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 2 }).format(n);
                return n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            };

            document.getElementById('calc-fee').innerText = `- ${symbol} ${fmt(fee)}`;
            document.getElementById('calc-receive').innerText = `${symbol} ${fmt(receive)}`;
        }

        // --- SEARCH ---
        async function handleUserSearch(val) {
            const resDiv = document.getElementById('user-search-results');
            if (searchTimeout) clearTimeout(searchTimeout);
            if (!val || val.length < 2) { resDiv.classList.add('hidden'); return; }

            searchTimeout = setTimeout(async () => {
                try {
                    const res = await fetch(API_URL + '/api/bank/users/search?term=' + encodeURIComponent(val), { credentials: 'include' });
                    const data = await res.json();
                    resDiv.innerHTML = '';
                    if (data.users && data.users.length > 0) {
                        resDiv.classList.remove('hidden');
                        data.users.forEach(u => {
                            if (u.username === currentUser.username) return;
                            const div = document.createElement('div');
                            div.className = 'search-item';
                            div.innerHTML = `<div class="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-xs">${u.username.substring(0, 1).toUpperCase()}</div><span class="font-medium text-sm">${u.username}</span>`;
                            div.onclick = () => { document.getElementById('tx-to').value = u.username; resDiv.classList.add('hidden'); };
                            resDiv.appendChild(div);
                        });
                    } else resDiv.classList.add('hidden');
                } catch (e) { }
            }, 300);
        }
        document.addEventListener('click', e => { if (e.target.id !== 'tx-to') document.getElementById('user-search-results').classList.add('hidden'); });

        // --- AUTH ---
        function toggleAuthMode(mode) {
            document.getElementById('l-err').innerText = "";
            if (mode === 'login') {
                document.getElementById('form-login').classList.remove('hidden');
                document.getElementById('form-register').classList.add('hidden');
                document.getElementById('tab-login').classList.add('active');
                document.getElementById('tab-register').classList.remove('active');
            } else {
                document.getElementById('form-login').classList.add('hidden');
                document.getElementById('form-register').classList.remove('hidden');
                document.getElementById('tab-login').classList.remove('active');
                document.getElementById('tab-register').classList.add('active');
            }
        }
        
        async function doLogin() {
            const u = document.getElementById('l-user').value; const p = document.getElementById('l-pass').value;
            const err = document.getElementById('l-err');
            if (!u || !p) return err.innerText = "Bitte Felder ausfüllen."; err.innerText = "Lade...";
            try {
                const res = await fetch(API_URL + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, password: p }), credentials: 'include' });
                if (res.ok) window.location.reload(); else { const d = await res.json(); err.innerText = d.error || "Login fehlgeschlagen."; }
            } catch (e) { err.innerText = "Verbindungsfehler."; }
        }
        
        async function doRegister() {
            const u = document.getElementById('r-user').value; const p = document.getElementById('r-pass').value;
            const err = document.getElementById('l-err');
            if (!u || p.length < 6) return err.innerText = "Name (3+) und PW (6+) erforderlich."; err.innerText = "Registriere...";
            try {
                const res = await fetch(API_URL + '/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: u, password: p }), credentials: 'include' });
                if (res.ok) { alert("Konto erstellt! Bitte einloggen."); toggleAuthMode('login'); document.getElementById('l-user').value = u; }
                else { const d = await res.json(); err.innerText = d.error || "Fehler."; }
            } catch (e) { err.innerText = "Fehler."; }
        }
        
        async function logout() { try { await fetch(API_URL + '/api/auth/logout', { method: 'POST', credentials: 'include' }); } catch (e) { } window.location.reload(); }

        // --- UI ---
        function updateUI() {
            document.getElementById('display-balance').innerText = formatBigNumber(currentUser.balance, true);
            document.getElementById('display-tokens').innerText = formatBigNumber(currentUser.tokens, false);

            document.getElementById('card-holder').innerText = currentUser.username.toUpperCase();
            const initial = currentUser.username.substring(0, 2).toUpperCase();
            document.getElementById('user-avatar').innerText = initial.substring(0, 1);
            document.getElementById('profile-avatar').innerText = initial;
            document.getElementById('profile-username').innerText = currentUser.username;

            // Schufa auf der Karte
            const schufaScore = currentUser.schufaScore || 500;
            const cardSchufaEl = document.getElementById('card-schufa');
            cardSchufaEl.innerText = schufaScore;
            cardSchufaEl.className = `text-sm font-bold drop-shadow-md ${getSchufaColorClass(schufaScore)}`;
        }

        async function loadTransactions() {
            const list = document.getElementById('tx-list');
            const cardBg = document.getElementById('credit-card-bg');

            try {
                const res = await fetch(API_URL + '/api/bank/transactions', { credentials: 'include' });
                const data = await res.json();

                list.innerHTML = '';
                if (data.transactions.length === 0) {
                    list.innerHTML = '<div class="glass p-8 rounded-xl text-center text-slate-500 text-sm">Keine Umsätze.</div>';
                    cardBg.className = "card-default w-full aspect-[1.586/1] rounded-2xl p-6 shadow-2xl relative overflow-hidden mb-8 group transition-transform active:scale-95 duration-200 border border-white/10";
                    return;
                }

                let income = 0;
                let expense = 0;
                data.transactions.forEach(tx => {
                    if (tx.toId === currentUser.userId) income += tx.amount;
                    else expense += tx.amount;
                });

                const baseClasses = "w-full aspect-[1.586/1] rounded-2xl p-6 shadow-2xl relative overflow-hidden mb-8 group transition-transform active:scale-95 duration-200 border border-white/10";

                if (currentUser.balance > 1000000) {
                    cardBg.className = baseClasses + " card-rich";
                } else if (income > expense * 1.5) {
                    cardBg.className = baseClasses + " card-income";
                } else if (expense > income * 1.2) {
                    cardBg.className = baseClasses + " card-expense";
                } else {
                    cardBg.className = baseClasses + " card-default";
                }

                data.transactions.forEach(tx => {
                    const isIncoming = tx.toId === currentUser.userId;
                    const amountSign = isIncoming ? '+' : '-';
                    const colorClass = isIncoming ? 'text-emerald-400' : 'text-slate-100';
                    const iconBg = isIncoming ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700 text-slate-300';
                    const icon = isIncoming ? '⬇' : '⬆';
                    const partnerName = isIncoming ? tx.fromName : tx.toName;
                    const symbol = tx.type === 'token' ? 'T' : '$';
                    const date = new Date(tx.timestamp).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });

                    const formattedAmount = formatBigNumber(tx.amount, false).replace("Tokens", "").replace("$", "").trim();

                    let feeInfo = "";
                    if(!isIncoming && tx.fee > 0) {
                        feeInfo = `<span class="text-[10px] text-red-400 block opacity-70">Gebühr: -${tx.type==='token'?'T':'$'}${formatBigNumber(tx.fee, false).replace("Tokens","").replace("$","").trim()}</span>`;
                    }

                    list.innerHTML += `
                        <div class="glass p-4 rounded-xl flex items-center justify-between hover:bg-white/5 transition">
                            <div class="flex items-center gap-4">
                                <div class="w-10 h-10 rounded-full ${iconBg} flex items-center justify-center font-bold text-lg">${icon}</div>
                                <div>
                                    <h4 class="font-bold text-sm text-white">${partnerName}</h4>
                                    <p class="text-xs text-slate-400">${tx.reason || 'Überweisung'}</p>
                                </div>
                            </div>
                            <div class="text-right">
                                <span class="font-mono font-bold ${colorClass} text-lg block">${amountSign} ${symbol} ${formattedAmount}</span>
                                ${feeInfo}
                                <p class="text-[10px] text-slate-500 font-medium tracking-wide">${date}</p>
                            </div>
                        </div>
                    `;
                });
            } catch (e) { list.innerHTML = '<div class="text-red-500 text-center">Ladefehler</div>'; }
        }

        // --- KREDIT LOGIK ---
        async function openLoanModal() {
            document.getElementById('loan-modal').classList.remove('hidden');
            document.getElementById('loan-loading').classList.remove('hidden');
            document.getElementById('loan-apply-view').classList.add('hidden');
            document.getElementById('loan-pay-view').classList.add('hidden');
            
            try {
                const res = await fetch(API_URL + '/api/bank/loan', { credentials: 'include' });
                const data = await res.json();
                
                if (res.ok) {
                    currentLoanData = data;
                    
                    // Header Update
                    const scoreEl = document.getElementById('loan-schufa-score');
                    const ratingEl = document.getElementById('loan-schufa-rating');
                    
                    scoreEl.innerText = data.schufaScore;
                    scoreEl.className = `text-xl font-bold font-mono ${getSchufaColorClass(data.schufaScore)}`;
                    ratingEl.innerText = data.rating;
                    ratingEl.className = `text-[10px] uppercase font-bold mt-0.5 ${getSchufaColorClass(data.schufaScore)}`;

                    document.getElementById('loan-loading').classList.add('hidden');

                    if (data.activeLoan) {
                        // Hat schon einen Kredit -> Zeige Abbezahlen View
                        document.getElementById('loan-pay-view').classList.remove('hidden');
                        document.getElementById('loan-debt-amount').innerText = `$${data.activeLoan.remainingDue.toLocaleString('de-DE', {minimumFractionDigits: 2})}`;
                        document.getElementById('loan-due-date').innerText = new Date(data.activeLoan.dueDate).toLocaleDateString('de-DE');
                        document.getElementById('loan-pay-amount').max = data.activeLoan.remainingDue;
                    } else {
                        // Kein Kredit -> Zeige Beantragen View
                        document.getElementById('loan-apply-view').classList.remove('hidden');
                        document.getElementById('loan-max-amount').innerText = `$${data.maxLoan.toLocaleString('de-DE')}`;
                        document.getElementById('loan-interest-rate').innerText = `${data.interestRate}%`;
                        document.getElementById('loan-request-amount').max = data.maxLoan;

                        const applyBtn = document.getElementById('btn-loan-apply');
                        const errMsg = document.getElementById('loan-error-msg');

                        if (!data.canApply) {
                            applyBtn.disabled = true;
                            applyBtn.className = "flex-1 bg-slate-700 py-4 rounded-xl font-bold text-slate-500 cursor-not-allowed";
                            errMsg.classList.remove('hidden');
                            if (data.accountAgeDays < 7) {
                                errMsg.innerText = "Dein Account muss mindestens 7 Tage alt sein.";
                            } else if (data.maxLoan === 0) {
                                errMsg.innerText = "Dein Schufa-Score ist zu niedrig für einen Kredit.";
                            } else {
                                errMsg.innerText = "Dein Konto ist im Minus. Begleiche erst deine Schulden.";
                            }
                        } else {
                            applyBtn.disabled = false;
                            applyBtn.className = "flex-1 bg-blue-600 py-4 rounded-xl font-bold text-white hover:bg-blue-500 transition shadow-lg shadow-blue-500/20 active:scale-95";
                            errMsg.classList.add('hidden');
                        }
                    }
                } else {
                    document.getElementById('loan-loading').innerText = data.error || "Fehler beim Laden.";
                }
            } catch (err) {
                document.getElementById('loan-loading').innerText = "Verbindungsfehler zur Schufa.";
            }
        }

        async function submitLoanApply(e) {
            e.preventDefault();
            const amount = parseFloat(document.getElementById('loan-request-amount').value);
            const btn = document.getElementById('btn-loan-apply');
            
            btn.disabled = true; btn.innerText = "Prüfe...";
            try {
                const res = await fetch(API_URL + '/api/bank/loan/apply', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount }),
                    credentials: 'include'
                });
                const data = await res.json();
                if (res.ok) {
                    alert(data.message);
                    closeModal('loan-modal');
                    checkAuth(); // Lädt UI neu
                } else {
                    alert("Abgelehnt: " + data.error);
                }
            } catch (err) {
                alert("Fehler bei der Verbindung zur Bank.");
            } finally {
                btn.disabled = false; btn.innerText = "Beantragen";
            }
        }

        async function submitLoanPay(e) {
            e.preventDefault();
            const amount = parseFloat(document.getElementById('loan-pay-amount').value);
            const btn = e.target.querySelector('button[type="submit"]');
            
            btn.disabled = true; btn.innerText = "Zahle...";
            try {
                const res = await fetch(API_URL + '/api/bank/loan/pay', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount }),
                    credentials: 'include'
                });
                const data = await res.json();
                if (res.ok) {
                    alert(data.message);
                    closeModal('loan-modal');
                    checkAuth(); // Lädt UI neu
                } else {
                    alert("Fehler: " + data.error);
                }
            } catch (err) {
                alert("Verbindungsfehler.");
            } finally {
                btn.disabled = false; btn.innerText = "Bezahlen";
            }
        }

        function payFullLoan() {
            if (currentLoanData && currentLoanData.activeLoan) {
                document.getElementById('loan-pay-amount').value = currentLoanData.activeLoan.remainingDue;
            }
        }

        // --- MODALS ---
        function openTransferModal(type) {
            const modal = document.getElementById('transfer-modal');
            const title = document.getElementById('modal-title');
            const cur = document.getElementById('tx-currency');
            document.getElementById('tx-type').value = type;
            document.getElementById('tx-to').value = '';
            document.getElementById('tx-amount').value = '';
            document.getElementById('tx-reason').value = '';
            document.getElementById('tx-high-limit').checked = false; 
            updateFeePreview(); 
            document.getElementById('user-search-results').classList.add('hidden');

            if (type === 'money') { title.innerText = "Geld senden"; cur.innerText = "$"; }
            else { title.innerText = "Tokens senden"; cur.innerText = "T"; }
            modal.classList.remove('hidden');
        }
        
        function openProfile() { document.getElementById('profile-modal').classList.remove('hidden'); }
        function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

        async function submitTransfer(e) {
            e.preventDefault();
            const type = document.getElementById('tx-type').value;
            const to = document.getElementById('tx-to').value;
            const amount = parseFloat(document.getElementById('tx-amount').value);
            const reason = document.getElementById('tx-reason').value;
            const isHigh = document.getElementById('tx-high-limit').checked; 

            const btn = e.target.querySelector('button[type="submit"]');
            const originalText = btn.innerText; btn.innerText = "Sende..."; btn.disabled = true;
            
            try {
                const res = await fetch(API_URL + '/api/bank/transfer', { 
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify({ recipientName: to, amount, type, reason, highLimitMode: isHigh }), 
                    credentials: 'include' 
                });
                const data = await res.json();
                if (res.ok) { closeModal('transfer-modal'); checkAuth(); } else { alert("Fehler: " + data.error); }
            } catch (err) { alert("Verbindungsfehler"); } finally { btn.innerText = originalText; btn.disabled = false; }
        }

        async function claimDaily() {
            try {
                const res = await fetch('https://api.limazon.v6.rocks/api/daily', { method: 'POST', credentials: 'include' });
                const data = await res.json();

                if (res.ok) {
                    alert(data.message);
                    location.reload(); 
                } else {
                    alert(data.error); 
                }
            } catch (e) { alert("Verbindungsfehler"); }
        }
    