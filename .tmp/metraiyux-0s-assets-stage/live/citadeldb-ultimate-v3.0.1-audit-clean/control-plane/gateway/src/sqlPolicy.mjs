const blockedPatterns = [
  /\bDROP\s+DATABASE\b/i,
  /\bDROP\s+ROLE\b/i,
  /\bCREATE\s+ROLE\b/i,
  /\bALTER\s+ROLE\b/i,
  /\bCREATE\s+USER\b/i,
  /\bALTER\s+USER\b/i,
  /\bCOPY\s+.*\bPROGRAM\b/i,
  /\bpg_read_file\s*\(/i,
  /\bpg_write_file\s*\(/i,
  /\bpg_sleep\s*\(/i,
  /\bALTER\s+SYSTEM\b/i,
  /\bCREATE\s+EXTENSION\b/i,
  /\bSECURITY\s+DEFINER\b/i
];

export function classifySql(sql) {
  const trimmed = String(sql || '').trim();
  const first = trimmed.split(/\s+/)[0]?.toUpperCase() || 'UNKNOWN';
  return first;
}

export function validateSqlForConsole(sql) {
  const text = String(sql || '').trim();
  if (!text) return { ok: false, error: 'SQL is empty' };
  if (text.length > 20000) return { ok: false, error: 'SQL exceeds 20,000 character console limit' };
  if (text.split(';').filter(part => part.trim()).length > 1) {
    return { ok: false, error: 'Only one SQL statement is allowed per console execution' };
  }
  for (const pattern of blockedPatterns) {
    if (pattern.test(text)) {
      return { ok: false, error: `Blocked by SQL console safety policy: ${pattern}` };
    }
  }
  return { ok: true, statementKind: classifySql(text) };
}

export function sqlPreview(sql) {
  return String(sql || '').replace(/\s+/g, ' ').trim().slice(0, 240);
}
