const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const read = name => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');
function setup() {
  const data = {}, injections = [];
  const tabs = new Map([[7, { id: 7, url: 'https://www.bing.com/' }]]);
  let active = 7;
  const event = () => ({ addListener(fn) { this.fn = fn; } });
  const chrome = {
    runtime: { id: 'test', onMessage: event(), onStartup: event(), onInstalled: event() },
    storage: { local: {
      async get(keys) { return Object.fromEntries([].concat(keys).map(key => [key, structuredClone(data[key])])); },
      async set(values) { Object.assign(data, structuredClone(values)); }
    } },
    action: { async setBadgeText() {}, async setBadgeBackgroundColor() {} },
    scripting: { async executeScript(options) { injections.push(options); } },
    tabs: { async query() { return [tabs.get(active)]; }, onRemoved: event(), onUpdated: event() }
  };
  const load = () => vm.runInNewContext(read('background.js'), { chrome, crypto, URL, Date, Math, Promise, Set, Number, Error });
  const message = (type, extra = {}, sender = { id: 'test' }) => new Promise(resolve => chrome.runtime.onMessage.fn({ type, ...extra }, sender, resolve));
  const page = (type, extra = {}, tabId = 7) => message(type, extra, { id: 'test', tab: tabs.get(tabId), frameId: 0, url: tabs.get(tabId)?.url });
  const claim = pageId => page('claim', { runId: data.run.id, pageId });
  load();
  return { data, injections, tabs, chrome, message, page, claim, load, select(id) { active = id; } };
}
const settings = { count: 3, delay: 0, queries: '' };
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
  h.data.run.nextAt = Date.now() - 1; assert.ok((await h.claim('b')).task);
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
