import { LayoutProfile } from '../shared/layout';
export type Rect = { x: number; y: number; width: number; height: number };
export type GeometryEnvironment = { actions?: Rect[]; cornerLeft?: number; cornerRight?: number };
export type PlayerGeometry = { seek: Rect; controls: Rect; circle: Rect; circleVisual?: Rect; verticalSeek: boolean; verticalControls: boolean; compactControls?: boolean; surface?: Rect; attachedToComposer?: boolean };
// Eight full-size controls, or grip + transport + More, plus padding/border.
export const FULL_CONTROLS_LENGTH = 356;
export const COMPACT_CONTROLS_LENGTH = 224;
export const intersects = (a: Rect, b: Rect) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
export const fits = (r: Rect, v: Rect) => r.x >= v.x - .5 && r.y >= v.y - .5 && r.x + r.width <= v.x + v.width + .5 && r.y + r.height <= v.y + v.height + .5;
export const distanceToRect = (x: number, y: number, r: Rect) => Math.hypot(Math.max(r.x - x, 0, x - r.x - r.width), Math.max(r.y - y, 0, y - r.y - r.height));
export function magneticOffset(x: number, y: number, r: Rect) {
  const distance = distanceToRect(x, y, r);
  if (distance > 24) return null;
  const dx = r.x + r.width / 2 - x, dy = r.y + r.height / 2 - y, length = Math.hypot(dx, dy);
  const pull = Math.min(length, 12 * (1 - distance / 24));
  return { x: length ? dx / length * pull : 0, y: length ? dy / length * pull : 0 };
}
const rect = (x: number, y: number, width: number, height: number): Rect => ({ x, y, width, height });
export function dockGeometry(p: LayoutProfile, v: Rect, expanded: boolean, composer?: Rect, rtl = false, narrow = v.width < 744, environment: GeometryEnvironment = {}): PlayerGeometry | null {
  return resolveWithActions(p, v, expanded, composer, rtl, narrow, environment, FULL_CONTROLS_LENGTH)
    || resolveWithActions(p, v, expanded, composer, rtl, narrow, environment, COMPACT_CONTROLS_LENGTH);
}
function resolveWithActions(p: LayoutProfile, v: Rect, expanded: boolean, composer: Rect | undefined, rtl: boolean, narrow: boolean, environment: GeometryEnvironment, controlsLength: number): PlayerGeometry | null {
  let area = { ...v };
  for (let attempt = 0; attempt <= (environment.actions?.length || 0); attempt++) {
    const result = resolveGeometry(p, area, expanded, composer, rtl, narrow, environment, controlsLength);
    if (!result) return null;
    const parts = expanded ? [result.seek, result.controls, result.circle] : [result.circle];
    const collision = environment.actions?.find(o => parts.some(r => intersects(r, { x: o.x - 8, y: o.y - 8, width: o.width + 16, height: o.height + 16 })));
    if (!collision) return result;
    if (!p.preset.startsWith('top')) return null;
    const bottom = area.y + area.height;
    area.y = Math.max(area.y, collision.y + collision.height + 8);
    area.height = bottom - area.y;
  }
  return null;
}
function resolveGeometry(p: LayoutProfile, v: Rect, expanded: boolean, composer: Rect | undefined, rtl: boolean, narrow: boolean, environment: GeometryEnvironment, controlsLength: number): PlayerGeometry | null {
  const gap = 6, thick = 48, seekLength = 244;
  let compactControls = controlsLength === COMPACT_CONTROLS_LENGTH;
  let a: Rect, b: Rect, circle: Rect, circleVisual: Rect | undefined, verticalSeek = false, verticalControls = false, surface: Rect | undefined;
  if (p.preset === 'composer') {
    if (!composer || composer.width < 232) return null;
    const width = composer.width, stacked = narrow, dockControlsLength = width < 600 ? COMPACT_CONTROLS_LENGTH : controlsLength;
    compactControls = (stacked ? width - 12 : dockControlsLength) < FULL_CONTROLS_LENGTH;
    if (!stacked && width < 430) return null;
    const contentWidth = width - 12, controlsHeight = 48;
    const height = stacked ? 48 + controlsHeight + 4 : 52;
    surface = rect(composer.x, composer.y - height, width, height);
    const firstY = surface.y + 2;
    if (stacked) {
      a = rect(composer.x + 6, firstY, contentWidth, 48);
      b = rect(composer.x + 6, firstY + 48, contentWidth, controlsHeight);
      if (!p.seekFirst) { b.y = firstY; a.y = firstY + controlsHeight; }
    } else {
      a = rect(composer.x + 6, firstY, width - dockControlsLength - 62, 48);
      b = rect(a.x + a.width + 4, firstY, dockControlsLength, 48);
      if (!p.seekFirst) { b.x = composer.x + 6; a.x = b.x + b.width + 4; }
    }
    circle = rect(rtl ? composer.x + 2 : composer.x + width - 46, stacked ? a.y + 2 : firstY + 2, 44, 44);
    if (stacked) { a.width -= 44; if (rtl) a.x += 44; }
    if (!stacked && rtl) { a.x += 44; b.x += 44; circle.x = composer.x + 2; }
    if (!expanded) {
      circle.y = composer.y - 44;
      const radius = rtl ? environment.cornerLeft || 0 : environment.cornerRight || 0;
      circle.x = rtl ? composer.x + radius : composer.x + width - radius - 44;
    }
    circleVisual = rect(circle.x + 6, circle.y + (expanded ? 8 : 16), 32, 28);
  } else if (p.preset === 'original') {
    const width = Math.min(420, v.width - 50);
    const leftSpace = composer ? composer.x - v.x - gap : 0;
    const rightSpace = composer ? v.x + v.width - composer.x - composer.width - 44 - gap * 2 : 0;
    const controlsSpace = p.seekFirst ? rightSpace : leftSpace;
    if (controlsSpace < controlsLength && controlsSpace >= COMPACT_CONTROLS_LENGTH) {
      controlsLength = COMPACT_CONTROLS_LENGTH;
      compactControls = true;
    }
    if (composer && leftSpace >= (p.seekFirst ? 220 : controlsLength) && rightSpace >= (p.seekFirst ? controlsLength : 220)) {
      const length = Math.min(560, p.seekFirst ? leftSpace : rightSpace);
      circle = rect(composer.x + composer.width + gap, composer.y + 2, 44, 44);
      a = rect(p.seekFirst ? composer.x - length - gap : circle.x + 44 + gap, composer.y, length, 48);
      b = rect(p.seekFirst ? circle.x + 44 + gap : composer.x - controlsLength - gap, composer.y, controlsLength, 48);
    } else {
      const h = 48;
      compactControls = width < FULL_CONTROLS_LENGTH;
      if (width < COMPACT_CONTROLS_LENGTH) return null;
      const bottom = composer ? Math.min(v.y + v.height, composer.y - 8) : v.y + v.height;
      a = rect(v.x + (v.width - width - 50) / 2, bottom - h - 54, width, 48);
      b = rect(a.x, a.y + 54, width, h); circle = rect(b.x + width + 6, bottom - 44, 44, 44);
      if (!p.seekFirst) { b.y = a.y; a.y = b.y + h + 6; }
    }
  } else {
    const side = p.preset === 'left' || p.preset === 'right';
    const left = p.preset.includes('left'), top = p.preset.startsWith('top');
    const seekVertical = side || (top ? !p.seekFirst : p.seekFirst);
    if (!side && !top && p.seekFirst && composer && v.y + v.height > composer.y && v.y + v.height - thick < composer.y + composer.height) {
      const controlSpan = (left ? composer.x - v.x : v.x + v.width - composer.x - composer.width) - thick - gap * 2;
      if (expanded && controlSpan < controlsLength) return null;
    }
    let available = seekVertical ? v.height - (side ? controlsLength + 56 : 54) : v.width - 54;
    if (!side && !top && !seekVertical && composer && v.y + v.height > composer.y && v.y + v.height - thick < composer.y + composer.height) {
      available = (left ? composer.x - v.x : v.x + v.width - composer.x - composer.width) - thick - gap * 2;
      if (expanded && available < 220) return null;
    }
    const adaptiveSeek = Math.max(seekVertical ? seekLength : 220, Math.min(seekVertical ? 420 : 560, available));
    const firstLength = p.seekFirst ? adaptiveSeek : controlsLength;
    const secondLength = p.seekFirst ? controlsLength : adaptiveSeek;
    if (side) {
      a = rect(0, 0, thick, firstLength); circle = rect(2, firstLength + gap, 44, 44);
      b = rect(0, firstLength + gap + 44 + gap, thick, secondLength);
      verticalSeek = verticalControls = true;
    } else if (top) {
      circle = rect(left ? 2 : firstLength + gap + 2, 2, 44, 44);
      a = rect(left ? thick + gap : 0, 0, firstLength, thick);
      b = rect(left ? 0 : firstLength + gap, thick + gap, thick, secondLength);
      verticalSeek = !p.seekFirst; verticalControls = p.seekFirst;
    } else {
      a = rect(left ? 0 : secondLength + gap, 0, thick, firstLength);
      circle = rect(a.x + 2, firstLength + gap + 2, 44, 44);
      b = rect(left ? thick + gap : 0, firstLength + gap, secondLength, thick);
      verticalSeek = p.seekFirst; verticalControls = !p.seekFirst;
    }
    const parts = [a, b, circle], w = Math.max(...parts.map(r => r.x + r.width)), h = Math.max(...parts.map(r => r.y + r.height));
    const x = left ? v.x : v.x + v.width - w;
    const y = side ? v.y + (v.height - h) / 2 : top ? v.y : v.y + v.height - h;
    for (const r of parts) { r.x += x; r.y += y; }
    const seek = p.seekFirst ? a : b, controls = p.seekFirst ? b : a;
    const result = { seek, controls, circle, verticalSeek, verticalControls, compactControls };
    return (expanded ? [seek, controls, circle] : [circle]).every(r => fits(r, v)) ? result : null;
  }
  const result = { seek: a, controls: b, circle, circleVisual, verticalSeek, verticalControls, compactControls, surface, attachedToComposer: !!surface };
  return (expanded ? [a, b, circle, ...(surface ? [surface] : [])] : [circle]).every(r => fits(r, v)) ? result : null;
}
