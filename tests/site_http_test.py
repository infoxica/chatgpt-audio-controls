"""HTTP-level discovery checks against the actual preview handler."""
import importlib.util
import http.client
import json
import re
from datetime import datetime
import threading
import unittest
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

spec = importlib.util.spec_from_file_location('preview_site', Path(__file__).resolve().parents[1] / 'scripts/preview-site.py')
preview = importlib.util.module_from_spec(spec)
spec.loader.exec_module(preview)


class SiteHTTP(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        preview.Preview.log_message = lambda *args: None
        cls.server = preview.ThreadingHTTPServer(('127.0.0.1', 0), preview.Preview)
        cls.origin = f'http://127.0.0.1:{cls.server.server_port}'
        cls.worker = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.worker.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.worker.join()

    def get(self, path, accept=None, method='GET'):
        return urllib.request.urlopen(urllib.request.Request(self.origin + path,
            headers={'Accept': accept} if accept else {}, method=method))

    def test_root_discovery_and_canonical_sitemap(self):
        with self.get('/robots.txt') as response:
            self.assertEqual(response.status, 200)
            self.assertEqual(response.headers.get_content_type(), 'text/plain')
            robots = response.read().decode()
            self.assertIn('User-agent: *', robots)
            for agent in ['GPTBot', 'OAI-SearchBot', 'ClaudeBot', 'Claude-Web', 'Google-Extended']:
                self.assertIn('User-agent: '+agent+'\nAllow: /\nDisallow:\nContent-Signal: search=yes, ai-input=yes, ai-train=yes', robots)
            self.assertNotIn('ai-train=no', robots)
            self.assertIn('Sitemap: ' + preview.CANONICAL + 'sitemap.xml', robots)
        with self.get('/sitemap.xml') as response:
            self.assertEqual(response.headers.get_content_type(), 'application/xml')
            urls = ET.fromstring(response.read()).findall('{http://www.sitemaps.org/schemas/sitemap/0.9}url')
            self.assertEqual(len(urls), 85)
            for url in urls:
                canonical = url.find('{http://www.sitemaps.org/schemas/sitemap/0.9}loc').text
                self.assertTrue(canonical.startswith(preview.CANONICAL))
                self.assertNotIn('127.0.0.1', canonical)
        with self.get('/llms.txt') as response:
            self.assertIn(b'# ChatGPT Audio Controls', response.read())

    def test_html_default_links_and_preview_analytics(self):
        for path in ['/', '/guide/', '/ja/guide/']:
            with self.get(path) as response:
                self.assertEqual(response.headers.get_content_type(), 'text/html')
                self.assertEqual(response.headers['Vary'], 'Accept')
                self.assertIn('rel="describedby"', response.headers['Link'])
                html = response.read().decode()
                self.assertIn('data-ga4=""', html)
                self.assertNotIn('http://127.0.0.1:4178', html)
                locale = 'ja/' if '/ja/' in path else ''
                self.assertIn('href="/'+locale+'installation/"', html)
                self.assertIn('href="https://github.com/infoxica/chatgpt-audio-controls"', html)
                self.assertIn('max-snippet:-1', html)
                schema = json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', html).group(1))
                for node in schema['@graph']:
                    if 'url' in node:
                        self.assertTrue(node['url'].startswith('https://'))
                webpage = next(node for node in schema['@graph'] if node['@type'] == 'WebPage')
                self.assertTrue(webpage['breadcrumb']['@id'].startswith(preview.CANONICAL))

    def test_markdown_negotiation_and_head(self):
        for path in ['/', '/guide/', '/ja/guide/']:
            with self.get(path, 'text/markdown') as response:
                self.assertEqual(response.headers.get_content_type(), 'text/markdown')
                body = response.read()
                self.assertNotIn(b'<!doctype html>', body)
                self.assertIn(b'Source: '+preview.CANONICAL.encode(), body)
                self.assertTrue(body.startswith(b'---\ntitle: '))
                self.assertIn(b'\nlast_updated: "', body)
                self.assertIn(b'\n## Sitemap\n', body)
                self.assertRegex(response.headers['Link'], r'<https://infoxica.github.io/chatgpt-audio-controls/[^>]*>; rel="canonical"')
            with self.get(path, 'text/markdown', 'HEAD') as response:
                self.assertEqual(int(response.headers['Content-Length']), len(body))
                self.assertEqual(response.read(), b'')
        for accept in ['text/markdown;q=0', 'text/markdown;q=0.2,text/html;q=0.9', '*/*']:
            with self.get('/', accept) as response:
                self.assertEqual(response.headers.get_content_type(), 'text/html')
        with self.get('/', 'text/html;q=0.2,text/markdown;q=0.9') as response:
            self.assertEqual(response.headers.get_content_type(), 'text/markdown')

    def test_short_paths_full_context_and_markdown_mirrors(self):
        with self.get(preview.PREFIX+'ja/installation/?test=1') as response:
            self.assertEqual(response.url, self.origin+'/ja/installation/?test=1')
        for path in ['/index.md', '/guide.md', '/ja.md', '/ja/glossary.md', '/sitemap.md']:
            with self.get(path) as response:
                self.assertEqual(response.status, 200)
                self.assertEqual(response.headers.get_content_type(), 'text/markdown')
                self.assertIn('Link', response.headers)
                if path != '/sitemap.md':
                    self.assertIn('rel="canonical"', response.headers['Link'])
        with self.get('/llms-full.txt') as response:
            full = response.read().decode()
            self.assertEqual(full.count('\nSource: '), 85)
            self.assertIn('## ja:', full)
            self.assertIn('## en: Glossary', full)
        with self.get('/sitemap.md') as response:
            sitemap = response.read().decode()
            self.assertEqual(sitemap.count('\n## '), 17)
            self.assertIn('/glossary/', sitemap)
        with self.get('/sitemap.xml') as response:
            dates = ET.fromstring(response.read()).findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}lastmod')
            self.assertEqual(len(dates), 85)
            for date in dates:
                datetime.fromisoformat(date.text.replace('Z', '+00:00'))

    def test_unknown_services_and_path_escape_return_404(self):
        for path in ['/.well-known/api-catalog', '/.well-known/oauth-authorization-server',
                     '/.well-known/mcp/server-card.json', '/auth.md',
                     preview.PREFIX+'%2e%2e/package.json', preview.PREFIX+'%00', '/build/']:
            with self.assertRaises(urllib.error.HTTPError) as error:
                self.get(path)
            self.assertEqual(error.exception.code, 404)

    def test_redirects_cannot_leave_the_preview_origin(self):
        cases = {
            preview.PREFIX + '/example.invalid/path': '/example.invalid/path',
            preview.PREFIX + '%2f%2fexample.invalid/path': '/example.invalid/path',
            '/%2fguide': '/guide/',
            '/chatgpt%2daudio-controls/ja/guide/?test=1': '/ja/guide/?test=1',
        }
        for path, destination in cases.items():
            connection = http.client.HTTPConnection('127.0.0.1', self.server.server_port)
            try:
                connection.request('GET', path)
                response = connection.getresponse()
                self.assertEqual(response.status, 308)
                self.assertEqual(response.headers['Location'], destination)
                response.read()
            finally:
                connection.close()
        for path in [preview.PREFIX + '%5cexample.invalid', preview.PREFIX + '%0d%0aX-Test:bad']:
            with self.assertRaises(urllib.error.HTTPError) as error:
                self.get(path)
            self.assertEqual(error.exception.code, 404)


if __name__ == '__main__':
    unittest.main()
