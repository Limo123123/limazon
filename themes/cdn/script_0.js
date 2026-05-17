
        const API_BASE = 'https://api.limazon.v6.rocks';
        let cropper = null;
        let currentUser = null;

        // Init App
        document.addEventListener('DOMContentLoaded', async () => {
            await checkAuth();
            loadGallery();
        });

        // 1. Auth-Check (Wichtig für den Admin-Button!)
        async function checkAuth() {
            try {
                const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
                if (res.ok) {
                    currentUser = await res.json();
                }
            } catch (e) { console.error("Auth Check Error", e); }
        }

        // 2. Bild auswählen & Cropper starten
        document.getElementById('file-input').addEventListener('change', function (e) {
            const files = e.target.files;
            if (files && files.length > 0) {
                const file = files[0];
                const reader = new FileReader();

                reader.onload = function (event) {
                    const image = document.getElementById('image-preview');
                    image.src = event.target.result;
                    document.getElementById('image-preview-container').style.display = 'block';
                    document.getElementById('btn-upload').classList.remove('hidden');

                    if (cropper) cropper.destroy();

                    cropper = new Cropper(image, {
                        aspectRatio: NaN, // Frei
                        viewMode: 1,
                        autoCropArea: 1
                    });
                };
                reader.readAsDataURL(file);
            }
        });

        // 3. Hochladen
        document.getElementById('btn-upload').addEventListener('click', async () => {
            if (!cropper) return;

            const btn = document.getElementById('btn-upload');
            const status = document.getElementById('upload-status');

            btn.disabled = true;
            btn.innerText = "Lade hoch...";

            cropper.getCroppedCanvas({
                maxWidth: 1024,
                maxHeight: 1024,
            }).toBlob(async (blob) => {
                const formData = new FormData();
                formData.append('image', blob, 'upload.jpg');

                try {
                    const res = await fetch(`${API_BASE}/api/cdn/upload`, {
                        method: 'POST',
                        credentials: 'include',
                        body: formData
                    });

                    const data = await res.json();

                    if (res.ok) {
                        status.innerHTML = `<span class="text-green-400">Erfolg! Link kopiert.</span>`;
                        navigator.clipboard.writeText(data.url);

                        setTimeout(() => {
                            status.innerText = "";
                            document.getElementById('file-input').value = "";
                            document.getElementById('image-preview-container').style.display = 'none';
                            btn.classList.add('hidden');
                            cropper.destroy();
                            cropper = null;
                            loadGallery();
                        }, 2000);

                    } else {
                        status.innerHTML = `<span class="text-red-400">Fehler: ${data.error}</span>`;
                    }
                } catch (e) {
                    status.innerHTML = `<span class="text-red-400">Verbindungsfehler.</span>`;
                } finally {
                    btn.disabled = false;
                    btn.innerText = "☁️ Zuschneiden & Hochladen";
                }
            }, 'image/jpeg');
        });

        // 4. Galerie laden
        async function loadGallery() {
            const gallery = document.getElementById('gallery');
            gallery.innerHTML = '<div class="col-span-full text-center text-gray-500 py-10">Lade Bilder...</div>';

            try {
                const res = await fetch(`${API_BASE}/api/cdn/list`, { credentials: 'include' });
                const data = await res.json();

                if (data.images && data.images.length > 0) {
                    gallery.innerHTML = '';
                    data.images.forEach(img => {

                        // Wenn Admin, füge den Löschen-Button ins Overlay hinzu
                        let adminDeleteHtml = '';
                        if (currentUser && currentUser.isAdmin) {
                            adminDeleteHtml = `<button onclick="deleteImage('${img.filename}')" class="bg-red-600/90 text-white text-xs px-3 py-2 rounded shadow-lg hover:bg-red-500 font-bold w-full">🗑️ Löschen</button>`;
                        }

                        gallery.innerHTML += `
                            <div class="gallery-item relative group rounded-lg overflow-hidden border border-white/10 bg-black/50 aspect-square">
                                <img src="${img.url}" class="gallery-img w-full h-full object-cover" loading="lazy">
                                
                                <div class="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4">
                                    <button onclick="copyToClipboard('${img.url}')" class="bg-blue-600 text-white text-xs px-3 py-2 rounded shadow-lg hover:bg-blue-500 font-bold w-full">🔗 Kopieren</button>
                                    ${adminDeleteHtml}
                                </div>
                            </div>
                        `;
                    });
                } else {
                    gallery.innerHTML = '<div class="col-span-full text-center text-gray-500 py-10">Noch keine Bilder auf dem Server.</div>';
                }
            } catch (e) {
                gallery.innerHTML = '<div class="col-span-full text-red-400 text-center py-10">Fehler beim Laden der Galerie.</div>';
            }
        }

        // 5. Bild in die Zwischenablage
        function copyToClipboard(text) {
            navigator.clipboard.writeText(text);
            // Kleines visuelles Feedback ohne nerviges Alert()
            const btn = event.target;
            const originalText = btn.innerText;
            btn.innerText = "Kopiert! ✔️";
            btn.classList.replace('bg-blue-600', 'bg-green-600');
            setTimeout(() => {
                btn.innerText = originalText;
                btn.classList.replace('bg-green-600', 'bg-blue-600');
            }, 1500);
        }

        // 6. Bild löschen (Nur für Admins)
        async function deleteImage(filename) {
            if (!confirm("Bist du sicher, dass du dieses Bild endgültig löschen möchtest? (Wenn es in Produkten genutzt wird, fehlt es dort danach!)")) return;

            try {
                const res = await fetch(`${API_BASE}/api/cdn/delete/${filename}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });

                const data = await res.json();

                if (res.ok) {
                    loadGallery(); // Galerie sofort neu laden
                } else {
                    alert("Fehler: " + (data.error || "Unbekannt"));
                }
            } catch (e) {
                alert("Verbindungsfehler beim Löschen.");
            }
        }
    