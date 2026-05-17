
        const NAMES = ["GRAY", "OPERATOR", "ARCHITECT", "BUILDER"];
        const MONTHS = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
        const SEED_EVENTS = [
            { date: '2026-01-01', title: "System Reset", desc: "Set targets. Cut noise. Commit to the next 90 days." },
            { date: '2026-01-07', title: "Week-1 Review", desc: "Audit schedule + energy. Fix friction early." },
            { date: '2026-02-01', title: "Output Sprint", desc: "Ship something real. One deliverable. No excuses." },
            { date: '2026-03-31', title: "Q1 Closeout", desc: "Score the quarter. Keep what worked. Delete the rest." },
            { date: '2026-06-30', title: "Midyear Audit", desc: "Health, money, craft, relationships\u2014tighten the bolts." },
            { date: '2026-12-31', title: "Year Debrief", desc: "Write lessons learned. Lock next-year intent." },
        ];
        const FOUNDER_MESSAGES = ["I do not hand my energy to confusion. I decide what gets power.", "When the room gets heavy, I slow my breathing and take my perspective back.", "I protect my mind first, because everything I build comes through it.", "My peace is not passive. I maintain it on purpose.", "I watch where my attention goes, because that is where my life starts bending.", "I do not let a bad moment rename my whole day.", "My energy moves where my focus agrees to go.", "I stay in control by choosing the meaning before chaos chooses it for me.", "I can feel the pressure without becoming the pressure.", "I keep my perspective clean so my next move stays clean.", "I am not here to react to every shadow. I am here to direct my own field.", "If something disturbs my spirit, I study it before I serve it.", "I do not chase balance. I create it by how I carry myself.", "The fastest way back to power is to remember what never belonged to the noise.", "I move different when I remember my mind is a gate, not a hallway.", "I do not feed fear with imagination. I feed vision with intention.", "My perspective is part of my protection.", "I refuse to let temporary emotions make permanent decisions for me.", "I know how to pull my energy back home when the world starts reaching for it.", "I stay dangerous to despair by keeping command of my inner voice.", "Even in a storm, I choose the lens that keeps me standing.", "I am careful with what I repeat to myself, because repetition becomes reality.", "My calm is not weakness. It is controlled force.", "I do not shrink in hard seasons. I refine my signal.", "Every day I practice returning to myself faster.", "I can redirect the whole day by redirecting the story in my head.", "I maintain control by staying honest about what is real and what is projection.", "I do not owe chaos an audience.", "My energy is too valuable to leave lying around in old feelings.", "I keep my perspective sharp, because that is how I keep my spirit free."];

        function showToast(msg) {
            const t = document.getElementById('toast');
            t.textContent = msg; t.classList.add('show');
            if (window.navigator.vibrate) window.navigator.vibrate(50);
            setTimeout(() => t.classList.remove('show'), 2500);
        }

        function createRipple(event) {
            const button = event.currentTarget;
            const ripple = document.createElement("span");
            const diameter = Math.max(button.clientWidth, button.clientHeight);
            const radius = diameter / 2;
            const rect = button.getBoundingClientRect();
            ripple.style.width = ripple.style.height = `${diameter}px`;
            ripple.style.left = `${event.clientX - rect.left - radius}px`;
            ripple.style.top = `${event.clientY - rect.top - radius}px`;
            ripple.classList.add("ripple");
            setTimeout(() => ripple.remove(), 600);
            button.appendChild(ripple);
        }

        function triggerConfetti() {
            const emojis = ['🧭', '⚡', '✨', '💛', '🔥', '💰'];
            for(let i=0; i<30; i++) {
                const el = document.createElement('div');
                el.textContent = emojis[Math.floor(Math.random() * emojis.length)];
                el.className = 'confetti-piece';
                el.style.left = Math.random() * 100 + 'vw';
                el.style.top = '-50px';
                el.style.animationDuration = (Math.random() * 2 + 1) + 's';
                document.body.appendChild(el);
                setTimeout(() => el.remove(), 3000);
            }
            if (window.navigator.vibrate) window.navigator.vibrate([100, 50, 100]);
        }

        /* --- Gyro Logic --- */
        window.addEventListener('mousemove', e => {
            const x = (e.clientX / window.innerWidth - 0.5) * 50;
            const y = (e.clientY / window.innerHeight - 0.5) * 50;
            document.getElementById('liquid-bg').style.transform = `translate(${x}px, ${y}px)`;
        });
        window.addEventListener('deviceorientation', e => {
            if(e.gamma && e.beta) {
                const x = e.gamma * 2;
                const y = e.beta * 2;
                document.getElementById('liquid-bg').style.transform = `translate(${x}px, ${y}px)`;
            }
        });

        /* --- Main Logic --- */
        class NexusAPI {
            constructor() {
                this.apiKey = localStorage.getItem('NEXUS_API_KEY') || "";
                this.clientId = localStorage.getItem('NEXUS_CLIENT_ID') || "";
                this.accessToken = null;
                this.isOffline = true;
            }
            async initGapi() {
                if(!this.apiKey) return;
                return new Promise((resolve) => {
                    const i = setInterval(() => {
                        if(typeof gapi !== 'undefined' && typeof google !== 'undefined') {
                            clearInterval(i);
                            gapi.load('client', async () => {
                                try {
                                    await gapi.client.init({ apiKey: this.apiKey });
                                    if(this.clientId) {
                                        this.tokenClient = google.accounts.oauth2.initTokenClient({
                                            client_id: this.clientId,
                                            scope: 'https://www.googleapis.com/auth/calendar.events',
                                            callback: (r) => {
                                                if(r.error) return showToast("Sync Error");
                                                this.accessToken = r.access_token;
                                                this.isOffline = false;
                                                app.refresh();
                                                showToast("Google Sync Active");
                                                document.getElementById('auth-modal').style.display = 'none';
                                            }
                                        });
                                    }
                                    resolve();
                                } catch(e) {}
                            });
                        }
                    }, 100);
                });
            }
            startAuth() {
                this.apiKey = document.getElementById('api-key').value;
                this.clientId = document.getElementById('client-id').value;
                localStorage.setItem('NEXUS_API_KEY', this.apiKey);
                localStorage.setItem('NEXUS_CLIENT_ID', this.clientId);
                this.initGapi().then(() => { if(this.tokenClient) this.tokenClient.requestAccessToken(); });
            }
        }

        class MobileApp {
            constructor() {
                const now = new Date();
                this.month = now.getMonth();
                this.year = now.getFullYear();
                this.events = JSON.parse(localStorage.getItem('grayscape_mobile_events')) || {};
                this.notes = JSON.parse(localStorage.getItem('grayscape_mobile_notes')) || [];
                this.decrees = JSON.parse(localStorage.getItem('grayscape_mobile_decrees')) || [];
                this.goals = JSON.parse(localStorage.getItem('grayscape_mobile_goals')) || [];
                this.rituals = JSON.parse(localStorage.getItem('grayscape_mobile_rituals')) || { skin: false, water: false, peace: false, lastDate: '', streak: 0 };
                this.activeDate = null;
                this.activeNoteId = null;
                this.nameIdx = 0;
                this.fuelLevel = 100;
                this.timerInterval = null;
                this.timeLeft = 45 * 60;
                this.isTimerRunning = false;
                this.secretTapCount = 0;
                this.secretTapTimeout = null;
            }

            init() {
                this.seedLoveProtocol();
                this.migrateFounderMessages();
                this.checkRituals();
                this.renderMonth();
                this.renderNotes();
                this.renderDecrees();
                this.renderTreasury();
                this.cycleIdentity();
                this.setupInteractivity();
                this.startFuelDecay();
                this.startParticles();
                nexus.initGapi();
                if(nexus.apiKey) document.getElementById('api-key').value = nexus.apiKey;
                if(nexus.clientId) document.getElementById('client-id').value = nexus.clientId;
            }

            startFuelDecay() {
                setInterval(() => { if (this.fuelLevel > 0) { this.fuelLevel -= 1; this.updateFuelBar(); } }, 60000); 
                this.updateFuelBar();
            }
            updateFuelBar() {
                const bar = document.getElementById('fuel-bar');
                bar.style.width = `${this.fuelLevel}%`;
                bar.className = `fuel-bar-fill ${this.fuelLevel < 20 ? 'low' : ''}`;
            }
            refillFuel() {
                if (this.fuelLevel < 100) {
                    this.fuelLevel = 100; this.updateFuelBar();
                    if (window.navigator.vibrate) window.navigator.vibrate([30, 30, 30]); 
                    showToast("Fuel topped off: system online");
                }
            }

            seedLoveProtocol() {
                if (localStorage.getItem('grayscape_seeded_v1')) return;
                SEED_EVENTS.forEach(drop => {
                    if (!this.events[drop.date]) this.events[drop.date] = [];
                    this.events[drop.date].push({ id: 'lvl_' + Math.random(), summary: drop.title, description: drop.desc, type: 'love' });
                });
                const start = new Date(2026, 0, 1), end = new Date(2026, 11, 31);
                for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    const dateStr = d.toISOString().split('T')[0];
                    if (!this.events[dateStr]) this.events[dateStr] = [];
                    if (!this.events[dateStr].some(e => e.type === 'love')) {
                        const randomMsg = FOUNDER_MESSAGES[(d.getDate() + d.getMonth()) % FOUNDER_MESSAGES.length];
                        this.events[dateStr].push({ id: 'msg_' + Math.random(), summary: "Message From The Founder", description: randomMsg, type: 'love' });
                    }
                }
                localStorage.setItem('grayscape_mobile_events', JSON.stringify(this.events));
                localStorage.setItem('grayscape_seeded_v1', 'true');
            }

            migrateFounderMessages() {
                let changed = false;
                Object.keys(this.events).forEach((dateStr) => {
                    const dayIndex = new Date(dateStr + 'T00:00:00').getDate() + new Date(dateStr + 'T00:00:00').getMonth();
                    this.events[dateStr] = (this.events[dateStr] || []).map((evt) => {
                        const isFounderSignal = evt && evt.type === 'love' && (
                            String(evt.id || '').startsWith('msg_') ||
                            evt.summary === 'Message From Gray' ||
                            evt.summary === 'Message From The Founder'
                        );
                        if (!isFounderSignal) return evt;
                        changed = true;
                        return {
                            ...evt,
                            summary: 'Message From The Founder',
                            description: FOUNDER_MESSAGES[dayIndex % FOUNDER_MESSAGES.length],
                            type: 'love'
                        };
                    });
                });
                if (changed) {
                    localStorage.setItem('grayscape_mobile_events', JSON.stringify(this.events));
                    localStorage.setItem('grayscape_founder_messages_v1', 'true');
                }
            }

            cycleIdentity() {
                setInterval(() => {
                    this.nameIdx = (this.nameIdx + 1) % NAMES.length;
                    const badge = document.getElementById('identity');
                    badge.style.opacity = '0';
                    setTimeout(() => { badge.textContent = NAMES[this.nameIdx]; badge.style.opacity = '1'; }, 300);
                }, 3000);
            }

            handleSecretTap() {
                this.secretTapCount++;
                clearTimeout(this.secretTapTimeout);
                this.secretTapTimeout = setTimeout(() => this.secretTapCount = 0, 1000);
                if (this.secretTapCount === 3) {
                    document.body.classList.add('glitch-active');
                    setTimeout(() => {
                        document.body.classList.remove('glitch-active');
                        document.getElementById('secret-letter-modal').style.display = 'flex';
                        setTimeout(() => document.getElementById('secret-letter-modal').classList.add('reveal'), 50);
                    }, 1000);
                    this.secretTapCount = 0;
                }
            }
            closeLetter() {
                const modal = document.getElementById('secret-letter-modal');
                modal.classList.remove('reveal');
                setTimeout(() => modal.style.display = 'none', 1000);
            }

            setupInteractivity() {
                document.querySelectorAll('.action-btn, .fab-btn, .nav-item').forEach(btn => btn.addEventListener('click', createRipple));
                const calendarEl = document.getElementById('view-calendar');
                let startX=0;
                calendarEl.addEventListener('touchstart', e => startX = e.changedTouches[0].screenX);
                calendarEl.addEventListener('touchend', e => {
                    if (startX - e.changedTouches[0].screenX > 50) this.changeMonth(1); 
                    if (e.changedTouches[0].screenX - startX > 50) this.changeMonth(-1);
                });
            }

            switchView(viewName) {
                if (window.navigator.vibrate) window.navigator.vibrate(30);
                document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
                document.getElementById(`nav-${viewName}`).classList.add('active');
                document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));
                document.getElementById(`view-${viewName}`).classList.add('active');
            }

            checkRituals() {
                const today = new Date().toISOString().split('T')[0];
                if (this.rituals.lastDate !== today) {
                    this.rituals.skin = false; this.rituals.water = false; this.rituals.peace = false;
                    this.rituals.lastDate = today;
                    localStorage.setItem('grayscape_mobile_rituals', JSON.stringify(this.rituals));
                }
                this.updateRitualUI();
            }
            updateRitualUI() {
                document.getElementById('ritual-skin').className = `ritual-btn ${this.rituals.skin ? 'completed' : ''}`;
                document.getElementById('ritual-water').className = `ritual-btn ${this.rituals.water ? 'completed' : ''}`;
                document.getElementById('ritual-peace').className = `ritual-btn ${this.rituals.peace ? 'completed' : ''}`;
                document.getElementById('streak-counter').textContent = `${this.rituals.streak} DAYS IN MOTION`;
            }
            toggleRitual(type) {
                this.rituals[type] = !this.rituals[type];
                if (this.rituals.skin && this.rituals.water && this.rituals.peace) {
                     if(!this.rituals.completedToday) {
                         this.rituals.streak++;
                         this.rituals.completedToday = true;
                         triggerConfetti();
                     }
                }
                localStorage.setItem('grayscape_mobile_rituals', JSON.stringify(this.rituals));
                this.updateRitualUI();
            }

            setTimer(m, mode) {
                this.timeLeft = m * 60;
                this.updateTimerDisplay();
                document.querySelectorAll('.focus-btn').forEach(b => b.classList.remove('active'));
                event.target.classList.add('active');
                showToast(`Mode: ${mode}`);
            }
            toggleTimer() {
                const btn = document.getElementById('play-btn');
                if (this.isTimerRunning) {
                    clearInterval(this.timerInterval);
                    this.isTimerRunning = false;
                    btn.innerHTML = '<i class="fas fa-play"></i>';
                    document.getElementById('liquid-bg').style.animationDuration = '20s';
                } else {
                    this.isTimerRunning = true;
                    btn.innerHTML = '<i class="fas fa-pause"></i>';
                    document.getElementById('liquid-bg').style.animationDuration = '5s';
                    this.timerInterval = setInterval(() => {
                        this.timeLeft--;
                        this.updateTimerDisplay();
                        if (this.timeLeft <= 0) {
                            clearInterval(this.timerInterval);
                            this.isTimerRunning = false;
                            showToast("Focus Session Complete!");
                            if (window.navigator.vibrate) window.navigator.vibrate([200, 100, 200]);
                            document.getElementById('liquid-bg').style.animationDuration = '20s';
                            btn.innerHTML = '<i class="fas fa-play"></i>';
                        }
                    }, 1000);
                }
            }
            updateTimerDisplay() {
                const m = Math.floor(this.timeLeft / 60);
                const s = this.timeLeft % 60;
                document.getElementById('timer-display').textContent = `${m}:${s < 10 ? '0' : ''}${s}`;
            }

            async refresh() {
                if (!nexus.isOffline && nexus.accessToken) {
                    try {
                        const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${new Date(this.year, this.month, 1).toISOString()}&timeMax=${new Date(this.year, this.month + 1, 0).toISOString()}&singleEvents=true&key=${nexus.apiKey}`, {
                            headers: { 'Authorization': `Bearer ${nexus.accessToken}` }
                        });
                        const data = await res.json();
                        if(data.items) data.items.forEach(ev => {
                            const d = (ev.start.date || ev.start.dateTime).split('T')[0];
                            if(!this.events[d]) this.events[d] = [];
                            if(!this.events[d].some(e => e.id === ev.id)) this.events[d].push(ev);
                        });
                    } catch(e) {}
                }
                this.renderMonth();
            }

            getMonthSummary() {
                const daysInMonth = new Date(this.year, this.month + 1, 0).getDate();
                const today = new Date();
                let scheduled = 0;
                let focusDays = 0;
                let signalDays = 0;
                let busiest = { day: '--', count: 0 };
                const upcoming = [];
                for (let d = 1; d <= daysInMonth; d++) {
                    const dateStr = `${this.year}-${String(this.month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                    const evs = this.events[dateStr] || [];
                    const plans = evs.filter(e => e.type !== 'love');
                    const signals = evs.filter(e => e.type === 'love');
                    if (plans.length) {
                        scheduled += plans.length;
                        focusDays += 1;
                    }
                    if (signals.length) signalDays += 1;
                    if (evs.length > busiest.count) busiest = { day: d, count: evs.length };
                    evs.forEach((evt) => {
                        const dateObj = new Date(`${dateStr}T00:00:00`);
                        if (dateObj >= new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
                            upcoming.push({ dateStr, evt, day: d });
                        }
                    });
                }
                upcoming.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
                return { scheduled, focusDays, signalDays, busiest, upcoming: upcoming.slice(0, 6) };
            }

            renderCalendarIntel(summary) {
                const intel = document.getElementById('calendar-intel');
                const agenda = document.getElementById('calendar-agenda');
                if (!intel || !agenda) return;
                intel.innerHTML = [
                    `<div class="intel-row"><span>Focus coverage</span><strong>${summary.focusDays} day${summary.focusDays === 1 ? '' : 's'}</strong></div>`,
                    `<div class="intel-row"><span>Signal coverage</span><strong>${summary.signalDays} day${summary.signalDays === 1 ? '' : 's'}</strong></div>`,
                    `<div class="intel-row"><span>Total workload</span><strong>${summary.scheduled} item${summary.scheduled === 1 ? '' : 's'}</strong></div>`,
                    `<div class="intel-row"><span>Selected date</span><strong>${this.activeDate || 'None'}</strong></div>`
                ].join('');

                if (!summary.upcoming.length) {
                    agenda.innerHTML = '<div class="empty-intel">No upcoming items inside this month yet.</div>';
                    return;
                }
                agenda.innerHTML = summary.upcoming.map(({ dateStr, evt }) => `
                    <div class="agenda-item">
                        <div class="agenda-date">${dateStr}</div>
                        <div class="agenda-main">${evt.summary || evt.title}</div>
                        <div class="agenda-note">${evt.description || evt.desc || (evt.type === 'love' ? 'Founder signal loaded.' : 'No notes yet.')}</div>
                    </div>
                `).join('');
            }

            renderMonth() {
                const grid = document.getElementById('grid');
                grid.innerHTML = '';
                document.getElementById('month-title').textContent = MONTHS[this.month];
                document.getElementById('month-subtitle').textContent = `Operator Protocol ${this.year}`;
                const firstDay = new Date(this.year, this.month, 1).getDay();
                const daysInMonth = new Date(this.year, this.month + 1, 0).getDate();
                const today = new Date();
                const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
                for (let i = 0; i < firstDay; i++) {
                    const spacer = document.createElement('div');
                    spacer.className = 'day-cell empty';
                    grid.appendChild(spacer);
                }
                for(let d=1; d<=daysInMonth; d++) {
                    const dateStr = `${this.year}-${String(this.month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                    const evs = this.events[dateStr] || [];
                    const plans = evs.filter(e => e.type !== 'love');
                    const signals = evs.filter(e => e.type === 'love');
                    const cell = document.createElement('div');
                    cell.className = 'day-cell';
                    if (d === 1) cell.classList.add('signal');
                    if (dateStr === todayKey) cell.classList.add('today');
                    if (dateStr === this.activeDate) cell.classList.add('selected');
                    if (plans.length) cell.classList.add('has-event');
                    if (!plans.length && signals.length) cell.classList.add('has-love');
                    const label = plans.length ? `${plans.length} plan${plans.length === 1 ? '' : 's'}` : (signals.length ? 'Founder signal' : 'Open field');
                    const pills = (plans.length ? plans : signals).slice(0, 2).map((evt) => `<div class="day-pill ${evt.type === 'love' ? 'signal' : 'command'}">${evt.summary || evt.title}</div>`).join('');
                    const moreCount = evs.length > 2 ? `<div class="day-count">+${evs.length - 2} more inside day deck</div>` : `<div class="day-count">${label}</div>`;
                    cell.innerHTML = `
                        <div class="day-top">
                            <div class="day-number">${d}</div>
                            <div class="day-meta">${dateStr === todayKey ? 'today' : (d === 1 ? 'signal' : label)}</div>
                        </div>
                        <div class="day-stack">
                            ${pills || '<div class="day-pill">No pinned items</div>'}
                            ${moreCount}
                        </div>`;
                    cell.onclick = () => this.openEditor(dateStr, d);
                    grid.appendChild(cell);
                }
                const summary = this.getMonthSummary();
                document.getElementById('metric-scheduled').textContent = summary.scheduled;
                document.getElementById('metric-focus-days').textContent = summary.focusDays;
                document.getElementById('metric-signal-days').textContent = summary.signalDays;
                document.getElementById('metric-busiest-day').textContent = summary.busiest.count ? summary.busiest.day : '--';
                document.getElementById('metric-busiest-foot').textContent = summary.busiest.count ? `${summary.busiest.count} item${summary.busiest.count === 1 ? '' : 's'} in this day deck` : 'No schedule density yet';
                this.renderCalendarIntel(summary);
            }

            openEditor(dateStr, day) {
                this.activeDate = dateStr;
                document.getElementById('sheet-date').textContent = `${MONTHS[this.month]} ${day}`;
                document.getElementById('signal-protocol').style.display = (day === 1) ? 'block' : 'none';
                const list = document.getElementById('event-list');
                const evs = this.events[dateStr] || [];
                list.innerHTML = evs.length ? '' : '<p style="color:var(--text-dim); font-size:0.82rem; text-align:center; padding:1rem;">No plans yet.</p>';
                evs.forEach((e, i) => {
                    const item = document.createElement('div');
                    item.className = 'event-list-item';
                    if (e.type === 'love') item.classList.add('love-msg');
                    item.innerHTML = `<div><div style="font-weight:800; color:var(--text-main); margin-bottom:4px;" class="note-text">${e.summary || e.title}</div><div style="font-size:0.77rem; color:var(--text-soft); line-height:1.45;">${e.description || e.desc || ''}</div></div>${e.type !== 'love' ? `<button onclick="app.deleteEvent('${e.id || i}')" style="background:none; border:none; color:var(--danger-red); font-size:1rem;"><i class="fas fa-trash"></i></button>` : '<span style="font-size:1.1rem;">✨</span>'}`;
                    list.appendChild(item);
                });
                const sheet = document.getElementById('editor-sheet');
                sheet.style.display = 'flex';
                void sheet.offsetWidth;
                sheet.classList.add('visible');
                this.renderMonth();
            }
            closeEditor() {
                const sheet = document.getElementById('editor-sheet');
                sheet.classList.remove('visible');
                setTimeout(() => sheet.style.display = 'none', 300);
            }

            async addEvent() {
                const title = document.getElementById('event-title').value;
                const desc = document.getElementById('event-desc').value;
                if(!title) return;
                if(!this.events[this.activeDate]) this.events[this.activeDate] = [];
                const newEv = { title, desc, id: Date.now().toString() };
                this.events[this.activeDate].push(newEv);
                localStorage.setItem('grayscape_mobile_events', JSON.stringify(this.events));
                triggerConfetti();
                if (!nexus.isOffline && nexus.accessToken) {
                    try {
                        await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?key=${nexus.apiKey}`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${nexus.accessToken}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ summary: title, description: desc, start: { date: this.activeDate }, end: { date: this.activeDate } })
                        });
                        showToast("Synced to Cloud");
                    } catch(e) { showToast("Saved Locally"); }
                } else { showToast("Saved Locally"); }
                document.getElementById('event-title').value = '';
                document.getElementById('event-desc').value = '';
                this.renderMonth();
                this.closeEditor();
            }

            async deleteEvent(id) {
                if(!confirm("Remove this plan?")) return;
                this.events[this.activeDate] = this.events[this.activeDate].filter(e => e.id != id);
                localStorage.setItem('grayscape_mobile_events', JSON.stringify(this.events));
                if (!nexus.isOffline && nexus.accessToken && id.length > 20) {
                    try {
                        await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${id}?key=${nexus.apiKey}`, {
                            method: 'DELETE', headers: { 'Authorization': `Bearer ${nexus.accessToken}` }
                        });
                    } catch(e) {}
                }
                this.openEditor(this.activeDate, parseInt(this.activeDate.split('-')[2])); 
                this.renderMonth();
            }

            exportData() {
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.events));
                const a = document.createElement('a');
                a.href = dataStr;
                a.download = 'GRAYSCAPE_BACKUP.json';
                a.click();
            }

            changeMonth(d) {
                const next = new Date(this.year, this.month + d, 1);
                this.month = next.getMonth();
                this.year = next.getFullYear();
                this.renderMonth();
            }
            jumpToSignal() {
                this.switchView('calendar');
                this.month = 1;
                this.renderMonth();
                triggerConfetti();
            }

            renderDecrees() {
                const list = document.getElementById('decree-list');
                list.innerHTML = this.decrees.length ? '' : '<p style="text-align:center; color:#999; margin-top:2rem;">No orders pending.</p>';
                this.decrees.forEach((d, i) => {
                    const card = document.createElement('div');
                    card.className = 'decree-card';
                    card.innerHTML = `<span class="decree-text">${d.text}</span><div class="decree-actions"><button class="decree-btn btn-execute" onclick="app.executeDecree(${i})"><i class="fas fa-check"></i></button><button class="decree-btn btn-delete" onclick="app.deleteDecree(${i})"><i class="fas fa-times"></i></button></div>`;
                    list.appendChild(card);
                });
            }
            openDecreeEditor() {
                const sheet = document.getElementById('decree-sheet');
                sheet.style.display = 'flex';
                void sheet.offsetWidth;
                sheet.classList.add('visible');
            }
            closeDecreeEditor() {
                const sheet = document.getElementById('decree-sheet');
                sheet.classList.remove('visible');
                setTimeout(() => sheet.style.display = 'none', 300);
            }
            saveDecree() {
                const text = document.getElementById('decree-text').value;
                if(!text) return;
                this.decrees.push({ text, status: 'pending' });
                localStorage.setItem('grayscape_mobile_decrees', JSON.stringify(this.decrees));
                this.renderDecrees();
                document.getElementById('decree-text').value = '';
                this.closeDecreeEditor();
            }
            executeDecree(idx) {
                document.querySelectorAll('.decree-card')[idx].classList.add('executed');
                if(window.navigator.vibrate) window.navigator.vibrate(200);
                setTimeout(() => {
                    this.decrees.splice(idx, 1);
                    localStorage.setItem('grayscape_mobile_decrees', JSON.stringify(this.decrees));
                    this.renderDecrees();
                    showToast("Order Executed");
                }, 500);
            }
            deleteDecree(idx) {
                this.decrees.splice(idx, 1);
                localStorage.setItem('grayscape_mobile_decrees', JSON.stringify(this.decrees));
                this.renderDecrees();
            }

            renderTreasury() {
                const container = document.getElementById('treasury-grid');
                container.innerHTML = this.goals.length ? '' : '<p style="text-align:center; color:#999; margin-top:2rem;">Start building your system.</p>';
                this.goals.forEach((g, i) => {
                    const progress = Math.min((g.current / g.target) * 100, 100);
                    const card = document.createElement('div');
                    card.className = 'goal-card';
                    card.innerHTML = `<div class="goal-header"><div class="goal-title">${g.title}</div><div class="goal-amount">$${g.current} / $${g.target}</div></div><div class="progress-track"><div class="progress-fill" style="width:${progress}%"></div></div><div class="goal-input-group"><input type="number" class="goal-input" id="amount-${i}" placeholder="+ $"><button class="btn-deposit" onclick="app.addFunds(${i})">DEPOSIT</button></div><button style="position:absolute; top:10px; right:10px; background:none; border:none; color:#ccc;" onclick="app.deleteGoal(${i})">&times;</button>`;
                    container.appendChild(card);
                });
            }
            openTreasuryEditor() {
                const sheet = document.getElementById('treasury-sheet');
                sheet.style.display = 'flex';
                void sheet.offsetWidth;
                sheet.classList.add('visible');
            }
            closeTreasuryEditor() {
                const sheet = document.getElementById('treasury-sheet');
                sheet.classList.remove('visible');
                setTimeout(() => sheet.style.display = 'none', 300);
            }
            saveGoal() {
                const title = document.getElementById('goal-title').value;
                const target = document.getElementById('goal-target').value;
                if(!title || !target) return;
                this.goals.push({ title, target: parseInt(target), current: 0 });
                localStorage.setItem('grayscape_mobile_goals', JSON.stringify(this.goals));
                this.renderTreasury();
                document.getElementById('goal-title').value = '';
                document.getElementById('goal-target').value = '';
                this.closeTreasuryEditor();
            }
            addFunds(idx) {
                const amount = parseInt(document.getElementById(`amount-${idx}`).value);
                if(!amount) return;
                this.goals[idx].current += amount;
                localStorage.setItem('grayscape_mobile_goals', JSON.stringify(this.goals));
                this.renderTreasury();
                if(this.goals[idx].current >= this.goals[idx].target) { triggerConfetti(); showToast("GOAL ACHIEVED! 💰"); } else { showToast("Funds Deposited"); }
            }
            deleteGoal(idx) {
                if(!confirm("Remove this goal?")) return;
                this.goals.splice(idx, 1);
                localStorage.setItem('grayscape_mobile_goals', JSON.stringify(this.goals));
                this.renderTreasury();
            }

            renderNotes() {
                const container = document.getElementById('notes-grid');
                const term = document.getElementById('journal-search').value.toLowerCase();
                const filteredNotes = this.notes.filter(n => n.title.toLowerCase().includes(term) || n.content.toLowerCase().includes(term));
                container.innerHTML = filteredNotes.length ? '' : '<div style="text-align:center; color:#999; margin-top:2rem;">Start writing your plans here.</div>';
                filteredNotes.forEach(n => {
                    const card = document.createElement('div');
                    card.className = 'note-card';
                    card.onclick = () => this.openNoteEditor(n.id);
                    card.innerHTML = `<div class="note-header"><div class="note-title">${n.title}</div><div class="note-vibe">${n.vibe || '👑'}</div></div><div class="note-preview">${n.content}</div><div class="note-date"><span>${new Date(n.updated).toLocaleDateString()}</span><span>${new Date(n.updated).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span></div>`;
                    container.appendChild(card);
                });
            }
            selectVibe(vibe) {
                document.getElementById('note-vibe').value = vibe;
                document.querySelectorAll('.vibe-option').forEach(el => el.classList.remove('selected'));
                document.getElementById(`vibe-${vibe}`).classList.add('selected');
            }
            openNoteEditor(id = null) {
                this.activeNoteId = id;
                const note = id ? this.notes.find(n => n.id === id) : { title: '', content: '', vibe: '👑' };
                document.getElementById('note-title').value = note.title;
                document.getElementById('note-content').value = note.content;
                this.selectVibe(note.vibe || '👑');
                document.getElementById('delete-note-btn').style.display = id ? 'block' : 'none';
                const sheet = document.getElementById('note-editor-sheet');
                sheet.style.display = 'flex';
                void sheet.offsetWidth;
                sheet.classList.add('visible');
            }
            closeNoteEditor() {
                const sheet = document.getElementById('note-editor-sheet');
                sheet.classList.remove('visible');
                setTimeout(() => sheet.style.display = 'none', 300);
            }
            saveNote() {
                const title = document.getElementById('note-title').value;
                const content = document.getElementById('note-content').value;
                const vibe = document.getElementById('note-vibe').value;
                if(!title) return;
                if (this.activeNoteId) {
                    const idx = this.notes.findIndex(n => n.id === this.activeNoteId);
                    this.notes[idx] = { ...this.notes[idx], title, content, vibe, updated: Date.now() };
                } else {
                    this.notes.unshift({ id: Date.now().toString(), title, content, vibe, updated: Date.now() });
                }
                localStorage.setItem('grayscape_mobile_notes', JSON.stringify(this.notes));
                this.renderNotes();
                this.closeNoteEditor();
                showToast("Journal Saved");
                triggerConfetti();
            }
            deleteNote() {
                if(!confirm("Delete this entry?")) return;
                this.notes = this.notes.filter(n => n.id !== this.activeNoteId);
                localStorage.setItem('grayscape_mobile_notes', JSON.stringify(this.notes));
                this.renderNotes();
                this.closeNoteEditor();
            }

            startParticles() {
                const canvas = document.getElementById('particleCanvas');
                const ctx = canvas.getContext('2d');
                let w, h, pts = [];
                const resize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; };
                window.addEventListener('resize', resize);
                resize();
                for(let i=0; i<60; i++) pts.push({ x: Math.random()*w, y: Math.random()*h, z: Math.random()*1000 });
                const loop = () => {
                    ctx.clearRect(0,0,w,h);
                    pts.forEach(p => {
                        p.z -= 2; if(p.z < 1) p.z = 1000;
                        const f = 400/p.z;
                        ctx.fillStyle = `rgba(255, 215, 0, ${f})`;
                        ctx.fillRect((p.x - w/2)*f + w/2, (p.y - h/2)*f + h/2, 2*f, 2*f);
                    });
                    requestAnimationFrame(loop);
                };
                loop();
            }
        }

        const nexus = new NexusAPI();
        const app = new MobileApp();
        window.onload = () => app.init();
    