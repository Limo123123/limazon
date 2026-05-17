
        const API_URL = 'https://api.limazon.v6.rocks';
        
        let cooldownInterval = null;
        let myData = null;

        // Init
        document.addEventListener('DOMContentLoaded', loadJobs);

        async function loadJobs() {
            try {
                const res = await fetch(`${API_URL}/api/jobs`, { credentials: 'include' });
                if (res.status === 401) {
                    document.body.innerHTML = "<h2 style='text-align:center; color:white;'>Bitte einloggen.</h2>";
                    return;
                }
                const data = await res.json();
                myData = data; // Speichern für später
                
                renderInterface(data);
                
                // Falls Cooldown aktiv ist, Timer starten
                if(data.cooldownLeft > 0) {
                    startCooldownTimer(data.cooldownLeft);
                }

            } catch (e) {
                console.error(e);
                document.getElementById('office-container').innerHTML = "Fehler beim Laden.";
            }
        }

        function renderInterface(data) {
            const office = document.getElementById('active-job-ui');
            const noJob = document.getElementById('no-job-msg');
            const list = document.getElementById('job-list');

            // 1. Mein Büro Rendern
            if (!data.currentJob) {
                office.style.display = 'none';
                noJob.style.display = 'block';
            } else {
                office.style.display = 'block';
                noJob.style.display = 'none';

                // Job Details finden
                const jobDef = data.availableJobs.find(j => j.id === data.currentJob);
                
                document.getElementById('current-job-title').innerText = jobDef ? jobDef.title : data.currentJob;
                document.getElementById('current-level').innerText = data.currentJobLevel;
                
                // Gehalt berechnen (Level Bonus anzeigen)
                const multiplier = 1 + ((data.currentJobLevel - 1) * 0.1);
                const realSalary = Math.floor((jobDef ? jobDef.salary : 0) * multiplier);
                document.getElementById('current-salary').innerText = `$${realSalary}`;
            }

            // 2. Job Liste Rendern
            list.innerHTML = data.availableJobs.map(job => {
                const isCurrent = data.currentJob === job.id;
                const activeClass = isCurrent ? 'active' : '';
                const btnText = isCurrent ? 'Aktuell' : 'Bewerben';
                const btnDisabled = isCurrent ? 'disabled' : '';
                const costText = job.cost > 0 ? `Kosten: $${job.cost.toLocaleString()}` : 'Kostenlos';
                const btnColor = isCurrent ? 'background:#22c55e;' : ''; // Grün wenn aktiv

                // Zeit formatieren
                const timeMin = Math.ceil(job.cooldownSeconds / 60);
                const timeText = timeMin === 1 ? "1 Min" : timeMin + " Min";

                return `
                <div class="job-card ${activeClass}">
                    <div>
                        <div class="job-name">${job.title}</div>
                        <div class="job-salary">$${job.salary} <span style="font-size:0.8em;color:#64748b;">/ Arbeit</span></div>
                        <div class="job-meta">
                            ⏳ Pause: ${timeText}<br>
                            🎓 Benötigt Level: ${job.reqLevel}
                        </div>
                    </div>
                    <div>
                        <button class="btn-apply" style="${btnColor}" ${btnDisabled} onclick="selectJob('${job.id}', ${job.cost})">
                            ${btnText}
                        </button>
                        ${!isCurrent ? `<span class="cost-badge">${costText}</span>` : ''}
                    </div>
                </div>
                `;
            }).join('');
        }

        async function doWork() {
            const btn = document.getElementById('btn-work');
            if(btn.disabled) return;

            // UI Feedback sofort
            btn.disabled = true;
            btn.innerText = "Arbeite...";

            try {
                const res = await fetch(`${API_URL}/api/jobs/work`, { 
                    method: 'POST', 
                    headers: {'Content-Type': 'application/json'},
                    credentials: 'include',
                    body: JSON.stringify({})
                });
                
                const result = await res.json();

                if (res.ok) {
                    // Success Animation
                    showMoneyPopup(document.getElementById('office-container'), `+ $${result.newBalance - (result.newBalance - 100 /* Dummy Diff */)}`); // Einfacher: Text aus result
                    
                    alert(result.message); // Oder schöneres UI
                    
                    // Reload um Cooldown exakt vom Server zu kriegen
                    loadJobs();
                } else {
                    alert(result.error);
                    loadJobs(); // Reset status
                }

            } catch (e) {
                alert("Verbindungsfehler");
                btn.disabled = false;
                btn.innerText = "ARBEITEN";
            }
        }

        async function selectJob(jobId, cost) {
            if(cost > 0) {
                if(!confirm(`Willst du wirklich umschulen? Das kostet dich $${cost}. Dein Job-Level wird auf 1 zurückgesetzt.`)) return;
            }

            try {
                const res = await fetch(`${API_URL}/api/jobs/select`, { 
                    method: 'POST', 
                    headers: {'Content-Type': 'application/json'},
                    credentials: 'include',
                    body: JSON.stringify({ jobId })
                });
                
                const data = await res.json();
                if(res.ok) {
                    alert(data.message);
                    loadJobs();
                } else {
                    alert(data.error);
                }
            } catch(e) { alert("Fehler."); }
        }

        // --- TIMER LOGIC ---
        function startCooldownTimer(seconds) {
            const display = document.getElementById('cooldown-display');
            const btn = document.getElementById('btn-work');
            
            clearInterval(cooldownInterval);
            let left = seconds;

            const update = () => {
                if (left <= 0) {
                    clearInterval(cooldownInterval);
                    display.innerText = "";
                    btn.disabled = false;
                    btn.innerText = "ARBEITEN";
                    return;
                }

                btn.disabled = true;
                btn.innerText = "PAUSE";
                
                // Format MM:SS
                const m = Math.floor(left / 60).toString().padStart(2, '0');
                const s = (left % 60).toString().padStart(2, '0');
                display.innerText = `Nächste Schicht in: ${m}:${s}`;
                
                left--;
            };

            update(); // Sofort einmal ausführen
            cooldownInterval = setInterval(update, 1000);
        }

        function showMoneyPopup(element, text) {
            // Zeigt aber nur an, dass es geklappt hat, Betrag laden wir neu
            // Einfachheitshalber laden wir die Seite neu (loadJobs), daher ist Popup kurz.
        }

    