
        const API_URL = 'https://api.limazon.v6.rocks';

        // Geld formatieren
        const formatMoney = (amount) => {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2
            }).format(amount);
        };

        async function initTaxDashboard() {
            const content = document.getElementById('content-area');

            try {
                // API Anfrage (mit Credentials für Session Cookie)
                const response = await fetch(`${API_URL}/api/taxes/my-stats`, {
                    method: 'GET',
                    credentials: 'include'
                });

                if (response.status === 401) {
                    content.innerHTML = `<div class="error">Bitte logge dich erst ein, um deine Steuern zu sehen.</div>`;
                    return;
                }

                if (!response.ok) throw new Error("Netzwerkfehler");

                const data = await response.json();

                // Status Logik
                let bannerClass = data.isLiable ? 'danger' : 'safe';
                let bannerIcon = data.isLiable ? '👮' : '🛡️';
                let bannerText = data.isLiable
                    ? `ACHTUNG: Du bist steuerpflichtig!`
                    : `Du bist sicher. (Vermögen unter 100 Mio)`;

                let nextTaxColor = data.isLiable ? '#e74c3c' : '#777';

                // HTML rendern
                content.innerHTML = `
                    <div class="status-banner ${bannerClass}">
                        <span class="icon">${bannerIcon}</span>
                        <span>${bannerText}</span>
                    </div>

                    <div class="stats-grid">
                        <div class="card">
                            <div class="label">Gesamt gezahlt</div>
                            <div class="value" style="color: #2ecc71;">${formatMoney(data.totalPaid)}</div>
                            <div class="desc">Vielen Dank!</div>
                        </div>
                        <div class="card">
                            <div class="label">Nächste Schätzung</div>
                            <div class="value" style="color: ${nextTaxColor};">${formatMoney(data.estimatedNextTax)}</div>
                            <div class="desc">Fällig in max 24h</div>
                        </div>
                        <div class="card">
                            <div class="label">Steuersatz</div>
                            <div class="value">${parseFloat(data.ratePercent.toFixed(3))}%</div>
                            <div class="desc">Vermögenssteuer</div>
                        </div>
                    </div>

                    <div class="footer">
                        Die Steuer wird automatisch einmal täglich abgezogen, falls dein Kontostand 
                        über <strong>${formatMoney(data.threshold)}</strong> liegt.
                    </div>
                `;

            } catch (error) {
                console.error(error);
                content.innerHTML = `<div class="error">Fehler beim Laden der Daten. Ist der Server erreichbar?</div>`;
            }
        }

        // Starten
        initTaxDashboard();
    