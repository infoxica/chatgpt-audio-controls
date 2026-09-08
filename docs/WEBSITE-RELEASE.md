# Website launch with v1.2.0

The official website is part of the v1.2.0 release. Its deployment is separate
from extension packaging and store submission so the permanent links can be
verified before users receive them in the extension.

Production URL: https://infoxica.github.io/chatgpt-audio-controls/

## Initial setup and publication

1. Merge the website follow-up PR into develop after its checks and review pass.
2. Configure repository Pages to use GitHub Actions. The github-pages environment
   must permit the reviewed develop and master branches; preserve required
   reviewers and any existing deployment protections.
3. For the initial launch, ensure `.github/workflows/pages.yml` exists on the
   default branch before using workflow_dispatch. If master does not contain it
   yet, promote a dispatch-only copy of this workflow through a reviewed bootstrap
   PR to master: omit its push and pull_request triggers until master contains the
   site sources. Dispatch it against develop, where those sources exist. Keep the
   extension version unchanged in that bootstrap PR. Do not merge the
   unaccepted extension release just to make the website workflow available.
4. Run the Official website workflow against develop with publish_website=true:

   ```sh
   gh workflow run pages.yml --ref develop -f publish_website=true
   ```

   This builds and tests the site, then deploys only the site-dist artifact.
   A dispatch without explicit publication only builds. Feature-branch and PR
   jobs cannot deploy. Ordinary master website changes continue to deploy
   automatically. This workflow never submits an extension to either store.
5. Record the workflow run, deployed source commit, actual URL and live results.
   A successful build or enabled Pages setting alone is not a deployment.

## Live acceptance before store submission

- Check all 85 HTML routes, images, mobile navigation, desktop language menus,
  on-site guides, store/review links and the permanent privacy section.
- Check canonical URLs, reciprocal language alternates, XML sitemap freshness,
  Markdown mirrors, llms.txt, llms-full.txt and sitemap.md on the deployed site.
- Verify analytics stays off after rejection and loads only after acceptance;
  verify actual page-view/store-click receipt and withdrawal. Keep account IDs,
  credentials and screenshots containing private account data out of the repo.
- Complete Search Console verification and submit the production sitemap.
- Set websiteDeployment=true only after recording real acceptance evidence.
  All feedback, live browser and native Mac requirements still apply before
  promoting the extension to master and submitting the stores.
- Publish localized store website/privacy links only after their destinations
  work. Describe features according to each store's actual available version.

## Hosting boundaries

GitHub Pages publishes this project below /chatgpt-audio-controls/. The local
preview's short root URLs do not change that production address. An origin-root
robots.txt requires the separate infoxica.github.io root site; a project-path
robots.txt does not control crawling. A custom domain or root-site change is
required to remove the project prefix permanently.

GitHub Pages does not run the Python preview server. Its negotiated Markdown and
custom Link response headers require a supporting production host/proxy; static
Markdown files and HTML discovery links remain available on Pages. Do not claim
those preview-only HTTP checks as production acceptance.

See [GitHub Pages configuration](https://docs.github.com/en/rest/pages/pages#create-a-github-pages-site)
and [workflow dispatch requirements](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_dispatch).
