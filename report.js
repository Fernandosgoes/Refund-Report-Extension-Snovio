const reportEl = document.getElementById('report');
const copyBtn = document.getElementById('btn-copy');

function render(lines) {
  reportEl.textContent = '';
  lines.forEach(line => {
    const row = document.createElement('div');
    if (line.gap) {
      row.innerHTML = '<br>';
    } else {
      const label = document.createElement('b');
      label.textContent = `${line.label}:`;
      row.appendChild(label);
      row.appendChild(line.stacked ? document.createElement('br') : document.createTextNode(' '));
      row.appendChild(document.createTextNode(line.value));
    }
    reportEl.appendChild(row);
  });
  // Tell the host page how tall the panel should be.
  window.parent.postMessage({ type: 'refund-report-height', height: document.documentElement.scrollHeight }, '*');
}

chrome.storage.local.get('refundReport', data => {
  render(Array.isArray(data.refundReport) ? data.refundReport : []);
});

function markCopied() {
  copyBtn.textContent = 'Copied ✓';
  copyBtn.classList.add('done');
  setTimeout(() => {
    copyBtn.textContent = 'Copy report';
    copyBtn.classList.remove('done');
  }, 2000);
}

// Copy as rich text (labels stay bold when pasted into Google Chat).
function copyRendered() {
  const range = document.createRange();
  range.selectNodeContents(reportEl);
  const sel = getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  const ok = document.execCommand('copy');
  sel.removeAllRanges();
  return ok;
}

copyBtn.addEventListener('click', () => {
  if (copyRendered()) markCopied();
});

document.getElementById('btn-close').addEventListener('click', () => {
  window.parent.postMessage({ type: 'refund-close-report' }, '*');
});
