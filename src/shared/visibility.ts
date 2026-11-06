export function floatingVisibility(hidden: boolean, mode: 'idle-only' | 'all', session: boolean, expanded: boolean) {
  const hideAll = hidden && mode === 'all';
  return { player: !hideAll && expanded, launcher: !hideAll && !expanded && (!hidden || session) };
}

// Chat surfaces only. A composer-shaped editor on another app page is not a chat.
export function isPlayerPage(url: Pick<Location, 'pathname' | 'hash'>): boolean {
  let path: string, hash: string;
  try { path = decodeURIComponent(url.pathname); hash = decodeURIComponent(url.hash); }
  catch { return false; }
  if (/(?:^|[/#?&=])(settings|spaces|dots)(?:[/#?&=]|$)/i.test(path + hash)) return false;
  return /^\/(?:new\/?)?$/.test(path) || /^\/(?:c|share)\/[^/]+\/?$/.test(path) ||
    /^\/g\/[^/]+(?:\/(?:project|c\/[^/]+))?\/?$/.test(path) ||
    /^\/codex(?:\/|$)/.test(path);
}
