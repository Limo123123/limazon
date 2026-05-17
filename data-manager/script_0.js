
        // WICHTIG: Passe diese URL an die Adresse deines auf Render.com gehosteten Backends an!
        const API_URL = 'https://api.limazon.v6.rocks/api/admin/data-manipulation';

        // DOM Elemente
        const adminUsernameEl = document.getElementById('adminUsername');
        const adminPasswordEl = document.getElementById('adminPassword');
        const oneDevUrlEl = document.getElementById('oneDevUrl');
        const oneDevAdminUsernameEl = document.getElementById('oneDevAdminUsername');
        const oneDevAdminPasswordEl = document.getElementById('oneDevAdminPassword');
        const collectionNameEl = document.getElementById('collectionName');
        const searchTermEl = document.getElementById('searchTerm');
        const btnFindAll = document.getElementById('btnFindAll');
        const btnSearch = document.getElementById('btnSearch');
        const btnAdvancedToggle = document.getElementById('btnAdvancedToggle');
        const advancedOperationsSection = document.getElementById('advancedOperationsSection');
        const operationEl = document.getElementById('operation');
        const queryEl = document.getElementById('query');
        const documentEl = document.getElementById('document');
        const documentsEl = document.getElementById('documents');
        const updateEl = document.getElementById('update');
        const pipelineEl = document.getElementById('pipeline');
        const optionsEl = document.getElementById('options');
        const submitAdvancedBtn = document.getElementById('submitAdvancedBtn');
        const queryGroup = document.getElementById('queryGroup');
        const documentGroup = document.getElementById('documentGroup');
        const documentsGroup = document.getElementById('documentsGroup');
        const updateGroup = document.getElementById('updateGroup');
        const pipelineGroup = document.getElementById('pipelineGroup');
        const loaderEl = document.getElementById('loader');
        const resultDocsEl = document.getElementById('result-docs');
        const resultRawEl = document.getElementById('result-raw');

        const editModal = document.getElementById('editModal');
        const editDocIdEl = document.getElementById('editDocId');
        const editDocCollectionEl = document.getElementById('editDocCollection');
        const editDocContentEl = document.getElementById('editDocContent');
        const saveEditBtn = document.getElementById('saveEditBtn');


        function getAuthPayload() {
            return {
                adminUsername: adminUsernameEl.value,
                adminPassword: adminPasswordEl.value,
                oneDevUrl: oneDevUrlEl.value,
                oneDevAdminUsername: oneDevAdminUsernameEl.value,
                oneDevAdminPassword: oneDevAdminPasswordEl.value,
            };
        }

        async function executeOperation(payload) {
            resultDocsEl.innerHTML = '';
            resultDocsEl.className = 'hidden';
            resultRawEl.textContent = '';
            resultRawEl.className = 'hidden';
            loaderEl.classList.remove('hidden');
            setButtonsDisabled(true);

            try {
                console.log("Sende Payload an Backend:", JSON.stringify(payload, null, 2)); // Zum Debuggen
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', },
                    body: JSON.stringify(payload),
                    credentials: 'include'
                });

                const responseData = await response.json();
                console.log("Antwort vom Backend:", responseData); // Zum Debuggen

                if (response.ok) {
                    if (payload.operation === 'find' && Array.isArray(responseData.result)) {
                        displayDocuments(responseData.result, payload.collectionName);
                    } else {
                        resultRawEl.classList.remove('hidden');
                        resultRawEl.textContent = JSON.stringify(responseData, null, 2);
                        resultRawEl.classList.add('result-success');
                        resultRawEl.classList.remove('result-error');
                    }
                } else {
                    handleErrorResponse(response, responseData);
                }
            } catch (error) {
                resultRawEl.classList.remove('hidden');
                resultRawEl.textContent = `Client-seitiger Fehler: ${error.message}`;
                resultRawEl.classList.add('result-error');
                console.error('Fehler:', error);
            } finally {
                loaderEl.classList.add('hidden');
                setButtonsDisabled(false);
            }
        }

        function displayDocuments(docs, collection) {
            resultDocsEl.classList.remove('hidden');
            resultDocsEl.innerHTML = '';
            if (docs.length === 0) {
                resultDocsEl.textContent = "Keine Dokumente gefunden.";
                return;
            }
            docs.forEach(doc => {
                const docId = doc._id || doc.id;
                const item = document.createElement('div');
                item.className = 'doc-item';

                const pre = document.createElement('pre');
                pre.textContent = JSON.stringify(doc, null, 2);
                item.appendChild(pre);

                if (docId !== undefined && docId !== null) { // Prüfe ob docId existiert
                    const editBtn = document.createElement('button');
                    editBtn.textContent = 'Bearbeiten';
                    editBtn.onclick = () => openEditModal(doc, collection, String(docId)); // ID immer als String übergeben
                    item.appendChild(editBtn);

                    const deleteBtn = document.createElement('button');
                    deleteBtn.textContent = 'Löschen';
                    deleteBtn.style.backgroundColor = '#c0392b';
                    deleteBtn.onclick = () => confirmDelete(String(docId), collection); // ID immer als String übergeben
                    item.appendChild(deleteBtn);
                } else {
                    console.warn("Dokument ohne identifizierbare ID (_id oder id):", doc);
                }

                resultDocsEl.appendChild(item);
            });
        }

        function openEditModal(doc, collection, docIdString) {
            editDocIdEl.value = docIdString;
            editDocCollectionEl.value = collection;
            const docToEdit = { ...doc };
            if (docToEdit._id) { // MongoDB _id nicht im Edit-Feld zeigen/ändern
                delete docToEdit._id;
            }
            // Wenn es ein numerisches 'id' Feld gibt (z.B. bei Produkten), bleibt es im Objekt.
            editDocContentEl.value = JSON.stringify(docToEdit, null, 2);
            editModal.classList.remove('hidden');
        }

        function closeModal() {
            editModal.classList.add('hidden');
        }

        saveEditBtn.onclick = async () => {
            const docIdString = editDocIdEl.value;
            const collection = editDocCollectionEl.value;
            let updatedDocContent;
            try {
                updatedDocContent = JSON.parse(editDocContentEl.value);
            } catch (e) {
                alert("Ungültiges JSON im Bearbeitungsfeld: " + e.message);
                return;
            }

            const payload = {
                ...getAuthPayload(),
                collectionName: collection,
                operation: 'updateOne',
                query: {},
                update: { $set: updatedDocContent }
            };

            if (collection === 'products' && !isNaN(parseInt(docIdString))) {
                payload.query = { id: parseInt(docIdString) };
            } else {
                payload.query = { _id: docIdString }; // Backend konvertiert zu ObjectId falls nötig
            }

            await executeOperation(payload);
            closeModal();
            if (resultRawEl.classList.contains('result-success') || (resultDocsEl.children.length > 0 && !resultDocsEl.textContent.includes("Keine Dokumente"))) {
                // Einfache Prüfung, ob vorher Ergebnisse da waren oder eine Erfolgsmeldung im Raw-Bereich
                alert("Dokument aktualisiert. Bitte 'Alle Dokumente anzeigen' oder 'Suche ausführen' erneut klicken, um die Änderungen zu sehen.");
            }
        };

        async function confirmDelete(docIdString, collection) {
            if (!confirm(`Möchten Sie das Dokument mit ID '${docIdString}' aus der Collection '${collection}' wirklich löschen?`)) {
                return;
            }

            const payload = {
                ...getAuthPayload(),
                collectionName: collection,
                operation: 'deleteOne',
                query: {}
            };

            if (collection === 'products' && !isNaN(parseInt(docIdString))) {
                payload.query = { id: parseInt(docIdString) };
            } else {
                payload.query = { _id: docIdString }; // Backend konvertiert zu ObjectId falls nötig
            }

            await executeOperation(payload);
            if (resultRawEl.classList.contains('result-success') || (resultDocsEl.children.length > 0 && !resultDocsEl.textContent.includes("Keine Dokumente"))) {
                alert("Dokument gelöscht. Bitte 'Alle Dokumente anzeigen' oder 'Suche ausführen' erneut klicken, um die Änderungen zu sehen.");
            }
        }

        function handleErrorResponse(response, responseData) {
            resultRawEl.classList.remove('hidden');
            let errorMessage = `Fehler (Status ${response.status}):\n${JSON.stringify(responseData, null, 2)}`;
            if (response.status === 401 && responseData.error && responseData.error.includes("Admin-Anmeldedaten")) {
                errorMessage = `Fehler (Status ${response.status}) - Stufe 2 Authentifizierung fehlgeschlagen:\n${JSON.stringify(responseData, null, 2)}`;
            } else if (response.status === 401) {
                errorMessage = `Fehler (Status ${response.status}): Nicht eingeloggt oder Session abgelaufen. Bitte logge dich zuerst in die Hauptanwendung ein.\n${JSON.stringify(responseData, null, 2)}`;
            } else if (responseData.stage === 3) {
                errorMessage = `Fehler (Status ${response.status}) - Stufe 3 OneDev Authentifizierung fehlgeschlagen:\n${JSON.stringify(responseData, null, 2)}`;
            }
            resultRawEl.textContent = errorMessage;
            resultRawEl.classList.add('result-error');
            resultRawEl.classList.remove('result-success');
        }

        function setButtonsDisabled(disabled) {
            btnFindAll.disabled = disabled;
            btnSearch.disabled = disabled;
            btnAdvancedToggle.disabled = disabled;
            submitAdvancedBtn.disabled = disabled;
            // saveEditBtn sollte nur deaktiviert werden, während die Save-Operation läuft,
            // aber da executeOperation die globalen Buttons steuert, ist das hier abgedeckt.
        }

        function updateAdvancedInputVisibility() {
            const selectedOperation = operationEl.value;
            queryGroup.classList.add('hidden');
            documentGroup.classList.add('hidden');
            documentsGroup.classList.add('hidden');
            updateGroup.classList.add('hidden');
            pipelineGroup.classList.add('hidden');

            switch (selectedOperation) {
                case 'find': case 'findOne': case 'countDocuments': queryGroup.classList.remove('hidden'); break;
                case 'insertOne': documentGroup.classList.remove('hidden'); break;
                case 'insertMany': documentsGroup.classList.remove('hidden'); break;
                case 'updateOne': case 'updateMany': queryGroup.classList.remove('hidden'); updateGroup.classList.remove('hidden'); break;
                case 'deleteOne': case 'deleteMany': queryGroup.classList.remove('hidden'); break;
                case 'aggregate': pipelineGroup.classList.remove('hidden'); break;
            }
        }

        operationEl.addEventListener('change', updateAdvancedInputVisibility);
        updateAdvancedInputVisibility(); // Initial call

        btnAdvancedToggle.addEventListener('click', () => {
            advancedOperationsSection.classList.toggle('hidden');
        });

        btnFindAll.addEventListener('click', () => {
            const payload = {
                ...getAuthPayload(),
                collectionName: collectionNameEl.value,
                operation: 'find',
                query: parseJsonInput(queryEl, 'Query', true) || {}, // Erlaube leere Query für "find all"
                options: parseJsonInput(optionsEl, 'Options', true) || {}
            };
            // Wenn queryEl leer ist, senden wir ein leeres Objekt oder was parseJsonInput zurückgibt
            if (queryEl.value.trim() === "") {
                payload.query = {};
            }
            executeOperation(payload);
        });

        btnSearch.addEventListener('click', () => {
            const term = searchTermEl.value.trim();
            // Wenn serverseitige Suche verwendet wird:
            const payload = {
                ...getAuthPayload(),
                collectionName: collectionNameEl.value,
                operation: 'find',
                searchTerm: term,
                query: {}, // Basis-Query leer, Backend nutzt searchTerm
                options: parseJsonInput(optionsEl, 'Options', true) || {}
            };
            executeOperation(payload);
        });

        submitAdvancedBtn.addEventListener('click', () => {
            const payload = {
                ...getAuthPayload(),
                collectionName: collectionNameEl.value,
                operation: operationEl.value,
            };
            try {
                const currentOperation = payload.operation;
                if (['find', 'findOne', 'updateOne', 'updateMany', 'deleteOne', 'deleteMany', 'countDocuments'].includes(currentOperation)) {
                    payload.query = parseJsonInput(queryEl, 'Query', true); // Query kann leer sein für find/count
                }
                if (currentOperation === 'insertOne') payload.document = parseJsonInput(documentEl, 'Document');
                if (currentOperation === 'insertMany') payload.documents = parseJsonInput(documentsEl, 'Documents');
                if (['updateOne', 'updateMany'].includes(currentOperation)) payload.update = parseJsonInput(updateEl, 'Update');
                if (currentOperation === 'aggregate') payload.pipeline = parseJsonInput(pipelineEl, 'Pipeline');

                const optionsParsed = parseJsonInput(optionsEl, 'Options', true);
                if (optionsParsed && Object.keys(optionsParsed).length > 0) payload.options = optionsParsed;

                executeOperation(payload);
            } catch (error) {
                resultRawEl.classList.remove('hidden');
                resultRawEl.textContent = `Client-seitiger Fehler bei Parameter-Verarbeitung: ${error.message}`;
                resultRawEl.classList.add('result-error');
                console.error('Fehler:', error);
            }
        });

        function parseJsonInput(element, fieldName, allowEmptyAsObject = false) {
            const str = element.value.trim();
            if (!str) {
                if (allowEmptyAsObject) return {};
                throw new Error(`JSON-Eingabe für '${fieldName}' darf nicht leer sein.`);
            }
            try { return JSON.parse(str); }
            catch (e) { throw new Error(`Ungültiges JSON in Feld '${fieldName}': ${e.message}`); }
        }
    