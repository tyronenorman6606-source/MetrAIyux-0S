(function () {
  const MARKER = 'SKYESEC2';
  const SCHEMA = 'skye.secure.secret-pack.v2';
  const FORMAT = 'skye-secure-secret-pack-v2';
  const textEncoder = new TextEncoder();
  const textDecoder = new TextDecoder();
  const state = {
    file: null,
    pack: null,
    payload: null,
    receipt: null,
    createdPack: null,
    objectUrls: []
  };

  const el = {
    sourceFiles: document.getElementById('sourceFiles'),
    createRecipientId: document.getElementById('createRecipientId'),
    createWorkspace: document.getElementById('createWorkspace'),
    createPassphrase: document.getElementById('createPassphrase'),
    createPepper: document.getElementById('createPepper'),
    createPassphraseHint: document.getElementById('createPassphraseHint'),
    createRepo: document.getElementById('createRepo'),
    createProject: document.getElementById('createProject'),
    createClient: document.getElementById('createClient'),
    createPackButton: document.getElementById('createPackButton'),
    createReceipt: document.getElementById('createReceipt'),
    packFile: document.getElementById('packFile'),
    inspectButton: document.getElementById('inspectButton'),
    clearButton: document.getElementById('clearButton'),
    unlockButton: document.getElementById('unlockButton'),
    receiptButton: document.getElementById('receiptButton'),
    recipientId: document.getElementById('recipientId'),
    passphrase: document.getElementById('passphrase'),
    pepper: document.getElementById('pepper'),
    message: document.getElementById('packMessage'),
    handoffTitle: document.getElementById('handoffTitle'),
    handoffDetail: document.getElementById('handoffDetail'),
    summary: document.getElementById('summary'),
    recipients: document.getElementById('recipients'),
    files: document.getElementById('files')
  };

  const handoffParams = new URLSearchParams(window.location.search);
  state.expectedSha256 = String(handoffParams.get('sha256') || '').trim().toLowerCase();
  state.expectedFileName = String(handoffParams.get('file') || '').trim();
  state.expectedReceipt = String(handoffParams.get('receipt') || '').trim();
  state.expectedPackId = String(handoffParams.get('pack') || '').trim();

  function showMessage(text, kind = '') {
    el.message.hidden = false;
    el.message.className = `unlock-message${kind ? ` ${kind}` : ''}`;
    el.message.textContent = text;
  }

  function clearMessage() {
    el.message.hidden = true;
    el.message.textContent = '';
  }

  function renderVaultHandoffContext() {
    const contextParts = [];
    if (state.expectedFileName) contextParts.push(`file ${state.expectedFileName}`);
    if (state.expectedReceipt) contextParts.push(`receipt ${state.expectedReceipt}`);
    if (state.expectedPackId) contextParts.push(`pack ${state.expectedPackId}`);
    if (!contextParts.length || !el.handoffTitle || !el.handoffDetail) return;
    el.handoffTitle.textContent = `Open ${state.expectedFileName || state.expectedPackId || 'the downloaded secure pack'}`;
    el.handoffDetail.textContent = `SkyeVault handed you ${contextParts.join(' / ')}. Choose that downloaded .skyesecrets file here, inspect it, then use the matching recipient passphrase and pepper from the sender handoff.`;
  }

  function currentUnlockUrl(packId = '', sha256 = '') {
    const url = new URL(window.location.href);
    url.search = '';
    if (packId) {
      url.searchParams.set('pack', packId);
      url.searchParams.set('file', `${packId}.skyesecrets`);
    }
    if (sha256) url.searchParams.set('sha256', sha256);
    return url.toString();
  }

  function downloadBlob(name, content, type = 'application/json') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    state.objectUrls.push(url);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
  }

  async function copyText(text) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.append(textarea);
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
  }

  function revokeObjectUrls() {
    for (const url of state.objectUrls) URL.revokeObjectURL(url);
    state.objectUrls = [];
  }

  function base64ToBytes(value) {
    const binary = atob(String(value || ''));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }

  function bytesToBase64(bytes) {
    let binary = '';
    const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
      binary += String.fromCharCode(...bytes.slice(offset, offset + chunkSize));
    }
    return btoa(binary);
  }

  function bytesToHex(bytes) {
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  async function sha256Bytes(bytes) {
    return bytesToHex(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)));
  }

  async function sha256Text(text) {
    return sha256Bytes(textEncoder.encode(String(text)));
  }

  function stableValue(value) {
    if (Array.isArray(value)) return value.map((item) => stableValue(item));
    if (!value || typeof value !== 'object') return value;
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }

  function stableJson(value) {
    return JSON.stringify(stableValue(value));
  }

  function concatBytes(left, right) {
    const out = new Uint8Array(left.length + right.length);
    out.set(left, 0);
    out.set(right, left.length);
    return out;
  }

  function randomBytes(size) {
    const bytes = new Uint8Array(size);
    crypto.getRandomValues(bytes);
    return bytes;
  }

  function uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    const bytes = randomBytes(16);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = bytesToHex(bytes);
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  function normalizeRelativePath(input) {
    const clean = String(input || '').replace(/\\/g, '/').replace(/^\/+/, '').trim();
    const parts = clean.split('/').filter((part) => part && part !== '.');
    if (!parts.length || parts.some((part) => part === '..' || part.includes('\0'))) {
      throw new Error(`Unsafe file path: ${input}`);
    }
    return parts.join('/');
  }

  function parsePackBytes(buffer) {
    const bytes = new Uint8Array(buffer);
    const marker = textEncoder.encode(MARKER);
    let offset = 0;
    if (bytes.length > marker.length + 1 && marker.every((byte, index) => bytes[index] === byte) && bytes[marker.length] === 0) {
      offset = marker.length + 1;
    }
    return JSON.parse(textDecoder.decode(bytes.slice(offset)));
  }

  async function validatePack(pack) {
    if (!pack || pack.schema !== SCHEMA) throw new Error(`Unsupported pack schema: ${pack?.schema || 'unknown'}`);
    if (pack.marker !== MARKER || pack.format !== FORMAT || pack.encrypted !== true) throw new Error('Unsupported SkyeSecure pack format.');
    if (!pack.publicManifest || pack.publicManifest.format !== FORMAT) throw new Error('Invalid public manifest.');
    if (!Array.isArray(pack.wrappedKeys) || !pack.wrappedKeys.length) throw new Error('Pack has no wrapped keys.');
    if (!pack.encryptedPayload || pack.encryptedPayload.alg !== 'AES-256-GCM') throw new Error('Invalid encrypted payload.');
    const publicManifestSha256 = await sha256Text(stableJson(pack.publicManifest));
    if (pack.integrity?.publicManifestSha256 !== publicManifestSha256) throw new Error('Public manifest integrity check failed.');
    const cipherSha256 = await sha256Bytes(base64ToBytes(pack.encryptedPayload.cipher));
    if (pack.integrity?.encryptedPayloadSha256 !== cipherSha256 || pack.encryptedPayload.sha256 !== cipherSha256) {
      throw new Error('Encrypted payload integrity check failed.');
    }
    return { publicManifestSha256, encryptedPayloadSha256: cipherSha256 };
  }

  function selectPassphraseKey(pack, recipientId) {
    const keys = pack.wrappedKeys.filter((key) => key.type === 'passphrase');
    if (recipientId) {
      const match = keys.find((key) => key.recipientId === recipientId);
      if (!match) throw new Error(`No passphrase recipient named ${recipientId}.`);
      return match;
    }
    if (keys.length === 1) return keys[0];
    throw new Error('Enter a recipient ID for this multi-recipient pack.');
  }

  async function derivePassphraseKey(passphrase, pepper, wrappedKey, usages = ['decrypt']) {
    const material = `${String(passphrase || '')}\0skyesecure-pepper\0${String(pepper || '')}`;
    const baseKey = await crypto.subtle.importKey(
      'raw',
      textEncoder.encode(material),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        hash: 'SHA-256',
        salt: base64ToBytes(wrappedKey.salt),
        iterations: Number(wrappedKey.iterations)
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      usages
    );
  }

  async function importAesKey(bytes, usages) {
    return crypto.subtle.importKey('raw', bytes, { name: 'AES-GCM' }, false, usages);
  }

  async function encryptAesGcm(key, plainBytes, aad) {
    const iv = randomBytes(12);
    const encrypted = new Uint8Array(await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv,
        additionalData: textEncoder.encode(aad || ''),
        tagLength: 128
      },
      key,
      plainBytes
    ));
    const cipher = encrypted.slice(0, encrypted.length - 16);
    const tag = encrypted.slice(encrypted.length - 16);
    return {
      alg: 'AES-256-GCM',
      iv: bytesToBase64(iv),
      cipher: bytesToBase64(cipher),
      tag: bytesToBase64(tag),
      aad
    };
  }

  async function decryptAesGcm(key, block, aad) {
    const cipher = base64ToBytes(block.cipher);
    const tag = base64ToBytes(block.tag);
    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: base64ToBytes(block.iv),
        additionalData: textEncoder.encode(aad || block.aad || ''),
        tagLength: 128
      },
      key,
      concatBytes(cipher, tag)
    );
    return new Uint8Array(decrypted);
  }

  async function unlockPayload(pack) {
    const recipientId = el.recipientId.value.trim();
    const passphrase = el.passphrase.value;
    const pepper = el.pepper.value;
    if (!passphrase) throw new Error('Passphrase is required.');
    const wrappedKey = selectPassphraseKey(pack, recipientId);
    const wrapKey = await derivePassphraseKey(passphrase, pepper, wrappedKey);
    const contentKeyBytes = await decryptAesGcm(
      wrapKey,
      wrappedKey.encryptedKey,
      `${MARKER}|wrap|${pack.publicManifest.packId}|${wrappedKey.recipientId}`
    );
    const contentKey = await importAesKey(contentKeyBytes, ['decrypt']);
    const payloadBytes = await decryptAesGcm(
      contentKey,
      pack.encryptedPayload,
      `${MARKER}|payload|${pack.publicManifest.packId}`
    );
    const payload = JSON.parse(textDecoder.decode(payloadBytes));
    await validatePayload(payload);
    return { payload, recipientId: wrappedKey.recipientId };
  }

  function safeDownloadName(filePath) {
    const name = String(filePath || 'secret-file').split('/').filter(Boolean).at(-1) || 'secret-file';
    return name.replace(/[^A-Za-z0-9._-]+/g, '-');
  }

  async function fileToPayloadItem(file) {
    const rawPath = file.webkitRelativePath || file.name;
    const itemPath = normalizeRelativePath(rawPath);
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.length > 50 * 1024 * 1024) throw new Error(`File exceeds 50MB pack limit: ${itemPath}`);
    return {
      path: itemPath,
      type: 'file',
      mode: '600',
      size: bytes.length,
      mtime: new Date(file.lastModified || Date.now()).toISOString(),
      sha256: await sha256Bytes(bytes),
      dataBase64: bytesToBase64(bytes)
    };
  }

  async function buildBrowserPack() {
    const files = Array.from(el.sourceFiles.files || []);
    if (!files.length) throw new Error('Select at least one source file.');
    const passphrase = el.createPassphrase.value;
    if (!passphrase) throw new Error('Create passphrase is required.');
    const recipientId = normalizeRelativePath(el.createRecipientId.value || 'owner').replace(/\//g, '-');
    const createdAt = new Date().toISOString();
    const packId = `skyesec_${uuid()}`;
    const payloadFiles = [];
    for (const file of files) payloadFiles.push(await fileToPayloadItem(file));
    payloadFiles.sort((a, b) => a.path.localeCompare(b.path));
    const plaintextBytes = payloadFiles.reduce((sum, item) => sum + item.size, 0);
    const payload = {
      schema: 'skye.secure.secret-payload.v2',
      createdAt,
      rootHint: 'browser-selected-files',
      host: navigator.userAgent,
      files: payloadFiles,
      restorePolicy: {
        defaultOverwrite: false,
        refusePathTraversal: true,
        requireExplicitForceForOverwrite: true,
        product: 'SkyeSecure Secret Packs'
      },
      sourceBoundary: null,
      missingAtPackTime: [],
      skippedAtPackTime: []
    };
    const payloadBytes = textEncoder.encode(stableJson(payload));
    const contentKeyBytes = randomBytes(32);
    const contentKey = await importAesKey(contentKeyBytes, ['encrypt', 'decrypt']);
    const encryptedPayload = await encryptAesGcm(contentKey, payloadBytes, `${MARKER}|payload|${packId}`);
    const cipherBytes = base64ToBytes(encryptedPayload.cipher);
    encryptedPayload.bytes = cipherBytes.length;
    encryptedPayload.sha256 = await sha256Bytes(cipherBytes);

    const salt = randomBytes(32);
    const passphraseHint = el.createPassphraseHint.value.trim();
    const pepperRequired = Boolean(el.createPepper.value);
    const wrappedKey = {
      type: 'passphrase',
      recipientId,
      hint: passphraseHint,
      kdf: 'PBKDF2-SHA256',
      iterations: 310000,
      salt: bytesToBase64(salt),
      pepperRequired,
      encryptedKey: null
    };
    const wrapKey = await derivePassphraseKey(passphrase, el.createPepper.value, wrappedKey, ['encrypt', 'decrypt']);
    wrappedKey.encryptedKey = await encryptAesGcm(wrapKey, contentKeyBytes, `${MARKER}|wrap|${packId}|${recipientId}`);

    const publicManifest = {
      schema: 'skye.secure.secret-pack-public-manifest.v2',
      packId,
      format: FORMAT,
      createdAt,
      updatedAt: createdAt,
      product: 'SkyeSecure Secret Packs',
      workspaceId: el.createWorkspace.value.trim(),
      repoId: el.createRepo.value.trim(),
      clientName: el.createClient.value.trim(),
      projectName: el.createProject.value.trim(),
      assetType: 'Encrypted developer secret pack',
      fileCount: payloadFiles.length,
      plaintextBytes,
      encryptedBytes: encryptedPayload.bytes,
      sourceBoundarySha256: await sha256Text(payloadFiles.map((item) => item.path).join('\n')),
      sourceBoundaryRef: 'browser-selected-files',
      restoreRootHint: 'browser-selected-files',
      algorithm: {
        payload: 'AES-256-GCM',
        passphraseKdf: 'PBKDF2-SHA256',
        publicKeyWrap: 'X25519-HKDF-SHA256'
      },
      notes: 'Created locally in the SkyeSecure browser console. No upload route was used.',
      unlockHandoff: {
        route: 'skye-secure-secret-packs/app.html',
        recipientId,
        passphraseRequired: true,
        pepperRequired,
        passphraseHint,
        rule: 'The passphrase and pepper are not stored in the encrypted pack. Share them through a separate approved handoff.'
      }
    };
    const pack = {
      schema: SCHEMA,
      marker: MARKER,
      format: FORMAT,
      encrypted: true,
      publicManifest,
      encryptedPayload,
      wrappedKeys: [wrappedKey],
      integrity: {
        publicManifestSha256: await sha256Text(stableJson(publicManifest)),
        encryptedPayloadSha256: encryptedPayload.sha256,
        wrappedKeyCount: 1
      }
    };
    await validatePack(pack);
    const serialized = `${MARKER}\0${JSON.stringify(pack, null, 2)}\n`;
    return {
      pack,
      bytes: textEncoder.encode(serialized),
      receipt: {
        schema: 'skye.secure.browser-create-receipt.v2',
        generatedAt: new Date().toISOString(),
        packId,
        recipientId,
        passphraseHint,
        pepperRequired,
        fileCount: payloadFiles.length,
        plaintextBytes,
        files: payloadFiles.map((item) => ({ path: item.path, size: item.size, sha256: item.sha256 }))
      }
    };
  }

  async function validatePayload(payload) {
    if (!payload || payload.schema !== 'skye.secure.secret-payload.v2') throw new Error('Unsupported secret payload schema.');
    if (!Array.isArray(payload.files)) throw new Error('Secret payload file list missing.');
    for (const item of payload.files) {
      if (item.type !== 'file') throw new Error(`Unsupported payload item: ${item.path}`);
      const bytes = base64ToBytes(item.dataBase64);
      const sha = await sha256Bytes(bytes);
      if (sha !== item.sha256) throw new Error(`File hash mismatch: ${item.path}`);
      if (bytes.length !== Number(item.size)) throw new Error(`File size mismatch: ${item.path}`);
    }
  }

  function metric(label, value) {
    const div = document.createElement('div');
    div.className = 'unlock-metric';
    const b = document.createElement('b');
    b.textContent = String(value || '');
    const span = document.createElement('span');
    span.textContent = label;
    div.append(b, span);
    return div;
  }

  function renderSummary(pack, fileSha256 = '') {
    const manifest = pack.publicManifest;
    el.summary.replaceChildren(
      metric('Pack ID', manifest.packId),
      metric('Files', manifest.fileCount),
      metric('Plaintext bytes', manifest.plaintextBytes),
      metric('Encrypted bytes', manifest.encryptedBytes),
      metric('Workspace', manifest.workspaceId || 'unlabeled'),
      metric('Repo', manifest.repoId || 'unlabeled'),
      metric('Project', manifest.projectName || 'unlabeled'),
      metric('Pack SHA-256', fileSha256 ? fileSha256.slice(0, 24) : 'pending')
    );
    el.recipients.replaceChildren(...pack.wrappedKeys.map((key) => {
      const label = key.type === 'passphrase'
        ? `${key.type}${key.pepperRequired ? ' + pepper' : ''}`
        : key.type;
      const hint = key.hint ? ` · hint: ${key.hint}` : '';
      return metric(key.recipientId, `${label}${hint}`);
    }));
  }

  function renderCreateReceipt(receipt, packSha256) {
    const actions = document.createElement('div');
    actions.className = 'unlock-actions';
    actions.style.gridColumn = '1 / -1';
    const safeHandoff = document.createElement('button');
    safeHandoff.className = 'unlock-button';
    safeHandoff.type = 'button';
    safeHandoff.textContent = 'Download Safe Handoff';
    safeHandoff.addEventListener('click', downloadSafeHandoff);
    const privateHandoff = document.createElement('button');
    privateHandoff.className = 'unlock-button primary';
    privateHandoff.type = 'button';
    privateHandoff.textContent = 'Copy Private Unlock Note';
    privateHandoff.addEventListener('click', copyPrivateUnlockNote);
    actions.append(safeHandoff, privateHandoff);
    el.createReceipt.replaceChildren(
      metric('Pack ID', receipt.packId),
      metric('Files', receipt.fileCount),
      metric('Plaintext bytes', receipt.plaintextBytes),
      metric('Recipient', receipt.recipientId),
      metric('Pepper required', receipt.pepperRequired ? 'Yes' : 'No'),
      metric('Passphrase hint', receipt.passphraseHint || 'none'),
      metric('Pack SHA-256', packSha256.slice(0, 24)),
      metric('Created', receipt.generatedAt),
      actions
    );
  }

  function safeHandoffPayload() {
    if (!state.createdPack) throw new Error('Create a pack before exporting handoff details.');
    const { pack, receipt, packSha256 } = state.createdPack;
    return {
      schema: 'skye.secure.safe-handoff.v1',
      generatedAt: new Date().toISOString(),
      packId: receipt.packId,
      fileName: `${receipt.packId}.skyesecrets`,
      packSha256,
      unlockUrl: currentUnlockUrl(receipt.packId, packSha256),
      recipientId: receipt.recipientId,
      passphraseHint: receipt.passphraseHint || '',
      pepperRequired: Boolean(receipt.pepperRequired),
      publicManifest: pack.publicManifest,
      instructions: [
        'Send the .skyesecrets file and this safe handoff together.',
        'Send the passphrase and pepper through a separate approved channel.',
        'The receiver opens the unlockUrl, chooses the .skyesecrets file, inspects the pack, and unlocks with the recipient ID plus private unlock details.'
      ],
      secretValuesIncluded: false
    };
  }

  function downloadSafeHandoff() {
    try {
      const payload = safeHandoffPayload();
      downloadBlob(`skyesecure-safe-handoff-${payload.packId}.json`, `${JSON.stringify(payload, null, 2)}\n`);
      showMessage('Safe handoff downloaded. It does not include the passphrase or pepper.', 'success');
    } catch (error) {
      showMessage(error.message, 'error');
    }
  }

  async function copyPrivateUnlockNote() {
    try {
      if (!state.createdPack) throw new Error('Create a pack before copying private unlock details.');
      const { receipt, packSha256, privateHandoff } = state.createdPack;
      const lines = [
        'SkyeSecure private unlock details',
        `Pack file: ${receipt.packId}.skyesecrets`,
        `Pack ID: ${receipt.packId}`,
        `Pack SHA-256: ${packSha256}`,
        `Unlock URL: ${currentUnlockUrl(receipt.packId, packSha256)}`,
        `Recipient ID: ${receipt.recipientId}`,
        `Passphrase: ${privateHandoff.passphrase}`,
        `Pepper: ${privateHandoff.pepper || '(none)'}`,
        `Passphrase hint: ${receipt.passphraseHint || '(none)'}`,
        '',
        'Keep this note separate from the .skyesecrets file. Anyone with both can decrypt the pack.'
      ];
      await copyText(lines.join('\n'));
      showMessage('Private unlock note copied to clipboard. It includes the passphrase; share it only through the approved channel.', 'success');
    } catch (error) {
      showMessage(error.message, 'error');
    }
  }

  // Minimal ZIP builder — STORE method, no external libs required.
  function buildZip(files) {
    const enc = new TextEncoder();

    function join(...arrays) {
      const total = arrays.reduce((sum, a) => sum + a.length, 0);
      const out = new Uint8Array(total);
      let pos = 0;
      for (const a of arrays) { out.set(a, pos); pos += a.length; }
      return out;
    }
    function u16(n) { const b = new Uint8Array(2); new DataView(b.buffer).setUint16(0, n, true); return b; }
    function u32(n) { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, n, true); return b; }
    function crc32(data) {
      let c = 0xFFFFFFFF;
      for (const b of data) { c ^= b; for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (c & 1 ? 0xEDB88320 : 0); }
      return (c ^ 0xFFFFFFFF) >>> 0;
    }

    const Z2 = new Uint8Array(2);
    const Z4 = new Uint8Array(4);
    const localParts = [];
    const cdParts = [];
    let offset = 0;

    for (const { path, bytes } of files) {
      const name = enc.encode(path);
      const crc = crc32(bytes);
      const sz = bytes.length;

      const local = join(
        new Uint8Array([0x50, 0x4B, 0x03, 0x04]), // local file header sig
        new Uint8Array([0x14, 0x00]),              // version needed
        Z2, Z2, Z2, Z2,                            // flags, compression, mod-time, mod-date
        u32(crc), u32(sz), u32(sz),                // crc, compressed-size, uncompressed-size
        u16(name.length), Z2,                      // filename-len, extra-len
        name, bytes
      );

      const central = join(
        new Uint8Array([0x50, 0x4B, 0x01, 0x02]), // central dir sig
        new Uint8Array([0x14, 0x00]),              // version made by
        new Uint8Array([0x14, 0x00]),              // version needed
        Z2, Z2, Z2, Z2,                            // flags, compression, mod-time, mod-date
        u32(crc), u32(sz), u32(sz),                // crc, compressed-size, uncompressed-size
        u16(name.length), Z2, Z2,                  // filename-len, extra-len, comment-len
        Z2, Z2, Z4,                                // disk-start, int-attrs, ext-attrs
        u32(offset),                               // local header offset
        name
      );

      localParts.push(local);
      cdParts.push(central);
      offset += local.length;
    }

    const cdData = join(...cdParts);
    const eocd = join(
      new Uint8Array([0x50, 0x4B, 0x05, 0x06]), // end-of-central-dir sig
      Z2, Z2,                                    // disk number, disk with cd
      u16(files.length), u16(files.length),      // entries on disk, total entries
      u32(cdData.length), u32(offset),           // cd size, cd offset
      Z2                                         // comment length
    );

    return join(...localParts, cdData, eocd);
  }

  function downloadAllAsZip(payload) {
    const packId = state.pack?.publicManifest?.packId || 'restored';
    const zipName = `${packId.replace(/^skyesec_/, '')}-restored.zip`;
    const entries = payload.files.map((item) => ({ path: item.path, bytes: base64ToBytes(item.dataBase64) }));
    const zipBytes = buildZip(entries);
    const blob = new Blob([zipBytes], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    state.objectUrls.push(url);
    const link = document.createElement('a');
    link.href = url;
    link.download = zipName;
    link.click();
  }

  function renderFiles(payload) {
    revokeObjectUrls();
    if (!payload?.files?.length) {
      el.files.innerHTML = '<div class="unlock-empty">No files in decrypted payload.</div>';
      return;
    }

    const actions = document.createElement('div');
    actions.className = 'unlock-actions';
    actions.style.marginBottom = '0.75rem';
    const dlAll = document.createElement('button');
    dlAll.className = 'unlock-button primary';
    dlAll.type = 'button';
    dlAll.textContent = `Download All (${payload.files.length} files)`;
    dlAll.addEventListener('click', () => downloadAllAsZip(payload));
    actions.append(dlAll);

    const wrap = document.createElement('div');
    wrap.className = 'unlock-table-wrap';
    const table = document.createElement('table');
    table.className = 'unlock-table';
    table.innerHTML = '<thead><tr><th>Path</th><th>Bytes</th><th>SHA-256</th><th>Restore</th></tr></thead>';
    const tbody = document.createElement('tbody');
    for (const item of payload.files) {
      const bytes = base64ToBytes(item.dataBase64);
      const blob = new Blob([bytes], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      state.objectUrls.push(url);
      const tr = document.createElement('tr');
      const pathCell = document.createElement('td');
      pathCell.textContent = item.path;
      const sizeCell = document.createElement('td');
      sizeCell.textContent = String(item.size);
      const shaCell = document.createElement('td');
      shaCell.textContent = item.sha256.slice(0, 24);
      const actionCell = document.createElement('td');
      const link = document.createElement('a');
      link.className = 'unlock-button';
      link.href = url;
      link.download = safeDownloadName(item.path);
      link.textContent = 'Download';
      actionCell.append(link);
      tr.append(pathCell, sizeCell, shaCell, actionCell);
      tbody.append(tr);
    }
    table.append(tbody);
    wrap.append(table);
    el.files.replaceChildren(actions, wrap);
  }

  function resetState() {
    revokeObjectUrls();
    state.file = null;
    state.pack = null;
    state.payload = null;
    state.receipt = null;
    state.createdPack = null;
    el.packFile.value = '';
    el.passphrase.value = '';
    el.pepper.value = '';
    el.recipientId.value = '';
    el.inspectButton.disabled = true;
    el.unlockButton.disabled = true;
    el.receiptButton.disabled = true;
    el.summary.innerHTML = '<div class="unlock-empty">No pack loaded.</div>';
    el.recipients.innerHTML = '<div class="unlock-empty">No recipients loaded.</div>';
    el.files.innerHTML = '<div class="unlock-empty">No decrypted payload.</div>';
    clearMessage();
  }

  async function createPackFromBrowser() {
    const built = await buildBrowserPack();
    const packSha256 = await sha256Bytes(built.bytes);
    state.createdPack = {
      ...built,
      packSha256,
      privateHandoff: {
        passphrase: el.createPassphrase.value,
        pepper: el.createPepper.value
      }
    };
    renderCreateReceipt(built.receipt, packSha256);
    const blob = new Blob([built.bytes], { type: 'application/vnd.skyesecure.secret-pack' });
    const url = URL.createObjectURL(blob);
    state.objectUrls.push(url);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${built.pack.publicManifest.packId}.skyesecrets`;
    link.click();
    showMessage(`Created encrypted pack ${built.pack.publicManifest.packId}. Download the safe handoff and copy the private unlock note before clearing this page.`, 'success');
  }

  async function inspectSelectedFile() {
    const file = state.file || el.packFile.files?.[0];
    if (!file) throw new Error('Select a .skyesecrets pack.');
    const buffer = await file.arrayBuffer();
    const fileSha256 = await sha256Bytes(new Uint8Array(buffer));
    if (state.expectedSha256 && state.expectedSha256 !== fileSha256.toLowerCase()) {
      throw new Error(`This file does not match the SkyeVault fingerprint. Expected ${state.expectedSha256.slice(0, 24)} but got ${fileSha256.slice(0, 24)}.`);
    }
    const pack = parsePackBytes(buffer);
    await validatePack(pack);
    const passphraseKeys = pack.wrappedKeys.filter((key) => key.type === 'passphrase');
    state.file = file;
    state.pack = pack;
    state.payload = null;
    state.receipt = null;
    el.unlockButton.disabled = !passphraseKeys.length;
    el.receiptButton.disabled = true;
    if (!el.recipientId.value && passphraseKeys.length === 1) {
      el.recipientId.value = passphraseKeys[0].recipientId;
    }
    renderSummary(pack, fileSha256);
    renderFiles(null);
    if (!passphraseKeys.length) {
      showMessage('Pack inspected, but it has no browser passphrase recipient. Use the operator CLI/public-key unlock lane or ask the sender for a passphrase-wrapped pack.', 'error');
      return;
    }
    const recipientSummary = passphraseKeys
      .map((key) => `${key.recipientId}${key.pepperRequired ? ' (pepper required)' : ''}${key.hint ? ` - hint: ${key.hint}` : ''}`)
      .join('; ');
    showMessage(`Pack inspected: ${file.name}. Browser recipient(s): ${recipientSummary}. The passphrase is not stored in the pack — check .skyevault-out/skye-secure/ for a matching *.skyehandoff.json file, or check SKYESECURE_LIVE_PROOF_PASSPHRASE in your root .env if this pack was created by the CLI.`, 'success');
  }

  async function unlockSelectedPack() {
    if (!state.pack) await inspectSelectedFile();
    const result = await unlockPayload(state.pack);
    state.payload = result.payload;
    state.receipt = {
      schema: 'skye.secure.browser-unlock-receipt.v2',
      generatedAt: new Date().toISOString(),
      packId: state.pack.publicManifest.packId,
      recipientId: result.recipientId,
      fileCount: result.payload.files.length,
      files: result.payload.files.map((item) => ({ path: item.path, size: item.size, sha256: item.sha256 }))
    };
    el.receiptButton.disabled = false;
    renderFiles(result.payload);
    showMessage(`Payload verified for ${result.payload.files.length} files.`, 'success');
  }

  function downloadReceipt() {
    if (!state.receipt) return;
    const blob = new Blob([JSON.stringify(state.receipt, null, 2), '\n'], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    state.objectUrls.push(url);
    const link = document.createElement('a');
    link.href = url;
    link.download = `skyesecure-unlock-receipt-${state.receipt.packId}.json`;
    link.click();
  }

  el.packFile.addEventListener('change', () => {
    clearMessage();
    state.file = el.packFile.files?.[0] || null;
    state.pack = null;
    state.payload = null;
    state.receipt = null;
    el.inspectButton.disabled = !state.file;
    el.unlockButton.disabled = true;
    el.receiptButton.disabled = true;
  });

  el.inspectButton.addEventListener('click', () => {
    inspectSelectedFile().catch((error) => showMessage(error.message, 'error'));
  });

  el.unlockButton.addEventListener('click', () => {
    unlockSelectedPack().catch((error) => showMessage(error.message, 'error'));
  });

  el.receiptButton.addEventListener('click', downloadReceipt);
  el.createPackButton.addEventListener('click', () => {
    createPackFromBrowser().catch((error) => showMessage(error.message, 'error'));
  });
  el.clearButton.addEventListener('click', resetState);
  resetState();
  renderVaultHandoffContext();
}());
