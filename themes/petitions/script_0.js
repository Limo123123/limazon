
        const API_URL = 'https://api.limazon.v6.rocks';
        let currentUser = null;

        // Init
        checkAuth();

        async function checkAuth() {
            try {
                const res = await fetch(API_URL + '/api/auth/me', { credentials: 'include' });
                if (res.ok) {
                    currentUser = await res.json();
                    
                    // Admin UI freischalten
                    if (currentUser.isAdmin || currentUser.isRealAdmin) {
                        document.getElementById('btn-admin-config').classList.remove('hidden');
                    }

                    loadPetitions();
                } else {
                    alert("Bitte logge dich zuerst bei Limazon ein!");
                    window.location.href = '/'; // Oder wo auch immer dein Login ist
                }
            } catch (e) { 
                console.error("Auth Error", e);
            }
        }

        async function loadPetitions() {
            const listEl = document.getElementById('petitions-list');
            try {
                const res = await fetch(API_URL + '/api/petitions', { credentials: 'include' });
                const data = await res.json();

                if (!res.ok) throw new Error(data.error);

                if (data.petitions.length === 0) {
                    listEl.innerHTML = `
                        <div class="glass p-8 rounded-xl text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                            <span class="text-4xl mb-2">🌬️</span>
                            <p class="font-bold">Alles ruhig.</p>
                            <p class="text-xs">Aktuell gibt es keine Beschwerden oder Forderungen vom Volk.</p>
                        </div>`;
                    return;
                }

                listEl.innerHTML = '';
                
                data.petitions.forEach(pet => {
                    const isSuccessful = pet.status === 'successful';
                    const hasSigned = pet.signatures.includes(currentUser.userId);
                    const progressPercent = Math.min((pet.signatures.length / pet.requiredSignatures) * 100, 100);
                    
                    const statusBadge = isSuccessful 
                        ? `<span class="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] uppercase font-bold px-2 py-0.5 rounded">Angenommen</span>`
                        : `<span class="bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] uppercase font-bold px-2 py-0.5 rounded">Aktiv</span>`;

                    let buttonHtml = '';
                    if (isSuccessful) {
                        buttonHtml = `<button disabled class="w-full py-3 rounded-xl font-bold text-sm bg-slate-800 text-slate-500 cursor-not-allowed">Bereits weitergeleitet</button>`;
                    } else if (hasSigned) {
                        buttonHtml = `<button disabled class="w-full py-3 rounded-xl font-bold text-sm bg-indigo-900/50 text-indigo-300 border border-indigo-500/30 cursor-not-allowed">✓ Von dir unterschrieben</button>`;
                    } else {
                        buttonHtml = `<button onclick="signPetition('${pet._id}')" class="w-full py-3 rounded-xl font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95 transition shadow-lg shadow-indigo-500/20">Jetzt unterschreiben ✍️</button>`;
                    }

                    // Delete Button nur für Admins
                    let adminHtml = '';
                    if (currentUser.isAdmin || currentUser.isRealAdmin) {
                        adminHtml = `
                            <button onclick="deletePetition('${pet._id}')" class="absolute top-4 right-4 text-slate-500 hover:text-red-400 transition" title="Löschen">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            </button>`;
                    }

                    listEl.innerHTML += `
                        <div class="glass rounded-2xl p-5 relative overflow-hidden">
                            ${adminHtml}
                            <div class="flex items-center gap-2 mb-2">
                                ${statusBadge}
                                <span class="text-xs text-slate-400">von ${pet.creatorUsername}</span>
                            </div>
                            <h4 class="font-bold text-lg text-white mb-2 pr-6">${pet.title}</h4>
                            <p class="text-sm text-slate-300 mb-5 leading-relaxed bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">${pet.description}</p>
                            
                            <div class="mb-4">
                                <div class="flex justify-between text-xs font-bold mb-1">
                                    <span class="text-indigo-300">${pet.signatures.length} Unterschriften</span>
                                    <span class="text-slate-400">Ziel: ${pet.requiredSignatures}</span>
                                </div>
                                <div class="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                                    <div class="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full progress-bar" style="width: ${progressPercent}%"></div>
                                </div>
                            </div>

                            ${buttonHtml}
                        </div>
                    `;
                });

            } catch (err) {
                listEl.innerHTML = `<div class="text-red-500 text-center text-sm bg-red-500/10 p-4 rounded-xl">${err.message || 'Verbindungsfehler'}</div>`;
            }
        }

        async function signPetition(id) {
            try {
                const res = await fetch(`${API_URL}/api/petitions/${id}/sign`, {
                    method: 'POST',
                    credentials: 'include'
                });
                const data = await res.json();
                
                if (res.ok) {
                    alert(data.message);
                    loadPetitions();
                } else {
                    alert("Fehler: " + data.error);
                }
            } catch (e) {
                alert("Verbindungsfehler beim Unterschreiben.");
            }
        }

        async function submitPetition(e) {
            e.preventDefault();
            const btn = document.getElementById('btn-submit-pet');
            const title = document.getElementById('pet-title').value;
            const desc = document.getElementById('pet-desc').value;

            btn.disabled = true; btn.innerText = "Sende...";
            
            try {
                const res = await fetch(`${API_URL}/api/petitions/create`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, description: desc }),
                    credentials: 'include'
                });
                const data = await res.json();
                
                if (res.ok) {
                    alert(data.message);
                    closeModal('create-modal');
                    e.target.reset();
                    loadPetitions();
                } else {
                    alert("Fehler: " + data.error);
                }
            } catch (err) {
                alert("Verbindungsfehler.");
            } finally {
                btn.disabled = false; btn.innerText = "Einreichen";
            }
        }

        async function deletePetition(id) {
            if (!confirm("Soll diese Petition wirklich unwiderruflich gelöscht werden?")) return;

            try {
                const res = await fetch(`${API_URL}/api/admin/petitions/${id}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });
                const data = await res.json();
                
                if (res.ok) {
                    loadPetitions();
                } else {
                    alert("Fehler: " + data.error);
                }
            } catch (e) {
                alert("Verbindungsfehler beim Löschen.");
            }
        }

        async function submitAdminConfig(e) {
            e.preventDefault();
            const btn = document.getElementById('btn-submit-config');
            const requiredSignatures = document.getElementById('admin-req-sigs').value;

            btn.disabled = true; btn.innerText = "Speichere...";
            
            try {
                const res = await fetch(`${API_URL}/api/admin/petitions/config`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ requiredSignatures }),
                    credentials: 'include'
                });
                const data = await res.json();
                
                if (res.ok) {
                    alert(data.message);
                    closeModal('admin-modal');
                } else {
                    alert("Fehler: " + data.error);
                }
            } catch (err) {
                alert("Verbindungsfehler.");
            } finally {
                btn.disabled = false; btn.innerText = "Speichern";
            }
        }

        // Modals
        function openCreateModal() { document.getElementById('create-modal').classList.remove('hidden'); }
        function openAdminModal() { document.getElementById('admin-modal').classList.remove('hidden'); }
        function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
    