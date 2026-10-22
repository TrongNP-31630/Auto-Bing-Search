(() => {
  // Declarative and on-demand injection can both reach the same document.
  if (globalThis.__bingSearchRunner) { globalThis.__bingSearchRunner.sync(); return; }
  let pageId = crypto.randomUUID();
  let pageUrl = location.href;
  let timer, navigationTimer, pendingNavigation, busy = false, generation = 0;
  async function send(type, extra = {}) {
    const response = await chrome.runtime.sendMessage({ type, ...extra });
    if (!response?.ok) throw new Error(response?.error || 'Không thể kết nối extension.');
    return response;
  }
  function controls() {
    const visible = node => node && node.getClientRects().length && !node.disabled;
    const input = [...document.querySelectorAll('#sb_form_q, #sb_form input[name="q"], #sb_form textarea[name="q"]')].find(visible);
    const form = input?.form || input?.closest('form');
    const button = form && [...form.querySelectorAll('#sb_form_go, #search_icon, button[type="submit"], input[type="submit"], label[for="sb_form_go"]')].find(visible);
    return visible(input) && visible(button) ? { input, button } : null;
  }
  function checkNavigation() {
    if (location.href === pageUrl) return;
    pageUrl = location.href;
    // Bing can replace results with history.pushState instead of loading a new
    // document. That still completes this page's claim and permits the next one.
    pageId = crypto.randomUUID();
    pendingNavigation = null;
    clearTimeout(navigationTimer);
    sync();
  }
  async function waitControls() {
    if (controls()) return controls();
    return new Promise(resolve => {
      const observer = new MutationObserver(() => {
        const found = controls();
        if (found) { clearTimeout(timeout); observer.disconnect(); resolve(found); }
      });
      const timeout = setTimeout(() => { observer.disconnect(); resolve(null); }, 15000);
      observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
    });
  }
  async function execute(run) {
    if (busy) return;
    busy = true;
    let task;
    try {
      const found = await waitControls();
      if (!found) {
        await send('fail', { runId: run.id, error: 'Không tìm thấy ô tìm kiếm hoặc nút kính lúp Bing. Hãy tải lại trang và thử lại.' });
        return;
      }
      const claimedPageId = pageId;
      ({ task } = await send('claim', { runId: run.id, pageId: claimedPageId }));
      if (!task) return;
      const { input, button } = found;
      const prototype = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, 'value').set.call(input, task.query);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      const { run: current } = await send('page');
      if (!current || current.id !== task.runId || current.stopped || current.done !== task.done) return;
      // Use Bing's actual search control. Never replace the tab URL or bypass
      // the form with a direct navigation. DOM events remain synthetic.
      if (!button.isConnected) throw new Error('Nút tìm kiếm đã thay đổi. Hãy tải lại trang Bing.');
      pendingNavigation = { runId: task.runId, pageId: claimedPageId };
      button.click();
      checkNavigation();
      // Cancel this watchdog on either a full load or a same-document URL change.
      if (pendingNavigation) navigationTimer = setTimeout(() => {
        if (!pendingNavigation || pendingNavigation.runId !== task.runId || pendingNavigation.pageId !== claimedPageId) return;
        pendingNavigation = null;
        send('fail', { runId: task.runId, error: 'Bing chưa chuyển trang sau khi bấm kính lúp. Phiên đã dừng; hãy kiểm tra trang Bing.' }).catch(() => {});
      }, 20000);
    } catch (error) {
      await send('fail', { runId: run.id, error: error.message }).catch(() => {});
    } finally { busy = false; sync(); }
  }
  async function sync() {
    const version = ++generation;
    clearTimeout(timer);
    try {
      const { run } = await send('page');
      if (version !== generation || !run?.running || run.stopped || run.lastPageId === pageId) return;
      timer = setTimeout(() => execute(run), Math.max(0, run.nextAt - Date.now()));
    } catch { /* Extension reloaded: the user can refresh the tab to reconnect. */ }
  }
  globalThis.__bingSearchRunner = { sync };
  // A history.pushState call does not dispatch popstate, so also check the URL.
  setInterval(checkNavigation, 500);
  addEventListener('popstate', checkNavigation);
  addEventListener('pageshow', () => { checkNavigation(); sync(); });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.run) sync();
  });
  sync();
})();
