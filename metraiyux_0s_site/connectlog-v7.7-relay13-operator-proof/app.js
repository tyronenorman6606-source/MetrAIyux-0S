(() => {
  'use strict';

  const APP_VERSION = '7.7.0';
  const DB_NAME = 'connectlog-db';
  const DB_VERSION = 5;
  const STORE_CONTACTS = 'contacts';
  const STORE_META = 'meta';
  const META_PROFILE = 'exchange-profile';
  const META_PROFILE_CARDS = 'exchange-profile-cards';
  const META_RELAY_CONFIG = 'relay13-config';
  const META_RELAY_THREADS = 'relay13-local-threads';
  const META_RELAY_OUTBOX = 'relay13-local-outbox';
  const META_RELAY_REQUESTS = 'relay13-bridge-requests';
  const META_RELAY_STATS = 'relay13-bridge-stats';
  const META_SKYES_CONTACT_PACKET = 'skyes-over-london-contact-packet-v1';
  const CONNECT_HASH_PREFIX = 'connect=';
  const MAX_PROFILE_PHOTO_BYTES = 8 * 1024 * 1024;
  const QR_PHOTO_MAX_CHARS = 1800;
  const LEGACY_KEY = 'offline-contacts-v1';
  const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
  const priorityWeight = { critical: 4, high: 3, normal: 2, low: 1 };
  const laneOptions = ['lead', 'client', 'partner', 'vendor', 'investor', 'community', 'personal', 'other'];
  const detailTypes = [
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'website', label: 'Website' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'x', label: 'X / Twitter' },
    { value: 'github', label: 'GitHub' },
    { value: 'location', label: 'Location' },
    { value: 'custom', label: 'Custom' }
  ];

  const state = {
    contacts: [],
    filtered: [],
    query: '',
    lane: 'all',
    status: 'all',
    priority: 'all',
    sort: 'updated',
    tag: 'all',
    dueOnly: false,
    pinnedOnly: false,
    editing: null,
    draftTags: [],
    draftDetails: [],
    draftTimeline: [],
    deletedSnapshot: null,
    profile: null,
    profileCards: [],
    activeProfileCardId: '',
    editingProfileCardId: '',
    pendingPhotoData: '',
    pendingPhotoThumbData: '',
    pendingPhotoName: '',
    relayConfig: null,
    relayThreads: [],
    relayOutbox: [],
    relayRequests: [],
    relayStats: null,
    activeRelayThreadId: '',
    relayStatus: 'Relay13 production bridge live',
    menuCollapsed: false,
    activeQrPayload: '',
    activeQrSvg: '',
    activeQrKind: '',
    businessCardScan: null,
    deferredInstallPrompt: null,
    scanStream: null,
    scanLoop: null,
    seedLog: [],
    duplicateGroups: [],
    db: null
  };

  const $ = (selector) => document.querySelector(selector);
  const els = {};

  function gateBridge() {
    return window.MetrAIyuxGateBridge || (window.parent && window.parent !== window ? window.parent.MetrAIyuxGateBridge : null);
  }

  function gateToken() {
    const session = gateBridge()?.requireSession?.({ platformId: 'connectlog-relay13', usageLane: 'relationship-messaging' })
      || gateBridge()?.current?.();
    if (session?.token) return session.token;
    try {
      const raw = sessionStorage.getItem('METRAIYUX_GATE_SESSION') || localStorage.getItem('METRAIYUX_GATE_SESSION') || '';
      return raw.trim().startsWith('{') ? JSON.parse(raw).token || '' : raw.trim();
    } catch {
      return '';
    }
  }

  function relayOperatorToken(cfg = state.relayConfig || {}) {
    return gateToken();
  }

  function relayOperatorHeaders(cfg = state.relayConfig || {}, extra = {}) {
    const token = relayOperatorToken(cfg);
    return {
      ...(gateBridge()?.headers?.({ 'x-skye-platform': 'connectlog-relay13', 'x-skye-usage-lane': 'relationship-messaging' }) || {}),
      ...(token ? { authorization: `Bearer ${token}`, 'x-skye-gate-session': token, 'x-free99-gate-session': token } : {}),
      ...extra
    };
  }

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    bindElements();
    bindEvents();
    restoreMenuState();
    await openDatabase();
    await migrateLegacyLocalStorage();
    await loadContacts();
    await loadProfile();
    await loadRelayState();
    await applySkyesContactPacket();
    await processIncomingConnectCard();
    await checkStorageHealth();
    setupServiceWorker();
    setupInstallPrompt();
    setDefaultTimelineDate();
    renderAll();
    renderSeedResults();
  }

  function bindElements() {
    Object.assign(els, {
      addContactBtn: $('#addContactBtn'),
      emptyAddBtn: $('#emptyAddBtn'),
      quickLogBtn: $('#quickLogBtn'),
      heroShareBtn: $('#heroShareBtn'),
      heroScanBtn: $('#heroScanBtn'),
      appShell: $('#appShell'),
      menuCollapseBtn: $('#menuCollapseBtn'),
      searchInput: $('#searchInput'),
      laneFilter: $('#laneFilter'),
      statusFilter: $('#statusFilter'),
      priorityFilter: $('#priorityFilter'),
      sortSelect: $('#sortSelect'),
      dueOnlyToggle: $('#dueOnlyToggle'),
      pinnedOnlyToggle: $('#pinnedOnlyToggle'),
      clearFiltersBtn: $('#clearFiltersBtn'),
      contactGrid: $('#contactGrid'),
      emptyState: $('#emptyState'),
      resultCount: $('#resultCount'),
      tagRail: $('#tagRail'),
      followupList: $('#followupList'),
      storageHealth: $('#storageHealth'),
      statTotal: $('#statTotal'),
      statDue: $('#statDue'),
      statPinned: $('#statPinned'),
      statHigh: $('#statHigh'),
      statDormant: $('#statDormant'),
      statUpcoming: $('#statUpcoming'),
      contactDialog: $('#contactDialog'),
      contactForm: $('#contactForm'),
      closeDialogBtn: $('#closeDialogBtn'),
      cancelDialogBtn: $('#cancelDialogBtn'),
      dialogMode: $('#dialogMode'),
      dialogTitle: $('#dialogTitle'),
      contactId: $('#contactId'),
      nameInput: $('#nameInput'),
      companyInput: $('#companyInput'),
      roleInput: $('#roleInput'),
      laneInput: $('#laneInput'),
      statusInput: $('#statusInput'),
      priorityInput: $('#priorityInput'),
      nextFollowUpInput: $('#nextFollowUpInput'),
      tagEditor: $('#tagEditor'),
      tagInput: $('#tagInput'),
      detailsStack: $('#detailsStack'),
      addDetailBtn: $('#addDetailBtn'),
      notesInput: $('#notesInput'),
      addTimelineBtn: $('#addTimelineBtn'),
      timelineComposer: $('#timelineComposer'),
      timelineTypeInput: $('#timelineTypeInput'),
      timelineDateInput: $('#timelineDateInput'),
      timelineTextInput: $('#timelineTextInput'),
      commitTimelineBtn: $('#commitTimelineBtn'),
      timelineList: $('#timelineList'),
      exportJsonBtn: $('#exportJsonBtn'),
      exportCsvBtn: $('#exportCsvBtn'),
      exportVcardsBtn: $('#exportVcardsBtn'),
      importInput: $('#importInput'),
      wipeBtn: $('#wipeBtn'),
      setupProfileBtn: $('#setupProfileBtn'),
      showShareBtn: $('#showShareBtn'),
      scanQrBtn: $('#scanQrBtn'),
      showVcardQrBtn: $('#showVcardQrBtn'),
      copyShareLinkBtn: $('#copyShareLinkBtn'),
      installAppBtn: $('#installAppBtn'),
      profileSummary: $('#profileSummary'),
      profileCardSelect: $('#profileCardSelect'),
      profileCardGrid: $('#profileCardGrid'),
      newProfileCardBtn: $('#newProfileCardBtn'),
      newProfileCardBtnAlt: $('#newProfileCardBtnAlt'),
      duplicateProfileCardBtn: $('#duplicateProfileCardBtn'),
      deleteProfileCardBtn: $('#deleteProfileCardBtn'),
      qrStage: $('#qrStage'),
      qrOutput: $('#qrOutput'),
      qrModeLabel: $('#qrModeLabel'),
      qrTitle: $('#qrTitle'),
      qrDescription: $('#qrDescription'),
      shareLinkOutput: $('#shareLinkOutput'),
      downloadVcardBtn: $('#downloadVcardBtn'),
      downloadQrSvgBtn: $('#downloadQrSvgBtn'),
      copyQrPayloadBtn: $('#copyQrPayloadBtn'),
      downloadProfileQrCardBtn: $('#downloadProfileQrCardBtn'),
      profileDialog: $('#profileDialog'),
      profileForm: $('#profileForm'),
      closeProfileBtn: $('#closeProfileBtn'),
      cancelProfileBtn: $('#cancelProfileBtn'),
      profileCardNameInput: $('#profileCardNameInput'),
      profileAudienceInput: $('#profileAudienceInput'),
      profileNameInput: $('#profileNameInput'),
      profileCompanyInput: $('#profileCompanyInput'),
      profileRoleInput: $('#profileRoleInput'),
      profileEmailInput: $('#profileEmailInput'),
      profilePhoneInput: $('#profilePhoneInput'),
      profileWebsiteInput: $('#profileWebsiteInput'),
      profileLinkedinInput: $('#profileLinkedinInput'),
      profileXInput: $('#profileXInput'),
      profileGithubInput: $('#profileGithubInput'),
      profileLocationInput: $('#profileLocationInput'),
      profilePhotoInput: $('#profilePhotoInput'),
      profilePhotoPreview: $('#profilePhotoPreview'),
      clearProfilePhotoBtn: $('#clearProfilePhotoBtn'),
      profileWelcomeInput: $('#profileWelcomeInput'),
      profileNoteInput: $('#profileNoteInput'),
      profileTagsInput: $('#profileTagsInput'),
      scanDialog: $('#scanDialog'),
      scanForm: $('#scanForm'),
      closeScanBtn: $('#closeScanBtn'),
      cancelScanBtn: $('#cancelScanBtn'),
      startScannerBtn: $('#startScannerBtn'),
      stopScannerBtn: $('#stopScannerBtn'),
      importScannedPayloadBtn: $('#importScannedPayloadBtn'),
      scanVideo: $('#scanVideo'),
      scanCanvas: $('#scanCanvas'),
      scannerPlaceholder: $('#scannerPlaceholder'),
      scanPayloadInput: $('#scanPayloadInput'),
      scanStatus: $('#scanStatus'),
      scanSeedBtn: $('#scanSeedBtn'),
      downloadSeedTemplateBtn: $('#downloadSeedTemplateBtn'),
      seedResults: $('#seedResults'),
      statTasks: $('#statTasks'),
      statActionable: $('#statActionable'),
      missionBrief: $('#missionBrief'),
      relationshipQueue: $('#relationshipQueue'),
      requestPersistenceBtn: $('#requestPersistenceBtn'),
      exportAgendaBtn: $('#exportAgendaBtn'),
      exportWarmCsvBtn: $('#exportWarmCsvBtn'),
      copyDailyBriefBtn: $('#copyDailyBriefBtn'),
      findDuplicatesBtn: $('#findDuplicatesBtn'),
      copyIntroTemplateBtn: $('#copyIntroTemplateBtn'),
      importCsvInput: $('#importCsvInput'),
      dedupeDialog: $('#dedupeDialog'),
      dedupeResults: $('#dedupeResults'),
      closeDedupeBtn: $('#closeDedupeBtn'),
      quickLogDialog: $('#quickLogDialog'),
      quickLogForm: $('#quickLogForm'),
      closeQuickLogBtn: $('#closeQuickLogBtn'),
      cancelQuickLogBtn: $('#cancelQuickLogBtn'),
      quickNameInput: $('#quickNameInput'),
      quickNoteInput: $('#quickNoteInput'),
      quickTagsInput: $('#quickTagsInput'),
      quickFollowUpInput: $('#quickFollowUpInput'),
      relayModeInput: $('#relayModeInput'),
      relayOriginInput: $('#relayOriginInput'),
      relayWorkspaceInput: $('#relayWorkspaceInput'),
      relayWorkspaceIdInput: $('#relayWorkspaceIdInput'),
      relayApiKeyInput: $('#relayApiKeyInput'),
      relayOperatorNameInput: $('#relayOperatorNameInput'),
      relayShareBridgeInput: $('#relayShareBridgeInput'),
      relaySaveSettingsBtn: $('#relaySaveSettingsBtn'),
      relayHealthBtn: $('#relayHealthBtn'),
      relayBridgeHealthBtn: $('#relayBridgeHealthBtn'),
      relaySyncCardBtn: $('#relaySyncCardBtn'),
      relayRefreshRequestsBtn: $('#relayRefreshRequestsBtn'),
      relayStatsBtn: $('#relayStatsBtn'),
      relayRefreshMessagesBtn: $('#relayRefreshMessagesBtn'),
      relayCopyWebSocketProofBtn: $('#relayCopyWebSocketProofBtn'),
      relayRunActivationProofBtn: $('#relayRunActivationProofBtn'),
      relayCopyActivationCurlBtn: $('#relayCopyActivationCurlBtn'),
      relayCopyCardPayloadBtn: $('#relayCopyCardPayloadBtn'),
      relayCreateThreadBtn: $('#relayCreateThreadBtn'),
      relaySyncOutboxBtn: $('#relaySyncOutboxBtn'),
      relayRefreshThreadsBtn: $('#relayRefreshThreadsBtn'),
      relayOpenAdminBtn: $('#relayOpenAdminBtn'),
      relayConnectionStatus: $('#relayConnectionStatus'),
      relayThreadList: $('#relayThreadList'),
      relayMessageLog: $('#relayMessageLog'),
      relayMessageInput: $('#relayMessageInput'),
      relaySendBtn: $('#relaySendBtn'),
      relayFallbackLog: $('#relayFallbackLog'),
      relayRequestList: $('#relayRequestList'),
      relayProofOutput: $('#relayProofOutput'),
      deploymentStatusDeck: $('#deploymentStatusDeck'),
      deploymentChecklist: $('#deploymentChecklist'),
      deploymentConfigOutput: $('#deploymentConfigOutput'),
      runLocalDiagnosticsBtn: $('#runLocalDiagnosticsBtn'),
      copyConnectLogDeployBtn: $('#copyConnectLogDeployBtn'),
      copyRelayDeployBtn: $('#copyRelayDeployBtn'),
      copyRelayEnvBtn: $('#copyRelayEnvBtn'),
      relayRunPreflightBtn: $('#relayRunPreflightBtn'),
      relayCopyOperatorRunbookBtn: $('#relayCopyOperatorRunbookBtn'),
      relayCopyBootstrapCurlBtn: $('#relayCopyBootstrapCurlBtn'),
      relayCopyApiKeyCurlBtn: $('#relayCopyApiKeyCurlBtn'),
      relayCopyLiveProofBtn: $('#relayCopyLiveProofBtn'),
      relayExportBridgeConfigBtn: $('#relayExportBridgeConfigBtn'),
      relayImportBridgeConfigInput: $('#relayImportBridgeConfigInput'),
      relayOperatorRunbookOutput: $('#relayOperatorRunbookOutput'),
      toast: $('#toast')
    });
  }

  function bindEvents() {
    els.addContactBtn.addEventListener('click', () => openContactDialog());
    els.emptyAddBtn.addEventListener('click', () => openContactDialog());
    els.quickLogBtn.addEventListener('click', openQuickLogDialog);
    els.heroShareBtn.addEventListener('click', showConnectLogQr);
    els.heroScanBtn.addEventListener('click', openScanDialog);
    els.menuCollapseBtn?.addEventListener('click', toggleMenuCollapsed);
    els.setupProfileBtn.addEventListener('click', () => openProfileDialog());
    els.newProfileCardBtn?.addEventListener('click', () => openProfileDialog(null, { newVariant: true }));
    els.newProfileCardBtnAlt?.addEventListener('click', () => openProfileDialog(null, { newVariant: true }));
    els.duplicateProfileCardBtn?.addEventListener('click', duplicateActiveProfileCard);
    els.deleteProfileCardBtn?.addEventListener('click', deleteActiveProfileCard);
    els.profileCardSelect?.addEventListener('change', () => setActiveProfileCard(els.profileCardSelect.value));
    els.showShareBtn.addEventListener('click', showConnectLogQr);
    els.scanQrBtn.addEventListener('click', openScanDialog);
    els.showVcardQrBtn.addEventListener('click', showVcardQr);
    els.copyShareLinkBtn.addEventListener('click', copyConnectLogLink);
    els.installAppBtn.addEventListener('click', installApp);
    els.downloadVcardBtn.addEventListener('click', downloadProfileVcard);
    els.downloadQrSvgBtn.addEventListener('click', downloadQrSvg);
    els.copyQrPayloadBtn.addEventListener('click', copyActiveQrPayload);
    els.downloadProfileQrCardBtn.addEventListener('click', downloadProfileQrCard);
    els.profileForm.addEventListener('submit', saveProfileFromForm);
    els.closeProfileBtn.addEventListener('click', closeProfileDialog);
    els.cancelProfileBtn.addEventListener('click', closeProfileDialog);
    els.profilePhotoInput?.addEventListener('change', handleProfilePhotoInput);
    els.clearProfilePhotoBtn?.addEventListener('click', clearProfilePhotoDraft);
    els.profileCardGrid?.addEventListener('click', handleProfileCardGridClick);
    els.relaySaveSettingsBtn?.addEventListener('click', saveRelaySettings);
    els.relayHealthBtn?.addEventListener('click', checkRelayHealth);
    els.relayBridgeHealthBtn?.addEventListener('click', checkRelayBridgeHealth);
    els.relaySyncCardBtn?.addEventListener('click', syncActiveCardToRelay);
    els.relayRefreshRequestsBtn?.addEventListener('click', refreshRelayRequests);
    els.relayStatsBtn?.addEventListener('click', fetchRelayStats);
    els.relayRefreshMessagesBtn?.addEventListener('click', refreshActiveRelayMessages);
    els.relayCopyWebSocketProofBtn?.addEventListener('click', copyRelayWebSocketProofBlock);
    els.relayRunActivationProofBtn?.addEventListener('click', runRelayActivationProof);
    els.relayCopyActivationCurlBtn?.addEventListener('click', copyRelayActivationCurlBlock);
    els.relayCopyCardPayloadBtn?.addEventListener('click', copyActiveRelayCardPayload);
    els.relayCreateThreadBtn?.addEventListener('click', createRelayThreadFromActiveCard);
    els.relaySyncOutboxBtn?.addEventListener('click', syncRelayOutbox);
    els.relayRefreshThreadsBtn?.addEventListener('click', refreshRelayThreads);
    els.relayOpenAdminBtn?.addEventListener('click', openRelayAdmin);
    els.relayThreadList?.addEventListener('click', handleRelayThreadClick);
    els.relayRequestList?.addEventListener('click', handleRelayRequestAction);
    els.relaySendBtn?.addEventListener('click', sendRelayMessage);
    els.relayMessageInput?.addEventListener('keydown', (event) => { if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') sendRelayMessage(); });
    els.runLocalDiagnosticsBtn?.addEventListener('click', runLocalDiagnostics);
    els.copyConnectLogDeployBtn?.addEventListener('click', copyConnectLogDeployBlock);
    els.copyRelayDeployBtn?.addEventListener('click', copyRelayDeployBlock);
    els.copyRelayEnvBtn?.addEventListener('click', copyRelayEnvBlock);
    els.relayRunPreflightBtn?.addEventListener('click', runRelayPreflightChecklist);
    els.relayCopyOperatorRunbookBtn?.addEventListener('click', copyRelayOperatorRunbookBlock);
    els.relayCopyBootstrapCurlBtn?.addEventListener('click', copyRelayBootstrapCurlBlock);
    els.relayCopyApiKeyCurlBtn?.addEventListener('click', copyRelayApiKeyCurlBlock);
    els.relayCopyLiveProofBtn?.addEventListener('click', copyRelayLiveProofBlock);
    els.relayExportBridgeConfigBtn?.addEventListener('click', exportRelayBridgeConfig);
    els.relayImportBridgeConfigInput?.addEventListener('change', importRelayBridgeConfig);
    els.searchInput.addEventListener('input', () => { state.query = els.searchInput.value; renderAll(); });
    els.laneFilter.addEventListener('change', () => { state.lane = els.laneFilter.value; renderAll(); });
    els.statusFilter.addEventListener('change', () => { state.status = els.statusFilter.value; renderAll(); });
    els.priorityFilter.addEventListener('change', () => { state.priority = els.priorityFilter.value; renderAll(); });
    els.sortSelect.addEventListener('change', () => { state.sort = els.sortSelect.value; renderAll(); });
    els.dueOnlyToggle.addEventListener('click', () => togglePressed('dueOnly'));
    els.pinnedOnlyToggle.addEventListener('click', () => togglePressed('pinnedOnly'));
    els.clearFiltersBtn.addEventListener('click', clearFilters);
    els.closeDialogBtn.addEventListener('click', closeContactDialog);
    els.cancelDialogBtn.addEventListener('click', closeContactDialog);
    els.contactForm.addEventListener('submit', saveContactFromForm);
    els.tagInput.addEventListener('keydown', handleTagInput);
    els.addDetailBtn.addEventListener('click', () => addDetailRow());
    els.detailsStack.addEventListener('input', updateDetailDraft);
    els.detailsStack.addEventListener('change', updateDetailDraft);
    els.detailsStack.addEventListener('click', handleDetailClick);
    els.addTimelineBtn.addEventListener('click', () => { els.timelineComposer.hidden = !els.timelineComposer.hidden; els.timelineTextInput.focus(); });
    els.commitTimelineBtn.addEventListener('click', addTimelineDraftItem);
    els.timelineList.addEventListener('click', handleTimelineClick);
    els.contactGrid.addEventListener('click', handleCardClick);
    els.tagRail.addEventListener('click', handleTagRailClick);
    els.followupList.addEventListener('click', handleFollowupClick);
    els.exportJsonBtn.addEventListener('click', exportJson);
    els.exportCsvBtn.addEventListener('click', exportCsv);
    els.exportVcardsBtn.addEventListener('click', exportAllVcards);
    els.importInput.addEventListener('change', importJsonFile);
    els.importCsvInput?.addEventListener('change', importCsvFile);
    els.requestPersistenceBtn?.addEventListener('click', requestPersistentStorage);
    els.exportAgendaBtn?.addEventListener('click', exportDailyAgenda);
    els.exportWarmCsvBtn?.addEventListener('click', exportWarmListCsv);
    els.copyDailyBriefBtn?.addEventListener('click', copyDailyBrief);
    els.findDuplicatesBtn?.addEventListener('click', openDedupeDialog);
    els.copyIntroTemplateBtn?.addEventListener('click', copyIntroTemplate);
    els.closeDedupeBtn?.addEventListener('click', closeDedupeDialog);
    els.dedupeResults?.addEventListener('click', handleDedupeClick);
    els.relationshipQueue?.addEventListener('click', handleQueueClick);
    els.wipeBtn.addEventListener('click', wipeLocalData);
    els.scanForm.addEventListener('submit', importScannedPayload);
    els.closeScanBtn.addEventListener('click', closeScanDialog);
    els.cancelScanBtn.addEventListener('click', closeScanDialog);
    els.startScannerBtn.addEventListener('click', startQrScanner);
    els.stopScannerBtn.addEventListener('click', stopQrScanner);
    els.scanSeedBtn.addEventListener('click', scanSeedFolder);
    els.downloadSeedTemplateBtn.addEventListener('click', downloadSeedTemplate);
    els.quickLogForm.addEventListener('submit', saveQuickLog);
    els.closeQuickLogBtn.addEventListener('click', closeQuickLogDialog);
    els.cancelQuickLogBtn.addEventListener('click', closeQuickLogDialog);
    bindRoomTabs();
    document.addEventListener('keydown', handleGlobalKeys);
  }

  function bindRoomTabs() {
    document.querySelectorAll('[data-room-group][data-room-target]').forEach((tab) => {
      tab.addEventListener('click', () => {
        const group = tab.dataset.roomGroup;
        const target = tab.dataset.roomTarget;
        const scopeSelector = group === 'deploy' ? '.deployment-panel' : '.relay-panel';
        const scope = tab.closest(scopeSelector);
        if (!scope || !target) return;
        scope.dataset.activeRoom = target;
        scope.querySelectorAll(`[data-room-group="${group}"]`).forEach((peer) => {
          const isActive = peer === tab;
          peer.classList.toggle('active', isActive);
          peer.setAttribute('aria-pressed', String(isActive));
        });
      });
    });

    document.querySelectorAll('.mail-folder[data-relay-folder]').forEach((button) => {
      button.addEventListener('click', () => {
        state.relayMailboxFilter = button.dataset.relayFolder || 'inbox';
        document.querySelectorAll('.mail-folder[data-relay-folder]').forEach((peer) => {
          const isActive = peer === button;
          peer.classList.toggle('active', isActive);
          peer.setAttribute('aria-pressed', String(isActive));
        });
        if (els.relayConnectionStatus) {
          const label = button.textContent.replace(/\s+/g, ' ').trim();
          els.relayConnectionStatus.textContent = `Relay13 folder selected: ${label}`;
        }
        renderRelayThreads();
      });
    });
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_CONTACTS)) {
          const contacts = db.createObjectStore(STORE_CONTACTS, { keyPath: 'id' });
          contacts.createIndex('updatedAt', 'updatedAt', { unique: false });
          contacts.createIndex('nextFollowUpAt', 'nextFollowUpAt', { unique: false });
        }
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META, { keyPath: 'key' });
        }
      };
      request.onsuccess = () => { state.db = request.result; resolve(); };
      request.onerror = () => reject(request.error);
      request.onblocked = () => showToast('Database upgrade blocked. Close other ConnectLog tabs and reload.');
    });
  }

  function tx(storeName, mode = 'readonly') {
    return state.db.transaction(storeName, mode).objectStore(storeName);
  }

  function getAllContacts() {
    return new Promise((resolve, reject) => {
      const request = tx(STORE_CONTACTS).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  function putContact(contact) {
    return new Promise((resolve, reject) => {
      const request = tx(STORE_CONTACTS, 'readwrite').put(contact);
      request.onsuccess = () => resolve(contact);
      request.onerror = () => reject(request.error);
    });
  }

  function deleteContactById(id) {
    return new Promise((resolve, reject) => {
      const request = tx(STORE_CONTACTS, 'readwrite').delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  function clearContactStore() {
    return new Promise((resolve, reject) => {
      const request = tx(STORE_CONTACTS, 'readwrite').clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async function loadContacts() {
    state.contacts = (await getAllContacts()).map(normalizeContact).sort(sortByUpdatedDesc);
  }

  function getMeta(key) {
    return new Promise((resolve, reject) => {
      const request = tx(STORE_META).get(key);
      request.onsuccess = () => resolve(request.result?.value || null);
      request.onerror = () => reject(request.error);
    });
  }

  function putMeta(key, value) {
    return new Promise((resolve, reject) => {
      const request = tx(STORE_META, 'readwrite').put({ key, value, updatedAt: new Date().toISOString() });
      request.onsuccess = () => resolve(value);
      request.onerror = () => reject(request.error);
    });
  }

  function clearMetaStore() {
    return new Promise((resolve, reject) => {
      const request = tx(STORE_META, 'readwrite').clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async function loadProfile() {
    const savedCards = await getMeta(META_PROFILE_CARDS);
    const legacyProfile = await getMeta(META_PROFILE);
    const cards = Array.isArray(savedCards) ? savedCards.map(normalizeProfile).filter((card) => card.name) : [];
    if (!cards.length && legacyProfile) {
      cards.push(normalizeProfile({ ...legacyProfile, cardName: legacyProfile.cardName || 'Main exchange card', audience: legacyProfile.audience || 'General network' }));
    }
    state.profileCards = cards.length ? uniqueProfileCards(cards) : [];
    const preferred = localStorage.getItem('connectlog-active-profile-card') || '';
    state.activeProfileCardId = state.profileCards.some((card) => card.id === preferred) ? preferred : state.profileCards[0]?.id || '';
    state.profile = getActiveProfileCard();
    if (state.profileCards.length) await saveProfileCards(false);
  }

  function uniqueProfileCards(cards) {
    const seen = new Set();
    return cards.map((card) => {
      let id = card.id || cryptoId();
      while (seen.has(id)) id = cryptoId();
      seen.add(id);
      return { ...card, id };
    });
  }

  function getActiveProfileCard() {
    return state.profileCards.find((card) => card.id === state.activeProfileCardId) || state.profileCards[0] || null;
  }

  async function saveProfileCards(syncLegacy = true) {
    state.profileCards = uniqueProfileCards(state.profileCards.map(normalizeProfile).filter((card) => card.name));
    if (!state.profileCards.length) {
      state.profile = null;
      state.activeProfileCardId = '';
      await putMeta(META_PROFILE_CARDS, []);
      if (syncLegacy) await putMeta(META_PROFILE, null);
      return;
    }
    if (!state.profileCards.some((card) => card.id === state.activeProfileCardId)) state.activeProfileCardId = state.profileCards[0].id;
    state.profile = getActiveProfileCard();
    localStorage.setItem('connectlog-active-profile-card', state.activeProfileCardId);
    await putMeta(META_PROFILE_CARDS, state.profileCards);
    if (syncLegacy && state.profile) await putMeta(META_PROFILE, state.profile);
  }

  async function setActiveProfileCard(id) {
    if (!id || !state.profileCards.some((card) => card.id === id)) return;
    state.activeProfileCardId = id;
    state.profile = getActiveProfileCard();
    localStorage.setItem('connectlog-active-profile-card', id);
    await putMeta(META_PROFILE, state.profile);
    renderAll();
    showToast(`Active card: ${state.profile.cardName || state.profile.name}`);
  }

  function defaultRelayApiBase() {
    const helper = window.MetrAIyuxApi;
    if (helper?.path) return helper.path('relay13');
    return (window.METRAIYUX_API_BASES?.relay13 || '/api/relay13').replace(/\/+$/, '');
  }

  function defaultRelayConfig() {
    return {
      mode: 'relay13',
      origin: defaultRelayApiBase(),
      workspace: 'connectlog-main',
      workspaceId: 'ws_2533ccd0-08e2-48ec-b74c-f1389c7062a7',
      apiKey: '',
      operatorName: 'ConnectLog Operator',
      shareBridge: false,
      updatedAt: ''
    };
  }

  async function loadRelayState() {
    const savedConfig = await getMeta(META_RELAY_CONFIG);
    state.relayConfig = normalizeRelayConfig(savedConfig || defaultRelayConfig());
    const savedThreads = await getMeta(META_RELAY_THREADS);
    state.relayThreads = Array.isArray(savedThreads) ? savedThreads.map(normalizeRelayThread).filter(Boolean) : [];
    const savedOutbox = await getMeta(META_RELAY_OUTBOX);
    state.relayOutbox = Array.isArray(savedOutbox) ? savedOutbox.map(normalizeRelayOutboxItem).filter(Boolean) : [];
    const savedRequests = await getMeta(META_RELAY_REQUESTS);
    state.relayRequests = Array.isArray(savedRequests) ? savedRequests.map(normalizeRelayRequest).filter(Boolean) : [];
    const savedStats = await getMeta(META_RELAY_STATS);
    state.relayStats = savedStats && typeof savedStats === 'object' ? savedStats : null;
    state.activeRelayThreadId = state.relayThreads[0]?.id || '';
    state.relayStatus = state.relayConfig.mode === 'relay13' ? 'Relay13 production bridge configured. Run health check from this browser.' : 'Production vault mode selected. Relay13 production bridge remains available.';
  }

  function skyesContactPacketDefaults() {
    return {
      operator: 'Gray London Skyes',
      company: 'Skyes Over London',
      holdingCompany: 'SOLEnterprises International Nexus & Holdings',
      phone: '1-(800)-484-4788',
      companyMain: '1-(800)-484-4783',
      email: 'grayskyes@solenterprises.org',
      publicRelations: 'connectedskyes@solenterprises.org',
      music: 'SkyeMusicNexus@solenterprises.org',
      zeroOs: 'metraiyux-0s@solenterprises.org',
      hostedEmail: 'skyemail@solenterprises.org',
      media: 'MediaOverLondon@solenterprises.org',
      legal: 'https://skyes-over-london-legal.pages.dev/legal/',
      marketing: 'https://metraiyux-0s-marketing.pages.dev/',
      mediaHub: 'https://metraiyux-0s-marketing.pages.dev/media-over-london',
      musicHub: 'https://metraiyux-0s-marketing.pages.dev/skye-music-nexus/nexus-marketing-hub.html',
      zeroOsHub: 'https://metraiyux-0s-full-system.graylondonskyes.workers.dev/'
    };
  }

  async function applySkyesContactPacket() {
    const params = new URLSearchParams(window.location.search || '');
    const now = new Date().toISOString();
    const contactPacket = skyesContactPacketDefaults();
    await putMeta(META_SKYES_CONTACT_PACKET, { ...contactPacket, updatedAt: now });

    const founderExisting = state.contacts.find((contact) => contact.id === 'sol-founder-gray-london-skyes' || detailValue(contact, 'email').toLowerCase() === contactPacket.email.toLowerCase());
    const founder = normalizeContact({
      ...(founderExisting || {}),
      id: founderExisting?.id || 'sol-founder-gray-london-skyes',
      name: 'Gray London Skyes',
      company: contactPacket.company,
      role: 'Founder / operator / direct company contact',
      lane: 'partner',
      status: founderExisting?.status || 'active',
      priority: founderExisting?.priority || 'critical',
      pinned: true,
      tags: [...new Set([...(founderExisting?.tags || []), 'skyes-over-london', 'founder-contact', 'company-contact', 'business-card-factory'])],
      details: mergeContactDetails(founderExisting?.details || [], [
        { type: 'email', label: 'Gray direct email', value: contactPacket.email },
        { type: 'phone', label: 'Gray direct phone', value: contactPacket.phone },
        { type: 'phone', label: 'Company main', value: contactPacket.companyMain },
        { type: 'email', label: 'Public relations', value: contactPacket.publicRelations },
        { type: 'email', label: 'Media Over London', value: contactPacket.media },
        { type: 'email', label: '0S support', value: contactPacket.zeroOs },
        { type: 'email', label: 'SkyeMusicNexus', value: contactPacket.music },
        { type: 'email', label: 'SkyEmail support', value: contactPacket.hostedEmail },
        { type: 'website', label: 'Marketing hub', value: contactPacket.marketing },
        { type: 'website', label: 'Legal surface', value: contactPacket.legal },
        { type: 'website', label: 'Media Over London', value: contactPacket.mediaHub },
        { type: 'website', label: 'MetrAIyux 0S', value: contactPacket.zeroOsHub }
      ]),
      notes: founderExisting?.notes || 'Formal company contact packet saved automatically from the Skyes Over London / MetrAIyux 0S business-card handoff.',
      timeline: [
        ...(founderExisting?.timeline || []),
        { id: cryptoId(), type: 'note', text: 'Skyes Over London contact packet verified in ConnectLog.', date: todayInputDate(), createdAt: now }
      ].slice(-40),
      updatedAt: now,
      createdAt: founderExisting?.createdAt || now
    });
    await putContact(founder);

    const source = cleanInput(params.get('source') || '', 80);
    const businessName = cleanInput(params.get('business') || '', 160);
    const valleyUrl = cleanInput(params.get('valleyUrl') || '', 800);
    const cardUrl = cleanInput(params.get('cardUrl') || params.get('url') || '', 800);
    const cardKind = cleanInput(params.get('cardKind') || params.get('kind') || '', 80);
    const cardTitle = cleanInput(params.get('cardTitle') || params.get('title') || '', 180);
    const clientId = cleanInput(params.get('clientId') || '', 120);
    const isBusinessCardLaunch = /business-card|business-cards|valley-verified-card|platform-card|founder-card/i.test(source) || Boolean(cardKind || businessName || clientId);
    if (isBusinessCardLaunch) {
      const expires = cleanInput(params.get('expires') || '', 20);
      const skyemerit = cleanInput(params.get('skyemerit') || (valleyUrl ? '31' : ''), 8);
      const city = cleanInput(params.get('city') || '', 120);
      const category = cleanInput(params.get('category') || '', 160);
      const priorityCode = cleanInput(params.get('priorityCode') || '', 80);
      const cardPacket = {
        source,
        cardKind: cardKind || (valleyUrl ? 'valley-verified' : 'business-card'),
        cardTitle: cardTitle || businessName || 'Skyes Over London business card',
        businessName,
        city,
        category,
        clientId,
        priorityCode,
        valleyUrl,
        cardUrl: cardUrl || valleyUrl || contactPacket.marketing,
        expires,
        skyemerit,
        contact: cleanInput(params.get('contact') || '', 140)
      };
      state.businessCardScan = cardPacket;
      const clientContact = normalizeContact({
        id: clientId ? `vv-${clientId}`.slice(0, 96) : cryptoId(),
        name: businessName || 'Valley Verified client',
        company: businessName || 'Valley Verified client',
        role: [category, city].filter(Boolean).join(' / '),
        lane: cardPacket.cardKind === 'platform' ? 'partner' : 'client',
        status: 'warm',
        priority: 'high',
        pinned: true,
        tags: [...new Set([valleyUrl ? 'valley-verified' : 'business-card', cardPacket.cardKind, source, 'connectlog-handoff', skyemerit ? `skyemerit-${skyemerit}` : 'scanned-card'].filter(Boolean))],
        details: [
          { id: cryptoId(), type: 'website', label: valleyUrl ? 'Valley Verified page' : 'Business card link', value: valleyUrl || cardPacket.cardUrl },
          { id: cryptoId(), type: 'custom', label: 'Priority code', value: priorityCode },
          { id: cryptoId(), type: 'custom', label: 'SkyeMerit activation', value: skyemerit ? `${skyemerit}% through ${expires || 'seven days from scan'}` : '' },
          { id: cryptoId(), type: 'email', label: 'Gray direct email', value: contactPacket.email },
          { id: cryptoId(), type: 'phone', label: 'Gray direct phone', value: contactPacket.phone }
        ].filter((detail) => detail.value),
        notes: [
          `Opened from a Skyes Over London ${cardPacket.cardKind || 'business'} card.`,
          valleyUrl ? 'The owner can use this record to inspect their live Valley Verified page, contact Gray, and activate the seven-day SkyeMerit offer.' : 'The scanner can use this record to inspect the card link and contact Gray.',
          'All deeper 0S work remains gate-owned through FS27/SkyGate.'
        ].join('\n\n'),
        timeline: [{ id: cryptoId(), type: 'note', text: skyemerit ? `Business-card handoff opened. SkyeMerit ${skyemerit}% valid through ${expires || 'the scan window'}.` : 'Business-card handoff opened in ConnectLog.', date: todayInputDate(), createdAt: now }],
        createdAt: now,
        updatedAt: now
      });
      if (cardPacket.cardKind !== 'founder') {
        const existingClient = state.contacts.find((contact) => contact.id === clientContact.id || normalizeText(contact.name) === normalizeText(clientContact.name));
        await putContact(existingClient ? mergeImportedContact(existingClient, clientContact, now) : clientContact);
      }
      renderSkyesWelcomePanel({ contactPacket, ...cardPacket, businessName: businessName || clientContact.name, valleyUrl, expires, skyemerit, priorityCode });
      recordBusinessCardScan({ contactPacket, ...cardPacket }).catch((error) => {
        console.warn('ConnectLog scan record failed:', error);
        setBusinessCardScanStatus('Scan opened locally. Relay13 scan record will retry from an operator session.');
      });
    } else {
      renderSkyesWelcomePanel({ contactPacket });
    }

    await loadContacts();
  }

  function mergeContactDetails(existingDetails, incomingDetails) {
    const normalized = [];
    const seen = new Set();
    [...existingDetails, ...incomingDetails].forEach((detail) => {
      const type = detail.type || 'custom';
      const value = cleanInput(detail.value || '', 800);
      if (!value) return;
      const key = `${type}:${normalizeText(value)}`;
      if (seen.has(key)) return;
      seen.add(key);
      normalized.push({
        id: detail.id || cryptoId(),
        type,
        label: detail.label || readableDetailType(type),
        value
      });
    });
    return normalized;
  }

  function renderSkyesWelcomePanel(packet = {}) {
    const workspace = els.appShell?.querySelector?.('.workspace') || document.querySelector('.workspace');
    if (!workspace) return;
    packet = { ...packet, contactPacket: packet.contactPacket || skyesContactPacketDefaults() };
    document.getElementById('skyesContactPacket')?.remove();
    const section = document.createElement('section');
    section.id = 'skyesContactPacket';
    section.className = 'sol-welcome-panel page-active';
    section.dataset.page = 'dashboard';

    const copy = document.createElement('div');
    const eyebrow = document.createElement('p');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = 'Skyes Over London contact packet';
    const title = document.createElement('h2');
    title.textContent = packet.businessName ? `Welcome, ${packet.businessName}.` : 'Gray London Skyes is saved in this ConnectLog.';
    const message = document.createElement('p');
    message.className = 'panel-hint';
    message.textContent = packet.businessName
      ? `Thank you for working with Skyes Over London. This scanned card, the company contact lanes, and ${packet.valleyUrl ? 'the live Valley Verified page' : 'the card link'} are saved in this workspace.`
      : 'Every ConnectLog workspace now starts with Gray London Skyes, company support lanes, legal surfaces, Media Over London, SkyeMusicNexus, SkyEmail, and the 0S support mailbox saved as a formal contact packet.';
    copy.append(eyebrow, title, message);

    const side = document.createElement('div');
    side.className = 'sol-welcome-side';
    const scannedCard = businessCardPreview(packet);
    if (scannedCard) side.append(scannedCard);

    const links = document.createElement('div');
    links.className = 'sol-welcome-links';
    [
      ['Gray direct', `mailto:${packet.contactPacket.email}`],
      ['Media Over London', `mailto:${packet.contactPacket.media}`],
      ['0S support', `mailto:${packet.contactPacket.zeroOs}`],
      ['SkyeMusicNexus', `mailto:${packet.contactPacket.music}`],
      ['Legal', packet.contactPacket.legal],
      packet.valleyUrl ? ['Valley page', packet.valleyUrl] : ['Card link', packet.cardUrl || packet.contactPacket.marketing]
    ].forEach(([label, href]) => {
      const link = document.createElement('a');
      link.href = href;
      link.target = href.startsWith('http') ? '_blank' : '';
      if (link.target) link.rel = 'noopener';
      link.textContent = label;
      links.append(link);
    });
    if (packet.businessName || packet.cardTitle) {
      const installButton = document.createElement('button');
      installButton.type = 'button';
      installButton.textContent = 'Install / Add ConnectLog';
      installButton.addEventListener('click', installApp);
      const downloadButton = document.createElement('button');
      downloadButton.type = 'button';
      downloadButton.textContent = 'Download contact';
      downloadButton.addEventListener('click', () => downloadBusinessCardContact(packet));
      links.append(installButton, downloadButton);
    }

    const offer = document.createElement('div');
    offer.className = 'sol-welcome-offer';
    const offerTitle = packet.skyemerit ? `${packet.skyemerit}% SkyeMerit` : 'ConnectLog card';
    const offerCopy = packet.skyemerit
      ? packet.expires ? `Valid through ${packet.expires}` : 'Activation credit attached to business-card handoffs'
      : 'Saved on this device with the scanned card context';
    const statusCopy = packet.businessName || packet.cardTitle ? '<small id="solScanStatus">Opening scan packet...</small>' : '';
    offer.innerHTML = `<strong>${escapeHtml(offerTitle)}</strong><span>${escapeHtml(offerCopy)}</span>${statusCopy}`;
    side.append(links, offer);
    section.append(copy, side);
    workspace.prepend(section);
  }

  function businessCardPreview(packet = {}) {
    if (!packet.businessName && !packet.cardTitle) return null;
    const card = document.createElement('article');
    card.className = 'sol-scanned-card';
    const eyebrow = document.createElement('span');
    eyebrow.textContent = packet.cardKind || 'business card';
    const title = document.createElement('h3');
    title.textContent = packet.businessName || packet.cardTitle || 'Scanned card';
    const meta = document.createElement('p');
    meta.textContent = [packet.city, packet.category].filter(Boolean).join(' / ') || packet.cardTitle || 'ConnectLog handoff';
    const code = document.createElement('code');
    code.textContent = packet.priorityCode || packet.clientId || 'connectlog-scan';
    card.append(eyebrow, title, meta, code);
    return card;
  }

  function setBusinessCardScanStatus(text) {
    const status = document.getElementById('solScanStatus');
    if (status) status.textContent = text;
  }

  async function recordBusinessCardScan(packet = {}) {
    if (!packet.businessName && !packet.cardTitle) return;
    const cfg = state.relayConfig || defaultRelayConfig();
    const origin = (cfg.origin || defaultRelayApiBase()).replace(/\/+$/, '');
    const cardId = cleanInput(packet.clientId || packet.priorityCode || slugToken(packet.businessName || packet.cardTitle || 'business-card'), 120).toLowerCase();
    const sessionKey = `connectlog-scan:${cardId}:${todayInputDate()}`;
    let recordedInSession = false;
    try {
      recordedInSession = Boolean(sessionStorage.getItem(sessionKey));
    } catch {
      recordedInSession = false;
    }
    if (recordedInSession) {
      setBusinessCardScanStatus('Scan already recorded in this browser session.');
      return;
    }
    try {
      sessionStorage.setItem(sessionKey, 'pending');
    } catch {
      // Private browser modes may block session storage; the scan can still post.
    }
    const body = packet.valleyUrl
      ? `Business card scan opened for ${packet.businessName}. Valley Verified page: ${packet.valleyUrl}`
      : `Business card scan opened for ${packet.businessName || packet.cardTitle}.`;
    const response = await fetch(`${origin}/api/v1/connectlog/scan`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        workspace: cfg.workspace || 'connectlog-main',
        channel: 'connectlog-card',
        customer_name: packet.businessName || packet.cardTitle || 'Business card scanner',
        customer_phone: '',
        customer_email: '',
        body,
        source_url: window.location.href,
        connectlog_bridge: true,
        connectlog_card_id: cardId,
        connectlog_card_label: packet.cardTitle || packet.businessName || 'Business card',
        connectlog_campaign: packet.cardKind || packet.source || 'business-card-scan',
        connectlog_owner_name: packet.contactPacket?.operator || 'Gray London Skyes',
        connectlog_owner_company: packet.contactPacket?.company || 'Skyes Over London',
        connectlog_owner_role: 'Founder / operator',
        connectlog_welcome_message: packet.valleyUrl
          ? `Your ConnectLog packet is open with the live Valley Verified page for ${packet.businessName}.`
          : `Your ConnectLog packet is open for ${packet.businessName || packet.cardTitle}.`,
        connectlog_tags: [...new Set(['business-card-scan', packet.cardKind, packet.source, packet.valleyUrl ? 'valley-verified' : ''].filter(Boolean))],
        metadata: {
          source_app: 'connectlog-business-card-scan',
          card_kind: packet.cardKind || '',
          priority_code: packet.priorityCode || '',
          valley_url: packet.valleyUrl || '',
          card_url: packet.cardUrl || ''
        }
      })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || `HTTP ${response.status}`);
    try {
      sessionStorage.setItem(sessionKey, data.conversation_id || 'recorded');
    } catch {
      // Non-durable session storage should not block the handoff UX.
    }
    setBusinessCardScanStatus(`Relay13 scan recorded: ${data.conversation_id || 'ConnectLog request'}.`);
  }

  function downloadBusinessCardContact(packet = {}) {
    const profile = {
      name: packet.businessName || packet.cardTitle || 'Skyes Over London',
      cardName: packet.cardTitle || packet.businessName || 'ConnectLog business card',
      company: packet.businessName || packet.contactPacket?.company || 'Skyes Over London',
      role: [packet.category, packet.city].filter(Boolean).join(' / ') || packet.cardKind || 'Business card',
      phone: packet.contactPacket?.phone || '',
      email: packet.contactPacket?.email || '',
      website: packet.valleyUrl || packet.cardUrl || packet.contactPacket?.marketing || '',
      location: packet.city || '',
      note: packet.valleyUrl ? `Valley Verified page: ${packet.valleyUrl}` : 'Saved from a ConnectLog business card scan.',
      audience: packet.cardKind || '',
      welcomeMessage: packet.skyemerit ? `SkyeMerit ${packet.skyemerit}%${packet.expires ? ` through ${packet.expires}` : ''}` : '',
      linkedin: '',
      x: '',
      github: '',
      tags: ['connectlog', 'business-card', packet.cardKind || 'scan'].filter(Boolean)
    };
    downloadFile(`${safeFileName(profile.cardName || profile.name)}.vcf`, buildVCard(profile), 'text/vcard;charset=utf-8');
    showToast('Phone contact downloaded.');
  }

  function slugToken(value) {
    return String(value || 'card').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'card';
  }

  function normalizeRelayConfig(raw = {}) {
    const mode = raw.mode === 'relay13' ? 'relay13' : 'local';
    return {
      mode,
      origin: normalizeRelayOrigin(raw.origin || ''),
      workspace: cleanInput(raw.workspace || '', 80).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, ''),
      workspaceId: cleanInput(raw.workspaceId || raw.workspace_id || '', 120),
      apiKey: '',
      operatorName: cleanInput(raw.operatorName || raw.operator_name || 'ConnectLog Operator', 140) || 'ConnectLog Operator',
      shareBridge: Boolean(raw.shareBridge),
      updatedAt: validIso(raw.updatedAt) || ''
    };
  }

  function normalizeRelayOrigin(value) {
    const raw = String(value || '').trim().replace(/\/+$/, '');
    if (!raw) return '';
    if (raw.startsWith('/')) return raw.replace(/\/+$/, '') || '/api/relay13';
    try {
      const url = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
      if (!/^https?:$/.test(url.protocol)) return '';
      return `${url.origin}${url.pathname === '/' ? '' : url.pathname.replace(/\/+$/, '')}`;
    } catch (_) {
      return '';
    }
  }

  function normalizeRelayThread(raw = {}) {
    const id = cleanInput(raw.id || raw.conversation_id || '', 140) || cryptoId();
    return {
      id,
      conversationId: cleanInput(raw.conversationId || raw.conversation_id || id, 140),
      visitorToken: cleanInput(raw.visitorToken || raw.visitor_token || '', 260),
      workspaceId: cleanInput(raw.workspaceId || raw.workspace_id || '', 140),
      workspace: cleanInput(raw.workspace || '', 80),
      origin: normalizeRelayOrigin(raw.origin || ''),
      contactId: cleanInput(raw.contactId || '', 96),
      cardId: cleanInput(raw.cardId || raw.card_id || '', 96),
      title: cleanInput(raw.title || raw.subject || 'ConnectLog thread', 180),
      mode: raw.mode === 'relay13' ? 'relay13' : 'local',
      status: cleanInput(raw.status || 'open', 30),
      preview: cleanInput(raw.preview || raw.last_message_preview || '', 240),
      messages: Array.isArray(raw.messages) ? raw.messages.map(normalizeRelayMessage).filter(Boolean) : [],
      createdAt: validIso(raw.createdAt || raw.created_at) || new Date().toISOString(),
      updatedAt: validIso(raw.updatedAt || raw.updated_at) || validIso(raw.createdAt || raw.created_at) || new Date().toISOString()
    };
  }

  function normalizeRelayMessage(raw = {}) {
    const body = cleanInput(raw.body || raw.message || raw.text || '', 4000);
    if (!body) return null;
    return {
      id: cleanInput(raw.id || cryptoId(), 140),
      senderRole: cleanInput(raw.senderRole || raw.sender_role || 'operator', 30),
      senderName: cleanInput(raw.senderName || raw.sender_name || '', 140),
      body,
      pending: Boolean(raw.pending),
      failed: Boolean(raw.failed),
      createdAt: validIso(raw.createdAt || raw.created_at) || new Date().toISOString()
    };
  }

  function normalizeRelayOutboxItem(raw = {}) {
    const message = normalizeRelayMessage(raw.message || raw);
    if (!message) return null;
    return {
      id: cleanInput(raw.id || cryptoId(), 96),
      threadId: cleanInput(raw.threadId || raw.thread_id || '', 140),
      conversationId: cleanInput(raw.conversationId || raw.conversation_id || '', 140),
      origin: normalizeRelayOrigin(raw.origin || ''),
      workspaceId: cleanInput(raw.workspaceId || raw.workspace_id || '', 140),
      visitorToken: cleanInput(raw.visitorToken || raw.visitor_token || '', 260),
      senderRole: cleanInput(raw.senderRole || raw.sender_role || message.senderRole || 'operator', 30),
      message,
      createdAt: validIso(raw.createdAt) || new Date().toISOString()
    };
  }


  function normalizeRelayRequest(raw = {}) {
    const conversationId = cleanInput(raw.conversationId || raw.conversation_id || '', 140);
    return {
      id: cleanInput(raw.id || raw.request_id || conversationId || cryptoId(), 140),
      conversationId,
      cardId: cleanInput(raw.connectlog_card_id || raw.cardId || raw.card_id || '', 140),
      cardRecordId: cleanInput(raw.card_record_id || raw.cardRecordId || '', 140),
      status: cleanInput(raw.request_status || raw.status || 'open', 40),
      customerName: cleanInput(raw.customer_name || raw.customerName || '', 140),
      customerEmail: cleanInput(raw.customer_email || raw.customerEmail || '', 180),
      sourceUrl: cleanInput(raw.source_url || raw.sourceUrl || '', 500),
      subject: cleanInput(raw.subject || '', 220),
      conversationStatus: cleanInput(raw.conversation_status || raw.conversationStatus || '', 60),
      preview: cleanInput(raw.last_message_preview || raw.preview || '', 240),
      createdAt: validIso(raw.created_at || raw.createdAt) || new Date().toISOString(),
      updatedAt: validIso(raw.updated_at || raw.updatedAt || raw.last_message_at) || validIso(raw.created_at || raw.createdAt) || new Date().toISOString()
    };
  }

  async function persistRelayState() {
    await putMeta(META_RELAY_CONFIG, state.relayConfig || defaultRelayConfig());
    await putMeta(META_RELAY_THREADS, state.relayThreads.map(normalizeRelayThread));
    await putMeta(META_RELAY_OUTBOX, state.relayOutbox.map(normalizeRelayOutboxItem).filter(Boolean));
    await putMeta(META_RELAY_REQUESTS, state.relayRequests.map(normalizeRelayRequest).filter(Boolean));
    await putMeta(META_RELAY_STATS, state.relayStats || null);
  }

  async function migrateLegacyLocalStorage() {
    const flag = localStorage.getItem('connectlog-v2-migrated');
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (flag || !legacy) return;
    try {
      const parsed = JSON.parse(legacy);
      if (!Array.isArray(parsed)) return;
      const contacts = parsed.map(normalizeContact);
      await Promise.all(contacts.map(putContact));
      localStorage.setItem('connectlog-v2-migrated', new Date().toISOString());
      showToast(`Migrated ${contacts.length} legacy contacts into the hardened relationship vault.`);
    } catch (error) {
      console.warn('Legacy migration failed:', error);
    }
  }

  async function checkStorageHealth() {
    try {
      if (!('indexedDB' in window)) throw new Error('IndexedDB unavailable');
      let usage = '';
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        if (estimate.quota) {
          const used = formatBytes(estimate.usage || 0);
          const quota = formatBytes(estimate.quota);
          usage = ` Device storage usage: ${used} of ${quota}.`;
        }
      }
      if (navigator.storage && navigator.storage.persist) {
        const persisted = await navigator.storage.persisted();
        els.storageHealth.textContent = `${persisted ? 'Persistent storage is already granted.' : 'Storage is available. Export backups regularly if persistence is not granted.'}${usage}`;
      } else {
        els.storageHealth.textContent = `IndexedDB is available. Export backups regularly.${usage}`;
      }
    } catch (error) {
      els.storageHealth.textContent = 'Storage warning: this browser may not support durable offline storage.';
    }
  }

  function setupServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch((error) => {
        console.warn('Service worker registration failed:', error);
      });
    });
  }

  function renderAll() {
    state.filtered = getFilteredContacts();
    renderStats();
    renderRelationshipIntelligence();
    renderProfileSummary();
    renderProfileCardSelector();
    renderProfileCardGrid();
    renderRelayPanel();
    renderDeploymentCommandCenter();
    renderTagRail();
    renderContacts();
    renderFollowups();
    updateNavState();
  }

  function getFilteredContacts() {
    const query = normalizeText(state.query);
    let list = [...state.contacts];
    if (query) list = list.filter((contact) => searchableText(contact).includes(query));
    if (state.lane !== 'all') list = list.filter((contact) => contact.lane === state.lane);
    if (state.status !== 'all') list = list.filter((contact) => contact.status === state.status);
    if (state.priority !== 'all') list = list.filter((contact) => contact.priority === state.priority);
    if (state.tag !== 'all') list = list.filter((contact) => contact.tags.includes(state.tag));
    if (state.dueOnly) list = list.filter(isDue);
    if (state.pinnedOnly) list = list.filter((contact) => contact.pinned);
    return list.sort(getSortFunction());
  }

  function getSortFunction() {
    if (state.sort === 'name') return (a, b) => a.name.localeCompare(b.name);
    if (state.sort === 'created') return (a, b) => dateValue(b.createdAt) - dateValue(a.createdAt);
    if (state.sort === 'priority') return (a, b) => (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0) || dateValue(b.updatedAt) - dateValue(a.updatedAt);
    if (state.sort === 'followup') return (a, b) => followupSortValue(a) - followupSortValue(b);
    return (a, b) => Number(b.pinned) - Number(a.pinned) || dateValue(b.updatedAt) - dateValue(a.updatedAt);
  }

  function followupSortValue(contact) {
    return contact.nextFollowUpAt ? dateValue(contact.nextFollowUpAt) : Number.MAX_SAFE_INTEGER;
  }

  function renderStats() {
    const activeContacts = state.contacts.filter((contact) => contact.status !== 'archived');
    els.statTotal.textContent = state.contacts.length.toString();
    els.statDue.textContent = activeContacts.filter(isDue).length.toString();
    els.statPinned.textContent = state.contacts.filter((contact) => contact.pinned).length.toString();
    els.statHigh.textContent = state.contacts.filter((contact) => contact.priority === 'high' || contact.priority === 'critical').length.toString();
    els.statDormant.textContent = activeContacts.filter(isDormant).length.toString();
    els.statUpcoming.textContent = activeContacts.filter(isUpcomingSoon).length.toString();
    if (els.statTasks) els.statTasks.textContent = countLoggedTasks(activeContacts).toString();
    if (els.statActionable) els.statActionable.textContent = getActionableContacts().length.toString();
  }

  function renderTagRail() {
    const tagCounts = new Map();
    state.contacts.forEach((contact) => contact.tags.forEach((tag) => tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)));
    const sorted = [...tagCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 18);
    replaceChildren(els.tagRail,
      createTagRailButton('all', `All tags`, state.tag === 'all'),
      ...sorted.map(([tag, count]) => createTagRailButton(tag, `${tag} · ${count}`, state.tag === tag))
    );
  }

  function createTagRailButton(tag, text, active) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `tag-chip${active ? ' active' : ''}`;
    button.dataset.tag = tag;
    button.textContent = text;
    return button;
  }

  function renderContacts() {
    const total = state.filtered.length;
    els.resultCount.textContent = total === 1 ? '1 contact visible' : `${total} contacts visible`;
    els.emptyState.hidden = state.contacts.length > 0 || Boolean(state.query || state.lane !== 'all' || state.status !== 'all' || state.priority !== 'all' || state.tag !== 'all' || state.dueOnly || state.pinnedOnly);
    els.contactGrid.hidden = total === 0;
    if (state.contacts.length > 0 && total === 0) {
      els.emptyState.hidden = false;
      els.emptyState.querySelector('h3').textContent = 'No match under these filters.';
      els.emptyState.querySelector('p').textContent = 'Clear filters or search a broader term. Your records are still stored locally.';
      els.emptyState.querySelector('button').textContent = 'Add another person';
    } else if (state.contacts.length === 0) {
      els.emptyState.querySelector('h3').textContent = 'Start your private index.';
      els.emptyState.querySelector('p').textContent = 'Add a person, tag the context, store notes, and set the next follow-up. The first local backup export is one click away.';
      els.emptyState.querySelector('button').textContent = 'Add first person';
    }
    replaceChildren(els.contactGrid, ...state.filtered.map(renderContactCard));
  }

  function renderContactCard(contact) {
    const card = document.createElement('article');
    card.className = 'contact-card';
    card.dataset.id = contact.id;

    const top = document.createElement('div');
    top.className = 'card-top';

    const identity = document.createElement('div');
    identity.className = 'identity';
    const avatar = renderAvatar(contact);
    const nameBlock = document.createElement('div');
    const h3 = document.createElement('h3');
    h3.textContent = contact.name;
    const sub = document.createElement('p');
    sub.textContent = [contact.role, contact.company].filter(Boolean).join(' · ') || readableStatus(contact.status);
    nameBlock.append(h3, sub);
    identity.append(avatar, nameBlock);

    const actions = document.createElement('div');
    actions.className = 'card-actions';
    actions.append(
      iconAction(contact.pinned ? '★' : '☆', contact.pinned ? 'Unpin contact' : 'Pin contact', 'pin', contact.pinned ? 'pinned' : ''),
      iconAction('✎', 'Edit contact', 'edit'),
      iconAction('×', 'Delete contact', 'delete')
    );
    top.append(identity, actions);

    const meta = document.createElement('div');
    meta.className = 'card-meta';
    const health = contactHealth(contact);
    meta.append(
      miniChip(`◆ ${readableLane(contact.lane)}`),
      miniChip(`● ${readableStatus(contact.status)}`),
      miniChip(`${priorityLabel(contact.priority)} priority`),
      miniChip(`${health.score}% ${health.label}`)
    );
    if (contact.nextFollowUpAt) meta.append(miniChip(`${isDue(contact) ? 'Due' : 'Next'} ${formatDate(contact.nextFollowUpAt)}`));
    contact.tags.slice(0, 4).forEach((tag) => meta.append(miniChip(`#${tag}`)));
    if (contact.tags.length > 4) meta.append(miniChip(`+${contact.tags.length - 4} tags`));

    const details = document.createElement('div');
    details.className = 'detail-list';
    contact.details.slice(0, 4).forEach((detail) => details.append(renderDetailLine(detail)));

    const note = document.createElement('p');
    note.className = 'card-note';
    note.textContent = contact.notes || latestTimelineText(contact) || 'No notes yet. Add context, next steps, or relationship intelligence.';

    const footer = document.createElement('div');
    footer.className = 'card-footer';
    const updated = document.createElement('span');
    updated.textContent = `Updated ${relativeDate(contact.updatedAt)}`;
    const footerActions = document.createElement('div');
    footerActions.style.display = 'flex';
    footerActions.style.gap = '7px';
    footerActions.append(
      smallButton('Contacted', 'contacted'),
      smallButton('+7d', 'snooze-7'),
      smallButton('Script', 'script'),
      smallButton('Share', 'share-contact'),
      smallButton('VCF', 'vcard'),
      smallButton('ICS', 'ics'),
      smallButton(contact.status === 'archived' ? 'Restore' : 'Archive', contact.status === 'archived' ? 'restore' : 'archive'),
      smallButton('Open', 'edit')
    );
    footer.append(updated, footerActions);

    card.append(top, meta);
    if (details.childElementCount) card.append(details);
    card.append(note, footer);
    return card;
  }

  function renderDetailLine(detail) {
    const wrapper = document.createElement('div');
    const label = detail.label || readableDetailType(detail.type);
    const value = detail.value;
    const prefix = document.createElement('strong');
    prefix.textContent = `${label}: `;
    prefix.style.color = 'var(--faint)';
    wrapper.append(prefix);
    const link = linkForDetail(detail);
    if (link) {
      const anchor = document.createElement('a');
      anchor.href = link;
      anchor.target = detail.type === 'email' || detail.type === 'phone' ? '' : '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.textContent = value;
      wrapper.append(anchor);
    } else {
      const span = document.createElement('span');
      span.textContent = value;
      wrapper.append(span);
    }
    return wrapper;
  }

  function renderFollowups() {
    const due = state.contacts
      .filter((contact) => contact.status !== 'archived' && contact.nextFollowUpAt)
      .sort((a, b) => dateValue(a.nextFollowUpAt) - dateValue(b.nextFollowUpAt))
      .slice(0, 8);
    if (!due.length) {
      const empty = document.createElement('div');
      empty.className = 'followup-item';
      empty.innerHTML = '<strong>No follow-ups scheduled</strong><span>Add dates on key contacts to build a daily action list.</span>';
      replaceChildren(els.followupList, empty);
      return;
    }
    replaceChildren(els.followupList, ...due.map((contact) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'followup-item';
      item.dataset.id = contact.id;
      const strong = document.createElement('strong');
      strong.textContent = contact.name;
      const span = document.createElement('span');
      span.textContent = `${isDue(contact) ? 'Due' : 'Next'} ${formatDate(contact.nextFollowUpAt)} · ${priorityLabel(contact.priority)}`;
      item.append(strong, span);
      return item;
    }));
  }

  function openContactDialog(id = null) {
    const existing = id ? state.contacts.find((contact) => contact.id === id) : null;
    state.editing = existing ? structuredCloneSafe(existing) : null;
    state.draftTags = existing ? [...existing.tags] : [];
    state.draftDetails = existing ? structuredCloneSafe(existing.details) : defaultDetails();
    state.draftTimeline = existing ? structuredCloneSafe(existing.timeline) : [];

    els.dialogMode.textContent = existing ? 'Edit record' : 'New record';
    els.dialogTitle.textContent = existing ? 'Edit person' : 'Add person';
    els.contactId.value = existing?.id || '';
    els.nameInput.value = existing?.name || '';
    els.companyInput.value = existing?.company || '';
    els.roleInput.value = existing?.role || '';
    els.laneInput.value = existing?.lane || 'lead';
    els.statusInput.value = existing?.status || 'new';
    els.priorityInput.value = existing?.priority || 'normal';
    els.nextFollowUpInput.value = toInputDate(existing?.nextFollowUpAt || '');
    els.notesInput.value = existing?.notes || '';
    els.timelineComposer.hidden = true;
    els.timelineTextInput.value = '';
    setDefaultTimelineDate();
    renderTagEditor();
    renderDetailEditor();
    renderTimelineEditor();
    openDialog(els.contactDialog, els.nameInput);
  }

  function closeContactDialog() {
    els.contactDialog.close();
  }

  function openQuickLogDialog() {
    els.quickLogForm.reset();
    els.quickFollowUpInput.value = '';
    openDialog(els.quickLogDialog, els.quickNameInput);
  }

  function closeQuickLogDialog() {
    els.quickLogDialog.close();
  }

  function openDialog(dialog, focusTarget) {
    if (!dialog.open) dialog.showModal();
    setTimeout(() => focusTarget?.focus(), 60);
  }

  async function saveContactFromForm(event) {
    event.preventDefault();
    const name = cleanInput(els.nameInput.value, 120);
    if (!name) return showToast('Name is required.');
    const now = new Date().toISOString();
    const existing = state.editing;
    const contact = normalizeContact({
      id: existing?.id || cryptoId(),
      name,
      company: cleanInput(els.companyInput.value, 140),
      role: cleanInput(els.roleInput.value, 140),
      lane: cleanEnum(els.laneInput.value, laneOptions, 'lead'),
      status: cleanEnum(els.statusInput.value, ['new', 'active', 'warm', 'follow-up', 'archived'], 'new'),
      priority: cleanEnum(els.priorityInput.value, ['low', 'normal', 'high', 'critical'], 'normal'),
      pinned: Boolean(existing?.pinned),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      lastContactedAt: existing?.lastContactedAt || '',
      nextFollowUpAt: normalizeDate(els.nextFollowUpInput.value),
      tags: state.draftTags,
      details: state.draftDetails.filter((detail) => cleanInput(detail.value, 800)).map((detail) => ({
        id: detail.id || cryptoId(),
        type: cleanEnum(detail.type, detailTypes.map((type) => type.value), 'custom'),
        label: cleanInput(detail.label || readableDetailType(detail.type), 48),
        value: cleanInput(detail.value, 800)
      })),
      notes: cleanInput(els.notesInput.value, 6000),
      timeline: state.draftTimeline
    });
    await putContact(contact);
    await loadContacts();
    closeContactDialog();
    renderAll();
    showToast(existing ? 'Contact updated.' : 'Contact created.');
  }

  async function saveQuickLog(event) {
    event.preventDefault();
    const name = cleanInput(els.quickNameInput.value, 120);
    if (!name) return showToast('Name is required.');
    const now = new Date().toISOString();
    const note = cleanInput(els.quickNoteInput.value, 1600);
    const tags = splitTags(els.quickTagsInput.value);
    const contact = normalizeContact({
      id: cryptoId(),
      name,
      lane: 'lead',
      status: els.quickFollowUpInput.value ? 'follow-up' : 'new',
      priority: 'normal',
      createdAt: now,
      updatedAt: now,
      nextFollowUpAt: normalizeDate(els.quickFollowUpInput.value),
      tags,
      notes: note,
      timeline: note ? [{ id: cryptoId(), type: 'note', text: note, date: todayInputDate(), createdAt: now }] : []
    });
    await putContact(contact);
    await loadContacts();
    closeQuickLogDialog();
    renderAll();
    showToast('Quick record created.');
  }

  function renderTagEditor() {
    [...els.tagEditor.querySelectorAll('.editor-chip')].forEach((node) => node.remove());
    state.draftTags.forEach((tag) => {
      const chip = document.createElement('span');
      chip.className = 'editor-chip';
      chip.textContent = tag;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.removeTag = tag;
      btn.textContent = '×';
      btn.addEventListener('click', () => {
        state.draftTags = state.draftTags.filter((item) => item !== tag);
        renderTagEditor();
      });
      chip.append(btn);
      els.tagEditor.insertBefore(chip, els.tagInput);
    });
  }

  function handleTagInput(event) {
    if (event.key !== 'Enter' && event.key !== ',') return;
    event.preventDefault();
    addDraftTag(els.tagInput.value);
    els.tagInput.value = '';
  }

  function addDraftTag(raw) {
    const tag = cleanTag(raw);
    if (!tag || state.draftTags.includes(tag) || state.draftTags.length >= 36) return;
    state.draftTags.push(tag);
    renderTagEditor();
  }

  function renderDetailEditor() {
    replaceChildren(els.detailsStack, ...state.draftDetails.map((detail) => {
      const row = document.createElement('div');
      row.className = 'detail-row';
      row.dataset.id = detail.id;

      const select = document.createElement('select');
      select.dataset.field = 'type';
      detailTypes.forEach((type) => {
        const option = document.createElement('option');
        option.value = type.value;
        option.textContent = type.label;
        option.selected = detail.type === type.value;
        select.append(option);
      });

      const valueInput = document.createElement('input');
      valueInput.type = 'text';
      valueInput.maxLength = 800;
      valueInput.dataset.field = 'value';
      valueInput.value = detail.value || '';
      valueInput.placeholder = detail.type === 'email' ? 'name@example.com' : detail.type === 'phone' ? '+1 555 000 0000' : 'Value';

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'ghost-btn';
      remove.dataset.action = 'remove-detail';
      remove.textContent = '×';
      remove.ariaLabel = 'Remove detail';

      row.append(select, valueInput, remove);
      return row;
    }));
  }

  function addDetailRow(type = 'custom', value = '') {
    state.draftDetails.push({ id: cryptoId(), type, label: readableDetailType(type), value });
    renderDetailEditor();
  }

  function updateDetailDraft(event) {
    const row = event.target.closest('.detail-row');
    if (!row) return;
    const detail = state.draftDetails.find((item) => item.id === row.dataset.id);
    if (!detail) return;
    const field = event.target.dataset.field;
    if (field === 'type') {
      detail.type = cleanEnum(event.target.value, detailTypes.map((type) => type.value), 'custom');
      detail.label = readableDetailType(detail.type);
      renderDetailEditor();
    }
    if (field === 'value') detail.value = cleanInput(event.target.value, 800);
  }

  function handleDetailClick(event) {
    const action = event.target.dataset.action;
    if (action !== 'remove-detail') return;
    const row = event.target.closest('.detail-row');
    state.draftDetails = state.draftDetails.filter((detail) => detail.id !== row.dataset.id);
    renderDetailEditor();
  }

  function setDefaultTimelineDate() {
    els.timelineDateInput.value = todayInputDate();
  }

  function addTimelineDraftItem() {
    const text = cleanInput(els.timelineTextInput.value, 600);
    if (!text) return showToast('Timeline text is required.');
    state.draftTimeline.unshift({
      id: cryptoId(),
      type: cleanEnum(els.timelineTypeInput.value, ['note', 'call', 'meeting', 'email', 'task'], 'note'),
      text,
      date: normalizeDate(els.timelineDateInput.value) || todayInputDate(),
      createdAt: new Date().toISOString()
    });
    els.timelineTextInput.value = '';
    els.timelineComposer.hidden = true;
    renderTimelineEditor();
  }

  function renderTimelineEditor() {
    const sorted = [...state.draftTimeline].sort((a, b) => dateValue(b.date || b.createdAt) - dateValue(a.date || a.createdAt));
    replaceChildren(els.timelineList, ...sorted.map((item) => {
      const row = document.createElement('div');
      row.className = 'timeline-row';
      row.dataset.id = item.id;
      const strong = document.createElement('strong');
      strong.textContent = item.type;
      const p = document.createElement('p');
      p.textContent = item.text;
      const meta = document.createElement('span');
      meta.textContent = formatDate(item.date || item.createdAt);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'ghost-btn small';
      remove.dataset.action = 'remove-timeline';
      remove.textContent = 'Remove';
      row.append(strong, p, meta, remove);
      return row;
    }));
  }

  function handleTimelineClick(event) {
    if (event.target.dataset.action !== 'remove-timeline') return;
    const row = event.target.closest('.timeline-row');
    state.draftTimeline = state.draftTimeline.filter((item) => item.id !== row.dataset.id);
    renderTimelineEditor();
  }

  async function handleCardClick(event) {
    const button = event.target.closest('button');
    const card = event.target.closest('.contact-card');
    if (!button || !card) return;
    const contact = state.contacts.find((item) => item.id === card.dataset.id);
    if (!contact) return;
    const action = button.dataset.action;
    if (action === 'edit') return openContactDialog(contact.id);
    if (action === 'pin') return mutateContact(contact.id, (item) => { item.pinned = !item.pinned; });
    if (action === 'archive') return mutateContact(contact.id, (item) => { item.status = 'archived'; });
    if (action === 'restore') return mutateContact(contact.id, (item) => { item.status = 'active'; });
    if (action === 'contacted') return markContacted(contact.id);
    if (action === 'snooze-7') return snoozeContact(contact.id, 7);
    if (action === 'script') return copySmartMessage(contact);
    if (action === 'share-contact') return shareContact(contact);
    if (action === 'vcard') return downloadContactVcard(contact);
    if (action === 'ics') return downloadContactReminder(contact);
    if (action === 'delete') return deleteContactFlow(contact.id);
  }

  function handleFollowupClick(event) {
    const item = event.target.closest('.followup-item');
    if (!item?.dataset.id) return;
    openContactDialog(item.dataset.id);
  }

  function handleTagRailClick(event) {
    const button = event.target.closest('button[data-tag]');
    if (!button) return;
    state.tag = button.dataset.tag;
    renderAll();
  }


  async function openMessageThreadForContact(contact) {
    if (!contact) return;
    let thread = contact.relayThread ? normalizeRelayThread({ ...contact.relayThread, contactId: contact.id }) : state.relayThreads.find((row) => row.contactId === contact.id);
    if (!thread && contact.relayBridge) {
      try {
        const sender = state.profile || normalizeProfile({ name: 'ConnectLog user' });
        const bridgeCfg = {
          mode: 'relay13',
          origin: contact.relayBridge.origin,
          workspace: contact.relayBridge.workspace,
          workspaceId: contact.relayBridge.workspaceId,
          apiKey: '',
          operatorName: sender.name,
          shareBridge: false
        };
        const previous = state.relayConfig;
        state.relayConfig = normalizeRelayConfig(bridgeCfg);
        let created;
        try {
          created = await createRelayConversation({
            card: { ...sender, id: sender.id || cryptoId(), cardName: contact.relayBridge.cardLabel || contact.cardName || contact.name, audience: contact.relayBridge.campaign || contact.audience || '', welcomeMessage: contact.welcomeMessage || '', note: contact.notes || '' },
            customerName: sender.name || 'ConnectLog contact',
            customerEmail: sender.email || '',
            customerPhone: sender.phone || '',
            body: sender.welcomeMessage || `Message request from ConnectLog after scanning ${contact.name}.`
          });
        } finally {
          state.relayConfig = previous;
        }
        thread = normalizeRelayThread({
          id: created.conversation_id,
          conversationId: created.conversation_id,
          visitorToken: created.visitor_token,
          workspaceId: created.workspace_id || contact.relayBridge.workspaceId,
          workspace: contact.relayBridge.workspace,
          origin: contact.relayBridge.origin,
          contactId: contact.id,
          cardId: contact.relayBridge.cardId,
          title: contact.name,
          mode: 'relay13',
          preview: 'Relay13 conversation opened from ConnectLog contact card.'
        });
        contact.relayThread = thread;
        await putContact(contact);
        await loadContacts();
      } catch (error) {
        thread = normalizeRelayThread({
          id: cryptoId(),
          contactId: contact.id,
          title: contact.name,
          mode: 'local',
          status: 'fallback',
          preview: `Relay13 delivery queued: ${error.message || 'remote request failed'}`,
          messages: [{ senderRole: 'system', senderName: 'ConnectLog', body: `Relay13 did not accept this browser request, so the message was preserved for verified retry. ${error.message || ''}` }]
        });
      }
    }
    if (!thread) {
      thread = normalizeRelayThread({
        id: cryptoId(),
        contactId: contact.id,
        title: contact.name,
        mode: 'local',
        status: 'fallback',
        preview: 'Production vault thread for this contact.',
        messages: [{ senderRole: 'system', senderName: 'ConnectLog', body: 'Production vault thread created. Add Relay13 operator credentials to send through the live bridge.' }]
      });
    }
    upsertRelayThread(thread);
    state.activeRelayThreadId = thread.id;
    await persistRelayState();
    location.hash = 'relay13';
    renderAll();
    showToast(thread.mode === 'relay13' ? 'Relay13 thread opened.' : 'Production vault thread opened.');
  }

  async function mutateContact(id, mutator) {
    const contact = state.contacts.find((item) => item.id === id);
    if (!contact) return;
    const copy = structuredCloneSafe(contact);
    mutator(copy);
    copy.updatedAt = new Date().toISOString();
    await putContact(normalizeContact(copy));
    await loadContacts();
    renderAll();
  }

  async function deleteContactFlow(id) {
    const contact = state.contacts.find((item) => item.id === id);
    if (!contact) return;
    const confirmed = confirm(`Delete ${contact.name}? Export a backup first if you may need this later.`);
    if (!confirmed) return;
    state.deletedSnapshot = structuredCloneSafe(contact);
    await deleteContactById(id);
    await loadContacts();
    renderAll();
    showToast('Contact deleted.', 'Undo', async () => {
      if (!state.deletedSnapshot) return;
      await putContact(state.deletedSnapshot);
      state.deletedSnapshot = null;
      await loadContacts();
      renderAll();
      showToast('Contact restored.');
    });
  }

  function togglePressed(key) {
    state[key] = !state[key];
    if (key === 'dueOnly') els.dueOnlyToggle.setAttribute('aria-pressed', String(state.dueOnly));
    if (key === 'pinnedOnly') els.pinnedOnlyToggle.setAttribute('aria-pressed', String(state.pinnedOnly));
    renderAll();
  }

  function clearFilters() {
    state.query = '';
    state.lane = 'all';
    state.status = 'all';
    state.priority = 'all';
    state.sort = 'updated';
    state.tag = 'all';
    state.dueOnly = false;
    state.pinnedOnly = false;
    els.searchInput.value = '';
    els.laneFilter.value = 'all';
    els.statusFilter.value = 'all';
    els.priorityFilter.value = 'all';
    els.sortSelect.value = 'updated';
    els.dueOnlyToggle.setAttribute('aria-pressed', 'false');
    els.pinnedOnlyToggle.setAttribute('aria-pressed', 'false');
    renderAll();
  }

  const pageAliases = {
    followups: 'contacts',
    vault: 'contacts',
    seed: 'contacts'
  };
  const appPages = new Set(['dashboard', 'tutorial', 'exchange', 'cards', 'relay13', 'deployment', 'contacts', 'intelligence']);

  function activePageFromHash() {
    let raw = '';
    try {
      raw = decodeURIComponent(window.location.hash.replace('#', '') || '').trim();
    } catch {
      raw = window.location.hash.replace('#', '').trim();
    }
    if (!raw || raw.startsWith(CONNECT_HASH_PREFIX)) return 'dashboard';
    const page = pageAliases[raw] || raw;
    return appPages.has(page) ? page : 'dashboard';
  }

  function updateNavState() {
    const page = activePageFromHash();
    document.querySelectorAll('[data-nav-target]').forEach((link) => {
      link.classList.toggle('active', link.dataset.navTarget === page);
    });
    document.querySelectorAll('[data-page]').forEach((section) => {
      section.classList.toggle('page-active', section.dataset.page === page);
    });
    els.appShell?.setAttribute('data-current-room', page);
  }

  window.addEventListener('hashchange', () => {
    updateNavState();
    if (!window.location.hash.startsWith('#connect=')) {
      requestAnimationFrame(() => window.scrollTo(0, 0));
    }
    processIncomingConnectCard();
  });

  function handleGlobalKeys(event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      els.searchInput.focus();
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'n') {
      event.preventDefault();
      openContactDialog();
    }
    if (event.key === 'Escape') {
      if (els.contactDialog.open) closeContactDialog();
      if (els.quickLogDialog.open) closeQuickLogDialog();
      if (els.profileDialog.open) closeProfileDialog();
      if (els.scanDialog.open) closeScanDialog();
      if (els.dedupeDialog?.open) closeDedupeDialog();
    }
  }

  async function exportJson() {
    const payload = {
      app: 'ConnectLog',
      version: APP_VERSION,
      exportedAt: new Date().toISOString(),
      schema: 6,
      profile: state.profile ? normalizeProfile(state.profile) : null,
      profileCards: state.profileCards.map(normalizeProfile),
      activeProfileCardId: state.activeProfileCardId,
      relayConfig: sanitizeRelayConfigForExport(state.relayConfig),
      relayThreads: state.relayThreads.map(sanitizeRelayThreadForExport),
      relayOutbox: state.relayOutbox.map((item) => ({ ...item, visitorToken: item.visitorToken ? '[stored-locally]' : '' })),
      contacts: state.contacts.map(normalizeContact)
    };
    downloadFile(`connectlog-backup-${todayInputDate()}.json`, JSON.stringify(payload, null, 2), 'application/json');
    showToast('JSON backup exported.');
  }

  function exportCsv() {
    const headers = ['name', 'company', 'role', 'lane', 'status', 'priority', 'pinned', 'nextFollowUpAt', 'tags', 'details', 'notes', 'updatedAt'];
    const rows = state.contacts.map((contact) => [
      contact.name,
      contact.company,
      contact.role,
      contact.lane,
      contact.status,
      contact.priority,
      contact.pinned ? 'yes' : 'no',
      contact.nextFollowUpAt,
      contact.tags.join('|'),
      contact.details.map((detail) => `${detail.label || detail.type}: ${detail.value}`).join('|'),
      contact.notes,
      contact.updatedAt
    ]);
    const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n');
    downloadFile(`connectlog-contacts-${todayInputDate()}.csv`, csv, 'text/csv');
    showToast('CSV export created.');
  }

  async function importJsonFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) return showToast('Import blocked: file is over 5 MB. Split the backup first.');
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const contacts = parseImportPayload(parsed);
      const incomingCards = Array.isArray(parsed?.profileCards) ? parsed.profileCards.map(normalizeProfile).filter((card) => card.name) : [];
      const incomingProfile = parsed?.profile && typeof parsed.profile === 'object' ? normalizeProfile(parsed.profile) : null;
      if (parsed?.relayConfig) state.relayConfig = normalizeRelayConfig(parsed.relayConfig);
      if (Array.isArray(parsed?.relayThreads)) state.relayThreads = parsed.relayThreads.map(normalizeRelayThread).filter(Boolean);
      if (Array.isArray(parsed?.relayOutbox)) state.relayOutbox = parsed.relayOutbox.map(normalizeRelayOutboxItem).filter(Boolean);
      if (!contacts.length && !incomingProfile?.name && !incomingCards.length && !parsed?.relayConfig && !Array.isArray(parsed?.relayThreads)) return showToast('No valid contacts, profile cards, or Relay13 settings found in that JSON file.');
      const cardCount = incomingCards.length || (incomingProfile?.name ? 1 : 0);
      const replace = contacts.length ? confirm(`Found ${contacts.length} valid contacts${cardCount ? ` and ${cardCount} exchange card${cardCount === 1 ? '' : 's'}` : ''}. Press OK to merge with current records. Press Cancel to replace all current records.`) : true;
      if (!replace) await clearContactStore();
      if (incomingCards.length || incomingProfile?.name) {
        const existingById = new Map(state.profileCards.map((card) => [card.id, card]));
        const cardsToMerge = incomingCards.length ? incomingCards : [incomingProfile];
        cardsToMerge.forEach((card) => existingById.set(card.id, card));
        state.profileCards = [...existingById.values()];
        state.activeProfileCardId = parsed?.activeProfileCardId || cardsToMerge[0]?.id || state.activeProfileCardId;
        await saveProfileCards();
      }
      const currentById = new Map(state.contacts.map((contact) => [contact.id, contact]));
      const normalized = contacts.map(normalizeContact);
      for (const contact of normalized) {
        const existing = currentById.get(contact.id);
        if (existing && dateValue(existing.updatedAt) > dateValue(contact.updatedAt)) continue;
        await putContact(contact);
      }
      await persistRelayState();
      await loadContacts();
      renderAll();
      renderProfileSummary();
      showToast(`${normalized.length} contacts imported${cardCount ? ` and ${cardCount} profile card${cardCount === 1 ? '' : 's'} restored` : ''}.`);
    } catch (error) {
      console.error(error);
      showToast('Import failed. The JSON is malformed or unsupported.');
    }
  }


  async function importCsvFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (file.size > MAX_IMPORT_BYTES) return showToast('CSV import blocked: file is over 5 MB. Split it first.');
    try {
      const text = await file.text();
      const contacts = parseCsvContacts(text);
      if (!contacts.length) return showToast('No valid contacts found in that CSV. Include at least a name column.');
      const confirmed = confirm(`Found ${contacts.length} CSV contacts. Press OK to merge by email/phone/name. Press Cancel to stop.`);
      if (!confirmed) return;
      const result = await mergeContactsIntoVault(contacts, 'CSV import');
      await loadContacts();
      renderAll();
      showToast(`CSV import complete: ${result.created} created, ${result.updated} updated.`);
    } catch (error) {
      console.error(error);
      showToast('CSV import failed. Check headers and quoting.');
    }
  }

  async function wipeLocalData() {
    const confirmed = confirm('This will erase all local ConnectLog contacts and your exchange profile in this browser. Export a JSON backup first. Continue?');
    if (!confirmed) return;
    await clearContactStore();
    await clearMetaStore();
    state.contacts = [];
    state.profile = null;
    state.profileCards = [];
    state.activeProfileCardId = '';
    localStorage.removeItem('connectlog-active-profile-card');
    state.relayConfig = defaultRelayConfig();
    state.relayThreads = [];
    state.relayOutbox = [];
    state.activeRelayThreadId = '';
    state.relayStatus = 'Relay13 production bridge live.';
    state.activeQrPayload = '';
    state.activeQrSvg = '';
    state.activeQrKind = '';
    els.qrStage.hidden = true;
    renderAll();
    showToast('Private device data wiped.');
  }

  async function markContacted(id) {
    const today = todayInputDate();
    await mutateContact(id, (item) => {
      item.lastContactedAt = today;
      item.status = item.status === 'archived' ? 'active' : item.status;
      item.nextFollowUpAt = addDaysInput(14);
      item.timeline = [
        ...(item.timeline || []),
        { id: cryptoId(), type: 'call', text: 'Marked contacted from the command surface.', date: today, createdAt: new Date().toISOString() }
      ];
    });
    showToast('Contact marked. Follow-up moved 14 days out.');
  }

  async function snoozeContact(id, days) {
    await mutateContact(id, (item) => {
      item.nextFollowUpAt = addDaysInput(days);
      item.status = item.status === 'archived' ? 'active' : 'follow-up';
      item.timeline = [
        ...(item.timeline || []),
        { id: cryptoId(), type: 'task', text: `Follow-up snoozed ${days} days.`, date: todayInputDate(), createdAt: new Date().toISOString() }
      ];
    });
    showToast(`Follow-up moved ${days} days out.`);
  }

  function downloadContactReminder(contact) {
    const date = normalizeDate(contact.nextFollowUpAt) || addDaysInput(1);
    const start = date.replace(/-/g, '') + 'T160000';
    const end = date.replace(/-/g, '') + 'T163000';
    const summary = `Follow up with ${contact.name}`;
    const description = [
      `ConnectLog reminder for ${contact.name}.`,
      contact.company ? `Company: ${contact.company}` : '',
      contact.role ? `Role: ${contact.role}` : '',
      contact.notes ? `Notes: ${contact.notes}` : ''
    ].filter(Boolean).join('\\n');
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ConnectLog//Connection OS//EN',
      'BEGIN:VEVENT',
      `UID:${contact.id}@connectlog.local`,
      `DTSTAMP:${toIcsDateTime(new Date())}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${escapeIcs(summary)}`,
      `DESCRIPTION:${escapeIcs(description)}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\\r\\n');
    downloadFile(`connectlog-followup-${safeFileName(contact.name)}.ics`, `${ics}\\r\\n`, 'text/calendar;charset=utf-8');
    showToast('Calendar reminder downloaded.');
  }

  function exportAllVcards() {
    if (!state.contacts.length) return showToast('No contacts to export.');
    const vcards = state.contacts.map((contact) => buildVCard(profileFromContact(contact))).join('\\r\\n');
    downloadFile(`connectlog-vcards-${todayInputDate()}.vcf`, vcards, 'text/vcard;charset=utf-8');
    showToast('All contacts exported as vCards.');
  }

  function downloadProfileQrCard() {
    if (!ensureProfileReady()) return;
    const profile = state.profile;
    const link = makeConnectLogLink(profile);
    const vcard = buildVCard(profile, { photoMode: 'full' });
    const qrSvg = window.ConnectLogQR?.createSvg(link, { level: window.ConnectLogQR.EC_L, dark: '#05070d', light: '#ffffff' }) || '';
    const photo = profile.photoData || profile.photoThumbData;
    const photoHtml = photo ? `<img class="photo" src="${escapeHtml(photo)}" alt="${escapeHtml(profile.name)} photo">` : '<div class="brand">CL</div>';
    const message = profile.welcomeMessage || profile.note || 'Scan this QR to save the card, then use the vCard download for phone contacts.';
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(profile.cardName || profile.name)} — ConnectLog Card</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(circle at 20% 0%,rgba(110,231,249,.20),transparent 38%),radial-gradient(circle at 86% 10%,rgba(255,106,0,.20),transparent 36%),#05070d;color:#f7fbff;font-family:Inter,system-ui,sans-serif}.card{position:relative;width:min(760px,calc(100vw - 28px));padding:34px;border:1px solid rgba(255,255,255,.16);border-radius:34px;background:linear-gradient(145deg,rgba(255,255,255,.10),rgba(255,255,255,.045));box-shadow:0 24px 90px rgba(0,0,0,.45);overflow:hidden}.brand,.photo{display:inline-grid;place-items:center;width:92px;height:92px;margin-bottom:18px;border-radius:28px;background:linear-gradient(135deg,#10bfe0,#ff7a18 54%,#6948f4);font-weight:950;letter-spacing: 0;font-size:1.45rem;box-shadow:0 0 26px rgba(110,231,249,.30),0 0 30px rgba(255,106,0,.20);object-fit:cover}h1{margin:0;font-size:clamp(2rem,8vw,4.2rem);letter-spacing: 0;line-height:.9}p{color:#9fb0c7;line-height:1.55}.badge{display:inline-block;color:#6ee7f9;text-transform:uppercase;font-weight:900;font-size:.72rem;letter-spacing:.16em}.qr{background:white;border-radius:22px;padding:14px;margin:22px 0}.qr svg{width:100%;height:auto;display:block}.actions{display:flex;gap:10px;flex-wrap:wrap}a,button{border:1px solid rgba(255,255,255,.14);border-radius:16px;padding:12px 16px;color:#f7fbff;background:rgba(255,255,255,.08);text-decoration:none}.primary{background:linear-gradient(135deg,#10bfe0,#ff7a18 54%,#6948f4);font-weight:800}</style></head><body><main class="card">${photoHtml}<p class="badge">${escapeHtml(profile.cardName || 'ConnectLog exchange card')}</p><h1>${escapeHtml(profile.name)}</h1><p>${escapeHtml([profile.audience, profile.role, profile.company].filter(Boolean).join(' · ') || 'Scan to save this connection.')}</p><div class="qr">${qrSvg}</div><p>${escapeHtml(message)}</p><div class="actions"><a class="primary" href="${escapeHtml(link)}">Open ConnectLog card</a><a download="${safeFileName(profile.cardName || profile.name)}.vcf" href="data:text/vcard;charset=utf-8,${encodeURIComponent(vcard)}">Download phone contact</a></div></main></body></html>`;
    downloadFile(`connectlog-card-${safeFileName(profile.cardName || profile.name)}.html`, html, 'text/html;charset=utf-8');
    showToast('Shareable HTML card downloaded.');
  }

  function openScanDialog() {
    els.scanPayloadInput.value = '';
    els.scanStatus.textContent = 'Ready. Start camera scanning or paste a ConnectLog link / vCard payload below.';
    els.scanVideo.hidden = true;
    els.scannerPlaceholder.hidden = false;
    openDialog(els.scanDialog, els.scanPayloadInput);
  }

  function closeScanDialog() {
    stopQrScanner();
    els.scanDialog.close();
  }

  async function startQrScanner() {
    if (!('BarcodeDetector' in window)) {
      els.scanStatus.textContent = 'Camera QR detection is not supported in this browser. Paste the payload manually.';
      showToast('Paste mode is available in this browser.');
      return;
    }
    try {
      stopQrScanner();
      state.scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      els.scanVideo.srcObject = state.scanStream;
      els.scanVideo.hidden = false;
      els.scannerPlaceholder.hidden = true;
      await els.scanVideo.play();
      const detector = new BarcodeDetector({ formats: ['qr_code'] });
      els.scanStatus.textContent = 'Scanning. Point the camera at a ConnectLog QR or vCard QR.';
      const tick = async () => {
        if (!state.scanStream) return;
        try {
          const codes = await detector.detect(els.scanVideo);
          const raw = codes?.[0]?.rawValue || '';
          if (raw) {
            els.scanPayloadInput.value = raw;
            stopQrScanner();
            await importPayloadText(raw);
            return;
          }
        } catch (error) {
          console.warn('Scanner tick failed:', error);
        }
        state.scanLoop = requestAnimationFrame(tick);
      };
      state.scanLoop = requestAnimationFrame(tick);
    } catch (error) {
      console.error(error);
      els.scanStatus.textContent = 'Camera permission failed. Paste the QR payload manually.';
      showToast('Camera scanner could not start. Paste mode is still available.');
    }
  }

  function stopQrScanner() {
    if (state.scanLoop) cancelAnimationFrame(state.scanLoop);
    state.scanLoop = null;
    if (state.scanStream) {
      state.scanStream.getTracks().forEach((track) => track.stop());
      state.scanStream = null;
    }
    if (els.scanVideo) {
      els.scanVideo.pause?.();
      els.scanVideo.srcObject = null;
      els.scanVideo.hidden = true;
    }
    if (els.scannerPlaceholder) els.scannerPlaceholder.hidden = false;
  }

  async function importScannedPayload(event) {
    event.preventDefault();
    const text = cleanInput(els.scanPayloadInput.value, 12000);
    if (!text) return showToast('Paste a ConnectLog link, ConnectLog payload, or vCard first.');
    await importPayloadText(text);
  }

  async function importPayloadText(text) {
    try {
      const result = await parseExternalPayload(text);
      if (!result) throw new Error('Unsupported payload.');
      await loadContacts();
      renderAll();
      closeScanDialog();
      showToast(result);
    } catch (error) {
      console.error(error);
      els.scanStatus.textContent = 'Import failed. The payload was not a supported ConnectLog card or vCard.';
      showToast('Payload import failed.');
    }
  }

  async function parseExternalPayload(text) {
    const raw = String(text || '').trim();
    const hashMatch = raw.match(/#connect=([^\s]+)/) || raw.match(/^connect=([^\s]+)/) || raw.match(/^([^\s]+)$/);
    if (raw.includes('BEGIN:VCARD')) {
      const contact = normalizeContact(contactFromVCard(raw));
      const existing = findMatchingContact(contact);
      await putContact(existing ? mergeImportedContact(existing, contact, new Date().toISOString()) : contact);
      return existing ? `${contact.name} was updated from vCard.` : `${contact.name} was saved from vCard.`;
    }
    if (raw.includes('#connect=') || raw.startsWith('connect=')) {
      const encoded = raw.includes('#connect=') ? raw.split('#connect=')[1] : raw.replace(/^connect=/, '');
      const parsed = JSON.parse(base64UrlDecode(encoded.split(/[&#?]/)[0]));
      if (parsed?.t !== 'connectlog-card' || !parsed?.p) throw new Error('Invalid ConnectLog payload.');
      const profile = normalizeProfile(expandCompactProfile(parsed.p));
      const status = await importProfileAsContact(profile);
      return status === 'updated' ? `${profile.name} was updated from ConnectLog QR.` : `${profile.name} was saved from ConnectLog QR.`;
    }
    if (hashMatch && raw.length > 40) {
      try {
        const parsed = JSON.parse(base64UrlDecode(hashMatch[1] || hashMatch[0]));
        if (parsed?.t === 'connectlog-card' && parsed?.p) {
          const profile = normalizeProfile(expandCompactProfile(parsed.p));
          const status = await importProfileAsContact(profile);
          return status === 'updated' ? `${profile.name} was updated from ConnectLog payload.` : `${profile.name} was saved from ConnectLog payload.`;
        }
      } catch (_) {}
    }
    return '';
  }

  function contactFromVCard(vcard) {
    const lines = String(vcard || '').split(/\r?\n/);
    const readLine = (key) => {
      const line = lines.find((item) => item.toUpperCase().startsWith(key));
      return unescapeVCard(line?.split(':').slice(1).join(':') || '');
    };
    const now = new Date().toISOString();
    const email = readLine('EMAIL');
    const phone = readLine('TEL');
    const website = readLine('URL');
    const location = readLine('ADR');
    const photoLine = lines.find((item) => item.toUpperCase().startsWith('PHOTO'));
    const photoType = photoLine?.match(/TYPE=([^;:]+)/i)?.[1]?.toLowerCase() || 'jpeg';
    const photoBase64 = photoLine?.split(':').slice(1).join(':') || '';
    const photoData = photoBase64 ? `data:image/${photoType === 'jpg' ? 'jpeg' : photoType};base64,${photoBase64}` : '';
    const details = [
      ['email', 'Email', email],
      ['phone', 'Phone', phone],
      ['website', 'Website', website],
      ['location', 'Location', location.replace(/^;*|;*$/g, '').replace(/;+/g, ', ')]
    ].filter(([, , value]) => value).map(([type, label, value]) => ({ id: cryptoId(), type, label, value }));
    return {
      id: cryptoId(),
      name: readLine('FN') || readLine('N') || 'Imported contact',
      lane: 'lead',
      company: readLine('ORG'),
      role: readLine('TITLE'),
      status: 'active',
      priority: 'normal',
      tags: ['vcard-import'],
      details,
      notes: readLine('NOTE'),
      photoData: validImageDataUrl(photoData) ? photoData : '',
      photoThumbData: validImageDataUrl(photoData) ? photoData : '',
      photoName: photoData ? 'vcard-photo' : '',
      timeline: [{ id: cryptoId(), type: 'note', text: 'Imported from vCard QR/payload.', date: todayInputDate(), createdAt: now }],
      createdAt: now,
      updatedAt: now
    };
  }

  async function scanSeedFolder() {
    const manifestUrl = new URL('./seed-data/manifest.json', window.location.href).toString();
    state.seedLog = [];
    renderSeedResults('Scanning seed-data/manifest.json...');
    try {
      const manifestResponse = await fetch(manifestUrl, { cache: 'no-store' });
      if (!manifestResponse.ok) throw new Error(`Manifest returned ${manifestResponse.status}`);
      const manifest = await manifestResponse.json();
      const files = Array.isArray(manifest.files) ? manifest.files : [];
      if (!files.length) {
        renderSeedResults('No files listed in seed-data/manifest.json.');
        return showToast('Seed manifest found, but it has no files.');
      }
      let imported = 0;
      let updated = 0;
      let skipped = 0;
      for (const entry of files.slice(0, 100)) {
        const fileName = typeof entry === 'string' ? entry : entry?.file;
        if (!fileName || fileName.includes('..')) { skipped++; continue; }
        const url = new URL(`./seed-data/${fileName}`, window.location.href).toString();
        try {
          const response = await fetch(url, { cache: 'no-store' });
          if (!response.ok) throw new Error(`${response.status}`);
          const payload = await response.json();
          const contacts = parseImportPayload(payload).map((item) => normalizeContact({ ...item, tags: [...new Set([...(item.tags || []), 'seed-pack'])] }));
          const result = await mergeContacts(contacts);
          imported += result.created;
          updated += result.updated;
          state.seedLog.push(`✅ ${fileName}: ${result.created} created, ${result.updated} updated.`);
        } catch (error) {
          skipped++;
          state.seedLog.push(`☐ ${fileName}: skipped (${error.message || 'failed'}).`);
        }
      }
      await loadContacts();
      renderAll();
      renderSeedResults();
      showToast(`Seed scan complete: ${imported} created, ${updated} updated, ${skipped} skipped.`);
    } catch (error) {
      console.error(error);
      renderSeedResults('Seed folder unavailable. Deploy seed-data/manifest.json beside the app, then scan again.');
      showToast('Seed folder scan failed.');
    }
  }

  async function mergeContacts(contacts) {
    let created = 0;
    let updated = 0;
    for (const contact of contacts) {
      const existing = findMatchingContact(contact) || state.contacts.find((item) => item.id === contact.id);
      if (existing) {
        await putContact(mergeImportedContact(existing, contact, new Date().toISOString()));
        updated++;
      } else {
        await putContact(contact);
        state.contacts.push(contact);
        created++;
      }
    }
    return { created, updated };
  }

  function renderSeedResults(message = '') {
    if (!els.seedResults) return;
    const lines = message ? [message] : state.seedLog.length ? state.seedLog.slice(-8) : ['No seed scan has run in this browser yet.'];
    replaceChildren(els.seedResults, ...lines.map((line) => {
      const row = document.createElement('p');
      row.textContent = line;
      return row;
    }));
  }


  function renderRelationshipIntelligence() {
    if (!els.missionBrief || !els.relationshipQueue) return;
    const active = state.contacts.filter((contact) => contact.status !== 'archived');
    const actionable = getActionableContacts();
    const due = active.filter(isDue);
    const dormant = active.filter(isDormant);
    const upcoming = active.filter(isUpcomingSoon);
    const focus = actionable[0] || active.sort((a, b) => relationshipPriorityScore(b) - relationshipPriorityScore(a))[0];

    const brief = document.createElement('div');
    brief.className = 'brief-card';
    const h3 = document.createElement('h3');
    h3.textContent = focus ? `Focus: ${focus.name}` : 'No mission yet';
    const p = document.createElement('p');
    p.textContent = focus ? nextMoveText(focus) : 'Add or import contacts, then ConnectLog will build a daily action list from due dates, priority, stale records, and logged context.';
    const chips = document.createElement('div');
    chips.className = 'card-meta';
    chips.append(
      miniChip(`${due.length} due`),
      miniChip(`${upcoming.length} upcoming`),
      miniChip(`${dormant.length} at risk`),
      miniChip(`${countLoggedTasks(active)} tasks`)
    );
    brief.append(h3, p, chips);
    replaceChildren(els.missionBrief, brief);

    const queue = actionable.slice(0, 5).map((contact) => renderQueueItem(contact));
    if (!queue.length) {
      const empty = document.createElement('p');
      empty.className = 'panel-hint';
      empty.textContent = 'No urgent contacts. Pin strategic people or set follow-up dates to build the command queue.';
      replaceChildren(els.relationshipQueue, empty);
      return;
    }
    replaceChildren(els.relationshipQueue, ...queue);
  }

  function renderQueueItem(contact) {
    const item = document.createElement('article');
    item.className = 'queue-item';
    item.dataset.id = contact.id;
    const title = document.createElement('strong');
    title.textContent = contact.name;
    const meta = document.createElement('span');
    meta.textContent = [readableLane(contact.lane), contact.priority, contact.nextFollowUpAt ? `next ${formatDate(contact.nextFollowUpAt)}` : 'no date'].join(' · ');
    const move = document.createElement('p');
    move.textContent = nextMoveText(contact);
    const actions = document.createElement('div');
    actions.className = 'queue-actions';
    const open = smallButton('Open', 'queue-open');
    const script = smallButton('Script', 'queue-script');
    const done = smallButton('Contacted', 'queue-contacted');
    actions.append(open, script, done);
    item.append(title, meta, move, actions);
    return item;
  }

  async function handleQueueClick(event) {
    const button = event.target.closest('button');
    const item = event.target.closest('.queue-item');
    if (!button || !item) return;
    const contact = state.contacts.find((entry) => entry.id === item.dataset.id);
    if (!contact) return;
    const action = button.dataset.action;
    if (action === 'queue-open') return openContactDialog(contact.id);
    if (action === 'queue-script') return copySmartMessage(contact);
    if (action === 'queue-contacted') return markContacted(contact.id);
  }

  function getActionableContacts() {
    return state.contacts
      .filter((contact) => contact.status !== 'archived')
      .filter((contact) => isDue(contact) || isUpcomingSoon(contact) || isDormant(contact) || contact.priority === 'critical' || contact.priority === 'high' || contact.pinned)
      .sort((a, b) => relationshipPriorityScore(b) - relationshipPriorityScore(a));
  }

  function relationshipPriorityScore(contact) {
    let score = priorityWeight[contact.priority] * 10 || 0;
    if (contact.pinned) score += 18;
    if (isDue(contact)) score += 32;
    if (isUpcomingSoon(contact)) score += 16;
    if (isDormant(contact)) score += 22;
    if (!contact.nextFollowUpAt) score += 6;
    score += Math.min((contact.timeline || []).length * 2, 10);
    return score;
  }

  function nextMoveText(contact) {
    if (isDue(contact)) return `Follow up now. Ask about the last context: ${latestTimelineText(contact) || contact.notes || 'their current need and next step'}.`;
    if (isDormant(contact)) return 'Relationship is getting cold. Send a light re-open message and set a concrete next follow-up.';
    if (contact.priority === 'critical' || contact.priority === 'high') return 'High-value contact. Confirm the next action, deadline, and best channel.';
    if (!contact.nextFollowUpAt) return 'No next follow-up is set. Add one so this relationship does not disappear.';
    return `Keep warm before ${formatDate(contact.nextFollowUpAt)}. Capture any useful context in the timeline.`;
  }

  function countLoggedTasks(list) {
    return list.reduce((total, contact) => total + (contact.timeline || []).filter((item) => item.type === 'task').length, 0);
  }

  function buildDailyBriefText() {
    const actionable = getActionableContacts();
    const due = state.contacts.filter((contact) => contact.status !== 'archived' && isDue(contact));
    const dormant = state.contacts.filter((contact) => contact.status !== 'archived' && isDormant(contact));
    const lines = [
      'ConnectLog daily relationship brief',
      `Generated: ${new Date().toLocaleString()}`,
      `Total contacts: ${state.contacts.length}`,
      `Due now: ${due.length}`,
      `At risk: ${dormant.length}`,
      '',
      'Top moves:'
    ];
    actionable.slice(0, 8).forEach((contact, index) => {
      lines.push(`${index + 1}. ${contact.name} — ${nextMoveText(contact)}`);
    });
    if (!actionable.length) lines.push('No urgent moves. Add follow-up dates or pin strategic contacts.');
    return lines.join('\n');
  }

  function copyDailyBrief() {
    copyText(buildDailyBriefText(), 'Daily relationship brief copied.');
  }

  async function requestPersistentStorage() {
    if (!navigator.storage?.persist) return showToast('This browser does not expose persistent storage controls. Keep exporting backups.');
    const granted = await navigator.storage.persist();
    await checkStorageHealth();
    showToast(granted ? 'Persistent storage granted for ConnectLog.' : 'Persistent storage was not granted. Keep JSON backups active.');
  }

  function exportDailyAgenda() {
    const contacts = getActionableContacts().filter((contact) => isDue(contact) || isUpcomingSoon(contact)).slice(0, 24);
    if (!contacts.length) return showToast('No due or upcoming contacts to place on the agenda.');
    const today = todayInputDate().replace(/-/g, '');
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ConnectLog//Daily Agenda//EN'];
    contacts.forEach((contact, index) => {
      const hour = 9 + Math.floor(index / 2);
      const minute = index % 2 ? '30' : '00';
      const endMinute = index % 2 ? '00' : '30';
      const endHour = index % 2 ? hour + 1 : hour;
      lines.push(
        'BEGIN:VEVENT',
        `UID:${contact.id}-${today}@connectlog.local`,
        `DTSTAMP:${toIcsDateTime(new Date())}`,
        `DTSTART:${today}T${String(hour).padStart(2, '0')}${minute}00`,
        `DTEND:${today}T${String(endHour).padStart(2, '0')}${endMinute}00`,
        `SUMMARY:${escapeIcs(`ConnectLog: ${contact.name}`)}`,
        `DESCRIPTION:${escapeIcs(nextMoveText(contact) + '\n\n' + (contact.notes || ''))}`,
        'END:VEVENT'
      );
    });
    lines.push('END:VCALENDAR');
    downloadFile(`connectlog-daily-agenda-${todayInputDate()}.ics`, `${lines.join('\r\n')}\r\n`, 'text/calendar;charset=utf-8');
    showToast('Daily agenda exported.');
  }

  function exportWarmListCsv() {
    const contacts = getActionableContacts().filter((contact) => contact.status !== 'archived');
    if (!contacts.length) return showToast('No warm/actionable contacts to export.');
    const headers = ['name', 'company', 'role', 'lane', 'status', 'priority', 'email', 'phone', 'nextMove', 'nextFollowUpAt', 'tags'];
    const rows = contacts.map((contact) => [
      contact.name,
      contact.company,
      contact.role,
      contact.lane,
      contact.status,
      contact.priority,
      detailValue(contact, 'email'),
      detailValue(contact, 'phone'),
      nextMoveText(contact),
      contact.nextFollowUpAt,
      contact.tags.join('|')
    ]);
    downloadFile(`connectlog-warm-list-${todayInputDate()}.csv`, [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n'), 'text/csv;charset=utf-8');
    showToast('Warm list CSV exported.');
  }

  function copyIntroTemplate() {
    const name = state.profile?.name || 'your name';
    const offer = state.profile?.note || 'what you do and the best next step';
    const text = `Hey — this is ${name}. Good connecting with you. Here is the quick context so it does not get lost: ${offer}\n\nBest next step: reply here with the best time/channel and I will follow up.`;
    copyText(text, 'Intro template copied.');
  }

  function copySmartMessage(contact) {
    const profileName = state.profile?.name || 'me';
    const detail = latestTimelineText(contact) || contact.notes || 'our last conversation';
    const text = `Hey ${firstName(contact.name)}, it is ${profileName}. I was thinking about ${detail}. Wanted to follow up and see what the best next step is from here.`;
    copyText(text, `Message script copied for ${contact.name}.`);
  }

  async function shareContact(contact) {
    const profile = profileFromContact(contact);
    const text = `${profile.name}\n${[profile.role, profile.company].filter(Boolean).join(' · ')}\n${profile.email || ''}\n${profile.phone || ''}\n${profile.website || ''}`.trim();
    if (navigator.share) {
      try {
        await navigator.share({ title: profile.name, text });
        showToast('Contact shared.');
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
      }
    }
    copyText(text, 'Contact summary copied.');
  }

  function downloadContactVcard(contact) {
    const profile = profileFromContact(contact);
    downloadFile(`${safeFileName(profile.name)}.vcf`, buildVCard(profile), 'text/vcard;charset=utf-8');
    showToast('Contact vCard downloaded.');
  }

  function firstName(name) {
    return cleanInput(name, 80).split(/\s+/)[0] || 'there';
  }

  function openDedupeDialog() {
    state.duplicateGroups = findDuplicateGroups();
    renderDedupeResults();
    openDialog(els.dedupeDialog, els.closeDedupeBtn);
  }

  function closeDedupeDialog() {
    els.dedupeDialog.close();
  }

  function findDuplicateGroups() {
    const buckets = new Map();
    const add = (key, contact) => {
      if (!key) return;
      if (!buckets.has(key)) buckets.set(key, new Map());
      buckets.get(key).set(contact.id, contact);
    };
    state.contacts.forEach((contact) => {
      const email = normalizeText(detailValue(contact, 'email'));
      const phone = normalizePhone(detailValue(contact, 'phone'));
      const nameCompany = `${normalizeText(contact.name)}|${normalizeText(contact.company)}`;
      if (email) add(`email:${email}`, contact);
      if (phone) add(`phone:${phone}`, contact);
      if (normalizeText(contact.name)) add(`name:${nameCompany}`, contact);
    });
    return [...buckets.values()]
      .map((map) => [...map.values()])
      .filter((group) => group.length > 1)
      .sort((a, b) => b.length - a.length)
      .slice(0, 50);
  }

  function renderDedupeResults() {
    if (!els.dedupeResults) return;
    if (!state.duplicateGroups.length) {
      const empty = document.createElement('p');
      empty.className = 'panel-hint';
      empty.textContent = 'No duplicate groups found by email, phone, or exact name/company.';
      replaceChildren(els.dedupeResults, empty);
      return;
    }
    replaceChildren(els.dedupeResults, ...state.duplicateGroups.map((group, index) => {
      const card = document.createElement('article');
      card.className = 'dedupe-card';
      card.dataset.index = String(index);
      const h3 = document.createElement('h3');
      h3.textContent = `${group.length} possible matches`;
      const list = document.createElement('div');
      list.className = 'dedupe-list';
      group.forEach((contact) => {
        const row = document.createElement('p');
        row.textContent = `${contact.name}${contact.company ? ' · ' + contact.company : ''} · ${contact.updatedAt ? relativeDate(contact.updatedAt) : 'unknown update'}`;
        list.append(row);
      });
      const merge = document.createElement('button');
      merge.type = 'button';
      merge.className = 'primary-btn small';
      merge.dataset.action = 'merge-duplicate-group';
      merge.dataset.index = String(index);
      merge.textContent = 'Merge this group';
      card.append(h3, list, merge);
      return card;
    }));
  }

  async function handleDedupeClick(event) {
    const button = event.target.closest('button[data-action="merge-duplicate-group"]');
    if (!button) return;
    const group = state.duplicateGroups[Number(button.dataset.index)];
    if (!group?.length) return;
    const confirmed = confirm(`Merge ${group.length} records into one contact? This keeps combined details, tags, notes, and timeline items.`);
    if (!confirmed) return;
    await mergeDuplicateGroup(group);
    await loadContacts();
    renderAll();
    state.duplicateGroups = findDuplicateGroups();
    renderDedupeResults();
    showToast('Duplicate group merged.');
  }

  async function mergeDuplicateGroup(group) {
    const sorted = [...group].sort((a, b) => relationshipPriorityScore(b) - relationshipPriorityScore(a) || dateValue(b.updatedAt) - dateValue(a.updatedAt));
    const primary = structuredCloneSafe(sorted[0]);
    const now = new Date().toISOString();
    const detailKey = (detail) => `${detail.type}:${normalizeText(detail.value)}`;
    const details = [];
    const seenDetails = new Set();
    const timelines = [];
    const notes = [];
    const tags = new Set();
    sorted.forEach((contact) => {
      contact.details.forEach((detail) => {
        const key = detailKey(detail);
        if (!seenDetails.has(key) && detail.value) {
          seenDetails.add(key);
          details.push(detail);
        }
      });
      contact.tags.forEach((tag) => tags.add(tag));
      if (contact.notes && !notes.includes(contact.notes)) notes.push(contact.notes);
      timelines.push(...(contact.timeline || []));
    });
    const merged = normalizeContact({
      ...primary,
      pinned: sorted.some((contact) => contact.pinned),
      priority: sorted.reduce((best, contact) => (priorityWeight[contact.priority] || 0) > (priorityWeight[best.priority] || 0) ? contact : best, primary).priority,
      nextFollowUpAt: earliestDate(sorted.map((contact) => contact.nextFollowUpAt).filter(Boolean)) || primary.nextFollowUpAt,
      tags: [...tags, 'deduped'],
      details,
      notes: notes.join('\n\n--- merged note ---\n\n'),
      timeline: [...timelines, { id: cryptoId(), type: 'note', text: `Merged ${group.length} duplicate records.`, date: todayInputDate(), createdAt: now }],
      updatedAt: now
    });
    await putContact(merged);
    await Promise.all(sorted.slice(1).map((contact) => deleteContactById(contact.id)));
  }

  function earliestDate(values) {
    return values.sort((a, b) => dateValue(a) - dateValue(b))[0] || '';
  }

  async function mergeContactsIntoVault(contacts, sourceLabel = 'import') {
    let created = 0;
    let updated = 0;
    for (const raw of contacts) {
      const incoming = normalizeContact(raw);
      if (!incoming.name) continue;
      const existing = findMatchingContact(incoming);
      const now = new Date().toISOString();
      if (existing) {
        await putContact(mergeImportedContact(existing, {
          ...incoming,
          timeline: [...incoming.timeline, { id: cryptoId(), type: 'note', text: `Updated from ${sourceLabel}.`, date: todayInputDate(), createdAt: now }]
        }, now));
        updated++;
      } else {
        await putContact(normalizeContact({
          ...incoming,
          timeline: [...incoming.timeline, { id: cryptoId(), type: 'note', text: `Created from ${sourceLabel}.`, date: todayInputDate(), createdAt: now }]
        }));
        created++;
      }
      await loadContacts();
    }
    return { created, updated };
  }

  function parseCsvContacts(text) {
    const rows = parseCsvRows(text);
    if (rows.length < 2) return [];
    const headers = rows[0].map((header) => normalizeText(header).replace(/[^a-z0-9]+/g, ' ').trim());
    const indexOf = (...names) => names.map((name) => headers.indexOf(name)).find((index) => index >= 0);
    const idx = {
      name: indexOf('name', 'full name', 'contact name', 'business name', 'company name'),
      company: indexOf('company', 'organization', 'business', 'account'),
      role: indexOf('role', 'title', 'job title', 'position'),
      lane: indexOf('lane', 'type', 'category'),
      status: indexOf('status'),
      priority: indexOf('priority'),
      email: indexOf('email', 'email address', 'mail'),
      phone: indexOf('phone', 'phone number', 'mobile', 'telephone'),
      website: indexOf('website', 'url', 'site'),
      linkedin: indexOf('linkedin', 'linked in'),
      x: indexOf('x', 'twitter', 'x twitter'),
      github: indexOf('github'),
      location: indexOf('location', 'address', 'city', 'service area'),
      tags: indexOf('tags', 'tag'),
      notes: indexOf('notes', 'note', 'description', 'context'),
      nextFollowUpAt: indexOf('next follow up', 'nextfollowupat', 'follow up date', 'followup date')
    };
    return rows.slice(1).map((row) => {
      const get = (key) => idx[key] == null ? '' : cleanInput(row[idx[key]] || '', 6000);
      const name = get('name') || get('company');
      const details = [
        ['email', 'Email', get('email')],
        ['phone', 'Phone', get('phone')],
        ['website', 'Website', get('website')],
        ['linkedin', 'LinkedIn', get('linkedin')],
        ['x', 'X / Twitter', get('x')],
        ['github', 'GitHub', get('github')],
        ['location', 'Location', get('location')]
      ].filter(([, , value]) => value).map(([type, label, value]) => ({ id: cryptoId(), type, label, value }));
      return normalizeContact({
        id: cryptoId(),
        name,
        company: get('company'),
        role: get('role'),
        lane: get('lane') || 'lead',
        status: get('status') || 'new',
        priority: get('priority') || 'normal',
        nextFollowUpAt: normalizeDate(get('nextFollowUpAt')),
        tags: splitTags(String(get('tags')).replace(/\|/g, ',')),
        details,
        notes: get('notes')
      });
    }).filter((contact) => contact.name);
  }

  function parseCsvRows(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;
    const input = String(text || '').replace(/^\ufeff/, '');
    for (let index = 0; index < input.length; index++) {
      const char = input[index];
      const next = input[index + 1];
      if (quoted) {
        if (char === '"' && next === '"') {
          cell += '"';
          index++;
        } else if (char === '"') {
          quoted = false;
        } else {
          cell += char;
        }
        continue;
      }
      if (char === '"') {
        quoted = true;
      } else if (char === ',') {
        row.push(cell);
        cell = '';
      } else if (char === '\n') {
        row.push(cell.replace(/\r$/, ''));
        rows.push(row);
        row = [];
        cell = '';
      } else {
        cell += char;
      }
    }
    row.push(cell.replace(/\r$/, ''));
    if (row.some((value) => String(value).trim())) rows.push(row);
    return rows;
  }

  function downloadSeedTemplate() {
    const template = {
      app: 'ConnectLog',
      schema: 5,
      contacts: [
        {
          name: 'Example Prospect',
          lane: 'lead',
          company: 'Example Company',
          role: 'Owner',
          status: 'new',
          priority: 'high',
          nextFollowUpAt: addDaysInput(3),
          tags: ['seeded', 'prospect'],
          details: [
            { type: 'email', label: 'Email', value: 'owner@example.com' },
            { type: 'phone', label: 'Phone', value: '+1 555 0100' },
            { type: 'website', label: 'Website', value: 'https://example.com' }
          ],
          notes: 'Replace this with scraped business context, outreach angle, offer fit, and next step.'
        }
      ]
    };
    downloadFile('connectlog-seed-template.json', JSON.stringify(template, null, 2), 'application/json');
    showToast('Seed template downloaded.');
  }

  function contactHealth(contact) {
    let score = 28;
    if (contact.details.length) score += Math.min(contact.details.length * 8, 24);
    if (contact.notes) score += 10;
    if (contact.timeline.length) score += Math.min(contact.timeline.length * 4, 18);
    if (contact.nextFollowUpAt) score += 12;
    if (contact.pinned) score += 4;
    if (contact.priority === 'critical') score += 6;
    if (isDue(contact)) score -= 18;
    if (isDormant(contact)) score -= 22;
    if (contact.status === 'archived') score -= 25;
    score = Math.max(0, Math.min(100, score));
    const label = score >= 78 ? 'strong' : score >= 55 ? 'active' : score >= 35 ? 'thin' : 'cold';
    return { score, label };
  }

  function isDormant(contact) {
    if (contact.status === 'archived') return false;
    const marker = contact.lastContactedAt || contact.updatedAt || contact.createdAt;
    return daysBetween(marker, todayInputDate()) >= 30 && !isUpcomingSoon(contact);
  }

  function isUpcomingSoon(contact) {
    if (!contact.nextFollowUpAt) return false;
    const days = daysBetween(todayInputDate(), contact.nextFollowUpAt);
    return days >= 0 && days <= 7;
  }

  function inferLane(raw) {
    const tags = Array.isArray(raw.tags) ? raw.tags.map(String).join(' ') : String(raw.tags || '');
    const text = normalizeText([raw.lane, raw.company, raw.role, raw.status, tags, raw.notes].join(' '));
    if (/client|customer|account/.test(text)) return 'client';
    if (/partner|affiliate|collab/.test(text)) return 'partner';
    if (/vendor|supplier|provider/.test(text)) return 'vendor';
    if (/investor|vc|capital|fund/.test(text)) return 'investor';
    if (/friend|family|personal/.test(text)) return 'personal';
    if (/community|event|network/.test(text)) return 'community';
    return 'lead';
  }

  function profileFromContact(contact) {
    return normalizeProfile({
      cardName: contact.cardName || `${contact.name} contact card`,
      audience: contact.audience || contact.company || '',
      name: contact.name,
      company: contact.company,
      role: contact.role,
      email: detailValue(contact, 'email'),
      phone: detailValue(contact, 'phone'),
      website: detailValue(contact, 'website'),
      linkedin: detailValue(contact, 'linkedin'),
      x: detailValue(contact, 'x'),
      github: detailValue(contact, 'github'),
      location: detailValue(contact, 'location'),
      welcomeMessage: contact.welcomeMessage || '',
      note: contact.notes,
      tags: contact.tags,
      photoData: contact.photoData || '',
      photoThumbData: contact.photoThumbData || '',
      photoName: contact.photoName || ''
    });
  }

  function addDaysInput(days) {
    const date = new Date();
    date.setDate(date.getDate() + Number(days || 0));
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 10);
  }

  function daysBetween(start, end) {
    const a = new Date(`${normalizeDate(start)}T00:00:00`).getTime();
    const b = new Date(`${normalizeDate(end)}T00:00:00`).getTime();
    if (Number.isNaN(a) || Number.isNaN(b)) return 0;
    return Math.floor((b - a) / 86400000);
  }

  function toIcsDateTime(date) {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  }

  function escapeIcs(value) {
    return String(value || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  }

  function unescapeVCard(value) {
    return String(value || '').replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\').trim();
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>\"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
  }


  function setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      state.deferredInstallPrompt = event;
      els.installAppBtn.hidden = false;
    });
    window.addEventListener('appinstalled', () => {
      state.deferredInstallPrompt = null;
      els.installAppBtn.hidden = true;
      showToast('ConnectLog installed on this device.');
    });
  }

  async function installApp() {
    if (!state.deferredInstallPrompt) {
      showToast('Install prompt is not available in this browser. Use the browser menu to install or add to home screen.');
      return;
    }
    state.deferredInstallPrompt.prompt();
    await state.deferredInstallPrompt.userChoice.catch(() => null);
    state.deferredInstallPrompt = null;
    els.installAppBtn.hidden = true;
  }



  function buildConnectLogDeployBlock() {
    return [
      '# ConnectLog v7.7 static/PWA proof path',
      'cd connectlog-v7.7-relay13-operator-proof',
      'npm install',
      'npm run check',
      '',
      '# Netlify drag/drop or Git deploy: publish this folder root.',
      '# Required files at deployed root: index.html, app.html, app.js, styles.css, sw.js, manifest.json, assets/, seed-data/.',
      '# Live proof after deploy:',
      '# 1. Open /app.html#deployment',
      '# 2. Run diagnostics',
      '# 3. Create a card, generate ConnectLog QR, create fallback thread',
      '# 4. If Relay13 is configured, run Health check before trusting remote delivery.'
    ].join('\n');
  }

  function buildRelayDeployBlock() {
    return [
      '# Relay13 v1.7 Cloudflare deploy path',
      'cd relay13-core-v1.7-connectlog-operator-proof',
      'npm install',
      'npm run smoke',
      '# npm run doctor:deploy will fail until database_id is replaced. Run it again after D1 create.',
      'npx wrangler login',
      'npx wrangler d1 create relay13_core',
      '# Paste returned database_id into wrangler.toml under [[d1_databases]].',
      'npm run doctor:deploy',
      '# Platform admin now comes from 0S/SkyGate. Keep any Worker secret managed by the gate deployment.',
      'npm run d1:migrate:remote',
      'npm run deploy',
      '',
      '# Live proof after deploy:',
      '# curl https://YOUR-WORKER.workers.dev/api/health',
      '# POST /api/bootstrap with Authorization from the active 0S/SkyGate session',
      '# Workspace messaging uses gate-scoped headers from the 0S bridge',
      '# Save origin/workspace in ConnectLog /app.html#deployment and run diagnostics.',
      '# Then use /app.html#relay13 → Run activation proof.',
      '# Optional terminal closeout should use a gate-issued bearer, not a pasted browser key.'
    ].join('\n');
  }

  function buildRelayEnvBlock() {
    const cfg = state.relayConfig || defaultRelayConfig();
    const allowed = cfg.origin ? safeOrigin(cfg.origin) : 'https://YOUR-CONNECTLOG-SITE.netlify.app';
    return [
      '# Relay13 Worker vars/secrets',
      '0S_SKYGATE_AUTH=active browser/session bearer managed by the 0S gate',
      `ALLOWED_ORIGINS=${allowed}`,
      `BOOTSTRAP_WORKSPACE_SLUG=${cfg.workspace || 'connectlog-main'}`,
      `BOOTSTRAP_WORKSPACE_NAME=ConnectLog Relay13 Inbox`,
      '',
      '# ConnectLog browser settings',
      `Relay13 Worker origin: ${cfg.origin || '<paste Worker origin>'}`,
      `Public workspace slug: ${cfg.workspace || 'connectlog-main'}`,
      `Workspace ID: ${cfg.workspaceId || '<paste workspace id after bootstrap>'}`,
      'Operator auth: inherited from the active 0S/SkyGate session; never embed private credentials in QR'
    ].join('\n');
  }

  function safeOrigin(value) {
    try { return new URL(value).origin; } catch { return 'https://YOUR-CONNECTLOG-SITE.netlify.app'; }
  }

  function copyConnectLogDeployBlock() {
    const block = buildConnectLogDeployBlock();
    if (els.deploymentConfigOutput) els.deploymentConfigOutput.value = block;
    copyText(block, 'ConnectLog deploy block copied.');
  }

  function copyRelayDeployBlock() {
    const block = buildRelayDeployBlock();
    if (els.deploymentConfigOutput) els.deploymentConfigOutput.value = block;
    copyText(block, 'Relay13 deploy block copied.');
  }

  function copyRelayEnvBlock() {
    const block = buildRelayEnvBlock();
    if (els.deploymentConfigOutput) els.deploymentConfigOutput.value = block;
    copyText(block, 'Relay13 env block copied.');
  }

  function relayPreflightChecklist() {
    const cfg = state.relayConfig || defaultRelayConfig();
    const originOk = !cfg.origin || /^https:\/\//i.test(cfg.origin);
    const keyOk = Boolean(relayOperatorToken(cfg));
    const cardOk = Boolean(state.profile?.name && state.profile?.cardId);
    const workspaceOk = Boolean(cfg.workspace || cfg.workspaceId);
    const remoteModeOk = cfg.mode !== 'relay13' || Boolean(cfg.origin && workspaceOk);
    const checks = [
      { name: 'local_database_open', ok: Boolean(state.db), detail: state.db ? 'IndexedDB is open.' : 'IndexedDB is not open.' },
      { name: 'active_card_ready', ok: cardOk, detail: cardOk ? `${state.profile.cardName || state.profile.name} can sync.` : 'Create/select a card before remote proof.' },
      { name: 'relay_mode_safe', ok: remoteModeOk, detail: cfg.mode === 'relay13' ? 'Production bridge mode has origin/workspace shape.' : 'Production vault mode active.' },
      { name: 'origin_https_shape', ok: originOk, detail: cfg.origin ? cfg.origin : 'No origin set yet.' },
      { name: 'workspace_identifier_present', ok: workspaceOk || cfg.mode === 'local', detail: workspaceOk ? (cfg.workspaceId || cfg.workspace) : 'Workspace needed before live Relay13 proof.' },
      { name: 'operator_gate_session', ok: keyOk, detail: relayOperatorToken(cfg) ? '0S/SkyGate operator session is active.' : '0S/SkyGate operator session missing.' },
      { name: 'delivery_queue_controlled', ok: state.relayOutbox.length < 50, detail: `${state.relayOutbox.length} queued delivery item(s).` },
      { name: 'delivery_claim_controlled', ok: !state.relayStatus.toLowerCase().includes('delivered') || Boolean(state.relayStats), detail: state.relayStatus || 'Delivery proof state controlled.' }
    ];
    return { ok: checks.every((item) => item.ok), app_version: APP_VERSION, mode: cfg.mode, generated_at: new Date().toISOString(), checks };
  }

  function writeOperatorOutput(text) {
    if (els.relayOperatorRunbookOutput) els.relayOperatorRunbookOutput.value = text;
    if (els.deploymentConfigOutput) els.deploymentConfigOutput.value = text;
  }

  function runRelayPreflightChecklist() {
    const report = relayPreflightChecklist();
    writeOperatorOutput(JSON.stringify(report, null, 2));
    showToast(report.ok ? 'Relay13 preflight passed locally.' : 'Relay13 preflight found setup gaps.');
    renderDeploymentCommandCenter();
    return report;
  }

  function buildRelayOperatorRunbookBlock() {
    const cfg = state.relayConfig || defaultRelayConfig();
    const preflight = relayPreflightChecklist();
    return [
      '# ConnectLog v7.7 + Relay13 v1.7 operator runbook',
      '',
      'Boundary:',
      '- ConnectLog is the production relationship/card command app.',
      '- Relay13 is the standalone Cloudflare messaging backend.',
      '- Delivery claims stay tied to Relay13 health, bridge, activation, message reload, and WebSocket proof.',
      '',
      'Current browser config:',
      `- Mode: ${cfg.mode}`,
      `- Relay13 origin: ${cfg.origin || '<not set>'}`,
      `- Workspace slug: ${cfg.workspace || '<not set>'}`,
      `- Workspace ID: ${cfg.workspaceId || '<not set>'}`,
      `- 0S/SkyGate session: ${relayOperatorToken(cfg) ? 'active' : 'missing'}`,
      `- Active card: ${state.profile?.cardName || state.profile?.name || '<not created>'}`,
      `- Delivery queue: ${state.relayOutbox.length}`,
      '',
      'Production preflight:',
      ...preflight.checks.map((item) => `- ${item.ok ? 'PASS' : 'FAIL'} ${item.name}: ${item.detail}`),
      '',
      'Launch order:',
      '1. In Relay13 folder: npm install && npm run smoke && npm run doctor:deploy.',
      '2. Create Cloudflare D1, paste database_id into wrangler.toml, keep admin auth behind the 0S/SkyGate layer, run remote migrations, deploy.',
      '3. Bootstrap workspace with the active 0S/SkyGate admin session.',
      '4. Keep messaging scopes attached to gate cards and server-side policy.',
      '5. Save origin/workspace in ConnectLog, save bridge, run Health check, Bridge health, Bridge stats, then Run activation proof.',
      '6. Copy WS proof only after a conversation exists; browser console must show open + ready + message event before realtime is trusted.',
      '',
      'Live closeout proof required before production claim:',
      '- /api/health passes.',
      '- /api/v1/connectlog/health passes.',
      '- /api/v1/connectlog/proof passes with all migrations listed.',
      '- /api/v1/connectlog/activation passes for the workspace.',
      '- Active card sync creates/updates connectlog_cards.',
      '- ConnectLog scan creates contact request + Relay13 conversation.',
      '- Operator message POST succeeds and GET reload returns the new message.',
      '- /api/v1/connectlog/live-proof returns latest activation/run stats.',
      '- WebSocket proof opens and receives realtime events.'
    ].join('\n');
  }

  function copyRelayOperatorRunbookBlock() {
    const block = buildRelayOperatorRunbookBlock();
    writeOperatorOutput(block);
    copyText(block, 'Relay13 operator runbook copied.');
  }

  function buildRelayBootstrapCurlBlock() {
    const cfg = state.relayConfig || defaultRelayConfig();
    const origin = cfg.origin || 'https://YOUR-RELAY13-WORKER.workers.dev';
    return [
      '# Relay13 bootstrap workspace proof',
      'export RELAY13_ORIGIN=' + JSON.stringify(origin),
      'export SKYGATE_SESSION="ACTIVE_0S_SKYGATE_SESSION"',
      '',
      'curl -fsS "$RELAY13_ORIGIN/api/health" | jq .',
      'curl -fsS -X POST "$RELAY13_ORIGIN/api/bootstrap" \\',
      '  -H "authorization: Bearer $SKYGATE_SESSION" \\',
      '  -H "x-0s-gate-session: $SKYGATE_SESSION" | jq .',
      '',
      '# Save the returned workspace.id into ConnectLog Workspace ID.'
    ].join('\n');
  }

  function copyRelayBootstrapCurlBlock() {
    const block = buildRelayBootstrapCurlBlock();
    writeOperatorOutput(block);
    copyText(block, 'Relay13 bootstrap curl copied.');
  }

  function buildRelayApiKeyCurlBlock() {
    const cfg = state.relayConfig || defaultRelayConfig();
    const origin = cfg.origin || 'https://YOUR-RELAY13-WORKER.workers.dev';
    const workspaceId = cfg.workspaceId || 'PASTE_WORKSPACE_ID';
    const payload = JSON.stringify({
      workspace_id: workspaceId,
      name: 'ConnectLog bridge operator key',
      scopes: ['connectlog:read','connectlog:write','conversations:create','conversations:read','conversations:write','messages:read','messages:write']
    }, null, 2).replace(/'/g, "'\\''");
    return [
      '# Relay13 gate-scoped workspace policy check',
      'export RELAY13_ORIGIN=' + JSON.stringify(origin),
      'export RELAY13_WORKSPACE_ID=' + JSON.stringify(workspaceId),
      'export SKYGATE_SESSION="ACTIVE_0S_SKYGATE_SESSION"',
      '',
      "curl -fsS -X POST \"$RELAY13_ORIGIN/api/admin/api-keys\" \\",
      '  -H "authorization: Bearer $SKYGATE_SESSION" \\',
      '  -H "x-0s-gate-session: $SKYGATE_SESSION" \\',
      '  -H "content-type: application/json" \\',
      "  --data '" + payload + "' | jq .",
      '',
      '# The browser app should inherit the 0S/SkyGate session; do not paste raw operator keys into ConnectLog.'
    ].join('\n');
  }

  function copyRelayApiKeyCurlBlock() {
    const block = buildRelayApiKeyCurlBlock();
    writeOperatorOutput(block);
    copyText(block, 'Relay13 gate-scoped curl copied.');
  }

  function buildRelayLiveProofBlock() {
    const cfg = state.relayConfig || defaultRelayConfig();
    const origin = cfg.origin || 'https://YOUR-RELAY13-WORKER.workers.dev';
    const workspaceId = cfg.workspaceId || 'PASTE_WORKSPACE_ID';
    return [
      '# Relay13 live proof script',
      'export RELAY13_ORIGIN=' + JSON.stringify(origin),
      'export SKYGATE_SESSION="ACTIVE_0S_SKYGATE_SESSION"',
      'export RELAY13_WORKSPACE_ID=' + JSON.stringify(workspaceId),
      '',
      'npm run proof:live',
      '',
      '# Or curl directly:',
      'curl -fsS "$RELAY13_ORIGIN/api/health" | jq .',
      'curl -fsS -H "authorization: Bearer $SKYGATE_SESSION" -H "x-0s-gate-session: $SKYGATE_SESSION" "$RELAY13_ORIGIN/api/v1/connectlog/live-proof?workspace_id=$RELAY13_WORKSPACE_ID" | jq .'
    ].join('\n');
  }

  function copyRelayLiveProofBlock() {
    const block = buildRelayLiveProofBlock();
    writeOperatorOutput(block);
    copyText(block, 'Relay13 live-proof block copied.');
  }

  function exportRelayBridgeConfig() {
    const cfg = state.relayConfig || defaultRelayConfig();
    const safe = { ...cfg, apiKey: '', authMode: '0s-shared-gate' };
    const payload = JSON.stringify({ exported_at: new Date().toISOString(), app_version: APP_VERSION, relay13_bridge: safe }, null, 2);
    downloadBlob('connectlog-relay13-bridge-config.redacted.json', payload, 'application/json');
    writeOperatorOutput(payload);
    showToast('Redacted Relay13 bridge config exported.');
  }

  async function importRelayBridgeConfig(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      const raw = payload.relay13_bridge || payload;
      state.relayConfig = normalizeRelayConfig({ ...raw, apiKey: '' });
      await persistRelayState();
      renderAll();
      writeOperatorOutput(JSON.stringify({ ok: true, imported_at: new Date().toISOString(), relay13_bridge: { ...state.relayConfig, apiKey: '', authMode: '0s-shared-gate' } }, null, 2));
      showToast('Relay13 bridge config imported.');
    } catch (error) {
      writeOperatorOutput(JSON.stringify({ ok: false, error: error.message || 'Import failed' }, null, 2));
      showToast('Relay13 bridge config import failed.');
    } finally {
      event.target.value = '';
    }
  }

  async function runLocalDiagnostics() {
    await checkStorageHealth();
    const cfg = state.relayConfig || defaultRelayConfig();
    const report = {
      app_version: APP_VERSION,
      storage: {
        indexeddb_open: Boolean(state.db),
        contacts: state.contacts.length,
        profile_cards: state.profileCards.length,
        relay_threads: state.relayThreads.length,
        queued_outbox: state.relayOutbox.length
      },
      relay13: {
        mode: cfg.mode,
        origin_set: Boolean(cfg.origin),
        workspace_set: Boolean(cfg.workspace || cfg.workspaceId),
        gate_session_present: Boolean(relayOperatorToken(cfg)),
        remote_ready: relayRemoteReady(cfg),
        status: state.relayStatus
      },
      proof_boundary: 'Browser diagnostics prove app wiring. Cloudflare Worker, D1, Durable Object, and Relay13 behavior are covered by production smoke and activation proof.',
      preflight: relayPreflightChecklist()
    };
    if (cfg.origin) {
      try {
        const response = await fetch(`${cfg.origin}/api/health`, { cache: 'no-store' });
        report.relay13.health_http_status = response.status;
        report.relay13.health_ok = response.ok;
      } catch (error) {
        report.relay13.health_ok = false;
        report.relay13.health_error = error.message || 'health check failed';
      }
      try {
        const bridge = await fetch(`${cfg.origin}/api/v1/connectlog/health`, { cache: 'no-store' });
        const bridgeData = await bridge.json().catch(() => ({}));
        report.relay13.connectlog_bridge_http_status = bridge.status;
        report.relay13.connectlog_bridge_ok = Boolean(bridge.ok && bridgeData.ok && bridgeData.bridge === 'connectlog');
        report.relay13.connectlog_bridge_features = bridgeData.features || [];
      } catch (error) {
        report.relay13.connectlog_bridge_ok = false;
        report.relay13.connectlog_bridge_error = error.message || 'bridge health check failed';
      }
    }
    if (els.deploymentConfigOutput) els.deploymentConfigOutput.value = JSON.stringify(report, null, 2);
    renderDeploymentCommandCenter();
    showToast('Diagnostics refreshed.');
  }

  function renderDeploymentCommandCenter() {
    if (!els.deploymentStatusDeck || !els.deploymentChecklist) return;
    const cfg = state.relayConfig || defaultRelayConfig();
    const statusItems = [
      ['ConnectLog app', `v${APP_VERSION} · production relationship command surface`],
      ['Relationship vault', `${state.contacts.length} contacts · ${state.profileCards.length} card variants · IndexedDB ${state.db ? 'open' : 'not open'}`],
      ['Relay13 mode', cfg.mode === 'relay13' ? `Production bridge enabled · ${cfg.origin || 'origin missing'}` : 'Production vault mode'],
      ['Outbox', state.relayOutbox.length ? `${state.relayOutbox.length} queued remote message(s)` : 'No queued remote messages'],
      ['Bridge stats', state.relayStats ? `${Number(state.relayStats.cards_active || 0)} active cards · checked ${new Date(state.relayStats.checked_at || Date.now()).toLocaleString()}` : 'No stats pull yet'],
      ['Relay13 readiness', relayRemoteReady(cfg) ? 'Origin + workspace available for production bridge checks.' : '0S/SkyGate session needed before this browser can send through Relay13.'],
      ['Preflight', relayPreflightChecklist().ok ? 'Production preflight passes.' : 'Production preflight has setup gaps; run the preflight button.']
    ];
    replaceChildren(els.deploymentStatusDeck, ...statusItems.map(([title, body]) => deploymentInfoNode('deployment-status-item', title, body)));
    const checks = [
      ['✅ App package check', 'Run npm run check before deployment. It validates app IDs, functions, service worker cache, card variants, Relay13 bridge, and this command center.'],
      [cfg.origin ? '✅ Relay13 origin configured' : '☐ Relay13 origin configured', cfg.origin || 'Paste the deployed Worker origin after Relay13 is live.'],
      [cfg.workspace || cfg.workspaceId ? '✅ Workspace set' : '☐ Workspace set', 'Use public workspace slug for visitor/card creation and workspace ID for operator reads/writes.'],
      [relayOperatorToken(cfg) ? '✅ 0S/SkyGate session active' : '☐ 0S/SkyGate session missing', 'Needed for operator refresh/send. Never embed private credentials in QR payloads or public HTML.'],
      [state.relayOutbox.length ? '☐ Delivery queue needs sync' : '✅ Delivery queue clean', state.relayOutbox.length ? 'Run Sync queued after Relay13 health passes.' : 'Delivery queue has no pending Relay13 sends.'],
      [state.relayStats ? '✅ Relay13 stats endpoint proven in browser' : '☐ Relay13 stats endpoint proven in browser', state.relayStats ? 'Stats were pulled with the active gate session.' : 'Run Bridge stats after deployment and 0S/SkyGate login.'],
      ['☐ Live Cloudflare proof', 'Deploy Relay13, apply D1 migrations, bootstrap workspace, run activation proof, sync card, create thread, send message, reload history, run live-proof endpoint, then test WebSocket room.']
    ];
    replaceChildren(els.deploymentChecklist, ...checks.map(([title, body]) => deploymentInfoNode('deployment-check-item', title, body)));
    if (els.deploymentConfigOutput && !els.deploymentConfigOutput.value) els.deploymentConfigOutput.value = buildConnectLogDeployBlock();
  }

  function deploymentInfoNode(className, title, body) {
    const item = document.createElement('div');
    item.className = className;
    const strong = document.createElement('strong');
    strong.textContent = title;
    const span = document.createElement('span');
    span.textContent = body;
    item.append(strong, span);
    return item;
  }

  function renderRelayPanel() {
    if (!els.relayModeInput) return;
    const cfg = state.relayConfig || defaultRelayConfig();
    els.relayModeInput.value = cfg.mode;
    els.relayOriginInput.value = cfg.origin;
    els.relayWorkspaceInput.value = cfg.workspace;
    els.relayWorkspaceIdInput.value = cfg.workspaceId;
    els.relayApiKeyInput.value = '';
    els.relayApiKeyInput.disabled = true;
    els.relayApiKeyInput.placeholder = relayOperatorToken(cfg) ? '0S/SkyGate session active' : 'Sign into 0S/SkyGate first';
    els.relayOperatorNameInput.value = cfg.operatorName;
    els.relayShareBridgeInput.checked = Boolean(cfg.shareBridge);
    const remoteReady = relayRemoteReady(cfg);
    const operatorReady = Boolean(relayOperatorToken(cfg));
    els.relayConnectionStatus.textContent = remoteReady ? state.relayStatus : `${state.relayStatus} ${cfg.mode === 'relay13' ? 'Add origin + workspace before Relay13 delivery.' : ''}`.trim();
    els.relayHealthBtn.disabled = !cfg.origin;
    if (els.relayBridgeHealthBtn) els.relayBridgeHealthBtn.disabled = !cfg.origin;
    if (els.relaySyncCardBtn) els.relaySyncCardBtn.disabled = !cfg.origin || !operatorReady || !state.profile?.name;
    if (els.relayRefreshRequestsBtn) els.relayRefreshRequestsBtn.disabled = !cfg.origin || !operatorReady;
    if (els.relayStatsBtn) els.relayStatsBtn.disabled = !cfg.origin || !operatorReady;
    if (els.relayRefreshMessagesBtn) els.relayRefreshMessagesBtn.disabled = !cfg.origin || !operatorReady || !getActiveRelayThread();
    if (els.relayCopyWebSocketProofBtn) els.relayCopyWebSocketProofBtn.disabled = !cfg.origin && !getActiveRelayThread();
    if (els.relayRunActivationProofBtn) els.relayRunActivationProofBtn.disabled = !(cfg.origin && operatorReady && (cfg.workspace || cfg.workspaceId));
    if (els.relayCopyActivationCurlBtn) els.relayCopyActivationCurlBtn.disabled = !cfg.origin;
    if (els.relayCopyBootstrapCurlBtn) els.relayCopyBootstrapCurlBtn.disabled = !cfg.origin;
    if (els.relayCopyApiKeyCurlBtn) els.relayCopyApiKeyCurlBtn.disabled = !cfg.origin || !cfg.workspaceId;
    if (els.relayCopyLiveProofBtn) els.relayCopyLiveProofBtn.disabled = !cfg.origin || !cfg.workspaceId;
    if (els.relayCopyCardPayloadBtn) els.relayCopyCardPayloadBtn.disabled = !state.profile?.name;
    els.relayOpenAdminBtn.disabled = !cfg.origin;
    els.relayCreateThreadBtn.disabled = !state.profile?.name;
    els.relaySendBtn.disabled = !getActiveRelayThread();
    renderRelayThreads();
    renderRelayMessages();
    renderRelayOutbox();
    renderRelayRequests();
    renderRelayProofOutput();
  }

  function renderRelayProofOutput() {
    if (!els.relayProofOutput) return;
    const cfg = state.relayConfig || defaultRelayConfig();
    const thread = getActiveRelayThread();
    const stats = state.relayStats ? `Stats: ${Number(state.relayStats.cards_active || 0)} active cards; ${(state.relayStats.requests_by_status || []).map((row) => `${row.request_status}:${row.count}`).join(', ') || 'no requests'}; checked ${new Date(state.relayStats.checked_at || Date.now()).toLocaleString()}` : 'Stats: not checked yet.';
    const active = thread ? `Active thread: ${thread.mode} · ${thread.conversationId || 'vault-queued'} · ${thread.messages.length} cached messages` : 'Active thread: none.';
    if (!els.relayProofOutput.value || els.relayProofOutput.dataset.autofill === 'true') {
      els.relayProofOutput.dataset.autofill = 'true';
      els.relayProofOutput.value = [`Relay13 origin: ${cfg.origin || 'not set'}`, `Workspace: ${cfg.workspace || cfg.workspaceId || 'not set'}`, stats, active, `Outbox queued: ${state.relayOutbox.length}`, `Status: ${state.relayStatus}`].join('\n');
    }
  }

  function relayRemoteReady(cfg = state.relayConfig || defaultRelayConfig()) {
    return cfg.mode === 'relay13' && Boolean(cfg.origin && (cfg.workspace || cfg.workspaceId));
  }

  async function saveRelaySettings() {
    state.relayConfig = normalizeRelayConfig({
      mode: els.relayModeInput.value,
      origin: els.relayOriginInput.value,
      workspace: els.relayWorkspaceInput.value,
      workspaceId: els.relayWorkspaceIdInput.value,
      apiKey: '',
      operatorName: els.relayOperatorNameInput.value,
      shareBridge: els.relayShareBridgeInput.checked,
      updatedAt: new Date().toISOString()
    });
    state.relayStatus = state.relayConfig.mode === 'relay13' ? 'Relay13 production bridge settings saved. Run health check.' : 'Production vault mode saved. Relay13 bridge remains available when selected.';
    await persistRelayState();
    renderRelayPanel();
    showToast('Relay13 bridge settings saved.');
  }

  async function checkRelayHealth() {
    const cfg = state.relayConfig || defaultRelayConfig();
    if (!cfg.origin) return showToast('Add Relay13 Worker origin first.');
    try {
      const response = await fetch(`${cfg.origin}/api/health`, { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || `HTTP ${response.status}`);
      let bridgeStatus = '';
      try {
        const bridge = await fetch(`${cfg.origin}/api/v1/connectlog/health`, { cache: 'no-store' });
        const bridgeData = await bridge.json().catch(() => ({}));
        bridgeStatus = bridge.ok && bridgeData.ok ? ' ConnectLog bridge route also answered.' : ' Core health passed; bridge route did not prove OK.';
      } catch (_) {
        bridgeStatus = ' Core health passed; bridge route was not reachable.';
      }
      state.relayStatus = `Relay13 health OK: ${data.service || 'worker'} @ ${new Date().toLocaleTimeString()}.${bridgeStatus}`;
    } catch (error) {
      state.relayStatus = `Relay13 health check failed from this browser. Delivery queue remains protected. ${error.message || ''}`.trim();
    }
    renderRelayPanel();
    renderDeploymentCommandCenter();
  }

  async function checkRelayBridgeHealth() {
    const cfg = state.relayConfig || defaultRelayConfig();
    if (!cfg.origin) return showToast('Add Relay13 Worker origin first.');
    try {
      const response = await fetch(`${cfg.origin}/api/v1/connectlog/health`, { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok || data.bridge !== 'connectlog') throw new Error(data.error || `HTTP ${response.status}`);
      const features = Array.isArray(data.features) ? data.features.join(', ') : 'bridge features unavailable';
      state.relayStatus = `ConnectLog bridge OK: ${features}`;
      if (els.deploymentConfigOutput) els.deploymentConfigOutput.value = JSON.stringify(data, null, 2);
      showToast('Relay13 ConnectLog bridge route answered.');
    } catch (error) {
      state.relayStatus = `ConnectLog bridge check failed from this browser. Delivery queue remains protected. ${error.message || ''}`.trim();
      showToast('ConnectLog bridge health failed.');
    }
    renderRelayPanel();
    renderDeploymentCommandCenter();
  }

  function buildRelayCardPayload(card = state.profile) {
    if (!card) return null;
    const cfg = state.relayConfig || defaultRelayConfig();
    return {
      workspace_id: cfg.workspaceId || '',
      workspace: cfg.workspace || '',
      connectlog_bridge: true,
      connectlog_card_id: card.id,
      connectlog_card_label: card.cardName || card.name,
      connectlog_campaign: card.audience || '',
      connectlog_owner_name: card.name,
      connectlog_owner_company: card.company || '',
      connectlog_owner_role: card.role || '',
      connectlog_welcome_message: card.welcomeMessage || '',
      connectlog_tags: Array.isArray(card.tags) ? card.tags : [],
      source_url: window.location.href,
      updated_from: 'connectlog-v7.5'
    };
  }

  function copyActiveRelayCardPayload() {
    const payload = buildRelayCardPayload();
    if (!payload) return showToast('Create a card first.');
    copyText(JSON.stringify(payload, null, 2), 'Relay13 card payload copied.');
    if (els.deploymentConfigOutput) els.deploymentConfigOutput.value = JSON.stringify(payload, null, 2);
  }

  async function syncActiveCardToRelay() {
    const cfg = state.relayConfig || defaultRelayConfig();
    const payload = buildRelayCardPayload();
    if (!payload) return showToast('Create a card first.');
    if (!cfg.origin || !relayOperatorToken(cfg)) return showToast('Card sync needs Relay13 origin + 0S/SkyGate session.');
    try {
      const response = await fetch(`${cfg.origin}/api/v1/connectlog/cards`, {
        method: 'POST',
        headers: relayOperatorHeaders(cfg, { 'content-type': 'application/json' }),
        body: JSON.stringify(payload)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || `HTTP ${response.status}`);
      state.relayStatus = `Active card synced to Relay13 registry: ${data.card?.card_label || payload.connectlog_card_label}`;
      showToast('Active card synced to Relay13.');
      if (els.deploymentConfigOutput) els.deploymentConfigOutput.value = JSON.stringify(data, null, 2);
    } catch (error) {
      state.relayStatus = `Relay13 card sync failed. Private card remains usable. ${error.message || ''}`.trim();
      showToast('Relay13 card sync failed.');
    }
    renderRelayPanel();
    renderDeploymentCommandCenter();
  }

  async function refreshRelayRequests() {
    const cfg = state.relayConfig || defaultRelayConfig();
    if (!cfg.origin || !relayOperatorToken(cfg)) return showToast('Request refresh needs Relay13 origin + 0S/SkyGate session.');
    try {
      const params = new URLSearchParams();
      if (cfg.workspaceId) params.set('workspace_id', cfg.workspaceId);
      const response = await fetch(`${cfg.origin}/api/v1/connectlog/requests?${params.toString()}`, { headers: relayOperatorHeaders(cfg), cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || `HTTP ${response.status}`);
      state.relayRequests = (data.requests || []).map(normalizeRelayRequest).filter(Boolean);
      await persistRelayState();
      showToast(`Relay13 ConnectLog requests refreshed: ${state.relayRequests.length}.`);
      if (els.deploymentConfigOutput) els.deploymentConfigOutput.value = JSON.stringify(data, null, 2);
    } catch (error) {
      showToast(`Relay13 request refresh failed: ${error.message || 'unknown error'}`);
    }
    renderRelayPanel();
  }


  async function fetchRelayStats() {
    const cfg = state.relayConfig || defaultRelayConfig();
    if (!cfg.origin || !relayOperatorToken(cfg)) return showToast('Stats check needs Relay13 origin + 0S/SkyGate session.');
    try {
      const params = new URLSearchParams();
      if (cfg.workspaceId) params.set('workspace_id', cfg.workspaceId);
      const response = await fetch(`${cfg.origin}/api/v1/connectlog/stats?${params.toString()}`, { headers: relayOperatorHeaders(cfg), cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || `HTTP ${response.status}`);
      state.relayStats = { ...data, checked_at: new Date().toISOString() };
      state.relayStatus = `Relay13 stats OK: ${Number(data.cards_active || 0)} active cards, ${(data.requests_by_status || []).map((row) => `${row.request_status}:${row.count}`).join(', ') || '0 requests'}.`;
      await persistRelayState();
      showToast('Relay13 ConnectLog stats refreshed.');
    } catch (error) {
      state.relayStatus = `Relay13 stats check failed from this browser. Delivery queue remains protected. ${error.message || ''}`.trim();
      showToast('Relay13 stats failed.');
    }
    renderRelayPanel();
    renderDeploymentCommandCenter();
  }

  async function refreshActiveRelayMessages() {
    const thread = getActiveRelayThread();
    const cfg = state.relayConfig || defaultRelayConfig();
    if (!thread) return showToast('Select a Relay13 thread first.');
    if (thread.mode !== 'relay13' || !thread.conversationId) return showToast('Selected thread is in the production vault only.');
    if (!cfg.origin || !relayOperatorToken(cfg)) return showToast('Message refresh needs Relay13 origin + 0S/SkyGate session.');
    try {
      const params = new URLSearchParams();
      if (thread.workspaceId || cfg.workspaceId) params.set('workspace_id', thread.workspaceId || cfg.workspaceId);
      const response = await fetch(`${thread.origin || cfg.origin}/api/v1/conversations/${encodeURIComponent(thread.conversationId)}/messages?${params.toString()}`, { headers: relayOperatorHeaders(cfg), cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || `HTTP ${response.status}`);
      thread.messages = (data.messages || []).map(normalizeRelayMessage).filter(Boolean);
      thread.preview = thread.messages.at(-1)?.body?.slice(0, 180) || thread.preview;
      thread.updatedAt = new Date().toISOString();
      upsertRelayThread(thread);
      await persistRelayState();
      showToast(`Pulled ${thread.messages.length} remote Relay13 message${thread.messages.length === 1 ? '' : 's'}.`);
    } catch (error) {
      showToast(`Remote message refresh failed: ${error.message || 'unknown error'}`);
    }
    renderRelayPanel();
  }

  function buildRelayWebSocketProofBlock() {
    const cfg = state.relayConfig || defaultRelayConfig();
    const thread = getActiveRelayThread();
    const origin = (thread?.origin || cfg.origin || '').replace(/^http/, 'ws');
    const workspaceId = thread?.workspaceId || cfg.workspaceId || 'PASTE_WORKSPACE_ID';
    const conversationId = thread?.conversationId || 'PASTE_CONVERSATION_ID';
    const role = relayOperatorToken(cfg) ? 'operator' : 'customer';
    const visitorToken = thread?.visitorToken || 'PASTE_VISITOR_TOKEN';
    const tokenParam = role === 'customer' ? `&token=${encodeURIComponent(visitorToken)}` : '';
    const url = `${origin || 'wss://YOUR_RELAY13_WORKER.workers.dev'}/api/ws/${encodeURIComponent(conversationId)}?role=${role}&workspace_id=${encodeURIComponent(workspaceId)}${tokenParam}&name=${encodeURIComponent(cfg.operatorName || 'ConnectLog Operator')}`;
    return `// Relay13 WebSocket browser proof block\n// Run only after Relay13 is deployed, D1 migrated, workspace bootstrapped, and a real conversation exists.\nconst socket = new WebSocket(${JSON.stringify(url)});\nsocket.onopen = () => {\n  console.log('Relay13 WS open');\n  socket.send(JSON.stringify({ type: 'message', body: 'ConnectLog live WebSocket proof ' + new Date().toISOString(), sender_name: ${JSON.stringify(cfg.operatorName || 'ConnectLog Operator')} }));\n};\nsocket.onmessage = (event) => console.log('Relay13 WS event', JSON.parse(event.data));\nsocket.onerror = (event) => console.error('Relay13 WS error', event);\nsocket.onclose = (event) => console.log('Relay13 WS closed', event.code, event.reason);`;
  }

  function copyRelayWebSocketProofBlock() {
    const block = buildRelayWebSocketProofBlock();
    if (els.relayProofOutput) els.relayProofOutput.value = block;
    if (els.deploymentConfigOutput) els.deploymentConfigOutput.value = block;
    copyText(block, 'Relay13 WebSocket proof block copied.');
  }

  function buildRelayActivationCurlBlock() {
    const cfg = state.relayConfig || defaultRelayConfig();
    const origin = cfg.origin || 'https://YOUR-RELAY13-WORKER.workers.dev';
    const workspace = cfg.workspace || 'connectlog-main';
    const workspaceId = cfg.workspaceId || 'YOUR_WORKSPACE_ID';
    const payload = buildRelayCardPayload(state.profile);
    const cardPayload = JSON.stringify({ ...payload, workspace_id: workspaceId }, null, 2).replace(/'/g, "'\\''");
    const scanPayload = JSON.stringify({
      workspace,
      channel: 'connectlog-card',
      customer_name: 'ConnectLog activation proof visitor',
      customer_email: 'proof@example.com',
      body: `Relay13 activation proof ${new Date().toISOString()}`,
      ...payload
    }, null, 2).replace(/'/g, "'\\''");
    return [
      '# Relay13 + ConnectLog activation proof',
      'export RELAY13_ORIGIN=' + JSON.stringify(origin),
      'export SKYGATE_SESSION="ACTIVE_0S_SKYGATE_SESSION"',
      'export RELAY13_WORKSPACE_ID=' + JSON.stringify(workspaceId),
      'export RELAY13_WORKSPACE_SLUG=' + JSON.stringify(workspace),
      '',
      'curl -fsS "$RELAY13_ORIGIN/api/health" | jq .',
      'curl -fsS "$RELAY13_ORIGIN/api/v1/connectlog/health" | jq .',
      'curl -fsS -H "authorization: Bearer $SKYGATE_SESSION" -H "x-0s-gate-session: $SKYGATE_SESSION" "$RELAY13_ORIGIN/api/v1/connectlog/proof?workspace_id=$RELAY13_WORKSPACE_ID" | jq .',
      'curl -fsS -H "authorization: Bearer $SKYGATE_SESSION" -H "x-0s-gate-session: $SKYGATE_SESSION" "$RELAY13_ORIGIN/api/v1/connectlog/stats?workspace_id=$RELAY13_WORKSPACE_ID" | jq .',
      '',
      "curl -fsS -X POST \"$RELAY13_ORIGIN/api/v1/connectlog/cards\" -H \"content-type: application/json\" -H \"authorization: Bearer $SKYGATE_SESSION\" -H \"x-0s-gate-session: $SKYGATE_SESSION\" --data '" + cardPayload + "' | jq .",
      "curl -fsS -X POST \"$RELAY13_ORIGIN/api/v1/connectlog/scan\" -H \"content-type: application/json\" --data '" + scanPayload + "' | jq .",
      '',
      '# Copy the returned conversation.id and visitor_token, then prove history:',
      '# curl -fsS -H "authorization: Bearer $SKYGATE_SESSION" -H "x-0s-gate-session: $SKYGATE_SESSION" "$RELAY13_ORIGIN/api/v1/conversations/CONV_ID/messages" | jq .',
      '# Browser WebSocket proof still requires a live conversation and token/operator auth.'
    ].join('\n');
  }

  function copyRelayActivationCurlBlock() {
    const block = buildRelayActivationCurlBlock();
    if (els.relayProofOutput) els.relayProofOutput.value = block;
    if (els.deploymentConfigOutput) els.deploymentConfigOutput.value = block;
    copyText(block, 'Relay13 activation curl block copied.');
  }

  async function fetchRelayJson(path, options = {}) {
    const cfg = state.relayConfig || defaultRelayConfig();
    const response = await fetch(`${cfg.origin}${path}`, {
      cache: 'no-store',
      ...options,
      headers: {
        ...relayOperatorHeaders(cfg),
        ...(options.headers || {})
      }
    });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok && data.ok !== false, status: response.status, data };
  }

  async function runRelayActivationProof() {
    const cfg = state.relayConfig || defaultRelayConfig();
    const report = {
      proof: 'connectlog-relay13-activation',
      app_version: APP_VERSION,
      started_at: new Date().toISOString(),
      boundary: 'This mutates Relay13 only when a production origin, workspace, and active 0S/SkyGate session are configured. Failures keep delivery queued until proof passes.',
      checks: []
    };
    const push = (name, ok, detail = {}) => report.checks.push({ name, ok: Boolean(ok), ...detail, checked_at: new Date().toISOString() });
    try {
      if (!cfg.origin) throw new Error('Relay13 origin missing');
      if (!relayOperatorToken(cfg)) throw new Error('0S/SkyGate session missing');
      if (!(cfg.workspace || cfg.workspaceId)) throw new Error('Relay13 workspace slug or ID missing');
      const health = await fetchRelayJson('/api/health');
      push('worker_health', health.ok, { status: health.status, service: health.data.service || '' });
      const bridge = await fetchRelayJson('/api/v1/connectlog/health');
      push('connectlog_bridge_health', bridge.ok && bridge.data.bridge === 'connectlog', { status: bridge.status, features: bridge.data.features || [] });
      const proofParams = new URLSearchParams();
      if (cfg.workspaceId) proofParams.set('workspace_id', cfg.workspaceId);
      const proof = await fetchRelayJson(`/api/v1/connectlog/proof${proofParams.toString() ? `?${proofParams}` : ''}`);
      push('connectlog_proof_endpoint', proof.ok, { status: proof.status, migrations: proof.data.migrations || [] });
      const activation = await fetchRelayJson(`/api/v1/connectlog/activation${proofParams.toString() ? `?${proofParams}` : ''}`);
      push('activation_readiness_endpoint', activation.ok, { status: activation.status, checks: activation.data.checks || [] });
      const syncedCard = await syncActiveCardToRelay();
      push('active_card_registry_sync', Boolean(syncedCard), { card: syncedCard?.card_label || syncedCard?.connectlog_card_id || state.profile?.cardName || state.profile?.name || '' });
      const thread = await createRelayThreadFromActiveCard({ silent: true });
      push('conversation_from_active_card', Boolean(thread && thread.conversationId), { conversation_id: thread?.conversationId || '', mode: thread?.mode || '' });
      if (thread?.conversationId) {
        state.activeRelayThreadId = thread.id;
        const message = normalizeRelayMessage({ senderRole: 'operator', senderName: cfg.operatorName, body: `ConnectLog activation proof ${new Date().toISOString()}`, pending: true });
        const sent = await postRelayMessage(thread, message);
        push('operator_message_post', Boolean(sent && sent.id), { message_id: sent?.id || '' });
        const pulled = await fetchRelayJson(`/api/v1/conversations/${encodeURIComponent(thread.conversationId)}/messages`);
        push('message_history_reload', pulled.ok && Array.isArray(pulled.data.messages) && pulled.data.messages.length > 0, { status: pulled.status, message_count: pulled.data.messages?.length || 0 });
        thread.messages = (pulled.data.messages || []).map(normalizeRelayMessage);
        upsertRelayThread(thread);
      }
      await fetchRelayStats().catch(() => null);
      report.finished_at = new Date().toISOString();
      report.ok = report.checks.every((item) => item.ok);
      const finalThread = getActiveRelayThread();
      if (finalThread?.conversationId) report.conversation_id = finalThread.conversationId;
      await fetchRelayJson('/api/v1/connectlog/activation-runs', {
        method: 'POST',
        headers: relayOperatorHeaders(cfg, { 'content-type': 'application/json' }),
        body: JSON.stringify({ ...report, summary: report.ok ? 'ConnectLog activation proof passed' : 'ConnectLog activation proof completed with failures' })
      }).catch(() => null);
      state.relayStatus = report.ok ? 'Relay13 activation proof passed. Production messaging source is responding.' : 'Relay13 activation proof found failures. Keep delivery queued.';
      if (els.relayProofOutput) els.relayProofOutput.value = JSON.stringify(report, null, 2);
      await persistRelayState();
      renderAll();
      showToast(report.ok ? 'Relay13 activation proof passed.' : 'Relay13 activation proof completed with failures.');
      return report;
    } catch (error) {
      report.ok = false;
      report.error = error.message || 'Activation proof failed';
      report.finished_at = new Date().toISOString();
      state.relayStatus = `Activation proof failed: ${report.error}. Delivery queue remains protected.`;
      if (els.relayProofOutput) els.relayProofOutput.value = JSON.stringify(report, null, 2);
      await persistRelayState();
      renderAll();
      showToast('Activation proof failed. Delivery queue remains protected.');
      return report;
    }
  }

  async function handleRelayRequestAction(event) {
    const button = event.target.closest('[data-request-action]');
    if (!button) return;
    await updateRelayRequestStatus(button.dataset.requestId, button.dataset.requestAction);
  }

  async function updateRelayRequestStatus(requestId, status) {
    const cfg = state.relayConfig || defaultRelayConfig();
    if (!requestId || !status) return;
    if (!cfg.origin || !relayOperatorToken(cfg)) return showToast('Request status update needs Relay13 origin + 0S/SkyGate session.');
    try {
      const response = await fetch(`${cfg.origin}/api/v1/connectlog/requests/${encodeURIComponent(requestId)}`, {
        method: 'PATCH',
        headers: relayOperatorHeaders(cfg, { 'content-type': 'application/json' }),
        body: JSON.stringify({ status })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || `HTTP ${response.status}`);
      state.relayRequests = state.relayRequests.map((row) => row.id === requestId ? { ...row, status, updatedAt: new Date().toISOString() } : row);
      await persistRelayState();
      showToast(`Relay13 request marked ${status}.`);
    } catch (error) {
      showToast(`Request status failed: ${error.message || 'unknown error'}`);
    }
    renderRelayPanel();
  }

  function renderRelayRequests() {
    if (!els.relayRequestList) return;
    if (!state.relayRequests.length) {
      const empty = document.createElement('p');
      empty.className = 'panel-hint';
      empty.textContent = 'No remote ConnectLog requests cached yet. Deploy Relay13, create/receive a card request, then refresh.';
      replaceChildren(els.relayRequestList, empty);
      return;
    }
    replaceChildren(els.relayRequestList, ...state.relayRequests.slice(0, 20).map((request) => {
      const card = state.profileCards.find((row) => row.id === request.cardId);
      const article = document.createElement('article');
      article.className = 'relay-request-row';
      const title = request.customerName || request.subject || 'ConnectLog request';
      const meta = [request.status, request.conversationStatus, card?.cardName || request.cardId, new Date(request.createdAt).toLocaleString()].filter(Boolean).join(' · ');
      const actionRow = request.status === 'archived' ? '' : `<div class="compact-row request-actions"><button type="button" class="ghost-btn mini" data-request-id="${escapeHtml(request.id)}" data-request-action="accepted">Accept</button><button type="button" class="ghost-btn mini" data-request-id="${escapeHtml(request.id)}" data-request-action="archived">Archive</button></div>`;
      article.innerHTML = `<strong>${escapeHtml(title)}</strong><span>${escapeHtml(meta)}</span><small>${escapeHtml(request.preview || request.customerEmail || request.sourceUrl || 'No preview cached')}</small>${actionRow}`;
      return article;
    }));
  }

  async function createRelayThreadFromActiveCard(options = {}) {
    if (!state.profile?.name) { if (!options.silent) showToast('Create or select a card first.'); return null; }
    const cfg = state.relayConfig || defaultRelayConfig();
    if (relayRemoteReady(cfg)) {
      try {
        const created = await createRelayConversation({
          card: state.profile,
          customerName: state.profile.name,
          customerEmail: state.profile.email,
          customerPhone: state.profile.phone,
          body: state.profile.note || `ConnectLog card handoff: ${state.profile.cardName || state.profile.name}`
        });
        const thread = normalizeRelayThread({
          id: created.conversation_id,
          conversationId: created.conversation_id,
          visitorToken: created.visitor_token,
          workspaceId: created.workspace_id || cfg.workspaceId,
          workspace: cfg.workspace,
          origin: cfg.origin,
          cardId: state.profile.id,
          title: state.profile.cardName || state.profile.name,
          mode: 'relay13',
          preview: state.profile.welcomeMessage || state.profile.note || '',
          messages: state.profile.welcomeMessage ? [{ senderRole: 'system', senderName: 'ConnectLog', body: state.profile.welcomeMessage }] : []
        });
        upsertRelayThread(thread);
        state.activeRelayThreadId = thread.id;
        await persistRelayState();
        if (!options.silent) showToast('Relay13 conversation created from the active card.');
        renderRelayPanel();
        return thread;
      } catch (error) {
        const fallback = await createLocalRelayThread(`Relay13 failed: ${error.message || 'remote unavailable'}`, options);
        renderRelayPanel();
        return fallback;
      }
    }
    const fallback = await createLocalRelayThread('Created in production vault mode. Add Relay13 operator credentials to sync new messages.', options);
    renderRelayPanel();
    return fallback;
  }

  async function createLocalRelayThread(reason = 'Production vault thread created.', options = {}) {
    const profile = state.profile || normalizeProfile({ name: 'Vault contact', cardName: 'Production vault' });
    const now = new Date().toISOString();
    const thread = normalizeRelayThread({
      id: cryptoId(),
      conversationId: '',
      cardId: profile.id,
      title: profile.cardName || profile.name,
      mode: 'local',
      status: 'fallback',
      preview: reason,
      messages: [
        { senderRole: 'system', senderName: 'ConnectLog', body: reason, createdAt: now },
        profile.welcomeMessage ? { senderRole: 'system', senderName: 'Welcome automation', body: profile.welcomeMessage, createdAt: now } : null
      ].filter(Boolean),
      relayBridge: profile.relayBridge || null,
      createdAt: now,
      updatedAt: now
    });
    upsertRelayThread(thread);
    state.activeRelayThreadId = thread.id;
    await persistRelayState();
    if (!options.silent) showToast('Production vault thread created.');
    return thread;
  }

  async function createRelayConversation({ card, customerName, customerEmail, customerPhone, body }) {
    const cfg = state.relayConfig || defaultRelayConfig();
    const payload = {
      workspace: cfg.workspace,
      workspace_id: cfg.workspaceId,
      channel: 'connectlog-card',
      subject: `ConnectLog: ${card.cardName || card.name}`,
      customer_name: customerName || card.name,
      customer_email: customerEmail || card.email,
      customer_phone: customerPhone || card.phone,
      source_url: window.location.href,
      external_user_id: `connectlog:${card.id}`,
      message: body || card.note || card.welcomeMessage || 'ConnectLog card connection request.',
      connectlog_card_id: card.id,
      connectlog_card_label: card.cardName || card.name,
      connectlog_campaign: card.audience || '',
      connectlog_owner_name: card.name,
      connectlog_welcome_message: card.welcomeMessage || '',
      connectlog_bridge: true
    };
    const headers = relayOperatorHeaders(cfg, { 'content-type': 'application/json' });
    const response = await fetch(`${cfg.origin}/api/v1/conversations`, { method: 'POST', headers, body: JSON.stringify(payload) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || `Relay13 conversation failed (${response.status})`);
    return data;
  }

  async function sendRelayMessage() {
    const thread = getActiveRelayThread();
    const body = cleanInput(els.relayMessageInput.value, 4000);
    if (!thread) return showToast('Create or select an inbox thread first.');
    if (!body) return showToast('Write a message first.');
    els.relayMessageInput.value = '';
    const cfg = state.relayConfig || defaultRelayConfig();
    const message = normalizeRelayMessage({ senderRole: 'operator', senderName: cfg.operatorName, body, pending: thread.mode === 'relay13' });
    thread.messages.push(message);
    thread.preview = body;
    thread.updatedAt = new Date().toISOString();
    upsertRelayThread(thread);
    if (thread.mode === 'relay13' && thread.origin && thread.conversationId) {
      try {
        await postRelayMessage(thread, message);
        message.pending = false;
        upsertRelayThread(thread);
        showToast('Message delivered through Relay13.');
      } catch (error) {
        message.pending = true;
        message.failed = true;
        await queueRelayOutbox(thread, message);
        showToast('Relay13 send failed. Message queued locally.');
      }
    } else {
      showToast('Message saved in the production vault.');
    }
    await persistRelayState();
    renderRelayPanel();
  }

  async function postRelayMessage(thread, message) {
    const cfg = state.relayConfig || defaultRelayConfig();
    const headers = relayOperatorHeaders(cfg, { 'content-type': 'application/json' });
    const payload = { body: message.body, sender_name: message.senderName || cfg.operatorName };
    if (relayOperatorToken(cfg)) {
      payload.sender_role = 'operator';
      payload.workspace_id = thread.workspaceId || cfg.workspaceId;
    } else if (thread.visitorToken) {
      payload.visitor_token = thread.visitorToken;
      payload.sender_role = 'customer';
    } else {
      throw new Error('Relay13 thread needs a 0S/SkyGate session or visitor token.');
    }
    const response = await fetch(`${thread.origin || cfg.origin}/api/v1/conversations/${encodeURIComponent(thread.conversationId)}/messages`, { method: 'POST', headers, body: JSON.stringify(payload) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data.error || `Relay13 message failed (${response.status})`);
    return data.message;
  }

  async function queueRelayOutbox(thread, message) {
    state.relayOutbox.push(normalizeRelayOutboxItem({
      id: cryptoId(),
      threadId: thread.id,
      conversationId: thread.conversationId,
      origin: thread.origin,
      workspaceId: thread.workspaceId,
      visitorToken: thread.visitorToken,
      senderRole: message.senderRole,
      message,
      createdAt: new Date().toISOString()
    }));
    await persistRelayState();
  }

  async function syncRelayOutbox() {
    if (!state.relayOutbox.length) return showToast('No queued Relay13 messages.');
    const remaining = [];
    let sent = 0;
    for (const item of state.relayOutbox) {
      const thread = state.relayThreads.find((row) => row.id === item.threadId || row.conversationId === item.conversationId);
      if (!thread) { remaining.push(item); continue; }
      try {
        await postRelayMessage(thread, item.message);
        sent++;
      } catch (_) {
        remaining.push(item);
      }
    }
    state.relayOutbox = remaining;
    await persistRelayState();
    renderRelayPanel();
    showToast(sent ? `Synced ${sent} queued Relay13 message${sent === 1 ? '' : 's'}.` : 'Relay13 still unavailable. Queue kept locally.');
  }

  async function refreshRelayThreads() {
    const cfg = state.relayConfig || defaultRelayConfig();
    if (!cfg.origin || !relayOperatorToken(cfg)) return showToast('Thread refresh needs Relay13 origin + 0S/SkyGate session.');
    try {
      const params = new URLSearchParams();
      if (cfg.workspaceId) params.set('workspace_id', cfg.workspaceId);
      params.set('limit', '50');
      const response = await fetch(`${cfg.origin}/api/v1/conversations?${params.toString()}`, { headers: relayOperatorHeaders(cfg), cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || `HTTP ${response.status}`);
      (data.conversations || []).forEach((row) => upsertRelayThread(normalizeRelayThread({
        id: row.id,
        conversationId: row.id,
        workspaceId: row.workspace_id,
        origin: cfg.origin,
        title: row.subject || row.customer_name || 'Relay13 conversation',
        mode: 'relay13',
        status: row.status,
        preview: row.last_message_preview,
        updatedAt: row.updated_at || row.last_message_at || row.created_at,
        createdAt: row.created_at
      })));
      await persistRelayState();
      showToast(`Relay13 threads refreshed: ${(data.conversations || []).length}.`);
    } catch (error) {
      showToast(`Relay13 refresh failed: ${error.message || 'unknown error'}`);
    }
    renderRelayPanel();
  }

  function upsertRelayThread(thread) {
    const clean = normalizeRelayThread(thread);
    const index = state.relayThreads.findIndex((row) => row.id === clean.id || (clean.conversationId && row.conversationId === clean.conversationId));
    if (index >= 0) state.relayThreads[index] = { ...state.relayThreads[index], ...clean, messages: clean.messages.length ? clean.messages : state.relayThreads[index].messages };
    else state.relayThreads.unshift(clean);
  }

  function getActiveRelayThread() {
    return state.relayThreads.find((thread) => thread.id === state.activeRelayThreadId) || state.relayThreads[0] || null;
  }

  function renderRelayThreads() {
    if (!els.relayThreadList) return;
    if (!state.relayThreads.length) {
      const empty = document.createElement('p');
      empty.className = 'panel-hint';
      empty.textContent = 'No inbox threads yet. Create one from the active card or let a Relay13 scan request create it later.';
      replaceChildren(els.relayThreadList, empty);
      return;
    }
    replaceChildren(els.relayThreadList, ...state.relayThreads.slice(0, 40).map((thread) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `thread-row${thread.id === state.activeRelayThreadId ? ' active' : ''}`;
      button.dataset.id = thread.id;
      button.innerHTML = `<strong>${escapeHtml(thread.title)}</strong><span>${escapeHtml(thread.mode === 'relay13' ? 'Relay13' : 'Production vault')} · ${escapeHtml(thread.status || 'open')}</span><small>${escapeHtml(thread.preview || 'No preview yet')}</small>`;
      return button;
    }));
  }

  function renderRelayMessages() {
    if (!els.relayMessageLog) return;
    const thread = getActiveRelayThread();
    if (!thread) {
      const empty = document.createElement('p');
      empty.className = 'panel-hint';
      empty.textContent = 'Select or create a thread to see messages.';
      replaceChildren(els.relayMessageLog, empty);
      return;
    }
    const header = document.createElement('div');
    header.className = 'message-thread-header';
    header.innerHTML = `<strong>${escapeHtml(thread.title)}</strong><span>${escapeHtml(thread.mode === 'relay13' ? `Relay13 conversation ${thread.conversationId || ''}` : 'Production vault conversation')}</span>`;
    const messages = thread.messages.length ? thread.messages : [{ senderRole: 'system', senderName: 'ConnectLog', body: 'No local messages cached yet. Remote Relay13 history can be pulled in the next backend pass.', createdAt: thread.createdAt }];
    replaceChildren(els.relayMessageLog, header, ...messages.map((message) => {
      const row = document.createElement('article');
      row.className = `message-row ${message.senderRole || 'system'}${message.failed ? ' failed' : ''}`;
      const meta = [message.senderName || message.senderRole || 'system', message.pending ? 'queued' : '', new Date(message.createdAt).toLocaleString()].filter(Boolean).join(' · ');
      row.innerHTML = `<p>${escapeHtml(message.body)}</p><small>${escapeHtml(meta)}</small>`;
      return row;
    }));
  }

  function renderRelayOutbox() {
    if (!els.relayFallbackLog) return;
    const lines = [];
    lines.push(state.relayOutbox.length ? `☐ ${state.relayOutbox.length} queued Relay13 message${state.relayOutbox.length === 1 ? '' : 's'} waiting for verified delivery.` : '✅ No queued Relay13 messages.');
    const localCount = state.relayThreads.filter((thread) => thread.mode === 'local').length;
    lines.push(localCount ? `✅ ${localCount} production vault thread${localCount === 1 ? '' : 's'} preserved in this browser.` : '✅ Production vault is ready.');
    replaceChildren(els.relayFallbackLog, ...lines.map((line) => {
      const p = document.createElement('p');
      p.textContent = line;
      return p;
    }));
  }

  function handleRelayThreadClick(event) {
    const row = event.target.closest('[data-id]');
    if (!row) return;
    state.activeRelayThreadId = row.dataset.id;
    renderRelayPanel();
  }

  function openRelayAdmin() {
    const cfg = state.relayConfig || defaultRelayConfig();
    if (!cfg.origin) return showToast('Add Relay13 Worker origin first.');
    window.open(`${cfg.origin}/admin/`, '_blank', 'noopener,noreferrer');
  }

  function sanitizeRelayConfigForExport(config = state.relayConfig || defaultRelayConfig()) {
    const clean = normalizeRelayConfig(config);
    return { ...clean, apiKey: '' };
  }

  function sanitizeRelayThreadForExport(thread) {
    const clean = normalizeRelayThread(thread);
    return { ...clean, visitorToken: clean.visitorToken ? '[stored-locally]' : '' };
  }

  function publicRelayBridgeFromConfig(card = state.profile) {
    const cfg = state.relayConfig || defaultRelayConfig();
    if (!card?.id || !cfg.shareBridge || !relayRemoteReady(cfg)) return null;
    return {
      origin: cfg.origin,
      workspace: cfg.workspace,
      workspaceId: cfg.workspaceId,
      cardId: card.id,
      cardLabel: card.cardName || card.name,
      campaign: card.audience || ''
    };
  }

  function restoreMenuState() {
    state.menuCollapsed = localStorage.getItem('connectlog-menu-collapsed') === 'true';
    renderMenuCollapsed();
  }

  function toggleMenuCollapsed() {
    state.menuCollapsed = !state.menuCollapsed;
    localStorage.setItem('connectlog-menu-collapsed', String(state.menuCollapsed));
    renderMenuCollapsed();
  }

  function renderMenuCollapsed() {
    if (!els.appShell) return;
    els.appShell.classList.toggle('menu-collapsed', state.menuCollapsed);
    if (els.menuCollapseBtn) {
      els.menuCollapseBtn.textContent = state.menuCollapsed ? '⇥' : '⇤';
      els.menuCollapseBtn.setAttribute('aria-expanded', String(!state.menuCollapsed));
      els.menuCollapseBtn.setAttribute('aria-label', state.menuCollapsed ? 'Expand central menu' : 'Minimize central menu');
      els.menuCollapseBtn.title = state.menuCollapsed ? 'Expand menu' : 'Minimize menu';
    }
  }

  function renderProfileCardSelector() {
    if (!els.profileCardSelect) return;
    els.profileCardSelect.replaceChildren();
    if (!state.profileCards.length) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No cards yet';
      els.profileCardSelect.append(option);
      els.deleteProfileCardBtn.disabled = true;
      els.duplicateProfileCardBtn.disabled = true;
      return;
    }
    state.profileCards.forEach((card) => {
      const option = document.createElement('option');
      option.value = card.id;
      option.textContent = card.cardName || card.audience || card.name;
      els.profileCardSelect.append(option);
    });
    els.profileCardSelect.value = state.activeProfileCardId || state.profileCards[0]?.id || '';
    els.deleteProfileCardBtn.disabled = state.profileCards.length < 2;
    els.duplicateProfileCardBtn.disabled = !state.profile;
  }

  function renderProfileCardGrid() {
    if (!els.profileCardGrid) return;
    if (!state.profileCards.length) {
      const empty = document.createElement('article');
      empty.className = 'variant-card empty';
      empty.innerHTML = '<strong>No card variants yet.</strong><p>Create a card for a room, event, or audience. Each one can hold a separate welcome message and photo.</p>';
      replaceChildren(els.profileCardGrid, empty);
      return;
    }
    replaceChildren(els.profileCardGrid, ...state.profileCards.map((card) => {
      const active = card.id === state.activeProfileCardId;
      const item = document.createElement('article');
      item.className = `variant-card${active ? ' active' : ''}`;
      item.dataset.id = card.id;
      const head = document.createElement('div');
      head.className = 'variant-head';
      head.append(renderAvatar(card, 'variant-avatar'));
      const copy = document.createElement('div');
      const title = document.createElement('h3');
      title.textContent = card.cardName || card.name;
      const meta = document.createElement('p');
      meta.textContent = [card.audience, card.role, card.company].filter(Boolean).join(' · ') || 'General exchange';
      copy.append(title, meta);
      head.append(copy);
      const welcome = document.createElement('p');
      welcome.className = 'variant-message';
      welcome.textContent = card.welcomeMessage || card.note || 'No welcome message set for this card yet.';
      const chips = document.createElement('div');
      chips.className = 'card-meta';
      if (active) chips.append(miniChip('Active'));
      if (card.photoData || card.photoThumbData) chips.append(miniChip('Photo'));
      if (card.welcomeMessage) chips.append(miniChip('Welcome'));
      card.tags.slice(0, 3).forEach((tag) => chips.append(miniChip(`#${tag}`)));
      const actions = document.createElement('div');
      actions.className = 'exchange-actions compact-row';
      actions.append(
        smallButton(active ? 'Active' : 'Use', 'use-profile-card'),
        smallButton('Edit', 'edit-profile-card'),
        smallButton('QR', 'qr-profile-card'),
        smallButton('Phone QR', 'vcard-profile-card')
      );
      item.append(head, welcome, chips, actions);
      return item;
    }));
  }

  function renderAvatar(entity, extraClass = '') {
    const avatar = document.createElement('div');
    avatar.className = `avatar ${extraClass}`.trim();
    const photo = entity?.photoThumbData || entity?.photoData || '';
    if (photo) {
      const img = document.createElement('img');
      img.src = photo;
      img.alt = '';
      img.loading = 'lazy';
      avatar.append(img);
    } else {
      avatar.textContent = initials(entity?.name || entity?.cardName || 'CL');
    }
    return avatar;
  }

  async function handleProfileCardGridClick(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const card = event.target.closest('[data-id]');
    const id = card?.dataset.id;
    if (!id) return;
    const action = button.dataset.action;
    if (action === 'use-profile-card') return setActiveProfileCard(id);
    if (action === 'edit-profile-card') return openProfileDialog(id);
    if (action === 'qr-profile-card') {
      await setActiveProfileCard(id);
      return showConnectLogQr();
    }
    if (action === 'vcard-profile-card') {
      await setActiveProfileCard(id);
      return showVcardQr();
    }
  }

  function renderProfileSummary() {
    if (!els.profileSummary) return;
    const profile = state.profile;
    els.profileSummary.replaceChildren();
    if (!profile?.name) {
      const empty = document.createElement('div');
      empty.className = 'profile-empty';
      const strong = document.createElement('strong');
      strong.textContent = 'No exchange card yet.';
      const p = document.createElement('p');
      p.textContent = 'Create a card once, then make targeted variants for each room, convention, audience, or intro path.';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'primary-btn small';
      btn.textContent = 'Create card';
      btn.addEventListener('click', () => openProfileDialog(null, { newVariant: true }));
      empty.append(strong, p, btn);
      els.profileSummary.append(empty);
      return;
    }

    const avatar = renderAvatar(profile, 'profile-avatar');
    const info = document.createElement('div');
    const h3 = document.createElement('h3');
    h3.textContent = profile.cardName || profile.name;
    const p = document.createElement('p');
    p.textContent = [profile.audience, profile.role, profile.company].filter(Boolean).join(' · ') || 'Exchange card ready';
    const welcome = document.createElement('p');
    welcome.className = 'profile-welcome-preview';
    welcome.textContent = profile.welcomeMessage || profile.note || 'No welcome message set yet.';
    const chips = document.createElement('div');
    chips.className = 'card-meta';
    if (profile.photoData || profile.photoThumbData) chips.append(miniChip('Photo ready'));
    if (profile.email) chips.append(miniChip('Email'));
    if (profile.phone) chips.append(miniChip('Phone'));
    if (profile.website) chips.append(miniChip('Website'));
    profile.tags.slice(0, 3).forEach((tag) => chips.append(miniChip(`#${tag}`)));
    const actions = document.createElement('div');
    actions.className = 'exchange-actions compact-row';
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'ghost-btn small';
    edit.textContent = 'Edit card';
    edit.addEventListener('click', () => openProfileDialog(profile.id));
    const share = document.createElement('button');
    share.type = 'button';
    share.className = 'primary-btn small';
    share.textContent = 'Show QR';
    share.addEventListener('click', showConnectLogQr);
    actions.append(edit, share);
    info.append(h3, p, welcome, chips, actions);
    els.profileSummary.append(avatar, info);
  }

  function openProfileDialog(id = state.activeProfileCardId, options = {}) {
    const active = id ? state.profileCards.find((card) => card.id === id) : null;
    const base = options.newVariant ? getProfileVariantBase() : active || state.profile || normalizeProfile({});
    const profile = normalizeProfile({
      ...base,
      id: options.newVariant ? cryptoId() : base.id,
      cardName: options.newVariant ? '' : base.cardName,
      audience: options.newVariant ? '' : base.audience,
      welcomeMessage: options.newVariant ? '' : base.welcomeMessage,
      tags: base.tags || []
    });
    state.editingProfileCardId = options.newVariant ? '' : profile.id;
    state.pendingPhotoData = profile.photoData || '';
    state.pendingPhotoThumbData = profile.photoThumbData || '';
    state.pendingPhotoName = profile.photoName || '';
    els.profileCardNameInput.value = profile.cardName || (options.newVariant ? '' : 'Main exchange card');
    els.profileAudienceInput.value = profile.audience || '';
    els.profileNameInput.value = profile.name || '';
    els.profileCompanyInput.value = profile.company || '';
    els.profileRoleInput.value = profile.role || '';
    els.profileEmailInput.value = profile.email || '';
    els.profilePhoneInput.value = profile.phone || '';
    els.profileWebsiteInput.value = profile.website || '';
    els.profileLinkedinInput.value = profile.linkedin || '';
    els.profileXInput.value = profile.x || '';
    els.profileGithubInput.value = profile.github || '';
    els.profileLocationInput.value = profile.location || '';
    els.profileWelcomeInput.value = profile.welcomeMessage || '';
    els.profileNoteInput.value = profile.note || '';
    els.profileTagsInput.value = profile.tags.join(', ');
    if (els.profilePhotoInput) els.profilePhotoInput.value = '';
    renderProfilePhotoPreview();
    openDialog(els.profileDialog, els.profileCardNameInput || els.profileNameInput);
  }

  function getProfileVariantBase() {
    const active = state.profile || normalizeProfile({});
    return {
      ...active,
      id: cryptoId(),
      cardName: '',
      audience: '',
      welcomeMessage: '',
      note: active.note || '',
      tags: active.tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  function closeProfileDialog() {
    els.profileDialog.close();
  }

  async function saveProfileFromForm(event) {
    event.preventDefault();
    const profile = normalizeProfile({
      id: state.editingProfileCardId || cryptoId(),
      cardName: els.profileCardNameInput.value,
      audience: els.profileAudienceInput.value,
      name: els.profileNameInput.value,
      company: els.profileCompanyInput.value,
      role: els.profileRoleInput.value,
      email: els.profileEmailInput.value,
      phone: els.profilePhoneInput.value,
      website: els.profileWebsiteInput.value,
      linkedin: els.profileLinkedinInput.value,
      x: els.profileXInput.value,
      github: els.profileGithubInput.value,
      location: els.profileLocationInput.value,
      welcomeMessage: els.profileWelcomeInput.value,
      note: els.profileNoteInput.value,
      tags: splitTags(els.profileTagsInput.value),
      photoData: state.pendingPhotoData,
      photoThumbData: state.pendingPhotoThumbData,
      photoName: state.pendingPhotoName,
      createdAt: state.profileCards.find((card) => card.id === state.editingProfileCardId)?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    if (!profile.cardName) return showToast('Give this card a label first.');
    if (!profile.name) return showToast('Your exchange card needs a name or brand.');
    const index = state.profileCards.findIndex((card) => card.id === profile.id);
    if (index >= 0) state.profileCards[index] = profile;
    else state.profileCards.unshift(profile);
    state.activeProfileCardId = profile.id;
    await saveProfileCards();
    closeProfileDialog();
    renderAll();
    showConnectLogQr();
    showToast('Exchange card saved. QR is ready.');
  }

  async function duplicateActiveProfileCard() {
    if (!state.profile) return showToast('Create a card first.');
    const copy = normalizeProfile({
      ...state.profile,
      id: cryptoId(),
      cardName: `${state.profile.cardName || state.profile.name} copy`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    state.profileCards.unshift(copy);
    state.activeProfileCardId = copy.id;
    await saveProfileCards();
    renderAll();
    showToast('Card duplicated. Edit the message for this room.');
  }

  async function deleteActiveProfileCard() {
    if (!state.profile) return showToast('No active card to delete.');
    if (state.profileCards.length < 2) return showToast('Keep at least one card. Edit it instead.');
    const confirmed = confirm(`Delete “${state.profile.cardName || state.profile.name}”? Contacts already saved in the vault will not be erased.`);
    if (!confirmed) return;
    state.profileCards = state.profileCards.filter((card) => card.id !== state.profile.id);
    state.activeProfileCardId = state.profileCards[0]?.id || '';
    await saveProfileCards();
    renderAll();
    showToast('Card deleted.');
  }

  async function handleProfilePhotoInput(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/i.test(file.type)) return showToast('Use a PNG, JPG, or WebP image.');
    if (file.size > MAX_PROFILE_PHOTO_BYTES) return showToast('Image blocked: keep the upload under 8 MB.');
    try {
      const [photoData, photoThumbData] = await Promise.all([
        resizeImageFile(file, 640, 0.86),
        resizeImageFile(file, 96, 0.68)
      ]);
      state.pendingPhotoData = photoData;
      state.pendingPhotoThumbData = photoThumbData;
      state.pendingPhotoName = cleanInput(file.name, 160);
      renderProfilePhotoPreview();
      showToast('Photo added to this card.');
    } catch (error) {
      console.error(error);
      showToast('Photo processing failed. Try another image.');
    }
  }

  function clearProfilePhotoDraft() {
    state.pendingPhotoData = '';
    state.pendingPhotoThumbData = '';
    state.pendingPhotoName = '';
    if (els.profilePhotoInput) els.profilePhotoInput.value = '';
    renderProfilePhotoPreview();
  }

  function renderProfilePhotoPreview() {
    if (!els.profilePhotoPreview) return;
    els.profilePhotoPreview.replaceChildren();
    const src = state.pendingPhotoThumbData || state.pendingPhotoData;
    if (!src) {
      els.profilePhotoPreview.textContent = 'No photo';
      els.profilePhotoPreview.classList.remove('has-photo');
      return;
    }
    els.profilePhotoPreview.classList.add('has-photo');
    const img = document.createElement('img');
    img.src = src;
    img.alt = 'Selected card photo preview';
    els.profilePhotoPreview.append(img);
  }

  function resizeImageFile(file, maxSide, quality) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error || new Error('File read failed'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Image decode failed'));
        img.onload = () => {
          const scale = Math.min(1, maxSide / Math.max(img.width || maxSide, img.height || maxSide));
          const width = Math.max(1, Math.round((img.width || maxSide) * scale));
          const height = Math.max(1, Math.round((img.height || maxSide) * scale));
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d', { alpha: true });
          ctx.drawImage(img, 0, 0, width, height);
          const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          resolve(canvas.toDataURL(type, quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function ensureProfileReady() {
    if (state.profile?.name) return true;
    openProfileDialog();
    showToast('Set up your exchange card first.');
    return false;
  }

  function showConnectLogQr() {
    if (!ensureProfileReady()) return;
    const payload = makeConnectLogLink(state.profile);
    renderQrPayload({
      kind: 'connectlog',
      payload,
      title: 'ConnectLog import QR',
      label: 'App exchange link',
      description: 'Scanning this opens ConnectLog and saves your exchange card into the scanner’s local ConnectLog vault. If the app is not installed, the same link opens in the browser and can be installed as a PWA.',
      level: window.ConnectLogQR?.EC_L
    });
  }

  function showVcardQr() {
    if (!ensureProfileReady()) return;
    let payload = buildVCard(state.profile, { photoMode: 'thumb' });
    let photoNote = '';
    if (payload.length > 2400) {
      payload = buildVCard(state.profile, { photoMode: 'none' });
      photoNote = ' The photo was omitted from this phone QR to keep scanning reliable; the downloadable .vcf and ConnectLog card still keep the picture.';
    }
    renderQrPayload({
      kind: 'vcard',
      payload,
      title: 'Phone contact QR',
      label: 'Universal vCard',
      description: `Scanning this with a normal phone camera creates a standard contact card on the scanner’s phone and places this card’s welcome message in the contact note.${photoNote}`,
      level: window.ConnectLogQR?.EC_M
    });
  }

  function renderQrPayload({ kind, payload, title, label, description, level }) {
    try {
      if (!window.ConnectLogQR) throw new Error('QR engine is unavailable.');
      const svg = window.ConnectLogQR.createSvg(payload, { level: level ?? window.ConnectLogQR.EC_M, dark: '#05070d', light: '#ffffff' });
      state.activeQrPayload = payload;
      state.activeQrSvg = svg;
      state.activeQrKind = kind;
      els.qrOutput.innerHTML = svg;
      els.qrModeLabel.textContent = label;
      els.qrTitle.textContent = title;
      els.qrDescription.textContent = description;
      els.shareLinkOutput.value = payload;
      els.qrStage.hidden = false;
      location.hash = 'exchange';
    } catch (error) {
      console.error(error);
      showToast(error.message || 'QR generation failed. Shorten the profile note and URLs, then try again.');
    }
  }

  function makeConnectLogLink(profile) {
    const url = new URL('./app.html', window.location.href);
    url.search = '';
    url.hash = '';
    const payload = {
      t: 'connectlog-card',
      v: 1,
      createdAt: new Date().toISOString(),
      p: compactProfile(profile)
    };
    url.hash = `${CONNECT_HASH_PREFIX}${base64UrlEncode(JSON.stringify(payload))}`;
    return url.toString();
  }

  function copyConnectLogLink() {
    if (!ensureProfileReady()) return;
    copyText(makeConnectLogLink(state.profile), 'ConnectLog exchange link copied.');
  }

  function downloadProfileVcard() {
    if (!ensureProfileReady()) return;
    downloadFile(`${safeFileName(state.profile.cardName || state.profile.name)}.vcf`, buildVCard(state.profile, { photoMode: 'full' }), 'text/vcard;charset=utf-8');
    showToast('vCard downloaded.');
  }

  function downloadQrSvg() {
    if (!state.activeQrSvg) return showToast('Generate a QR code first.');
    downloadFile(`connectlog-${state.activeQrKind || 'qr'}-${todayInputDate()}.svg`, state.activeQrSvg, 'image/svg+xml;charset=utf-8');
    showToast('QR SVG downloaded.');
  }

  function copyActiveQrPayload() {
    if (!state.activeQrPayload) return showToast('Generate a QR code first.');
    copyText(state.activeQrPayload, state.activeQrKind === 'vcard' ? 'vCard copied.' : 'Exchange link copied.');
  }

  async function copyText(text, successMessage) {
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else {
        const area = document.createElement('textarea');
        area.value = text;
        area.setAttribute('readonly', '');
        area.style.position = 'fixed';
        area.style.left = '-9999px';
        document.body.append(area);
        area.select();
        document.execCommand('copy');
        area.remove();
      }
      showToast(successMessage);
    } catch (error) {
      console.error(error);
      showToast('Copy failed. Use the visible payload field instead.');
    }
  }

  async function processIncomingConnectCard() {
    const hash = decodeURIComponent(window.location.hash.replace(/^#/, ''));
    if (!hash.startsWith(CONNECT_HASH_PREFIX)) return;
    try {
      const encoded = hash.slice(CONNECT_HASH_PREFIX.length);
      const parsed = JSON.parse(base64UrlDecode(encoded));
      if (parsed?.t !== 'connectlog-card' || parsed?.v !== 1 || !parsed?.p) throw new Error('Unsupported ConnectLog card.');
      const profile = normalizeProfile(expandCompactProfile(parsed.p));
      if (!profile.name) throw new Error('ConnectLog card is missing a name.');
      const result = await importProfileAsContact(profile);
      const cleanUrl = new URL(window.location.href);
      cleanUrl.hash = '';
      history.replaceState(null, '', cleanUrl.toString());
      await loadContacts();
      renderAll();
      const contactPacket = await getMeta(META_SKYES_CONTACT_PACKET);
      const scanPacket = {
        contactPacket,
        source: 'connectlog-exchange',
        cardKind: 'connectlog-exchange',
        cardTitle: profile.cardName || 'ConnectLog exchange card',
        businessName: profile.name,
        city: profile.location || '',
        category: [profile.audience, profile.role, profile.company].filter(Boolean).join(' / '),
        cardUrl: profile.website || '',
        clientId: profile.id || ''
      };
      renderSkyesWelcomePanel(scanPacket);
      recordBusinessCardScan(scanPacket).catch((error) => {
        console.warn('ConnectLog exchange scan record failed:', error);
        setBusinessCardScanStatus('Card saved locally. Relay13 scan record will retry from an operator session.');
      });
      showToast(result === 'updated' ? `${profile.name} was updated in ConnectLog.` : `${profile.name} was saved into ConnectLog.`);
    } catch (error) {
      console.error(error);
      showToast('ConnectLog QR could not be imported. The link may be damaged or too old.');
    }
  }

  async function importProfileAsContact(profile) {
    const now = new Date().toISOString();
    const incoming = contactFromProfile(profile, now);
    const existing = findMatchingContact(incoming);
    if (!existing) {
      await putContact(incoming);
      return 'created';
    }
    const merged = mergeImportedContact(existing, incoming, now);
    await putContact(merged);
    return 'updated';
  }

  function contactFromProfile(profile, now = new Date().toISOString()) {
    const details = detailsFromProfile(profile);
    const tags = [...new Set(['connectlog', 'qr-import', ...profile.tags])];
    const noteParts = [profile.note, 'Imported from a ConnectLog exchange QR.'].filter(Boolean);
    return normalizeContact({
      id: cryptoId(),
      name: profile.name,
      lane: 'lead',
      company: profile.company,
      role: profile.role,
      status: 'active',
      priority: 'normal',
      tags,
      details,
      notes: noteParts.join('\n\n'),
      relayBridge: profile.relayBridge || null,
      timeline: [{ id: cryptoId(), type: 'note', text: profile.relayBridge ? 'Imported from ConnectLog QR exchange with Relay13 bridge data.' : 'Imported from ConnectLog QR exchange.', date: todayInputDate(), createdAt: now }],
      createdAt: now,
      updatedAt: now
    });
  }

  function detailsFromProfile(profile) {
    const rows = [
      ['email', 'Email', profile.email],
      ['phone', 'Phone', profile.phone],
      ['website', 'Website', profile.website],
      ['linkedin', 'LinkedIn', profile.linkedin],
      ['x', 'X / Twitter', profile.x],
      ['github', 'GitHub', profile.github],
      ['location', 'Location', profile.location]
    ];
    return rows.filter(([, , value]) => value).map(([type, label, value]) => ({ id: cryptoId(), type, label, value }));
  }

  function findMatchingContact(incoming) {
    const incomingEmail = detailValue(incoming, 'email').toLowerCase();
    const incomingPhone = normalizePhone(detailValue(incoming, 'phone'));
    return state.contacts.find((contact) => {
      const email = detailValue(contact, 'email').toLowerCase();
      const phone = normalizePhone(detailValue(contact, 'phone'));
      if (incomingEmail && email && incomingEmail === email) return true;
      if (incomingPhone && phone && incomingPhone === phone) return true;
      return normalizeText(contact.name) === normalizeText(incoming.name) && normalizeText(contact.company) === normalizeText(incoming.company);
    });
  }

  function mergeImportedContact(existing, incoming, now) {
    const detailKey = (detail) => `${detail.type}:${normalizeText(detail.value)}`;
    const details = [...existing.details];
    const seen = new Set(details.map(detailKey));
    incoming.details.forEach((detail) => {
      const key = detailKey(detail);
      if (!seen.has(key)) details.push(detail);
    });
    const timeline = [
      ...(existing.timeline || []),
      { id: cryptoId(), type: 'note', text: 'Updated from ConnectLog QR exchange.', date: todayInputDate(), createdAt: now }
    ];
    return normalizeContact({
      ...existing,
      company: existing.company || incoming.company,
      role: existing.role || incoming.role,
      status: existing.status === 'archived' ? 'active' : existing.status,
      tags: [...new Set([...(existing.tags || []), ...(incoming.tags || [])])],
      details,
      notes: existing.notes || incoming.notes,
      welcomeMessage: existing.welcomeMessage || incoming.welcomeMessage || '',
      cardName: existing.cardName || incoming.cardName || '',
      audience: existing.audience || incoming.audience || '',
      photoData: existing.photoData || incoming.photoData || '',
      photoThumbData: existing.photoThumbData || incoming.photoThumbData || incoming.photoData || '',
      photoName: existing.photoName || incoming.photoName || '',
      relayBridge: existing.relayBridge || incoming.relayBridge || null,
      relayThread: existing.relayThread || incoming.relayThread || null,
      timeline,
      updatedAt: now
    });
  }

  function buildVCard(profile, options = {}) {
    const photoMode = options.photoMode || 'full';
    const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
    lines.push(`FN:${escapeVCard(profile.name)}`);
    if (profile.company) lines.push(`ORG:${escapeVCard(profile.company)}`);
    if (profile.role) lines.push(`TITLE:${escapeVCard(profile.role)}`);
    if (profile.phone) lines.push(`TEL;TYPE=CELL:${escapeVCard(profile.phone)}`);
    if (profile.email) lines.push(`EMAIL;TYPE=INTERNET:${escapeVCard(profile.email)}`);
    if (profile.website) lines.push(`URL:${escapeVCard(profile.website)}`);
    if (profile.location) lines.push(`ADR;TYPE=WORK:;;${escapeVCard(profile.location)};;;;`);
    const photoData = photoMode === 'none' ? '' : photoMode === 'thumb' ? (profile.photoThumbData || '') : (profile.photoData || profile.photoThumbData || '');
    const photo = photoDataToVCardLine(photoData);
    if (photo) lines.push(photo);
    const socials = [profile.linkedin, profile.x, profile.github].filter(Boolean).join(' | ');
    const note = [
      profile.welcomeMessage ? `Welcome message: ${profile.welcomeMessage}` : '',
      profile.note,
      profile.cardName ? `Card: ${profile.cardName}` : '',
      profile.audience ? `Audience: ${profile.audience}` : '',
      socials ? `Social: ${socials}` : '',
      profile.tags.length ? `Tags: ${profile.tags.join(', ')}` : ''
    ].filter(Boolean).join('\n');
    if (note) lines.push(`NOTE:${escapeVCard(note)}`);
    lines.push('END:VCARD');
    return `${lines.join('\r\n')}\r\n`;
  }

  function photoDataToVCardLine(dataUrl) {
    const match = String(dataUrl || '').match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i);
    if (!match) return '';
    const type = match[1].toLowerCase() === 'jpg' ? 'JPEG' : match[1].toUpperCase();
    return `PHOTO;ENCODING=b;TYPE=${type}:${match[2]}`;
  }

  function normalizeProfile(raw) {
    const now = new Date().toISOString();
    const tags = Array.isArray(raw.tags) ? raw.tags : splitTags(raw.tags || '');
    const name = cleanInput(raw.name || raw.n || '', 120);
    const cardName = cleanInput(raw.cardName || raw.cn || raw.label || '', 80) || (name ? `${name} exchange card` : 'Exchange card');
    const photoData = validImageDataUrl(raw.photoData || raw.pd || '') ? String(raw.photoData || raw.pd) : '';
    const photoThumbData = validImageDataUrl(raw.photoThumbData || raw.pt || '') ? String(raw.photoThumbData || raw.pt) : '';
    return {
      id: String(raw.id || raw.i || cryptoId()).slice(0, 96),
      cardName,
      audience: cleanInput(raw.audience || raw.aud || '', 120),
      welcomeMessage: cleanInput(raw.welcomeMessage || raw.wm || '', 900),
      name,
      company: cleanInput(raw.company || raw.c || '', 140),
      role: cleanInput(raw.role || raw.r || '', 140),
      email: cleanInput(raw.email || raw.e || '', 160),
      phone: cleanInput(raw.phone || raw.ph || '', 60),
      website: normalizeUrl(raw.website || raw.w || ''),
      linkedin: normalizeUrl(raw.linkedin || raw.li || ''),
      x: cleanInput(raw.x || '', 160),
      github: normalizeUrl(raw.github || raw.gh || '', true),
      location: cleanInput(raw.location || raw.loc || '', 240),
      note: cleanInput(raw.note || raw.no || '', 600),
      tags: [...new Set(tags.map(cleanTag).filter(Boolean))].slice(0, 24),
      photoData,
      photoThumbData: photoThumbData || photoData,
      photoName: cleanInput(raw.photoName || raw.pn || '', 160),
      relayBridge: normalizeRelayBridge(raw.relayBridge || raw.rb || null),
      createdAt: validIso(raw.createdAt) || now,
      updatedAt: validIso(raw.updatedAt) || now
    };
  }

  function compactProfile(profile) {
    const photoThumb = profile.photoThumbData && profile.photoThumbData.length <= QR_PHOTO_MAX_CHARS ? profile.photoThumbData : '';
    return {
      i: profile.id,
      cn: profile.cardName,
      aud: profile.audience,
      wm: profile.welcomeMessage,
      n: profile.name,
      c: profile.company,
      r: profile.role,
      e: profile.email,
      ph: profile.phone,
      w: profile.website,
      li: profile.linkedin,
      x: profile.x,
      gh: profile.github,
      loc: profile.location,
      no: profile.note,
      tags: profile.tags,
      pt: photoThumb,
      pn: profile.photoName,
      rb: publicRelayBridgeFromConfig(profile)
    };
  }

  function expandCompactProfile(raw) {
    return {
      id: raw.i,
      cardName: raw.cn,
      audience: raw.aud,
      welcomeMessage: raw.wm,
      name: raw.n,
      company: raw.c,
      role: raw.r,
      email: raw.e,
      phone: raw.ph,
      website: raw.w,
      linkedin: raw.li,
      x: raw.x,
      github: raw.gh,
      location: raw.loc,
      note: raw.no,
      tags: raw.tags,
      photoThumbData: raw.pt,
      photoData: raw.pt,
      photoName: raw.pn,
      relayBridge: raw.rb && typeof raw.rb === 'object' ? raw.rb : null
    };
  }


  function normalizeRelayBridge(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const origin = normalizeRelayOrigin(raw.origin || '');
    const workspace = cleanInput(raw.workspace || '', 80).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
    const workspaceId = cleanInput(raw.workspaceId || raw.workspace_id || '', 140);
    if (!origin || (!workspace && !workspaceId)) return null;
    return {
      origin,
      workspace,
      workspaceId,
      cardId: cleanInput(raw.cardId || raw.card_id || '', 96),
      cardLabel: cleanInput(raw.cardLabel || raw.card_label || '', 120),
      campaign: cleanInput(raw.campaign || '', 120)
    };
  }

  function validImageDataUrl(value) {
    return /^data:image\/(png|jpeg|jpg|webp);base64,[a-z0-9+/=]+$/i.test(String(value || ''));
  }

  function normalizeUrl(value, allowHandle = false) {
    const raw = cleanInput(value, 240);
    if (!raw) return '';
    if (allowHandle && /^@?[a-zA-Z0-9_.-]+$/.test(raw)) return raw.replace(/^@/, '');
    if (/^https?:\/\//i.test(raw)) return raw;
    if (/^[\w.-]+\.[a-z]{2,}/i.test(raw)) return `https://${raw}`;
    return raw;
  }

  function detailValue(contact, type) {
    return contact.details.find((detail) => detail.type === type)?.value || '';
  }

  function normalizePhone(value) {
    return String(value || '').replace(/[^+\d]/g, '');
  }

  function escapeVCard(value) {
    return String(value || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  }

  function base64UrlEncode(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = '';
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  function base64UrlDecode(value) {
    const padded = `${String(value).replace(/-/g, '+').replace(/_/g, '/')}${'==='.slice((String(value).length + 3) % 4)}`;
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function safeFileName(value) {
    return cleanInput(value || 'connectlog-contact', 80).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'connectlog-contact';
  }

  function parseImportPayload(payload) {
    const list = Array.isArray(payload) ? payload : Array.isArray(payload?.contacts) ? payload.contacts : [];
    return list.filter((item) => item && typeof item === 'object').slice(0, 10000);
  }

  function normalizeContact(raw) {
    const now = new Date().toISOString();
    const status = cleanEnum(raw.status, ['new', 'active', 'warm', 'follow-up', 'archived'], 'new');
    const lane = cleanEnum(raw.lane, laneOptions, inferLane(raw));
    const priority = cleanEnum(raw.priority, ['low', 'normal', 'high', 'critical'], 'normal');
    const details = Array.isArray(raw.details) ? raw.details : [];
    const tags = Array.isArray(raw.tags) ? raw.tags : [];
    const timeline = Array.isArray(raw.timeline) ? raw.timeline : [];
    return {
      id: String(raw.id || cryptoId()).slice(0, 96),
      name: cleanInput(raw.name || raw.identifier || 'Unnamed contact', 120) || 'Unnamed contact',
      cardName: cleanInput(raw.cardName || '', 80),
      audience: cleanInput(raw.audience || '', 120),
      welcomeMessage: cleanInput(raw.welcomeMessage || '', 900),
      company: cleanInput(raw.company || raw.context || '', 140),
      role: cleanInput(raw.role || raw.job || '', 140),
      lane,
      status,
      priority,
      pinned: Boolean(raw.pinned),
      createdAt: validIso(raw.createdAt) || now,
      updatedAt: validIso(raw.updatedAt) || validIso(raw.createdAt) || now,
      lastContactedAt: normalizeDate(raw.lastContactedAt || ''),
      nextFollowUpAt: normalizeDate(raw.nextFollowUpAt || raw.followUpAt || ''),
      tags: [...new Set(tags.map(cleanTag).filter(Boolean))].slice(0, 80),
      details: details.filter(Boolean).map((detail) => ({
        id: String(detail.id || cryptoId()).slice(0, 96),
        type: cleanEnum(detail.type, detailTypes.map((type) => type.value), 'custom'),
        label: cleanInput(detail.label || readableDetailType(detail.type), 48),
        value: cleanInput(detail.value, 800)
      })).filter((detail) => detail.value).slice(0, 80),
      notes: cleanInput(raw.notes || '', 6000),
      photoData: validImageDataUrl(raw.photoData || '') ? String(raw.photoData) : '',
      photoThumbData: validImageDataUrl(raw.photoThumbData || '') ? String(raw.photoThumbData) : '',
      photoName: cleanInput(raw.photoName || '', 160),
      relayBridge: normalizeRelayBridge(raw.relayBridge || null),
      relayThread: raw.relayThread && typeof raw.relayThread === 'object' ? normalizeRelayThread(raw.relayThread) : null,
      timeline: timeline.filter(Boolean).map((item) => ({
        id: String(item.id || cryptoId()).slice(0, 96),
        type: cleanEnum(item.type, ['note', 'call', 'meeting', 'email', 'task'], 'note'),
        text: cleanInput(item.text || item.note || '', 600),
        date: normalizeDate(item.date || item.createdAt || ''),
        createdAt: validIso(item.createdAt) || now
      })).filter((item) => item.text).slice(0, 400)
    };
  }

  function defaultDetails() {
    return [
      { id: cryptoId(), type: 'email', label: 'Email', value: '' },
      { id: cryptoId(), type: 'phone', label: 'Phone', value: '' },
      { id: cryptoId(), type: 'location', label: 'Location', value: '' }
    ];
  }

  function searchableText(contact) {
    return normalizeText([
      contact.name,
      contact.company,
      contact.role,
      contact.lane,
      contact.status,
      contact.priority,
      contact.notes,
      contact.relayBridge?.cardLabel || '',
      contact.relayBridge?.campaign || '',
      ...contact.tags,
      ...contact.details.flatMap((detail) => [detail.label, detail.value]),
      ...contact.timeline.flatMap((item) => [item.type, item.text])
    ].join(' '));
  }

  function isDue(contact) {
    if (!contact.nextFollowUpAt) return false;
    const today = new Date(todayInputDate()).getTime();
    return new Date(contact.nextFollowUpAt).getTime() <= today;
  }

  function linkForDetail(detail) {
    const value = detail.value.trim();
    if (!value) return '';
    if (detail.type === 'email' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return `mailto:${value}`;
    if (detail.type === 'phone') return `tel:${value.replace(/[^+\d]/g, '')}`;
    if (detail.type === 'website' || detail.type === 'linkedin' || detail.type === 'github' || detail.type === 'x') {
      if (/^https?:\/\//i.test(value)) return value;
      if (detail.type === 'linkedin') return `https://${value.replace(/^@/, '').replace(/^linkedin\.com/i, 'linkedin.com')}`;
      if (detail.type === 'github') return `https://${value.replace(/^@/, '').replace(/^github\.com/i, 'github.com')}`;
      if (detail.type === 'x') return `https://x.com/${value.replace(/^@/, '').replace(/^x\.com\//i, '')}`;
      return `https://${value}`;
    }
    return '';
  }

  function smallButton(text, action) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ghost-btn small';
    button.dataset.action = action;
    button.textContent = text;
    return button;
  }

  function iconAction(text, label, action, extraClass = '') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `icon-btn ${extraClass}`.trim();
    button.dataset.action = action;
    button.title = label;
    button.ariaLabel = label;
    button.textContent = text;
    return button;
  }

  function miniChip(text) {
    const chip = document.createElement('span');
    chip.className = 'mini-chip';
    chip.textContent = text;
    return chip;
  }

  function showToast(message, actionText = '', action = null) {
    els.toast.textContent = message;
    if (actionText && typeof action === 'function') {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ghost-btn small';
      button.textContent = actionText;
      button.addEventListener('click', action, { once: true });
      els.toast.append(button);
    }
    els.toast.classList.add('show');
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => els.toast.classList.remove('show'), 4400);
  }

  function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function replaceChildren(parent, ...children) {
    parent.replaceChildren(...children.filter(Boolean));
  }

  function cleanInput(value, max = 1000) {
    return String(value || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);
  }

  function cleanTag(value) {
    return cleanInput(value, 36).toLowerCase().replace(/^#/, '').replace(/\s+/g, '-').replace(/[^a-z0-9_.-]/g, '').slice(0, 36);
  }

  function splitTags(value) {
    return [...new Set(String(value || '').split(',').map(cleanTag).filter(Boolean))].slice(0, 24);
  }

  function cleanEnum(value, allowed, fallback) {
    return allowed.includes(value) ? value : fallback;
  }

  function normalizeText(value) {
    return String(value || '').toLowerCase().normalize('NFKD');
  }

  function validIso(value) {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString();
  }

  function normalizeDate(value) {
    if (!value) return '';
    const stringValue = String(value).slice(0, 10);
    const date = new Date(stringValue);
    return Number.isNaN(date.getTime()) ? '' : stringValue;
  }

  function dateValue(value) {
    const time = new Date(value || 0).getTime();
    return Number.isNaN(time) ? 0 : time;
  }

  function todayInputDate() {
    const date = new Date();
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 10);
  }

  function toInputDate(value) {
    return normalizeDate(value);
  }

  function formatDate(value) {
    if (!value) return '';
    const date = new Date(`${normalizeDate(value)}T00:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
  }

  function relativeDate(value) {
    const diff = Date.now() - dateValue(value);
    if (!value || diff < 0) return 'just now';
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return formatDate(value);
  }

  function initials(name) {
    const parts = cleanInput(name, 80).split(/\s+/).filter(Boolean);
    return (parts[0]?.[0] || '?') + (parts.length > 1 ? parts[1][0] : '');
  }

  function readableStatus(status) {
    return String(status || 'new').replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function readableLane(lane) {
    return String(lane || 'lead').replace(/-/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function readableDetailType(type) {
    return detailTypes.find((item) => item.value === type)?.label || 'Custom';
  }

  function priorityLabel(priority) {
    return readableStatus(priority || 'normal');
  }

  function latestTimelineText(contact) {
    return [...(contact.timeline || [])].sort((a, b) => dateValue(b.date || b.createdAt) - dateValue(a.date || a.createdAt))[0]?.text || '';
  }

  function sortByUpdatedDesc(a, b) {
    return dateValue(b.updatedAt) - dateValue(a.updatedAt);
  }

  function csvEscape(value) {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function formatBytes(bytes) {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
  }

  function cryptoId() {
    if (crypto?.randomUUID) return crypto.randomUUID();
    return `cl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
  }

  function structuredCloneSafe(value) {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }
})();

// BEGIN quantumskyes:adaptive-neon-scrollbar-js
(function(){
  if(window.__mcpVisibleNeonScrollbars) return;
  window.__mcpVisibleNeonScrollbars = true;

  function onReady(fn){
    if(document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    }else{
      fn();
    }
  }

  function clamp(value, min, max){
    return Math.min(max, Math.max(min, value));
  }

  function verticalSource(){
    return document.scrollingElement || document.documentElement;
  }

  function horizontalSource(){
    const doc = document.scrollingElement || document.documentElement;
    if(doc.scrollWidth > doc.clientWidth + 4) return { node: doc, mode: 'horizontal' };
    const selectors = [
      '.site-header nav',
      '.table-wrap',
      '.topnav',
      '.route-grid',
      '.command-table',
      '.saas-table'
    ];
    const node = selectors
      .flatMap((selector) => [...document.querySelectorAll(selector)])
      .find((element) => element.scrollWidth > element.clientWidth + 4);
    return node ? { node, mode: 'horizontal' } : { node: doc, mode: 'page' };
  }

  onReady(() => {
    document.documentElement.setAttribute('data-mcp-neon-scrollbar', '');
    document.querySelectorAll('.mcp-neon-scroll-rail,.mcp-neon-scroll-corner').forEach((node) => node.remove());

    const yRail = document.createElement('div');
    yRail.className = 'mcp-neon-scroll-rail mcp-neon-scroll-rail-y';
    yRail.setAttribute('aria-hidden', 'true');
    yRail.innerHTML = '<i class="mcp-neon-scroll-thumb"></i>';

    const xRail = document.createElement('div');
    xRail.className = 'mcp-neon-scroll-rail mcp-neon-scroll-rail-x';
    xRail.setAttribute('aria-hidden', 'true');
    xRail.innerHTML = '<i class="mcp-neon-scroll-thumb"></i>';

    const corner = document.createElement('div');
    corner.className = 'mcp-neon-scroll-corner';
    corner.setAttribute('aria-hidden', 'true');

    document.body.append(yRail, xRail, corner);

    const yThumb = yRail.querySelector('.mcp-neon-scroll-thumb');
    const xThumb = xRail.querySelector('.mcp-neon-scroll-thumb');
    let activeHorizontal = horizontalSource();
    let raf = 0;
    let dragRaf = 0;
    let pendingDrag = null;
    let metrics = null;

    function measure(){
      const ySource = verticalSource();
      const yTrack = Math.max(1, yRail.clientHeight);
      const yMax = Math.max(1, ySource.scrollHeight - window.innerHeight);
      const yRatio = clamp(window.scrollY / yMax, 0, 1);
      const ySize = clamp((window.innerHeight / Math.max(ySource.scrollHeight, window.innerHeight)) * yTrack, 78, yTrack);

      if(!activeHorizontal?.node || !document.documentElement.contains(activeHorizontal.node)){
        activeHorizontal = horizontalSource();
      }
      const xTrack = Math.max(1, xRail.clientWidth);
      const xSource = activeHorizontal.node;
      const xMax = Math.max(0, xSource.scrollWidth - xSource.clientWidth);
      const pageMode = activeHorizontal.mode === 'page' || xMax <= 1;
      const xRatio = pageMode ? yRatio : clamp(xSource.scrollLeft / xMax, 0, 1);
      const xSize = pageMode
        ? clamp(xTrack * .24, 84, Math.max(84, xTrack * .38))
        : clamp((xSource.clientWidth / Math.max(xSource.scrollWidth, xSource.clientWidth)) * xTrack, 84, xTrack);

      return { ySource, yTrack, yMax, yRatio, ySize, xSource, xTrack, xMax, xRatio, xSize, pageMode };
    }

    function paintRails(view){
      yThumb.style.height = `${Math.floor(view.ySize)}px`;
      yRail.style.setProperty('--mcp-scroll-y', `${Math.round(view.yRatio * Math.max(0, view.yTrack - view.ySize))}px`);
      xThumb.style.width = `${Math.floor(view.xSize)}px`;
      xRail.style.setProperty('--mcp-scroll-x', `${Math.round(view.xRatio * Math.max(0, view.xTrack - view.xSize))}px`);
      xRail.dataset.scrollMode = view.pageMode ? 'page' : 'horizontal';
    }

    function scheduleUpdate(){
      if(raf) return;
      raf = window.requestAnimationFrame(updateRails);
    }

    function updateRails(){
      raf = 0;
      metrics = measure();
      paintRails(metrics);
    }

    function flushDrag(){
      dragRaf = 0;
      if(!pendingDrag) return;
      const { axis, ratio, snapshot } = pendingDrag;
      pendingDrag = null;
      const next = snapshot || measure();
      const bounded = clamp(ratio, 0, 1);

      if(axis === 'y'){
        next.ySource.scrollTop = bounded * next.yMax;
        const yRatio = clamp(next.ySource.scrollTop / Math.max(1, next.yMax), 0, 1);
        paintRails({
          ...next,
          yRatio,
          xRatio: next.pageMode ? yRatio : next.xRatio
        });
      }else if(next.pageMode){
        next.ySource.scrollTop = bounded * next.yMax;
        const yRatio = clamp(next.ySource.scrollTop / Math.max(1, next.yMax), 0, 1);
        paintRails({
          ...next,
          yRatio,
          xRatio: yRatio
        });
      }else{
        next.xSource.scrollLeft = bounded * next.xMax;
        paintRails({
          ...next,
          xRatio: clamp(next.xSource.scrollLeft / Math.max(1, next.xMax), 0, 1)
        });
      }
      scheduleUpdate();
    }

    function queueDrag(axis, ratio, snapshot){
      pendingDrag = { axis, ratio, snapshot };
      if(!dragRaf) dragRaf = window.requestAnimationFrame(flushDrag);
    }

    function bindRail(rail, thumb, axis, setter){
      let dragging = false;
      let pointerOffset = 0;
      let dragSnapshot = null;
      let railStart = 0;
      let track = 1;
      let size = 1;

      function ratioFromEvent(event, keepOffset){
        const coordinate = axis === 'y' ? event.clientY : event.clientX;
        const localOffset = keepOffset ? pointerOffset : size / 2;
        return clamp((coordinate - railStart - localOffset) / Math.max(1, track - size), 0, 1);
      }

      rail.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        dragging = true;
        dragSnapshot = measure();
        const railRect = rail.getBoundingClientRect();
        const thumbRect = thumb.getBoundingClientRect();
        railStart = axis === 'y' ? railRect.top : railRect.left;
        track = axis === 'y' ? dragSnapshot.yTrack : dragSnapshot.xTrack;
        size = axis === 'y' ? dragSnapshot.ySize : dragSnapshot.xSize;
        document.documentElement.classList.add('mcp-neon-scroll-dragging');
        rail.classList.add('is-dragging');
        rail.setPointerCapture?.(event.pointerId);
        pointerOffset = event.target === thumb || thumb.contains(event.target)
          ? (axis === 'y' ? event.clientY - thumbRect.top : event.clientX - thumbRect.left)
          : (axis === 'y' ? thumbRect.height / 2 : thumbRect.width / 2);
        setter(ratioFromEvent(event, event.target === thumb || thumb.contains(event.target)), dragSnapshot);
      });

      rail.addEventListener('pointermove', (event) => {
        if(!dragging) return;
        event.preventDefault();
        setter(ratioFromEvent(event, true), dragSnapshot);
      });

      function endDrag(event){
        if(!dragging) return;
        dragging = false;
        dragSnapshot = null;
        document.documentElement.classList.remove('mcp-neon-scroll-dragging');
        rail.classList.remove('is-dragging');
        rail.releasePointerCapture?.(event.pointerId);
        scheduleUpdate();
      }

      rail.addEventListener('pointerup', endDrag);
      rail.addEventListener('pointercancel', endDrag);
    }

    bindRail(yRail, yThumb, 'y', (ratio, snapshot) => queueDrag('y', ratio, snapshot));
    bindRail(xRail, xThumb, 'x', (ratio, snapshot) => queueDrag('x', ratio, snapshot));

    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', () => {
      activeHorizontal = horizontalSource();
      scheduleUpdate();
    }, { passive: true });
    document.addEventListener('scroll', (event) => {
      if(event.target && event.target === activeHorizontal.node) scheduleUpdate();
    }, true);
    document.addEventListener('pointerover', (event) => {
      const candidate = event.target && event.target.closest && event.target.closest('.site-header nav,.table-wrap,.topnav,.route-grid');
      if(candidate && candidate.scrollWidth > candidate.clientWidth + 4){
        activeHorizontal = { node: candidate, mode: 'horizontal' };
        scheduleUpdate();
      }
    }, { passive: true });

    scheduleUpdate();
    window.setTimeout(scheduleUpdate, 350);
    window.setTimeout(scheduleUpdate, 1200);
  });
})();
// END quantumskyes:adaptive-neon-scrollbar-js

// BEGIN quantumskyes:skyesol-living-background-js
function mountSkyeSolLivingBackground({
  canvasSelector = '.skyesol-living-field',
  particleDensity = 16000,
  maxParticles = 120,
  minParticles = 58
} = {}) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.querySelector(canvasSelector);
  if (!canvas || !canvas.getContext || reduceMotion) return () => {};

  const ctx = canvas.getContext('2d');
  const palette = [
    'rgba(201,168,76,',
    'rgba(138,99,255,',
    'rgba(39,242,255,'
  ];
  let width = 0;
  let height = 0;
  let particles = [];
  let raf = 0;
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const count = Math.min(maxParticles, Math.max(minParticles, Math.floor(width * height / particleDensity)));
    particles = Array.from({ length: count }, (_, index) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.8 + .4,
      a: Math.random() * .34 + .12,
      s: Math.random() * .34 + .08,
      phase: Math.random() * Math.PI * 2,
      color: palette[index % palette.length]
    }));
  }

  function drawWave(time, yOffset, colorA, colorB, amp, speed) {
    const gradient = ctx.createLinearGradient(0, yOffset - amp * 2, width, yOffset + amp * 2);
    gradient.addColorStop(0, colorA);
    gradient.addColorStop(.5, colorB);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let x = 0; x <= width; x += 18) {
      const n = Math.sin((x * .006) + time * speed) * amp;
      const n2 = Math.cos((x * .011) - time * speed * .7) * amp * .46;
      ctx.lineTo(x, yOffset + n + n2);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
  }

  function animate(now) {
    if (document.body.classList.contains('motion-paused')) {
      raf = requestAnimationFrame(animate);
      return;
    }
    const t = now * .001;
    pointer.x += (pointer.tx - pointer.x) * .035;
    pointer.y += (pointer.ty - pointer.y) * .035;
    ctx.clearRect(0, 0, width, height);
    ctx.globalCompositeOperation = 'screen';
    drawWave(t, height * .28 + pointer.y * 12, 'rgba(138,99,255,0)', 'rgba(138,99,255,.10)', 36, .34);
    drawWave(t, height * .54 - pointer.y * 10, 'rgba(39,242,255,0)', 'rgba(39,242,255,.08)', 42, .24);
    drawWave(t, height * .82, 'rgba(201,168,76,0)', 'rgba(201,168,76,.07)', 28, .28);
    particles.forEach((particle) => {
      const px = particle.x + Math.sin(t * particle.s + particle.phase) * 28 + pointer.x * 10;
      const py = particle.y + Math.cos(t * particle.s * .8 + particle.phase) * 18 + pointer.y * 8;
      ctx.beginPath();
      ctx.arc(px, py, particle.r, 0, Math.PI * 2);
      ctx.fillStyle = `${particle.color}${particle.a})`;
      ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';
    raf = requestAnimationFrame(animate);
  }

  function onPointerMove(event) {
    pointer.tx = (event.clientX / Math.max(width, 1) - .5) * 2;
    pointer.ty = (event.clientY / Math.max(height, 1) - .5) * 2;
  }

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', onPointerMove, { passive: true });
  raf = requestAnimationFrame(animate);

  return () => {
    if (raf) cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    window.removeEventListener('mousemove', onPointerMove);
  };
}


(function(){
  if(window.__mcpSkyeSolLivingBackgroundMounted) return;
  window.__mcpSkyeSolLivingBackgroundMounted = true;
  function boot(){
    if(typeof mountSkyeSolLivingBackground === 'function') mountSkyeSolLivingBackground();
  }
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', boot, { once: true })
    : boot();
})();
// END quantumskyes:skyesol-living-background-js

// BEGIN quantumskyes:neon-motion-chrome-vanilla-js
(function(){
  if(window.__mcpNeonMotionChrome) return;
  window.__mcpNeonMotionChrome = true;
  function ready(fn){ document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn, { once: true }) : fn(); }
  ready(function(){
    if(!document.querySelector('.neon-scroll-progress')){
      const progress = document.createElement('i');
      progress.className = 'neon-scroll-progress';
      progress.setAttribute('aria-hidden', 'true');
      document.body.append(progress);
      const update = function(){
        const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        progress.style.transform = 'scaleX(' + Math.min(1, Math.max(0, window.scrollY / max)) + ')';
      };
      window.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', update, { passive: true });
      update();
    }
    if(!document.querySelector('.neon-cursor-trail') && matchMedia('(pointer:fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches){
      const glow = document.createElement('div');
      glow.className = 'neon-cursor-trail';
      glow.setAttribute('aria-hidden', 'true');
      document.body.append(glow);
      window.addEventListener('pointermove', function(event){
        glow.style.transform = 'translate3d(' + (event.clientX - 150) + 'px,' + (event.clientY - 150) + 'px,0)';
      }, { passive: true });
    }
  });
})();
// END quantumskyes:neon-motion-chrome-vanilla-js
