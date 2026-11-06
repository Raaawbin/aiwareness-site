/**
 * AIwareness leads: one script for every form on aiwareness.space.
 *
 * Tabs, in this order:
 *   Overview   dashboard with counts at the top and every lead below (newest first)
 *   Contacts, Calls, Events, Talks, Programs, Funnel
 *
 * Each form sends a hidden field "formType". TAB_FOR_FORM decides which tab
 * a form type lands in. Unknown form types go to DEFAULT_TAB.
 *
 * SETUP (once):
 *   1. Paste this whole file into Apps Script, save.
 *   2. Select the function "setupSheets" and click Run (authorise when asked).
 *   3. Project Settings > Script Properties:
 *        MC_API_KEY    your Mailchimp API key
 *        MC_LIST_ID    your Mailchimp Audience ID
 *        NOTIFY_EMAIL  optional, e.g. hello@aiwareness.space
 *   4. Deploy > New deployment > Web app (Execute as: Me, Access: Anyone).
 *   5. Select the function "installTrigger" and click Run (authorise when asked). It sets up
 *      a timer that runs "processQueue" every minute.
 *
 * Speed: doPost only checks and saves the row (about one second). Mailchimp and the
 * notification email are queued in the hidden tab "Queue" and sent by processQueue within
 * a minute, so the visitor does not wait for them.
 *
 * After any later code change: Deploy > Manage deployments > Edit > New version.
 *
 * Secrets live only in Script Properties. Never paste the API key into this file,
 * the website repository or a chat. The website only knows the public /exec URL.
 *
 * Consent: every form needs the required field privacy=yes. newsletter=yes adds the
 * person to Mailchimp as subscribed (no double opt-in). On the event sign-up, one required box covers
 * both, as Robin decided on 2026-11-04; the form then sends newsletter=yes as a hidden
 * field. Contact forms should keep the newsletter as a separate, optional box.
 */

const OVERVIEW_TAB = 'Overview';
const DEFAULT_TAB = 'Contacts';
const TAB_ORDER = ['Contacts', 'Calls', 'Events', 'Talks', 'Programs', 'Funnel'];

const TAB_FOR_FORM = {
  'contact': 'Contacts',
  'call-request': 'Calls',
  'event-interest': 'Events',
  'talk-request': 'Talks',
  'event-signup': 'Events',
  'program-waitlist': 'Programs',
  'agency-application': 'Programs',
  'newsletter': 'Funnel'
};

const HONEYPOT = 'website';
const FIRST_COLUMNS = ['timestamp', 'formType', 'email', 'name', 'newsletter', 'mailchimp', 'page', 'message'];

// Overview layout: stats in rows 3 and 4, table header in row 6, leads from row 7.
const OV_HEADERS = ['timestamp', 'tab', 'formType', 'name', 'email', 'newsletter', 'mailchimp', 'message', 'page'];
const OV_HEADER_ROW = 6;

/* ---------- Setup: run once, safe to run again ---------- */

function setupSheets() {
  const ss = SpreadsheetApp.getActive();

  let overview = ss.getSheetByName(OVERVIEW_TAB);
  if (!overview) {
    const sheets = ss.getSheets();
    if (sheets.length === 1 && sheets[0].getLastRow() === 0) {
      overview = sheets[0];
      overview.setName(OVERVIEW_TAB);
    } else {
      overview = ss.insertSheet(OVERVIEW_TAB);
    }
  }
  buildOverview(overview);

  TAB_ORDER.forEach(name => {
    const sh = ss.getSheetByName(name) || ss.insertSheet(name);
    if (sh.getLastRow() === 0) writeHeaders(sh, FIRST_COLUMNS);
  });

  ss.setActiveSheet(overview);
  ss.moveActiveSheet(1);
  TAB_ORDER.forEach((name, i) => {
    ss.setActiveSheet(ss.getSheetByName(name));
    ss.moveActiveSheet(i + 2);
  });
  ss.setActiveSheet(overview);
}

function buildOverview(sh) {
  sh.getRange('A1').setValue('AIwareness Leads: Overview').setFontSize(16).setFontWeight('bold');

  const labels = ['Total leads', 'Last 7 days', 'Newsletter yes'].concat(TAB_ORDER);
  const formulas = [
    '=COUNTA($E$7:$E)',
    '=COUNTIF($A$7:$A,">"&(NOW()-7))',
    '=COUNTIF($F$7:$F,"yes")'
  ].concat(TAB_ORDER.map(t => '=COUNTIF($B$7:$B,"' + t + '")'));

  sh.getRange(3, 1, 1, labels.length).setValues([labels])
    .setFontWeight('bold').setBackground('#e8dcff');
  sh.getRange(4, 1, 1, labels.length).setFormulas([formulas])
    .setFontSize(14).setHorizontalAlignment('left');

  sh.getRange(OV_HEADER_ROW, 1, 1, OV_HEADERS.length).setValues([OV_HEADERS])
    .setFontWeight('bold').setBackground('#cfeefa');
  sh.getRange(OV_HEADER_ROW + 1, 1, 500, 1).setNumberFormat('yyyy-mm-dd hh:mm');
  sh.setFrozenRows(OV_HEADER_ROW);

  sh.setColumnWidth(1, 130);
  sh.setColumnWidth(4, 150);
  sh.setColumnWidth(5, 240);
  sh.setColumnWidth(8, 320);
}

/* ---------- Web app endpoint ---------- */

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const p = (e && e.parameter) || {};

    // Bots fill the hidden field, people do not. Pretend success.
    if (p[HONEYPOT]) return json({ ok: true });

    const email = String(p.email || '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return json({ ok: false, error: 'invalid_email' });
    }

    // The privacy box is required on every form; check it here too, not only in the browser.
    if (p.privacy !== 'yes') {
      return json({ ok: false, error: 'consent_required' });
    }

    const formType = String(p.formType || 'general').replace(/[^\w-]/g, '').slice(0, 40) || 'general';
    const tab = TAB_FOR_FORM[formType] || DEFAULT_TAB;
    // The same sign-up arriving twice within two minutes (double click, a retry after a slow
    // answer) is saved and emailed once. The second one still gets a friendly "ok".
    const sig = [email, formType, p.event || '', p.message || ''].join('|');
    const dupKey = 'lead:' + Utilities.base64EncodeWebSafe(
      Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, sig));
    const cache = CacheService.getScriptCache();
    if (cache.get(dupKey)) return json({ ok: true });
    cache.put(dupKey, '1', 120);

    const wantsNewsletter = p.newsletter === 'yes';
    const name = String(p.name || '').trim();

    const row = {
      timestamp: new Date(), formType, email, name,
      newsletter: wantsNewsletter ? 'yes' : 'no',
      mailchimp: wantsNewsletter ? 'queued' : 'not requested',
      page: p.page || '', message: p.message || ''
    };
    Object.keys(p).forEach(k => {
      if (!(k in row) && k !== HONEYPOT) row[k] = p[k];
    });

    const tabRow = appendToTab(tab, row);
    addToOverview(tab, row);
    enqueue(tab, tabRow, row);

    return json({ ok: true });
  } catch (err) {
    console.error(err);
    return json({ ok: false, error: 'server_error' });
  } finally {
    lock.releaseLock();
  }
}

/* ---------- Sheet writing ---------- */

function writeHeaders(sh, headers) {
  sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  sh.setFrozenRows(1);
}

function appendToTab(tabName, row) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(tabName) || ss.insertSheet(tabName);

  let headers = sh.getLastColumn() ? sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0] : [];
  if (!headers.length || !headers[0]) headers = FIRST_COLUMNS.slice();
  Object.keys(row).forEach(k => { if (!headers.includes(k)) headers.push(k); });

  writeHeaders(sh, headers);
  sh.appendRow(headers.map(h => safe(row[h])));
  return sh.getLastRow();
}

function addToOverview(tab, row) {
  const sh = SpreadsheetApp.getActive().getSheetByName(OVERVIEW_TAB);
  if (!sh) return;

  // Newest lead goes right below the header.
  sh.insertRowAfter(OV_HEADER_ROW);
  const target = sh.getRange(OV_HEADER_ROW + 1, 1, 1, OV_HEADERS.length);
  target.clearFormat();
  target.setValues([OV_HEADERS.map(h => h === 'tab' ? tab : safe(row[h]))]);
  sh.getRange(OV_HEADER_ROW + 1, 1).setNumberFormat('yyyy-mm-dd hh:mm');
}

// Stops "=..." in a form field from running as a spreadsheet formula.
function safe(v) {
  if (v === undefined || v === null) return '';
  if (v instanceof Date) return v;
  const s = String(v).slice(0, 5000);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

/* ---------- Mailchimp ---------- */

function subscribe(email, name, tag) {
  const props = PropertiesService.getScriptProperties();
  const key = props.getProperty('MC_API_KEY');
  const list = props.getProperty('MC_LIST_ID');
  if (!key || !list) return 'error: missing Mailchimp settings';

  const dc = key.split('-')[1];
  const hash = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, email)
    .map(b => ('0' + (b & 255).toString(16)).slice(-2)).join('');
  const base = 'https://' + dc + '.api.mailchimp.com/3.0/lists/' + list + '/members/' + hash;
  const headers = { Authorization: 'Basic ' + Utilities.base64Encode('aiwareness:' + key) };

  // New people are subscribed directly (no double opt-in, Robin 2026-11-04).
  // Existing members keep their current status, so nobody who unsubscribed is added again.
  const body = { email_address: email, status_if_new: 'subscribed' };
  if (name) {
    const parts = name.split(/\s+/);
    body.merge_fields = { FNAME: parts.shift(), LNAME: parts.join(' ') };
  }

  const res = UrlFetchApp.fetch(base, {
    method: 'put', contentType: 'application/json', headers,
    payload: JSON.stringify(body), muteHttpExceptions: true
  });
  if (res.getResponseCode() >= 300) {
    console.error(res.getContentText());
    return 'error ' + res.getResponseCode();
  }

  UrlFetchApp.fetch(base + '/tags', {
    method: 'post', contentType: 'application/json', headers,
    payload: JSON.stringify({ tags: [{ name: tag, status: 'active' }] }),
    muteHttpExceptions: true
  });

  return JSON.parse(res.getContentText()).status; // subscribed, or an existing member's status
}


/* ---------- Queue: Mailchimp and notification run after the visitor got their answer ---------- */

const QUEUE_TAB = 'Queue';
const MAX_ATTEMPTS = 3;

// Run once from the editor (and again after authorising new permissions).
function installTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'processQueue') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('processQueue').timeBased().everyMinutes(1).create();
}

function enqueue(tab, tabRow, row) {
  const ss = SpreadsheetApp.getActive();
  let q = ss.getSheetByName(QUEUE_TAB);
  if (!q) {
    q = ss.insertSheet(QUEUE_TAB);
    q.getRange(1, 1, 1, 2).setValues([['attempts', 'payload']]).setFontWeight('bold');
    q.hideSheet();
  }
  const payload = JSON.stringify({ tab, tabRow, row: Object.assign({}, row, { timestamp: row.timestamp.toISOString() }) });
  q.appendRow([0, payload]);
}

function processQueue() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;   // the next minute picks it up
  try {
    const q = SpreadsheetApp.getActive().getSheetByName(QUEUE_TAB);
    if (!q || q.getLastRow() < 2) return;
    const data = q.getRange(2, 1, q.getLastRow() - 1, 2).getValues();
    const remove = [];

    data.forEach((r, i) => {
      const sheetRow = i + 2;
      let job;
      try { job = JSON.parse(r[1]); } catch (e) { remove.push(sheetRow); return; }
      try {
        const row = job.row;
        row.timestamp = new Date(row.timestamp);
        if (row.newsletter === 'yes') {
          row.mailchimp = subscribe(row.email, row.name, row.formType);
          setMailchimpStatus(job.tab, job.tabRow, row);
        }
        notify(job.tab, row);
        remove.push(sheetRow);
      } catch (err) {
        console.error(err);
        const attempts = Number(r[0]) + 1;
        if (attempts >= MAX_ATTEMPTS) remove.push(sheetRow);
        else q.getRange(sheetRow, 1).setValue(attempts);
      }
    });

    remove.sort((a, b) => b - a).forEach(n => q.deleteRow(n));
  } finally {
    lock.releaseLock();
  }
}

// Writes the Mailchimp result into the lead's rows (tab and Overview), if they are still where they were.
function setMailchimpStatus(tabName, tabRow, row) {
  const ss = SpreadsheetApp.getActive();

  const sh = ss.getSheetByName(tabName);
  if (sh && tabRow) {
    const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
    const col = headers.indexOf('mailchimp') + 1;
    const mailCol = headers.indexOf('email') + 1;
    if (col && mailCol && String(sh.getRange(tabRow, mailCol).getValue()).toLowerCase() === row.email) {
      sh.getRange(tabRow, col).setValue(row.mailchimp);
    }
  }

  const ov = ss.getSheetByName(OVERVIEW_TAB);
  if (ov) {
    const first = OV_HEADER_ROW + 1;
    const n = Math.min(100, Math.max(0, ov.getLastRow() - OV_HEADER_ROW));
    if (n) {
      const vals = ov.getRange(first, 1, n, OV_HEADERS.length).getValues();
      const ts = row.timestamp.getTime();
      const iMail = OV_HEADERS.indexOf('email'), iMc = OV_HEADERS.indexOf('mailchimp');
      for (let i = 0; i < vals.length; i++) {
        const t = vals[i][0] instanceof Date ? vals[i][0].getTime() : 0;
        if (String(vals[i][iMail]).toLowerCase() === row.email && Math.abs(t - ts) < 120000) {
          ov.getRange(first + i, iMc + 1).setValue(row.mailchimp);
          break;
        }
      }
    }
  }
}

/* ---------- Notification and response ---------- */

function notify(tab, row) {
  const to = PropertiesService.getScriptProperties().getProperty('NOTIFY_EMAIL');
  if (!to) return;
  const lines = Object.keys(row).map(k => k + ': ' + row[k]).join('\n');
  const who = row.name ? row.name + ' <' + row.email + '>' : row.email;
  // Reply-To is the visitor, so answering the email answers them directly.
  MailApp.sendEmail({
    to: to,
    replyTo: row.email,
    subject: 'New AIwareness lead (' + tab + '): ' + who,
    body: lines
  });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
