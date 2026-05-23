const secretPatterns = [
  /postgres:\/\/[^:\s]+:[^@\s]+@/gi,
  /(POSTGRES_PASSWORD|GATEWAY_ADMIN_TOKEN|BACKUP_ENCRYPTION_PASSWORD|OPENAI_API_KEY|GEMINI_API_KEY|GOOGLE_API_KEY|DATABASE_URL)\s*=\s*[^\s]+/gi,
  /(sk-[a-zA-Z0-9_\-]{20,})/g,
  /(AIza[0-9A-Za-z_\-]{20,})/g,
  /(Bearer\s+)[A-Za-z0-9_\-\.=]{20,}/gi
];

export function redactSecrets(input) {
  let text = String(input ?? '');
  for (const pattern of secretPatterns) {
    text = text.replace(pattern, match => {
      if (match.toLowerCase().startsWith('postgres://')) {
        return match.replace(/:([^:@]+)@/, ':***@');
      }
      if (match.toLowerCase().startsWith('bearer ')) return 'Bearer ***';
      const eq = match.indexOf('=');
      if (eq !== -1) return `${match.slice(0, eq + 1)}***`;
      return '***';
    });
  }
  return text;
}
