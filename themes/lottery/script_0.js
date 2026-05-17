
        async function loadStatus() {
            const res = await fetch('https://api.limazon.v6.rocks/api/lottery/status', { credentials: 'include' });
            const data = await res.json();
            document.getElementById('potDisplay').innerText = '$' + data.pot.toLocaleString();
            document.getElementById('myTickets').innerText = data.myTickets;
            document.getElementById('totalTickets').innerText = data.totalTickets;
        }

        async function buyTickets() {
            const input = document.getElementById('ticketCount');
            const count = parseInt(input.value);

            if (isNaN(count) || count <= 0) {
                alert("Bitte eine gültige Anzahl eingeben.");
                return;
            }

            try {
                const res = await fetch('https://api.limazon.v6.rocks/api/lottery/buy', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ count: count }) // Schickt die Anzahl mit
                });

                const data = await res.json();

                if (data.error) {
                    alert(data.error);
                } else {
                    // Erfolg-Feedback
                    alert(data.message);
                    loadStatus(); // Aktualisiert die Anzeige der eigenen Lose und den Pot
                }
            } catch (e) {
                alert("Netzwerkfehler beim Loskauf.");
            }
        }

        loadStatus();
        setInterval(loadStatus, 30000); // Auto-Update alle 30 Sek
    