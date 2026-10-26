# Privacy Policy

Last updated: 26 October 2026

ChatGPT Audio Controls provides local playback controls for audio you choose to play with ChatGPT’s native Read Aloud button. It does not collect conversations, audio, browsing history, installation identifiers, or automatic diagnostics. The extension contains no analytics or remote executable code.

## Playback and preferences

Audio is retained temporarily in browser memory to preserve paused sessions and support seeking and downloads. The extension may fetch the active, already-authorized ChatGPT media URL. It does not upload the audio. Replacing the session or closing the page releases retained media.

Speed, volume, shortcuts, language, theme and visibility preferences use browser storage. Chrome/Edge sync may synchronize these preferences when enabled. The standalone userscript uses local browser storage. Page access is limited to ChatGPT; it detects media and composer geometry without reading conversation text for feedback.

The extension requests `storage` for preferences and ChatGPT site access for its player. It adds no duplicate response button.

## Voluntary feedback

The popup About tab and settings dashboard link to [our feedback form](https://chatgpt-audio-controls.infoxica.com/feedback), hosted on a Cloudflare Worker. Uninstall opens the same form in uninstall mode. Opening, skipping, or closing it creates no feedback record. Sending is optional and requires an explicit action. The form stores your appearance choice locally in your browser; it follows your system theme unless you choose Light or Dark.

A submission stores a randomly generated submission ID, server timestamp, installed/uninstall source, selected category or reason, optional comment (maximum 1,000 characters), language, extension version, coarse browser and OS family, and form version in a private Cloudflare D1 database. The submission ID is for retry deduplication, not an installation identifier. There is no name, email, attachment or contact field. Please do not put personal information, conversations or audio in comments.

Cloudflare Turnstile prevents automated submissions. Cloudflare processes network and browser signals for security as described in its [privacy policy](https://www.cloudflare.com/privacypolicy/). Our feedback application does not store IP addresses, user-agent strings, challenge tokens or fingerprints. Application logs contain operational outcomes only, not answers or tokens. Authorized project owners can query and export feedback using authenticated Cloudflare tooling. Feedback is retained until the owner deletes it; v1.3.0 introduces no automatic deletion schedule.

Older installations may visit a Google Apps Script transition page that links to the Worker. The transition code does not accept or write survey answers to a spreadsheet.

## Public website

The public website remains on GitHub Pages. Google Analytics loads only after website consent, measures website visits and store-link clicks, and can be disabled with Analytics preferences. The extension and feedback form do not use Google Analytics.

## Contact and source

Privacy questions: [GitHub issues](https://github.com/infoxica/chatgpt-audio-controls/issues). Do not post sensitive information publicly. Source: [repository](https://github.com/infoxica/chatgpt-audio-controls).

This is an independent project, not affiliated with or endorsed by OpenAI. ChatGPT is a trademark of OpenAI.
