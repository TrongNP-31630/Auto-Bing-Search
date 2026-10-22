const $ = id => document.getElementById(id);
let run = null;
let busy = false;
async function send(type, settings) {
  const response = await chrome.runtime.sendMessage({ type, settings });
  if (!response?.ok) throw new Error(response?.error || 'Không thể kết nối extension.');
  return response;
}
function showError(error) { $('error').textContent = error.message; $('error').hidden = false; }
function render() {
  const running = Boolean(run?.running);
  for (const id of ['count', 'delay', 'queries', 'start']) $(id).disabled = running || busy;
  $('stop').disabled = !running || busy;
  $('state').textContent = running ? 'Đang chạy trong tab Bing' : run?.error ? 'Đã dừng do lỗi' : run ? 'Đã kết thúc' : 'Sẵn sàng';
  $('progress').textContent = `${run?.done || 0} / ${run?.count || 0}`;
  $('bar').max = run?.count || 1;
  $('bar').value = run?.done || 0;
  $('detail').textContent = running
    ? (run.nextAt > Date.now() ? `Lượt tiếp theo sau khoảng ${Math.ceil((run.nextAt - Date.now()) / 1000)} giây.` : 'Đang đợi trang Bing sẵn sàng để tìm kiếm…')
    : run?.reason || 'Mở tab Bing rồi bấm Bắt đầu.';
  $('last').textContent = run?.lastQuery ? `Vừa tìm: ${run.lastQuery}` : '';
}
$('settings').addEventListener('submit', async event => {
  event.preventDefault();
  busy = true; $('error').hidden = true; render();
  try {
    await send('start', { count: Number($('count').value), delay: Number($('delay').value), queries: $('queries').value });
    run = (await send('get')).run;
  } catch (error) { showError(error); }
  finally { busy = false; render(); }
});
$('stop').addEventListener('click', async () => {
  busy = true; $('error').hidden = true; render();
  try { await send('stop'); run = (await send('get')).run; }
  catch (error) { showError(error); }
  finally { busy = false; render(); }
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.run) { run = changes.run.newValue; render(); }
});
// This timer only paints the countdown; the Bing tab schedules actual searches.
setInterval(render, 1000);
(async () => {
  busy = true; render();
  try {
    const data = await send('get');
    const settings = data.settings || { count: 20, delay: 5, queries: '' };
    $('count').value = settings.count;
    $('delay').value = settings.delay;
    $('queries').value = settings.queries;
    run = data.run;
  } catch (error) { showError(error); }
  finally { busy = false; render(); }
})();
