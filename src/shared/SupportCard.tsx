import { Heart, MessageSquare, Bug, Star, Coffee } from 'lucide-react';
import { coffeeCopy } from './i18n/coffee';
import { useEffect, useState } from 'react';
import { donationCopy } from './i18n/donations';
import { SPONSOR_AMOUNTS, sponsorURL, coffeeURL, REVIEW_URLS } from './support';
import { engagementRequest, watchEngagement } from './engagement-client';
import { getReleaseCopy } from './i18n/release-copy';
import type { ThemePreference } from './ThemeSelect';
import { feedbackURL } from './feedback';
import { supportCopy } from './i18n/support';
import './release-ui.css';
export { REVIEW_URLS } from './support';
export function SupportCard({ language, theme, surface = 'dashboard' }: { language: string; theme: ThemePreference; surface?: 'dashboard' | 'popup' }) {
 const d = donationCopy(language);
 const [enabled, setEnabled] = useState<boolean | null>(null);
 const [saving, setSaving] = useState(false);
 const [error, setError] = useState(false);
 useEffect(() => {
   let alive = true, revision = 0;
   const refresh = () => { const current = ++revision; void engagementRequest({ type: 'read' }).then(({ state }) => { if (alive && current === revision) setEnabled(state.enabled); }).catch(() => { if (alive) setError(true); }); };
   refresh(); const stop = watchEngagement(refresh);
   return () => { alive = false; stop(); };
 }, []);
 const opened = (kind: 'review' | 'donation') => { void engagementRequest({ type: 'opened', kind }).catch(() => setError(true)); };
 const [title, , suggest, review] = supportCopy(language);
 const feedback = feedbackURL(language, 'installed', undefined, theme, 'suggestion');
 const bug = feedbackURL(language, 'installed', undefined, theme, 'bug');
 const stores = ['chrome', 'edge'] as const;
 return <section className={`${surface === 'dashboard' ? 'card' : 'section-card'} release-ui support-card`}>
   <div className="support-panels">
   <div className="donation-section">
    <div className="support-panel-copy">
    <h2 className={surface === 'dashboard' ? 'card-title' : 'section-title'}><Heart size={20} aria-hidden="true" className="support-icon" />{d.title}</h2>
    <p>{d.value}</p><p>{d.costs}</p>
    </div>
    <div className="support-panel-actions">
    <p className="donation-caption">{d.once}</p>
    <div className="donation-amounts">{SPONSOR_AMOUNTS.map(amount => <a key={amount} href={sponsorURL(amount)} target="_blank" rel="noreferrer" onClick={() => opened('donation')} aria-label={`${d.donate} · US$${amount} · GitHub Sponsors`}><Heart size={15} aria-hidden="true" /><bdi>US${amount}</bdi></a>)}</div>
    <div className="coffee-support"><p><Coffee size={18} aria-hidden="true" />{coffeeCopy(language)} · PayPal</p>
    <div className="donation-amounts">{SPONSOR_AMOUNTS.map(amount => <a key={amount} href={coffeeURL(amount)} target="_blank" rel="noreferrer" onClick={() => opened('donation')} aria-label={`${coffeeCopy(language)} · US$${amount} · PayPal`}><Coffee size={15} aria-hidden="true" /><bdi>US${amount}</bdi></a>)}</div></div>
   </div>
   </div>
   <div className="review-section">
   <div className="support-panel-copy">
   <h2 className={`${surface === 'dashboard' ? 'card-title' : 'section-title'} support-review-title`}><Star size={18} aria-hidden="true" className="support-icon" /><span>{title}</span></h2>
   <p className="card-desc">{d.optional}</p>
   </div>
   <div className="support-panel-actions">
   <div className="support-actions">
    {feedback && <a href={feedback} target="_blank" rel="noreferrer"><MessageSquare size={16} aria-hidden="true" />{suggest}</a>}
    {bug && <a href={bug} target="_blank" rel="noreferrer"><Bug size={16} aria-hidden="true" />{getReleaseCopy(language).feedbackBug}</a>}
    {stores.map(store => <a key={store} href={REVIEW_URLS[store]} target="_blank" rel="noreferrer" onClick={() => opened('review')}><Star size={16} aria-hidden="true" />{review} · {store === 'edge' ? 'Edge' : 'Chrome'}</a>)}
   </div>
   </div>
   </div>
   </div>
   <p className="donation-privacy">{d.privacy}</p>
   <label className="toggle-row support-reminders"><span>{d.reminders}</span><input className="settings-switch" type="checkbox" checked={enabled === true} disabled={enabled === null || saving} onChange={async event => {
     const value = event.target.checked; setSaving(true); setError(false);
     try { const result = await engagementRequest({ type: 'enable', enabled: value }); setEnabled(result.state.enabled); } catch { setError(true); } finally { setSaving(false); }
   }} /></label>
   {error && <p role="alert">{getReleaseCopy(language).savedError}</p>}
 </section>;
}
