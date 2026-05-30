(function skyeIdBridge(global) {
  'use strict';

  const LEGACY_DRAFT_KEY = 'kx.onboarding.idDraft';
  const EMAIL_DRAFT_KEY = 'kx.onboarding.emailDraft';
  const EMAIL_CLAIM_KEYS = ['skye0s.skyemail.claim.v1', 'SMV_ONBOARDING_CLAIM', EMAIL_DRAFT_KEY];
  const CURRENT_IDENTITY_KEY = 'skye0s.identity.current.v1';
  const REGISTRY_KEY = 'skye0s.identity.registry.v1';
  const MAX_PHOTO_CHARS = 1800000;
  const MAX_SOURCE_IMAGE_BYTES = 12 * 1024 * 1024;

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
    if (!global.localStorage) return false;
    global.localStorage.setItem(key, JSON.stringify(value));
    return true;
  }

  function cleanString(value, limit) {
    return String(value == null ? '' : value).trim().slice(0, limit || 240);
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
    if (dataUrl.length > MAX_PHOTO_CHARS) return '';
    return dataUrl;
  }

  function normalizeEmail(value) {
    const email = cleanString(value, 180).toLowerCase();
    return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
  }

  function normalizeEmailDraft(input) {
    const source = input && typeof input === 'object' ? input : {};
    const mailbox = source.mailbox && typeof source.mailbox === 'object' ? source.mailbox : {};
    const profile = source.profile && typeof source.profile === 'object' ? source.profile : {};
    const email = normalizeEmail(
      source.email ||
      mailbox.requested_email ||
      (mailbox.local_part && mailbox.domain ? `${mailbox.local_part}@${mailbox.domain}` : '')
    );
    if (!email) return null;
    const parts = email.split('@');
    return {
      schema: 'skye0s.skyemail.draft.v1',
      email,
      prefix: cleanString(source.prefix || mailbox.local_part || parts[0], 120),
      domain: cleanString(source.domain || mailbox.domain || parts.slice(1).join('@'), 180),
      displayName: cleanString(source.displayName || profile.display_name, 180),
      source: cleanString(source.source || 'SkyEmail', 80),
      reason: cleanString(source.reason || 'email-draft', 80),
      updatedAt: cleanString(source.updatedAt || new Date().toISOString(), 40),
    };
  }

  function readCurrentEmailDraft() {
    for (const key of EMAIL_CLAIM_KEYS) {
      const draft = normalizeEmailDraft(readStorage(key, null));
      if (draft) return draft;
    }
    return null;
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
      identityId: cleanString(source.identityId || skyeId || idNumber, 80),
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
      emailSource: cleanString(source.emailSource || (emailDraft && emailDraft.source), 80),
      reason: cleanString(reason || source.reason || 'update', 80),
      updatedAt: new Date().toISOString(),
    };
  }

  function readCurrentIdentity() {
    const current = readStorage(CURRENT_IDENTITY_KEY, null);
    if (current) return normalizeIdentity(current);
    const legacy = readStorage(LEGACY_DRAFT_KEY, null);
    if (legacy) return normalizeIdentity(legacy);
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
    const legacy = {
      name: identity.name,
      idNumber: identity.idNumber || identity.skyeId,
      skyeId: identity.skyeId || identity.idNumber,
      identityId: identity.identityId,
      email: identity.email,
      profileType: identity.profileType,
      photoDataUrl: identity.photoDataUrl,
      photoName: identity.photoName,
      photoType: identity.photoType,
      source: identity.source,
      reason: identity.reason,
      updatedAt: identity.updatedAt,
    };
    try {
      writeStorage(LEGACY_DRAFT_KEY, legacy);
      writeStorage(CURRENT_IDENTITY_KEY, identity);
      if (identity.email) {
        writeStorage(EMAIL_DRAFT_KEY, {
          email: identity.email,
          prefix: identity.emailPrefix || identity.email.split('@')[0],
          domain: identity.emailDomain || identity.email.split('@').slice(1).join('@'),
          source: identity.emailSource || 'SkyeIDBridge',
          reason: identity.reason || 'identity-publish',
          updatedAt: identity.updatedAt,
        });
      }
      upsertRegistry(identity);
    } catch (err) {
      console.warn('SkyeIDBridge could not persist identity locally', err);
    }
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

  function loadImage(dataUrl) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Photo could not be decoded'));
      image.src = dataUrl;
    });
  }

  async function fileToIdentityPhoto(file, options) {
    const opts = options || {};
    if (!file || !file.size) return null;
    if (!String(file.type || '').startsWith('image/')) throw new Error('Choose an image file for the artist photo.');
    if (file.size > (opts.maxSourceBytes || MAX_SOURCE_IMAGE_BYTES)) {
      throw new Error('Artist photo is too large. Use an image under 12MB.');
    }
    const originalDataUrl = await readFileAsDataUrl(file);
    if (!global.document || !global.document.createElement) {
      return { dataUrl: normalizePhotoDataUrl(originalDataUrl), name: file.name, type: file.type, originalBytes: file.size };
    }
    const image = await loadImage(originalDataUrl);
    const maxDimension = Number(opts.maxDimension || 720);
    const ratio = Math.min(1, maxDimension / Math.max(image.width || maxDimension, image.height || maxDimension));
    const width = Math.max(1, Math.round((image.width || maxDimension) * ratio));
    const height = Math.max(1, Math.round((image.height || maxDimension) * ratio));
    const canvas = global.document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0, width, height);
    let quality = Number(opts.quality || 0.84);
    let dataUrl = canvas.toDataURL('image/jpeg', quality);
    while (dataUrl.length > MAX_PHOTO_CHARS && quality > 0.48) {
      quality -= 0.08;
      dataUrl = canvas.toDataURL('image/jpeg', quality);
    }
    if (dataUrl.length > MAX_PHOTO_CHARS) throw new Error('Artist photo could not be compressed enough for cross-app identity storage.');
    return {
      dataUrl,
      name: file.name || 'artist-photo.jpg',
      type: 'image/jpeg',
      originalBytes: file.size,
      width,
      height,
      updatedAt: new Date().toISOString(),
    };
  }

  global.SkyeIDBridge = {
    keys: { LEGACY_DRAFT_KEY, EMAIL_DRAFT_KEY, CURRENT_IDENTITY_KEY, REGISTRY_KEY },
    maxPhotoChars: MAX_PHOTO_CHARS,
    normalizeIdentity,
    normalizeEmailDraft,
    normalizeSkyeId,
    publishIdentity,
    readCurrentIdentity,
    readCurrentEmailDraft,
    applyToArtistForm,
    fileToIdentityPhoto,
  };
})(window);
