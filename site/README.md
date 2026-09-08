# Official website

For an interactive preview, run `bun run build:site` then `bun run dev:site`.
The server listens at `http://127.0.0.1:4178/` and supports
root discovery files, Link response headers, and Markdown content negotiation.
Use `cloudflared tunnel --url http://127.0.0.1:4178` to share this preview.
See [the discovery audit](AGENT-DISCOVERY.md) for local checks, production hosting
requirements, and the applicability of API/agent scanner findings.

Build 85 static pages across 17 locales with `bun run scripts/build-site.ts`. Output is
written to `site-dist` and excluded from extension packages. GitHub Pages uses
the separate website workflow.

The website uses React 19 and Radix UI primitives for the language Select,
FAQ Accordion, and theme Toggle. Shared React buttons use Radix Slot for link
composition. Components live in `site/components.tsx` and use the extension's
visual theme instead of a library's default styling.

The build pre-renders the controls and all page content, including FAQ answers.
`site/client.tsx` hydrates only the header controls, FAQ, and consent banner.
Vite bundles their dependencies into `assets/site.js`; each page embeds only
its own translated props. No runtime application server is required. Analytics
loads only after consent, and website dependencies stay outside extension bundles.

Each locale includes the homepage, `guide/`, `installation/`, `userscript/`, and `glossary/`.
Guide pages use the shared page shell and React `GuidePage` component, with copy
in `site/guide-copy.json`. Language switching keeps the current guide route.
Canonical URLs, reciprocal language alternates, and sitemap entries cover every
page. The homepage's lower sections use the same container width as Dashboard.

Installation instructions are kept on the site; outbound links lead to stores,
release downloads, or prerequisite tools. The unpacked workflow follows the
[Chrome setup guide](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world)
and [Edge sideloading guide](https://learn.microsoft.com/en-us/microsoft-edge/extensions/getting-started/extension-sideloading).
Userscript permission guidance follows [Tampermonkey Q209](https://www.tampermonkey.net/faq.php?locale=en&q=Q209),
checked on 2026-09-08. Do not imply new extension/userscript feature parity.

The visual language follows the extension: charcoal surfaces, subtle borders,
rounded controls, system typography, and restrained blue accents. Light mode
uses the extension's white and gray palette. Appearance is saved locally,
independently of analytics consent. The hero shows the existing product
screenshot. Keep the independent-project attribution visible; this is an
Infoxica project, not an OpenAI product or official OpenAI website.

All interface icons use the existing `lucide-react` dependency, rendered to
inline SVG in React components. This includes link arrows and FAQ disclosure icons.
Brand artwork, store badges, screenshots, and written key labels retain their
original presentation. Only the icons used by interactive components are included
in the browser bundle; no icon CDN is used.

## Store badges

Use the same official artwork as the repository README, copied unchanged by
the build:

- Chrome: `assets/HRs9MPufa1J1h5glNhut.png`, following the
  [Chrome Web Store branding guidelines](https://developer.chrome.com/docs/webstore/branding).
- Microsoft Edge: `assets/English_Get it from Microsoft Edge.png`, following the
  [Microsoft Edge Add-ons badge guidelines](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/add-ons-badge).

Each badge links directly to the corresponding extension listing. Preserve
the entire image and its aspect ratio, colors, text, and border. Do not apply
filters, shadows, animation, or transforms. Both badges have equal display
heights, 48px in the desktop hero/footer and 44px on mobile and in setup,
above Microsoft's 32px minimum.
Leave at least one quarter of the badge height clear on every side. Accessible
link names are localized; the supplied English artwork remains unchanged.

## Checks

`bunx playwright test tests/browser/site-survey.pw.mjs` checks website consent,
store click attribution, theme persistence, badge proportions, and all 17 mobile
layouts. It also checks React hydration, keyboard navigation, accordion states,
language selection, and the existing survey interactions.

Additional website copy lives in `site/copy.json`; the build requires all 17
locales. Feature descriptions and consent copy reuse the extension's translated
catalog. Keep review links separate from installation links so review visits
do not inflate `store_link_click`. Chrome links directly to its reviews page;
Microsoft Edge links to the listing's `review-section` anchor. Both destinations
were checked against the stores' visible UI on 2026-09-08.

## Navigation and discovery

The desktop header uses Radix Navigation Menu for hover-open Product, Guides,
and Support panels, with two-column links, Lucide icons, and localized descriptions.
The grouped mobile menu uses Radix DropdownMenu. All destinations are also ordinary
server-rendered footer links, including when JavaScript is unavailable. Navigation
labels and the OpenAI trademark/copyright ownership disclaimer cover all 17 locales
in `site/navigation-copy.json`.

The build also generates:

- `sitemap.xml`: 85 canonical HTML pages, each with reciprocal language alternates
  and an English `x-default`. No invented modification dates.
- `index.md` alongside every HTML page: readable Markdown derived from the same
  visible content, with its original URL and language. HTML advertises Markdown
  using an alternate link.
- `llms.txt`: a concise factual project index linking to documentation, translations,
  source, and stores. HTML links to it with `rel="describedby"`.
- Organization, WebSite, WebPage, and homepage SoftwareApplication structured data;
  guide breadcrumbs match visible navigation. No fabricated ratings or release status.
- Canonical/hreflang links, social preview metadata, and explicit index/snippet directives.

`llms.txt` follows the [emerging proposal](https://llmstxt.org/); it is not a search
ranking guarantee or a prerequisite for AI search. [Google's AI search guidance](https://developers.google.com/search/docs/appearance/ai-features)
continues to emphasize accessible, useful content and ordinary SEO practices.

The generated `robots.txt` includes the sitemap URL, but a project-path file does
not control crawling: robots rules must be hosted at the origin root,
`https://infoxica.github.io/robots.txt`. Managing that root file and Search Console
sitemap submission remain deployment tasks. Do not add the uninstall survey to
this sitemap. Search indexing and AI citations require separate live verification.

## Expanded context and scanner follow-up

`llms-full.txt` contains the complete main content of all 85 HTML pages, including
all 17 languages. `sitemap.md` groups links by language and page hierarchy.
Both are linked from `llms.txt`. Markdown pages include YAML frontmatter with
quoted title, description, canonical URL, language, and modification time.
Alongside directory `index.md` files, aliases such as `guide.md`, `ja.md`, and
`ja/glossary.md` support scanners that append `.md` to a route.

Sitemap `lastmod`, Markdown frontmatter, and WebPage `dateModified` use the latest
relevant source commit timestamp, or a later actual local edit timestamp for
uncommitted source changes. Website CI fetches full history. A rebuild alone does
not advance the date. The shared template/catalog timestamp is conservative: a
shared change can affect every localized page. Never use deployment time as a
substitute for content modification time.

Every page allows `max-snippet:-1` and `max-image-preview:large`. These permit
preview sizes; Google still chooses the actual presentation. WebPage links to
its BreadcrumbList using the schema.org `breadcrumb` property, with absolute
identifiers. Badge dimensions come from the original assets, and the language
selector's accessible name includes its selected language.

The preview now serves navigation at `/`, `/guide/`, `/installation/`, and locale
paths without the project prefix. Old prefixed URLs redirect to the short paths.
Only navigation and asset URLs are rewritten; canonical, social, and structured
data identity URLs remain absolute production URLs. Removing the prefix from
the production GitHub Pages project requires a custom domain or a root-site
hosting change. The README Agent Ready badge is the user-supplied temporary
`tunnel` scan target, not a claim about production acceptance; update its target
when a permanent hostname is chosen.

The glossary provides real playback explanations. Text-to-HTML ratio is retained
as a diagnostic, not a content target: the page keeps server-rendered text,
accessible UI, and clean Markdown representations without padding the copy.

Desktop mega menus open after a short hover delay, keep pointer travel into the
panel usable, and switch groups without clicking. Enter/Space open a trigger,
Arrow Down enters its links, and Escape dismisses the panel and restores trigger
focus. Motion is disabled when reduced motion is preferred.

Desktop language switching uses the same Radix Navigation Menu pattern as the
main header: four columns on wide screens and three on narrower desktop screens.
Mobile retains the Radix Select. Every Support link has a short localized summary
in `site/navigation-copy.json`.

Page Markdown frontmatter includes `last_updated` alongside `lastmod`, derived
from the same source modification timestamp. Each page includes a `## Sitemap`
section. The preview reads the canonical HTML URL from generated frontmatter and
returns it in a `Link` header with `rel="canonical"`, including on `.md` aliases.
These response headers still need a supported production host/proxy.
