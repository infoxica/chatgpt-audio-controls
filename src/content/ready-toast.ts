import { getLucideSvg } from './icons';
export class ReadyToast {
  private element: HTMLElement | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  clear(): void { clearTimeout(this.timer); this.timer = undefined; this.element?.remove(); this.element = null; }
  show(message: string, download: string, dismiss: string, direction: 'ltr' | 'rtl', onDownload: () => void, language = 'en'): void {
    this.clear();
    const el = document.createElement('div'); el.id = 'cgpt-ra-ready-toast'; el.dir = direction; el.lang = language;
    const text = document.createElement('span'); text.setAttribute('role', 'status'); text.setAttribute('aria-live', 'polite');
    const action = document.createElement('button'); action.textContent = download; action.type = 'button';
    const close = document.createElement('button'); close.innerHTML = getLucideSvg('x'); close.setAttribute('aria-label', dismiss); close.title = dismiss; close.className = 'cgpt-ra-toast-dismiss'; close.type = 'button';
    action.onclick = () => { this.clear(); onDownload(); }; close.onclick = () => this.clear();
    const icon = document.createElement('span'); icon.className = 'cgpt-ra-toast-success'; icon.setAttribute('aria-hidden', 'true'); icon.innerHTML = getLucideSvg('check');
    el.append(icon, text, action, close); document.body.append(el); text.textContent = message; this.element = el;
    let remaining = 5000, started = performance.now(), hovered = false;
    const pause = () => { if (this.timer !== undefined) { clearTimeout(this.timer); this.timer = undefined; remaining = Math.max(0, remaining - (performance.now() - started)); } };
    const resume = () => { if (this.element === el && !hovered && !el.contains(document.activeElement)) { pause(); started = performance.now(); this.timer = setTimeout(() => this.clear(), remaining); } };
    el.addEventListener('mouseenter', () => { hovered = true; pause(); }); el.addEventListener('mouseleave', () => { hovered = false; resume(); });
    el.addEventListener('focusin', pause); el.addEventListener('focusout', () => queueMicrotask(resume)); resume();
  }
}
