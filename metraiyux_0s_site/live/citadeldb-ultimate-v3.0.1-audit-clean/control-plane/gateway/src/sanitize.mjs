export function appSlug(input) {
  const value = String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!value || value.length < 2 || value.length > 48) {
    throw new Error('Invalid app slug');
  }

  return value;
}

export function sqlIdent(input) {
  const value = String(input || '');
  if (!/^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/.test(value)) {
    throw new Error(`Invalid SQL identifier: ${value}`);
  }
  return `"${value.replaceAll('"', '""')}"`;
}
