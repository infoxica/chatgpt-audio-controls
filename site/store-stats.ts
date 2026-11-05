import { aggregateRatings, type StatsResponse } from '../feedback/worker/src/stats-model';

const sources = ['chrome','edge'] as const;
const names = {chrome:'Chrome', edge:'Edge'};
const week = 7 * 86400000;

export function renderStats(data: StatsResponse, labels: string[], locale: string, now = Date.now()) {
  const [usersLabel, installsLabel, ratingsLabel, highestLabel, , , ratedLabel, audienceLabel] = labels;
  const number = new Intl.NumberFormat(locale);
  const list = new Intl.ListFormat(locale);
  const recent = (value: string | null) => value && now - Date.parse(value) <= week;
  const counts = sources.filter(s => data[s].users !== null && recent(data[s].usersUpdatedAt) &&
    (!data[s].metricDate || Math.floor(now / 86400000) - Date.parse(data[s].metricDate!) / 86400000 <= 7));
  const parts: {kind: 'audience' | 'rating'; text: string; description: string; rating?: number}[] = [];
  const details: string[] = [];
  if (counts.length) {
    const total = counts.reduce((sum,s) => sum + data[s].users!,0);
    const rounded = Math.round(total / 50) * 50;
    const countText = total < 25 ? number.format(total) : '≈' + number.format(rounded);
    const text = countText + ' ' + (counts.length === 2 ? audienceLabel :
      names[counts[0]] + ' · ' + (counts[0] === 'chrome' ? usersLabel : installsLabel));
    for (const s of counts) {
      const item = data[s];
      details.push(names[s] + ' · ' + (s === 'chrome' ? usersLabel : installsLabel) + ': ' + number.format(item.users!));
    }
    parts.push({kind:'audience', text, description:text + '. ' + details.join('; ')});
  }
  const {contributors, rating, ratingCount, ratingMode} = aggregateRatings(data, data.combined.ratingMode,
    sources.filter(s=>recent(data[s].ratingsUpdatedAt)));
  if (rating !== null && contributors.length) {
    const decimal = new Intl.NumberFormat(locale,{minimumFractionDigits:1,maximumFractionDigits:1});
    const value = decimal.format(rating) + '/' + decimal.format(5);
    const text = value + ' ' + (ratingMode === 'max' ? highestLabel : ratedLabel);
    const description = text + '. ' + list.format(contributors.map(s=>names[s])) + ' · ' + ratingsLabel + ': ' + number.format(ratingCount!);
    details.push(description);
    parts.push({kind:'rating', text, description, rating});
  }
  return {summary:parts.map(p=>p.text).join(' | '), details, parts};
}

function icon(path: string, filled = false) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 24 24');
  svg.setAttribute('aria-hidden','true');
  const shape = document.createElementNS(svg.namespaceURI,'path');
  shape.setAttribute('d',path);
  shape.setAttribute('fill',filled ? 'currentColor' : 'none');
  shape.setAttribute('stroke','currentColor');
  shape.setAttribute('stroke-width','1.5');
  shape.setAttribute('stroke-linecap','round');
  shape.setAttribute('stroke-linejoin','round');
  svg.append(shape);
  return svg;
}

export async function loadStoreStats(container: HTMLElement) {
  try {
    const response = await fetch(container.dataset.statsUrl!, {credentials:'omit',signal:AbortSignal.timeout(6000)});
    if (!response.ok) return;
    const labels = JSON.parse(container.dataset.labels!) as string[];
    const {parts} = renderStats(await response.json(),labels,document.documentElement.lang);
    if (!parts.length) return;
    const content = document.createDocumentFragment();
    for (const part of parts) {
      const item = document.createElement('span');
      item.className = 'store-stat store-stat-' + part.kind;
      item.setAttribute('role','img');
      item.setAttribute('aria-label',part.description);
      if (part.kind === 'rating') {
        const stars = document.createElement('span');
        stars.className = 'rating-stars';
        stars.setAttribute('aria-hidden','true');
        for (let i=0; i<5; i++) {
          const star = icon('m12 3 2.78 5.63L21 9.54l-4.5 4.39 1.06 6.2L12 17.2l-5.56 2.93 1.06-6.2L3 9.54l6.22-.91Z');
          const fill = star.firstElementChild!.cloneNode(true) as SVGElement;
          fill.setAttribute('fill','currentColor');
          fill.style.clipPath = `inset(0 ${(1-Math.max(0,Math.min(1,part.rating!-i)))*100}% 0 0)`;
          star.append(fill);
          stars.append(star);
        }
        item.append(stars);
      } else item.append(icon('M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8m8 .13a4 4 0 0 1 0 7.75'));
      const text = document.createElement('span');
      text.textContent = part.text;
      text.setAttribute('aria-hidden','true');
      item.append(text);
      content.append(item);
    }
    container.replaceChildren(content);
  } catch { /* Keep the product identity and any previously rendered good figures. */ }
}
