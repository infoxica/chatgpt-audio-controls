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

## Feedback and automated verification

- [x] Staging then production deployed in the confirmed Cloudflare account; real Turnstile submissions persisted to D1.
- [x] Existing Google URL serves the transition; no further spreadsheet writes.
- [x] Controlled tests cover no default selection, both modes, 17 locales, note limit, Skip/no-write, validation/origin/body limits, challenge rejection, concurrent duplicate persistence, changed-ID conflict, lost reply retry and database outage.
- [ ] Complete typecheck, unit, extension/userscript browser fixtures, website checks, Worker dry run, release-policy tests and ZIP validation on the final candidate.
- [ ] Deploy reviewed GitHub Pages content and verify help/privacy, links, localization and consent behavior live.

## Publication record

| Milestone | Status | Evidence |
| --- | --- | --- |
| Feature → develop review | Pending | |
| Final candidate hash | Pending | |
| Chrome live acceptance | Pending | |
| Edge live acceptance | Pending | |
| Tampermonkey live acceptance | Pending | |
| Website deployment | Pending | |
| Develop → master review | Pending | |
| GitHub assets | Not published | |
| Chrome submission | Not submitted | |
| Chrome public availability | Not verified | |
| Edge submission | Not submitted | |
| Edge public availability | Not verified | |
| 24-hour review | After launch | |
| Seven-day review | After launch | |
