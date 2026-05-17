
        function navigateToApp(appUrl) {
            // Einfache Weiterleitung zur gewählten App/Seite
            console.log("Navigiere zu: " + appUrl);
            window.location.href = appUrl;

            // Optional: Wenn du Theme-Präferenzen zwischenspeichern wolltest,
            // könntest du das hier tun, bevor du weiterleitest.
            // Für diese Struktur ist es aber wahrscheinlich nicht nötig, da jede "App"
            // ihr eigenes Theming oder ihre eigene Theme-Auswahl (wie bei wheels.html) haben kann.
            // localStorage.setItem('lastSelectedApp', appUrl);
        }
    