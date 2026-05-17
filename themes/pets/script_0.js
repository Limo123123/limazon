
        const API_BASE = 'https://api.limazon.v6.rocks/api';
        const fetchOpts = { credentials: 'include', headers: { 'Content-Type': 'application/json' } };
        
        // Globale Variable für den aktuellen User
        let currentUser = null;

        async function fetchApi(endpoint, method = 'GET', body = null) {
            const options = { ...fetchOpts, method };
            if (body) options.body = JSON.stringify(body);
            try {
                const res = await fetch(API_BASE + endpoint, options);
                const data = await res.json();
                data.ok = res.ok;
                return data;
            } catch (e) {
                return { error: "Netzwerkfehler", ok: false };
            }
        }

        async function init() {
            // Lade den User beim Start, um später den originalOwner prüfen zu können
            const meData = await fetchApi('/auth/me');
            if (meData.ok) {
                currentUser = meData;
            }
            loadMyPets();
        }

        function switchTab(tabId) {
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            
            document.getElementById(tabId).classList.add('active');
            event.target.classList.add('active');

            if (tabId === 'shop') loadShop();
            if (tabId === 'myPets') loadMyPets();
            if (tabId === 'cemetery') loadCemetery();
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

        // --- SHOP LOGIK ---
        async function loadShop() {
            const data = await fetchApi('/pets/shop');
            const grid = document.getElementById('shop-grid');
            if (!data.ok) return grid.innerHTML = `<p class="col-span-full text-center text-red-500">${data.error}</p>`;

            grid.innerHTML = data.catalog.map(pet => `
                <div class="glass p-5 rounded-2xl border border-slate-700 text-center hover:border-emerald-500/50 transition flex flex-col">
                    <div class="text-5xl mb-3 drop-shadow-lg">${pet.icon}</div>
                    <div class="text-lg font-bold text-white mb-1">${pet.name}</div>
                    <div class="text-xs text-slate-400 mb-3">${pet.enclosure}</div>
                    <div class="text-emerald-400 font-mono font-bold mb-4 bg-emerald-500/10 inline-block px-3 py-1 rounded-lg mx-auto">$${pet.price.toLocaleString('de-DE')}</div>
                    
                    <div class="mt-auto space-y-3">
                        <input type="text" id="name-${pet.id}" class="input-dark w-full p-3 rounded-xl text-sm text-center" placeholder="Name geben..." maxlength="20">
                        <button class="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-500 transition active:scale-95 shadow-md shadow-emerald-600/20" onclick="adoptPet('${pet.id}')">Adoptieren</button>
                    </div>
                </div>
            `).join('');
        }

        async function adoptPet(petId) {
            const nameInput = document.getElementById(`name-${petId}`).value;
            if (!nameInput) return showToast("Bitte gib einen Namen ein!", "error");

            const res = await fetchApi('/pets/adopt', 'POST', { petId, customName: nameInput });
            if (!res.ok) {
                showToast(res.error, "error");
            } else {
                showToast(res.message, "success");
                document.getElementById(`name-${petId}`).value = '';
                document.querySelector('.tab-btn').click(); // Zurück zu Meine Tiere
            }
        }

        // --- EIGENE TIERE ---
        async function loadMyPets() {
            const data = await fetchApi('/pets/my');
            const grid = document.getElementById('my-pets-grid');

            if (!data.ok) return grid.innerHTML = `<p class="col-span-full text-center text-red-500">${data.error}</p>`;
            if (!data.pets || data.pets.length === 0) {
                return grid.innerHTML = `<p class="col-span-full text-center text-slate-500 text-sm py-8 border border-dashed border-slate-700 rounded-xl">Du hast keine Haustiere. Ab in die Tierhandlung!</p>`;
            }

            grid.innerHTML = data.pets.map(pet => {
                let barColor = 'bg-emerald-500';
                if (pet.hunger < 50) barColor = 'bg-amber-500'; 
                if (pet.hunger < 20) barColor = 'bg-rose-500'; 

                const isPlant = pet.type.includes('Pflanze') || pet.type.includes('Baum');
                const actionWord = isPlant ? '💧 Gießen' : '🥩 Füttern';
                const btnColor = isPlant ? 'bg-sky-600 hover:bg-sky-500 shadow-sky-600/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20';
                const dyingClass = pet.isDying && !pet.inPension ? 'dying-pet' : 'border-slate-700';
                
                const pensionStatus = pet.inPension 
                    ? `<div class="absolute top-3 right-3 bg-amber-500 text-white text-[9px] font-bold px-2 py-1 rounded shadow-lg uppercase tracking-wider">In Pension</div>`
                    : '';

                const pensionBtnText = pet.inPension ? '🎒 Abholen' : '🏨 Pension ($1k)';
                const pensionBtnColor = pet.inPension ? 'bg-slate-700 hover:bg-slate-600' : 'bg-amber-600 hover:bg-amber-500';
                const pensionAction = pet.inPension ? 'retrieve' : 'deposit';

                const displayHunger = pet.inPension ? 100 : pet.hunger;
                const displayBarColor = pet.inPension ? 'bg-emerald-500' : barColor;

                return `
                    <div class="glass p-5 rounded-2xl border ${dyingClass} text-center flex flex-col relative transition overflow-hidden group">
                        ${pensionStatus}
                        <div class="text-[10px] text-slate-400 font-mono uppercase tracking-wider mb-2">${pet.enclosure}</div>
                        <div class="text-5xl mb-2 drop-shadow-lg ${pet.isDying && !pet.inPension ? 'animate-bounce' : ''}">${pet.icon}</div>
                        <div class="text-xl font-bold text-white leading-tight">${pet.name}</div>
                        <div class="text-xs text-slate-400 mb-1">${pet.type}</div>
                        <div class="text-[10px] text-indigo-400 font-bold mb-4">⏳ ${pet.ageDays === 1 ? '1 Tag' : pet.ageDays + ' Tage'} alt</div>
                        
                        <div class="bg-slate-900 rounded-full h-4 mb-4 relative overflow-hidden border border-slate-700/50">
                            <div class="h-full ${displayBarColor} transition-all duration-500" style="width: ${displayHunger}%;"></div>
                            <div class="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white drop-shadow-md">
                                ${displayHunger}% ${isPlant ? 'Wasser' : 'Sättigung'}
                            </div>
                        </div>

                        <div class="mt-auto space-y-2">
                            <button class="w-full ${btnColor} text-white font-bold py-2.5 rounded-xl transition active:scale-95 shadow-md text-sm flex items-center justify-center gap-2" onclick="feedPet('${pet.id || pet._id}')" ${pet.inPension ? 'disabled style="opacity:0.5"' : ''}>
                                ${actionWord} ($15)
                            </button>
                            
                            <div class="flex gap-2">
                                <button class="flex-1 ${pensionBtnColor} text-white font-bold py-2 rounded-xl transition active:scale-95 text-xs" onclick="togglePension('${pet.id || pet._id}', '${pensionAction}')">
                                    ${pensionBtnText}
                                </button>
                                <button class="flex-1 bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 rounded-xl transition active:scale-95 text-xs flex items-center justify-center gap-1" onclick="transferPet('${pet.id || pet._id}', '${pet.name}')" ${pet.inPension ? 'disabled style="opacity:0.5"' : ''}>
                                    <span>📤</span> Transfer
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        async function feedPet(petId) {
            const res = await fetchApi(`/pets/${petId}/feed`, 'POST');
            if (!res.ok) showToast(res.error, "error");
            else { showToast(res.message, "success"); loadMyPets(); }
        }

        async function transferPet(petId, petName) {
            const target = prompt(`An wen möchtest du ${petName} übertragen?\nBitte Username des Empfängers eingeben:`);
            if (!target) return;
            if (!confirm(`Bist du absolut sicher, dass du ${petName} endgültig an ${target} abgeben möchtest?`)) return;

            const res = await fetchApi(`/pets/${petId}/transfer`, 'POST', { targetUsername: target });
            if (res.ok) {
                showToast(res.message, "success");
                loadMyPets();
            } else {
                showToast(res.error, "error");
            }
        }

        async function togglePension(petId, action) {
            const costText = action === 'deposit' ? ' Das kostet dich einmalig $1.000.' : '';
            if (!confirm(`Möchtest du das Tier ${action === 'deposit' ? 'in die Pension geben' : 'aus der Pension abholen'}?${costText}`)) return;

            const res = await fetchApi(`/pets/${petId}/pension`, 'POST', { action });
            if (res.ok) {
                showToast(res.message, "success");
                loadMyPets();
            } else {
                showToast(res.error, "error");
            }
        }

        // --- FRIEDHOF & RITUAL ---
        async function loadCemetery() {
            const data = await fetchApi('/pets/cemetery');
            const grid = document.getElementById('cemetery-grid');

            if (!data.ok) return grid.innerHTML = `<p class="col-span-full text-center text-red-500">${data.error}</p>`;
            if (!data.cemetery || data.cemetery.length === 0) {
                return grid.innerHTML = `<p class="col-span-full text-center text-slate-500 text-sm py-8 border border-dashed border-slate-700 rounded-xl">Der Friedhof ist leer. Alle Besitzer kümmern sich gut um ihre Tiere!</p>`;
            }

            grid.innerHTML = data.cemetery.map(dead => {
                const deathDateObj = new Date(dead.deathDate);
                const deathDate = deathDateObj.toLocaleDateString('de-DE');
                const ageText = dead.ageDays === 1 ? '1 Tag' : `${dead.ageDays || 0} Tage`;
                
                // --- BERECHNUNG FÜR DEN SATANSKREIS ---
                const daysDead = Math.floor((new Date() - deathDateObj) / (1000 * 60 * 60 * 24));
                const daysLeft = 14 - daysDead;
                let ritualHtml = '';

                // Prüfen ob der Betrachter der Originalbesitzer ist und die Frist nicht abgelaufen ist
                if (currentUser && currentUser.username === dead.ownerName && daysLeft > 0) {
                    ritualHtml = `
                        <div class="mt-4 pt-4 border-t border-slate-800">
                            <p class="text-[9px] text-rose-500 font-bold mb-2 uppercase tracking-widest text-center">Noch ${daysLeft} Tage bis zur völligen Auflösung</p>
                            <button onclick="performRitual('${dead.petId || dead.id || dead._id}')" class="ritual-btn w-full bg-rose-950/50 border border-rose-900 text-rose-400 hover:bg-rose-900 hover:text-white font-bold py-2 rounded-xl transition duration-300 shadow-lg text-sm flex items-center justify-center gap-2">
                                <span class="text-lg">😈</span> Satanskreis Ritual ($500 Mrd)
                            </button>
                        </div>
                    `;
                }

                return `
                    <div class="glass p-5 rounded-2xl border border-slate-800 relative ${!ritualHtml ? 'grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition duration-500' : ''}">
                        <div class="absolute top-3 right-3 bg-slate-900 text-slate-400 text-[10px] font-bold px-2 py-1 rounded border border-slate-700 shadow-sm">
                            Wurde ${ageText} alt
                        </div>
                        <div class="text-center mt-4">
                            <div class="text-5xl mb-2 opacity-50 drop-shadow-lg">🪦</div>
                            <div class="text-xl font-bold text-white line-through decoration-rose-500 decoration-2 mb-1">"${dead.petName}"</div>
                            <div class="text-xs text-slate-400 mb-3">Das geliebte ${dead.type} von <span class="text-slate-300 font-bold">${dead.ownerName}</span></div>
                            <div class="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs text-center inline-block">
                                <span class="text-rose-400 font-bold block mb-1">${dead.cause}</span>
                                <span class="text-slate-500">Gestorben am: ${deathDate}</span>
                            </div>
                        </div>
                        ${ritualHtml}
                    </div>
                `;
            }).join('');
        }

        // --- DAS DUNKLE RITUAL ---
        async function performRitual(petId) {
            if (!petId || petId === 'undefined') return showToast("Dunkle Magie fehgeschlagen: ID unbekannt", "error");
            
            if (!confirm("WARNUNG! Das dunkle Ritual kostet 500 Milliarden Dollar.\nDie Seele dieses Tieres wird zurückgezwungen und es kehrt als Zombie 🧟 zurück.\nBist du absolut sicher?")) return;

            const res = await fetchApi(`/pets/${petId}/resurrect`, 'POST');
            
            if (res.ok) {
                showToast("Das Ritual war erfolgreich. Es lebt...", "success");
                setTimeout(() => document.querySelector('.tab-btn').click(), 1500); // Zurück zu den eigenen Tieren!
            } else {
                showToast(res.error, "error");
            }
        }

        // Starten durch die init() Funktion, damit currentUser geladen wird
        window.onload = init;
    