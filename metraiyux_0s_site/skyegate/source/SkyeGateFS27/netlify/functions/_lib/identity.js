import crypto from "crypto";
import { q } from "./db.js";

export function normalizeEmail(email) {
  return (email || "").toString().trim().toLowerCase();
}

export function sanitizeDisplayName(name) {
  const value = (name || "").toString().trim();
  return value ? value.slice(0, 120) : null;
}

export function sanitizeContactValue(value) {
  const cleaned = (value || "").toString().trim();
  return cleaned ? cleaned.slice(0, 220) : null;
}

export async function getUserByEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const res = await q(
    `select u.*, c.email as customer_email, c.plan_name as customer_plan_name
     from users u
     left join customers c on c.id = u.primary_customer_id
     where u.email_normalized=$1
     limit 1`,
    [normalized]
  );
  return res.rowCount ? res.rows[0] : null;
}

export async function getUserById(userId) {
  if (!userId) return null;
  const res = await q(
    `select u.*, c.email as customer_email, c.plan_name as customer_plan_name
     from users u
     left join customers c on c.id = u.primary_customer_id
     where u.id=$1
     limit 1`,
    [userId]
  );
  return res.rowCount ? res.rows[0] : null;
}

export async function ensureCustomerForUser({ email, planName = "starter", communicationEmail = null, skyemail = null }) {
  const normalized = normalizeEmail(email);
  const found = await q(`select * from customers where lower(email)=lower($1) limit 1`, [normalized]);
  if (found.rowCount) {
    const updated = await q(
      `update customers
       set communication_email = coalesce($2, communication_email),
           skyemail = coalesce($3, skyemail)
       where id=$1
       returning *`,
      [found.rows[0].id, sanitizeContactValue(communicationEmail), sanitizeContactValue(skyemail)]
    );
    return updated.rows[0];
  }

  const created = await q(
    `insert into customers(email, communication_email, skyemail, plan_name)
     values ($1,$2,$3,$4)
     returning *`,
    [
      normalized,
      sanitizeContactValue(communicationEmail),
      sanitizeContactValue(skyemail),
      (planName || "starter").toString().slice(0, 60)
    ]
  );
  return created.rows[0];
}

export async function createUser({
  email,
  passwordHash,
  displayName = null,
  communicationEmail = null,
  skyemail = null,
  customerId = null,
  defaultApiKeyId = null,
  role = "user",
  profile = {},
  passwordResetRequired = false,
  provisionedBy = null
}) {
  const normalized = normalizeEmail(email);
  const id = crypto.randomUUID();
  const res = await q(
    `insert into users(id, email, email_normalized, display_name, communication_email, skyemail, primary_customer_id, default_api_key_id, role, profile, password_reset_required, provisioned_at, provisioned_by)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,case when $12::text is null then null else now() end,$12)
     returning *`,
    [
      id,
      normalized,
      normalized,
      sanitizeDisplayName(displayName),
      sanitizeContactValue(communicationEmail),
      sanitizeContactValue(skyemail),
      customerId,
      defaultApiKeyId || null,
      role,
      JSON.stringify(profile || {}),
      !!passwordResetRequired,
      provisionedBy || null
    ]
  );
  await q(
    `insert into user_passwords(user_id, password_hash)
     values ($1,$2)`,
    [id, passwordHash]
  );
  return res.rows[0];
}

export async function updateUserPassword(userId, passwordHash) {
  await q(
    `insert into user_passwords(user_id, password_hash, password_updated_at)
     values ($1,$2,now())
     on conflict (user_id)
     do update set
       password_hash = excluded.password_hash,
       password_updated_at = now()`,
    [userId, passwordHash]
  );
  await q(
    `update users
     set password_reset_required=false,
         updated_at=now()
     where id=$1`,
    [userId]
  );
}

export async function getUserPasswordRecord(userId) {
  const res = await q(`select * from user_passwords where user_id=$1 limit 1`, [userId]);
  return res.rowCount ? res.rows[0] : null;
}

export async function markEmailVerified(userId) {
  await q(
    `update users
     set email_verified_at = coalesce(email_verified_at, now()),
         updated_at = now()
     where id=$1`,
    [userId]
  );
}

export async function updateUserLastSeen(userId) {
  await q(`update users set updated_at=now() where id=$1`, [userId]);
}

export async function setUserProvisioningState(userId, {
  customerId = null,
  defaultApiKeyId = null,
  displayName = null,
  communicationEmail = null,
  skyemail = null,
  role = null,
  passwordResetRequired = null,
  provisionedBy = null,
  profilePatch = {}
} = {}) {
  const current = await getUserById(userId);
  if (!current) return null;
  const nextProfile = {
    ...(current.profile && typeof current.profile === "object" ? current.profile : {}),
    ...(profilePatch && typeof profilePatch === "object" ? profilePatch : {})
  };
  const res = await q(
    `update users
     set primary_customer_id = coalesce($2, primary_customer_id),
         default_api_key_id = coalesce($3, default_api_key_id),
         display_name = coalesce($4, display_name),
         communication_email = coalesce($5, communication_email),
         skyemail = coalesce($6, skyemail),
         role = coalesce($7, role),
         password_reset_required = case when $8::boolean is null then password_reset_required else $8 end,
         provisioned_at = coalesce(provisioned_at, case when $9::text is null then null else now() end),
         provisioned_by = coalesce($9, provisioned_by),
         profile = $10::jsonb,
         updated_at = now()
     where id=$1
     returning *`,
    [
      userId,
      customerId || null,
      defaultApiKeyId || null,
      sanitizeDisplayName(displayName),
      sanitizeContactValue(communicationEmail),
      sanitizeContactValue(skyemail),
      role || null,
      typeof passwordResetRequired === "boolean" ? passwordResetRequired : null,
      provisionedBy || null,
      JSON.stringify(nextProfile)
    ]
  );
  return res.rowCount ? res.rows[0] : null;
}

export async function getDefaultApiKeyIdForUser(user) {
  if (!user?.primary_customer_id) return null;
  if (user.default_api_key_id) {
    const keyed = await q(
      `select id
       from api_keys
       where id=$1
         and customer_id=$2
         and revoked_at is null
         and (expires_at is null or expires_at > now())
       limit 1`,
      [user.default_api_key_id, user.primary_customer_id]
    );
    if (keyed.rowCount) return keyed.rows[0].id;
  }
  const fallback = await q(
    `select id
     from api_keys
     where customer_id=$1
       and revoked_at is null
       and (expires_at is null or expires_at > now())
     order by
       case when role in ('owner','admin') then 0 else 1 end,
       created_at desc
     limit 1`,
    [user.primary_customer_id]
  );
  return fallback.rowCount ? fallback.rows[0].id : null;
}
