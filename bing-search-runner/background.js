const DEFAULTS = { count: 20, delay: 5, queries: '' };
const words = ['mây', 'biển', 'mèo', 'sách', 'xanh', 'đỏ', 'trăng', 'nắng', 'gió', 'sông', 'núi', 'hoa', 'cá', 'chim', 'rừng', 'đảo', 'bánh', 'trà', 'nhạc', 'ảnh', 'đèn', 'bút', 'giấy', 'mưa', 'cầu', 'đá', 'cát', 'cây', 'lá', 'tuyết', 'bạc', 'vàng', 'ngọc', 'sóng', 'tàu', 'xe', 'đường', 'phố', 'nhà', 'vườn', 'robot', 'pixel', 'piano', 'guitar', 'camera', 'laptop', 'orange', 'purple', 'river', 'ocean', 'forest', 'planet', 'comet', 'rocket', 'coffee', 'window', 'silver', 'dragon', 'panda', 'tiger', 'music', 'cloud', 'paper', 'sunset'];

words.push(
  'apple', 'banana', 'mango', 'lemon', 'peach', 'cherry', 'grape', 'melon', 'coconut', 'avocado',
  'bread', 'butter', 'cheese', 'yogurt', 'honey', 'pepper', 'ginger', 'garlic', 'onion', 'potato',
  'tomato', 'carrot', 'broccoli', 'spinach', 'pumpkin', 'cucumber', 'lettuce', 'radish', 'celery', 'mushroom',
  'horse', 'rabbit', 'turtle', 'dolphin', 'whale', 'shark', 'eagle', 'falcon', 'owl', 'penguin',
  'butterfly', 'dragonfly', 'beetle', 'ant', 'bee', 'cricket', 'spider', 'snail', 'frog', 'lizard',
  'mountain', 'valley', 'canyon', 'desert', 'meadow', 'prairie', 'glacier', 'waterfall', 'volcano', 'island',
  'sunrise', 'rainbow', 'thunder', 'lightning', 'breeze', 'mist', 'frost', 'dew', 'shadow', 'horizon',
  'star', 'galaxy', 'nebula', 'asteroid', 'meteor', 'satellite', 'orbit', 'gravity', 'eclipse', 'cosmos',
  'violin', 'flute', 'trumpet', 'drum', 'cello', 'harp', 'saxophone', 'clarinet', 'melody', 'rhythm',
  'canvas', 'brush', 'pencil', 'ink', 'sketch', 'portrait', 'sculpture', 'mosaic', 'pottery', 'origami',
  'keyboard', 'monitor', 'printer', 'scanner', 'tablet', 'smartphone', 'battery', 'charger', 'cable', 'sensor',
  'engine', 'turbine', 'motor', 'wheel', 'pedal', 'brake', 'helmet', 'compass', 'backpack', 'suitcase',
  'castle', 'palace', 'tower', 'bridge', 'tunnel', 'harbor', 'station', 'airport', 'library', 'museum',
  'garden', 'orchard', 'vineyard', 'greenhouse', 'balcony', 'terrace', 'rooftop', 'courtyard', 'cottage', 'cabin',
  'velvet', 'cotton', 'linen', 'silk', 'wool', 'leather', 'denim', 'ribbon', 'button', 'zipper',
  'emerald', 'ruby', 'sapphire', 'diamond', 'crystal', 'marble', 'granite', 'copper', 'bronze', 'iron',
  'algebra', 'geometry', 'calculus', 'physics', 'chemistry', 'biology', 'ecology', 'geology', 'astronomy', 'science',
  'language', 'poetry', 'novel', 'story', 'essay', 'journal', 'dictionary', 'grammar', 'syntax', 'alphabet',
  'soccer', 'tennis', 'volleyball', 'basketball', 'baseball', 'badminton', 'swimming', 'cycling', 'running', 'hiking',
  'puzzle', 'chess', 'domino', 'sudoku', 'kite', 'balloon', 'lantern', 'candle', 'mirror', 'clock'
);

function randomIndex(max) {
  return crypto.getRandomValues(new Uint32Array(1))[0] % max;
}

function randomQueries(count) {
  const queries = new Set();
  for (let attempt = 0; queries.size < count && attempt < 10000; attempt++) {
    const length = 2 + randomIndex(4);
    queries.add(Array.from({ length }, () => words[randomIndex(words.length)]).join(' '));
  }
  if (queries.size < count) throw new Error('Không tạo đủ từ khóa ngẫu nhiên. Hãy thử lại.');
  return [...queries];
}

function isBing(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && ['bing.com', 'www.bing.com'].includes(url.hostname); }
  catch { return false; }
}

function makeQueue(settings) {
  const custom = [...new Set(settings.queries.split(/\r?\n/).map(s => s.trim()).filter(Boolean))];
  if (!custom.length) return randomQueries(settings.count);
  const pool = custom;
  if (pool.length < settings.count) throw new Error(`Cần ít nhất ${settings.count} từ khóa khác nhau (hiện có ${pool.length}).`);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, settings.count);
}

function validate(input) {
  const count = Number(input.count), delay = Number(input.delay);
  if (!Number.isInteger(count) || count < 1 || count > 200) throw new Error('Số lượt phải là số nguyên từ 1 đến 200.');
  if (!Number.isFinite(delay) || delay < 0 || delay > 3600) throw new Error('Thời gian chờ phải từ 0 đến 3600 giây, có thể nhập số thập phân.');
  if (typeof input.queries !== 'string' || input.queries.length > 50000) throw new Error('Danh sách từ khóa không hợp lệ hoặc quá dài.');
  return { count, delay, queries: input.queries };
}

async function finish(reason, error = false) {
  const { run } = await chrome.storage.local.get('run');
  if (!run) return;
  await chrome.storage.local.set({ run: { ...run, running: false, stopped: true, nextAt: null, reason, error } });
  await chrome.action.setBadgeText({ text: '' });
}

function ownsTab(sender, run) {
  return sender.tab?.id === run?.tabId && sender.frameId === 0 && isBing(sender.url || sender.tab?.url);
}

async function handle(message, sender) {
  const { run } = await chrome.storage.local.get('run');
  if (sender.tab) {
    if (!ownsTab(sender, run)) return { run: null };
    if (message.type === 'page') return { run };
    if (message.type === 'fail') {
      if (message.runId === run.id && !run.stopped) await finish(message.error || 'Không thể thao tác ô tìm kiếm Bing.', true);
      return {};
    }
    if (message.type !== 'claim') throw new Error('Yêu cầu trang không hợp lệ.');
    if (!run.running || message.runId !== run.id || run.lastPageId === message.pageId || Date.now() < run.nextAt) return { task: null };
    const query = run.queue[run.done];
    const done = run.done + 1, running = done < run.count;
    // Reserve once per loaded document before allowing a click, so worker
    // suspension, duplicate timers and storage events cannot duplicate a query.
    await chrome.storage.local.set({ run: { ...run, done, running, lastPageId: message.pageId, nextAt: running ? Date.now() + run.delay * 1000 : null, lastQuery: query, reason: running ? '' : 'Đã gửi đủ lượt tìm kiếm.' } });
    await chrome.action.setBadgeBackgroundColor({ color: '#096b55' });
    await chrome.action.setBadgeText({ text: running ? String(done) : '' });
    return { task: { query, runId: run.id, done } };
  }
  if (message.type === 'get') return await chrome.storage.local.get(['settings', 'run']);
  if (message.type === 'stop') { await finish('Đã dừng theo yêu cầu.'); return {}; }
  if (message.type !== 'start') throw new Error('Yêu cầu không hợp lệ.');
  if (run?.running) throw new Error('Một phiên đang chạy. Hãy dừng phiên đó trước.');
  const settings = validate(message.settings);
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !isBing(tab.pendingUrl || tab.url)) throw new Error('Hãy mở và chọn tab https://www.bing.com trước khi bắt đầu.');
  const queue = makeQueue(settings);
  await chrome.storage.local.set({ settings, run: { count: settings.count, delay: settings.delay, id: crypto.randomUUID(), queue, tabId: tab.id, done: 0, running: true, stopped: false, nextAt: Date.now(), lastPageId: null, lastQuery: '', reason: '', error: false } });
  try {
    // Also inject into tabs that were open before the extension was installed.
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
  } catch {
    await finish('Không thể truy cập trang Bing. Tải lại trang Bing rồi thử lại.', true);
    throw new Error('Không thể truy cập trang Bing. Tải lại trang Bing rồi thử lại.');
  }
  return {};
}

let serial = Promise.resolve();
function enqueue(job) {
  const result = serial.then(job);
  serial = result.catch(() => {});
  return result;
}
function eventJob(job) {
  enqueue(job).catch(() => finish('Có lỗi khi chạy. Hãy thử lại.', true).catch(() => {}));
}
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (sender.id !== chrome.runtime.id) return false;
  enqueue(() => handle(message, sender)).then(data => reply({ ok: true, ...data }), error => reply({ ok: false, error: error.message }));
  return true;
});
chrome.tabs.onRemoved.addListener(tabId => eventJob(async () => {
  const { run } = await chrome.storage.local.get('run');
  if (run?.running && run.tabId === tabId) await finish('Tab Bing đã đóng.');
}));
chrome.tabs.onUpdated.addListener((tabId, change) => {
  if (!change.url || isBing(change.url)) return;
  eventJob(async () => {
    const { run } = await chrome.storage.local.get('run');
    if (run?.running && run.tabId === tabId) await finish('Tab tìm kiếm đã rời trang Bing.');
  });
});
chrome.runtime.onStartup.addListener(() => eventJob(() => finish('Trình duyệt vừa khởi động lại. Bấm Bắt đầu để chạy phiên mới.')));
chrome.runtime.onInstalled.addListener(() => eventJob(async () => {
  const { settings } = await chrome.storage.local.get('settings');
  if (!settings) await chrome.storage.local.set({ settings: DEFAULTS });
  await finish('Extension đã được cập nhật.');
}));
