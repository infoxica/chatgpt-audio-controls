export const SPONSOR_AMOUNTS = [1, 3, 5, 10] as const;
export const SPONSOR_URL = 'https://github.com/sponsors/infoxica';
export const COFFEE_URL = 'https://paypal.me/infoxica';
export function coffeeURL(amount: typeof SPONSOR_AMOUNTS[number]): string {
  if (!SPONSOR_AMOUNTS.includes(amount)) throw new Error('Unsupported contribution');
  return `${COFFEE_URL}/${amount}USD`;
}
export function sponsorURL(amount: typeof SPONSOR_AMOUNTS[number]): string {
  if (!SPONSOR_AMOUNTS.includes(amount)) throw new Error('Unsupported contribution');
  return `${SPONSOR_URL}/sponsorships?frequency=one-time&amount=${amount}`;
}
export const REVIEW_URLS = {
  chrome: 'https://chromewebstore.google.com/detail/aifalimlfgiepmbejcemcofninobaiea/reviews',
  edge: 'https://microsoftedge.microsoft.com/addons/detail/chatgpt-audio-controls-/cmhbacgmcgiolpidfjcpefkhbbeamemf#review-section',
};
export function reviewStores(agent: string): (keyof typeof REVIEW_URLS)[] {
  if (/Edg(A|iOS)?\//.test(agent)) return ['edge'];
  if (/Chrome\//.test(agent) && !/OPR\//.test(agent)) return ['chrome'];
  return ['chrome', 'edge'];
}
