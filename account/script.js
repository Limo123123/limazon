document.addEventListener('DOMContentLoaded', () => {
    // Globale Referenzen zu DOM-Elementen
    const elements = {
        username: document.getElementById('username-display'),
        userId: document.getElementById('userid-display'),
        shareCode: document.getElementById('sharecode-display'),
        balance: document.getElementById('balance-display'),
        tokens: document.getElementById('tokens-display'),
        createdAt: document.getElementById('createdat-display'),
        status: document.getElementById('status-display'),
        
        specialSettingsCard: document.getElementById('special-settings-card'),
        infinityMoneyToggle: document.getElementById('infinity-money-toggle'),

        deleteBtn: document.getElementById('delete-account-btn'),
        deleteModal: document.getElementById('delete-confirm-modal'),
        closeModalBtn: document.getElementById('close-modal-btn'),
        modalUsernameConfirm: document.getElementById('modal-username-confirm'),
        deleteConfirmInput: document.getElementById('delete-confirm-input'),
        finalDeleteBtn: document.getElementById('final-delete-btn'),
        
        notification: document.getElementById('notification'),
    };

    let currentUser = null;
    // Die Basis-URL deiner API. Ändere dies, falls dein Backend woanders läuft.
    const API_BASE_URL = 'https://api.limazon.v6.rocks'; // z.B. 'https://deine-api-url.com'

    // --- DATENABRUF UND ANZEIGE ---

    async function fetchUserData() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/me`, { credentials: 'include' });
            if (!response.ok) {
                if (response.status === 401) {
                    // Nicht eingeloggt, Weiterleitung zur Login-Seite
                    window.location.href = '/login.html'; // Passe den Pfad bei Bedarf an
                }
                throw new Error('Benutzerdaten konnten nicht geladen werden.');
            }
            const data = await response.json();
            currentUser = data; // Benutzerdaten global speichern
            populateAccountInfo(data);
            fetchShareCode(); // Separater Aufruf für den Share-Code
            setupEventListeners();
        } catch (error) {
            showNotification(error.message, 'error');
            console.error('Fehler beim Abrufen der Benutzerdaten:', error);
        }
    }

    function populateAccountInfo(user) {
        elements.username.textContent = user.username;
        elements.userId.textContent = user.userId;
        elements.balance.textContent = `$${user.balance.toFixed(2)}`;
        elements.tokens.textContent = user.tokens;
        // Das Erstellungsdatum ist nicht direkt im /me Endpoint, aber wir können es aus dem User-Objekt der DB annehmen
        elements.createdAt.textContent = user.createdAt ? new Date(user.createdAt).toLocaleDateString('de-DE') : 'N/A';
        elements.status.textContent = user.isAdmin ? 'Administrator' : 'Benutzer';
        
        // "Infinity Money"-Einstellung anzeigen, wenn freigeschaltet oder Admin
        if (user.unlockedInfinityMoney || user.isAdmin) {
            elements.specialSettingsCard.style.display = 'block';
            elements.infinityMoneyToggle.checked = user.infinityMoney;
        }

        // Für das Lösch-Modal den Usernamen setzen
        elements.modalUsernameConfirm.textContent = user.username;
    }

    async function fetchShareCode() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/chat/me/sharecode`, { credentials: 'include' });
            if (!response.ok) throw new Error('Share-Code nicht abrufbar.');
            const data = await response.json();
            elements.shareCode.textContent = data.userShareCode || 'Nicht gefunden';
        } catch (error) {
            elements.shareCode.textContent = 'Fehler beim Laden';
            console.error('Fehler beim Abrufen des Share-Codes:', error);
        }
    }

    // --- EVENT LISTENERS ---

    function setupEventListeners() {
        // Event Listener für Infinity Money Toggle
        elements.infinityMoneyToggle.addEventListener('change', handleInfinityMoneyToggle);
        
        // Event Listener für den Account-Löschen-Workflow
        elements.deleteBtn.addEventListener('click', () => {
             // Da das Backend-Feature fehlt, können wir hier schon abbrechen
            showNotification('Account-Löschung ist serverseitig noch nicht implementiert.', 'error');
            // Ansonsten würde das Modal hier geöffnet:
            // elements.deleteModal.style.display = 'flex';
        });

        elements.closeModalBtn.addEventListener('click', () => {
            elements.deleteModal.style.display = 'none';
        });
        
        elements.deleteConfirmInput.addEventListener('input', () => {
            const isMatch = elements.deleteConfirmInput.value === currentUser.username;
            elements.finalDeleteBtn.disabled = !isMatch;
        });

        // WICHTIG: Dieser Button ist absichtlich ohne Funktion, da der Backend-Endpoint fehlt.
        elements.finalDeleteBtn.addEventListener('click', handleAccountDeletion);
    }
    
    // --- AKTIONEN ---
    
    async function handleInfinityMoneyToggle(event) {
        const isEnabled = event.target.checked;
        try {
            const response = await fetch(`${API_BASE_URL}/api/account/settings`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ infinityMoney: isEnabled })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Fehler beim Speichern der Einstellung.');
            }
            
            showNotification('Einstellung erfolgreich gespeichert!', 'success');
            currentUser.infinityMoney = isEnabled; // Lokalen User-State aktualisieren
            
        } catch (error) {
            showNotification(error.message, 'error');
            // Toggle auf den alten Wert zurücksetzen
            event.target.checked = !isEnabled;
        }
    }

    async function handleAccountDeletion() {
        // Diese Funktion wird erst aktiv, wenn du den Backend-Endpoint erstellst.
        showNotification('Diese Funktion ist noch nicht implementiert.', 'error');
        elements.finalDeleteBtn.disabled = true; // Button wieder deaktivieren

        
        
        try {
            const response = await fetch(`${API_BASE_URL}/api/account`, { // Beispiel-URL
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ password: 'HIER MUSS EVENTUELL DAS PASSWORT ZUR BESTÄTIGUNG HIN' })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Account konnte nicht gelöscht werden.');
            }
            
            showNotification('Account wurde erfolgreich gelöscht. Du wirst ausgeloggt.', 'success');
            setTimeout(() => {
                // Logout durchführen und zur Startseite weiterleiten
                fetch(`${API_BASE_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' })
                    .finally(() => window.location.href = '/');
            }, 3000);

        } catch (error) {
            showNotification(error.message, 'error');
            elements.deleteModal.style.display = 'none'; // Modal bei Fehler schließen
        }
    }

    // --- HILFSFUNKTIONEN ---

    let notificationTimeout;
    function showNotification(message, type = 'info') {
        clearTimeout(notificationTimeout);
        elements.notification.textContent = message;
        elements.notification.className = `notification show ${type}`;
        notificationTimeout = setTimeout(() => {
            elements.notification.classList.remove('show');
        }, 4000);
    }

    // --- INITIALISIERUNG ---
    fetchUserData();
});