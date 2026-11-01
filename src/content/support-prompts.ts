import { engagementRequest, watchEngagement } from '../shared/engagement-client';
import { eligibleRequest, type EngagementResult, type EngagementState, type RequestKind } from '../shared/engagement';
import { donationCopy } from '../shared/i18n/donations';
import { supportCopy } from '../shared/i18n/support';
import { languageDirection, resolveLanguage } from '../shared/i18n/core';
import { REVIEW_URLS, reviewStores, sponsorURL, SPONSOR_AMOUNTS } from '../shared/support';
import { ListeningUse, type ListeningActivity } from './listening-use';
import { getLucideSvg } from './icons';

type Rect = { x: number; y: number; width: number; height: number };
export function promptPosition(view: Rect, size: { width: number; height: number }, anchor: Rect, obstacles: Rect[]): { x: number; y: number } | undefined {
  const pad = 12, gap = 12, { width, height } = size;
  if (width > view.width - pad * 2 || height > view.height - pad * 2) return;
  const clampX = (x: number) => Math.max(view.x + pad, Math.min(x, view.x + view.width - width - pad));
  const positions = [
    { x: clampX(anchor.x + anchor.width - width), y: anchor.y - height - gap },
    { x: clampX(anchor.x), y: anchor.y + anchor.height + gap },
    { x: anchor.x - width - gap, y: anchor.y }, { x: anchor.x + anchor.width + gap, y: anchor.y },
    { x: view.x + pad, y: view.y + pad }, { x: view.x + view.width - width - pad, y: view.y + pad },
  ];
  return positions.find(p => p.x >= view.x + pad && p.y >= view.y + pad && p.x + width <= view.x + view.width - pad && p.y + height <= view.y + view.height - pad && obstacles.every(r => p.x + width + 8 <= r.x || r.x + r.width + 8 <= p.x || p.y + height + 8 <= r.y || r.y + r.height + 8 <= p.y));
}
const visible = (el: Element): boolean => {
  const style = getComputedStyle(el), r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
};
export class SupportPrompts {
  private listening = new ListeningUse();
  private pausedAt = 0;
  private hasSession = false;
  private session = 0;
  private epoch = 0;
  private element: HTMLElement | null = null;
  private current: EngagementResult['prompt'];
  private busy = false;
  private broken = false;
  private path = location.pathname;
  private lastTyping = 0;
  private state: EngagementState | null = null;
  constructor(private context: () => { language?: string; hidden: boolean; composer: HTMLElement | null }) {
    setInterval(() => void this.tick(), 750);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && this.element) { event.preventDefault(); void this.respond('dismiss'); return; }
      const el = event.target as HTMLElement | null;
      if (el?.closest('input,textarea,[contenteditable="true"],[role="textbox"]') && !this.element?.contains(el)) this.lastTyping = Date.now();
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.element) this.element.style.visibility = 'hidden'; });
    const refresh = () => {
      void engagementRequest({ type: 'read' }).then(({ state }) => {
        this.state = state;
        if (!state.enabled || (this.current && state[this.current.kind].status !== 'shown')) this.clear();
      }).catch(() => this.fail());
    };
    watchEngagement(refresh); refresh();
  }
  observe(activity: ListeningActivity): void {
    if (activity.event === 'dispose') { this.hasSession = false; this.pausedAt = 0; this.clear(); return; }
    if (activity.event === 'start' || activity.session !== this.session) {
      this.session = activity.session; this.hasSession = true; this.pausedAt = 0; this.clear();
    }
    if (this.listening.observe(activity)) void engagementRequest({ type: 'qualify', session: activity.session }).then(({ state }) => { this.state = state; }).catch(() => this.fail());
    if (activity.event === 'pause' || activity.event === 'ended') { if (!this.pausedAt) this.pausedAt = Date.now(); }
    else if (activity.advancing) { this.pausedAt = 0; this.clear(); }
  }
  private fail(): void { this.broken = true; this.clear(); }
  private clear(): void { this.epoch++; this.element?.remove(); this.element = null; this.current = undefined; }
  private unsafe(): boolean {
    const context = this.context();
    return document.hidden || context.hidden || Date.now() - this.lastTyping < 3000 || Boolean(document.querySelector('.cgpt-ra-dragging')) ||
      Array.from(document.querySelectorAll('dialog[open],[role="dialog"],[role="menu"],[role="listbox"],[popover]:popover-open,.cgpt-open,#cgpt-ra-ready-toast')).some(visible);
  }
  private position(el: HTMLElement): boolean {
    const viewport = window.visualViewport;
    const view = { x: viewport?.offsetLeft || 0, y: viewport?.offsetTop || 0, width: viewport?.width || innerWidth, height: viewport?.height || innerHeight };
    el.style.width = `${Math.min(380, view.width - 24)}px`;
    const controls = Array.from(document.querySelectorAll<HTMLElement>('#cgpt-ra-left,#cgpt-ra-right,#cgpt-ra-floating-toggle')).filter(visible);
    if (!controls.length) return false;
    const composer = this.context().composer;
    const native = Array.from(document.querySelectorAll<HTMLElement>('header,nav,[role="navigation"]')).filter(e => !e.closest('article,[data-message-author-role],[data-writing-block]') && visible(e));
    const obstacles = [...controls, ...native, ...(composer ? [composer] : [])].map(el => el.getBoundingClientRect());
    const anchor = controls[0].getBoundingClientRect();
    const position = promptPosition(view, el.getBoundingClientRect(), anchor, obstacles);
    if (!position) return false;
    el.style.left = `${position.x}px`; el.style.top = `${position.y}px`; return true;
  }
  private async tick(): Promise<void> {
    if (location.pathname !== this.path) { this.path = location.pathname; this.hasSession = false; this.clear(); }
    if (this.element) {
      if (this.context().hidden) { this.clear(); return; }
      if (this.current && this.element.lang !== resolveLanguage(this.context().language)) {
        this.element.remove(); this.element = this.build(this.current.kind, this.current.reminder); document.body.append(this.element);
      }
      // A temporary menu, typing or viewport constraint must not dismiss a shown request.
      this.element.style.visibility = this.unsafe() || !this.position(this.element) ? 'hidden' : 'visible';
      return;
    }
    if (this.busy || this.broken || !this.hasSession || !this.pausedAt || !this.state || !eligibleRequest(this.state, Date.now()) || Date.now() - this.pausedAt < 3000 || this.unsafe()) return;
    this.busy = true; const epoch = this.epoch;
    let preview: HTMLElement | undefined;
    try {
      const { state } = await engagementRequest({ type: 'read' });
      const kind = eligibleRequest(state, Date.now());
      if (!kind || epoch !== this.epoch || this.unsafe()) return;
      preview = this.build(kind, state[kind].displays === 1);
      preview.style.visibility = 'hidden'; document.body.append(preview);
      if (!this.position(preview)) return; // Never consume a request that cannot fit.
      const result = await engagementRequest({ type: 'claim' });
      this.state = result.state;
      if (!result.prompt || epoch !== this.epoch || this.unsafe()) return;
      preview.remove(); preview = this.build(result.prompt.kind, result.prompt.reminder);
      preview.style.visibility = 'hidden'; document.body.append(preview);
      if (!this.position(preview)) return;
      this.current = result.prompt; this.element = preview; preview = undefined;
      this.element.style.visibility = 'visible';
      // Insert the announcement after mounting, without moving keyboard focus.
      const status = this.element.querySelector('[role="status"]')!;
      status.textContent = this.element.querySelector('h2')!.textContent;
    } catch { this.fail(); }
    finally { preview?.remove(); this.busy = false; }
  }
  private async respond(response: 'later' | 'dismiss'): Promise<void> {
    const current = this.current; this.clear();
    if (current) try { await engagementRequest({ type: 'respond', kind: current.kind, display: current.display, response }); } catch { this.fail(); }
  }
  private build(kind: RequestKind, reminder: boolean): HTMLElement {
    const language = this.context().language, d = donationCopy(language), s = supportCopy(language || 'auto');
    const el = document.createElement('section'); el.id = 'cgpt-ra-support-prompt'; el.dir = languageDirection(language); el.lang = resolveLanguage(language); el.setAttribute('aria-labelledby', 'cgpt-ra-support-title');
    const status = document.createElement('span'); status.className = 'cgpt-ra-support-announcement'; status.setAttribute('role', 'status'); el.append(status);
    const heading = document.createElement('h2'); heading.id = 'cgpt-ra-support-title'; heading.textContent = kind === 'donation' ? d.title : s[0];
    const close = document.createElement('button'); close.type = 'button'; close.className = 'cgpt-ra-support-close'; close.innerHTML = getLucideSvg('x'); close.setAttribute('aria-label', d.never); close.title = d.never; close.onclick = () => void this.respond('dismiss'); el.append(heading, close);
    const paragraph = (text: string) => { const p = document.createElement('p'); p.textContent = text; el.append(p); };
    paragraph(kind === 'donation' ? d.value : s[1]);
    const links = document.createElement('div'); links.className = 'cgpt-ra-support-actions';
    const link = (href: string, text: string, action: RequestKind, label = text) => {
      const a = document.createElement('a'); a.href = href; a.target = '_blank'; a.rel = 'noreferrer'; a.textContent = text; a.setAttribute('aria-label', label);
      a.onclick = () => { this.clear(); void engagementRequest({ type: 'opened', kind: action }).catch(() => this.fail()); }; links.append(a);
    };
    if (kind === 'donation') {
      paragraph(d.costs); paragraph(d.once);
      for (const amount of SPONSOR_AMOUNTS) link(sponsorURL(amount), `US$${amount}`, 'donation', `${d.donate} · US$${amount} · GitHub Sponsors`);
    }
    for (const store of reviewStores(navigator.userAgent)) link(REVIEW_URLS[store], `${s[3]} · ${store === 'edge' ? 'Edge' : 'Chrome'}`, 'review');
    el.append(links);
    if (kind === 'donation') paragraph(d.privacy);
    const actions = document.createElement('div'); actions.className = 'cgpt-ra-support-actions secondary';
    for (const [text, response] of [[d.later, 'later'], [d.never, 'dismiss']] as const) {
      if (reminder && response === 'later') continue;
      const button = document.createElement('button'); button.type = 'button'; button.textContent = text; button.onclick = () => void this.respond(response); actions.append(button);
    }
    el.append(actions); return el;
  }
}
