import { expect, test } from 'bun:test';
import { runInNewContext } from 'node:vm';
import { COMMANDS, matchesShortcut } from '../src/shared/shortcuts';
const compiled = await Bun.build({ entrypoints: ['src/background/worker.ts'], target: 'browser', format: 'iife' });
if (!compiled.success) throw new Error('Could not build command worker fixture');
const source = await compiled.outputs[0].text();
function worker(available = true) {
  const listeners: Record<string, (...args: any[]) => any> = {}, calls: unknown[] = [];
  const event = (name: string) => ({ addListener: (cb: (...args: any[]) => any) => { listeners[name] = cb; } });
  const chrome = {
    runtime: { id: 'test', onInstalled: event('install'), onStartup: event('startup'), onMessage: event('message'), openOptionsPage: () => calls.push('options') },
    storage: { onChanged: event('storage') },
    commands: available ? { onCommand: event('command'), getAll: async () => COMMANDS.map(name => ({ name, shortcut: name === 'seek-forward' ? 'Alt+Right' : '' })) } : undefined,
    tabs: { query: async (filter: unknown) => { calls.push(filter); return [{ id: 7 }]; }, sendMessage: async (...args: unknown[]) => { calls.push(args); } },
  };
  runInNewContext(source, { chrome, console, URL, navigator: { language: 'en', userAgent: 'test' } });
  return { listeners, calls, chrome };
}
test('registered commands route once to the active tab main frame; unknown commands are ignored', async () => {
  const { listeners, calls } = worker();
  for (const command of COMMANDS) listeners.command(command);
  listeners.command('unregistered');await new Promise(resolve => setTimeout(resolve, 0));
  expect(calls).toHaveLength(COMMANDS.length * 2);
  expect(calls.filter(Array.isArray)).toEqual(COMMANDS.map(type => [7, { type }, { frameId: 0 }]));
  expect(calls.filter(c => !Array.isArray(c))).toEqual(COMMANDS.map(() => ({active:true,lastFocusedWindow:true})));
});
test('missing command API and rejected queries return unassigned bindings without breaking settings', async () => {
  const mobile=worker(false);let response: unknown;
  mobile.listeners.message({type:'get-visibility-shortcut'},{id:'test'},(value: unknown)=>{response=value;});
  expect(response).toEqual({shortcut:'',commands:{}});expect(mobile.listeners.command).toBeUndefined();
  mobile.listeners.message({type:'open-settings'},{id:'test'},()=>{});expect(mobile.calls).toEqual(['options']);
  const desktop=worker();desktop.chrome.commands!.getAll=async()=>{throw Error('unavailable');};
  desktop.listeners.message({type:'get-visibility-shortcut'},{id:'test'},(value: unknown)=>{response=value;});
  await new Promise(resolve=>setTimeout(resolve,0));expect(response).toEqual({shortcut:'',commands:{}});
});
test('actual assigned combinations suppress duplicate page shortcuts, including digits and punctuation', () => {
  const event={code:'ArrowRight',altKey:true,ctrlKey:false,metaKey:false,shiftKey:false} as KeyboardEvent;
  expect(matchesShortcut(event,'Alt+Right')).toBe(true);expect(matchesShortcut(event,'Alt+Left')).toBe(false);
  expect(matchesShortcut({...event,code:'Comma',shiftKey:true} as KeyboardEvent,'Alt+Shift+Comma')).toBe(true);
  expect(matchesShortcut({...event,code:'Digit3'} as KeyboardEvent,'Alt+3')).toBe(true);
  expect(matchesShortcut({...event,code:'KeyP',altKey:false,metaKey:true} as KeyboardEvent,'Command+P')).toBe(true);
});
