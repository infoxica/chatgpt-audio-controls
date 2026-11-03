import {test,expect} from 'bun:test';
import {readAccentCache} from '../src/shared/accent';
test('accent bridge retains legacy values and strips non-color/page data',()=>{
 const legacy={chatTheme:'green',isDark:true,updatedAt:123};
 expect(readAccentCache(legacy)).toEqual(legacy);
 expect(readAccentCache({...legacy,accent:'#12ab34',accentText:'rgb(255, 255, 255)',text:'private'})).toEqual({...legacy,accent:'#12ab34',accentText:'rgb(255, 255, 255)'});
 expect(readAccentCache({...legacy,accent:'url(https://example.test)',accentText:'var(--private)'})).toEqual(legacy);
 expect(readAccentCache({...legacy,updatedAt:NaN})).toBeNull();expect(readAccentCache({...legacy,chatTheme:'unknown'})).toBeNull();
});
