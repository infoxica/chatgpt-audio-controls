# Verified CRX Uploads assessment — 2026-10-30

**Recommendation:** enable Chrome Verified CRX Uploads only after signing, key custody and recovery are ready. Do not enable it as part of this UI release. No signing key was created or enrolled and no store setting was changed.

Chrome's optional verification adds an independent signing requirement to future package uploads. An attacker with store-account access alone should not be able to replace the package without the signing key. This supplements account security; it does not validate extension behavior or replace store review.

## Current incompatibility

`.github/workflows/release.yml` and `scripts/publish-chrome.sh` upload a ZIP with the Chrome publishing credentials. Enabling verification before changing this workflow would block subsequent uploads. Edge continues to need its existing ZIP artifact; the userscript remains separate. Do not replace either with a CRX.

## Required enrollment preparation

1. Generate the RSA key in a controlled owner environment, record its public-key fingerprint, and keep the private key out of the repository, build artifacts, logs and the Google account used for publishing.
2. Keep an encrypted offline backup with a documented custodian and restoration check. A lost key requires Chrome Web Store support recovery and can delay updates; this is not an instant self-service rollback.
3. Create a Chrome-only signed CRX artifact from the reviewed build. Verify the CRX signature, enrolled-key fingerprint, packaged manifest version and payload against the corresponding ZIP before upload. Preserve the existing store item identity.
4. If CI signs packages, use a protected release environment and a separate signing secret, restricted to reviewed release jobs. Do not expose it to pull-request jobs or retain the temporary key after the job. Separate publishing credentials from signing-key custody wherever practical.
5. Update Chrome upload handling for signed CRX data, including `X-Goog-Upload-Protocol: raw` and a `.crx` upload filename. Keep Edge ZIP publication independent. Rehearse failure handling before opting in.
6. Owner enrollment of the public key is a separate production action. After enrollment, verify a signed upload through the store and record acceptance; a successful local signature check alone is insufficient.

This is an assessment, not a new signing implementation. The authoritative enrollment, key-generation and upload instructions are [Chrome's package update protection guide](https://developer.chrome.com/docs/webstore/update#protect-package-updates); recheck them at enrollment time.
