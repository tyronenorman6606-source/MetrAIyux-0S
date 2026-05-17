import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = process.cwd();
const registryPath = path.join(repoRoot, 'ops', '0s-command-registry.json');

function usage(commands = []) {
  console.log('Usage: npm run 0s:command -- <command-id>');
  console.log('');
  console.log('Available command IDs:');
  commands.forEach(command => {
    console.log(`  ${command.id.padEnd(20)} ${command.title}`);
  });
}

async function main() {
  const registry = JSON.parse(await fs.readFile(registryPath, 'utf8'));
  const commands = registry.commands || [];
  const id = process.argv[2];

  if (!id || id === '--help' || id === 'help') {
    usage(commands);
    return;
  }

  const selected = commands.find(command => command.id === id);
  if (!selected) {
    console.error(`Unknown 0S command: ${id}`);
    usage(commands);
    process.exit(1);
  }

  if (!selected.command) {
    console.error(`Command ${id} is empty.`);
    process.exit(1);
  }

  console.log(`0S command: ${selected.id}`);
  console.log(`Title: ${selected.title}`);
  console.log(`Risk: ${selected.risk}`);
  console.log(`Runs: ${selected.command}`);
  if (selected.long_running) console.log('Note: this command is long-running; stop it with Ctrl+C when finished.');
  console.log('');

  const child = spawn(selected.command, {
    cwd: path.join(repoRoot, selected.cwd || '.'),
    env: process.env,
    shell: true,
    stdio: 'inherit'
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      console.error(`0S command stopped by signal ${signal}.`);
      process.exit(1);
    }
    process.exit(code ?? 0);
  });
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
