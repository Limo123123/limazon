
        const symbols = ['💎', '🍋', '🍒', '🔔', '7️⃣', '🍀'];
        let isSpinning = false;

        async function spin() {
            if(isSpinning) return;
            const btn = document.getElementById('spinBtn');
            isSpinning = true;
            btn.disabled = true;

            const res = await fetch('https://api.limazon.v6.rocks/api/games/start', { 
                method:'POST', headers:{'Content-Type':'application/json'}, 
                body:JSON.stringify({gameId:'slots'}), credentials:'include' 
            });

            if(!res.ok) {
                alert("Nicht genug Tokens oder nicht eingeloggt!");
                isSpinning = false; btn.disabled = false;
                return;
            }

            const reels = document.querySelectorAll('.reel');
            let result = [0,0,0].map(() => Math.floor(Math.random() * symbols.length));
            
            reels.forEach((r, i) => {
                r.classList.add('spinning');
                let count = 0;
                let interval = setInterval(() => {
                    r.innerText = symbols[Math.floor(Math.random() * symbols.length)];
                    count++;
                    if(count > 20 + i * 15) {
                        clearInterval(interval);
                        r.classList.remove('spinning');
                        r.innerText = symbols[result[i]];
                        if(i === 2) finalize(result);
                    }
                }, 50);
            });
        }

        async function finalize(res) {
            let score = 0;
            if(res[0] === res[1] && res[1] === res[2]) score = 100;
            else if(res[0] === res[1] || res[1] === res[2] || res[0] === res[2]) score = 10;

            await fetch('https://api.limazon.v6.rocks/api/games/submit-score', { 
                method:'POST', headers:{'Content-Type':'application/json'}, 
                body:JSON.stringify({gameId:'slots', score}), credentials:'include' 
            });

            setTimeout(() => {
                alert(score > 0 ? "GEWONNEN! Score: " + score : "Niete. Versuch es nochmal!");
                isSpinning = false;
                document.getElementById('spinBtn').disabled = false;
            }, 500);
        }
    