// Compatibility landing page for extensions that still contain the old URL.
// No spreadsheet access and no feedback writes remain in this deployment.
function doGet(e) {
  const p = (e && e.parameter) || {};
  const locale = Object.prototype.hasOwnProperty.call(SURVEY_COPY, p.lang) ? p.lang : 'en';
  const page = HtmlService.createTemplateFromFile('Index');
  const query = ['source=uninstall', 'lang=' + encodeURIComponent(locale)];
  ['version', 'browser', 'os'].forEach(function(key) {
    if (typeof p[key] === 'string' && /^[a-zA-Z0-9. -]{1,32}$/.test(p[key])) query.push(key + '=' + encodeURIComponent(p[key]));
  });
  page.destination = FEEDBACK_URL + '?' + query.join('&');
  page.label = SURVEY_COPY[locale].send;
  page.privacy = SURVEY_COPY[locale].feedbackPrivacy;
  return page.evaluate().setTitle('ChatGPT Audio Controls — Feedback').addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
function submitFeedback() { throw new Error('This form has moved. Reopen the feedback page to continue.'); }
