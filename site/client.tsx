import { hydrateRoot } from 'react-dom/client';
import { SiteNavigation, type SiteNavigationProps } from './components';
import { HeaderControls, FaqAccordion, ConsentBanner, type HeaderControlsProps, type FaqAccordionProps, type ConsentBannerProps } from './components';

// Each locale embeds only its own translated component props, not every catalog.
function props<T>(id: string): T {
  return JSON.parse(document.getElementById(`${id}-props`)!.textContent!) as T;
}

hydrateRoot(document.getElementById('site-controls')!, <HeaderControls {...props<HeaderControlsProps>('site-controls')} />, { identifierPrefix: 'site-controls' });
hydrateRoot(document.getElementById('site-navigation')!, <SiteNavigation {...props<SiteNavigationProps>('site-navigation')} />, { identifierPrefix: 'site-navigation' });
const faq = document.getElementById('site-faq');
if (faq) hydrateRoot(faq, <FaqAccordion {...props<FaqAccordionProps>('site-faq')} />, { identifierPrefix: 'site-faq' });
hydrateRoot(document.getElementById('site-consent')!, <ConsentBanner {...props<ConsentBannerProps>('site-consent')} />, { identifierPrefix: 'site-consent' });
