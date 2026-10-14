// Mostra/oculta o painel dentro da página, com efeito "gênio" saindo do ícone da extensão.
// Só fecha pelo X ou clicando no ícone de novo.
function togglePanel(sidebarUrl, reportUrl) {
  const ID = 'refund-sidebar-panel';
  const REPORT_ID = 'refund-report-panel';
  const existing = document.getElementById(ID);
  const GENIE = [
    { opacity: 0, transform: 'scale(0.06, 0.02) skewX(-24deg)', offset: 0 },
    { opacity: 1, transform: 'scale(0.45, 0.35) skewX(-14deg)', offset: 0.35 },
    { opacity: 1, transform: 'scale(0.9, 1.04) skewX(-3deg)', offset: 0.75 },
    { opacity: 1, transform: 'scale(1, 1) skewX(0deg)', offset: 1 }
  ];
  const TIMING = { duration: 420, easing: 'cubic-bezier(.22,.8,.3,1)', fill: 'both' };
  const SLIDE = [
    { opacity: 0, transform: 'translateX(24px)' },
    { opacity: 1, transform: 'translateX(0)' }
  ];

  function closePanel(frame) {
    if (frame.dataset.closing) return;
    frame.dataset.closing = '1';
    frame.animate(GENIE, { ...TIMING, duration: 300, direction: 'reverse', easing: 'ease-in' })
      .finished.then(() => frame.remove(), () => frame.remove());
  }

  function closeReport() {
    const report = document.getElementById(REPORT_ID);
    if (report) report.remove();
  }

  if (existing) {
    closeReport();
    closePanel(existing);
    existing.dispatchEvent(new CustomEvent('refund-teardown'));
    return;
  }

  const frame = document.createElement('iframe');
  frame.id = ID;
  frame.src = sidebarUrl;
  frame.style.cssText = [
    'position:fixed', 'top:4px', 'right:8px', 'width:436px',
    'height:calc(100vh - 16px)', 'border:0', 'border-radius:12px',
    'box-shadow:0 8px 32px rgba(0,0,0,.3)', 'z-index:2147483647',
    'background:transparent', 'color-scheme:normal',
    'transform-origin:calc(100% - 20px) 0'
  ].join(';');
  document.documentElement.appendChild(frame);
  frame.animate(GENIE, TIMING);

  // The report opens as a second panel right next to the sidebar.
  function showReport() {
    let report = document.getElementById(REPORT_ID);
    if (report) {
      report.src = reportUrl;
      return;
    }
    report = document.createElement('iframe');
    report.id = REPORT_ID;
    report.src = reportUrl;
    report.style.cssText = [
      'position:fixed', 'top:4px', 'right:452px', 'width:400px',
      'height:200px', 'max-height:calc(100vh - 16px)', 'border:0', 'border-radius:12px',
      'box-shadow:0 8px 32px rgba(0,0,0,.3)', 'z-index:2147483647',
      'background:transparent', 'color-scheme:normal'
    ].join(';');
    document.documentElement.appendChild(report);
    report.animate(SLIDE, { duration: 220, easing: 'ease-out', fill: 'both' });
  }

  function onMsg(e) {
    const data = e.data;
    if (!data || typeof data.type !== 'string') return;
    const report = document.getElementById(REPORT_ID);
    if (e.source === frame.contentWindow) {
      if (data.type === 'refund-close-panel') {
        closeReport();
        closePanel(frame);
        teardown();
      } else if (data.type === 'refund-show-report') {
        showReport();
      }
    } else if (report && e.source === report.contentWindow) {
      if (data.type === 'refund-close-report') closeReport();
      else if (data.type === 'refund-report-height') report.style.height = data.height + 'px';
    }
  }

  function teardown() {
    window.removeEventListener('message', onMsg);
  }

  window.addEventListener('message', onMsg);
  frame.addEventListener('refund-teardown', teardown);
}

chrome.action.onClicked.addListener(tab => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: togglePanel,
    args: [chrome.runtime.getURL('popup.html'), chrome.runtime.getURL('report.html')]
  }).catch(() => {});
});
