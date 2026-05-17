
        async function fetchLogs() {
            const res = await fetch('https://api.limazon.v6.rocks/api/admin/activity-logs', { credentials: 'include' });
            const data = await res.json();
            
            if(data.error) {
                document.body.innerHTML = "<h1>Zugriff verweigert</h1>";
                return;
            }

            document.getElementById('stats').innerText = `Gesamtanzahl Logs: ${data.total}`;
            const body = document.getElementById('logBody');
            body.innerHTML = '';

            data.logs.forEach(log => {
                const tr = document.createElement('tr');
                const date = new Date(log.timestamp).toLocaleString('de-DE');
                
                // CSS Klasse für Action-Tags bestimmen
                let tagClass = "action-tag";
                if(log.action.includes('PURCHASE')) tagClass += " tag-purchase";
                if(log.action.includes('TRADE')) tagClass += " tag-trade";
                if(log.action.includes('MESSAGE')) tagClass += " tag-message";
                if(log.action.includes('LOGIN')) tagClass += " tag-login";

                tr.innerHTML = `
                    <td>${date}</td>
                    <td><strong>${log.username}</strong><br><small>${log.userId || ''}</small></td>
                    <td><span class="${tagClass}">${log.action}</span></td>
                    <td class="details-json">${JSON.stringify(log.details)}</td>
                    <td><small>${log.ip}</small></td>
                `;
                body.appendChild(tr);
            });
        }

        fetchLogs();
        setInterval(fetchLogs, 30000); // Alle 30 Sekunden aktualisieren
    