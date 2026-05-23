import {
  hasPlatformUsageBucket,
  normalizePlatformId,
  platformIdFromKeyRow,
  platformUsageBucket
} from "./authz.js";

function bodyValue(body, keys) {
  for (const key of keys) {
    const value = body?.[key];
    if (value !== null && value !== undefined && String(value).trim()) return value;
  }
  return "";
}

function headerValue(req, names) {
  for (const name of names) {
    const value = req?.headers?.get?.(name);
    if (value && String(value).trim()) return value;
  }
  return "";
}

export function resolvePlatformUsageContext({
  req,
  body = {},
  keyRow,
  fallbackPlatformId = "metraiyux-0s",
  defaultLane = "ai"
} = {}) {
  const requestedPlatform = bodyValue(body, ["platform_id", "platformId", "app_id", "appId"]) ||
    headerValue(req, ["x-skye-platform", "x-kaixu-platform", "x-kaixu-app"]);
  const platformId = normalizePlatformId(
    requestedPlatform,
    platformIdFromKeyRow(keyRow, fallbackPlatformId)
  );
  const usageLane = normalizePlatformId(
    bodyValue(body, ["usage_lane", "usageLane", "capability"]) ||
      headerValue(req, ["x-skye-usage-lane", "x-kaixu-usage-lane", "x-kaixu-capability"]),
    defaultLane
  );
  const dedicatedBucket = hasPlatformUsageBucket(keyRow, platformId);
  const bucket = platformUsageBucket(keyRow, platformId);
  return {
    platformId,
    usageLane,
    dedicatedBucket,
    dedicatedPlatformId: dedicatedBucket ? platformId : null,
    bucket
  };
}

export function resolveStoredPlatformUsageContext({
  keyRow,
  meta = {},
  request = {},
  fallbackPlatformId = "metraiyux-0s",
  defaultLane = "ai"
} = {}) {
  const platformMeta = meta?.platform || {};
  const platformId = normalizePlatformId(
    platformMeta.platform_id || platformMeta.platformId || request.platform_id || request.platformId,
    platformIdFromKeyRow(keyRow, fallbackPlatformId)
  );
  const usageLane = normalizePlatformId(
    platformMeta.usage_lane || platformMeta.usageLane || request.usage_lane || request.usageLane,
    defaultLane
  );
  const dedicatedBucket = hasPlatformUsageBucket(keyRow, platformId);
  const bucket = platformUsageBucket(keyRow, platformId);
  return {
    platformId,
    usageLane,
    dedicatedBucket,
    dedicatedPlatformId: dedicatedBucket ? platformId : null,
    bucket
  };
}
