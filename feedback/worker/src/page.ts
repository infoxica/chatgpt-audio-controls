import locales from './locales.generated.json';
import names from './names.generated.json';
export function renderForm(url: URL, siteKey: string, nonce: string): string {
  const p = url.searchParams;
  const state = {
    locale: p.get('lang') && Object.hasOwn(locales, p.get('lang')!) ? p.get('lang') : 'en',
    locales, names, source: p.get('source') === 'installed' ? 'installed' : 'uninstall',
    version: /^\d{1,5}\.\d{1,5}\.\d{1,5}$/.test(p.get('version') || '') ? p.get('version') : 'unknown',
    browser: ['Chrome','Chromium','Edge','Firefox','Safari'].includes(p.get('browser') || '') ? p.get('browser') : 'Other',
    os: ['Windows','macOS','Linux','ChromeOS','Android'].includes(p.get('os') || '') ? p.get('os') : 'Other',
  };
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ChatGPT Audio Controls — Feedback</title><script nonce="${nonce}">
const colorScheme=matchMedia('(prefers-color-scheme: dark)');
let themeChoice='system';
try{themeChoice=localStorage.getItem('feedback-theme')||new URL(location.href).searchParams.get('theme')||'system';}catch{}
if(!['system','light','dark'].includes(themeChoice))themeChoice='system';
function applyTheme(){const mode=themeChoice==='system'?(colorScheme.matches?'dark':'light'):themeChoice;document.documentElement.dataset.theme=mode;document.documentElement.style.colorScheme=mode;}
applyTheme();
</script><style nonce="${nonce}">
:root{--page:#fff;--text:#0d0d0d;--muted:#5d5d5d;--surface:#f9f9f9;--hover:#ececec;--border:rgba(0,0,0,.12);--selected:#edf3fc;--accent:#2c67c5;--button:#0d0d0d;--on-button:#fff;--error:#a12e28}
[data-theme=dark]{--page:#212121;--text:#ececec;--muted:#b4b4b4;--surface:#171717;--hover:#2f2f2f;--border:rgba(255,255,255,.12);--selected:#253247;--accent:#78aaff;--button:#ececec;--on-button:#212121;--error:#ffb4aa}

*{box-sizing:border-box}body{margin:0;background:var(--page);color:var(--text);font:17px/1.5 system-ui,sans-serif}main{max-width:700px;margin:auto;padding:32px 20px 64px}header{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;font-size:13px}select{max-width:150px;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text)}h1{font-size:clamp(28px,6vw,42px);line-height:1.15;margin:42px 0 16px;letter-spacing:-.035em}p{margin:12px 0}.muted{color:var(--muted);font-size:14px}fieldset{border:0;padding:0;margin:24px 0}legend{margin-bottom:12px}.reason{display:flex;align-items:center;gap:12px;background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:12px;padding:14px 16px;margin:8px 0;cursor:pointer}.reason:has(input:checked){border-color:var(--accent);background:var(--selected);box-shadow:0 0 0 1px var(--accent)}input[type=radio]{accent-color:var(--accent);width:18px;height:18px;flex-shrink:0}button{font:inherit;border-radius:10px;padding:12px 20px;cursor:pointer;border:1px solid var(--border);background:var(--surface);color:var(--text)}button[type=submit]{background:var(--button);color:var(--on-button);border-color:var(--button)}button:disabled{opacity:.6;cursor:wait}:focus-visible{outline:3px solid #df9a32;outline-offset:3px}textarea{display:block;width:100%;min-height:110px;resize:vertical;border:1px solid var(--border);border-radius:8px;padding:12px;font:inherit;background:var(--surface);color:var(--text)}summary{cursor:pointer;padding:12px 0}.actions{display:flex;gap:12px;flex-wrap:wrap;margin:24px 0}#error{color:var(--error)}#done{padding:40px 0}.trap{position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden}[hidden]{display:none!important}
a{color:var(--accent)}.preferences{display:flex;gap:8px}.preference{position:relative;display:flex;align-items:center;justify-content:center;gap:5px;width:58px;height:44px;border:1px solid var(--border);border-radius:12px;background:var(--page)}.preference:hover{background:var(--hover)}.preference:focus-within{outline:2px solid var(--accent);outline-offset:4px}.preference:has(select:disabled){opacity:.6}.preference svg{width:20px;height:20px;pointer-events:none;flex-shrink:0}.preference .chevron{width:14px;height:14px}.preference select{position:absolute;inset:0;width:100%;height:100%;max-width:none;opacity:0;cursor:pointer}.preference select:disabled{cursor:wait}.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.theme-icon{display:none}.preference[data-choice=system] .system-icon,.preference[data-choice=light] .sun-icon,.preference[data-choice=dark] .moon-icon{display:block}:focus-visible{outline-color:var(--accent)}@media(forced-colors:active){.preference{width:auto;min-width:58px}.preference svg{display:none!important}.preference select{position:static;opacity:1;width:auto}}
</style></head><body><main>
<header><strong>ChatGPT Audio Controls</strong><div class="preferences">
<label class="preference"><span id="languageLabel" class="sr-only">Language</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 8 6 6m-7 0 6-6 2-3M2 5h12M7 2v3m15 17-5-10-5 10m2-4h6"/></svg><svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg><select id="language"></select></label>
<label id="theme-control" class="preference" data-choice="system"><span class="sr-only" data-copy="appearance"></span>
<svg class="theme-icon system-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/></svg>
<svg class="theme-icon sun-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42m0-14.14-1.42 1.42m-11.3 11.3-1.42 1.42"/></svg>
<svg class="theme-icon moon-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z"/></svg>
<svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg><select id="theme"><option value="system" data-copy="themeSystem"></option><option value="light" data-copy="themeLight"></option><option value="dark" data-copy="themeDark"></option></select></label>
</div></header>
<section id="survey"><h1 data-copy="surveyTitle"></h1><p data-copy="surveyIntro"></p>
<form id="form"><fieldset id="reasons"><legend data-copy="surveyHint"></legend></fieldset>
<details><summary data-copy="addNote"></summary><label class="muted" for="note" data-copy="noteHint"></label><textarea id="note" maxlength="1000" aria-describedby="privacy"></textarea></details>
<label class="trap" aria-hidden="true">Website<input id="website" tabindex="-1" autocomplete="off"></label>
<div id="challenge"></div><p id="error" role="alert"></p><div class="actions"><button id="send" type="submit" data-copy="send"></button><button type="button" id="skip" data-copy="skip"></button></div>
<p id="privacy" class="muted" data-copy="feedbackPrivacy"></p><details><summary class="muted" data-copy="privacy"></summary><p class="muted" data-copy="feedbackPolicy"></p><a id="privacy-link" class="muted" data-copy="website" target="_blank" rel="noreferrer"></a></details></form></section>
<section id="done" hidden tabindex="-1" aria-live="polite"><h1 id="confirmation"></h1></section>
</main><script nonce="${nonce}">
const state = ${JSON.stringify(state).replace(/</g, '\\u003c')};
const codes = state.source === 'installed' ? ['bug','suggestion','other'] : ['broken','intrusive','slow','difficult','missing','language','unneeded','other'];
const keys = state.source === 'installed' ? ['feedbackBug','feedbackSuggestion','reasonOther'] : ['reasonBroken','reasonIntrusive','reasonSlow','reasonDifficult','reasonMissing','reasonLanguage','reasonUnneeded','reasonOther'];
const $ = id => document.getElementById(id);
let saving=false, finished='', errorKey='', widget, challengeToken='', lastPayload='', requestId=crypto.randomUUID();
const copy=()=>state.locales[state.locale]||state.locales.en;
if(state.source==='installed') {
 document.querySelector('[data-copy="surveyTitle"]').dataset.copy='send';
 document.querySelector('[data-copy="surveyIntro"]').dataset.copy='feedbackIntro';
}
for(const [value,name] of Object.entries(state.names)) $('language').add(new Option(name,value));
$('language').value=state.locale;$('theme').value=themeChoice;
codes.forEach((code,index)=>{const label=document.createElement('label');label.className='reason';const input=document.createElement('input');input.type='radio';input.name='reason';input.value=code;const text=document.createElement('span');text.dataset.copy=keys[index];label.append(input,text);$('reasons').append(label);});
function preferenceLabels(){$('language').title=copy().language+': '+state.names[state.locale];$('theme').title=copy().appearance+': '+$('theme').selectedOptions[0].textContent;$('theme-control').dataset.choice=themeChoice;}
function translate(){document.documentElement.lang=state.locale;$('privacy-link').href='https://infoxica.github.io/chatgpt-audio-controls/'+(state.locale==='en'?'':state.locale+'/')+'#privacy';document.querySelectorAll('[data-copy]').forEach(el=>el.textContent=copy()[el.dataset.copy]);$('languageLabel').textContent=copy().language;preferenceLabels();$('error').textContent=errorKey?copy()[errorKey]:'';if(finished)$('confirmation').textContent=copy()[finished];}
function done(key){finished=key;$('survey').hidden=true;$('done').hidden=false;translate();$('done').focus();}
function busy(value){saving=value;for(const id of ['send','skip','language','theme','reasons','note'])$(id).disabled=value;$('send').textContent=copy()[value?'sending':'send'];}
$('language').addEventListener('change',()=>{state.locale=$('language').value;translate();});
$('skip').addEventListener('click',()=>{if(!saving)done('goodbye');});
window.feedbackChallengeReady=()=>{widget=turnstile.render('#challenge',{sitekey:${JSON.stringify(siteKey)},action:'feedback',theme:document.documentElement.dataset.theme,callback:token=>{challengeToken=token;},'expired-callback':()=>{challengeToken='';},'error-callback':()=>{challengeToken='';errorKey='feedbackError';translate();}});};
function updateTheme(){const previous=document.documentElement.dataset.theme;applyTheme();preferenceLabels();if(previous!==document.documentElement.dataset.theme&&window.turnstile&&widget!==undefined){challengeToken='';turnstile.remove(widget);window.feedbackChallengeReady();}}
$('theme').addEventListener('change',()=>{themeChoice=$('theme').value;try{localStorage.setItem('feedback-theme',themeChoice);}catch{}updateTheme();});
colorScheme.addEventListener('change',()=>{if(themeChoice==='system')updateTheme();});
window.addEventListener('storage',event=>{if(event.key==='feedback-theme'){themeChoice=['light','dark'].includes(event.newValue)?event.newValue:'system';$('theme').value=themeChoice;updateTheme();}});
$('form').addEventListener('submit',async event=>{
 event.preventDefault();if(saving||finished)return;
 const selected=document.querySelector('input[name=reason]:checked');
 if(!selected){errorKey='chooseReason';translate();document.querySelector('input[name=reason]').focus();return;}
 const data={source:state.source,reason:selected.value,comment:$('note').value,locale:state.locale,version:state.version,browser:state.browser,os:state.os};
 const serialized=JSON.stringify(data);if(lastPayload&&lastPayload!==serialized)requestId=crypto.randomUUID();lastPayload=serialized;
 errorKey='';translate();busy(true);
 try{
  const response=await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...data,id:requestId,token:challengeToken,website:$('website').value}),signal:AbortSignal.timeout(15000)});
  const result=await response.json();if(!response.ok||result.saved!==true||result.id!==requestId)throw Error('Unconfirmed');
  busy(false);done(state.source==='installed'?'feedbackThanks':'thanks');
 }catch{busy(false);errorKey='feedbackError';translate();challengeToken='';if(window.turnstile&&widget!==undefined)turnstile.reset(widget);}
});
translate();
</script><script nonce="${nonce}" src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=feedbackChallengeReady&render=explicit" async defer></script></body></html>`;
}
