function forgeUrl(path) {
  const base = String(process.env.FORGEJO_INTERNAL_URL || 'http://forgejo:3000').replace(/\/$/, '');
  return `${base}${path}`;
}

async function forgeFetch(path, options = {}) {
  const token = process.env.FORGEJO_ADMIN_TOKEN;
  if (!token) {
    const error = new Error('FORGEJO_ADMIN_TOKEN is not set');
    error.code = 'missing_forgejo_admin_token';
    throw error;
  }
  const response = await fetch(forgeUrl(path), {
    ...options,
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      authorization: `token ${token}`,
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  if (!response.ok) {
    const error = new Error(body.message || body.raw || `Forgejo API failed with ${response.status}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

export async function checkForgejo() {
  const response = await fetch(forgeUrl('/api/healthz'));
  return { ok: response.ok, status: response.status };
}

export async function createOrganization({ slug, displayName, description }) {
  try {
    return await forgeFetch('/api/v1/orgs', {
      method: 'POST',
      body: JSON.stringify({
        username: slug,
        full_name: displayName,
        description: description || `${displayName} workspace on SoveReign13 Citadel Forge`,
        visibility: 'private'
      })
    });
  } catch (error) {
    const message = String(error.message || '').toLowerCase();
    if ([409, 422].includes(Number(error.status)) && message.includes('already exists')) {
      return forgeFetch(`/api/v1/orgs/${encodeURIComponent(slug)}`);
    }
    throw error;
  }
}

export async function createOrgRepo(org, { name, description, isPrivate = true }) {
  return forgeFetch(`/api/v1/orgs/${encodeURIComponent(org)}/repos`, {
    method: 'POST',
    body: JSON.stringify({
      name,
      description: description || `${name} repository on SoveReign13 Citadel Forge`,
      private: Boolean(isPrivate),
      auto_init: true,
      default_branch: 'main'
    })
  });
}

export async function listOrgRepos(org) {
  const all = [];
  let page = 1;
  while (page <= 25) {
    const batch = await forgeFetch(`/api/v1/orgs/${encodeURIComponent(org)}/repos?page=${page}&limit=50`);
    if (!Array.isArray(batch) || batch.length === 0) break;
    all.push(...batch);
    if (batch.length < 50) break;
    page += 1;
  }
  return all;
}

export async function summarizeOrgUsage(org) {
  const repos = await listOrgRepos(org);
  const repoSizeKb = repos.reduce((sum, repo) => sum + Number(repo.size || 0), 0);
  return {
    repo_count: repos.length,
    private_repo_count: repos.filter((repo) => repo.private).length,
    repo_size_kb: repoSizeKb,
    raw: { repos: repos.map((repo) => ({ name: repo.name, private: repo.private, size: repo.size, updated_at: repo.updated_at })) }
  };
}
