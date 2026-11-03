import { ENGAGEMENT_KEY, EngagementAction, EngagementResult, reduceEngagement, validateEngagement } from './engagement';
declare const __USERSCRIPT__: boolean;
const standalone = typeof __USERSCRIPT__ !== 'undefined' && __USERSCRIPT__;
const SOURCE = 'chatgpt-audio-controls-engagement';
let lastSession = 0;
export async function engagementRequest(action: EngagementAction): Promise<EngagementResult> {
  if (standalone) {
    // Web Locks serialize tabs on the same origin. Without locks, fail closed.
    if (!navigator.locks) throw new Error('Local coordination unavailable');
    return navigator.locks.request(ENGAGEMENT_KEY, () => {
      const value = JSON.parse(localStorage.getItem(ENGAGEMENT_KEY) || 'null');
      if (action.type === 'qualify') {
        if (action.session <= lastSession) return { state: validateEngagement(value) };
        lastSession = action.session;
      }
      const result = reduceEngagement(value, action);
      if (action.type !== 'read') {
        localStorage.setItem(ENGAGEMENT_KEY, JSON.stringify(result.state));
        window.dispatchEvent(new Event('cgpt-ra-engagement-change'));
      }
      return result;
    });
  }
  if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
    const reply = await chrome.runtime.sendMessage({ type: 'engagement', action });
    if (!reply?.ok) throw new Error('Could not save support preferences');
    return reply.result;
  }
  return new Promise((resolve, reject) => {
    const id = crypto.randomUUID();
    const finish = () => { clearTimeout(timer); window.removeEventListener('message', listener); };
    const listener = (event: MessageEvent) => {
      if (event.source !== window || event.data?.source !== SOURCE || event.data.type !== 'result' || event.data.id !== id) return;
      finish(); event.data.ok ? resolve(event.data.result) : reject(new Error('Support storage unavailable'));
    };
    const timer = setTimeout(() => { finish(); reject(new Error('Support bridge unavailable')); }, 4000);
    window.addEventListener('message', listener);
    window.postMessage({ source: SOURCE, type: 'request', id, action }, '*');
  });
}
export function watchEngagement(changed: () => void): () => void {
  const message = (event: MessageEvent) => { if (event.source === window && event.data?.source === SOURCE && event.data.type === 'changed') changed(); };
  const storage = (event: StorageEvent) => { if (event.key === ENGAGEMENT_KEY) changed(); };
  const chromeStorage = (changes: Record<string, unknown>, area: string) => { if (area === 'local' && changes[ENGAGEMENT_KEY]) changed(); };
  window.addEventListener('message', message); window.addEventListener('storage', storage); window.addEventListener('cgpt-ra-engagement-change', changed);
  if (!standalone && typeof chrome !== 'undefined') chrome.storage?.onChanged?.addListener(chromeStorage);
  return () => {
    window.removeEventListener('message', message); window.removeEventListener('storage', storage); window.removeEventListener('cgpt-ra-engagement-change', changed);
    if (!standalone && typeof chrome !== 'undefined') chrome.storage?.onChanged?.removeListener(chromeStorage);
  };
}
