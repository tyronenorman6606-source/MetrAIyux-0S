# Skyes Over London LC — Google Drive + Netlify Environment Setup

This guide configures live contractor packet uploads for the protected AE onboarding form.

Required Netlify environment variables:

- `GOOGLE_DRIVE_FOLDER_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_PRIVATE_KEY`
- `CONTRACTOR_PACKET_ENCRYPTION_KEY_BASE64`

## Fast setup

1. Create/select a Google Cloud project.
2. Enable the Google Drive API.
3. Create a service account.
4. Create a JSON key for that service account.
5. Create a Google Drive folder named `Skyes AE Contractor Packets`.
6. Share that folder with the service account email as Editor.
7. Copy only the folder ID from the Drive URL into `GOOGLE_DRIVE_FOLDER_ID`.
8. Copy `client_email` from the JSON key into `GOOGLE_SERVICE_ACCOUNT_EMAIL`.
9. Copy `private_key` from the JSON key into `GOOGLE_PRIVATE_KEY`.
10. Generate a 32-byte base64 encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

11. Paste that output into `CONTRACTOR_PACKET_ENCRYPTION_KEY_BASE64`.
12. Add all four values in Netlify Site configuration → Environment variables, with Functions scope available.
13. Redeploy.
14. Submit one test contractor packet from `/ae-command-hub/onboarding.html`.

## Official links

- Google Cloud API getting started: https://cloud.google.com/apis/docs/getting-started
- Enable APIs: https://support.google.com/googleapi/answer/6158841
- Create service accounts: https://cloud.google.com/iam/docs/service-accounts-create
- Create/delete service account keys: https://cloud.google.com/iam/docs/keys-create-delete
- Google Drive folder docs: https://developers.google.com/workspace/drive/api/guides/folder
- Google Drive upload docs: https://developers.google.com/drive/api/v3/manage-uploads
- Netlify env variables: https://docs.netlify.com/environment-variables/get-started/
- Netlify env variables for functions: https://docs.netlify.com/build/functions/environment-variables/
- Node crypto randomBytes: https://nodejs.org/api/crypto.html#cryptorandombytessize-callback

## Security rule

Do not paste the service account JSON or private key into GitHub, chat, screenshots, email, or public docs. Store live secrets only in Netlify environment variables.
