// Deploy as owner, with access ANYONE_ANONYMOUS. No install identifiers or analytics.
const SURVEY_VERSION = '1';
const REASONS = ['broken', 'intrusive', 'slow', 'difficult', 'missing', 'language', 'unneeded', 'other'];
const HEADERS = ['Received UTC', 'Reason', 'Comment', 'Language', 'Extension version', 'Browser', 'OS', 'Survey version', 'Request ID'];

// Editor entry point. Anonymous web-app callers cannot initialize resources.
function initializeFeedback() {
  const active = Session.getActiveUser().getEmail();
  if (!active || active !== Session.getEffectiveUser().getEmail()) throw new Error('Owner authorization required.');
  return initializeFeedback_();
}

// The trailing underscore prevents direct client RPC to the implementation.
function initializeFeedback_() {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const props = PropertiesService.getScriptProperties();
    const existingId = props.getProperty('SPREADSHEET_ID');
    const book = existingId ? SpreadsheetApp.openById(existingId) : SpreadsheetApp.create('ChatGPT Audio Controls — Feedback');
    if (!existingId) {
      book.getSheets()[0].setName('Responses');
      props.setProperty('SPREADSHEET_ID', book.getId());
    }
    const responses = book.getSheetByName('Responses');
    if (!responses) throw new Error('Expected Responses sheet; existing workbook was not changed.');
    const current = responses.getRange(1, 1, 1, HEADERS.length).getValues()[0];
    if (current.some(String) && current.join('|') !== HEADERS.join('|')) throw new Error('Unexpected headers; existing responses were not changed.');
    responses.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
    responses.setFrozenRows(1);
    if (!book.getSheetByName('Summary')) {
      const summary = book.insertSheet('Summary');
      summary.getRange('A1').setValue('Voluntary feedback — respondents only');
      summary.getRange('A2').setValue('Responses');
      summary.getRange('B2').setFormula('=COUNTA(Responses!I2:I)');
      [['A4', 'B', 'Reason'], ['D4', 'D', 'Language'], ['G4', 'E', 'Version'], ['J4', 'F', 'Browser']].forEach(function (entry) {
        const column = entry[1];
        summary.getRange(entry[0]).setFormula('=IFERROR(QUERY(Responses!A2:I,"select ' + column + ', count(I) where I is not null group by ' + column + ' label ' + column + " '" + entry[2] + "', count(I) 'Responses'" + '",0),"No responses yet")');
      });
      summary.setFrozenRows(2);
    }
    if (!props.getProperty('SIGNING_SECRET')) props.setProperty('SIGNING_SECRET', Utilities.getUuid() + Utilities.getUuid());
    SpreadsheetApp.flush();
    return { configured: true };
  } finally { lock.releaseLock(); }
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  const locale = Object.prototype.hasOwnProperty.call(SURVEY_COPY, p.lang) ? p.lang : 'en';
  const page = HtmlService.createTemplateFromFile('Index');
  const id = Utilities.getUuid();
  const expires = Date.now() + 24 * 60 * 60 * 1000;
  page.bootstrap = JSON.stringify({
    locale, locales: SURVEY_COPY, names: LANGUAGE_NAMES, id, expires,
    token: sign_(id, expires), version: version_(p.version),
    browser: family_(p.browser, ['Chrome', 'Edge', 'Chromium', 'Other']),
    os: family_(p.os, ['Windows', 'macOS', 'Linux', 'ChromeOS', 'Android', 'Other'])
  }).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  return page.evaluate().setTitle('ChatGPT Audio Controls — Feedback')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function family_(value, allowed) { return allowed.indexOf(value) >= 0 ? value : 'Other'; }
function version_(value) { return typeof value === 'string' && /^\d{1,5}\.\d{1,5}\.\d{1,5}$/.test(value) ? value : 'unknown'; }
function sign_(id, expires) {
  const secret = PropertiesService.getScriptProperties().getProperty('SIGNING_SECRET');
  if (!secret) throw new Error('Survey is not configured.');
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(id + ':' + expires, secret));
}
function literal_(value) { return value ? "'" + value : ''; }

// The only callable client write. Private helpers end in underscore.
function submitFeedback(input) {
  if (!input || typeof input !== 'object' || input.website) throw new Error('Invalid submission.');
  if (typeof input.id !== 'string' || !/^[0-9a-f-]{36}$/.test(input.id)) throw new Error('Invalid request.');
  if (!Number.isSafeInteger(input.expires) || input.expires < Date.now() || input.expires > Date.now() + 86400000) throw new Error('Survey expired. Reopen the survey.');
  if (typeof input.token !== 'string' || input.token !== sign_(input.id, input.expires)) throw new Error('Invalid request.');
  if (!REASONS.includes(input.reason) || !Object.prototype.hasOwnProperty.call(SURVEY_COPY, input.locale)) throw new Error('Invalid answer.');
  if (typeof input.comment !== 'string' || input.comment.length > 1000) throw new Error('Invalid note.');
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw new Error('Busy. Please retry.');
  try {
    const props = PropertiesService.getScriptProperties();
    const sheet = SpreadsheetApp.openById(props.getProperty('SPREADSHEET_ID')).getSheetByName('Responses');
    if (!sheet || sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0].join('|') !== HEADERS.join('|')) throw new Error('Response sheet is not configured.');
    const rows = sheet.getLastRow();
    // Check the authoritative column under the same lock as the write, including retries after a lost reply.
    if (rows > 1 && sheet.getRange(2, 9, rows - 1, 1).createTextFinder(input.id).matchEntireCell(true).useRegularExpression(false).findNext()) return { saved: true };
    // Fixed global limits bound writes without collecting an IP, fingerprint or user identity.
    const day = Utilities.formatDate(new Date(), 'UTC', 'yyyy-MM-dd');
    const hour = Utilities.formatDate(new Date(), 'UTC', 'yyyy-MM-dd-HH');
    const daily = JSON.parse(props.getProperty('DAILY_LIMIT') || '{}');
    const hourly = JSON.parse(props.getProperty('HOURLY_LIMIT') || '{}');
    const dayCount = daily.period === day ? daily.count : 0;
    const hourCount = hourly.period === hour ? hourly.count : 0;
    if (dayCount >= 1000 || hourCount >= 100 || rows >= 10001) throw new Error('Busy. Please retry later.');
    // Reserve before writing, so an interrupted request cannot evade the bounds.
    props.setProperties({ DAILY_LIMIT: JSON.stringify({ period: day, count: dayCount + 1 }), HOURLY_LIMIT: JSON.stringify({ period: hour, count: hourCount + 1 }) });
    const row = [new Date().toISOString(), input.reason, input.comment, input.locale, version_(input.version),
      family_(input.browser, ['Chrome', 'Edge', 'Chromium', 'Other']), family_(input.os, ['Windows', 'macOS', 'Linux', 'ChromeOS', 'Android', 'Other']), SURVEY_VERSION, input.id];
    sheet.getRange(rows + 1, 1, 1, row.length).setNumberFormat('@').setValues([row.map(literal_)]);
    SpreadsheetApp.flush();
    return { saved: true };
  } finally { lock.releaseLock(); }
}
