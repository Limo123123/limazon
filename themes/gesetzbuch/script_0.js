
        let sealClickCount = 0;
        let sealTimeout;

        function triggerSealRitual() {
            sealClickCount++;
            
            // Wenn man aufhört zu klicken, setzt sich der Zähler nach 2 Sekunden zurück
            clearTimeout(sealTimeout);
            sealTimeout = setTimeout(() => { sealClickCount = 0; }, 2000);

            if (sealClickCount === 5) {
                const darkLaw = document.getElementById('secret-law-666');
                
                // Falls es schon offen ist, nichts tun
                if (!darkLaw.classList.contains('hidden')) return;

                // Screen wackeln lassen
                document.body.classList.add('shake-screen');
                setTimeout(() => document.body.classList.remove('shake-screen'), 500);

                // Das dunkle Gesetz sichtbar machen
                darkLaw.classList.remove('hidden');
                
                // Kurze Verzögerung für den Fade-In Effekt
                setTimeout(() => {
                    darkLaw.classList.remove('opacity-0');
                }, 50);

                // Reset Klicks
                sealClickCount = 0;
            }
        }
    