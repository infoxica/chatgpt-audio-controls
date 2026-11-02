import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const base='https://chatgpt-audio-controls.infoxica.com/';
async function serveSite(context,tracking=[]) {
  await context.route('**/*',async route=>{
    const url=route.request().url();
    if(url.startsWith(base)){
      const relative=url.split('?')[0].slice(base.length) || 'index.html';
      const file=relative.endsWith('/')?relative+'index.html':relative;
      const content=await fs.readFile('site-dist/'+file);
      const body=file.endsWith('.html')?content.toString().replace(/data-ga4="[^"]*"/,'data-ga4="G-TEST123"'):content;
      return route.fulfill({body,contentType:file.endsWith('.mp4')?'video/mp4':file.endsWith('.css')?'text/css':file.endsWith('.js')?'application/javascript':file.endsWith('.png')?'image/png':'text/html; charset=utf-8'});
    }
    tracking.push(url);return route.fulfill({body:'',contentType:'application/javascript'});
  });
}
for(const [width,locale] of [[1280,''],[360,''],[390,'ar/']])test(`private demo plays without overflow or autoplay at ${width} ${locale}`,async({page,context})=>{
  await serveSite(context);await page.setViewportSize({width,height:900});
  const mediaRequests=[];page.on('request',r=>{if(r.url().endsWith('.mp4'))mediaRequests.push(r.url());});
  await page.goto(base+locale);const video=page.locator('#demo video');
  await expect(video).toHaveAttribute('preload','none');expect(mediaRequests).toEqual([]);
  expect(await video.evaluate(el=>el.autoplay)).toBe(false);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await video.scrollIntoViewIfNeeded();await video.evaluate(el=>el.play());
  await expect.poll(()=>video.evaluate(el=>el.currentTime)).toBeGreaterThan(0.2);
  expect(await video.evaluate(el=>[el.videoWidth,el.videoHeight])).toEqual([1920,1080]);
  await video.evaluate(el=>el.pause());
  await expect(page.locator('.demo-gallery img')).toHaveCount(2);
  await page.locator('.demo-transcript summary').click();await expect(page.locator('.demo-transcript li')).toHaveCount(7);
  await page.screenshot({path:`build/browser-results/demo-site-${width}.png`});
});
test('static routes and consent keep analytics opt-in and store clicks distinct',async({page,context})=>{
  const tracking=[];
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await serveSite(context,tracking);
  await page.goto(base+'?utm_source=extension&utm_medium=referral&utm_campaign=v1.4.0&email=private%40example.test&search=private');await expect(page.getByRole('button',{name:'No thanks',exact:true})).toBeVisible();
  expect(tracking).toEqual([]);await page.getByRole('button',{name:'No thanks',exact:true}).click();await page.reload();expect(tracking).toEqual([]);
  const firstQuestion=page.locator('.faq-trigger').first();
  await firstQuestion.click();
  await expect(firstQuestion).toHaveAttribute('aria-expanded','true');
  await expect(page.locator('.faq-content').first()).toBeVisible();
  await firstQuestion.press('ArrowDown');
  await expect(page.locator('.faq-trigger').nth(1)).toBeFocused();
  await firstQuestion.click();
  await expect(page.locator('.faq-content').first()).toBeHidden();
  await page.locator('#locale').scrollIntoViewIfNeeded();
  await page.locator('#locale').press('Enter');
  await expect(page.locator('.language-mega-viewport')).toBeVisible();
  expect(await page.locator('.language-mega-viewport').evaluate(el=>{
    const box=el.getBoundingClientRect();return box.left>=0 && box.right<=innerWidth && box.top>=0 && box.bottom<=innerHeight;
  })).toBe(true);
  await page.screenshot({path:'build/browser-results/website-language-menu.png'});
  await page.locator('#locale').press('Escape');
  await expect(page.locator('#locale')).toBeFocused();
  await page.getByRole('button',{name:'Analytics preferences'}).click();await page.getByRole('button',{name:'Allow analytics',exact:true}).click();
  await expect.poll(()=>tracking.filter(url=>url.includes('googletagmanager')).length).toBe(1);
  expect(await page.evaluate(()=>window.dataLayer.map(a=>Array.from(a)).find(a=>a[0]==='config')[2].page_location)).toBe(base+'?utm_source=extension&utm_medium=referral&utm_campaign=v1.4.0');
  expect(await page.evaluate(()=>window.dataLayer.every(command=>Object.prototype.toString.call(command)==='[object Arguments]'))).toBe(true);
  await page.locator('a[data-store=chrome][data-placement=hero]').click({modifiers:['Control']});
  const event=await page.evaluate(()=>window.dataLayer.map(args=>Array.from(args)).find(args=>args[0]==='event'));
  expect(event).toEqual(['event','store_link_click',{store:'chrome',locale:'en',placement:'hero',transport_type:'beacon'}]);
  await expect(page.locator('#setup a[data-store]')).toHaveCount(2);
  await expect(page.locator('#setup a[data-store=chrome]')).toHaveAttribute('data-placement','setup');
  await expect(page.locator('#setup a[data-store=edge]')).toHaveAttribute('href',/microsoftedge\.microsoft\.com\/addons\/detail\//);
  await expect(page.locator('#setup').getByRole('link',{name:'Open ChatGPT'})).toHaveAttribute('href','https://chatgpt.com/');
  await expect(page.locator('#reviews a').nth(0)).toHaveAttribute('href',/aifalimlfgiepmbejcemcofninobaiea\/reviews$/);
  await expect(page.locator('#reviews a').nth(1)).toHaveAttribute('href',/cmhbacgmcgiolpidfjcpefkhbbeamemf#review-section$/);
  await page.locator('#reviews a').nth(0).click();
  expect(await page.evaluate(()=>window.dataLayer.map(args=>Array.from(args)).filter(args=>args[0]==='event').length)).toBe(1);
  await page.getByRole('button',{name:'Analytics preferences'}).click();await page.getByRole('button',{name:'No thanks',exact:true}).click();
  expect(await page.evaluate(()=>window['ga-disable-G-TEST123'])).toBe(true);
  await page.locator('#theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  await page.reload();
  await expect(page.locator('#theme-toggle')).toHaveAttribute('aria-pressed','true');
  await page.screenshot({path:'build/browser-results/website-light.png',fullPage:true});
  await page.locator('#theme-toggle').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  for (const badge of await page.locator('.hero .store-badge img').all()) {
    expect(await badge.evaluate(img=>{
      const rect=img.getBoundingClientRect();
      return img.complete && img.naturalWidth>0 && rect.height>=32 && Math.abs(rect.width/rect.height-img.naturalWidth/img.naturalHeight)<0.02;
    })).toBe(true);
  }
  await page.evaluate(()=>window.scrollTo(0,0));
  await page.screenshot({path:'build/browser-results/website.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('combobox',{name:'Language: English',exact:true}).click();
  await page.getByRole('option',{name:'日本語',exact:true}).click();
  await expect(page).toHaveURL(base+'ja/');
  await expect(page.locator('html')).toHaveAttribute('lang','ja');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:'build/browser-results/website-mobile-ja.png',fullPage:true});
  await page.setViewportSize({width:320,height:740});
  for (const locale of ['en','zh-CN','zh-TW','vi','th','es','pt-BR','pt-PT','ru','hi','fr','de','ja','ko','id','it','tr','bn','mr','te','ta','ar','fa','he','pl','hu','sv','cs','uk','ca','el','ro','nb']) {
    await page.goto(base+(locale==='en'?'':locale+'/'));
    await expect(page.locator('#locale-mobile')).toHaveAttribute('role','combobox');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),locale).toBe(true);
  }
  expect(errors).toEqual([]);
});
test('guide pages stay local, align with the homepage, and preserve locale-specific metadata',async({page,context})=>{
  // This exhaustive pass navigates 132 localized pages, not a single UI flow.
  // Keep every locale assertion while allowing the expanded catalog to finish.
  test.setTimeout(120000);
  await serveSite(context);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base);await page.getByRole('button',{name:'No thanks',exact:true}).click();
  const widths=await page.locator('.settings-story,#help,#guides,#support,#privacy').evaluateAll(elements=>elements.map(el=>el.getBoundingClientRect().width));
  expect(Math.max(...widths)-Math.min(...widths)).toBeLessThan(1);
  await page.locator('#guides').getByRole('link',{name:'Installation',exact:true}).click();
  await expect(page).toHaveURL(base+'installation/');
  await expect(page.locator('#zip')).toContainText('manifest.json');
  await expect(page.locator('#source code')).toContainText('bun run build');
  await expect(page.locator('#stores a[data-store]')).toHaveCount(2);
  await page.screenshot({path:'build/browser-results/website-installation.png',fullPage:true});
  await page.locator('#locale').hover();
  await page.locator('.language-grid').getByRole('link',{name:'日本語',exact:true}).click();
  await expect(page).toHaveURL(base+'ja/installation/');
  await page.locator('.guide-nav').getByRole('link',{name:'Tampermonkey',exact:true}).click();
  await expect(page).toHaveURL(base+'ja/userscript/');
  await expect(page.locator('main a[href$=".user.js"]')).toHaveCount(1);
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:'build/browser-results/website-userscript-ja.png',fullPage:true});
  const codes=['en','zh-CN','zh-TW','vi','th','es','pt-BR','pt-PT','ru','hi','fr','de','ja','ko','id','it','tr','bn','mr','te','ta','ar','fa','he','pl','hu','sv','cs','uk','ca','el','ro','nb'];
  const sitemap=await fs.readFile('site-dist/sitemap.xml','utf8');
  expect((sitemap.match(/<loc>/g)||[]).length).toBe(165);
  await page.setViewportSize({width:320,height:740});
  for(const code of codes) for(const route of ['guide','installation','userscript','glossary']) {
    const relative=(code==='en'?'':code+'/')+route+'/';
    const html=await fs.readFile('site-dist/'+relative+'index.html','utf8');
    expect(html).toContain(`<link rel="canonical" href="${base+relative}">`);
    expect(html).toContain(`<link rel="alternate" hreflang="ja" href="${base}ja/${route}/">`);
    expect(html).not.toContain('#readme');
    expect(sitemap).toContain(`<loc>${base+relative}</loc>`);
    await page.goto(base+relative);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),relative).toBe(true);
  }
  expect(errors).toEqual([]);
});

test('hierarchical navigation and discovery artifacts cover every localized page', async ({page, context}) => {
  await serveSite(context);
  const errors=[];
  page.on('pageerror', error=>errors.push(error.message));
  page.on('console', message=>{if(message.type()==='error')errors.push(message.text());});
  await page.setViewportSize({width:1280,height:900});
  await page.goto(base);
  await page.getByRole('button',{name:'No thanks',exact:true}).click();
  const product=page.locator('.desktop-navigation').getByRole('button',{name:'Product',exact:true});
  await product.press('Enter');
  await expect(page.locator('.mega-content').getByRole('link',{name:/^Overview/})).toBeVisible();
  await product.press('Escape');
  await expect(product).toBeFocused();
  await page.locator('.desktop-navigation').getByRole('button',{name:'Guides',exact:true}).hover();
  await expect(page.locator('.mega-content').getByRole('link',{name:/^Installation/})).toBeVisible();
  await page.screenshot({path:'build/browser-results/website-navigation.png'});
  await page.locator('.mega-content').getByRole('link',{name:/^Installation/}).click();
  await expect(page).toHaveURL(base+'installation/');
  await expect(page.locator('.breadcrumbs [aria-current=page]')).toHaveText('Installation');
  await page.setViewportSize({width:320,height:740});
  await page.locator('.mobile-navigation button').click();
  await expect(page.getByRole('menuitem')).toHaveCount(12);
  expect(await page.getByRole('menu').evaluate(el=>{
    const box=el.getBoundingClientRect();return box.left>=0 && box.right<=innerWidth && box.top>=0 && box.bottom<=innerHeight;
  })).toBe(true);
  await page.screenshot({path:'build/browser-results/website-navigation-mobile.png'});
  await page.getByRole('menuitem',{name:'Dashboard',exact:true}).click();
  await expect(page).toHaveURL(base+'#dashboard');
  const navigation=JSON.parse(await fs.readFile('site/navigation-copy.json','utf8'));
  const sitemap=await fs.readFile('site-dist/sitemap.xml','utf8');
  expect((sitemap.match(/<loc>/g)||[]).length).toBe(165);
  expect((sitemap.match(/<xhtml:link /g)||[]).length).toBe(165*34);
  for(const locale of Object.keys(navigation)) {
    const prefix=locale==='en'?'':locale+'/';
    for(const slug of ['', 'guide/', 'installation/', 'userscript/', 'glossary/']) {
      const canonical=base+prefix+slug;
      const html=await fs.readFile('site-dist/'+prefix+slug+'index.html','utf8');
      const md=await fs.readFile('site-dist/'+prefix+slug+'index.md','utf8');
      expect(html).toContain(`type="text/markdown" href="${canonical}index.md"`);
      expect(html).toContain(navigation[locale].disclaimer.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
      expect(html).toContain('class="footer-navigation"');
      expect(md).toContain('Source: '+canonical);
      expect(md).not.toContain('<svg');
      expect(md).not.toContain('site-faq-props');
      const data=JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
      expect(data['@graph'].find(node=>node['@type']==='WebPage').url).toBe(canonical);
      expect(data['@graph'].some(node=>node['@type']==='BreadcrumbList')).toBe(true);
      expect(JSON.stringify(data)).not.toContain('aggregateRating');
    }
  }
  const llms=await fs.readFile('site-dist/llms.txt','utf8');
  expect(llms).toContain('# ChatGPT Audio Controls');
  for(const match of llms.matchAll(/\]\((https:\/\/infoxica.github.io\/chatgpt-audio-controls\/[^)]*)\)/g)) {
    await expect(fs.access('site-dist/'+match[1].slice(base.length))).resolves.toBeUndefined();
  }
  expect(errors).toEqual([]);
});

test('desktop mega navigation opens on hover and preserves pointer and keyboard access', async ({page,context}) => {
  await serveSite(context);
  await page.goto(base);
  await page.getByRole('button',{name:'No thanks',exact:true}).click();
  const product=page.locator('.desktop-navigation').getByRole('button',{name:'Product',exact:true});
  const guides=page.locator('.desktop-navigation').getByRole('button',{name:'Guides',exact:true});
  const support=page.locator('.desktop-navigation').getByRole('button',{name:'Support',exact:true});
  await page.locator('#locale').focus();
  const focused=await page.evaluate(()=>document.activeElement?.tagName);
  await product.hover();
  await expect(product).toHaveAttribute('aria-expanded','true');
  expect(await page.evaluate(()=>document.activeElement?.tagName)).toBe(focused);
  const overview=page.locator('.mega-content').getByRole('link',{name:/^Overview/});
  await overview.hover();
  await expect(overview).toBeVisible();
  await expect(page.locator('.mega-content:visible .mega-link')).toHaveCount(4);
  await guides.hover();
  await expect(guides).toHaveAttribute('aria-expanded','true');
  await expect(product).toHaveAttribute('aria-expanded','false');
  const glossary=page.locator('.mega-content').getByRole('link',{name:/^Glossary/});
  const target=await glossary.boundingBox();
  await page.mouse.move(target.x+target.width/2,target.y+target.height/2,{steps:12});
  await expect(glossary).toBeVisible();
  await expect(guides).toHaveAttribute('aria-expanded','true');
  await page.screenshot({path:'build/browser-results/website-mega-menu.png'});
  await page.mouse.move(10,800);
  await expect(guides).toHaveAttribute('aria-expanded','false');
  await support.focus();
  await support.press('Enter');
  await support.press('ArrowDown');
  await expect(page.locator('.mega-content').getByRole('link',{name:/^Help and troubleshooting/})).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(support).toBeFocused();
  await expect(support).toHaveAttribute('aria-expanded','false');
  await guides.hover();
  await glossary.click();
  await expect(page).toHaveURL(base+'glossary/');
});

test('desktop language grid and Support descriptions stay consistent', async ({page,context}) => {
  await serveSite(context);
  await page.goto(base+'guide/');
  await page.getByRole('button',{name:'No thanks',exact:true}).click();
  await page.locator('#locale').hover();
  await expect(page.locator('.language-grid-link')).toHaveCount(33);
  await expect(page.locator('.language-grid-link[aria-current=page]')).toHaveText('English');
  expect(await page.locator('.language-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(4);
  await page.screenshot({path:'build/browser-results/website-language-grid.png',animations:'disabled'});
  await page.setViewportSize({width:1100,height:850});
  // Resizing moves the trigger away from the pointer; re-enter the language
  // menu instead of leaving the pointer over a different navigation trigger.
  await page.locator('#locale').hover();
  await expect(page.locator('.language-grid')).toBeVisible();
  expect(await page.locator('.language-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(3);
  await page.locator('.language-grid').getByRole('link',{name:'日本語',exact:true}).click();
  await expect(page).toHaveURL(base+'ja/guide/');
  await page.goto(base);
  await page.locator('.desktop-navigation').getByRole('button',{name:'Support',exact:true}).hover();
  await expect(page.locator('.mega-content .mega-description')).toHaveCount(4);
  expect(await page.locator('.mega-content .mega-description').evaluateAll(nodes=>nodes.every(node=>node.textContent.length>10&&node.textContent.length<100))).toBe(true);
  await page.screenshot({path:'build/browser-results/website-support-menu.png',animations:'disabled'});
});

for(const [width,locale] of [[320,''],[360,'de/'],[390,'ar/'],[768,'ja/'],[1920,'']]) test(`support links and layout at ${width} ${locale}`,async({page,context})=>{
 const requests=[];await serveSite(context,requests);await page.setViewportSize({width,height:1080});await page.goto(base+locale);
 await expect(page.locator('.donate-header')).toHaveAttribute('href',base+locale+'#support');await page.locator('.donate-header').click();await expect(page.locator('#support')).toBeVisible();
 await expect(page.locator('#support .donation-amounts a')).toHaveCount(4);
 const amounts=[1,3,5,10];for(let i=0;i<4;i++){const a=page.locator('#support .donation-amounts a').nth(i);await expect(a).toHaveAttribute('href',`https://github.com/sponsors/infoxica/sponsorships?frequency=one-time&amount=${amounts[i]}`);const r=await a.boundingBox();expect(r.width).toBeGreaterThanOrEqual(44);expect(r.height).toBeGreaterThanOrEqual(44);}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(page.locator('#reviews a')).toHaveCount(2);expect(requests.filter(url=>url.includes('google-analytics')||url.includes('github.com/sponsors'))).toEqual([]);
 if(width===1920){await page.locator('#support').screenshot({path:'build/support-website-dark.png'});await page.evaluate(()=>document.documentElement.dataset.theme='light');await page.locator('#support').screenshot({path:'build/support-website-light.png'});}
});

for(const [width,locale] of [[1920,''],[1920,'ar/'],[768,'de/'],[360,''],[390,'ar/']])test(`screenshot viewer and separate support cards at ${width} ${locale}`,async({page,context})=>{
 await serveSite(context);await page.setViewportSize({width,height:1080});await page.goto(base+locale);
 await expect(page.locator('html')).toHaveAttribute('dir',locale==='ar/'?'rtl':'ltr');
 await page.locator('#analytics-decline').click();
 const triggers=page.locator('main figure .image-viewer-trigger');await expect(triggers).toHaveCount(3);
 for(let i=0;i<3;i++){
  const trigger=triggers.nth(i);await trigger.scrollIntoViewIfNeeded();await trigger.focus();await trigger.press('Enter');
  const viewer=page.getByRole('dialog');await expect(viewer).toBeVisible();await expect(viewer.locator('button')).toBeFocused();
  await expect.poll(()=>viewer.locator('img').evaluate(el=>el.naturalWidth)).toBe(1920);
  expect(await viewer.locator('img').evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;})).toBe(true);
  expect(await viewer.locator('button').getAttribute('aria-label')).toBeTruthy();
  const offset=await viewer.locator('button').evaluate(el=>{
    const b=el.getBoundingClientRect(),s=el.querySelector('svg').getBoundingClientRect();
    return Math.max(Math.abs((b.left+b.right-s.left-s.right)/2),Math.abs((b.top+b.bottom-s.top-s.bottom)/2));
  });
  expect(offset).toBeLessThanOrEqual(1);

  if(i===0){await page.keyboard.press('Tab');await expect(viewer.locator('button')).toBeFocused();await page.screenshot({path:`build/image-viewer-${width}.png`});await page.keyboard.press('Escape');}
  else if(i===1)await viewer.locator('button').click();else await viewer.click({position:{x:4,y:200}});
  await expect(viewer).not.toBeVisible();await expect(trigger).toBeFocused();expect(page.url()).toBe(base+locale);
 }
 await page.locator('#support').scrollIntoViewIfNeeded();
 const cards=await page.locator('#support .support-contribution,#reviews').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,border:getComputedStyle(el).borderTopStyle};}));
 expect(cards).toHaveLength(2);expect(cards.every(c=>c.border==='solid')).toBe(true);
 expect(cards[1].y-cards[0].y-cards[0].height).toBeCloseTo(24,0);
 for(const selector of ['.support-contribution','#reviews']){
  const box=await page.locator(selector).evaluate(el=>{const a=el.querySelector('.support-copy').getBoundingClientRect(),b=el.querySelector('.support-card-actions').getBoundingClientRect();return {a:{x:a.x,y:a.y,width:a.width,height:a.height},b:{x:b.x,y:b.y,width:b.width,height:b.height},padding:getComputedStyle(el).paddingTop};});
  if(width>760){const gap=locale==='ar/'?box.a.x-box.b.x-box.b.width:box.b.x-box.a.x-box.a.width;expect(gap).toBeCloseTo(32,0);expect(box.padding).toBe('32px');}
  else {expect(box.b.y-box.a.y-box.a.height).toBeCloseTo(24,0);expect(box.padding).toBe('24px');}
 }
 const dividerGap=await page.locator('#support').evaluate(el=>el.getBoundingClientRect().top-document.querySelector('#guides').getBoundingClientRect().bottom);expect(dividerGap).toBeCloseTo(32,0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`build/support-cards-${width}.png`});
});

test('legacy redirect preserves locale and approved campaigns without forwarding private data',async()=>{
  const html=await fs.readFile('build/legacy-pages/ja/guide/index.html','utf8');
  const canonical=html.match(/rel="canonical" href="([^"]+)"/)[1];
  expect(canonical).toBe(base+'ja/guide/');
  expect(html).toContain('http-equiv="refresh"');
  expect(html).toContain('Continue to ChatGPT Audio Controls');
  expect(await fs.readFile('build/legacy-pages/llms.txt','utf8')).toBe(await fs.readFile('site-dist/llms.txt','utf8'));
  const script=await fs.readFile('build/legacy-pages/redirect.js','utf8');
  for(const hash of ['#support','#private%20words']){
    let destination;
    vm.runInNewContext(script,{URL,document:{querySelector:()=>({href:canonical})},location:{href:'https://infoxica.github.io/chatgpt-audio-controls/ja/guide/?utm_source=github&utm_campaign=v1.4.1&email=private@example.test&redirect=https://evil.test',hash,replace:url=>{destination=url;}}});
    const url=new URL(destination);expect(url.origin+url.pathname).toBe(canonical);
    expect(url.search).toBe('?utm_source=github&utm_campaign=v1.4.1');
    expect(url.hash).toBe(hash==='#support'?'#support':'');
  }
  expect(await fs.readFile('build/legacy-pages/assets/walkthrough.mp4')).toEqual(await fs.readFile('site-dist/assets/walkthrough.mp4'));
});
