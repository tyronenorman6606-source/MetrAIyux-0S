export function buildExecutionPlanFromManifest(manifest = {}) {
  const commands = [];
  for (const [stage, command] of Object.entries(manifest.commands || {})) {
    if (!command) continue;
    const text = String(command);
    const blocked = /deploy|rm\s+-rf|sudo|curl\b|wget\b|ssh\b/i.test(text);
    commands.push({ stage, command: text, runnableInBrowser: false, serverRunnable: !blocked, issues: blocked ? ['blocked by safe execution policy'] : [] });
  }
  return { generatedAt: new Date().toISOString(), primaryFramework: manifest.primaryFramework || 'unknown', commands };
}
