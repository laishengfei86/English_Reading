export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

let toastTimer = null;
export function toast(msg, ms = 2600) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function fmtTime(ms) {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function fmtDate(ts) {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 把句子切成可点击的词（保留标点） */
export function splitWordTokens(text) {
  return String(text || '').split(/(\s+)/).map((chunk) => {
    if (!chunk.trim()) return { space: true, raw: chunk };
    const m = chunk.match(/^([^A-Za-z0-9]*)([A-Za-z0-9''\-.]*?)([^A-Za-z0-9]*)$/);
    return { space: false, raw: chunk, pre: m?.[1] || '', word: m?.[2] || chunk, post: m?.[3] || '' };
  });
}

export function scoreClass(score, status) {
  if (status === 'missing') return 'missing';
  if (status === 'extra') return 'extra';
  if (score >= 85) return 'good';
  if (score >= 66) return 'warn';
  return 'bad';
}

export function scoreColor(score) {
  const cs = getComputedStyle(document.documentElement);
  if (score >= 85) return cs.getPropertyValue('--good').trim() || '#16a34a';
  if (score >= 66) return cs.getPropertyValue('--warn').trim() || '#f59e0b';
  return cs.getPropertyValue('--bad').trim() || '#dc2626';
}

/** 归一化英文文本为词数组：去标点、小写、折叠空白（保留撇号/连字符） */
export function normalizeWords(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9'\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
}

/** 经典 Levenshtein 编辑距离（字符串） */
export function levenshtein(a, b) {
  a = String(a); b = String(b);
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = new Array(n + 1);
  let cur = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, cur] = [cur, prev];
  }
  return prev[n];
}

/** 单词级拼写相似度 0~1（用于听写判分） */
export function wordSimilarity(a, b) {
  a = String(a).trim(); b = String(b).trim();
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const d = levenshtein(a, b);
  return 1 - d / Math.max(a.length, b.length);
}
