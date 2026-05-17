
    const API_BASE = 'https://api.limazon.v6.rocks/api';
    const fetchOpts = { credentials: 'include', headers: { 'Content-Type': 'application/json' } };
    let isAdmin = false;

    // Check if user is admin (hacky but works for UI)
    fetch(`${API_BASE}/auth/me`, fetchOpts).then(r => r.json()).then(u => { if(u && u.isAdmin) isAdmin = true; });

    async function loadReviews() {
        const serviceId = document.getElementById('service-select').value;
        const list = document.getElementById('reviews-list');
        const stats = document.getElementById('service-stats');

        list.innerHTML = '<p style="color: var(--text-muted); text-align: center;">Lade...</p>';
        stats.classList.add('hidden');

        try {
            const res = await fetch(`${API_BASE}/reviews/${serviceId}`);
            const data = await res.json();

            document.getElementById('avg-score').textContent = data.average;
            document.getElementById('review-count').textContent = data.count;
            stats.classList.remove('hidden');

            if (data.reviews.length === 0) {
                list.innerHTML = '<p style="color: var(--text-muted); text-align: center;">Noch keine Bewertungen.</p>';
                return;
            }

            list.innerHTML = '';
            data.reviews.forEach(r => {
                const date = new Date(r.createdAt).toLocaleDateString('de-DE');
                const stars = '★'.repeat(r.stars) + '☆'.repeat(5 - r.stars);
                const deleteBtn = isAdmin ? `<button class="btn-danger" onclick="deleteReview('${r._id}')">Löschen</button>` : '';

                list.innerHTML += `
                    <div class="review-item">
                        <div class="review-header">
                            <div>
                                <strong>${r.username}</strong> 
                                <span class="review-stars ml-2">${stars}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="review-date">${date}</span>
                                ${deleteBtn}
                            </div>
                        </div>
                        <p>${r.text}</p>
                    </div>
                `;
            });
        } catch (e) {
            list.innerHTML = '<p style="color: red; text-align: center;">Fehler beim Laden.</p>';
        }
    }

    async function submitReview(e) {
        e.preventDefault();
        const serviceId = document.getElementById('service-select').value;
        const stars = document.querySelector('input[name="stars"]:checked')?.value;
        const text = document.getElementById('review-text').value;

        if (!stars || !text) return alert("Bitte Sterne und Text angeben.");

        try {
            const res = await fetch(`${API_BASE}/reviews`, {
                ...fetchOpts, method: 'POST', body: JSON.stringify({ serviceId, stars, text })
            });
            const data = await res.json();
            
            if (res.ok) {
                alert(data.message);
                document.getElementById('review-text').value = '';
                document.querySelector('input[name="stars"]:checked').checked = false;
                loadReviews();
            } else {
                alert(data.error);
            }
        } catch (e) { alert("Fehler beim Senden."); }
    }

    async function deleteReview(id) {
        if (!confirm("Bewertung wirklich löschen?")) return;
        try {
            const res = await fetch(`${API_BASE}/admin/reviews/${id}`, { ...fetchOpts, method: 'DELETE' });
            if (res.ok) loadReviews();
            else alert("Fehler beim Löschen.");
        } catch (e) { alert("Netzwerkfehler."); }
    }

    window.onload = loadReviews;
