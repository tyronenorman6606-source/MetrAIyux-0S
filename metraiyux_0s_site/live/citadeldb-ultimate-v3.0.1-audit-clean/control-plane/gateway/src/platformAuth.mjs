export function upstreamContext(req) {
  const accountHeader = process.env.UPSTREAM_ACCOUNT_HEADER || 'x-citadel-account';
  const teamHeader = process.env.UPSTREAM_TEAM_HEADER || 'x-citadel-team';
  return {
    accountRef: req.headers[accountHeader] || req.headers[accountHeader.toLowerCase()] || 'operator',
    teamSlug: req.headers[teamHeader] || req.headers[teamHeader.toLowerCase()] || null,
    source: 'upstream-header'
  };
}

export function requireTeamContext(req, res) {
  const ctx = upstreamContext(req);
  if (!ctx.teamSlug) {
    res.status(400).json({ ok: false, error: 'Missing upstream team context header' });
    return null;
  }
  return ctx;
}
