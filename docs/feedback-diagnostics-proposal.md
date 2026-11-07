# Optional technical details: review proposal

Status: disabled, documentation only. This proposal does not implement collection, messaging, storage or a manifest change. Merging optional categorical answers must not activate technical attachments. The existing plain feedback form remains the default.

## User flow proposed for ChatGPT Audio Controls

A future explicit troubleshooting setting could enable a local-only, in-memory buffer for the current troubleshooting session. Opening a report does not retrospectively invent events. Turning the setting off, expiry, or ending that session clears the buffer. Nothing is synchronized between devices or sent automatically.

The user may choose to prepare a report from the extension. The extension first sanitizes a snapshot and associates it with a cryptographically random, single-use nonce (at least 128 random bits). It opens https://chatgpt-audio-controls.infoxica.com/feedback with only that nonce in the fragment. The form must immediately remove the fragment from history before loading third-party scripts. The nonce expires within five minutes and is consumed atomically before responding to a successful retrieval. Never put the snapshot or a stable identifier in a URL.

The form explains what technical details contain. Only an explicit Attach technical details action requests the snapshot. The user then sees its complete sanitized contents and can remove it. Send is a separate action; attachment alone never uploads feedback. If transport is unsupported, expired, consumed, or the extension has been uninstalled, show unavailable and preserve the basic form. Never infer runtime state from query parameters.

## Proposed bounded schema

Allow only a versioned object with explicitly enumerated keys. Reject unknown keys, prototype-shaped input, invalid types and values, and more than 4,096 UTF-8 bytes after serialization. Limit events to 20 and the preceding five minutes; use relative timing buckets, never wall-clock activity histories.

| Field | Proposed allowance |
| --- | --- |
| Environment | Extension version, reviewed build-channel enum, coarse browser/OS; browser major only if disclosed |
| Host | A fixed chatgpt.com enum; no arbitrary hostname, URL, path, query, fragment or conversation identifier |
| State | Allowlisted feature/state and last-action enums only |
| Events | media_detected, ui_mount_failed, seek_requested, download_failed |
| Error | A small source-defined error-code enum; no message, stack or console text |
| Timing | Coarse relative buckets within the five-minute window |

Never capture conversation text, audio, media URLs, page HTML, arbitrary DOM, raw console output, full stack traces, account details, credentials, fingerprints or installation identifiers. Do not treat anonymous submissions as distinct users. Content-script observations are untrusted even when produced on an allowed host.

## Transport security boundary

Chrome documents external web-page messaging through [message passing](https://developer.chrome.com/docs/extensions/develop/concepts/messaging) and the [externally_connectable manifest key](https://developer.chrome.com/docs/extensions/reference/manifest/externally-connectable). Adding this key changes who can connect and therefore needs its own reviewed implementation. This document adds no manifest entry or listener.

A prototype must use the exact official HTTPS origin above, with an exact /feedback sender path check in the handler. No wildcard origins, arbitrary return URLs, subdomain suffix matching, preview deployments, iframe callers or externally supplied extension IDs. Verify browser-provided sender URL/origin and top-frame identity; do not trust sender information in the message body. Allow one versioned read-snapshot message only. It must not execute commands, access arbitrary storage, open URLs or proxy requests. Retain the existing minimum browser support through explicit Chrome and Edge prototype tests.

The nonce is a short-lived bearer capability, not authentication or proof of consent. A compromised allowed web page can request a prepared snapshot; bound the exposure through minimal data, explicit preparation, short TTL and one-use consumption. Review CSP and script ordering, third-party script access, concurrency, restart behavior, stale tabs, and removal before activation. Do not claim exact-origin checks make a compromised page trustworthy.

## Server and retry boundary

Server validation must independently enforce the same strict schema, byte/event/age limits and an explicit versioned attached-consent assertion. That assertion records the client's declared choice; it is not independent proof of a human click. No attached snapshot without the asserted consent. Removing the attachment removes its consent metadata. Keep attachment size limits independent of the existing 1,000-character optional note.

Document deterministic canonical ordering for the attachment and consent fields before changing payload hashing. Preserve existing v1 bytes and stable retries. Changing, adding or removing an attachment after a failed request rotates the submission ID. Retain explicit Send, origin checks, Turnstile, and same-ID/different-answer conflicts. Any nullable source migration belongs in the later reviewed source PR and must first run against an isolated local fixture; this proposal includes no migration.

## Required evidence before activation

- Owner review of the actual privacy policy, localized form preview/consent copy, retention/deletion behavior, and any required Chrome/Edge store disclosure updates.
- Separate manifest and security review of the implemented transport. No broader host permissions or permission wildcard.
- Chrome and Edge tests for exact origin/path/frame rejection, forged sender fields, replay, concurrent retrieval, expiry, restart, malformed/oversized messages and unavailable extension behavior.
- Tests proving zero upload on open, attach, remove, Skip, close, and uninstall arrival; only explicit Send writes. Local diagnostics remain off without the relevant explicit setting/flow.
- Server rejection tests, Unicode byte boundaries, sanitization tests using fictional sensitive inputs, immutable old-hash fixtures, changed-attachment retries, localized keyboard and RTL/light/dark rendering.
- Honest disclosure and separate authorization before any external model/provider processing. This proposal configures no such processing.

Until those gates have concrete implementation evidence, keep this capability disabled. No store submission, release, remote database mutation or deployment is authorized by this document.
