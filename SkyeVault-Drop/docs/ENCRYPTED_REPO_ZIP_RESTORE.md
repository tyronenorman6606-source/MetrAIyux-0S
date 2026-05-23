# Encrypted Repo ZIP Restore

SkyeVault full-repo backups use two downloads:

1. The encrypted repo artifact, named like `MetrAIyux-0S-full-repo-20260522T234329Z.zip.enc`.
2. The direct restore kit, named like `MetrAIyux-0S-full-repo-direct-restore-kit-20260523T004619Z.zip`.

The `.zip.enc` file is not the final ZIP. It is an encrypted wrapper. The direct restore kit contains the key material and helper script that turns it into the real `.zip`.

## Customer Restore Steps

Download both files into the same folder, then run:

```bash
unzip MetrAIyux-0S-full-repo-direct-restore-kit-20260523T004619Z.zip -d restore-kit

node restore-kit/skyevault-restore-encrypted-zip.mjs \
  --artifact=./MetrAIyux-0S-full-repo-20260522T234329Z.zip.enc \
  --key-file=./restore-kit/MetrAIyux-0S-artifact-key-material.txt \
  --out-dir=./restore-metraiyux-0s \
  --force
```

The helper creates:

```text
MetrAIyux-0S-full-repo-20260522T234329Z.zip
restore-metraiyux-0s/
```

## Manual Restore

```bash
unzip MetrAIyux-0S-full-repo-direct-restore-kit-20260523T004619Z.zip -d restore-kit
cp restore-kit/MetrAIyux-0S-artifact-key-material.txt .

openssl enc -d -aes-256-cbc -pbkdf2 -iter 700000 -md sha256 \
  -pass file:./MetrAIyux-0S-artifact-key-material.txt \
  -in ./MetrAIyux-0S-full-repo-20260522T234329Z.zip.enc \
  -out ./MetrAIyux-0S-full-repo-20260522T234329Z.zip

unzip -q ./MetrAIyux-0S-full-repo-20260522T234329Z.zip -d ./restore-metraiyux-0s
```

## Operator Rules

- Say "encrypted artifact plus direct restore kit"; do not call `.zip.enc` the final ZIP.
- The direct restore kit is sensitive because it unlocks the encrypted artifact.
- Send restore-kit links only through owner-approved short-lived links.
- Keep raw signed URLs and key material out of commits, tickets, public docs, screenshots, and handoffs.
- For normal developer source control, prefer the Git branch/remote lane. Use the encrypted full-repo artifact when the owner needs the complete workspace including ignored and untracked material.
