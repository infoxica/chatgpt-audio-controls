# Website discovery audit

Scope: the public extension website and its documentation. This site has no
login system, agent registration service, MCP server, or A2A agent. The optional
homepage statistics use a public, read-only JSON endpoint.
The private feedback service is separate and is not an agent-facing API.

## Implemented and locally verifiable

The website build generates robots.txt, a 335-page canonical sitemap with language
alternates, llms.txt, Markdown versions of every page, and an install skill with
a SHA-256 digest calculated from the published bytes.

The owner selected **allow search, AI answers, and AI training**. Explicit crawler
groups allow all public paths and declare `search=yes, ai-input=yes, ai-train=yes`.
Current crawler names and the scanner's legacy names are included. Empty Disallow
rules intentionally exclude nothing; the built site contains only public pages
and assets. Content Signals are preferences, not access controls or a guarantee
that every crawler implements them.

`bun run dev:site` serves only `site-dist` on loopback port 4178, including root
aliases `/robots.txt`, `/sitemap.xml`, and `/llms.txt`. HTML is the default. Requests
with an explicit preferred `Accept: text/markdown` receive generated Markdown
with `Content-Type: text/markdown; charset=utf-8` and `Vary: Accept`. Quality-zero
Markdown and a higher HTML preference are respected. HEAD has the same headers
without a body. No guessed token count is returned.

HTML and Markdown page responses advertise actual resources with RFC 8288 Link
headers using `alternate` and `describedby`. They do not advertise an API catalog.
The preview disables analytics and uses relative navigation for tunnel visitors;
canonical URLs and sitemap entries continue to identify the production website.

Run `bun run test:site-http` to check status codes, content types, negotiation,
discovery links, preview analytics, and rejected paths against a real HTTP server.

## Production hosting boundary

The website targets the root of `https://chatgpt-audio-controls.infoxica.com/`
through Cloudflare Worker static assets. `/feedback`, `/api/*`, and `/health`
remain explicit Worker routes; private forms are never cached as public assets.
The root robots file and sitemap cover all 335 public localized pages.

The website Worker negotiates the Markdown mirror and sets Link and Vary headers
on public pages. Cloudflare security rules run before Worker code. On November 4,
2026, a security event for the production sitemap identified the custom rule
**Block HTTP/1.1 Traffic**. An exception for public GET/HEAD requests on the
website hostname restored HTTP/1.1 access. The production sitemap parsed with
335 entries and robots.txt returned 200. Search Console accepted resubmission.
The next successful Google read, indexing and the Worker deployment need
separate evidence. See [deployment and rollback](../docs/WEBSITE-RELEASE.md).

## Remaining checklist items

| Finding | Disposition |
| --- | --- |
| AI crawler rules and Content Signals | Generated with the owner's explicit allow-search, allow-inference, allow-training policy. Local HTTP checks cover the output; production root deployment remains pending. |
| DNS-AID and DNSSEC | No agent endpoint to advertise, no agent service is supplied by this website. An owned hostname alone does not create an agent endpoint; DNSSEC policy remains a separate domain-owner concern. |
| API catalog | The statistics endpoint has no published OpenAPI catalog. |
| OAuth/OIDC discovery | Not applicable: this website is not an authorization server. |
| OAuth protected-resource metadata | Not applicable: no protected website API. |
| auth.md | Not applicable: no agent registration or credentials. |
| MCP server card | Not applicable: no MCP server or transport endpoint. |
| Agent skills index | The build publishes the install and playback instructions at `/.well-known/agent-skills/chatgpt-audio-controls/SKILL.md`; index.json and llms.txt link to discovery resources. |
| WebMCP | Not implemented: current website actions are standard navigation/store links, not an agent tool interface. Creating one would be a new feature. |
| ARD capability catalog | Installation instructions use the agent-skills index. |

The linked scanner skills were reviewed on 2026-09-08. They describe implementations
for sites that provide the corresponding capabilities; not every missing service
is a website defect. Notably, the current WebMCP skill uses `registerTool()`, while
the pasted report refers to `provideContext()`; any future integration needs a
fresh API compatibility check.

## Sources

- [Robots skill](https://isitagentready.com/.well-known/agent-skills/robots-txt/SKILL.md)
  and [RFC 9309](https://www.rfc-editor.org/rfc/rfc9309)
- [Sitemap skill](https://isitagentready.com/.well-known/agent-skills/sitemap/SKILL.md)
  and [Sitemaps protocol](https://www.sitemaps.org/protocol.html)
- [Link-header skill](https://isitagentready.com/.well-known/agent-skills/link-headers/SKILL.md)
  and [RFC 8288](https://www.rfc-editor.org/rfc/rfc8288)
- [Markdown skill](https://isitagentready.com/.well-known/agent-skills/markdown-negotiation/SKILL.md)
  and [Cloudflare Markdown for Agents](https://developers.cloudflare.com/fundamentals/reference/markdown-for-agents/)
- [GitHub Pages hosting](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages)
