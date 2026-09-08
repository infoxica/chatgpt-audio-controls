"""Serve the built website for local or cloudflared previews; never the repository."""
import argparse
import json
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import quote, unquote, urlsplit

REPO = Path(__file__).resolve().parents[1]
ROOT = REPO / 'site-dist'
CANONICAL = json.loads((REPO / 'config/release.json').read_text())['siteUrl']
PREFIX = urlsplit(CANONICAL).path
TYPES = {'.html': 'text/html; charset=utf-8', '.md': 'text/markdown; charset=utf-8',
         '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
         '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
         '.png': 'image/png', '.svg': 'image/svg+xml'}


def wants_markdown(accept):
    """Honor explicit Markdown preference, including quality and exclusions."""
    media = {}
    for entry in accept.lower().split(','):
        parts = [part.strip() for part in entry.split(';')]
        quality = 1.0
        for parameter in parts[1:]:
            if parameter.startswith('q='):
                try:
                    quality = float(parameter[2:])
                except ValueError:
                    quality = 0.0
        media[parts[0]] = quality if 0 <= quality <= 1 else 0
    markdown = media.get('text/markdown', 0)
    html = media.get('text/html', media.get('text/*', media.get('*/*', 0)))
    return markdown > 0 and markdown >= html


class Preview(BaseHTTPRequestHandler):
    def do_HEAD(self):
        self.do_GET()

    def do_GET(self):
        route = unquote(urlsplit(self.path).path)
        if '\\' in route or any(ord(char) < 32 or ord(char) == 127 for char in route):
            self.send_error(404)
            return
        if route.startswith(PREFIX):
            self.send_response(308)
            # A double slash would become an external network-path redirect.
            destination = '/' + quote(route[len(PREFIX):].lstrip('/'), safe='/')
            query = urlsplit(self.path).query
            self.send_header('Location', destination + ('?' + query if query else ''))
            self.end_headers()
            return
        relative = route.lstrip('/') or 'index.html'
        try:
            target = (ROOT / relative).resolve()
            if not target.is_relative_to(ROOT.resolve()) or not target.exists():
                self.send_error(404)
                return
            if target.is_dir():
                if not route.endswith('/'):
                    self.send_response(308)
                    self.send_header('Location', '/' + quote(route.lstrip('/'), safe='/') + '/')
                    self.end_headers()
                    return
                target /= 'index.html'
            html_page = target.suffix == '.html'
            if html_page and wants_markdown(self.headers.get('Accept', '')):
                target = target.with_suffix('.md')
            if not target.is_file():
                self.send_error(404)
                return
            data = target.read_bytes()
        except (OSError, ValueError):
            self.send_error(404)
            return
        if target.suffix == '.html':
            # Rewrite page navigation and hydration props, never the head's
            # canonical/social/JSON-LD identities. Those stay absolute.
            head, body = data.decode('utf-8').split('</head>', 1)
            head = head.replace(f'href="{PREFIX}assets/', 'href="/assets/').replace(
                f'src="{PREFIX}assets/', 'src="/assets/')
            head = re.sub(r'(<link rel="(?:alternate|describedby)"[^>]*href=")' + re.escape(CANONICAL), r'\1/', head)
            body = body.replace(CANONICAL, '/')
            body = re.sub(r'((?:href|src)=")' + re.escape(PREFIX), r'\1/', body)
            html = head + '</head>' + body
            data = re.sub(r'data-ga4="[^"]*"', 'data-ga4=""', html).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', TYPES.get(target.suffix, 'application/octet-stream'))
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Cache-Control', 'no-cache')
        if html_page or target.suffix == '.md':
            self.send_header('Vary', 'Accept')
            markdown_path = '/' + target.relative_to(ROOT).with_suffix('.md').as_posix()
            links = [f'<{markdown_path}>; rel="alternate"; type="text/markdown"',
                     '</llms.txt>; rel="describedby"; type="text/markdown"']
            if target.suffix == '.md':
                frontmatter = re.match(rb'---\n(.*?)\n---\n', data, re.DOTALL)
                source = re.search(rb'^url: (.+)$', frontmatter[1], re.MULTILINE) if frontmatter else None
                if source:
                    links.append(f'<{json.loads(source[1])}>; rel="canonical"')
            self.send_header('Link', ', '.join(links))
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        if self.command != 'HEAD':
            self.wfile.write(data)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=4178)
    args = parser.parse_args()
    if not (ROOT / 'index.html').is_file():
        parser.error('Build the website first: bun run build:site')
    server = ThreadingHTTPServer(('127.0.0.1', args.port), Preview)
    print(f'Website preview: http://127.0.0.1:{args.port}/', flush=True)
    server.serve_forever()
