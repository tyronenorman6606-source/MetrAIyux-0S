import { verifyJwt } from "./crypto.js";
import { verifyAccessToken } from "./oauth.js";
import { verifySessionToken } from "./sessions.js";

function truthyEnv(v){
  const s = String(v || "").trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "y";
}

function adminPasswordCandidates() {
  return [
    process.env.ADMIN_PASSWORD,
    process.env.FS27_ADMIN_PASSWORD,
    process.env.SKYGATEFS27_ADMIN_PASSWORD,
    process.env.SKYGATE_ADMIN_PASSWORD,
    process.env.SKYEGATE_ADMIN_PASSWORD,
    process.env.SKYGATEFS13_ADMIN_PASSWORD,
    process.env.QA_ADMIN_PASSWORD,
    process.env.PHC_OPERATOR_PASSWORD
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .filter((value, index, all) => all.indexOf(value) === index);
}

export function matchesAdminPassword(password) {
  const pass = String(password || "");
  return Boolean(pass && adminPasswordCandidates().some((expected) => pass === expected));
}

export function requireAdmin(req) {
  // Preferred: short-lived admin JWT
  const auth = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (token) {
    const payload = verifyJwt(token);
    if (payload && payload.role === "admin") return payload;
  }

  // Back-compat for the bundled admin UI: per-request password header
  // You can disable this entirely by setting DISABLE_ADMIN_PASSWORD_HEADER=true
  if (!truthyEnv(process.env.DISABLE_ADMIN_PASSWORD_HEADER)) {
    const pass = (req.headers.get("x-admin-password") || "").toString();
    if (matchesAdminPassword(pass)) {
      return { role: "admin", via: "fs27-password" };
    }
  }

  return null;
}

export async function resolveAdminAuthority(req) {
  const legacy = requireAdmin(req);
  if (legacy) return legacy;

  const auth = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;

  const session = await verifySessionToken(token);
  if (session?.user && ["founder", "owner", "admin"].includes((session.user.role || "").toLowerCase())) {
    return { role: session.user.role, via: "session", user_id: session.user.id };
  }

  const access = await verifyAccessToken(token);
  if (access?.payload && ["founder", "owner", "admin"].includes((access.payload.role || "").toLowerCase())) {
    return { role: access.payload.role, via: "oauth", user_id: access.payload.sub || null };
  }

  return null;
}
