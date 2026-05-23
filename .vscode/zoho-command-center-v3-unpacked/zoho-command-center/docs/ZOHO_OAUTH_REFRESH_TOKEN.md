# How to Get the Zoho OAuth Refresh Token

The `ZOHO_REFRESH_TOKEN` is the one confusing setup value. You generate it once, store it server-side, and the app uses it to request fresh access tokens automatically.

## What you need before starting

- A Zoho admin account with access to the mailbox/workspace you want to power the dashboard.
- A Zoho OAuth client from Zoho API Console / Developer Console.
- The `ZOHO_CLIENT_ID` and `ZOHO_CLIENT_SECRET` from that client.
- The right data center selected: US, EU, IN, etc.

## Step 1: Create a Zoho OAuth app

In Zoho API Console / Developer Console:

1. Create a new OAuth client.
2. Choose a server-based application if Zoho asks for client type.
3. Add a redirect URI.

For local testing, a redirect URI can be something like:

```text
http://localhost:3000/oauth/callback
```

This app does not currently need a real callback page because you can manually copy the temporary code from the redirect URL during setup.

## Step 2: Choose scopes

For basic inbox + sending, use scopes like:

```text
ZohoMail.accounts.READ,ZohoMail.folders.READ,ZohoMail.messages.ALL
```

For admin/provisioning operations such as domains, users, aliases, and mailbox creation, you may also need organization/admin scopes such as:

```text
ZohoMail.organization.accounts.ALL,ZohoMail.organization.domains.ALL,ZohoMail.organization.groups.ALL
```

Exact scopes can vary based on the Zoho product, plan, region, and permissions. Start with inbox/send scopes first, then add admin scopes when you test provisioning.

## Step 3: Build the authorization URL

Use your own client ID and scopes.

US data center example:

```text
https://accounts.zoho.com/oauth/v2/auth?scope=ZohoMail.accounts.READ,ZohoMail.folders.READ,ZohoMail.messages.ALL&client_id=YOUR_CLIENT_ID&response_type=code&access_type=offline&redirect_uri=http://localhost:3000/oauth/callback
```

EU data center example:

```text
https://accounts.zoho.eu/oauth/v2/auth?scope=ZohoMail.accounts.READ,ZohoMail.folders.READ,ZohoMail.messages.ALL&client_id=YOUR_CLIENT_ID&response_type=code&access_type=offline&redirect_uri=http://localhost:3000/oauth/callback
```

IN data center example:

```text
https://accounts.zoho.in/oauth/v2/auth?scope=ZohoMail.accounts.READ,ZohoMail.folders.READ,ZohoMail.messages.ALL&client_id=YOUR_CLIENT_ID&response_type=code&access_type=offline&redirect_uri=http://localhost:3000/oauth/callback
```

Open that URL in the browser while logged into the Zoho admin account you want to authorize.

Zoho redirects you to your redirect URI with a `code=` parameter in the URL. Copy that code.

## Step 4: Exchange the temporary code for tokens

Run this from your terminal. Replace the values first.

US example:

```bash
curl -X POST "https://accounts.zoho.com/oauth/v2/token" \
  -d "grant_type=authorization_code" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "redirect_uri=http://localhost:3000/oauth/callback" \
  -d "code=THE_CODE_FROM_THE_REDIRECT_URL"
```

EU example:

```bash
curl -X POST "https://accounts.zoho.eu/oauth/v2/token" \
  -d "grant_type=authorization_code" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "redirect_uri=http://localhost:3000/oauth/callback" \
  -d "code=THE_CODE_FROM_THE_REDIRECT_URL"
```

IN example:

```bash
curl -X POST "https://accounts.zoho.in/oauth/v2/token" \
  -d "grant_type=authorization_code" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "redirect_uri=http://localhost:3000/oauth/callback" \
  -d "code=THE_CODE_FROM_THE_REDIRECT_URL"
```

The response should include a `refresh_token`. Put that value in `.env.local`:

```bash
ZOHO_REFRESH_TOKEN="paste-refresh-token-here"
```

## Step 5: Match your data center env vars

If your Zoho account is US:

```bash
ZOHO_ACCOUNTS_BASE="https://accounts.zoho.com"
ZOHO_MAIL_BASE="https://mail.zoho.com"
```

If EU:

```bash
ZOHO_ACCOUNTS_BASE="https://accounts.zoho.eu"
ZOHO_MAIL_BASE="https://mail.zoho.eu"
```

If India:

```bash
ZOHO_ACCOUNTS_BASE="https://accounts.zoho.in"
ZOHO_MAIL_BASE="https://mail.zoho.in"
```

## Common issues

### `invalid_client`

Usually means the client ID, client secret, redirect URI, or data center is wrong.

### `invalid_code`

The temporary code expired or was already used. Generate a new authorization code and exchange it immediately.

### No `refresh_token` returned

Make sure the authorization URL includes:

```text
access_type=offline
```

You may also need to revoke the old grant in Zoho and repeat consent if Zoho already issued a token without offline access.

### API says unauthorized after setup

Your token may not have the required scopes. Generate a new refresh token with the expanded scopes.
