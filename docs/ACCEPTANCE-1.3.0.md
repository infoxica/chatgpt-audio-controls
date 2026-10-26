# v1.3.0 acceptance

Record date, tester, browser/manager versions, candidate commit and ZIP SHA-256 with each live result. A controlled fixture pass is not live acceptance. All non-Mac fields in `config/acceptance.json` must be true for publishing.

## Candidate installation

Build with `bun install --frozen-lockfile`, `bun run build`, and `bun run package`. Load `dist/` as an unpacked extension in separate Chrome and Edge profiles. Disable the store copy while testing to avoid duplicate players. Install `userscript/chatgpt-audio-controls.user.js` in Tampermonkey separately, with the extension disabled.

## Windows Chrome, Windows Edge, and Tampermonkey

- [ ] Start native Read Aloud on a completed response. No injected response button appears.
- [ ] Pause at a known time and resume three times. Position and duration survive, sound and time advance, and only one source plays.
- [ ] Pause immediately while loading; rapidly toggle; verify final intent is honored. Try a long response, new-response playback and conversation navigation.
- [ ] Seek before/after pause, set speed and volume, mute/unmute and download. Confirm the download belongs to the active response. A rejected/revoked source gives recovery guidance and does not claim playback succeeded.
- [ ] Check wide and narrow windows, expanded composer, sidebar open/closed, embedded writing editor, scrolling, dark/light/accent themes and actual browser zoom at 100%, 125%, 150%. Two rounded capsules remain separate and do not cover composer, Send or Voice.
- [ ] Keyboard shortcuts use the same controller, work outside inputs and do not steal typing. Test hide/show command and both visibility settings in the extension.
- [ ] Upgrade old preferences; speed, volume, language and other settings survive while obsolete inline-button values are ignored.
- [ ] Popup Help sits beside Dashboard, keyboard focus reaches both, first-use guidance can be dismissed without an empty block, and About/options feedback links open the localized form.
- [ ] Actual uninstall in isolated Chrome and Edge profiles opens the correct mode, language and version. Skip creates no row.

Native Mac testing: **waived for v1.3.0 by owner; not tested/passed**.

### Owner acceptance — 26 October 2026

The owner confirmed testing the current candidate in Chrome and Tampermonkey, then explicitly confirmed Edge also passed. These confirmations satisfy the three live acceptance flags. Candidate commit: `14254cb`; ZIP SHA-256: `25c54dea7ba4619737667891108b3db12f9756b89b66ba9214c71992b64683b3`. Browser versions and individual scenario results were not supplied, so the granular checklist above is not marked as independently witnessed. Earlier agent-observed Edge playback evidence remains in the release status document.

Subsequent PR review found direct HTTP audio recovery was cancelled by MediaSource cleanup. A regression fixture reproduced the failure in both distributions. Session-owned direct retention now bypasses the streaming interceptor, keeps its own cancellation/60-second timeout, and passes resume-position, duration and exact-download checks. All 18 extension/userscript browser tests and 22 unit tests passed after the fix. Updated ZIP SHA-256: `30eb7621dc7a8abbb6f64729a3feffcfcfd4ba93360593607fd66ea57e7aa90a`. Owner confirmations above predate this narrow fix and are not relabeled as tests of the new archive.

## Feedback and automated verification

- [x] Staging then production deployed in the confirmed Cloudflare account; real Turnstile submissions persisted to D1.
- [x] Existing Google URL serves the transition; no further spreadsheet writes.
- [x] Controlled tests cover no default selection, both modes, 17 locales, note limit, Skip/no-write, validation/origin/body limits, challenge rejection, concurrent duplicate persistence, changed-ID conflict, lost reply retry and database outage.
- [x] Complete typecheck, unit, extension/userscript browser fixtures, website checks, Worker dry run, release-policy tests and ZIP validation on candidate `14254cb`: CI run `40318614229` passed; website run `40318614223` passed its build/checks. Recheck after any release changes.
- [x] GitHub Pages deployed from develop `f53444d` in run `40327347760` on 26 October. All 85 localized HTML pages match the verified build except the generated modification timestamp; both new screenshot assets match byte-for-byte. Live Edge verified help/privacy content and the Analytics preferences / No thanks interaction. Feedback `/health` reports `ok: true` in Edge.

## Publication record

| Milestone | Status | Evidence |
| --- | --- | --- |
| Feature → develop review | Merged | PR #20 merged 26 October; develop CI run `40325056147` passed |
| Tested candidate hash | Recorded | SHA-256 above; final publication artifact must also be verified |
| Chrome live acceptance | Owner confirmed | 26 October 2026, current candidate |
| Edge live acceptance | Owner confirmed | 26 October 2026, current candidate |
| Tampermonkey live acceptance | Owner confirmed | 26 October 2026, current candidate |
| Website deployment | Verified | Pages run `40327347760`; live checks above |
| Develop → master review | Pending | |
| GitHub assets | Not published | |
| Chrome submission | Not submitted | |
| Chrome public availability | Not verified | |
| Edge submission | Not submitted | |
| Edge public availability | Not verified | |
| 24-hour review | After launch | |
| Seven-day review | After launch | |
