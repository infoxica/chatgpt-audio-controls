import { getSettings } from '../shared/storage';
import { languageDirection, resolveLanguage } from '../shared/i18n/core';
import { tourCopy } from '../shared/i18n/tour';
import { mountTour, TOUR_KEY } from './tour';

void getSettings().then(settings=>{
  document.documentElement.lang=resolveLanguage(settings.language);
  document.documentElement.dir=languageDirection(settings.language);
  document.title=tourCopy(settings.language).title + ' — ChatGPT Audio Controls';
  document.body.style.background=settings.theme==='dark'?'#212121':settings.theme==='light'?'#fff':'';
  mountTour(document.getElementById('tour')!,settings,async skipped=>{
    await chrome.storage.local.set({[TOUR_KEY]:skipped?'skipped':'completed'});
    location.assign('https://chatgpt.com/');
  });
});
