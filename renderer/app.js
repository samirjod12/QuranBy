import * as pdfjsLib from '../node_modules/pdfjs-dist/build/pdf.min.mjs';
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('../node_modules/pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;

const CDN = 'https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/';
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};
const fmtSize = (b) => (!b ? '' : b < 1048576 ? Math.max(1, Math.round(b / 1024)) + ' KB' : (b / 1048576).toFixed(1) + ' MB');
const cleanErr = (e) => String(e?.message || e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2800); }

/* ---------------- settings ---------------- */
const DEF = {
  versionName: 'Noor', theme: 'dark', accent: '#22c55e', bg: 'aurora', blur: 24, glass: 0.12, uiScale: 100,
  arFont: 'Traditional Arabic', arSize: 32, trSize: 18, showTr: true, showVn: true,
  arEdition: '', trEdition: '', zoom: 1, resume: true, catalogUrl: null,
  tab: 'theme', selectedTheme: '', lastHadith: '', hadithMode: 'list',
};
let S = { ...DEF, ...store.get('settings', {}) };
function applyLook() {
  const r = document.documentElement;
  const th = S.theme === 'auto' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : S.theme;
  r.dataset.theme = th; r.dataset.bg = S.bg;
  r.style.setProperty('--accent', S.accent);
  r.style.setProperty('--blur', S.blur + 'px');
  r.style.setProperty('--glass', S.glass);
  r.style.setProperty('--ar-size', S.arSize + 'px');
  r.style.setProperty('--tr-size', S.trSize + 'px');
  r.style.setProperty('--ar-font', `'${S.arFont}', 'Traditional Arabic', 'Segoe UI', serif`);
  r.style.fontSize = S.uiScale + '%';
}
const saveS = () => { store.set('settings', S); applyLook(); };

/* ---------------- library (themes / hadith PDFs) ---------------- */
let BUNDLED = { catalog: { themes: [], hadith: [] }, config: {} };
let APPV = '1.0.0';
let ITEMS = [];
let DL = new Set();
const progress = {};
const sizes = store.get('sizes', {});
const hashId = (url) => { let x = 5381; for (const c of url) x = ((x << 5) + x + c.charCodeAt(0)) >>> 0; return 'i' + x.toString(16); };
const effCatalogUrl = () => (S.catalogUrl ?? BUNDLED.config.catalogUrl ?? '').trim();

function buildItems() {
  const out = new Map();
  const add = (arr, type, src) => (arr || []).forEach((o) => {
    if (!o || !o.url || !o.title) return;
    const id = o.id || hashId(o.url);
    out.set(id, { id, type, src, title: o.title, url: o.url, thumb: o.thumb || '' });
  });
  add(BUNDLED.catalog.themes, 'theme', 'bundled'); add(BUNDLED.catalog.hadith, 'hadith', 'bundled');
  const rem = store.get('catalog:remote', null);
  if (rem) { add(rem.themes, 'theme', 'online'); add(rem.hadith, 'hadith', 'online'); }
  for (const u of store.get('userItems', [])) add([u], u.type, 'mine');
  ITEMS = [...out.values()];
}
async function refreshDL() { DL = new Set(await api.list()); }
async function refreshRemote(show) {
  const url = effCatalogUrl();
  if (!url) { if (show) toast('No catalog link set (optional).'); return; }
  try {
    const r = await fetch(url + (url.includes('?') ? '&' : '?') + 't=' + Date.now());
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    store.set('catalog:remote', { themes: j.themes || [], hadith: j.hadith || [] });
    buildItems();
    if (show) toast('Catalog updated');
  } catch (e) { if (show) toast('Catalog failed: ' + cleanErr(e)); }
}

async function makeThumb(id) {
  try {
    const data = await api.read(id);
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    const pg = await pdf.getPage(1);
    const vp0 = pg.getViewport({ scale: 1 });
    const vp = pg.getViewport({ scale: 420 / vp0.width });
    const cv = document.createElement('canvas'); cv.width = vp.width; cv.height = vp.height;
    await pg.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
    store.set('thumb:' + id, cv.toDataURL('image/jpeg', 0.72));
    pdf.destroy();
  } catch {}
}

function cardHtml(i) {
  const dl = DL.has(i.id), sel = i.type === 'theme' && S.selectedTheme === i.id, p = progress[i.id];
  const th = store.get('thumb:' + i.id, '') || i.thumb;
  const thumb = th ? `<img src="${esc(th)}" referrerpolicy="no-referrer" alt="">`
    : `<div class="ph"><b>${esc(i.title)}</b><span>Preview thumbnail here</span></div>`;
  let act;
  if (p) {
    const pc = p.total ? Math.round((p.got / p.total) * 100) : 0;
    act = `<div class="bar"><i style="width:${pc}%"></i></div><span class="size">${pc ? pc + '%' : 'Starting…'}</span>`;
  } else if (dl) {
    act = `<span class="state ok">Downloaded</span>` +
      (i.type === 'theme'
        ? (sel ? `<span class="state ok">Selected ✓</span>` : `<button class="btn sm pri" data-act="select">Select</button>`)
        : `<button class="btn sm pri" data-act="open">Read</button>`) +
      `<button class="btn sm" data-act="del" title="Delete download">🗑</button>`;
  } else {
    act = `<button class="btn sm pri" data-act="download">Download ⬇️</button><span class="size">${fmtSize(sizes[i.id])}</span>`;
  }
  return `<div class="card glass" data-id="${i.id}"><div class="thumb ${dl ? 'clickable' : ''}" ${dl ? 'data-act="open"' : ''}>${thumb}</div>
    <div class="ctitle">${esc(i.title)}</div><div class="cact">${act}</div></div>`;
}

function renderLibrary(type) {
  const items = ITEMS.filter((i) => i.type === type);
  const v = $('#view');
  if (!items.length) {
    v.innerHTML = `<div class="empty"><div style="font-size:3rem">${type === 'theme' ? '🎨' : '📚'}</div>
      <p><b>Nothing here yet.</b><br>Go to <b>Settings → Library</b> and paste a PDF link (or import a PDF from your computer). No code needed.</p>
      <button class="btn pri" data-go="settings">Open Settings</button></div>`;
    return;
  }
  v.innerHTML = `<div class="grid">${items.map(cardHtml).join('')}</div>`;
  items.forEach(async (i) => {
    if (!DL.has(i.id) && sizes[i.id] === undefined) {
      sizes[i.id] = await api.size(i.url); store.set('sizes', sizes);
      const c = $(`.card[data-id="${i.id}"] .size`); if (c && !progress[i.id]) c.textContent = fmtSize(sizes[i.id]);
    }
  });
}

async function download(id) {
  const i = ITEMS.find((x) => x.id === id); if (!i) return;
  progress[id] = { got: 0, total: 0 }; rerender();
  try {
    await api.download(id, i.url);
    await refreshDL(); await makeThumb(id);
    if (i.type === 'theme' && !S.selectedTheme) { S.selectedTheme = id; saveS(); }
    toast('Downloaded ✓');
  } catch (e) { toast('Download failed: ' + cleanErr(e)); }
  delete progress[id]; rerender();
}

/* ---------------- PDF reader (remembers last position) ---------------- */
let CLEANUP = null;
const unmount = () => { try { CLEANUP && CLEANUP(); } catch {} CLEANUP = null; };

async function mountReader(container, item, { onBack } = {}) {
  container.classList.add('view-reader');
  container.innerHTML = '';
  const root = h(`<div class="reader"><div class="rbar glass">
      ${onBack ? '<button class="btn sm" data-b="back">← Books</button>' : ''}
      <div class="rt">${esc(item.title)}</div>
      <button class="btn sm" data-b="zo">−</button><span class="zl"></span><button class="btn sm" data-b="zi">+</button>
      <span>Page</span><input class="pg" type="number" min="1"><span class="tot"></span>
    </div><div class="rscroll"></div></div>`);
  container.append(root);
  const sc = $('.rscroll', root), pgIn = $('.pg', root), zl = $('.zl', root);
  let pdf, pageEls = [], io, scale = 1, alive = true, saveT = 0;
  const posKey = 'pos:' + item.id;

  try {
    const data = await api.read(item.id);
    pdf = await pdfjsLib.getDocument({ data }).promise;
  } catch (e) { sc.innerHTML = `<div class="empty">Could not open this PDF.<br>${esc(cleanErr(e))}</div>`; return; }
  $('.tot', root).textContent = '/ ' + pdf.numPages; pgIn.max = pdf.numPages;

  async function render(n) {
    const d = pageEls[n - 1];
    if (!d || d.dataset.done === '1' || d.dataset.busy === '1') return;
    d.dataset.busy = '1';
    try {
      const pg = await pdf.getPage(n); const vp = pg.getViewport({ scale });
      if (!alive) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cv = document.createElement('canvas');
      cv.width = Math.floor(vp.width * dpr); cv.height = Math.floor(vp.height * dpr);
      cv.style.width = vp.width + 'px'; cv.style.height = vp.height + 'px';
      await pg.render({ canvasContext: cv.getContext('2d'), viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined }).promise;
      d.style.width = vp.width + 'px'; d.style.height = vp.height + 'px';
      d.replaceChildren(cv); d.dataset.done = '1';
    } catch {} finally { d.dataset.busy = '0'; }
  }
  const release = (n) => { const d = pageEls[n - 1]; if (d && d.dataset.done === '1') { d.replaceChildren(); d.dataset.done = '0'; } };

  function curPos() {
    const y = sc.scrollTop + 12; let lo = 0, hi = pageEls.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (pageEls[m].offsetTop <= y) lo = m; else hi = m - 1; }
    const d = pageEls[lo];
    return { page: lo + 1, frac: Math.max(0, Math.min(1, (y - d.offsetTop) / (d.offsetHeight || 1))) };
  }
  function goTo(page, frac = 0) {
    const d = pageEls[Math.min(Math.max(page, 1), pageEls.length) - 1]; if (!d) return;
    sc.scrollTop = d.offsetTop + frac * d.offsetHeight - 12;
  }
  async function build(pos) {
    io && io.disconnect(); sc.innerHTML = ''; pageEls = [];
    const p1 = await pdf.getPage(1); const base = p1.getViewport({ scale: 1 });
    scale = Math.max(0.2, ((sc.clientWidth - 28) / base.width) * S.zoom);
    zl.textContent = Math.round(S.zoom * 100) + '%';
    for (let n = 1; n <= pdf.numPages; n++) {
      const d = document.createElement('div'); d.className = 'page'; d.dataset.n = n;
      d.style.width = base.width * scale + 'px'; d.style.height = base.height * scale + 'px';
      sc.append(d); pageEls.push(d);
    }
    io = new IntersectionObserver((es) => es.forEach((e) => { const n = +e.target.dataset.n; e.isIntersecting ? render(n) : release(n); }),
      { root: sc, rootMargin: '900px 0px' });
    pageEls.forEach((d) => io.observe(d));
    if (pos) { goTo(pos.page, pos.frac); setTimeout(() => alive && goTo(pos.page, pos.frac), 350); }
  }
  const savePos = () => { const p = curPos(); pgIn.value = p.page; if (S.resume) store.set(posKey, p); };
  sc.addEventListener('scroll', () => { clearTimeout(saveT); saveT = setTimeout(savePos, 200); });
  pgIn.addEventListener('change', () => { goTo(+pgIn.value || 1); setTimeout(savePos, 300); });
  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-b]')?.dataset.b; if (!b) return;
    if (b === 'back') return onBack();
    const p = curPos();
    S.zoom = Math.min(3, Math.max(0.5, +(S.zoom + (b === 'zi' ? 0.1 : -0.1)).toFixed(2))); saveS();
    await build(p);
  });

  const saved = S.resume ? store.get(posKey, null) : null;
  await build(saved);
  pgIn.value = saved ? saved.page : 1;
  if (saved && saved.page > 1) toast(`Resumed at page ${saved.page}`);
  CLEANUP = () => { alive = false; clearTimeout(saveT); if (S.resume && pageEls.length) store.set(posKey, curPos()); io && io.disconnect(); pdf.destroy(); container.classList.remove('view-reader'); };
}

function renderQuranRead() {
  const v = $('#view');
  const item = ITEMS.find((i) => i.id === S.selectedTheme && DL.has(i.id)) || ITEMS.find((i) => i.type === 'theme' && DL.has(i.id));
  if (!item) {
    v.innerHTML = `<div class="empty"><div style="font-size:3rem">📖</div><p><b>No Quran PDF selected.</b><br>Download a Quran theme first, then it opens here and remembers where you stopped.</p><button class="btn pri" data-go="theme">Choose a Quran theme</button></div>`;
    return;
  }
  mountReader(v, item);
}

function renderHadithRead() {
  const v = $('#view');
  const books = ITEMS.filter((i) => i.type === 'hadith' && DL.has(i.id));
  if (!books.length) {
    v.innerHTML = `<div class="empty"><div style="font-size:3rem">📜</div><p><b>No Hadith book downloaded.</b><br>Download one from the Hadith Books tab.</p><button class="btn pri" data-go="hadithbooks">Open Hadith Books</button></div>`;
    return;
  }
  const openId = S.hadithMode === 'read' ? S.lastHadith : '';
  const cur = books.find((b) => b.id === openId);
  if (cur) return mountReader(v, cur, { onBack: () => { S.hadithMode = 'list'; saveS(); go('hadithread'); } });
  const last = books.find((b) => b.id === S.lastHadith);
  const pos = last && store.get('pos:' + last.id, null);
  v.innerHTML = `<div class="set">
    ${last ? `<div class="glass sec"><h3>Continue reading</h3><div class="row"><label>${esc(last.title)}<small>${pos ? 'Page ' + pos.page : 'Not started'}</small></label><button class="btn pri" data-open="${last.id}">Continue</button></div></div>` : ''}
    <div class="glass sec"><h3>Your Hadith books</h3>${books.map((b) => { const p = store.get('pos:' + b.id, null);
      return `<div class="row"><label>${esc(b.title)}<small>${p ? 'Last page ' + p.page : ''}</small></label><button class="btn sm" data-open="${b.id}">Read</button></div>`; }).join('')}</div></div>`;
}

/* ---------------- Text Quran (fawazahmed0/quran-api) ---------------- */
const T = { editions: null, names: null, cache: new Map(), full: new Map(), surah: 1 };
async function getJSON(path) {
  for (const ext of ['.json', '.min.json']) {
    try { const r = await fetch(CDN + path + ext); if (r.ok) return await r.json(); } catch {}
  }
  throw new Error('Could not load ' + path + ' — check your internet connection');
}
async function loadMeta() {
  if (!T.editions) {
    let raw = store.get('editions:cache', null);
    if (!raw) { raw = await getJSON('editions'); store.set('editions:cache', raw); }
    T.editions = (Array.isArray(raw) ? raw : Object.entries(raw).map(([k, v]) => ({ ...v, name: v.name || k })));
  }
  if (!T.names) {
    try {
      const info = await getJSON('info');
      const refs = info?.chapters?.references || info?.chapters || [];
      T.names = refs.map((r) => ({ en: r.englishname || r.name, ar: r.arabicname || '' }));
    } catch { T.names = []; }
  }
  const pick = (pre, pref) => T.editions.find((e) => e.name.startsWith(pref)) || T.editions.find((e) => e.name.startsWith(pre));
  if (!S.arEdition) S.arEdition = (pick('ara-', 'ara-quranuthmani') || {}).name || '';
  if (!S.trEdition) S.trEdition = (pick('eng-', 'eng-abdullahyusufal') || {}).name || '';
  saveS();
}
const sName = (n) => (T.names && T.names[n - 1] && T.names[n - 1].en) || 'Surah ' + n;
async function getChapter(ed, n) {
  const k = ed + '/' + n;
  if (!T.cache.has(k)) { const j = await getJSON(`editions/${ed}/${n}`); T.cache.set(k, j.chapter || []); }
  return T.cache.get(k);
}
const edDir = (ed) => (T.editions.find((e) => e.name === ed) || {}).direction === 'rtl' ? 'rtl' : 'ltr';
const norm = (s) => s.normalize('NFD').replace(/[ً-ٰٟۖ-ۭـ]/g, '').replace(/[إأآٱ]/g, 'ا').toLowerCase();
function editionOptions(sel) {
  const groups = {};
  T.editions.forEach((e) => (groups[e.language || 'Other'] ||= []).push(e));
  return Object.keys(groups).sort().map((l) => `<optgroup label="${esc(l)}">${groups[l].map((e) =>
    `<option value="${esc(e.name)}" ${e.name === sel ? 'selected' : ''}>${esc(e.author || e.name)}</option>`).join('')}</optgroup>`).join('');
}

async function renderText() {
  const v = $('#view');
  v.innerHTML = '<div class="loading">Loading Quran data…</div>';
  try { await loadMeta(); } catch (e) {
    v.innerHTML = `<div class="empty"><div style="font-size:3rem">📡</div><p><b>${esc(cleanErr(e))}</b></p><button class="btn pri" data-go="text">Retry</button></div>`; return;
  }
  v.innerHTML = `<div class="tq">
    <aside class="glass side"><input class="sf" placeholder="Filter surah…"><div class="slist"></div></aside>
    <section class="tmain"><div class="tbar glass">
      <select class="ea" title="Arabic edition">${editionOptions(S.arEdition)}</select>
      <label><input type="checkbox" class="st" ${S.showTr ? 'checked' : ''}> Translation</label>
      <select class="et" title="Translation edition">${editionOptions(S.trEdition)}</select>
      <input class="grow sq" placeholder="Search words in the Quran…"><button class="btn sm pri sb">Search</button>
    </div><div class="tscroll glass ${S.showVn ? '' : 'novn'}"></div></section></div>`;
  const list = $('.slist'), box = $('.tscroll');
  const drawList = (f = '') => {
    const q = norm(f);
    list.innerHTML = Array.from({ length: 114 }, (_, i) => i + 1).filter((n) => !q || norm(sName(n)).includes(q) || String(n) === q)
      .map((n) => `<div class="srow ${n === T.surah ? 'on' : ''}" data-s="${n}"><span class="n">${n}</span>${esc(sName(n))}<span class="a">${esc((T.names[n - 1]?.ar || '').replace('سورة', '').trim())}</span></div>`).join('');
  };
  drawList();
  $('.sf').oninput = (e) => drawList(e.target.value);
  list.onclick = (e) => { const r = e.target.closest('[data-s]'); if (r) loadSurah(+r.dataset.s, 1); };
  $('.ea').onchange = (e) => { S.arEdition = e.target.value; saveS(); loadSurah(T.surah, curVerse()); };
  $('.et').onchange = (e) => { S.trEdition = e.target.value; saveS(); loadSurah(T.surah, curVerse()); };
  $('.st').onchange = (e) => { S.showTr = e.target.checked; saveS(); loadSurah(T.surah, curVerse()); };
  const doSearch = () => search($('.sq').value.trim());
  $('.sb').onclick = doSearch; $('.sq').onkeydown = (e) => e.key === 'Enter' && doSearch();

  let st = 0;
  const curVerse = () => {
    const top = box.getBoundingClientRect().top + 8;
    for (const el of $$('.verse', box)) if (el.getBoundingClientRect().bottom > top) return +el.dataset.v;
    return 1;
  };
  box.addEventListener('scroll', () => { clearTimeout(st); st = setTimeout(() => { if (S.resume && $('.verse', box)) store.set('pos:text', { surah: T.surah, verse: curVerse() }); }, 200); });

  async function loadSurah(n, verse = 1, hit = false) {
    T.surah = n; $$('.srow', list).forEach((r) => r.classList.toggle('on', +r.dataset.s === n));
    box.innerHTML = '<div class="loading">Loading…</div>';
    try {
      const [ar, tr] = await Promise.all([
        S.arEdition ? getChapter(S.arEdition, n) : null,
        S.showTr && S.trEdition ? getChapter(S.trEdition, n) : null,
      ]);
      const am = new Map((ar || []).map((x) => [x.verse, x.text])), tm = new Map((tr || []).map((x) => [x.verse, x.text]));
      const vs = [...new Set([...am.keys(), ...tm.keys()])].sort((a, b) => a - b);
      const td = tr ? edDir(S.trEdition) : 'ltr', ad = edDir(S.arEdition);
      box.innerHTML = `<div class="shead"><div class="ar">${esc(T.names[n - 1]?.ar || '')}</div><div>${n}. ${esc(sName(n))} · ${vs.length} verses</div></div>` +
        vs.map((vn) => `<div class="verse" data-v="${vn}"><span class="vn">${vn}</span>
          ${am.has(vn) ? `<div class="ar" dir="${ad}">${esc(am.get(vn))}</div>` : ''}${tm.has(vn) ? `<div class="tr" dir="${td}">${esc(tm.get(vn))}</div>` : ''}</div>`).join('') +
        `<div class="nav2"><button class="btn" ${n > 1 ? '' : 'disabled'} data-n="${n - 1}">← ${n > 1 ? esc(sName(n - 1)) : ''}</button><button class="btn" ${n < 114 ? '' : 'disabled'} data-n="${n + 1}">${n < 114 ? esc(sName(n + 1)) : ''} →</button></div>`;
      $$('[data-n]', box).forEach((b) => (b.onclick = () => loadSurah(+b.dataset.n, 1)));
      const target = $(`.verse[data-v="${verse}"]`, box);
      if (target) { if (verse > 1) target.scrollIntoView({ block: 'start' }); if (hit) target.classList.add('hit'); } else box.scrollTop = 0;
      if (S.resume) store.set('pos:text', { surah: n, verse });
    } catch (e) { box.innerHTML = `<div class="loading">${esc(cleanErr(e))}</div>`; }
  }

  async function search(q) {
    if (q.length < 2) return toast('Type at least 2 letters');
    box.innerHTML = '<div class="loading">Searching…</div>';
    const eds = [S.arEdition, S.showTr ? S.trEdition : ''].filter(Boolean);
    try {
      const nq = norm(q), hits = new Map();
      for (const ed of eds) {
        if (!T.full.has(ed)) { const j = await getJSON('editions/' + ed); T.full.set(ed, j.quran || []); }
        for (const x of T.full.get(ed)) if (norm(x.text).includes(nq)) { const k = x.chapter + ':' + x.verse; if (!hits.has(k)) hits.set(k, { c: x.chapter, v: x.verse, t: x.text }); }
        if (hits.size > 200) break;
      }
      const arr = [...hits.values()].slice(0, 100);
      box.innerHTML = `<div class="shead">${hits.size} result${hits.size === 1 ? '' : 's'} for “${esc(q)}”${hits.size > 100 ? ' (showing 100)' : ''}</div>` +
        arr.map((r) => `<div class="res" data-c="${r.c}" data-v="${r.v}"><small>${esc(sName(r.c))} ${r.c}:${r.v}</small><div>${esc(r.t)}</div></div>`).join('');
      $$('.res', box).forEach((r) => (r.onclick = () => loadSurah(+r.dataset.c, +r.dataset.v, true)));
    } catch (e) { box.innerHTML = `<div class="loading">${esc(cleanErr(e))}</div>`; }
  }

  const p = S.resume ? store.get('pos:text', { surah: 1, verse: 1 }) : { surah: 1, verse: 1 };
  loadSurah(p.surah, p.verse);
  if (S.resume && p.verse > 1) toast(`Resumed at ${sName(p.surah)} ${p.surah}:${p.verse}`);
  const prev = CLEANUP;
  CLEANUP = () => { prev && prev(); if (S.resume && $('.verse', box)) store.set('pos:text', { surah: T.surah, verse: curVerse() }); };
}

/* ---------------- Settings ---------------- */
function renderSettings() {
  const v = $('#view');
  const opt = (arr, cur) => arr.map(([val, lab]) => `<option value="${val}" ${String(val) === String(cur) ? 'selected' : ''}>${lab}</option>`).join('');
  const row = (label, hint, ctl) => `<div class="row"><label>${label}${hint ? `<small>${hint}</small>` : ''}</label><div class="ctl">${ctl}</div></div>`;
  const rng = (k, min, max, step, unit = '') => `<input type="range" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${S[k]}"><span class="size">${S[k]}${unit}</span>`;
  const chk = (k) => `<input type="checkbox" data-k="${k}" ${S[k] ? 'checked' : ''}>`;
  v.innerHTML = `<div class="set">
  <div class="glass sec"><h3>QuranBy</h3>
    ${row('Version', 'App build', `<b>v${esc(APPV)}</b>`)}
    ${row('Version name', 'Give your build a name', `<input type="text" data-k="versionName" value="${esc(S.versionName)}" maxlength="30">`)}
  </div>
  <div class="glass sec"><h3>Appearance</h3>
    ${row('Theme', '', `<select data-k="theme">${opt([['dark', 'Dark'], ['light', 'Light'], ['auto', 'Follow Windows']], S.theme)}</select>`)}
    ${row('Accent colour', '', `<input type="color" data-k="accent" value="${S.accent}">`)}
    ${row('Background', '', `<select data-k="bg">${opt([['aurora', 'Aurora'], ['ocean', 'Ocean'], ['sunset', 'Sunset'], ['plain', 'Plain']], S.bg)}</select>`)}
    ${row('Glass blur', '', rng('blur', 0, 50, 1, 'px'))}
    ${row('Glass opacity', '', rng('glass', 0, 0.5, 0.01))}
    ${row('Interface size', '', rng('uiScale', 80, 130, 5, '%'))}
  </div>
  <div class="glass sec"><h3>Reading</h3>
    ${row('Remember where I stopped', 'Quran PDF, Hadith PDF and Text Quran', chk('resume'))}
    ${row('PDF zoom', 'Also changeable inside the reader', rng('zoom', 0.5, 3, 0.1, '×'))}
    ${row('Arabic font', 'Any font installed on Windows', `<input type="text" data-k="arFont" value="${esc(S.arFont)}">`)}
    ${row('Arabic text size', '', rng('arSize', 20, 64, 1, 'px'))}
    ${row('Translation text size', '', rng('trSize', 12, 32, 1, 'px'))}
    ${row('Show translation', '', chk('showTr'))}
    ${row('Show verse numbers', '', chk('showVn'))}
  </div>
  <div class="glass sec"><h3>Library — add Quran themes &amp; Hadith books (no code)</h3>
    <div class="row"><label>Add by link<small>Paste a direct PDF link, a Google Drive share link or a GitHub file link</small></label>
      <div class="ctl"><select id="al-type"><option value="theme">Quran theme</option><option value="hadith">Hadith book</option></select>
      <input type="text" id="al-title" placeholder="Name"><input type="text" id="al-url" placeholder="https://…pdf"><button class="btn pri sm" id="al-add">Add</button></div></div>
    <div class="row"><label>Import PDF from this computer</label><div class="ctl"><select id="im-type"><option value="theme">Quran theme</option><option value="hadith">Hadith book</option></select><button class="btn sm" id="im-go">Choose PDF…</button></div></div>
    <div class="row"><label>Online catalog link (optional)<small>Raw link to your catalog.json on GitHub. Edit that file on github.com and every app updates — no rebuild.</small></label>
      <div class="ctl"><input type="text" data-k="catalogUrl" value="${esc(effCatalogUrl())}" placeholder="https://raw.githubusercontent.com/you/repo/main/catalog.json"><button class="btn sm" id="cat-go">Update now</button></div></div>
    <div class="list">${ITEMS.map((i) => `<div class="li"><span class="tag">${i.type === 'theme' ? 'Quran' : 'Hadith'}</span><span class="t">${esc(i.title)}</span><span class="tag">${i.src}</span>${i.src === 'mine' ? `<button class="btn sm" data-rm="${i.id}">Remove</button>` : ''}</div>`).join('') || '<div class="size">Nothing yet.</div>'}</div>
  </div>
  <div class="glass sec"><h3>Data</h3>
    ${row('Forget saved reading positions', '', '<button class="btn sm" id="rst-pos">Clear</button>')}
    ${row('Reset all settings', '', '<button class="btn sm" id="rst-set">Reset</button>')}
    ${row('Text Quran source', 'Free API by fawazahmed0', '<button class="btn sm" id="api-link">GitHub</button>')}
  </div></div>`;
  $('#al-add').onclick = () => {
    const title = $('#al-title').value.trim(), url = $('#al-url').value.trim();
    if (!title || !/^https?:\/\//i.test(url)) return toast('Enter a name and a link starting with https://');
    const u = store.get('userItems', []); u.push({ type: $('#al-type').value, title, url }); store.set('userItems', u);
    buildItems(); toast('Added. Open the tab and press Download.'); renderSettings();
  };
  $('#im-go').onclick = async () => {
    const id = 'l' + Date.now().toString(36); const r = await api.pick(id); if (!r) return;
    const u = store.get('userItems', []); u.push({ id, type: $('#im-type').value, title: r.name, url: 'local://' + id }); store.set('userItems', u);
    buildItems(); await refreshDL(); await makeThumb(id);
    if ($('#im-type').value === 'theme' && !S.selectedTheme) { S.selectedTheme = id; saveS(); }
    toast('Imported ✓'); renderSettings();
  };
  $('#cat-go').onclick = async () => { await refreshRemote(true); renderSettings(); };
  $('#rst-pos').onclick = () => { Object.keys(localStorage).filter((k) => k.startsWith('pos:')).forEach((k) => store.del(k)); toast('Positions cleared'); };
  $('#rst-set').onclick = () => { S = { ...DEF }; saveS(); toast('Settings reset'); renderSettings(); };
  $('#api-link').onclick = () => api.openExternal('https://github.com/fawazahmed0/quran-api');
  v.onclick = async (e) => {
    const rm = e.target.closest('[data-rm]')?.dataset.rm; if (!rm) return;
    store.set('userItems', store.get('userItems', []).filter((x) => (x.id || hashId(x.url)) !== rm));
    await api.remove(rm); if (S.selectedTheme === rm) S.selectedTheme = ''; saveS(); buildItems(); await refreshDL(); renderSettings();
  };
  v.oninput = (e) => {
    const k = e.target.dataset?.k; if (!k) return;
    const t = e.target;
    S[k] = t.type === 'checkbox' ? t.checked : t.type === 'range' ? +t.value : t.value;
    if (k === 'catalogUrl') { store.set('settings', S); return; }
    saveS(); const lab = t.nextElementSibling; if (t.type === 'range' && lab) lab.textContent = S[k] + ({ blur: 'px', arSize: 'px', trSize: 'px', uiScale: '%', zoom: '×' }[k] || '');
  };
}

/* ---------------- tabs / router ---------------- */
const TABS = [
  { id: 'theme', ic: '🎨', label: 'Quran theme' }, { id: 'hadithbooks', ic: '📚', label: 'Hadith Books' },
  { id: 'quranread', ic: '📖', label: 'Quran Read' }, { id: 'hadithread', ic: '📜', label: 'Hadith read' },
  { id: 'text', ic: '🔤', label: 'Text Quran' }, { id: 'settings', ic: '⚙️', label: 'Settings' },
];
const VIEWS = { theme: () => renderLibrary('theme'), hadithbooks: () => renderLibrary('hadith'), quranread: renderQuranRead, hadithread: renderHadithRead, text: renderText, settings: renderSettings };
function go(tab) {
  unmount();
  const v = $('#view'); v.className = ''; v.onclick = null; v.oninput = null;
  S.tab = tab; store.set('settings', S);
  $$('.tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  VIEWS[tab]();
}
const rerender = () => { if (S.tab === 'theme' || S.tab === 'hadithbooks') { const y = $('#view').scrollTop; VIEWS[S.tab](); $('#view').scrollTop = y; } };

$('#tabs').innerHTML = TABS.map((t) => `<button class="tab" data-tab="${t.id}"><span class="ic">${t.ic}</span>${t.label}</button>`).join('');
$('#tabs').onclick = (e) => { const t = e.target.closest('.tab'); if (t) go(t.dataset.tab); };
$('#view').addEventListener('click', async (e) => {
  const g = e.target.closest('[data-go]'); if (g) return go(g.dataset.go);
  const op = e.target.closest('[data-open]'); if (op) { S.lastHadith = op.dataset.open; S.hadithMode = 'read'; saveS(); return go('hadithread'); }
  const a = e.target.closest('[data-act]'); const card = e.target.closest('.card'); if (!a || !card) return;
  const id = card.dataset.id, item = ITEMS.find((i) => i.id === id), act = a.dataset.act;
  if (act === 'download') download(id);
  else if (act === 'select') { S.selectedTheme = id; saveS(); rerender(); toast('Selected — open Quran Read'); }
  else if (act === 'open') {
    if (item.type === 'theme') { S.selectedTheme = id; saveS(); go('quranread'); } else { S.lastHadith = id; S.hadithMode = 'read'; saveS(); go('hadithread'); }
  } else if (act === 'del') {
    await api.remove(id); store.del('thumb:' + id); await refreshDL();
    if (S.selectedTheme === id) { S.selectedTheme = ''; saveS(); } rerender();
  }
});
api.onProgress(({ id, got, total }) => {
  progress[id] = { got, total };
  const c = $(`.card[data-id="${id}"]`); if (!c) return;
  const pc = total ? Math.round((got / total) * 100) : 0;
  const b = $('.bar i', c); if (b) b.style.width = pc + '%';
  const s = $('.size', c); if (s) s.textContent = pc ? pc + '%' : fmtSize(got);
});
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyLook);

(async () => {
  applyLook();
  const info = await api.info(); APPV = info.version; BUNDLED = info.bundled;
  buildItems(); await refreshDL(); applyLook();
  refreshRemote(false).then(() => rerender());
  if (S.tab === 'hadithread' && !S.resume) S.hadithMode = 'list';
  go(VIEWS[S.tab] ? S.tab : 'theme');
})();
