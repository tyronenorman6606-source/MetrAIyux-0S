(function skyeIdBridge(global) {
  'use strict';

  const CURRENT_IDENTITY_KEY = 'skye0s.identity.current.v1';
  const REGISTRY_KEY = 'skye0s.identity.registry.v1';
  const EMAIL_DRAFT_KEY = 'kx.onboarding.emailDraft';
  const LEGACY_DRAFT_KEY = 'kx.onboarding.idDraft';
  const MAX_PHOTO_CHARS = 1800000;

  function parseJson(value, fallback) {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  function readStorage(key, fallback) {
    try {
      return parseJson(global.localStorage && global.localStorage.getItem(key), fallback);
    } catch {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      if (!global.localStorage) return false;
      global.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  function cleanString(value, limit) {
    return String(value == null ? '' : value).trim().slice(0, limit || 240);
  }

  function normalizeEmail(value) {
    const email = cleanString(value, 180).toLowerCase();
    return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
  }

  function normalizeSkyeId(value) {
    const raw = cleanString(value, 80);
    if (!raw) return '';
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 10) return digits;
    return raw.replace(/[^\w-]/g, '').slice(0, 64);
  }

  function normalizePhotoDataUrl(value) {
    const dataUrl = cleanString(value, MAX_PHOTO_CHARS + 20);
    if (!dataUrl || !dataUrl.startsWith('data:image/')) return '';
    return dataUrl.length <= MAX_PHOTO_CHARS ? dataUrl : '';
  }

  function readCurrentEmailDraft() {
    const draft = readStorage(EMAIL_DRAFT_KEY, null) || readStorage('skye0s.skyemail.claim.v1', null) || readStorage('SMV_ONBOARDING_CLAIM', null);
    if (!draft || typeof draft !== 'object') return null;
    const mailbox = draft.mailbox && typeof draft.mailbox === 'object' ? draft.mailbox : {};
    const email = normalizeEmail(draft.email || mailbox.requested_email || (mailbox.local_part && mailbox.domain ? `${mailbox.local_part}@${mailbox.domain}` : ''));
    if (!email) return null;
    return {
      schema: 'skye0s.skyemail.draft.v1',
      email,
      prefix: cleanString(draft.prefix || mailbox.local_part || email.split('@')[0], 120),
      domain: cleanString(draft.domain || mailbox.domain || email.split('@').slice(1).join('@'), 180),
      displayName: cleanString(draft.displayName || draft.profile?.display_name, 180),
      source: cleanString(draft.source || 'SkyEmail', 80),
      updatedAt: cleanString(draft.updatedAt || new Date().toISOString(), 40)
    };
  }

  function normalizeIdentity(input, reason) {
    const source = input && typeof input === 'object' ? input : {};
    const emailDraft = source.email ? null : readCurrentEmailDraft();
    const idNumber = normalizeSkyeId(source.idNumber || source.number || source.skyeId || source.id || source.identityId);
    const skyeId = normalizeSkyeId(source.skyeId || idNumber || source.identityId);
    const photoObject = source.profilePhoto && typeof source.profilePhoto === 'object' ? source.profilePhoto : {};
    const photoDataUrl = normalizePhotoDataUrl(source.photoDataUrl || source.photo || photoObject.dataUrl || photoObject.photoDataUrl);
    const name = cleanString(source.name || source.displayName || source.artistName, 180);
    return {
      schema: 'skye0s.identity.v1',
      identityId: cleanString(source.identityId || skyeId || idNumber || source.email, 80),
      skyeId,
      idNumber: idNumber || skyeId,
      name,
      displayName: name,
      email: normalizeEmail(source.email) || (emailDraft ? emailDraft.email : ''),
      emailPrefix: cleanString(source.emailPrefix || (emailDraft && emailDraft.prefix), 120),
      emailDomain: cleanString(source.emailDomain || (emailDraft && emailDraft.domain), 180),
      profileType: cleanString(source.profileType || 'artist', 48),
      photoDataUrl,
      photoName: cleanString(source.photoName || photoObject.name, 180),
      photoType: cleanString(source.photoType || photoObject.type, 80),
      photoUpdatedAt: cleanString(source.photoUpdatedAt || photoObject.updatedAt, 40),
      source: cleanString(source.source || 'Skye-ID', 80),
      reason: cleanString(reason || source.reason || 'update', 80),
      updatedAt: new Date().toISOString()
    };
  }

  function readCurrentIdentity() {
    const current = readStorage(CURRENT_IDENTITY_KEY, null) || readStorage(LEGACY_DRAFT_KEY, null);
    if (current) return normalizeIdentity(current);
    const emailDraft = readCurrentEmailDraft();
    return emailDraft ? normalizeIdentity({ email: emailDraft.email, source: emailDraft.source, profileType: 'artist' }) : null;
  }

  function upsertRegistry(identity) {
    const key = identity.identityId || identity.skyeId || identity.idNumber || identity.email;
    if (!key) return [];
    const registry = readStorage(REGISTRY_KEY, []);
    const list = Array.isArray(registry) ? registry : [];
    const next = [identity, ...list.filter((item) => {
      const itemKey = item && (item.identityId || item.skyeId || item.idNumber || item.email);
      return itemKey !== key;
    })].slice(0, 50);
    writeStorage(REGISTRY_KEY, next);
    return next;
  }

  function publishIdentity(input, reason) {
    const identity = normalizeIdentity(input, reason);
    writeStorage(CURRENT_IDENTITY_KEY, identity);
    writeStorage(LEGACY_DRAFT_KEY, identity);
    if (identity.email) {
      writeStorage(EMAIL_DRAFT_KEY, {
        email: identity.email,
        prefix: identity.emailPrefix || identity.email.split('@')[0],
        domain: identity.emailDomain || identity.email.split('@').slice(1).join('@'),
        source: 'SkyeIDBridge',
        updatedAt: identity.updatedAt
      });
    }
    upsertRegistry(identity);
    try {
      global.dispatchEvent(new CustomEvent('skye0s:identity-updated', { detail: identity }));
    } catch {}
    return identity;
  }

  function applyToArtistForm(form) {
    const identity = readCurrentIdentity();
    if (!form || !identity) return identity;
    if (form.elements.name && !form.elements.name.value && identity.name) form.elements.name.value = identity.name;
    if (form.elements.email && !form.elements.email.value && identity.email) form.elements.email.value = identity.email;
    if (form.elements.skyeId && !form.elements.skyeId.value) form.elements.skyeId.value = identity.skyeId || identity.idNumber || '';
    if (form.elements.identityId) form.elements.identityId.value = identity.identityId || identity.skyeId || identity.idNumber || '';
    const preview = form.querySelector('[data-skye-id-photo-preview]');
    if (preview && identity.photoDataUrl) {
      preview.src = identity.photoDataUrl;
      preview.hidden = false;
    }
    const meta = form.querySelector('[data-skye-id-photo-meta]');
    if (meta) meta.textContent = identity.photoDataUrl ? 'Skye ID photo linked.' : 'No Skye ID photo linked yet.';
    return identity;
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('Photo read failed'));
      reader.readAsDataURL(file);
    });
  }

  async function fileToIdentityPhoto(file) {
    if (!file || !file.size) return null;
    if (!String(file.type || '').startsWith('image/')) throw new Error('Choose an image file for the artist photo.');
    const dataUrl = await readFileAsDataUrl(file);
    return {
      dataUrl: normalizePhotoDataUrl(dataUrl),
      name: cleanString(file.name, 180),
      type: cleanString(file.type, 80),
      originalBytes: file.size
    };
  }

  global.SkyeIDBridge = {
    applyToArtistForm,
    fileToIdentityPhoto,
    normalizeIdentity,
    publishIdentity,
    readCurrentEmailDraft,
    readCurrentIdentity
  };
})(window);
