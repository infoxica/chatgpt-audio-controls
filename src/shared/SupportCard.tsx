import { Heart, MessageSquare, Bug, Star } from 'lucide-react';
import { getReleaseCopy } from './i18n/release-copy';
import type { ThemePreference } from './ThemeSelect';
import { feedbackURL } from './feedback';
import { supportCopy } from './i18n/support';
import './release-ui.css';
export const REVIEW_URLS = {
 chrome: 'https://chromewebstore.google.com/detail/aifalimlfgiepmbejcemcofninobaiea/reviews',
 edge: 'https://microsoftedge.microsoft.com/addons/detail/chatgpt-audio-controls-/cmhbacgmcgiolpidfjcpefkhbbeamemf#review-section',
};
export function SupportCard({ language, theme, surface = 'dashboard' }: { language: string; theme: ThemePreference; surface?: 'dashboard' | 'popup' }) {
 const [title, description, suggest, review] = supportCopy(language);
 const feedback = feedbackURL(language, 'installed', undefined, theme, 'suggestion');
 const bug = feedbackURL(language, 'installed', undefined, theme, 'bug');
 const stores = ['chrome', 'edge'] as const;
 return <section className={`${surface === 'dashboard' ? 'card' : 'section-card'} release-ui support-card`}>
   <div className={surface === 'dashboard' ? 'card-title' : 'section-title'}><Heart size={18} className="support-icon" /><span>{title}</span></div>
   <p className="card-desc">{description}</p>
   <div className="support-actions">
    {feedback && <a href={feedback} target="_blank" rel="noreferrer"><MessageSquare size={16} aria-hidden="true" />{suggest}</a>}
    {bug && <a href={bug} target="_blank" rel="noreferrer"><Bug size={16} aria-hidden="true" />{getReleaseCopy(language).feedbackBug}</a>}
    {stores.map(store => <a key={store} href={REVIEW_URLS[store]} target="_blank" rel="noreferrer"><Star size={16} aria-hidden="true" />{review} · {store === 'edge' ? 'Edge' : 'Chrome'}</a>)}
   </div>
 </section>;
}
