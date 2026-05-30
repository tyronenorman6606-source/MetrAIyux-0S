export const EVENT_TYPES = [
  'webcreator.project.requested',
  'webcreator.project.generated',
  'webcreator.asset.persisted',
  'webcreator.delivery.queued',
  'webcreator.manual.gateway_check',
  'app.generated',
  'ae.requested',
  'platform.event.mirrored'
];

export const REGISTERED_PLATFORMS = [
  'skyewebcreator-max',
  'skydexia',
  'ae-commandhub',
  'metraiyux-0s',
  'skygate-fs27'
];

export function isRegisteredEventType(type) {
  return EVENT_TYPES.includes(String(type || '').trim());
}

export function isRegisteredPlatform(platform) {
  return REGISTERED_PLATFORMS.includes(String(platform || '').trim());
}
