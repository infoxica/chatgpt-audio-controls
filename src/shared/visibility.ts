export function floatingVisibility(hidden: boolean, mode: 'idle-only' | 'all', session: boolean, expanded: boolean) {
  const hideAll = hidden && mode === 'all';
  return { player: !hideAll && expanded, launcher: !hideAll && !expanded && (!hidden || session) };
}
