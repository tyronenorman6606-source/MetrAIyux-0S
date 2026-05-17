# Security Model

## What is protected

Authenticator secrets are encrypted before being stored in `localStorage`. The vault key is derived from the user's password through PBKDF2-SHA-256 and used for AES-GCM encryption. Secrets are decrypted only while the vault is unlocked in the current browser session.

## What is not claimed

SkyeBox is not a hardware security key, not a cloud sync system, and not a malware-resistant password manager. A compromised browser, device, extension, or operating system can still observe data after the user unlocks the vault.

## Recovery stance

There is intentionally no password recovery. Exported backups are encrypted with the vault password that was active when the backup was created. Changing the local vault password does not change old backup passwords.

## Clipboard stance

Token and URI copy actions attempt to clear the clipboard after 30 seconds. Browser permissions and operating-system clipboard behavior can prevent or delay that clearing, so this is treated as best-effort only.

## Import stance

Legacy plaintext array imports are supported only to help migrate older builds. New exports remain encrypted. Encrypted backup imports can merge into the current unlocked vault after the backup password is supplied, or replace the local vault record.
