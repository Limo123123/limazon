
        const API_BASE = 'https://api.limazon.v6.rocks/api';
        const fetchOpts = { credentials: 'include', headers: { 'Content-Type': 'application/json' } };

        // 1. Eigene Tiere für das Dropdown laden
        async function loadMyPetsForDropdown() {
            const select = document.getElementById('pet-select');
            try {
                const res = await fetch(`${API_BASE}/pets/my`, fetchOpts);
                const { pets } = await res.json();

                if (!pets || pets.length === 0) {
                    select.innerHTML = '<option value="">Du besitzt keine Tiere.</option>';
                    select.disabled = true;
                    return;
                }

                select.innerHTML = '<option value="">-- Wähle ein Tier aus --</option>';
                pets.forEach(pet => {
                    const status = pet.isDying ? ' (Sehr Hungrig!)' : ` (${pet.hunger}% Satt)`;
                    select.innerHTML += `<option value="${pet.id}">${pet.icon} ${pet.name} ${status}</option>`;
                });
                select.disabled = false;
            } catch (e) {
                select.innerHTML = '<option value="">Fehler beim Laden.</option>';
            }
        }

        // 2. Tier in den Park schicken
        async function sendToPark() {
            const petId = document.getElementById('pet-select').value;
            if (!petId) return alert("Bitte wähle zuerst ein Tier aus!");

            try {
                const resEquip = await fetch(`${API_BASE}/pets/equip`, { ...fetchOpts, method: 'POST', body: JSON.stringify({ petId }) });
                if (!resEquip.ok) return alert("Fehler beim Ausrüsten des Tiers.");

                const resToggle = await fetch(`${API_BASE}/park/toggle`, { ...fetchOpts, method: 'POST' });
                const data = await resToggle.json();
                
                if(resToggle.ok) {
                    alert("Erfolg: Dein Tier ist jetzt auf der Wiese!");
                    loadPark(); 
                } else alert(data.error);
            } catch (e) { alert("Verbindung fehlgeschlagen."); }
        }

        // 3. Tier zurückholen
        async function callHome() {
            try {
                const res = await fetch(`${API_BASE}/park/toggle`, { ...fetchOpts, method: 'POST' });
                const data = await res.json();
                
                if(res.ok) {
                    if (data.inPark === true) {
                        await fetch(`${API_BASE}/park/toggle`, { ...fetchOpts, method: 'POST' });
                    }
                    alert("Dein Tier wurde nach Hause geholt!");
                    loadPark();
                } else alert(data.error);
            } catch (e) { alert("Fehler beim Zurückrufen."); }
        }

        // 4. Die Wiese laden
        async function loadPark() {
            const wiese = document.getElementById('park-wiese');
            try {
                const res = await fetch(`${API_BASE}/park/pets`, fetchOpts);
                const pets = await res.json();

                if (pets.length === 0) {
                    wiese.innerHTML = '<p class="text-green-900 font-bold text-center">Der Park ist leer.<br><span class="text-sm font-normal opacity-80">Schick ein Tier rein!</span></p>';
                    return;
                }

                wiese.innerHTML = '';
                pets.forEach(p => {
                    // Zufälliges Delay für die Float-Animation, damit sie nicht synchron hüpfen
                    const delay = (Math.random() * 2).toFixed(2);
                    
                    wiese.innerHTML += `
                        <div class="bg-white/95 text-slate-900 p-3 rounded-2xl text-center w-24 shadow-xl border-b-4 border-slate-300 animate-float" style="animation-delay: ${delay}s">
                            <span class="text-4xl block mb-1 drop-shadow-md">${p.petIcon}</span>
                            <div class="text-[11px] font-bold truncate leading-tight">${p.petName}</div>
                            <div class="text-[9px] text-slate-500 truncate uppercase tracking-wider mt-1">${p.username}</div>
                        </div>
                    `;
                });
            } catch (e) {
                wiese.innerHTML = '<p class="text-red-800 font-bold">Störung im Park.</p>';
            }
        }

        // 5. Zufalls-Event auslösen
        async function observeAnimals(isAuto = false) {
            const log = document.getElementById('event-log');
            try {
                const res = await fetch(`${API_BASE}/park/interact`, { ...fetchOpts, method: 'POST' });
                const data = await res.json();
                
                if(res.ok) {
                    if(data.message.includes("komplett leer") && isAuto) return;
                    if(log.innerHTML.includes("Warte auf Ereignisse")) log.innerHTML = '';

                    const entry = document.createElement('div');
                    entry.className = 'border-b border-slate-800/50 pb-3 flex gap-3 items-start animate-[fadeIn_0.3s_ease-out]';
                    entry.innerHTML = `
                        <span class="text-2xl mt-1">${data.icon || '🐾'}</span>
                        <div>
                            <span class="text-emerald-400 text-[10px] font-bold tracking-wider">[${new Date().toLocaleTimeString()}]</span>
                            <p class="text-slate-300 mt-0.5 leading-snug">${data.message}</p>
                        </div>
                    `;
                    
                    log.prepend(entry);
                    loadPark(); 
                } else {
                    if(!isAuto) alert(data.error); 
                }
            } catch (e) { 
                if(!isAuto) alert("Du konntest nichts erkennen."); 
            }
        }

        // Start-Logik mit Random-Events
        window.onload = () => {
            loadMyPetsForDropdown();
            loadPark();
            
            // Live-Wiese alle 10 Sek. aktualisieren
            setInterval(loadPark, 10000); 

            // Automatischer Event-Generator (alle 30s)
            setInterval(() => {
                if (Math.random() > 0.5) observeAnimals(true);
            }, 30000);
        };
    