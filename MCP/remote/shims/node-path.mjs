const sep = '/';

function cleanParts(parts) {
  const out = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') out.pop();
    else out.push(part);
  }
  return out;
}

function normalize(input = '.') {
  const value = String(input || '.').replace(/\\/g, '/');
  const absolute = value.startsWith('/');
  const parts = cleanParts(value.split('/'));
  const output = `${absolute ? '/' : ''}${parts.join('/')}`;
  return output || (absolute ? '/' : '.');
}

function join(...items) {
  return normalize(items.filter((item) => item !== undefined && item !== null && item !== '').join('/'));
}

function resolve(...items) {
  let current = '/workspaces/MetrAIyux-0S';
  for (const item of items) {
    if (item === undefined || item === null || item === '') continue;
    const value = String(item).replace(/\\/g, '/');
    current = value.startsWith('/') ? value : `${current}/${value}`;
  }
  return normalize(current);
}

function dirname(input) {
  const value = normalize(input);
  if (value === '/') return '/';
  const index = value.lastIndexOf('/');
  if (index <= 0) return value.startsWith('/') ? '/' : '.';
  return value.slice(0, index);
}

function basename(input) {
  const value = normalize(input);
  if (value === '/') return '';
  return value.slice(value.lastIndexOf('/') + 1);
}

function extname(input) {
  const base = basename(input);
  const index = base.lastIndexOf('.');
  return index > 0 ? base.slice(index) : '';
}

function isAbsolute(input) {
  return String(input || '').startsWith('/');
}

function relative(from, to) {
  const fromParts = cleanParts(resolve(from).split('/'));
  const toParts = cleanParts(resolve(to).split('/'));
  while (fromParts.length && toParts.length && fromParts[0] === toParts[0]) {
    fromParts.shift();
    toParts.shift();
  }
  return [...fromParts.map(() => '..'), ...toParts].join('/') || '';
}

export { basename, dirname, extname, isAbsolute, join, normalize, relative, resolve, sep };
export default { basename, dirname, extname, isAbsolute, join, normalize, relative, resolve, sep };
