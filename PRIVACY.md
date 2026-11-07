# Privacy Policy

Last updated: 3 November 2026

ChatGPT Audio Controls provides local playback controls for audio you choose to play with ChatGPT’s native Read Aloud button. It does not collect conversations, audio, browsing history, installation identifiers, or automatic diagnostics. The extension contains no analytics or remote executable code.

## Playback and preferences

Audio is retained temporarily in browser memory to preserve paused sessions and support seeking and downloads. The extension may fetch the active, already-authorized ChatGPT media URL. It does not upload the audio. Replacing the session or closing the page releases retained media.

Speed, volume, shortcuts, language, theme and visibility preferences use browser storage. Chrome/Edge sync may synchronize these preferences when enabled. The standalone userscript uses local browser storage. Page access is limited to ChatGPT; it detects media and composer geometry without reading conversation text for feedback.

The extension requests `storage` for preferences and ChatGPT site access for its player. It adds no duplicate response button.

## Optional reviews and contributions

The extension keeps an aggregate listening-use count and review/support reminder preferences on this device only. A use qualifies after 20 seconds of advancing playback, or natural completion of a shorter clip. The local record contains the count, whether reminders are enabled, request/dismissal status, and scheduling times and thresholds. It is not synced or sent to us. Temporary session deduplication uses in-memory browser session storage and is cleared by the browser; it is not an installation or account identifier. The userscript uses local storage and browser locks instead.

You can turn off automatic requests with **Show review and support reminders**, dismiss each request permanently, or choose one later reminder. Resetting playback or layout preferences does not reset those choices. No conversation text, audio, chat addresses, browsing history, or individual listening-session history is stored for these reminders.

Donation and review buttons open GitHub Sponsors, PayPal, or the relevant browser store only when you choose them. The selected payment provider handles its own account and billing information; this extension does not process payments or learn whether you donated or submitted a review. Opening either payment provider retires the same donation request. Privacy protections and all features remain available regardless of contributions. These links add no extension telemetry. Optional website click measurement is described below.

## Voluntary feedback

The popup About tab and settings dashboard link to [our feedback form](https://chatgpt-audio-controls.infoxica.com/feedback), hosted on a Cloudflare Worker. Uninstall opens the same form in uninstall mode. Opening, skipping, or closing it creates no feedback record. Sending is optional and requires an explicit action. The form stores your appearance choice locally in your browser; it follows your system theme unless you choose Light or Dark.

A submission stores a randomly generated submission ID, server timestamp, installed/uninstall source, selected category or reason, optional feature and symptom choices, optional comment (maximum 1,000 characters), language, extension version, coarse browser and OS family, and form version in a private Cloudflare D1 database. The submission ID is for retry deduplication, not an installation identifier. There is no name, email, attachment or contact field. Please do not put personal information, conversations or audio in comments.

Cloudflare Turnstile prevents automated submissions. Cloudflare processes network and browser signals for security as described in its [privacy policy](https://www.cloudflare.com/privacypolicy/). Our feedback application does not store IP addresses, user-agent strings, challenge tokens or fingerprints. Application logs contain operational outcomes only, not answers or tokens. Authorized project owners can query and export feedback using authenticated Cloudflare tooling. Feedback is retained until the owner deletes it; v1.3.0 introduces no automatic deletion schedule.

Older installations may visit a Google Apps Script transition page that links to the Worker. The transition code does not accept or write survey answers to a spreadsheet.

## Public website

Google Analytics loads only after website consent, measures website visits and store-link clicks, and can be disabled with Analytics preferences. With that consent, website PayPal buttons also record a support-link click containing only the provider, predefined amount, currency, page locale, and predefined placement. These events do not identify payments or confirm contributions. PayPal links go directly to PayPal without tracking parameters or redirects. The extension and feedback form do not use Google Analytics.

## Contact and source

Privacy questions: [GitHub issues](https://github.com/infoxica/chatgpt-audio-controls/issues). Do not post sensitive information publicly. Source: [repository](https://github.com/infoxica/chatgpt-audio-controls).

This is an independent project, not affiliated with or endorsed by OpenAI. ChatGPT is a trademark of OpenAI.
