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
:root{--page:#f5f4ef;--text:#172c2a;--muted:#506460;--surface:#fff;--border:#bbc8c3;--selected:#e9f6ef;--accent:#14765b;--button:#145c49;--on-button:#fff;--error:#a12e28}
[data-theme=dark]{--page:#111916;--text:#e8f1eb;--muted:#acbdb4;--surface:#1c2923;--border:#51665a;--selected:#203e30;--accent:#80d7a9;--button:#94dfb8;--on-button:#10291c;--error:#ffb4aa}

*{box-sizing:border-box}body{margin:0;background:var(--page);color:var(--text);font:17px/1.5 system-ui,sans-serif}main{max-width:700px;margin:auto;padding:32px 20px 64px}header{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;font-size:13px}select{max-width:150px;padding:8px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text)}h1{font-size:clamp(28px,6vw,42px);line-height:1.15;margin:42px 0 16px;letter-spacing:-.035em}p{margin:12px 0}.muted{color:var(--muted);font-size:14px}fieldset{border:0;padding:0;margin:24px 0}legend{margin-bottom:12px}.reason{display:flex;align-items:center;gap:12px;background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:12px;padding:14px 16px;margin:8px 0;cursor:pointer}.reason:has(input:checked){border-color:var(--accent);background:var(--selected);box-shadow:0 0 0 1px var(--accent)}input[type=radio]{accent-color:var(--accent);width:18px;height:18px;flex-shrink:0}button{font:inherit;border-radius:10px;padding:12px 20px;cursor:pointer;border:1px solid var(--border);background:var(--surface);color:var(--text)}button[type=submit]{background:var(--button);color:var(--on-button);border-color:var(--button)}button:disabled{opacity:.6;cursor:wait}:focus-visible{outline:3px solid #df9a32;outline-offset:3px}textarea{display:block;width:100%;min-height:110px;resize:vertical;border:1px solid var(--border);border-radius:8px;padding:12px;font:inherit;background:var(--surface);color:var(--text)}summary{cursor:pointer;padding:12px 0}.actions{display:flex;gap:12px;flex-wrap:wrap;margin:24px 0}#error{color:var(--error)}#done{padding:40px 0}.trap{position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden}[hidden]{display:none!important}
a{color:var(--accent)}.preferences{display:flex;flex-wrap:wrap;gap:12px}.preferences label{display:flex;align-items:center;gap:6px}
</style></head><body><main>
<header><strong>ChatGPT Audio Controls</strong><div class="preferences"><label><span id="languageLabel">Language</span> <select id="language"></select></label><label><span data-copy="appearance"></span><select id="theme"><option value="system" data-copy="themeSystem"></option><option value="light" data-copy="themeLight"></option><option value="dark" data-copy="themeDark"></option></select></label></div></header>
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
function translate(){document.documentElement.lang=state.locale;$('privacy-link').href='https://infoxica.github.io/chatgpt-audio-controls/'+(state.locale==='en'?'':state.locale+'/')+'#privacy';document.querySelectorAll('[data-copy]').forEach(el=>el.textContent=copy()[el.dataset.copy]);$('languageLabel').textContent=copy().language;$('error').textContent=errorKey?copy()[errorKey]:'';if(finished)$('confirmation').textContent=copy()[finished];}
function done(key){finished=key;$('survey').hidden=true;$('done').hidden=false;translate();$('done').focus();}
function busy(value){saving=value;for(const id of ['send','skip','language','theme','reasons','note'])$(id).disabled=value;$('send').textContent=copy()[value?'sending':'send'];}
$('language').addEventListener('change',()=>{state.locale=$('language').value;translate();});
$('skip').addEventListener('click',()=>{if(!saving)done('goodbye');});
window.feedbackChallengeReady=()=>{widget=turnstile.render('#challenge',{sitekey:${JSON.stringify(siteKey)},action:'feedback',theme:document.documentElement.dataset.theme,callback:token=>{challengeToken=token;},'expired-callback':()=>{challengeToken='';},'error-callback':()=>{challengeToken='';errorKey='feedbackError';translate();}});};
function updateTheme(){const previous=document.documentElement.dataset.theme;applyTheme();if(previous!==document.documentElement.dataset.theme&&window.turnstile&&widget!==undefined){challengeToken='';turnstile.remove(widget);window.feedbackChallengeReady();}}
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
