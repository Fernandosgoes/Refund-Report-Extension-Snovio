const FIELDS = [
  { id: 'user_email',  label: 'User email' },
  { id: 'how_long',    label: 'How long with us' },
  { id: 'plan',        label: 'Plan' },
  { id: 'charge_date', label: 'Charge date' },
  { id: 'amount',      label: 'Amount' },
  { id: 'credits',     label: 'Credits used' },
  { id: 'recipients',  label: 'Recipients used' },
  { id: 'warmup',      label: 'Warm-up used' },
  { id: 'slots',       label: 'Slots used' },
  { id: 'reason',      label: 'Reason', gapBefore: true },
  { id: 'offered',     label: 'What was offered to prevent refund/cancellation', stacked: true },
  { id: 'customer_response', label: 'How did the customer respond', stacked: true },
  { id: 'form_filled', label: 'Form filled out', gapBefore: true },
  { id: 'chat_link',   label: 'Chat link', gapBefore: true }
];

const PLANS = [
  ['Starter Monthly Plan', '39.00'],
  ['Starter 3 Months Plan', '117.00'],
  ['Starter 6 Months Plan', '234.00'],
  ['Starter Annual Plan', '468.00'],
  ['Pro S Monthly Plan', '99.00'],
  ['Pro S Annual Plan', '1188.00'],
  ['Pro M Monthly Plan', '189.00'],
  ['Pro M Annual Plan', '2268.00'],
  ['Pro L Monthly Plan', '369.00'],
  ['Pro L Annual Plan', '4428.00'],
  ['Ultra Monthly Plan', '738.00'],
  ['Ultra Annual Plan', '8856.00'],
  ['Ultra x3 Annual Plan', '26568.00'],
  ['Ultra x2 Annual Plan', '17712.00'],
  ['Ultra x4 Annual Plan', '35424.00'],
  ['Ultra x5 Annual Plan', '44280.00'],
  ['Pro S 3 Months Plan', '297.00'],
  ['Pro S 6 Months Plan', '594.00'],
  ['Pro M 3 Months Plan', '567.00'],
  ['Pro M 6 Months Plan', '1134.00'],
  ['Pro L 3 Months Plan', '1107.00'],
  ['Pro L 6 Months Plan', '2214.00'],
  ['Ultra 3 Months Plan', '2214.00'],
  ['Ultra 6 Months Plan', '4428.00'],
  ['Ultra x2 Monthly Plan', '1476.00'],
  ['Ultra x3 Monthly Plan', '2214.00'],
  ['Ultra x4 Monthly Plan', '2952.00'],
  ['Ultra x5 Monthly Plan', '3690.00']
];

const DRAFT_KEY = 'refundDraft';
const REPORT_KEY = 'refundReport';
const HISTORY_KEY = 'refundHistory';
const HISTORY_MAX = 100;

let editingId = null; // set while editing an entry loaded from history

const form = document.getElementById('refund-form');
const el = id => document.getElementById(id);

function readValues() {
  const values = {};
  FIELDS.forEach(f => { values[f.id] = el(f.id).value.trim(); });
  return values;
}

// Report = list of lines; the report panel renders labels in bold.
function buildReport(values) {
  const lines = [];
  FIELDS.forEach(f => {
    let value = values[f.id];
    if (f.id === 'amount' && /^\d/.test(value)) value = `$${value}`;
    if (f.stacked) lines.push({ gap: true });
    if (f.gapBefore) lines.push({ gap: true });
    lines.push({ label: f.label, value, stacked: !!f.stacked });
  });
  return lines;
}

function saveDraft() {
  chrome.storage.local.set({ [DRAFT_KEY]: readValues() });
}

const planSelect = el('plan');
planSelect.add(new Option('Select plan', ''));
PLANS.forEach(([name, price]) => {
  planSelect.add(new Option(price ? `${name} (${price} USD)` : name, name));
});

chrome.storage.local.get(DRAFT_KEY, data => {
  const draft = data[DRAFT_KEY] || {};
  FIELDS.forEach(f => { if (draft[f.id]) el(f.id).value = draft[f.id]; });
});

// Numeric fields: digits only, plus dot/comma separators
form.addEventListener('input', e => {
  if (e.target.matches('[data-numeric]')) {
    e.target.value = e.target.value.replace(/[^\d.,]/g, '');
  }
  saveDraft();
});

el('btn-clear').addEventListener('click', resetForm);

function resetForm() {
  form.reset();
  editingId = null;
  chrome.storage.local.remove(DRAFT_KEY);
  el('user_email').focus();
}

// ---- History ----
function getHistory(cb) {
  chrome.storage.local.get(HISTORY_KEY, data => cb(data[HISTORY_KEY] || []));
}

function saveToHistory(values, cb) {
  getHistory(list => {
    const existing = editingId && list.find(item => item.id === editingId);
    if (existing) {
      existing.values = values;
      existing.ts = Date.now();
    } else {
      list.unshift({ id: String(Date.now()), ts: Date.now(), values });
    }
    list.sort((a, b) => b.ts - a.ts);
    chrome.storage.local.set({ [HISTORY_KEY]: list.slice(0, HISTORY_MAX) }, cb);
  });
}

const historyView = el('history-view');
const historyList = el('history-list');

function formatTs(ts) {
  return new Date(ts).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function renderHistory() {
  getHistory(list => {
    historyList.textContent = '';
    el('history-empty').hidden = list.length > 0;
    el('btn-history-clear').hidden = list.length === 0;
    list.forEach(item => {
      const li = document.createElement('li');
      li.className = 'history-item';

      const open = document.createElement('button');
      open.type = 'button';
      open.className = 'history-open';
      const title = document.createElement('b');
      title.textContent = item.values.user_email || '(no email)';
      const sub = document.createElement('span');
      sub.textContent = [item.values.plan, formatTs(item.ts)].filter(Boolean).join(' · ');
      open.append(title, sub);
      open.addEventListener('click', () => loadFromHistory(item));

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'history-del';
      del.title = 'Delete';
      del.textContent = '×';
      del.addEventListener('click', () => {
        getHistory(all => {
          chrome.storage.local.set({ [HISTORY_KEY]: all.filter(i => i.id !== item.id) }, renderHistory);
        });
      });

      li.append(open, del);
      historyList.appendChild(li);
    });
  });
}

function showHistory(show) {
  historyView.hidden = !show;
  form.hidden = show;
  if (show) renderHistory();
}

function loadFromHistory(item) {
  FIELDS.forEach(f => { el(f.id).value = item.values[f.id] || ''; });
  editingId = item.id;
  saveDraft();
  showHistory(false);
}

el('btn-history').addEventListener('click', () => showHistory(historyView.hidden));

el('btn-history-clear').addEventListener('click', () => {
  chrome.storage.local.remove(HISTORY_KEY, renderHistory);
});

form.addEventListener('submit', e => {
  e.preventDefault();
  const values = readValues();
  chrome.storage.local.set({ [REPORT_KEY]: buildReport(values) }, () => {
    window.parent.postMessage({ type: 'refund-show-report' }, '*');
    // Report is saved; keep a copy in history and reset the form for the next customer.
    saveToHistory(values, resetForm);
  });
});

el('btn-close').addEventListener('click', () => {
  window.parent.postMessage({ type: 'refund-close-panel' }, '*');
});
