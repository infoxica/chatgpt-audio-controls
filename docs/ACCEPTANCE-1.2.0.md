# v1.2.0 release acceptance

The candidate ZIP is for acceptance testing until every required flag in `config/acceptance.json` is supported by recorded evidence. Record browser/OS versions, candidate commit or ZIP SHA-256, date and result. Store review acceptance and public availability are separate milestones.

## Native Mac check (owner's friend)

1. Unzip the candidate and load the folder containing manifest.json using the browser's extension developer mode. Use a test profile.
2. On chatgpt.com, start native Read Aloud on a completed answer. Check playback, pause/resume, seeking, speed, volume and downloading. Pausing must keep controls available.
3. Check 1280×800 and a narrow browser window, plus 125%/150% zoom. Compact controls must fit above the composer. Verify the native voice and Send controls keep their original appearance and behavior.
4. While typing in the composer, press Option+Shift+Y. Controls should toggle without changing your text or stopping audio. Check with no audio too.
5. In the popup/options, confirm Option labels, the assigned visibility shortcut and customization link. Reassign or remove that command in browser shortcut settings, return to the popup, and verify its actual assignment or unassigned state.
6. Outside text fields, check Space/K, Option+P, Option+Left/Right and Shift+Comma/Period. Cmd and Ctrl combinations, IME composition and normal typing must remain unaffected. Disable shortcuts and verify both playback keys and visibility command stop acting.
7. Test both visibility modes across two ChatGPT tabs. Only the idle bubble should disappear in idle-only mode; all mode hides the player too. Popup Show must restore access.

Report Chrome and Edge results separately. A Windows test that imitates a Mac key event is not native Mac acceptance.

## Live browser and survey checks

- Test English and Vietnamese user experiences plus Japanese native ChatGPT controls, independently of the selected extension language.
- Check long responses, navigation to another conversation, browser zoom, wide layout, compact layout and repeated playback/download errors.
- Inspect normal extension network activity: no GA4 or feedback requests. Do not record conversations in evidence.
- After production URL setup, actually uninstall from isolated Chrome and Edge profiles. Verify language, version, coarse browser/OS and anonymous survey access.
- Exercise all eight reasons, no default choice, blank optional note, 1,000-character maximum, language switching, Skip and closing without submitting.
- Confirm real private Sheet writes, literal formula-like comments, duplicate-click/retry handling, preserved answers on failure, and no false success.
- Remove only deliberately created test response rows after recording their request IDs and results. Never include test rows in production feedback statistics.

## Website, console and publishing checks

- Verify all 17 deployed routes, canonical and reciprocal hreflang, sitemap and crawlable metadata. The survey is excluded from indexing and sitemap.
- Verify the actual GA4 property belongs to the designated project owner using private release records. Confirm accepted page views and store_link_click events with locale/store/placement. Rejecting consent must cause no GA requests. Withdrawing consent must disable future measurement.
- Verify both store links, Chrome campaign tags, existing store install event and key-event setup, Search Console ownership and sitemap submission.
- Apply the localized store descriptions and official/privacy URLs through each console. Metadata APIs do not update every listing field. Advertise v1.2.0 features only when available in the relevant store.
- PR #8 and subsequent feature/release PRs require review. Follow develop → master. Do not bypass branch protection to make a release appear complete.
- Qualifying master version increases create GitHub assets and independently submit Chrome/Edge. Same-version docs/site commits do not resubmit. Manual retries select Chrome, Edge or both.
- Edge is fixed only after package processing AND submission succeed. Record publication URLs/version separately after certification.

## 7- and 28-day follow-up after public availability

Use matched periods and the preserved Chrome/GA4 exports in the private local baseline folder. Compare acquisition, installs/uninstalls, installed users by version, website/search visits and store clicks, plus voluntary survey reason distributions. Do not sum overlapping exports or call install events retained users. Missing acquisition or version exports remain missing rather than inferred. Multiple features ship together, so do not attribute changes to a single feature without additional evidence.
