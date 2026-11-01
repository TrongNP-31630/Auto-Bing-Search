const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
function setup() {
  const data = {}, injections = [], visits = new Map(), deleted = [];
  const tabs = new Map([[7, { id: 7, url: 'https://www.bing.com/' }]]);
  let active = 7;
  let now = Date.now(), nextTimer = 0;
  const timers = new Map();
  class Clock extends Date { static now() { return now; } }
  const event = () => ({ addListener(fn) { this.fn = fn; } });
  const chrome = {
    runtime: { id: 'test', onMessage: event(), onStartup: event(), onInstalled: event() },
    storage: { local: {
      async get(keys) { return Object.fromEntries([].concat(keys).map(key => [key, structuredClone(data[key])])); },
      async set(values) { Object.assign(data, structuredClone(values)); }
    } },
    action: { async setBadgeText() {}, async setBadgeBackgroundColor() {} },
    scripting: { async executeScript(options) { injections.push(options); } },
    history: { onVisited: event(), async getVisits({ url }) { return structuredClone(visits.get(url) || []); }, async deleteUrl({ url }) { deleted.push(url); visits.delete(url); } },
    tabs: { async query() { return [tabs.get(active)]; }, onRemoved: event(), onUpdated: event() }
  };
  const load = () => vm.runInNewContext(read('background.js'), { chrome, crypto, URL, Date: Clock, Math, Promise, Set, Map, Number, Error,
    setTimeout(fn, ms) { const id = ++nextTimer; timers.set(id, { fn, at: now + ms }); return id; } });
  const message = (type, extra = {}, sender = { id: 'test' }) => new Promise(resolve => chrome.runtime.onMessage.fn({ type, ...extra }, sender, resolve));
  const page = (type, extra = {}, tabId = 7) => message(type, extra, { id: 'test', tab: tabs.get(tabId), frameId: 0, url: tabs.get(tabId)?.url });
  const claim = pageId => page('claim', { runId: data.run.id, pageId });
  const advance = async ms => {
    now += ms;
    for (const [id, timer] of [...timers]) {
      if (timer.at <= now) { timers.delete(id); timer.fn(); await message('get'); }
    }
  };
  load();
  return { data, injections, tabs, chrome, message, page, claim, load, visits, deleted, advance, select(id) { active = id; } };
}
const settings = { count: 3, delay: 0, queries: '' };
for (const mode of ['missing', 'throws']) test(`Android: ${mode} badge API cannot block the first search or stop`, async () => {
  const h = setup();
  if (mode === 'missing') delete h.chrome.action;
  else h.chrome.action.setBadgeText = async () => { throw Error('Not supported on Android'); };
  assert.equal((await h.message('start', { settings })).ok, true);
  assert.ok((await h.claim('a')).task);
  assert.equal((await h.message('stop')).ok, true);
  assert.equal(h.data.run.running, false);
});

test('Android: absent history API does not break worker initialization or searches', async () => {
  const h = setup(); delete h.chrome.history; h.load();
  assert.equal((await h.message('start', { settings })).ok, true);
  const { task } = await h.claim('a'); assert.ok(task);
  await h.page('page', { url: `https://www.bing.com/search?q=${encodeURIComponent(task.query)}` });
  assert.equal(h.data.run.running, true);
  assert.match(h.data.run.historyNote, /không hỗ trợ/);
  assert.ok((await h.claim('b')).task);
});

for (const mode of ['hidden-submit', 'keyboard-submit']) test(`Android: mobile search works with ${mode}`, async () => {
  const timers = []; let submitted = 0;
  class Input { set value(value) { this.text = value; } get value() { return this.text; } dispatchEvent() {} getClientRects() { return [{}]; } }
  const input = new Input();
  const hiddenSubmit = { type: 'submit', isConnected: true, getClientRects() { return []; }, click() { submitted++; } };
  input.form = { isConnected: true, querySelectorAll() { return mode === 'hidden-submit' ? [hiddenSubmit] : []; }, requestSubmit() { submitted++; } };
  let run = { id: 'mobile', running: true, nextAt: 0, done: 0 };
  const chrome = { storage: { onChanged: { addListener() {} } }, runtime: { async sendMessage(message) {
    if (message.type === 'page') return { ok: true, run };
    if (message.type === 'claim') {
      run = { ...run, done: 1, running: false };
      return { ok: true, task: { query: 'mobile search', runId: 'mobile', done: 1 } };
    }
    throw Error('Unexpected message: ' + message.type);
  } } };
  vm.runInNewContext(read('content.js'), { chrome, crypto, Date, HTMLInputElement: Input, HTMLTextAreaElement: class {}, Event: class {},
    location: { href: 'https://www.bing.com/' }, addEventListener() {}, setInterval() {},
    document: { querySelectorAll() { return [input]; } }, setTimeout(fn) { timers.push(fn); return timers.length; }, clearTimeout() {} });
  await new Promise(setImmediate); await timers[0]();
  assert.equal(input.value, 'mobile search'); assert.equal(submitted, 1);
});
test('waits the full five seconds and cleans final search even after a new run starts', async () => {
  const h = setup(); await h.message('start', { settings: { ...settings, count: 1 } });
  const { task } = await h.claim('a');
  const url = `https://www.bing.com/search?q=${encodeURIComponent(task.query)}`;
  h.visits.set(url, [{ visitTime: h.data.run.lastIssuedAt, isLocal: true }]);
  await h.page('page', { url });
  await h.message('start', { settings: { ...settings, clearHistory: false } });
  await h.advance(4999); assert.equal(h.deleted.length, 0);
  await h.advance(1); assert.equal(h.deleted[0], url);
  assert.equal(h.data.run.running, true);
});

test('rechecks history at deletion time and preserves a visit added during the delay', async () => {
  const h = setup(); await h.message('start', { settings }); const { task } = await h.claim('a');
  const url = `https://www.bing.com/search?q=${encodeURIComponent(task.query)}`;
  const visit = { visitTime: h.data.run.lastIssuedAt, isLocal: true };
  h.visits.set(url, [visit]); await h.page('page', { url });
  await h.advance(4000); h.visits.set(url, [visit, { ...visit, visitTime: visit.visitTime + 4000 }]);
  await h.advance(1000);
  assert.equal(h.deleted.length, 0); assert.match(h.data.run.historyNote, /Giữ lịch sử/);
});

test('restores pending cleanup deadline after worker reload without deleting early', async () => {
  const h = setup(); await h.message('start', { settings }); const { task } = await h.claim('a');
  const url = `https://www.bing.com/search?q=${encodeURIComponent(task.query)}`;
  h.visits.set(url, [{ visitTime: h.data.run.lastIssuedAt, isLocal: true }]);
  await h.page('page', { url }); await h.advance(2000); h.load(); await h.message('get');
  await h.advance(2999); assert.equal(h.deleted.length, 0);
  await h.advance(1); assert.equal(h.deleted.length, 1);
});

test('cleans each generated search including final search; duplicate events do not erase later manual visits', async () => {
  const h = setup(); await h.message('start', { settings });
  for (let i = 0; i < 3; i++) {
    const { task } = await h.claim(`page-${i}`);
    const url = `https://www.bing.com/search?q=${encodeURIComponent(task.query)}`;
    h.visits.set(url, [{ visitTime: h.data.run.lastIssuedAt, isLocal: true }]);
    h.tabs.get(7).url = url;
    h.chrome.tabs.onUpdated.fn(7, { url }); await h.message('get');
    assert.equal(h.deleted.length, i);
    await h.advance(5000);
    assert.equal(h.deleted.length, i + 1);
    h.visits.set(url, [{ visitTime: Date.now(), isLocal: true }]);
    h.chrome.history.onVisited.fn({ url }); await h.page('page', { url });
    assert.equal(h.deleted.length, i + 1);
    assert.ok(h.visits.has(url), 'subsequent manual visit was removed');
  }
  assert.equal(h.data.run.running, false);
});

test('preserves URLs with older, synced, multiple or unknown visits', async () => {
  for (const kind of ['old', 'synced', 'multiple', 'unknown']) {
    const h = setup(); await h.message('start', { settings }); const { task } = await h.claim('a');
    const url = `https://www.bing.com/search?q=${encodeURIComponent(task.query)}`;
    const current = { visitTime: h.data.run.lastIssuedAt, isLocal: true };
    const list = kind === 'old' ? [{ ...current, visitTime: current.visitTime - 10000 }]
      : kind === 'synced' ? [{ ...current, isLocal: false }]
      : kind === 'multiple' ? [current, current] : [{ isLocal: true }];
    h.visits.set(url, list); await h.page('page', { url }); await h.advance(5000);
    assert.equal(h.deleted.length, 0, kind);
    assert.match(h.data.run.historyNote, /Giữ lịch sử/);
  }
});

test('retries when history is written after navigation; ignores unrelated URLs, tabs and disabled cleanup', async () => {
  const h = setup(); await h.message('start', { settings }); const { task } = await h.claim('a');
  const url = `https://www.bing.com/search?q=${encodeURIComponent(task.query)}`;
  await h.page('page', { url });
  await h.advance(5000);
  assert.equal(h.deleted.length, 0);
  h.visits.set(url, [{ visitTime: h.data.run.lastIssuedAt, isLocal: true }]);
  h.chrome.history.onVisited.fn({ url }); await h.message('get'); assert.equal(h.deleted.length, 1);
  await h.claim('b');
  const other = `https://www.bing.com/search?q=${encodeURIComponent(h.data.run.lastQuery)}`;
  h.visits.set(other, [{ visitTime: h.data.run.lastIssuedAt, isLocal: true }]);
  h.chrome.tabs.onUpdated.fn(99, { url: other }); await h.message('get');
  await h.page('page', { url: 'https://www.bing.com/search?q=unrelated' });
  assert.equal(h.deleted.length, 1);
  await h.message('stop'); await h.message('start', { settings: { ...settings, clearHistory: false } });
  const next = (await h.claim('c')).task;
  const nextUrl = `https://www.bing.com/search?q=${encodeURIComponent(next.query)}`;
  h.visits.set(nextUrl, [{ visitTime: h.data.run.lastIssuedAt, isLocal: true }]);
  await h.page('page', { url: nextUrl }); assert.equal(h.deleted.length, 1);
});

test('history permission failures do not stop the search run', async () => {
  const h = setup(); await h.message('start', { settings }); const { task } = await h.claim('a');
  h.chrome.history.getVisits = async () => { throw Error('denied'); };
  const url = `https://www.bing.com/search?q=${encodeURIComponent(task.query)}`;
  await h.page('page', { url });
  await h.advance(5000);
  assert.equal(h.data.run.running, true);
  assert.match(h.data.run.historyNote, /Chưa xóa được/);
  assert.ok((await h.claim('b')).task);
});
test('generates 200 unique random word combinations and a fresh set for each run', async () => {
  const h = setup();
  await h.message('start', { settings: { ...settings, count: 200 } });
  const first = h.data.run.queue;
  assert.equal(first.length, 200); assert.equal(new Set(first).size, 200);
  assert.ok(first.every(query => query.split(' ').length >= 2 && query.split(' ').length <= 5));
  assert.ok(new Set(first.map(query => query.split(' ').length)).size > 1);
  await h.message('stop'); await h.message('start', { settings: { ...settings, count: 200 } });
  assert.notDeepEqual(h.data.run.queue, first);
});
test('continues in original tab after switching and finishes at exact count', async () => {
  const h = setup(); assert.equal((await h.message('start', { settings })).ok, true);
  assert.equal(h.injections[0].target.tabId, 7);
  h.tabs.set(9, { id: 9, url: 'https://www.bing.com/' }); h.select(9);
  assert.equal((await h.page('page', {}, 9)).run, null);
  const queries = [];
  for (const id of ['a', 'b', 'c']) queries.push((await h.claim(id)).task.query);
  assert.equal(new Set(queries).size, 3);
  assert.equal(h.data.run.done, 3); assert.equal(h.data.run.running, false);
  assert.equal((await h.claim('d')).task, null);
});
test('prevents duplicate documents, concurrent starts and claims after stop', async () => {
  const h = setup(); await h.message('start', { settings });
  assert.equal((await h.message('start', { settings })).ok, false);
  const results = await Promise.all([h.claim('a'), h.claim('a')]);
  assert.equal(results.filter(r => r.task).length, 1);
  await h.message('stop'); assert.equal((await h.claim('b')).task, null);
});
test('accepts fractional and zero delays, rejects negative and invalid configuration', async () => {
  const h = setup();
  for (const invalid of [{ ...settings, delay: -1 }, { ...settings, delay: Infinity }, { ...settings, count: 201 }, { ...settings, count: 1.5 }, { ...settings, queries: 'a\na\nb' }]) {
    assert.equal((await h.message('start', { settings: invalid })).ok, false);
  }
  assert.equal((await h.message('start', { settings: { ...settings, delay: 0.5 } })).ok, true);
  await h.claim('a'); assert.equal((await h.claim('b')).task, null);
  await h.advance(500); assert.ok((await h.claim('b')).task);
});
test('keeps plain custom text intact and completes a single search', async () => {
  const h = setup(); await h.message('start', { settings: { count: 1, delay: 0, queries: 'cà phê & sách #1' } });
  assert.equal((await h.claim('a')).task.query, 'cà phê & sách #1'); assert.equal(h.data.run.running, false);
});
test('stops on target closure or navigation, ignores unrelated tab closure', async () => {
  const h = setup(); await h.message('start', { settings });
  h.chrome.tabs.onRemoved.fn(99); await h.message('get'); assert.equal(h.data.run.running, true);
  h.chrome.tabs.onUpdated.fn(7, { url: 'https://example.com/' }); await h.message('get'); assert.equal(h.data.run.running, false);
  await h.message('start', { settings }); h.chrome.tabs.onRemoved.fn(7); await h.message('get'); assert.equal(h.data.run.running, false);
});
test('worker reload keeps progress; browser startup stops the run', async () => {
  const h = setup(); await h.message('start', { settings }); await h.claim('a'); h.load();
  assert.equal((await h.claim('a')).task, null); assert.ok((await h.claim('b')).task);
  h.chrome.runtime.onStartup.fn(); await h.message('get'); assert.equal(h.data.run.running, false);
});
test('old session errors and errors after stop cannot override current state', async () => {
  const h = setup(); await h.message('start', { settings }); const oldId = h.data.run.id;
  await h.message('stop'); await h.message('start', { settings });
  await h.page('fail', { runId: oldId, error: 'old' }); assert.equal(h.data.run.running, true);
  await h.page('fail', { runId: h.data.run.id, error: 'missing controls' }); assert.equal(h.data.run.error, true);
  await h.message('start', { settings }); await h.message('stop');
  await h.page('fail', { runId: h.data.run.id, error: 'late' }); assert.equal(h.data.run.error, false);
});
test('rejects incorrect Bing host and handles denied page access', async () => {
  const h = setup(); h.tabs.get(7).url = 'https://www.bing.com.example.com/';
  assert.equal((await h.message('start', { settings })).ok, false);
  h.tabs.get(7).url = 'https://www.bing.com/'; h.chrome.scripting.executeScript = async () => { throw Error('denied'); };
  assert.equal((await h.message('start', { settings })).ok, false); assert.equal(h.data.run.running, false);
});
for (const stopped of [false, true]) test(`content fills input and ${stopped ? 'cancels after stop' : 'clicks Bing button'}`, async () => {
  const events = [], timers = []; let clicks = 0;
  class Input {
    set value(v) { this.text = v; } get value() { return this.text; }
    dispatchEvent(e) { events.push(e.type); } getClientRects() { return [{}]; }
  }
  const input = new Input(), button = { getClientRects() { return [{}]; }, isConnected: true, click() { clicks++; } };
  input.form = { querySelectorAll() { return [button]; } };
  let current = { id: 'run', running: true, nextAt: 0, done: 0 };
  const chrome = { storage: { onChanged: { addListener() {} } }, runtime: { async sendMessage(message) {
    if (message.type === 'page') return { ok: true, run: current };
    if (message.type === 'claim') {
      current = { ...current, done: 1, running: false, stopped };
      return { ok: true, task: { query: 'cà phê & sách', runId: 'run', done: 1 } };
    }
    throw Error('Unexpected message');
  } } };
  vm.runInNewContext(read('content.js'), { chrome, crypto, HTMLInputElement: Input, HTMLTextAreaElement: class {}, Event: class { constructor(type) { this.type = type; } }, Date,
    location: { href: 'https://www.bing.com/' }, addEventListener() {}, setInterval() {},
    document: { querySelectorAll() { return [input]; } },
    setTimeout(fn) { timers.push(fn); return timers.length; }, clearTimeout() {} });
  await new Promise(setImmediate); assert.equal(timers.length, 1); await timers[0]();
  assert.equal(input.value, 'cà phê & sách'); assert.deepEqual(events, ['input', 'change']);
  assert.equal(clicks, stopped ? 0 : 1);
});

for (const mode of ['same-document', 'full-navigation']) test(`regression: five real content/worker cycles with ${mode} results and a hidden submit control`, async () => {
  const h = setup();
  await h.message('start', { settings: { count: 5, delay: 0, queries: '' } });
  h.tabs.set(9, { id: 9, url: 'https://example.com/' }); h.select(9);
  const clickedQueries = [];
  function newDocument() {
    const timers = new Map(), intervals = [];
    let nextTimer = 0, destination;
    const location = { href: h.tabs.get(7).url };
    class Input {
      set value(value) { this.text = value; } get value() { return this.text; }
      dispatchEvent() {} getClientRects() { return [{}]; }
    }
    const input = new Input();
    const hidden = { getClientRects() { return []; } };
    const button = { isConnected: true, getClientRects() { return [{}]; }, click() {
      clickedQueries.push(input.value);
      destination = `https://www.bing.com/search?q=${encodeURIComponent(input.value)}`;
    } };
    input.form = { querySelectorAll() { return [hidden, button]; } };
    const chrome = { storage: { onChanged: { addListener() {} } }, runtime: { sendMessage(message) {
      const { type, ...extra } = message; return h.page(type, extra);
    } } };
    vm.runInNewContext(read('content.js'), {
      chrome, crypto, Date, location, addEventListener() {}, HTMLInputElement: Input, HTMLTextAreaElement: class {}, Event: class {},
      document: { querySelectorAll() { return [input]; } },
      setTimeout(fn, ms) { const id = ++nextTimer; timers.set(id, { fn, ms }); return id; },
      clearTimeout(id) { timers.delete(id); }, setInterval(fn) { intervals.push(fn); }
    });
    return { timers, intervals, location, get destination() { return destination; } };
  }
  let doc = newDocument();
  for (let i = 0; i < 5; i++) {
    await new Promise(setImmediate);
    const entry = [...doc.timers].find(([, timer]) => timer.ms === 0);
    assert.ok(entry, `missing next search timer for cycle ${i + 1}`);
    doc.timers.delete(entry[0]); await entry[1].fn(); await new Promise(setImmediate);
    assert.equal(clickedQueries.length, i + 1);
    h.tabs.get(7).url = doc.destination;
    if (mode === 'full-navigation') doc = newDocument();
    else {
      // pushState itself does not fire popstate. The URL observer must recover.
      doc.location.href = doc.destination; doc.intervals[0]();
      await new Promise(setImmediate);
      assert.ok(![...doc.timers.values()].some(timer => timer.ms === 20000), 'stale navigation watchdog was not cancelled');
    }
  }
  assert.equal(new Set(clickedQueries).size, 5);
  assert.equal(h.data.run.done, 5); assert.equal(h.data.run.running, false); assert.equal(h.data.run.error, false);
});
