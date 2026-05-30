window.SMV = (function(){
  const CONTACT_HTML = 'Skyes Over London LC • Gray Skyes • grayskyes@solenterprises.org • skyemail@solenterprises.org • metraiyux-0s@solenterprises.org • 1-(800)-484-4788 • Company main 1-(800)-484-4783';
  const runtime = window.SMVRuntime || { href: (value) => value, redirect: (value) => { location.href = value; } };
  const NAV_ITEMS = [
    { id:'dashboard', href:'dashboard.html', label:'Inbox', labelId:'INBOX', hint:'Primary mailbox lane' },
    { id:'sent', href:'sent.html', label:'Sent', labelId:'SENT', hint:'Outbound history' },
    { id:'drafts', href:'drafts.html', label:'Drafts', labelId:'DRAFT', hint:'Saved drafts' },
    { id:'spam', href:'spam.html', label:'Spam', labelId:'SPAM', hint:'Filtered mail' },
	    { id:'trash', href:'trash.html', label:'Trash', labelId:'TRASH', hint:'Recovery + delete' },
	    { id:'contacts', href:'contacts.html', label:'Contacts', hint:'People + shortcuts' },
	    { id:'brain', href:'brain.html', label:'Brain', hint:'Local mailbox brain + kAIxu lane' },
	    { id:'workspace', href:'workspace.html', label:'0S Workbench', hint:'Docs, CRM, calendar, finance, audit' },
	    { id:'calendar', href:'dashboard.html#calendar', label:'Calendar', hint:'0S schedule lane' },
    { id:'monitoring', href:'monitoring.html', label:'Monitoring', hint:'Delivery + webhook health' },
    { id:'settings', href:'settings.html', label:'Settings', hint:'Profile + signature' }
  ];
  const GAME_STORAGE_KEY = 'SMV_GAME_STATE_V1';
  const GAME_LEVELS = [
    { name:'Signal Runner', min:0 },
    { name:'Inbox Operator', min:120 },
    { name:'Flow Captain', min:320 },
    { name:'Relay Architect', min:680 },
    { name:'Zero Noise Commander', min:1180 },
    { name:'Skyline Courier', min:1800 }
  ];
  const GAME_ACTIONS = {
    visit:{ label:'Opened command surface', xp:6, dailyOnce:true },
    mailbox_load:{ label:'Scanned mailbox lane', xp:4, cooldownMs:90000 },
    refresh:{ label:'Refreshed mailbox', xp:10, cooldownMs:20000 },
    search:{ label:'Ran mailbox search', xp:8, cooldownMs:10000 },
    mark_read:{ label:'Cleared unread signal', xp:8, extraXp:2 },
    mark_unread:{ label:'Flagged follow-up signal', xp:8, extraXp:2 },
    star:{ label:'Pinned priority signal', xp:9, extraXp:2 },
    unstar:{ label:'Unpinned signal', xp:4, extraXp:1 },
    archive:{ label:'Archived a handled message', xp:14, extraXp:4 },
    trash:{ label:'Moved noise out', xp:10, extraXp:3 },
    restore:{ label:'Recovered a message', xp:8, extraXp:2 },
    delete:{ label:'Closed trash permanently', xp:7, extraXp:1 },
    draft_save:{ label:'Saved a draft', xp:24 },
    draft_delete:{ label:'Cleared a draft', xp:8 },
    send:{ label:'Sent an email', xp:50 },
    reply_send:{ label:'Sent a thread reply', xp:55 },
    signature:{ label:'Inserted signature', xp:8, cooldownMs:15000 },
    attachment:{ label:'Queued attachment', xp:10, extraXp:4 },
    contact_insert:{ label:'Added quick contact', xp:6, cooldownMs:10000 },
    contact_save:{ label:'Saved contact', xp:28 },
    contact_sync:{ label:'Synced contacts', xp:20, cooldownMs:60000 },
    settings_save:{ label:'Saved profile settings', xp:20, cooldownMs:20000 },
    settings_sync:{ label:'Synced mailbox settings', xp:32, cooldownMs:30000 },
    alias_create:{ label:'Created alias', xp:35 },
    mailbox_provision:{ label:'Provisioned mailbox lane', xp:80 },
    watch:{ label:'Enabled push watch', xp:35, cooldownMs:60000 },
    proof_loop:{ label:'Completed proof loop', xp:70 },
    packet_archive:{ label:'Archived handoff packet', xp:44 },
    packet_review:{ label:'Advanced packet review', xp:24 },
    os_handoff:{ label:'Routed mail into the 0S', xp:38, cooldownMs:10000 },
    docx_handoff:{ label:'Opened mail in SkyeDocxMax', xp:32, cooldownMs:10000 },
    workspace_open:{ label:'Opened 0S workbench', xp:14, cooldownMs:30000 },
    calendar_refresh:{ label:'Checked calendar lane', xp:10, cooldownMs:30000 },
    calendar_save:{ label:'Saved calendar item', xp:32 },
    thread_open:{ label:'Opened thread', xp:12, cooldownMs:30000 },
    message_open:{ label:'Opened message', xp:8, cooldownMs:30000 },
    drafts_load:{ label:'Checked drafts', xp:5, cooldownMs:60000 }
  };
  const GAME_QUESTS = [
    { id:'daily-open', label:'Open the mailbox surface', actions:['visit','mailbox_load'], goal:1, xp:18 },
    { id:'daily-cleanup', label:'Handle 3 messages', actions:['archive','trash','mark_read','star','delete','restore'], goal:3, xp:36 },
    { id:'daily-compose', label:'Send or save one outbound move', actions:['send','reply_send','draft_save'], goal:1, xp:42 },
    { id:'daily-proof', label:'Prove or watch the lane', actions:['proof_loop','watch'], goal:1, xp:38 }
  ];
  const GAME_BADGES = [
    { id:'first-send', label:'First Send', xp:30, test:(state)=> countGame(state, 'send') + countGame(state, 'reply_send') >= 1 },
    { id:'draftsmith', label:'Draftsmith', xp:24, test:(state)=> countGame(state, 'draft_save') >= 1 },
    { id:'proof-runner', label:'Proof Runner', xp:36, test:(state)=> countGame(state, 'proof_loop') >= 1 },
    { id:'watch-keeper', label:'Watch Keeper', xp:28, test:(state)=> countGame(state, 'watch') >= 1 },
    { id:'signal-cleaner', label:'Signal Cleaner', xp:44, test:(state)=> cleanupCount(state) >= 10 },
    { id:'contact-linker', label:'Contact Linker', xp:26, test:(state)=> countGame(state, 'contact_save') + countGame(state, 'contact_sync') >= 1 },
    { id:'relay-streak', label:'3-Day Relay', xp:60, test:(state)=> Number(state.streak?.count || 0) >= 3 },
    { id:'level-three', label:'Flow Captain', xp:50, test:(state)=> currentGameLevel(state.xp).index >= 2 }
  ];

  function todayKey(date = new Date()){
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  }

  function yesterdayKey(){
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return todayKey(date);
  }

  function defaultGameState(){
    const date = todayKey();
    return {
      xp:0,
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString(),
      counters:{},
      daily:{ date, counters:{}, claimed:{} },
      streak:{ lastDate:'', count:0 },
      badges:[],
      timeline:[],
      lastActionAt:{}
    };
  }

  function normalizeGameState(state){
    const next = state && typeof state === 'object' ? state : defaultGameState();
    next.xp = Number(next.xp || 0);
    next.counters = next.counters && typeof next.counters === 'object' ? next.counters : {};
    next.daily = next.daily && typeof next.daily === 'object' ? next.daily : { date:todayKey(), counters:{}, claimed:{} };
    next.daily.counters = next.daily.counters && typeof next.daily.counters === 'object' ? next.daily.counters : {};
    next.daily.claimed = next.daily.claimed && typeof next.daily.claimed === 'object' ? next.daily.claimed : {};
    next.streak = next.streak && typeof next.streak === 'object' ? next.streak : { lastDate:'', count:0 };
    next.badges = Array.isArray(next.badges) ? next.badges : [];
    next.timeline = Array.isArray(next.timeline) ? next.timeline.slice(0, 20) : [];
    next.lastActionAt = next.lastActionAt && typeof next.lastActionAt === 'object' ? next.lastActionAt : {};
    const date = todayKey();
    if(next.daily.date !== date) next.daily = { date, counters:{}, claimed:{} };
    return next;
  }

  function loadGameState(){
    try{
      return normalizeGameState(JSON.parse(localStorage.getItem(GAME_STORAGE_KEY) || 'null'));
    }catch(_err){
      return defaultGameState();
    }
  }

  function saveGameState(state){
    const next = normalizeGameState(state);
    next.updatedAt = new Date().toISOString();
    try{ localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(next)); }catch(_err){}
    return next;
  }

  function countGame(state, action){
    return Number(state?.counters?.[action] || 0);
  }

  function dailyCountGame(state, action){
    return Number(state?.daily?.counters?.[action] || 0);
  }

  function cleanupCount(state){
    return ['archive','trash','mark_read','delete','restore'].reduce((total, action)=> total + countGame(state, action), 0);
  }

  function currentGameLevel(xp){
    const value = Number(xp || 0);
    let level = GAME_LEVELS[0];
    let index = 0;
    GAME_LEVELS.forEach((item, idx)=> {
      if(value >= item.min){ level = item; index = idx; }
    });
    const next = GAME_LEVELS[index + 1] || null;
    const span = next ? next.min - level.min : Math.max(1, value - level.min || 1);
    const progress = next ? Math.max(0, Math.min(100, Math.round(((value - level.min) / span) * 100))) : 100;
    return { ...level, index, number:index + 1, next, progress };
  }

  function questProgress(state, quest){
    return quest.actions.reduce((total, action)=> total + dailyCountGame(state, action), 0);
  }

  function pushGameEvent(state, event){
    state.timeline = [
      Object.assign({ at:new Date().toISOString() }, event),
      ...(state.timeline || [])
    ].slice(0, 16);
  }

  function addGameCount(bucket, key, amount){
    bucket[key] = Number(bucket[key] || 0) + amount;
  }

  function updateGameStreak(state){
    const today = todayKey();
    if(state.streak.lastDate === today) return;
    state.streak.count = state.streak.lastDate === yesterdayKey() ? Number(state.streak.count || 0) + 1 : 1;
    state.streak.lastDate = today;
  }

  function gameSummary(state = loadGameState()){
    const level = currentGameLevel(state.xp);
    const nextXp = level.next ? level.next.min - state.xp : 0;
    return { state, level, nextXp:Math.max(0, nextXp) };
  }

  function gamePanelBody(){
    const { state, level, nextXp } = gameSummary();
    const questRows = GAME_QUESTS.map((quest)=> {
      const value = Math.min(quest.goal, questProgress(state, quest));
      const done = value >= quest.goal;
      return `<div class="game-quest ${done ? 'complete':''}">
        <span>${safe(quest.label)}</span>
        <b>${done ? 'Done' : `${value}/${quest.goal}`}</b>
      </div>`;
    }).join('');
    const badgeRows = state.badges.length
      ? state.badges.slice(-4).map((id)=> GAME_BADGES.find((badge)=> badge.id === id)?.label || id).map((label)=>`<span class="game-badge">${safe(label)}</span>`).join('')
      : '<span class="game-badge muted">No badges yet</span>';
    return `
      <div class="rail-title">Mailbox Game</div>
      <div class="game-rank">
        <b>Lv ${level.number} ${safe(level.name)}</b>
        <span>${state.xp} XP${level.next ? ` • ${nextXp} to ${safe(level.next.name)}` : ' • max lane'}</span>
      </div>
      <div class="game-meter" aria-hidden="true"><i style="width:${level.progress}%"></i></div>
      <div class="game-split"><span>Streak</span><b>${Number(state.streak?.count || 0)} day${Number(state.streak?.count || 0) === 1 ? '' : 's'}</b></div>
      <div class="game-quests">${questRows}</div>
      <div class="game-badges">${badgeRows}</div>`;
  }

  function gameBoardHtml(){
    const { state, level } = gameSummary();
    const latest = (state.timeline || []).slice(0, 3).map((event)=>`<div class="game-feed-row"><span>${safe(event.label || event.type || 'Progress')}</span><b>${event.xp ? `+${event.xp} XP` : ''}</b></div>`).join('') || '<div class="game-feed-row"><span>No progress events yet.</span><b></b></div>';
    const handled = cleanupCount(state);
    return `
      <div class="toolbar">
        <div>
          <h2 style="margin:0 0 4px">Mailbox Game Board</h2>
          <div class="mini">Progress reacts to real inbox, compose, contacts, settings, proof, and cleanup actions.</div>
        </div>
        <div class="badge">Lv ${level.number} • ${state.xp} XP</div>
      </div>
      <div class="grid3 game-stat-grid">
        <div class="stat"><b>${countGame(state, 'send') + countGame(state, 'reply_send')}</b><span class="mini">sent signals</span></div>
        <div class="stat"><b>${handled}</b><span class="mini">messages handled</span></div>
        <div class="stat"><b>${state.badges.length}</b><span class="mini">badges unlocked</span></div>
      </div>
      <div class="game-feed">${latest}</div>`;
  }

  function renderGameSurfaces(){
    document.querySelectorAll('[data-game-panel]').forEach((el)=> { el.innerHTML = gamePanelBody(); });
    document.querySelectorAll('[data-game-board]').forEach((el)=> { el.innerHTML = gameBoardHtml(); });
    const { state, level } = gameSummary();
    document.querySelectorAll('[data-game-chip]').forEach((el)=> { el.textContent = `Lv ${level.number} • ${state.xp} XP`; });
  }

  function showGameToast(events){
    const visible = (events || []).filter(Boolean);
    if(!visible.length || document.hidden) return;
    const totalXp = visible.reduce((total, event)=> total + Number(event.xp || 0), 0);
    const label = visible[visible.length - 1]?.label || 'Progress updated';
    const toast = document.createElement('div');
    toast.className = 'game-toast';
    toast.innerHTML = `<b>${safe(label)}</b><span>${totalXp ? `+${totalXp} XP` : 'Progress updated'}</span>`;
    document.body.appendChild(toast);
    requestAnimationFrame(()=> toast.classList.add('active'));
    setTimeout(()=> {
      toast.classList.remove('active');
      setTimeout(()=> toast.remove(), 360);
    }, 2600);
  }

  function mountGameBoard(activeId, pageName){
    const main = document.querySelector('main.main');
    if(!main || document.querySelector('[data-game-board]')) return;
    const isDashboard = activeId === 'dashboard' && String(pageName || document.body.dataset.pageName || '').toLowerCase() === 'inbox';
    if(!isDashboard) return;
    const board = document.createElement('section');
    board.className = 'card game-board';
    board.setAttribute('data-game-board', '');
    const hero = main.querySelector('.hero');
    if(hero && hero.nextSibling) main.insertBefore(board, hero.nextSibling);
    else main.insertBefore(board, main.firstChild);
  }

  function trackGame(action, meta = {}, options = {}){
    const def = GAME_ACTIONS[action] || { label:'Mailbox progress', xp:5 };
    const amount = Math.max(1, Number(meta.count || 1) || 1);
    const state = loadGameState();
    const beforeLevel = currentGameLevel(state.xp).number;
    updateGameStreak(state);
    addGameCount(state.counters, action, amount);
    addGameCount(state.daily.counters, action, amount);
    addGameCount(state.counters, 'total_actions', 1);

    const now = Date.now();
    const actionKey = `${action}:${meta.id || meta.key || ''}`;
    const lastAt = Number(state.lastActionAt[actionKey] || 0);
    const onCooldown = def.cooldownMs && now - lastAt < def.cooldownMs;
    const dailyKey = `action:${action}`;
    const alreadyDaily = def.dailyOnce && state.daily.claimed[dailyKey];
    let xp = 0;
    const events = [];

    if(!onCooldown && !alreadyDaily){
      xp += Number(def.xp || 0) + Math.max(0, amount - 1) * Number(def.extraXp || 0);
      if(def.dailyOnce) state.daily.claimed[dailyKey] = true;
      if(xp) events.push({ type:'action', label:def.label, xp });
    }
    state.lastActionAt[actionKey] = now;

    GAME_QUESTS.forEach((quest)=> {
      const key = `quest:${quest.id}`;
      if(state.daily.claimed[key]) return;
      if(questProgress(state, quest) >= quest.goal){
        state.daily.claimed[key] = true;
        xp += quest.xp;
        events.push({ type:'quest', label:`Quest complete: ${quest.label}`, xp:quest.xp });
      }
    });

    GAME_BADGES.forEach((badge)=> {
      if(state.badges.includes(badge.id)) return;
      if(badge.test(state)){
        state.badges.push(badge.id);
        xp += badge.xp;
        events.push({ type:'badge', label:`Badge unlocked: ${badge.label}`, xp:badge.xp });
      }
    });

    if(xp) state.xp += xp;
    const afterLevel = currentGameLevel(state.xp).number;
    if(afterLevel > beforeLevel){
      const level = currentGameLevel(state.xp);
      events.push({ type:'level', label:`Level up: ${level.name}`, xp:0 });
    }
    events.forEach((event)=> pushGameEvent(state, event));
    saveGameState(state);
    renderGameSurfaces();
    if(!options.silent) showGameToast(events);
    return state;
  }

  function footerHtml(){
    return `<div class="footer"><div class="inner"><p>${CONTACT_HTML}</p></div></div>`;
  }

  function mountFooter(){
    const el = document.querySelector('#appFooter');
    if(el) el.innerHTML = footerHtml();
  }

  async function fetchStatus(){
    try{
      const data = await apiFetch('/mail-status');
      reconcileActiveMailbox(data);
      return data;
    }
    catch(_err){
      try{ return await apiFetch('/google-status'); }
      catch(err){ return { ok:false, connected:false, error: err.message || 'Status failed' }; }
    }
  }

  async function fetchLabels(){
    try{ const data = await apiFetch('/gmail-labels'); return data.items || []; }
    catch(err){ return []; }
  }

  function labelsMap(items){
    const map = {};
    (items || []).forEach((item)=>{ map[item.id] = item; });
    return map;
  }

  function countFor(labelMap, labelId){
    if(!labelId) return '';
    const row = labelMap[labelId];
    if(!row) return '';
    const count = Number(row.messagesUnread || row.messagesTotal || 0);
    return String(count);
  }

  function mailboxRows(status){
    return Array.isArray(status?.mailboxes) ? status.mailboxes.filter((item)=> item && item.mailbox_email) : [];
  }

  function activeMailboxEmail(status){
    return String(status?.selected_mailbox || status?.mailbox?.mailbox_email || status?.mailbox?.google_email || status?.gmail?.google_email || runtime.getActiveMailbox?.() || '').trim().toLowerCase();
  }

  function reconcileActiveMailbox(status){
    const current = activeMailboxEmail(status);
    if(current && runtime.setActiveMailbox) runtime.setActiveMailbox(current);
    return current;
  }

  function mailboxSwitcherHtml(status, variant='rail'){
    const rows = mailboxRows(status);
    if(!rows.length) return '';
    const current = activeMailboxEmail(status);
    const options = rows.map((item)=> {
      const value = String(item.mailbox_email || '').toLowerCase();
      const label = `${item.mailbox_email}${item.owner_handle ? ` · ${item.owner_handle}` : ''}`;
      const meta = `${Number(item.inbox_unread || 0)} unread / ${Number(item.inbox_total || 0)} inbox`;
      return `<option value="${safe(value)}" ${value === current ? 'selected' : ''}>${safe(label)} (${safe(meta)})</option>`;
    }).join('');
    return `
      <label class="mailbox-switcher mailbox-switcher-${safe(variant)}">
        <span>${variant === 'topbar' ? 'Inbox' : 'Active Inbox'}</span>
        <select data-mailbox-switcher aria-label="Active SkyeMail inbox">${options}</select>
      </label>`;
  }

  function bindMailboxSwitchers(){
    document.querySelectorAll('[data-mailbox-switcher]').forEach((el)=> {
      el.onchange = () => {
        const next = String(el.value || '').trim().toLowerCase();
        if(!next || !runtime.setActiveMailbox) return;
        runtime.setActiveMailbox(next);
        trackGame('mailbox_load', { key:next }, { silent:true });
        location.reload();
      };
    });
  }

  function renderRail({ activeId, labelMap = {}, status = null }){
    const rail = document.querySelector('#leftRail');
    if(!rail) return;
    const mailboxEmail = status?.mailbox?.mailbox_email || status?.mailbox?.google_email || status?.gmail?.google_email || '';
    const mailbox = status && status.connected && status.mailbox
      ? `Connected mailbox • ${mailboxEmail}`
      : 'No SkyeMail mailbox provisioned';
    const watch = status && status.connected
      ? (status.mailbox?.provisioning_status || status.mailbox?.watch_status || status.gmail?.watch_status || 'active')
      : 'inactive';
    rail.innerHTML = `
      <div class="rail-card">
        <div class="rail-title">Mailbox Surface</div>
        <div class="mini">${safe(mailbox)}</div>
        <div class="mini" style="margin-top:6px">Push watch: ${safe(watch)}</div>
        ${mailboxSwitcherHtml(status, 'rail')}
      </div>
      <div class="rail-card game-panel" data-game-panel>${gamePanelBody()}</div>
      <div class="rail-card">
        <div class="rail-title">Navigation</div>
        <div class="navlist">
          ${NAV_ITEMS.map((item)=>`
            <a class="navitem ${item.id===activeId?'active':''}" href="${runtime.href(item.href)}">
              <div class="left"><span>${item.label}</span><small>${item.hint || ''}</small></div>
              ${item.labelId ? `<span class="count">${safe(countFor(labelMap, item.labelId))}</span>` : ''}
            </a>`).join('')}
        </div>
      </div>
      <div class="rail-card">
        <div class="rail-title">Quick Actions</div>
        <div class="btnrow" style="margin-top:0">
          <a class="btn gold" href="${runtime.href('compose.html')}">Compose</a>
          <a class="btn" href="${runtime.href('onboarding.html')}">Onboarding</a>
          <button class="btn danger" type="button" id="railLogoutBtn">Logout</button>
        </div>
      </div>
      <div class="rail-card">
        <div class="rail-title">Operator Contact</div>
        <div class="mini">${CONTACT_HTML}</div>
      </div>`;
	    const logoutBtn = document.querySelector('#railLogoutBtn');
	    if(logoutBtn) logoutBtn.onclick = logout;
    bindMailboxSwitchers();
	  }

  function renderTopbar(activeId, pageName, pageHint, status = null){
    const top = document.querySelector('#pageTopbar');
    if(!top) return;
    const runtimeHint = 'Citadel/SkyeNet sovereign mail core';
    top.innerHTML = `
      <div class="topbar">
        <div class="nav">
          <div class="brand">
            <img src="/assets/skyes-over-london-deity-logo.png" alt="Skyes Over London LC Logo" />
            <div class="name"><b>SkyeMail Citadel</b><span>${safe(pageName || 'Mail command center')} • ${safe(pageHint || runtimeHint)} • ${safe(runtimeHint)}</span></div>
          </div>
          <div class="navlinks">
            ${mailboxSwitcherHtml(status, 'topbar')}
	            ${NAV_ITEMS.slice(0,5).map((item)=>`<a class="pill ${item.id===activeId?'active':''}" href="${runtime.href(item.href)}">${item.label}</a>`).join('')}
	            <a class="pill ${activeId==='brain'?'active':''}" href="${runtime.href('brain.html')}">Brain</a>
	            <a class="pill ${activeId==='workspace'?'active':''}" href="${runtime.href('workspace.html')}">0S</a>
	            <a class="pill" href="${runtime.href('compose.html')}">Compose</a>
            <button class="pill game-pill" id="gameFocusBtn" data-game-chip type="button">${gameSummary().state.xp} XP</button>
            <button class="pill" id="topLogoutBtn" type="button">Logout</button>
          </div>
        </div>
      </div>`;
	    const btn = document.querySelector('#topLogoutBtn');
	    if(btn) btn.onclick = logout;
    bindMailboxSwitchers();
    const gameBtn = document.querySelector('#gameFocusBtn');
    if(gameBtn) gameBtn.onclick = ()=> {
      const target = document.querySelector('[data-game-board]') || document.querySelector('[data-game-panel]');
      if(target) target.scrollIntoView({ behavior:'smooth', block:'center' });
    };
  }

  function getCheckedIds(selector='[data-mail-check]:checked'){
    return Array.from(document.querySelectorAll(selector)).map((el)=>String(el.value||'').trim()).filter(Boolean);
  }

  async function batchModify(ids, addLabelIds=[], removeLabelIds=[]){
    if(!ids.length) throw new Error('Select at least one message first.');
    const data = await apiFetch('/gmail-batch-modify', { method:'POST', body: JSON.stringify({ ids, addLabelIds, removeLabelIds }) });
    if(removeLabelIds.includes('INBOX')) trackGame('archive', { count:ids.length });
    else if(removeLabelIds.includes('UNREAD')) trackGame('mark_read', { count:ids.length });
    else if(addLabelIds.includes('UNREAD')) trackGame('mark_unread', { count:ids.length });
    else if(addLabelIds.includes('STARRED')) trackGame('star', { count:ids.length });
    else if(removeLabelIds.includes('STARRED')) trackGame('unstar', { count:ids.length });
    return data;
  }

  async function trashMessages(ids){
    if(!ids.length) throw new Error('Select at least one message first.');
    const data = await apiFetch('/gmail-message-trash', { method:'POST', body: JSON.stringify({ ids, action:'trash' }) });
    trackGame('trash', { count:ids.length });
    return data;
  }

  async function untrashMessages(ids){
    if(!ids.length) throw new Error('Select at least one message first.');
    const data = await apiFetch('/gmail-message-trash', { method:'POST', body: JSON.stringify({ ids, action:'untrash' }) });
    trackGame('restore', { count:ids.length });
    return data;
  }

  async function deleteMessages(ids){
    if(!ids.length) throw new Error('Select at least one message first.');
    const data = await apiFetch('/gmail-batch-delete', { method:'POST', body: JSON.stringify({ ids }) });
    trackGame('delete', { count:ids.length });
    return data;
  }

  async function connectGoogle(next='dashboard.html'){
    const nextHref = runtime.href(next);
    const data = await apiFetch(`/google-oauth-start?mode=json&next=${encodeURIComponent(nextHref)}`);
    location.href = data.url;
  }

  async function disconnectGoogle(){
    return await apiFetch('/google-disconnect', { method:'POST', body: JSON.stringify({}) });
  }

  async function enableWatch(){
    const data = await apiFetch('/gmail-watch', { method:'POST', body: JSON.stringify({}) });
    trackGame('watch');
    return data;
  }

  async function withBoot(activeId, pageName, pageHint){
    if(!requireAuthOrRedirect()) return null;
    trackGame('visit', { page:activeId }, { silent:true });
    const [status, labels] = await Promise.all([fetchStatus(), fetchLabels()]);
    renderTopbar(activeId, pageName, pageHint, status);
    renderRail({ activeId, status, labelMap: labelsMap(labels) });
    mountFooter();
    mountGameBoard(activeId, pageName);
    renderGameSurfaces();
    return { status, labels };
  }

  function emailOnly(value){
    const s = String(value || '');
    const m = s.match(/<([^>]+)>/);
    if(m) return m[1].trim().toLowerCase();
    const plain = s.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    return plain ? plain[0].trim().toLowerCase() : '';
  }

  function nameFromAddress(value){
    const s = String(value || '').trim();
    if(!s) return '';
    const m = s.match(/^\s*"?([^"<]+?)"?\s*</);
    if(m) return m[1].trim();
    const email = emailOnly(s);
    return email ? email.split('@')[0] : s;
  }

  function encodeAttr(value){
    return String(value || '').replace(/[&<>"]/g, (c)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
  }

  function htmlMessage(body){
    const html = String(body && body.html || '');
    const text = String(body && body.text || '');
    if(html){
      return `<iframe class="message-frame" sandbox="" srcdoc="${encodeAttr(html)}"></iframe>`;
    }
    return `<pre class="message-pre">${safe(text)}</pre>`;
  }

  return {
    NAV_ITEMS,
    footerHtml,
    mountFooter,
    fetchStatus,
    fetchLabels,
    labelsMap,
    activeMailboxEmail,
    reconcileActiveMailbox,
    renderRail,
    renderTopbar,
    getCheckedIds,
    batchModify,
    trashMessages,
    untrashMessages,
    deleteMessages,
    connectGoogle,
    disconnectGoogle,
    enableWatch,
    withBoot,
    trackGame,
    gameSummary,
    renderGameSurfaces,
    emailOnly,
    nameFromAddress,
    encodeAttr,
    htmlMessage,
  };
})();
