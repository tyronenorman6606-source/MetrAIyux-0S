import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'package.json',
  'netlify.toml',
  '.env.example',
  'public/index.html',
  'public/upload.html',
  'public/vault.html',
  'public/repo.html',
  'public/process.html',
  'public/operator.html',
  'internal-pages/admin.html',
  'internal-pages/setup.html',
  'public/_headers',
  'public/robots.txt',
  'public/404.html',
  'public/assets/styles.css',
  'public/assets/app.js',
  'public/assets/admin.js',
  'public/assets/setup.js',
  'public/assets/operator.js',
  'netlify/functions/public-config.js',
  'netlify/functions/upload-session.js',
  'netlify/functions/upload-complete.js',
  'netlify/functions/admin-config.js',
  'netlify/functions/admin-drive-test.js',
  'netlify/functions/admin-notification-test.js',
  'netlify/functions/setup-diagnostics.js',
  'netlify/functions/operator-session.js',
  'netlify/functions/operator-logout.js',
  'netlify/functions/operator-page.js',
  'netlify/functions/_lib/google-drive.js',
  'netlify/functions/_lib/config.js',
  'netlify/functions/_lib/security.js',
  'netlify/functions/_lib/notifications.js',
  'README.md'
];

const missing = required.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length) {
  console.error('Missing required files:');
  for (const file of missing) console.error(`- ${file}`);
  process.exit(1);
}

const publicText = ['public/index.html', 'public/upload.html', 'public/vault.html', 'public/repo.html', 'public/process.html', 'public/operator.html', 'internal-pages/admin.html', 'internal-pages/setup.html', 'public/assets/app.js', 'public/assets/admin.js', 'public/assets/setup.js', 'public/assets/operator.js']
  .map((file) => fs.readFileSync(path.join(root, file), 'utf8'))
  .join('\n');

const bannedPublicTerms = ['TODO:', 'lorem ipsum', 'placeholder copy'];
const found = bannedPublicTerms.filter((term) => publicText.toLowerCase().includes(term.toLowerCase()));
if (found.length) {
  console.error(`Public/internal surface files contain banned placeholder terms: ${found.join(', ')}`);
  process.exit(1);
}

if (fs.existsSync(path.join(root, 'public/admin.html')) || fs.existsSync(path.join(root, 'public/setup.html'))) {
  console.error('Admin/setup pages must not be shipped as public static files. They must be served through protected operator functions.');
  process.exit(1);
}

const headersFile = fs.readFileSync(path.join(root, 'public/_headers'), 'utf8');
if (!headersFile.includes('Content-Security-Policy') || !headersFile.includes('X-Frame-Options: DENY')) {
  console.error('public/_headers is missing required security headers.');
  process.exit(1);
}

const netlifyToml = fs.readFileSync(path.join(root, 'netlify.toml'), 'utf8');
if (!netlifyToml.includes('from = "/api/*"') || !netlifyToml.includes('functions = "netlify/functions"') || !netlifyToml.includes('operator-page?page=admin')) {
  console.error('netlify.toml is missing API redirects, protected operator redirects, or function directory configuration.');
  process.exit(1);
}

const uploadFunction = fs.readFileSync(path.join(root, 'netlify/functions/upload-session.js'), 'utf8');
if (!uploadFunction.includes('createResumableSession') || !uploadFunction.includes('chooseDestinations')) {
  console.error('upload-session.js does not include storage session routing.');
  process.exit(1);
}

const driveLib = fs.readFileSync(path.join(root, 'netlify/functions/_lib/google-drive.js'), 'utf8');
if (!driveLib.includes('cloudflare-r2') || !driveLib.includes('s3-multipart') || !driveLib.includes('presignUrl')) {
  console.error('storage library does not create Cloudflare R2 multipart upload sessions.');
  process.exit(1);
}

console.log('✅ Local smoke passed: required files, protected operator routing, Netlify routing, public surface, Cloudflare R2 multipart upload path, routing logic, notifications, and setup command center are present.');
