
        const API_URL = 'https://api.limazon.v6.rocks';
        let currentAdLink = "";

        window.onload = function () {
            if (!localStorage.getItem('limazon_consent_2026')) {
                document.getElementById('cookieOverlay').classList.remove('hidden');
            }
            checkActiveStrikes();
            loadAd(); 
        };

        function acceptCookies() {
            localStorage.setItem('limazon_consent_2026', 'true');
            document.getElementById('cookieOverlay').classList.add('hidden');
        }

        function nav(url) { window.location.href = url; }

        function filterApps() {
            const input = document.getElementById('searchInput').value.toLowerCase();
            const cards = document.querySelectorAll('.theme-card');
            cards.forEach(card => {
                const tags = card.getAttribute('data-tags') || "";
                const title = card.querySelector('h3').innerText.toLowerCase();
                card.style.display = (tags.includes(input) || title.includes(input)) ? 'block' : 'none';
            });
        }

        async function checkActiveStrikes() {
            try {
                const res = await fetch(`${API_URL}/api/strikes/public`);
                if (!res.ok) return;

                const data = await res.json();
                if (!data.strikes || data.strikes.length === 0) return;

                data.strikes.forEach(strike => {
                    const card = document.querySelector(`[data-module="${strike.module}"]`);
                    if (card) {
                        card.classList.add('strike-active-card');
                        const banner = document.createElement('div');
                        banner.className = 'strike-label';
                        banner.innerHTML = 'STREIK';
                        card.appendChild(banner);
                    }
                });
            } catch (e) {
                console.log("Streik-Status nicht verfügbar.");
            }
        }

        // NEU: Die Funktion, um das Werbebanner zu laden (Mit Login-Prüfung!)
        async function loadAd() {
            try {
                const res = await fetch(`${API_URL}/api/ads/random`, { credentials: 'include' });
                if (res.ok) {
                    const data = await res.json();
                    
                    // Wenn der Server sagt, der User ist werbefrei (Limazon Prime)
                    if (data.isAdFree) {
                        console.log("User hat Limazon Prime. Werbung wird geblockt.");
                        return;
                    }
                    
                    if (data.ad) {
                        const banner = document.getElementById('ad-banner');
                        document.getElementById('ad-icon').textContent = data.ad.icon;
                        document.getElementById('ad-title').textContent = data.ad.title;
                        document.getElementById('ad-text').textContent = data.ad.text;
                        currentAdLink = data.ad.link;
                        
                        banner.classList.remove('hidden');
                    }
                }
            } catch (e) {
                console.log("Werbe-Server nicht erreichbar oder durch Adblocker blockiert.");
            }
        }

        function closeAd(event) {
            event.stopPropagation(); // WICHTIG: Verhindert, dass der Klick auf das "X" auch die Werbung öffnet
            document.getElementById('ad-banner').style.display = 'none';
        }

        function navToAd() {
            if(currentAdLink) nav(currentAdLink);
        }
    