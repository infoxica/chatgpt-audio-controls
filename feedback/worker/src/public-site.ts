import config from '../../../config/release.json';
import languages from './names.generated.json';

export function wantsMarkdown(accept: string) {
  const q = new Map<string, number>();
  for (const entry of accept.toLowerCase().split(',')) {
    const [type, ...params] = entry.split(';').map(p => p.trim());
    const weight = params.find(p => p.startsWith('q='));
    const value = weight ? Number(weight.slice(2)) : 1;
    q.set(type, value >= 0 && value <= 1 ? value : 0);
  }
  const md = q.get('text/markdown') ?? 0;
  return md > 0 && md >= (q.get('text/html') ?? q.get('text/*') ?? q.get('*/*') ?? 0);
}

const guides = new Set(['installation', 'guide', 'userscript', 'glossary']);
export async function servePublic(request: Request, assets: Fetcher) {
  const url = new URL(request.url);
  const parts = url.pathname.slice(1,-1).split('/').filter(Boolean);
  if (parts[0] !== 'en' && Object.hasOwn(languages, parts[0])) parts.shift();
  const page = !url.pathname.includes('//') && url.pathname.endsWith('/') &&
    (!parts.length || (parts.length === 1 && guides.has(parts[0])));
  if (!page || !['GET','HEAD'].includes(request.method)) return assets.fetch(request);
  const canonical = new URL(url.pathname, config.siteUrl);
  const mirror = new URL('index.md', canonical);
  const md = wantsMarkdown(request.headers.get('Accept') || '');
  if (md) url.pathname += 'index.md';
  const upstream = await assets.fetch(new Request(url,request));
  if (upstream.status !== 200 && upstream.status !== 304) return upstream;
  const response = new Response(request.method === 'HEAD' ? null : upstream.body,upstream);
  response.headers.append('Vary','Accept');
  response.headers.set('Link', [
    '<' + canonical.href + '>; rel="canonical"',
    '<' + mirror.href + '>; rel="alternate"; type="text/markdown"',
    '</llms.txt>; rel="describedby"; type="text/markdown"',
  ].join(', '));
  if (md) response.headers.set('Content-Type','text/markdown; charset=utf-8');
  return response;
}
