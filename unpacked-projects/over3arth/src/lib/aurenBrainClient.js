const BRAIN_TIMEOUT = 28000;
const SPEECH_TIMEOUT = 24000;
const TRANSCRIBE_TIMEOUT = 36000;

function withTimeout(timeoutMs) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    clear: () => window.clearTimeout(timeout)
  };
}

async function requestJson(path, options = {}, timeoutMs = BRAIN_TIMEOUT) {
  const timeout = withTimeout(timeoutMs);
  try {
    const response = await fetch(path, {
      ...options,
      headers: {
        'content-type': 'application/json',
        ...(options.headers || {})
      },
      signal: timeout.signal
    });
    const payload = await response.json();
    if (!response.ok || payload?.ok === false) {
      throw new Error(payload?.error || `auren-${response.status}`);
    }
    return payload;
  } finally {
    timeout.clear();
  }
}

export async function getAurenBrainStatus() {
  return requestJson('/api/auren/status', {}, 5000);
}

export async function requestAurenBrain(payload) {
  return requestJson('/api/auren/chat', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function synthesizeAurenSpeech({ text, target, voice }) {
  const timeout = withTimeout(SPEECH_TIMEOUT);
  try {
    const response = await fetch('/api/auren/speech', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text, target, voice }),
      signal: timeout.signal
    });
    if (!response.ok) {
      let detail = `tts-${response.status}`;
      try {
        const payload = await response.json();
        detail = payload?.error || detail;
      } catch {
        detail = await response.text();
      }
      throw new Error(detail || `tts-${response.status}`);
    }
    return response.blob();
  } finally {
    timeout.clear();
  }
}

export async function transcribeAurenAudio(blob) {
  const audioBase64 = await blobToBase64(blob);
  return requestJson('/api/auren/transcribe', {
    method: 'POST',
    body: JSON.stringify({
      audioBase64,
      mimeType: blob.type || 'audio/webm'
    })
  }, TRANSCRIBE_TIMEOUT);
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('audio-read-failed'));
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.readAsDataURL(blob);
  });
}
