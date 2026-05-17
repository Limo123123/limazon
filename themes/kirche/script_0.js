
        const API_URL = 'https://api.limazon.v6.rocks'; // Deine URL anpassen falls nötig

        // Lädt den aktuellen Spendenstand
        async function loadFund() {
            try {
                const res = await fetch(`${API_URL}/api/system/church`, { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    document.getElementById('current-fund').innerText = '$ ' + data.balance.toLocaleString('de-DE');
                }
            } catch (e) {}
        }

        // Spenden Funktion
        async function donate() {
            const amount = parseInt(document.getElementById('donation-amount').value);
            const msg = document.getElementById('donation-msg');
            
            if (!amount || amount <= 0) return;

            try {
                const res = await fetch(`${API_URL}/api/system/donate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount }),
                    credentials: 'include'
                });

                const data = await res.json();

                if (res.ok) {
                    msg.innerText = `DEIN OPFER WURDE ANGENOMMEN. (-$${amount.toLocaleString()})`;
                    msg.className = "mt-4 text-xs font-bold text-green-500 block";
                    document.getElementById('donation-amount').value = '';
                    loadFund(); // Anzeige updaten
                } else {
                    msg.innerText = data.error || "DAS SYSTEM VERWEIGERT DEIN OPFER.";
                    msg.className = "mt-4 text-xs font-bold text-red-500 block";
                }
            } catch (e) {
                msg.innerText = "Verbindungsabbruch zur geistigen Welt.";
                msg.className = "mt-4 text-xs font-bold text-red-500 block";
            }
        }

        // Beim Start laden
        document.addEventListener('DOMContentLoaded', loadFund);
    