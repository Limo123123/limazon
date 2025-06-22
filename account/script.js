document.addEventListener('DOMContentLoaded', () => {
    // Globale Referenzen zu DOM-Elementen
    const elements = {
        // Account-Info
        username: document.getElementById('username-display'),
        userId: document.getElementById('userid-display'),
        shareCode: document.getElementById('sharecode-display'),
        balance: document.getElementById('balance-display'),
        tokens: document.getElementById('tokens-display'),
        createdAt: document.getElementById('createdat-display'),
        status: document.getElementById('status-display'),

        // Sicherheitseinstellungen (NEU)
        newUsernameInput: document.getElementById('new-username'),
        changeUsernameBtn: document.getElementById('change-username-btn'),
        currentPasswordInput: document.getElementById('current-password'),
        newPasswordInput: document.getElementById('new-password'),
        confirmPasswordInput: document.getElementById('confirm-password'),
        changePasswordBtn: document.getElementById('change-password-btn'),

        // Spezial-Einstellungen
        specialSettingsCard: document.getElementById('special-settings-card'),
        infinityMoneyToggle: document.getElementById('infinity-money-toggle'),

        // Account-Löschung
        deleteBtn: document.getElementById('delete-account-btn'),
        deleteModal: document.getElementById('delete-confirm-modal'),
        closeModalBtn: document.getElementById('close-modal-btn'),
        modalUsernameConfirm: document.getElementById('modal-username-confirm'),
        deleteConfirmInput: document.getElementById('delete-confirm-input'),
        finalDeleteBtn: document.getElementById('final-delete-btn'),

        // Benachrichtigung
        notification: document.getElementById('notification'),
    };

    let currentUser = null;
    const API_BASE_URL = 'https://api.limazon.v6.rocks';

    // --- DATENABRUF UND ANZEIGE ---

    async function fetchUserData() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/me`, { credentials: 'include' });
            if (!response.ok) {
                if (response.status === 401) window.location.href = '/login.html';
                throw new Error('Benutzerdaten konnten nicht geladen werden.');
            }
            const data = await response.json();
            currentUser = data;
            populateAccountInfo(data);
            fetchShareCode();
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
        elements.createdAt.textContent = user.createdAt ? new Date(user.createdAt).toLocaleDateString('de-DE') : 'N/A';
        elements.status.textContent = user.isAdmin ? 'Administrator' : 'Benutzer';

        if (user.unlockedInfinityMoney || user.isAdmin) {
            elements.specialSettingsCard.style.display = 'block';
            elements.infinityMoneyToggle.checked = user.infinityMoney;
        }

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
        // NEU: Listener für Sicherheitseinstellungen
        elements.changeUsernameBtn.addEventListener('click', handleChangeUsername);
        elements.changePasswordBtn.addEventListener('click', handleChangePassword);

        // Listener für Infinity Money
        elements.infinityMoneyToggle.addEventListener('change', handleInfinityMoneyToggle);

        // Listener für Account-Löschung
        elements.deleteBtn.addEventListener('click', () => {
            elements.deleteModal.style.display = 'flex';
        });
        elements.closeModalBtn.addEventListener('click', () => {
            elements.deleteModal.style.display = 'none';
        });
        elements.deleteConfirmInput.addEventListener('input', () => {
            elements.finalDeleteBtn.disabled = elements.deleteConfirmInput.value !== currentUser.username;
        });
        elements.finalDeleteBtn.addEventListener('click', handleAccountDeletion);
    }

    // --- AKTIONEN ---

    // NEU: Funktion zum Ändern des Benutzernamens
    async function handleChangeUsername() {
        const newUsername = elements.newUsernameInput.value.trim();
        if (newUsername.length < 3) {
            showNotification('Der neue Benutzername muss mindestens 3 Zeichen lang sein.', 'error');
            return;
        }

        // Da kein Passwortfeld im HTML ist, fragen wir es per Prompt ab.
        const password = prompt('Bitte gib dein AKTUELLES Passwort ein, um die Änderung zu bestätigen:');
        if (!password) {
            showNotification('Aktion abgebrochen. Kein Passwort eingegeben.', 'info');
            return; // Benutzer hat Abbrechen gedrückt
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/account/username`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ newUsername, password })
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Unbekannter Fehler');
            }
            showNotification('Benutzername erfolgreich geändert! Die Seite wird neu geladen.', 'success');
            setTimeout(() => window.location.reload(), 2000); // Reload, um den neuen Namen überall anzuzeigen
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }

    // NEU: Funktion zum Ändern des Passworts
    async function handleChangePassword() {
        const currentPassword = elements.currentPasswordInput.value;
        const newPassword = elements.newPasswordInput.value;
        const confirmPassword = elements.confirmPasswordInput.value;

        // Client-seitige Validierung
        if (!currentPassword || !newPassword || !confirmPassword) {
            return showNotification('Bitte alle Passwortfelder ausfüllen.', 'error');
        }
        if (newPassword.length < 6) {
            return showNotification('Das neue Passwort muss mindestens 6 Zeichen haben.', 'error');
        }
        if (newPassword !== confirmPassword) {
            return showNotification('Die neuen Passwörter stimmen nicht überein.', 'error');
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/account/password`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ currentPassword, newPassword })
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Unbekannter Fehler');
            }
            showNotification('Passwort erfolgreich geändert!', 'success');
            // Felder leeren für die Sicherheit
            elements.currentPasswordInput.value = '';
            elements.newPasswordInput.value = '';
            elements.confirmPasswordInput.value = '';
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }

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
            if (!response.ok) throw new Error(result.error || 'Fehler beim Speichern.');

            showNotification('Einstellung erfolgreich gespeichert!', 'success');
            currentUser.infinityMoney = isEnabled;
        } catch (error) {
            showNotification(error.message, 'error');
            event.target.checked = !isEnabled; // Zurücksetzen
        }
    }

    async function handleAccountDeletion() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/account`, {
                method: 'DELETE',
                credentials: 'include'
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Account konnte nicht gelöscht werden.');

            showNotification('Account wurde gelöscht. Du wirst ausgeloggt.', 'success');
            setTimeout(() => {
                fetch(`${API_BASE_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' })
                    .finally(() => window.location.href = '/');
            }, 3000);
        } catch (error) {
            showNotification(error.message, 'error');
            elements.deleteModal.style.display = 'none';
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