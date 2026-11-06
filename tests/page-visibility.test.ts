import {test,expect} from 'bun:test';
import {isPlayerPage, floatingVisibility} from '../src/shared/visibility';

test('only chat, project conversations and Codex are player surfaces',()=>{
  for(const path of ['/', '/new', '/c/123', '/share/123', '/g/g-example', '/g/g-p-example/project', '/g/g-p-example/c/123', '/codex', '/codex/tasks/123']) {
    expect(isPlayerPage(new URL(path,'https://chatgpt.com'))).toBe(true);
  }
  for(const path of ['/settings','/spaces','/spaces/123','/dots','/apps','/images','/library','/gpts','/search','/unknown','/codex/settings','/#settings/General','/c/123#settings','/g/g-id/edit','/%E0%A4%A']) {
    expect(isPlayerPage(new URL(path,'https://chatgpt.com'))).toBe(false);
  }
  expect(floatingVisibility(true,'all',true,true)).toEqual({player:false,launcher:false});
});
