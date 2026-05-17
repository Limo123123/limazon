
        const API_URL = 'https://api.limazon.v6.rocks/api/admin/engine';
        let currentData = [];

        async function loadData() {
            const collection = document.getElementById('colSelect').value;
            const searchTerm = document.getElementById('searchInput').value;
            const body = document.getElementById('tableBody');
            const head = document.getElementById('tableHeader');

            body.innerHTML = '<tr><td>Lade...</td></tr>';

            // Filter bauen: Wenn ein Suchwort da ist, suchen wir in gängigen Feldern
            let filter = {};
            if (searchTerm) {
                filter = {
                    $or: [
                        { username: { $regex: searchTerm, $options: 'i' } },
                        { name: { $regex: searchTerm, $options: 'i' } },
                        { id: searchTerm.match(/^\d+$/) ? parseInt(searchTerm) : searchTerm }
                    ]
                };
            }

            try {
                const res = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ mode: 'db', collection, operation: 'find', filter, payload: 100 })
                });
                const data = await res.json();
                
                if (!data.success) throw new Error(data.error);
                
                currentData = data.result;
                renderTable(currentData);
            } catch (e) {
                body.innerHTML = `<tr><td style="color:red">Fehler: ${e.message}</td></tr>`;
            }
        }

        function renderTable(data) {
            const head = document.getElementById('tableHeader');
            const body = document.getElementById('tableBody');
            head.innerHTML = '';
            body.innerHTML = '';

            if (data.length === 0) {
                body.innerHTML = '<tr><td>Keine Einträge gefunden.</td></tr>';
                return;
            }

            // Header generieren (aus den Keys des ersten Objekts)
            const keys = ['_id', ...Object.keys(data[0]).filter(k => k !== '_id')];
            keys.push('AKTIONEN');
            
            keys.forEach(k => {
                const th = document.createElement('th');
                th.innerText = k;
                head.appendChild(th);
            });

            // Zeilen generieren
            data.forEach((row, index) => {
                const tr = document.createElement('tr');
                keys.forEach(k => {
                    const td = document.createElement('td');
                    if (k === 'AKTIONEN') {
                        td.innerHTML = `
                            <button onclick="openEditModal(${index})">Edit</button>
                            <button class="danger" onclick="deleteEntry('${row._id}')">X</button>
                        `;
                    } else {
                        const val = row[k];
                        td.innerText = typeof val === 'object' ? JSON.stringify(val) : val;
                        td.title = td.innerText; // Tooltip für lange Texte
                    }
                    tr.appendChild(td);
                });
                body.appendChild(tr);
            });
        }

        // --- MODAL LOGIK ---
        function openEditModal(index) {
            const modal = document.getElementById('editModal');
            const area = document.getElementById('jsonEdit');
            const title = document.getElementById('modalTitle');
            
            if (index !== null) {
                area.value = JSON.stringify(currentData[index], null, 4);
                title.innerText = "Eintrag bearbeiten";
            } else {
                area.value = '{\n    "name": "Neu"\n}';
                title.innerText = "Neuen Eintrag erstellen";
            }
            modal.style.display = 'flex';
        }

        function closeModal() {
            document.getElementById('editModal').style.display = 'none';
        }

        async function saveEntry() {
            const collection = document.getElementById('colSelect').value;
            const json = JSON.parse(document.getElementById('jsonEdit').value);
            const isUpdate = !!json._id;

            const operation = isUpdate ? 'updateOne' : 'insertOne';
            const filter = isUpdate ? { _id: json._id } : {};
            
            // Payload vorbereiten (bei Update das $set nutzen)
            const payload = isUpdate ? { $set: json } : json;
            if (isUpdate) delete json._id; // _id darf nicht im $set stehen

            try {
                const res = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ mode: 'db', collection, operation, filter, payload })
                });
                const result = await res.json();
                if (result.success) {
                    alert("Erfolgreich gespeichert!");
                    closeModal();
                    loadData();
                } else { alert("Fehler: " + result.error); }
            } catch (e) { alert("Netzwerkfehler"); }
        }

        async function deleteEntry(id) {
            if (!confirm("Wirklich löschen? Das ist endgültig!")) return;
            const collection = document.getElementById('colSelect').value;

            try {
                await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ mode: 'db', collection, operation: 'deleteOne', filter: { _id: id } })
                });
                loadData();
            } catch (e) { alert("Fehler beim Löschen"); }
        }
    