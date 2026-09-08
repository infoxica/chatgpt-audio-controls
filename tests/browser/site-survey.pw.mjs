import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const base='https://infoxica.github.io/chatgpt-audio-controls/';
async function serveSite(context,tracking=[]) {
  await context.route('**/*',async route=>{
    const url=route.request().url();
    if(url.startsWith(base)){
      const relative=url.slice(base.length) || 'index.html';
      const file=relative.endsWith('/')?relative+'index.html':relative;
      const content=await fs.readFile('site-dist/'+file);
      const body=file.endsWith('.html')?content.toString().replace(/data-ga4="[^"]*"/,'data-ga4="G-TEST123"'):content;
      return route.fulfill({body,contentType:file.endsWith('.css')?'text/css':file.endsWith('.js')?'application/javascript':file.endsWith('.png')?'image/png':'text/html; charset=utf-8'});
    }
    tracking.push(url);return route.fulfill({body:'',contentType:'application/javascript'});
  });
}
test('static routes and consent keep analytics opt-in and store clicks distinct',async({page,context})=>{
  const tracking=[];
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  await serveSite(context,tracking);
  await page.goto(base);await expect(page.getByRole('button',{name:'No thanks',exact:true})).toBeVisible();
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
  for (const locale of ['en','zh-CN','zh-TW','vi','th','es','pt-BR','pt-PT','ru','hi','fr','de','ja','ko','id','it','tr']) {
    await page.goto(base+(locale==='en'?'':locale+'/'));
    await expect(page.locator('#locale-mobile')).toHaveAttribute('role','combobox');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),locale).toBe(true);
  }
  expect(errors).toEqual([]);
});
test('guide pages stay local, align with the homepage, and preserve locale-specific metadata',async({page,context})=>{
  await serveSite(context);
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base);await page.getByRole('button',{name:'No thanks',exact:true}).click();
  const widths=await page.locator('.settings-story,#help,#guides,#reviews,#privacy').evaluateAll(elements=>elements.map(el=>el.getBoundingClientRect().width));
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
  const codes=['en','zh-CN','zh-TW','vi','th','es','pt-BR','pt-PT','ru','hi','fr','de','ja','ko','id','it','tr'];
  const sitemap=await fs.readFile('site-dist/sitemap.xml','utf8');
  expect((sitemap.match(/<loc>/g)||[]).length).toBe(85);
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

test('survey selects then submits, skips without writes and preserves input after failure',async({page})=>{
  const translations=vm.runInNewContext((await fs.readFile('build/feedback/Translations.gs','utf8'))+';({copy:SURVEY_COPY,names:LANGUAGE_NAMES})');
  const state={locale:'en',locales:translations.copy,names:translations.names,id:'test-page',expires:Date.now()+3600000,token:'test',version:'1.2.0',browser:'Edge',os:'Windows'};
  const template=(await fs.readFile('feedback/Index.html','utf8')).replace('<?!= bootstrap ?>',JSON.stringify(state));
  await page.route('https://survey.test/**',route=>route.fulfill({body:template,contentType:'text/html; charset=utf-8'}));
  await page.addInitScript(()=>{
    window.saved=[];window.failNext=true;
    const runner={withSuccessHandler(fn){this.success=fn;return this;},withFailureHandler(fn){this.failure=fn;return this;},submitFeedback(value){if(window.failNext){window.failNext=false;setTimeout(()=>this.failure(new Error('test failure')),20);}else{window.saved.push(value);setTimeout(()=>this.success({saved:true}),20);}}};
    window.google={script:{run:runner}};
  });
  await page.goto('https://survey.test/');
  expect(await page.locator('input[type=radio]:checked').count()).toBe(0);
  await page.getByRole('button',{name:'Send feedback',exact:true}).click();await expect(page.locator('#error')).toHaveText('Choose one reason to send feedback.');
  await page.getByLabel('Something else.',{exact:true}).check();await page.getByRole('button',{name:'Send feedback',exact:true}).click();await expect(page.locator('#error')).toContainText('wasn’t confirmed');
  await expect(page.getByLabel('Something else.',{exact:true})).toBeChecked();await expect(page.locator('#note')).toHaveValue('');
  await page.getByRole('button',{name:'Send feedback',exact:true}).click();await expect(page.locator('#confirmation')).toHaveText('Thank you for helping us improve. You’re always welcome back.');
  const rows=await page.evaluate(()=>window.saved);expect(rows).toHaveLength(1);expect(rows[0].comment).toBe('');expect(rows[0].reason).toBe('other');
  await page.reload();await page.locator('#language').selectOption('ja');await expect(page.locator('html')).toHaveAttribute('lang','ja');await page.getByRole('button',{name:translations.copy.ja.skip,exact:true}).click();expect(await page.evaluate(()=>window.saved.length)).toBe(0);
  await page.reload();await page.locator('#language').selectOption('vi');await page.screenshot({path:'build/browser-results/survey-vi.png',fullPage:true});
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
  expect((sitemap.match(/<loc>/g)||[]).length).toBe(85);
  expect((sitemap.match(/<xhtml:link /g)||[]).length).toBe(85*18);
  for(const locale of Object.keys(navigation)) {
    const prefix=locale==='en'?'':locale+'/';
    for(const slug of ['', 'guide/', 'installation/', 'userscript/', 'glossary/']) {
      const canonical=base+prefix+slug;
      const html=await fs.readFile('site-dist/'+prefix+slug+'index.html','utf8');
      const md=await fs.readFile('site-dist/'+prefix+slug+'index.md','utf8');
      expect(html).toContain(`type="text/markdown" href="${canonical}index.md"`);
      expect(html).toContain(navigation[locale].disclaimer);
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
  await expect(page.locator('.language-grid-link')).toHaveCount(17);
  await expect(page.locator('.language-grid-link[aria-current=page]')).toHaveText('English');
  expect(await page.locator('.language-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(4);
  await page.screenshot({path:'build/browser-results/website-language-grid.png',animations:'disabled'});
  await page.setViewportSize({width:1100,height:850});
  expect(await page.locator('.language-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(3);
  await page.locator('.language-grid').getByRole('link',{name:'日本語',exact:true}).click();
  await expect(page).toHaveURL(base+'ja/guide/');
  await page.goto(base);
  await page.locator('.desktop-navigation').getByRole('button',{name:'Support',exact:true}).hover();
  await expect(page.locator('.mega-content .mega-description')).toHaveCount(4);
  expect(await page.locator('.mega-content .mega-description').evaluateAll(nodes=>nodes.every(node=>node.textContent.length>10&&node.textContent.length<100))).toBe(true);
  await page.screenshot({path:'build/browser-results/website-support-menu.png',animations:'disabled'});
});
