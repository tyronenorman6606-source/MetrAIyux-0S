import assert from 'node:assert/strict';
import test from 'node:test';

import {
  identityKeysForUser,
  primaryIdentityKey
} from '../Free99/apps/skyevaultpro/netlify/functions/_lib/fs27-auth.mjs';

test('SkyeVaultPro identity aliases keep FS27 primary while preserving old Netlify IDs', () => {
  const user = {
    sub: 'fs27-founder-sub',
    email: 'grayskyes@solenterprises.org',
    raw: {
      user_id: 'fs27-founder-sub',
      user: {
        id: 'netlify-identity-old-id',
        app_metadata: { netlify_id: 'netlify-app-meta-id' },
        user_metadata: { legacy_user_id: 'netlify-user-meta-id' }
      },
      skygate: {
        sub: 'skygate-sub',
        identity_aliases: ['legacy-skygate-alias']
      },
      identity_aliases: ['raw-legacy-alias']
    }
  };

  const legacyMap = JSON.stringify({
    'grayskyes@solenterprises.org': ['env-legacy-id']
  });
  const keys = identityKeysForUser(user, legacyMap);

  assert.equal(primaryIdentityKey(user), 'fs27-founder-sub');
  assert.deepEqual(keys.slice(0, 3), [
    'fs27-founder-sub',
    'grayskyes@solenterprises.org',
    'netlify-identity-old-id'
  ]);
  assert.ok(keys.includes('netlify-app-meta-id'));
  assert.ok(keys.includes('netlify-user-meta-id'));
  assert.ok(keys.includes('legacy-skygate-alias'));
  assert.ok(keys.includes('raw-legacy-alias'));
  assert.ok(keys.includes('env-legacy-id'));
});
