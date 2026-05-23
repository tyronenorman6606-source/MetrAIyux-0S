const KEY_VALUE_PATTERN = /^\s*([A-Z0-9_\-.]{3,80})\s*[:=]\s*(.+?)\s*$/i;
const PRIVATE_KEY_BLOCK_PATTERN = /-----BEGIN\s+(?:RSA\s+|OPENSSH\s+|EC\s+)?PRIVATE\s+KEY-----[\s\S]+?-----END\s+(?:RSA\s+|OPENSSH\s+|EC\s+)?PRIVATE\s+KEY-----/gi;
const QUOTED_ENV_PATTERN = /^\s*([A-Z0-9_\-.]{3,80})\s*=\s*(["'])([\s\S]*)\2\s*;?\s*$/i;

const SIGNALS = [
  { kind: 'database_url', test: /DATABASE[_\s-]?URL|POSTGRES|MYSQL|MONGO|REDIS|NEON/i },
  { kind: 'api_key', test: /API[_\s-]?KEY|PUBLIC[_\s-]?KEY|CLIENT[_\s-]?KEY/i },
  { kind: 'token', test: /TOKEN|BEARER|JWT|SESSION|AUTH/i },
  { kind: 'secret', test: /SECRET|PRIVATE|CREDENTIAL|ACCESS[_\s-]?SECRET/i },
  { kind: 'password', test: /PASS(WORD)?|PWD|LOGIN/i },
  { kind: 'cloud_key', test: /AWS|GCP|GOOGLE|CLOUDFLARE|CF_|SUPABASE|NETLIFY|VERCEL|OPENAI|GEMINI/i },
  { kind: 'private_key', test: /BEGIN\s+(RSA\s+|OPENSSH\s+|EC\s+)?PRIVATE\s+KEY/i }
];

const VALUE_HINTS = [
  /sk-[A-Za-z0-9_\-]{12,}/,
  /AIza[0-9A-Za-z_\-]{20,}/,
  /AKIA[0-9A-Z]{12,}/,
  /xox[baprs]-[A-Za-z0-9\-]{20,}/,
  /gh[pousr]_[A-Za-z0-9_]{20,}/,
  /eyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+/,
  /postgres(?:ql)?:\/\/[^\s]+/i,
  /mysql:\/\/[^\s]+/i,
  /mongodb(?:\+srv)?:\/\/[^\s]+/i,
  /redis:\/\/[^\s]+/i,
  /[A-Za-z0-9_\-]{24,}\.[A-Za-z0-9_\-]{6,}\.[A-Za-z0-9_\-]{20,}/,
  /[A-Fa-f0-9]{32,}/,
  /[A-Za-z0-9_\-\/+=]{36,}/
];

function classify(key, value) {
  const sample = `${key || ''} ${value || ''}`;
  const match = SIGNALS.find((signal) => signal.test.test(sample));
  if (match) return match.kind;
  if (/url/i.test(key || '') || /:\/\//.test(value || '')) return 'url_or_connection_string';
  if (/KEY/i.test(key || '')) return 'key';
  return 'text';
}

function cleanValue(value) {
  return String(value || '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/^[`'"\s]+|[`'",;\s]+$/g, '')
    .trim();
}

function scoreLine(line) {
  let score = 0;
  if (KEY_VALUE_PATTERN.test(line)) score += 5;
  if (SIGNALS.some((signal) => signal.test.test(line))) score += 4;
  if (VALUE_HINTS.some((pattern) => pattern.test(line))) score += 5;
  if (/\s/.test(line) && line.length < 16) score -= 2;
  return score;
}


function pushResult(results, seen, item) {
  const value = cleanValue(item.value);
  if (!value || value.length < 4) return;
  const label = (item.label || 'DETECTED_SECRET').replace(/\s+/g, '_').toUpperCase();
  const key = `${label}:${value}`;
  if (seen.has(key)) return;
  seen.add(key);
  results.push({
    label,
    kind: item.kind || classify(label, value),
    value,
    confidence: item.confidence || 70,
    sourceLine: item.sourceLine || value
  });
}

export function detectSecrets(rawText) {
  const text = String(rawText || '').replace(/\r/g, '\n');
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const results = [];
  const seen = new Set();

  for (const match of text.matchAll(PRIVATE_KEY_BLOCK_PATTERN)) {
    pushResult(results, seen, {
      label: 'PRIVATE_KEY_BLOCK',
      kind: 'private_key',
      value: match[0],
      confidence: 99,
      sourceLine: 'Detected multiline private key block.'
    });
  }

  for (const line of lines) {
    const quoted = line.match(QUOTED_ENV_PATTERN);
    const kv = line.match(KEY_VALUE_PATTERN);
    const lineScore = scoreLine(line);
    if (quoted && lineScore >= 5) {
      pushResult(results, seen, {
        label: quoted[1],
        kind: classify(quoted[1], quoted[3]),
        value: quoted[3],
        confidence: Math.min(99, 62 + lineScore * 6),
        sourceLine: line
      });
      continue;
    }
    if (kv && lineScore >= 5) {
      pushResult(results, seen, {
        label: kv[1],
        kind: classify(kv[1], kv[2]),
        value: kv[2],
        confidence: Math.min(99, 58 + lineScore * 6),
        sourceLine: line
      });
      continue;
    }

    for (const pattern of VALUE_HINTS) {
      const match = line.match(pattern);
      if (!match) continue;
      const label = SIGNALS.find((signal) => signal.test.test(line))?.kind?.toUpperCase() || 'DETECTED_SECRET';
      pushResult(results, seen, {
        label,
        kind: classify(label, match[0]),
        value: match[0],
        confidence: Math.min(97, 70 + lineScore * 4),
        sourceLine: line
      });
    }
  }

  if (!results.length && text.trim()) {
    const compact = text.trim().slice(0, 4000);
    results.push({
      label: 'OCR_TEXT_CAPTURE',
      kind: 'text',
      value: compact,
      confidence: 35,
      sourceLine: 'Fallback text capture. Edit and save only the clean secret/value needed.'
    });
  }

  return results.slice(0, 50);
}

export function toSecretEditorDraft(detected, photoId, rawText) {
  return {
    photoId,
    label: detected?.label || 'Captured Secret',
    kind: detected?.kind || 'text',
    value: detected?.value || '',
    provider: '',
    account: '',
    url: '',
    tags: [],
    rotationDue: '',
    rawText: rawText || detected?.sourceLine || '',
    notes: detected?.confidence ? `OCR confidence signal: ${detected.confidence}%` : ''
  };
}
