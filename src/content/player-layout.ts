import { PRESETS, defaultLayout, defaultProfile, isLayout, migrateLayout, LayoutPreferences, LayoutProfile, layoutProfile, LAYOUT_KEY } from '../shared/layout';
import { featureCopy } from '../shared/i18n/features';
import { languageDirection, getTranslations } from '../shared/i18n/core';
import { dockGeometry, intersects, fits, distanceToRect, magneticOffset, PlayerGeometry, Rect } from './layout-geometry';
import { getLucideSvg, setIcon } from './icons';

declare const __USERSCRIPT__: boolean;
declare const __PLAYER_CSS__: string;
const standalone = typeof __USERSCRIPT__ !== 'undefined' && __USERSCRIPT__;
const source = 'chatgpt-audio-controls-settings-bridge';
const bounds = (el: HTMLElement): Rect => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
// Collapsed app navigation can keep its full layout width inside a transparent
// or clipped ancestor. Only its painted portion should reserve player space.
function visibleBounds(el: HTMLElement): Rect | null {
  const r = bounds(el);
  if (r.width <= 0 || r.height <= 0 || getComputedStyle(el).visibility !== 'visible') return null;
  let left = r.x, top = r.y, right = r.x + r.width, bottom = r.y + r.height;
  for (let node: HTMLElement | null = el; node; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (node.hidden || node.getAttribute('aria-hidden') === 'true' || style.display === 'none' || style.opacity === '0' || style.contentVisibility === 'hidden') return null;
    if (node === el || style.display === 'contents') continue;
    const clipX = /^(hidden|clip|scroll|auto)$/.test(style.overflowX);
    const clipY = /^(hidden|clip|scroll|auto)$/.test(style.overflowY);
    if (clipX || clipY) {
      const clip = node.getBoundingClientRect();
      if (clipX) { left = Math.max(left, clip.left); right = Math.min(right, clip.right); }
      if (clipY) { top = Math.max(top, clip.top); bottom = Math.min(bottom, clip.bottom); }
    }
  }
  return right > left && bottom > top ? { x: left, y: top, width: right - left, height: bottom - top } : null;
}
export class PlayerLayout {
  private preferences = defaultLayout();
  private expanded = false;
  private composer: HTMLElement | null = null;
  private surface = document.createElement('div');
  private join = document.createElement('div');
  private layer = document.createElement('div');
  private overlay: HTMLElement | null = null;
  private cancelDrag: (() => void) | null = null;
  private dragging = false;
  private motion = 220;
  private previous = '';
  private lastExpanded = false;
  private extras = document.createElement('div');
  private more = document.createElement('button');
  private pending = new Map<string, { resolve: () => void; reject: () => void; timer: ReturnType<typeof setTimeout> }>();
  constructor(private seek: HTMLElement, private controls: HTMLElement, private circle: HTMLButtonElement, private changed: () => void, private failed: () => void, private language: () => string | undefined) {
    this.surface.id = 'cgpt-ra-dock'; this.surface.setAttribute('aria-hidden', 'true'); this.layer.id = 'cgpt-ra-layer'; document.body.append(this.layer); this.layer.append(this.surface, seek, controls, circle);
    this.join.className = 'cgpt-ra-dock-join'; this.join.setAttribute('aria-hidden', 'true'); this.join.hidden = true; this.layer.prepend(this.join);
    if (standalone) { try { this.preferences = migrateLayout(JSON.parse(localStorage.getItem(LAYOUT_KEY) || 'null')); } catch {} }
    window.addEventListener('message', event => {
      if (event.source !== window || event.data?.source !== source) return;
      if (event.data.type === 'CGPT_RA_LAYOUT_UPDATE' && isLayout(event.data.layout)) {
        this.cancelDrag?.();
        const next = event.data.layout;
        if (JSON.stringify(next) === JSON.stringify(defaultLayout())) this.motion = 280;
        this.preferences = next; this.changed();
      }
      if (event.data.type === 'CGPT_RA_LAYOUT_SAVED') {
        const job = this.pending.get(event.data.id); if (!job) return;
        clearTimeout(job.timer); this.pending.delete(event.data.id); event.data.ok ? job.resolve() : job.reject();
      }
    });
    window.addEventListener('storage', event => {
      if (!standalone || event.key !== LAYOUT_KEY) return;
      this.cancelDrag?.();
      try { this.preferences = migrateLayout(JSON.parse(event.newValue || 'null')); this.changed(); } catch {}
    });
    this.installDrag(circle);
    for (const pill of [seek, controls]) {
      const grip = document.createElement('button'); grip.type = 'button'; grip.className = 'cgpt-ra-grip';
      grip.innerHTML = getLucideSvg('grip-vertical');
      pill.prepend(grip); this.installDrag(grip, pill);
    }
    this.extras.className = 'cgpt-ra-extras';
    this.extras.id = 'cgpt-ra-extras';
    for (const el of controls.querySelectorAll(':scope > .cgpt-ra-speed-wrap, :scope > .cgpt-ra-volume-wrap, :scope > .cgpt-ra-download, :scope > .cgpt-ra-help-wrap')) this.extras.append(el);
    this.more.type = 'button'; this.more.className = 'cgpt-ra-icon-btn cgpt-ra-more';
    this.more.innerHTML = getLucideSvg('ellipsis');
    this.more.setAttribute('aria-controls', this.extras.id); this.more.setAttribute('aria-expanded', 'false');
    this.more.onclick = () => {
      const open = this.extras.classList.toggle('cgpt-open');
      this.more.setAttribute('aria-expanded', String(open));
      if (!open) this.extras.querySelectorAll('.cgpt-open').forEach(el => el.classList.remove('cgpt-open'));
      this.positionPopovers();
    };
    controls.addEventListener('keydown', event => {
      const popover = this.extras.querySelector<HTMLElement>('.cgpt-open');
      if (event.key === 'Escape' && (this.extras.classList.contains('cgpt-open') || popover)) {
        event.preventDefault();
        const trigger = this.more.getClientRects().length ? this.more : popover?.querySelector<HTMLButtonElement>('button');
        this.extras.classList.remove('cgpt-open');
        this.extras.querySelectorAll('.cgpt-open').forEach(el => el.classList.remove('cgpt-open'));
        this.more.setAttribute('aria-expanded', 'false'); trigger?.focus();
      }
    });
    controls.append(this.more, this.extras);
    window.postMessage({ source, type: 'CGPT_RA_LAYOUT_REQUEST' }, '*');
  }
  async reset(): Promise<void> { this.cancelDrag?.(); this.motion = 280; await this.save(defaultLayout()); }
  setPageVisible(visible: boolean): void {
    this.layer.hidden = !visible;
    if (!visible) {
      this.cancelDrag?.();
      this.controls.querySelectorAll('.cgpt-open').forEach(el => el.classList.remove('cgpt-open'));
      this.more.setAttribute('aria-expanded', 'false');
    }
  }
  private async save(value: LayoutPreferences): Promise<void> {
    try {
      if (standalone) localStorage.setItem(LAYOUT_KEY, JSON.stringify(value));
      else await new Promise<void>((resolve, reject) => {
        const id = crypto.randomUUID();
        const timer = setTimeout(() => { this.pending.delete(id); reject(); }, 4000);
        this.pending.set(id, { resolve, reject, timer });
        window.postMessage({ source, type: 'CGPT_RA_LAYOUT_SAVE', id, layout: value }, '*');
      });
      this.preferences = value;
    } catch { this.failed(); }
    this.changed();
  }
  private viewport(): Rect {
    const v = window.visualViewport, safe = getComputedStyle(this.circle);
    const inset = (side: string) => Math.max(12, parseFloat(safe.getPropertyValue('--cgpt-safe-' + side)) || 0);
    const left = inset('left'), right = inset('right'), top = inset('top'), bottom = inset('bottom');
    return { x: (v?.offsetLeft || 0) + left, y: (v?.offsetTop || 0) + top, width: Math.max(44, (v?.width || innerWidth) - left - right), height: Math.max(44, (v?.height || innerHeight) - top - bottom) };
  }
  private obstacles(): Rect[] {
    return Array.from(document.querySelectorAll<HTMLElement>('header, [role="banner"], nav[aria-label], [data-testid="page-header"], [data-testid="app-shell-sidebar"], #app-shell-sidebar'))
      .filter(e => !e.closest('[id^="cgpt-ra"], article, [data-message-author-role], [data-testid^="conversation-turn"], [data-writing-block]')).map(visibleBounds)
      .filter((r): r is Rect => !!r && r.width <= innerWidth && (r.height < innerHeight * .7 || r.width < innerWidth * .45));
  }
  private nativeActions(): Rect[] {
    // Only application chrome outside conversations/composers; response toolbars
    // and email editors must never force the player away from its saved dock.
    return Array.from(document.querySelectorAll<HTMLElement>('header button, [role="banner"] button, [data-testid="page-header"] button, [data-testid="conversation-header"] button, #conversation-header-actions button, [data-testid="share-chat-button"], [data-testid="conversation-options-button"]'))
      .filter(e => !e.closest('[id^="cgpt-ra"], article, [data-message-author-role], [data-testid^="conversation-turn"], [data-writing-block], form, [contenteditable]'))
      .map(visibleBounds).filter((r): r is Rect => !!r);
  }
  private geometry(p: LayoutProfile, expanded: boolean): PlayerGeometry | null {
    const viewport = this.viewport(), obstacles = this.obstacles(), area = { ...viewport };
    for (const o of obstacles) {
      if (o.width > viewport.width * .45 && o.y < area.y + 90 && o.y + o.height < area.y + area.height / 2) {
        const bottom = area.y + area.height; area.y = Math.max(area.y, o.y + o.height + 8); area.height = bottom - area.y;
      }
      if (o.height > viewport.height * .6 && o.width < viewport.width * .45 && o.x <= area.x) {
        const right = area.x + area.width; area.x = Math.max(area.x, o.x + o.width + 8); area.width = right - area.x;
      }
    }
    const c = this.composer ? bounds(this.composer) : undefined;
    const native = this.composer && getComputedStyle(this.composer);
    const radius = (value: string | undefined) => value?.endsWith('%') ? (parseFloat(value) || 0) * (c?.width || 0) / 100 : parseFloat(value || '') || 0;
    const environment = { actions: this.nativeActions(), cornerLeft: radius(native?.borderTopLeftRadius), cornerRight: radius(native?.borderTopRightRadius) };
    let result = dockGeometry(p, area, expanded, c, languageDirection(this.language()) === 'rtl', layoutProfile(innerWidth) === 'narrow', environment);
    // A corner that intersects the composer can move upward, keeping its shape.
    if (c && expanded && p.preset.startsWith('bottom') && (!result || [result.seek, result.controls, result.circle].some(r => intersects(r, c)))) {
      result = dockGeometry(p, { ...area, height: c.y - area.y - 8 }, expanded, c, false, false, environment);
    }
    if (!result) return null;
    const parts = expanded ? [result.seek, result.controls, result.circle] : [result.circle];
    if (parts.some(r => !fits(r, viewport) || obstacles.some(o => intersects(r, o)) || c && intersects(r, c))) return null;
    return result;
  }
  private compactGeometry(profile: LayoutProfile, expanded: boolean): PlayerGeometry | null {
    const v = this.viewport(), obstacles = this.obstacles(), c = this.composer && bounds(this.composer);
    // A temporary floating surface keeps an absent/off-screen composer from
    // turning the expand button into a dead end. It is never persisted.
    const bottoms = [c ? c.y - 8 : v.y + v.height, v.y + v.height, v.y + 100];
    for (const bottom of bottoms) {
      const g = dockGeometry({ ...profile, preset: 'composer' }, v, expanded, { x: v.x, y: bottom, width: v.width, height: 0 }, languageDirection(this.language()) === 'rtl', true);
      if (!g) continue;
      const parts = expanded ? [g.surface!, g.circle] : [g.circle];
      if (parts.every(r => !obstacles.some(o => intersects(r, o)) && (!c || !intersects(r, c)))) return { ...g, attachedToComposer: false };
    }
    return null;
  }
  sync(composer: HTMLElement | null, expanded: boolean): void {
    this.composer = composer; this.expanded = expanded;
    // ChatGPT can replace body children during hydration or navigation. Keep the
    // existing controls (and their listeners/session) instead of rebuilding UI.
    if (!this.layer.isConnected && document.body) {
      this.cancelDrag?.();
      document.body.append(this.layer);
      this.previous = '';
    }
    if (this.dragging) return;
    const key = layoutProfile(innerWidth), profile = this.preferences[key];
    const geometry = this.geometry(profile, expanded) || this.compactGeometry(profile, expanded);
    const composerStyle = composer && getComputedStyle(composer);
    const nativeShadow = composerStyle?.boxShadow;
    const corners = composerStyle ? [composerStyle.borderTopLeftRadius, composerStyle.borderTopRightRadius] : undefined;
    const signature = JSON.stringify([geometry, expanded, this.language(), composerStyle?.backgroundColor, composerStyle?.borderLeftColor, nativeShadow, corners]);
    if (this.previous === signature) {
      this.surface.hidden = !geometry?.surface || this.circle.classList.contains('cgpt-ra-hidden');
      this.join.hidden = this.surface.hidden || !expanded || !geometry?.attachedToComposer;
      this.positionPopovers(); return;
    }
    const elements = [this.seek, this.controls, this.circle, this.surface, this.join];
    const before = elements.map(bounds);
    for (const el of elements) { el.getAnimations().forEach(a => a.cancel()); el.style.transform = ''; }
    if (!geometry) {
      this.seek.classList.add('cgpt-ra-fit-hidden'); this.controls.classList.add('cgpt-ra-fit-hidden'); this.surface.hidden = true;
      this.join.hidden = true;
      const v = this.viewport();
      const candidates = [
        this.geometry({ preset: 'composer', seekFirst: true }, false)?.circle,
        { x: v.x + v.width - 44, y: v.y, width: 44, height: 44 },
        { x: v.x, y: v.y, width: 44, height: 44 },
      ].filter((r): r is Rect => !!r);
      this.place(this.circle, candidates.find(r => !this.obstacles().some(o => intersects(r, o))) || candidates[0]);
      this.circle.classList.remove('cgpt-ra-dock-toggle'); this.circle.classList.add('cgpt-ra-logo'); setIcon(this.circle, 'chatgpt-audio'); return;
    }
    const changed = this.previous !== signature, animate = !!this.previous && changed && !this.reducedMotion();
    const duration = expanded !== this.lastExpanded ? 200 : this.motion;
    this.previous = signature; this.motion = 220;
    const docked = !!geometry.surface;
    for (const el of [this.seek, this.controls]) {
      el.classList.remove('cgpt-ra-fit-hidden');
      el.classList.toggle('cgpt-ra-in-dock', docked);
      el.inert = !expanded;
    }
    this.seek.classList.toggle('cgpt-ra-vertical', geometry.verticalSeek);
    this.controls.classList.toggle('cgpt-ra-vertical', geometry.verticalControls);
    this.controls.classList.toggle('cgpt-ra-compact-controls', !!geometry.compactControls);
    this.more.title = getTranslations(this.language()).popup.tabs.controls;
    this.more.setAttribute('aria-label', this.more.title);
    this.circle.dataset.preset = profile.preset;
    this.circle.classList.toggle('cgpt-ra-dock-toggle', docked);
    this.circle.classList.toggle('cgpt-ra-logo', !expanded);
    setIcon(this.circle, expanded ? (docked ? 'chevron-down' : 'minimize-2') : 'chatgpt-audio');
    if (geometry.circleVisual) {
      this.circle.style.setProperty('--toggle-top', (geometry.circleVisual.y - geometry.circle.y) + 'px');
    }
    this.place(this.seek, geometry.seek); this.place(this.controls, geometry.controls); this.place(this.circle, geometry.circle);
    this.surface.hidden = !docked || this.circle.classList.contains('cgpt-ra-hidden');
    this.join.hidden = this.surface.hidden || !expanded || !geometry.attachedToComposer;
    if (geometry.surface) {
      this.place(this.surface, geometry.surface);
      const style = composerStyle;
      this.surface.style.background = style && style.backgroundColor !== 'rgba(0, 0, 0, 0)' ? style.backgroundColor : getComputedStyle(this.controls).getPropertyValue('--cgpt-ra-bg');
      if (geometry.attachedToComposer) this.paintJoin(this.join, geometry.surface, this.surface.style.background);
      this.surface.style.borderColor = style?.borderLeftColor || '';
      this.surface.style.borderWidth = style?.borderLeftWidth || '';
      this.surface.style.borderStyle = style?.borderLeftStyle || '';
      this.surface.style.borderBottomWidth = geometry.attachedToComposer ? '0' : (style?.borderLeftWidth || '');
      // Copy the complete native ring/shadow rather than fabricating a 1px ring.
      this.surface.style.boxShadow = nativeShadow || 'none';
      this.surface.style.clipPath = geometry.attachedToComposer ? 'inset(-8px -8px 0)' : 'none';
      this.circle.style.setProperty('--dock-border', style?.borderLeftColor || 'var(--cgpt-ra-border)');
      this.circle.style.setProperty('--dock-border-width', style?.borderLeftWidth || '1px');
      this.circle.style.setProperty('--dock-border-style', style?.borderLeftStyle || 'solid');
      this.circle.style.setProperty('--dock-shadow', nativeShadow || 'none');
      this.circle.style.setProperty('--dock-background', this.surface.style.background);
      this.surface.style.borderTopLeftRadius = corners?.[0] || '28px';
      this.surface.style.borderTopRightRadius = corners?.[1] || '28px';
      this.surface.style.borderBottomLeftRadius = this.surface.style.borderBottomRightRadius = geometry.attachedToComposer ? '0' : '24px';
    }
    this.surface.classList.toggle('cgpt-ra-dock-closed', !expanded);
    if (animate) {
      elements.forEach((el, i) => {
        const after = bounds(el), old = before[i];
        if (el.hidden || !after.width || !old.width) return;
        let from = { transform: 'translate(' + (old.x - after.x) + 'px,' + (old.y - after.y) + 'px) scale(' + old.width / after.width + ',' + old.height / after.height + ')', transformOrigin: '0 0' };
        if (docked && expanded !== this.lastExpanded && el !== this.circle) {
          const travel = geometry.surface!.height;
          el.animate(expanded
            ? [{ transform: 'translateY(' + travel + 'px)', clipPath: 'inset(0 0 100% 0)' }, { transform: 'translateY(0)', clipPath: 'inset(0)' }]
            : [{ transform: 'translateY(0)', clipPath: 'inset(0)', visibility: 'visible' }, { transform: 'translateY(' + travel + 'px)', clipPath: 'inset(0 0 100% 0)', visibility: 'visible' }],
            { duration, easing: 'cubic-bezier(.2,.8,.2,1)' });
        } else {
          el.animate([from, { transform: 'translate(0,0) scale(1)', transformOrigin: '0 0' }], { duration, easing: 'cubic-bezier(.16,1,.3,1)' });
        }
      });
    }
    this.lastExpanded = expanded;
    const copy = featureCopy(this.language());
    for (const grip of [this.seek, this.controls].map(e => e.querySelector<HTMLElement>('.cgpt-ra-grip')!)) { grip.title = copy.drag; grip.setAttribute('aria-label', copy.drag); }
    this.circle.title = this.circle.getAttribute('aria-label') + ' · ' + copy.drag;
    this.positionPopovers();
  }
  private reducedMotion() { return matchMedia('(prefers-reduced-motion: reduce)').matches; }
  private place(el: HTMLElement, r: Rect) { for (const [key, value] of Object.entries({ left: r.x, top: r.y, width: r.width, height: r.height })) if (el.style.getPropertyValue(key) !== value + 'px') el.style.setProperty(key, value + 'px'); }
  positionPopovers(): void {
    const v = this.viewport();
    this.more.setAttribute('aria-expanded', String(this.extras.classList.contains('cgpt-open')));
    for (const pop of this.controls.querySelectorAll<HTMLElement>('.cgpt-ra-extras, .cgpt-ra-popover, .cgpt-ra-volume-popover')) {
      const trigger = (pop === this.extras ? this.more : pop.parentElement!).getBoundingClientRect();
      const above = Math.max(44, trigger.top - v.y - 8), below = Math.max(44, v.y + v.height - trigger.bottom - 8), placeAbove = above >= below;
      pop.style.maxWidth = v.width + 'px'; pop.style.maxHeight = Math.min(v.height, placeAbove ? above : below) + 'px';
      const w = pop.offsetWidth || 180, h = pop.offsetHeight || 200;
      if (pop === this.extras && this.controls.classList.contains('cgpt-ra-vertical')) {
        const rail = bounds(this.controls);
        const y = Math.max(v.y, Math.min(v.y + v.height - h, trigger.top));
        const left = { x: rail.x - w - 8, y, width: w, height: h };
        const right = { ...left, x: rail.x + rail.width + 8 };
        const sides = rail.x < v.x + v.width / 2 ? [right, left] : [left, right];
        const target = sides.find(r => fits(r, v));
        if (target) { pop.style.left = target.x + 'px'; pop.style.top = target.y + 'px'; continue; }
      }
      if (pop.classList.contains('cgpt-ra-volume-popover')) {
        let rail = bounds(this.controls); const gap = 8;
        if (this.controls.classList.contains('cgpt-ra-compact-controls') && this.extras.classList.contains('cgpt-open')) {
          const extras = bounds(this.extras);
          const right = Math.max(rail.x + rail.width, extras.x + extras.width), bottom = Math.max(rail.y + rail.height, extras.y + extras.height);
          rail = { x: Math.min(rail.x, extras.x), y: Math.min(rail.y, extras.y), width: 0, height: 0 };
          rail.width = right - rail.x; rail.height = bottom - rail.y;
        }
        pop.style.maxHeight = v.height + 'px';
        const height = pop.offsetHeight || 165;
        const left = { x: rail.x - w - gap, y: Math.max(v.y, Math.min(v.y + v.height - height, trigger.top)), width: w, height };
        const right = { ...left, x: rail.x + rail.width + gap };
        const top = { ...left, x: Math.max(v.x, Math.min(v.x + v.width - w, trigger.left)), y: rail.y - height - gap };
        const bottom = { ...top, y: rail.y + rail.height + gap };
        const sides = rail.x + rail.width / 2 > v.x + v.width / 2 ? [left, right] : [right, left];
        const sideways = this.controls.classList.contains('cgpt-ra-vertical') || this.circle.dataset.preset?.startsWith('top');
        const target = (sideways ? [...sides, top, bottom] : [top, bottom, ...sides]).find(r => fits(r, v));
        if (target) { pop.style.left = target.x + 'px'; pop.style.top = target.y + 'px'; continue; }
      }
      pop.style.left = Math.max(v.x, Math.min(v.x + v.width - w, trigger.left)) + 'px';
      pop.style.top = Math.max(v.y, Math.min(v.y + v.height - h, placeAbove ? trigger.top - h - 8 : trigger.bottom + 8)) + 'px';
    }
  }
  private paintJoin(element: HTMLElement, surface: Rect, color: string): void {
    if (!this.composer) return;
    const style = getComputedStyle(this.composer), composer = bounds(this.composer);
    // Paint only outside the native rounded silhouette. The transparent center
    // leaves its border, shadow, input and buttons completely untouched.
    let height = 0;
    for (const [side, value] of [['left', style.borderTopLeftRadius], ['right', style.borderTopRightRadius]]) {
      const [x, y = x] = value.split(' ');
      const pixels = (v: string, size: number) => (parseFloat(v) || 0) * (v.endsWith('%') ? size / 100 : 1);
      const rx = pixels(x, composer.width), ry = pixels(y, composer.height);
      const scale = Math.min(1, composer.width / (2 * rx || 1), composer.height / (2 * ry || 1));
      element.style.setProperty('--join-' + side + '-x', rx * scale + 'px');
      element.style.setProperty('--join-' + side + '-y', ry * scale + 'px');
      height = Math.max(height, ry * scale);
    }
    element.style.setProperty('--join-color', color);
    this.place(element, { x: surface.x, y: surface.y + surface.height, width: surface.width, height });
  }
  private installDrag(handle: HTMLElement, pill?: HTMLElement): void {
    let suppressClick = false;
    handle.addEventListener('click', event => { if (suppressClick && event.detail !== 0) { event.preventDefault(); event.stopImmediatePropagation(); suppressClick = false; } }, true);
    handle.addEventListener('pointerdown', event => {
      if (event.button !== 0 || !event.isPrimary) return;
      this.cancelDrag?.(); suppressClick = false;
      const key = layoutProfile(innerWidth), current = this.preferences[key];
      // Mobile has one fixed destination; the circle still expands/collapses.
      if (!pill && key === 'narrow') return;
      const x = event.clientX, y = event.clientY;
      let dragging = false, selected: LayoutProfile | null = null, done = false;
      const offsets = new Map<HTMLElement, { x: number; y: number }>();
      const originals = new Map<HTMLElement, Rect>();
      let preview: HTMLElement | null = null, previewScale = 1;
      let previewContents: HTMLElement | null = null, liftPending = false;
      let previewBounds: Rect = { x, y, width: 0, height: 0 };
      let targets: { element: HTMLElement; profile: LayoutProfile; hit: Rect; parts: Rect[] }[] = [];
      const moving = pill ? [pill] : [this.seek, this.controls, this.circle, this.surface, this.join].filter(el => !el.hidden && (this.expanded || el === this.circle));
      handle.setPointerCapture(event.pointerId);
      const move = (e: PointerEvent) => {
        if (e.pointerId !== event.pointerId) return;
        if (!dragging && Math.hypot(e.clientX - x, e.clientY - y) <= 8) return;
        if (!dragging) {
          dragging = this.dragging = true; suppressClick = true;
          this.controls.querySelectorAll('.cgpt-open').forEach(el => el.classList.remove('cgpt-open'));
          for (const el of moving) {
            const visible = bounds(el); el.getAnimations().forEach(a => a.cancel()); el.style.transform = '';
            const resting = bounds(el); offsets.set(el, { x: visible.x - resting.x, y: visible.y - resting.y });
            originals.set(el, visible);
            el.classList.add('cgpt-ra-dragging');
          }
          this.overlay = document.createElement('div'); this.overlay.id = 'cgpt-ra-drop-targets'; this.overlay.setAttribute('aria-hidden', 'true');
          this.overlay.classList.toggle('cgpt-ra-group-drag', !pill);
          if (!pill) {
            const rects = [...originals.values()];
            const left = Math.min(...rects.map(r => r.x)), top = Math.min(...rects.map(r => r.y));
            previewBounds = { x: left, y: top, width: Math.max(...rects.map(r => r.x + r.width)) - left, height: Math.max(...rects.map(r => r.y + r.height)) - top };
            previewScale = Math.min(1, 240 / previewBounds.width, 120 / previewBounds.height);
            preview = document.createElement('div'); preview.className = 'cgpt-ra-drag-preview'; preview.inert = true;
            const shadow = preview.attachShadow({ mode: 'closed' });
            const style = document.createElement('style'); style.textContent = typeof __PLAYER_CSS__ === 'string' ? __PLAYER_CSS__ : '';
            previewContents = document.createElement('div');
            Object.assign(previewContents.style, { position: 'relative', width: previewBounds.width + 'px', height: previewBounds.height + 'px', transformOrigin: '0 0' });
            shadow.append(style, previewContents);
            for (const el of moving) {
              const clone = el.cloneNode(true) as HTMLElement, r = originals.get(el)!;
              // Keep ID-based player styling inside the inert visual preview;
              // use a shadow root so IDs never duplicate document controls.
              clone.classList.remove('cgpt-ra-dragging');
              this.place(clone, { ...r, x: r.x - left, y: r.y - top });
              clone.style.position = 'absolute'; clone.style.transform = 'none'; clone.style.opacity = '1';
              previewContents.append(clone);
              el.classList.add('cgpt-ra-drag-source');
            }
            preview.style.width = previewBounds.width + 'px'; preview.style.height = previewBounds.height + 'px';
            this.overlay.append(preview);
            liftPending = !this.reducedMotion();
          }
          const profiles: LayoutProfile[] = pill ? [{ ...current, seekFirst: !current.seekFirst }] : PRESETS.map(preset => ({ preset, seekFirst: current.seekFirst }));
          for (const profile of profiles) {
            const geometry = this.geometry(profile, true); if (!geometry) continue;
            const element = document.createElement('div'); element.className = 'cgpt-ra-drop-target';
            element.dataset.preset = profile.preset; element.dataset.seekFirst = String(profile.seekFirst);
            if (!pill && geometry.attachedToComposer && geometry.surface) {
              const join = document.createElement('div'); join.className = 'cgpt-ra-dock-join';
              this.paintJoin(join, geometry.surface, 'var(--cgpt-drop-fill)'); join.classList.add('cgpt-ra-target-detail'); element.append(join);
            }
            const parts: [string, Rect][] = pill
              ? [[pill === this.seek ? 'seek' : 'controls', pill === this.seek ? geometry.seek : geometry.controls]]
              : geometry.surface ? [['surface', geometry.surface], ['circle', geometry.circleVisual || geometry.circle]] : [['seek', geometry.seek], ['controls', geometry.controls], ['circle', geometry.circle]];
            for (const [kind, r] of parts) {
              const outline = document.createElement('div'); outline.className = 'cgpt-ra-drop-shape'; outline.dataset.part = kind;
              if (!pill) outline.classList.add('cgpt-ra-target-detail');
              this.place(outline, r);
              const native = this.composer && getComputedStyle(this.composer);
              outline.style.borderRadius = kind === 'surface' ? (native?.borderTopLeftRadius || '28px') + ' ' + (native?.borderTopRightRadius || '28px') + ' 0 0' : '24px';
              element.append(outline);
            }
            const hit = pill ? pill === this.seek ? geometry.seek : geometry.controls : geometry.circle;
            if (!pill) {
              const marker = document.createElement('div'); marker.className = 'cgpt-ra-drop-shape cgpt-ra-drop-marker'; marker.dataset.part = 'marker';
              this.place(marker, hit);
              element.append(marker);
            }
            this.overlay.append(element); targets.push({ element, profile, hit, parts: parts.map(([, r]) => r) });
          }
          document.body.append(this.overlay);
        }
        e.preventDefault();
        const nearest = targets.map(target => ({ target, distance: distanceToRect(e.clientX, e.clientY, target.hit) })).filter(t => t.distance <= 24).sort((a, b) => a.distance - b.distance)[0]?.target;
        selected = nearest?.profile || null;
        for (const target of targets) target.element.classList.toggle('cgpt-ra-drop-active', target === nearest);
        const pull = nearest && !this.reducedMotion() ? magneticOffset(e.clientX, e.clientY, nearest.hit) : null;
        const px = e.clientX + (pull?.x || 0), py = e.clientY + (pull?.y || 0);
        if (preview) {
          // Offset the thumbnail from the cursor so the active circle stays visible.
          const v = this.viewport();
          const width = previewBounds.width * previewScale, height = previewBounds.height * previewScale;
          const candidates = [1, -1].flatMap(dy => [1, -1].map(dx => ({ width, height,
            x: Math.max(v.x, Math.min(px + (dx > 0 ? 32 : -width - 32), v.x + v.width - width)),
            y: Math.max(v.y, Math.min(py + (dy > 0 ? 32 : -height - 32), v.y + v.height - height)) })));
          const position = candidates.find(r => !nearest?.parts.some(part => intersects(r, part))) || candidates[0];
          const left = position.x, top = position.y;
          preview.style.transform = `translate(${left}px,${top}px) scale(${previewScale})`;
          if (liftPending && previewContents) {
            // Animate inside the translated wrapper: scaling the wrapper itself
            // would also magnify its pointer offset and fling the preview away.
            previewContents.animate([{ transform: `translate(${(previewBounds.x - left) / previewScale}px,${(previewBounds.y - top) / previewScale}px) scale(${1 / previewScale})` }, { transform: 'none' }], { duration: 180, easing: 'cubic-bezier(.2,.8,.2,1)' });
            liftPending = false;
          }
          for (const el of moving) {
            const r = originals.get(el)!;
            el.style.transformOrigin = '0 0';
            el.style.transform = `translate(${left + (r.x - previewBounds.x) * previewScale - r.x}px,${top + (r.y - previewBounds.y) * previewScale - r.y}px) scale(${previewScale})`;
          }
        } else for (const el of moving) el.style.transform = 'translate(' + (e.clientX - x + (offsets.get(el)?.x || 0) + (pull?.x || 0)) + 'px,' + (e.clientY - y + (offsets.get(el)?.y || 0) + (pull?.y || 0)) + 'px)';
      };
      const finish = (commit: boolean) => {
        if (done) return; done = true;
        handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', up); handle.removeEventListener('pointercancel', cancel); handle.removeEventListener('lostpointercapture', cancel);
        window.removeEventListener('keydown', escape); window.removeEventListener('resize', cancel); window.removeEventListener('scroll', cancel, true);
        window.visualViewport?.removeEventListener('resize', cancel); window.visualViewport?.removeEventListener('scroll', cancel);
        if (handle.hasPointerCapture(event.pointerId)) handle.releasePointerCapture(event.pointerId);
        this.overlay?.remove(); this.overlay = null; this.cancelDrag = null; this.dragging = false;
        moving.forEach(el => el.classList.remove('cgpt-ra-dragging', 'cgpt-ra-drag-source'));
        if (dragging) {
          // Force a FLIP from the current dragged position, including invalid drops.
          this.previous = 'drag';
          if (commit && selected) void this.save({ ...this.preferences, [key]: selected });
          else this.changed();
        }
      };
      const up = () => finish(true), cancel = () => finish(false), escape = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); finish(false); } };
      this.cancelDrag = cancel;
      handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', up); handle.addEventListener('pointercancel', cancel); handle.addEventListener('lostpointercapture', cancel);
      window.addEventListener('keydown', escape); window.addEventListener('resize', cancel); window.addEventListener('scroll', cancel, true);
      window.visualViewport?.addEventListener('resize', cancel); window.visualViewport?.addEventListener('scroll', cancel);
    });
  }
}
