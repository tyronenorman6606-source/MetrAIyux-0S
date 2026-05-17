# ConnectLog v7.1 Card Variant Upgrade Ledger

## Implemented

✅ Added a local multi-card exchange model through `profileCards`, `activeProfileCardId`, and `META_PROFILE_CARDS`.

✅ Preserved backward compatibility with the previous single `exchange-profile` record by importing it as the first card variant when no card collection exists.

✅ Added active-card selection so the chosen card controls ConnectLog QR, phone-contact QR, vCard download, copied app link, and shareable card HTML.

✅ Added card variant management UI with create, duplicate, delete, edit, use, ConnectLog QR, and phone QR actions.

✅ Added per-card welcome messages. These messages are carried into ConnectLog imports, saved contact notes, vCard `NOTE`, downloaded phone contacts, and shareable HTML cards.

✅ Added card photo upload. Images are processed locally in-browser, resized into full-card and thumbnail data URLs, previewed in the profile dialog, and stored in IndexedDB-backed card data.

✅ Added photo-backed avatars for exchange summaries, card variants, and imported contact records.

✅ Added vCard photo serialization through `PHOTO;ENCODING=b;TYPE=...` for downloaded vCards and safe thumbnail use in phone-contact QR when the payload remains scan-safe.

✅ Added ConnectLog QR compact photo support when the generated thumbnail fits the QR payload limit.

✅ Added a central menu minimize/expand control with persisted local state.

✅ Fixed a duplicate `companyInput` ID issue in `app.html` while upgrading the contact form.

✅ Expanded the smoke check so the new card/photo/welcome/menu surfaces are verified by ID and implementation-string proof.

## Honest limits

☐ Phone-contact QR does not automatically send SMS/email after a phone saves a vCard because that requires user permission or an OS-level share action; owned app conversations route through Relay13.

☐ Phone-camera QR codes have real payload limits. The app includes the welcome message in the phone QR and only includes the card photo when the compact thumbnail keeps the QR payload safe. Full-photo contact export is handled by downloadable `.vcf` and card HTML.

☐ Photos are stored in browser IndexedDB. Users should export JSON backups if they need to preserve cards across device/browser resets.

## Proof command

```bash
npm run check
```

Expected result:

```text
ConnectLog v7.1 card-variant flow smoke checks passed.
```
