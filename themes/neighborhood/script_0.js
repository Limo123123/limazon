
        const BACKEND_URL = 'https://api.limazon.v6.rocks'; 

        async function loadNeighborhood() {
            try {
                const res = await fetch(`${BACKEND_URL}/api/realestate/neighborhood`, { credentials: 'include' });
                const data = await res.json();

                const container = document.getElementById('house-list');
                
                if (data.error) {
                    container.innerHTML = `<div style="color:red;">${data.error}</div>`;
                    return;
                }

                if (data.neighborhood.length === 0) {
                    container.innerHTML = `<div style="color:#aaa;">Niemand hat ein Haus gebaut. Die Straßen sind leer.</div>`;
                    return;
                }

                container.innerHTML = data.neighborhood.map(h => `
                    <div class="house-card">
                        <div class="house-icon">${h.icon}</div>
                        <div class="house-title">${h.name}</div>
                        <div class="house-owner">Eigentümer: <b>${h.ownerName}</b><br>(${h.roommatesCount} Mitbewohner)</div>
                        <button class="visit-btn" onclick="visitHouse('${h.id}')">🔔 Klingeln</button>
                    </div>
                `).join('');

            } catch (err) {
                console.error(err);
            }
        }

        function visitHouse(houseId) {
            // Leitet weiter auf die Limea HTML und gibt die Haus-ID mit
            window.location.href = `/themes/limea.html?visit=${houseId}`;
        }

        window.onload = loadNeighborhood;
    