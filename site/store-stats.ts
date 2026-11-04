import type { StatsResponse } from '../feedback/worker/src/stats-model';

const sources = ['chrome','edge'] as const;
const names = {chrome:'Chrome', edge:'Edge'};
const week = 7 * 86400000;

export function renderStats(data: StatsResponse, labels: string[], locale: string, now = Date.now()) {
  const [usersLabel, installsLabel, ratingsLabel, highestLabel, updatedLabel, retainedLabel] = labels;
  const number = new Intl.NumberFormat(locale);
  const list = new Intl.ListFormat(locale);
  const date = (value: string) => new Intl.DateTimeFormat(locale,{dateStyle:'medium',timeZone:'UTC'}).format(new Date(value));
  const recent = (value: string | null) => value && now - Date.parse(value) <= week;
  const counts = sources.filter(s => data[s].users !== null && recent(data[s].usersUpdatedAt) &&
    (!data[s].metricDate || Math.floor(now / 86400000) - Date.parse(data[s].metricDate!) / 86400000 <= 7));
  const summary: string[] = [], details: string[] = [];
  if (counts.length) {
    const total = counts.reduce((sum,s) => sum + data[s].users!,0);
    const rounded = Math.round(total / 50) * 50;
    const countText = total < 25 ? number.format(total) : '≈' + number.format(rounded);
    summary.push(countText + ' · ' + list.format(counts.map(s=>names[s])));
    for (const s of counts) {
      const item = data[s];
      details.push(names[s] + ' · ' + (s === 'chrome' ? usersLabel : installsLabel) + ': ' + number.format(item.users!) +
        ' · ' + (item.usersStale ? retainedLabel : updatedLabel) + ': ' + date(item.metricDate || item.usersUpdatedAt!));
    }
  }
  const {contributors, rating, ratingCount, ratingMode} = data.combined;
  if (rating !== null && contributors.length && contributors.every(s=>recent(data[s].ratingsUpdatedAt))) {
    const value = new Intl.NumberFormat(locale,{minimumFractionDigits:1,maximumFractionDigits:1}).format(rating) + '/' + number.format(5);
    const credit = ratingMode === 'max' ? highestLabel + ' · ' + names[contributors[0]] + ' ' :
      contributors.length === 1 ? names[contributors[0]] + ' ' : '';
    summary.push(credit + '★ ' + value);
    details.push((ratingMode === 'max' ? highestLabel : ratingsLabel) + ': ' + value + ' · ' + ratingsLabel + ': ' + number.format(ratingCount!));
    for (const s of contributors) details.push(names[s] + ' · ' + ratingsLabel + ': ' + number.format(data[s].ratingCount!) +
      ' · ' + (data[s].ratingsStale ? retainedLabel : updatedLabel) + ': ' + date(data[s].ratingsUpdatedAt!));
  }
  return {summary:summary.join(' · '), details};
}

export async function loadStoreStats(container: HTMLElement) {
  try {
    const response = await fetch(container.dataset.statsUrl!, {credentials:'omit',signal:AbortSignal.timeout(6000)});
    if (!response.ok) return;
    const labels = JSON.parse(container.dataset.labels!) as string[];
    const {summary,details} = renderStats(await response.json(),labels,document.documentElement.lang);
    if (!summary) return;
    const disclosure = document.createElement('details');
    const heading = document.createElement('summary');
    heading.textContent = summary;
    disclosure.append(heading);
    for (const line of details) {
      const p = document.createElement('p');
      p.textContent = line;
      disclosure.append(p);
    }
    const links = document.createElement('p');
    for (const link of container.querySelectorAll('a')) {
      if (links.childNodes.length) links.append(' · ');
      links.append(link.cloneNode(true));
    }
    disclosure.append(links);
    container.replaceChildren(disclosure);
  } catch { /* The initial store links remain usable on an outage or invalid response. */ }
}
