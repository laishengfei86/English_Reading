/**
 * SQLite 持久化层（node:sqlite，Node 22 内置，零 npm 依赖）。
 *
 * 表结构：
 *   users(uid PK, data TEXT, updated_at)            —— 每用户的进度/设置（整体存 JSON，避免大量字段映射）
 *   custom_texts(id PK, title, text, mode, created_at, updated_at)  —— 全局共享素材库（多设备可见）
 *
 * 对外导出 API 与旧 JSON 版完全一致：getUser / update / addRecord / saveSettings /
 * listCustomTexts / saveCustomText / deleteCustomText / updateCustomText / clearAll / getStats。
 *
 * 启动时会把旧 data/users/*.json 与 data/custom-texts.json 一次性迁移进 app.db（幂等）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from '../config.js';
import { hashPassword, verifyPassword } from './auth.js';

const DB_FILE = path.join(config.dataDir, 'app.db');
fs.mkdirSync(config.dataDir, { recursive: true });

const db = new DatabaseSync(DB_FILE);
// WAL：并发读友好、写串行但比 JSON rename 稳；busy_timeout 避免 SQLITE_BUSY 抖动
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA busy_timeout = 5000;');
db.exec(`CREATE TABLE IF NOT EXISTS users (
  uid TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);`);
db.exec(`CREATE TABLE IF NOT EXISTS custom_texts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  text TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'auto',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);`);
// 单词本（听写/练习错词累积，为 SRS 复习预热）。SM-2 简化字段先建好，复习队列 UI 后续接入。
db.exec(`CREATE TABLE IF NOT EXISTS wordbook (
  uid TEXT NOT NULL,
  word TEXT NOT NULL,
  ipa TEXT,
  zh TEXT,
  sentence TEXT,
  level_id TEXT,
  group_id TEXT,
  wrong INTEGER NOT NULL DEFAULT 1,
  due INTEGER NOT NULL,
  ease REAL NOT NULL DEFAULT 2.5,
  interval INTEGER NOT NULL DEFAULT 0,
  reps INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (uid, word)
);`);
// 账号表（多用户）。uid = 'u' + id，与 users 表分桶键对齐。
db.exec(`CREATE TABLE IF NOT EXISTS accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  pass_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at INTEGER NOT NULL
);`);

const MAX_RECORDS = 3000;
const VALID_MODES = ['auto', 'paragraph', 'whole'];
const safeUid = (uid) => String(uid || 'default').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48) || 'default';

function emptyUser(uid) {
  const now = Date.now();
  return {
    uid: safeUid(uid),
    createdAt: now,
    updatedAt: now,
    records: [],
    wordErrors: {},
    phonemeErrors: {},
    customTexts: [],
    settings: {},
  };
}

// 兼容前端字段：raw=text、splitMode=mode（library.js / progress.js 用得到）
function mapCustomRow(r) {
  return { id: r.id, title: r.title, text: r.text, raw: r.text, mode: r.mode, splitMode: r.mode, ts: r.created_at };
}

// ---------- 一次性迁移旧 JSON ----------
function migrateFromJson() {
  // 用户档
  const usersDir = path.join(config.dataDir, 'users');
  if (fs.existsSync(usersDir)) {
    let n = 0;
    for (const fn of fs.readdirSync(usersDir)) {
      if (!fn.endsWith('.json')) continue;
      const uid = fn.slice(0, -5);
      if (db.prepare('SELECT 1 FROM users WHERE uid = ?').get(uid)) continue;
      try {
        const data = JSON.parse(fs.readFileSync(path.join(usersDir, fn), 'utf8'));
        if (!data || typeof data !== 'object') continue;
        const u = { ...emptyUser(uid), ...data, uid };
        db.prepare('INSERT INTO users(uid, data, updated_at) VALUES(?, ?, ?)')
          .run(uid, JSON.stringify(u), u.updatedAt || Date.now());
        n += 1;
      } catch { /* 跳过损坏文件 */ }
    }
    if (n) console.log(`[store] 已迁移 ${n} 个用户档到 SQLite`);
  }
  // 全局自定义素材（旧 custom-texts.json）
  const cf = path.join(config.dataDir, 'custom-texts.json');
  if (fs.existsSync(cf)) {
    try {
      const arr = JSON.parse(fs.readFileSync(cf, 'utf8'));
      if (Array.isArray(arr) && arr.length) {
        const ins = db.prepare('INSERT OR IGNORE INTO custom_texts(id, title, text, mode, created_at, updated_at) VALUES(?, ?, ?, ?, ?, ?)');
        let n = 0;
        db.exec('BEGIN');
        for (const c of arr) {
          if (!c || !c.id) continue;
          if (db.prepare('SELECT 1 FROM custom_texts WHERE id = ?').get(c.id)) continue;
          ins.run(c.id, String(c.title || '').slice(0, 60), String(c.text || ''),
            VALID_MODES.includes(c.mode) ? c.mode : 'auto', c.ts || Date.now(), c.ts || Date.now());
          n += 1;
        }
        db.exec('COMMIT');
        if (n) console.log(`[store] 已迁移 ${n} 条自定义素材到 SQLite`);
      }
    } catch { /* 忽略损坏 */ }
  }
}
migrateFromJson();

// ---------- 用户档 ----------
const userCache = new Map();
const queues = new Map();

async function getUser(uid) {
  const key = safeUid(uid);
  if (userCache.has(key)) return userCache.get(key);
  const row = db.prepare('SELECT data FROM users WHERE uid = ?').get(key);
  let data = null;
  if (row) {
    try { data = JSON.parse(row.data); } catch { data = null; }
  }
  data = { ...emptyUser(key), ...(data || {}), uid: key };
  userCache.set(key, data);
  return data;
}

function persistUser(data) {
  data.updatedAt = Date.now();
  userCache.set(data.uid, data);
  db.prepare(`INSERT INTO users(uid, data, updated_at) VALUES(?, ?, ?)
    ON CONFLICT(uid) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`)
    .run(data.uid, JSON.stringify(data), data.updatedAt);
}

/** 串行化写入，避免并发覆盖（SQLITE 单写，叠加队列更稳） */
function enqueue(uid, fn) {
  const key = safeUid(uid);
  const prev = queues.get(key) || Promise.resolve();
  const next = prev.then(fn).catch((e) => {
    console.error('[store] 写入失败', e);
    throw e;
  });
  queues.set(key, next.catch(() => {}));
  return next;
}

export function update(uid, mutator) {
  return enqueue(uid, async () => {
    const data = await getUser(uid);
    const ret = await mutator(data);
    persistUser(data);
    return ret;
  });
}

export async function addRecord(uid, record) {
  return update(uid, (data) => {
    const rec = { id: `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, ts: Date.now(), ...record };
    data.records.push(rec);
    if (data.records.length > MAX_RECORDS) data.records = data.records.slice(-MAX_RECORDS);
    for (const w of rec.badWords || []) {
      const k = String(w).toLowerCase();
      if (!k) continue;
      data.wordErrors[k] = (data.wordErrors[k] || 0) + 1;
    }
    for (const p of rec.phonemes || []) {
      const k = String(p);
      if (!k) continue;
      data.phonemeErrors[k] = (data.phonemeErrors[k] || 0) + 1;
    }
    return rec;
  });
}

export async function saveSettings(uid, settings) {
  return update(uid, (data) => {
    data.settings = { ...data.settings, ...settings };
    return data.settings;
  });
}

export async function clearAll(uid) {
  return update(uid, (data) => {
    data.records = [];
    data.wordErrors = {};
    data.phonemeErrors = {};
    return true;
  });
}

// ---------- 自定义素材：全局共享 ----------
let customMem = null;
function invalidateCustom() { customMem = null; }

async function loadCustom() {
  if (customMem) return customMem;
  const rows = db.prepare('SELECT id, title, text, mode, created_at AS ts FROM custom_texts ORDER BY created_at DESC').all();
  customMem = rows.map(mapCustomRow);
  return customMem;
}

export async function listCustomTexts() {
  return loadCustom();
}

export async function saveCustomText(_uid, item) {
  const mode = VALID_MODES.includes(item?.mode) ? item.mode : 'auto';
  const id = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  const now = Date.now();
  const title = String(item?.title || '').slice(0, 60);
  const text = String(item?.text || '');
  db.prepare('INSERT INTO custom_texts(id, title, text, mode, created_at, updated_at) VALUES(?, ?, ?, ?, ?, ?)')
    .run(id, title, text, mode, now, now);
  invalidateCustom();
  return { id, ts: now, mode, title, text };
}

export async function deleteCustomText(_uid, id) {
  db.prepare('DELETE FROM custom_texts WHERE id = ?').run(id);
  invalidateCustom();
  return true;
}

/** 更新已保存素材（目前用于切朗读方式 mode，也可改 title/text） */
export async function updateCustomText(_uid, id, patch = {}) {
  const exists = db.prepare('SELECT 1 FROM custom_texts WHERE id = ?').get(id);
  if (!exists) {
    const e = Object.assign(new Error('素材不存在'), { status: 404 });
    throw e;
  }
  const sets = [];
  const vals = [];
  const mode = VALID_MODES.includes(patch?.mode) ? patch.mode : null;
  if (mode) { sets.push('mode = ?'); vals.push(mode); }
  if (typeof patch?.title === 'string') { sets.push('title = ?'); vals.push(patch.title.slice(0, 60)); }
  if (typeof patch?.text === 'string') { sets.push('text = ?'); vals.push(String(patch.text)); }
  sets.push('updated_at = ?');
  vals.push(Date.now());
  vals.push(id);
  db.prepare(`UPDATE custom_texts SET ${sets.join(', ')} WHERE id = ?`).run(...vals);
  invalidateCustom();
  const row = db.prepare('SELECT id, title, text, mode, created_at AS ts FROM custom_texts WHERE id = ?').get(id);
  return mapCustomRow(row);
}

// ---------- 单词本（听写错词） ----------
export async function recordWordMistake(uid, m = {}) {
  const u = safeUid(uid);
  const word = String(m.word || '').trim().toLowerCase();
  if (!word) return null;
  const now = Date.now();
  const ipa = String(m.ipa || '').slice(0, 40);
  const zh = String(m.zh || '').slice(0, 80);
  const sentence = String(m.sentence || '').slice(0, 400);
  const levelId = String(m.levelId || '').slice(0, 30);
  const groupId = String(m.groupId || '').slice(0, 40);
  db.prepare(`INSERT INTO wordbook(uid, word, ipa, zh, sentence, level_id, group_id, wrong, due, created_at, updated_at)
    VALUES(?,?,?,?,?,?,?,1,?,?,?)
    ON CONFLICT(uid, word) DO UPDATE SET
      wrong = wrong + 1, updated_at = excluded.updated_at,
      ipa = COALESCE(NULLIF(excluded.ipa,''), ipa),
      zh = COALESCE(NULLIF(excluded.zh,''), zh),
      sentence = COALESCE(NULLIF(excluded.sentence,''), sentence),
      group_id = COALESCE(NULLIF(excluded.group_id,''), group_id),
      level_id = COALESCE(NULLIF(excluded.level_id,''), level_id)`)
    .run(u, word, ipa, zh, sentence, levelId, groupId, now, now, now);
  return { word };
}

export async function listWordbook(uid) {
  const u = safeUid(uid);
  const rows = db.prepare('SELECT word, ipa, zh, sentence, wrong, due, interval, reps, created_at, updated_at FROM wordbook WHERE uid = ? ORDER BY wrong DESC, updated_at DESC')
    .all(u);
  return rows;
}

// SM-2 间隔重复调度。quality: 0~5（0=完全不会，5=完美）。返回更新后的调度信息。
export async function reviewWordbook(uid, word, quality) {
  const u = safeUid(uid);
  const w = String(word || '').trim().toLowerCase();
  if (!w) return null;
  const row = db.prepare('SELECT ease, interval, reps FROM wordbook WHERE uid = ? AND word = ?').get(u, w);
  if (!row) return null;
  const q = Math.max(0, Math.min(5, Math.round(quality)));
  let ease = row.ease, interval = row.interval, reps = row.reps;
  const now = Date.now();
  if (q < 3) {
    reps = 0;
    interval = 1;
  } else {
    if (reps === 0) interval = 1;
    else if (reps === 1) interval = 6;
    else interval = Math.round(interval * ease);
    reps += 1;
  }
  ease = Math.max(1.3, ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  const due = now + interval * 86400000;
  db.prepare('UPDATE wordbook SET ease = ?, interval = ?, reps = ?, due = ?, updated_at = ? WHERE uid = ? AND word = ?')
    .run(ease, interval, reps, due, now, u, w);
  return { word: w, interval, reps, due, ease };
}

export async function deleteWord(uid, word) {
  const u = safeUid(uid);
  const w = String(word || '').trim().toLowerCase();
  db.prepare('DELETE FROM wordbook WHERE uid = ? AND word = ?').run(u, w);
  return { ok: true };
}

// ---------- 账号（多用户） ----------
export async function createAccount(username, password) {
  const u = String(username || '').trim().toLowerCase();
  // \p{L} 含中文等所有字母、\p{N} 含各种数字；额外允许 . _ -。注意 username 会转小写再做唯一键。
  if (!/^[\p{L}\p{N}_.-]{3,30}$/u.test(u)) throw Object.assign(new Error('用户名需 3-30 位（支持中文、字母、数字、._-）'), { status: 400 });
  if (String(password || '').length < 6) throw Object.assign(new Error('密码至少 6 位'), { status: 400 });
  if (db.prepare('SELECT 1 FROM accounts WHERE username = ?').get(u)) throw Object.assign(new Error('用户名已存在'), { status: 409 });
  const { salt, hash } = hashPassword(password);
  const info = db.prepare('INSERT INTO accounts(username, pass_hash, salt, created_at) VALUES(?, ?, ?, ?)')
    .run(u, hash, salt, Date.now());
  const id = Number(info.lastInsertRowid);
  return { uid: `acc_${id}`, id, username: u };
}

export async function verifyAccount(username, password) {
  const u = String(username || '').trim().toLowerCase();
  const row = db.prepare('SELECT id, pass_hash, salt FROM accounts WHERE username = ?').get(u);
  if (!row) return null;
  if (!verifyPassword(password, row.salt, row.pass_hash)) return null;
  return { uid: `acc_${row.id}`, id: row.id, username: u };
}

// ---------- 管理界面（仅本机访问，见 server.js isLocal 守卫） ----------
export async function listAccounts() {
  const rows = db.prepare('SELECT id, username, created_at FROM accounts ORDER BY id').all();
  const cntWordbook = db.prepare('SELECT COUNT(*) AS c FROM wordbook WHERE uid = ?');
  return rows.map((r) => {
    const uid = `acc_${r.id}`;
    let records = 0, words = 0, lastTs = 0;
    const urow = db.prepare('SELECT data, updated_at FROM users WHERE uid = ?').get(uid);
    if (urow) {
      lastTs = urow.updated_at;
      try {
        const d = JSON.parse(urow.data);
        records = (d.records || []).length;
        words = Object.keys(d.wordErrors || {}).length;
      } catch { /* 数据损坏时跳过统计 */ }
    }
    return {
      id: r.id, uid, username: r.username, createdAt: r.created_at,
      records, words, wordbook: cntWordbook.get(uid).c,
      lastActive: lastTs,
    };
  });
}

export async function adminDeleteAccount(id) {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) throw Object.assign(new Error('非法账号 id'), { status: 400 });
  const info = db.prepare('DELETE FROM accounts WHERE id = ?').run(n);
  if (!info.changes) throw Object.assign(new Error('账号不存在'), { status: 404 });
  const uid = `acc_${n}`;
  db.prepare('DELETE FROM users WHERE uid = ?').run(uid);
  db.prepare('DELETE FROM wordbook WHERE uid = ?').run(uid);
  return { ok: true, deleted: uid };
}

export async function adminResetPassword(id, password) {
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) throw Object.assign(new Error('非法账号 id'), { status: 400 });
  if (String(password || '').length < 6) throw Object.assign(new Error('密码至少 6 位'), { status: 400 });
  if (!db.prepare('SELECT 1 FROM accounts WHERE id = ?').get(n)) throw Object.assign(new Error('账号不存在'), { status: 404 });
  const { salt, hash } = hashPassword(String(password));
  db.prepare('UPDATE accounts SET pass_hash = ?, salt = ? WHERE id = ?').run(hash, salt, n);
  return { ok: true };
}

// ---------- 数据导入 / 导出（完整备份，覆盖真实数据源） ----------
export async function exportData(uid) {
  const u = safeUid(uid);
  const data = await getUser(u);
  const wordbook = await listWordbook(u);
  const customTexts = await listCustomTexts();
  return {
    version: 2,
    app: 'english-reading',
    exportedAt: Date.now(),
    uid: data.uid,
    records: data.records || [],
    wordErrors: data.wordErrors || {},
    phonemeErrors: data.phonemeErrors || {},
    settings: data.settings || {},
    wordbook,
    customTexts,
  };
}

export async function importWordbook(uid, w) {
  const u = safeUid(uid);
  const word = String(w?.word || '').trim().toLowerCase();
  if (!word) return;
  const now = Date.now();
  const due = Number(w.due) || now + 86400000;
  const ease = Math.max(1.3, Number(w.ease) || 2.5);
  const interval = Number(w.interval) || 0;
  const reps = Number(w.reps) || 0;
  const wrong = Math.max(1, Number(w.wrong) || 1);
  db.prepare(`INSERT INTO wordbook(uid, word, ipa, zh, sentence, level_id, group_id, wrong, due, ease, interval, reps, created_at, updated_at)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(uid, word) DO UPDATE SET
      wrong = excluded.wrong, due = excluded.due, ease = excluded.ease,
      interval = excluded.interval, reps = excluded.reps, updated_at = excluded.updated_at,
      ipa = COALESCE(NULLIF(excluded.ipa, ''), ipa),
      zh = COALESCE(NULLIF(excluded.zh, ''), zh),
      sentence = COALESCE(NULLIF(excluded.sentence, ''), sentence)`)
    .run(u, word, String(w.ipa || '').slice(0, 40), String(w.zh || '').slice(0, 80),
      String(w.sentence || '').slice(0, 400), String(w.levelId || '').slice(0, 30),
      String(w.groupId || '').slice(0, 40), wrong, due, ease, interval, reps,
      Number(w.created_at) || now, now);
}

export async function importCustomText(c) {
  const id = String(c?.id || '');
  const text = String(c?.text || '');
  if (!id || !text) return;
  const mode = VALID_MODES.includes(c.mode) ? c.mode : 'auto';
  const title = String(c.title || '').slice(0, 60);
  const ts = Number(c.ts) || Number(c.created_at) || Date.now();
  db.prepare(`INSERT INTO custom_texts(id, title, text, mode, created_at, updated_at) VALUES(?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET title = excluded.title, text = excluded.text, mode = excluded.mode, updated_at = excluded.updated_at`)
    .run(id, title, text, mode, ts, ts);
  invalidateCustom();
}

export async function importData(uid, data) {
  if (!data || typeof data !== 'object') throw Object.assign(new Error('数据格式错误'), { status: 400 });
  await update(uid, (d) => {
    const ids = new Set((d.records || []).map((r) => r.id));
    for (const r of (data.records || [])) {
      if (r && r.id && !ids.has(r.id)) { d.records.push(r); ids.add(r.id); }
    }
    for (const [k, v] of Object.entries(data.wordErrors || {})) d.wordErrors[k] = (d.wordErrors[k] || 0) + Number(v || 0);
    for (const [k, v] of Object.entries(data.phonemeErrors || {})) d.phonemeErrors[k] = (d.phonemeErrors[k] || 0) + Number(v || 0);
    d.settings = { ...d.settings, ...(data.settings || {}) };
    if (d.records.length > MAX_RECORDS) d.records = d.records.slice(-MAX_RECORDS);
  });
  for (const w of (data.wordbook || [])) { if (w && w.word) await importWordbook(uid, w); }
  for (const c of (data.customTexts || [])) { if (c && c.id && c.text) await importCustomText(c); }
  return { ok: true };
}

// ---------- 统计汇总 ----------
const dayKey = (ts) => {
  const d = new Date(ts);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export async function getStats(uid) {
  const data = await getUser(uid);
  const recs = data.records || [];
  const total = recs.length;
  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
  const byDayMap = new Map();
  let totalMs = 0;
  for (const r of recs) {
    totalMs += r.durationMs || 0;
    const k = dayKey(r.ts);
    if (!byDayMap.has(k)) byDayMap.set(k, { day: k, count: 0, sum: 0, ms: 0 });
    const d = byDayMap.get(k);
    d.count += 1;
    d.sum += r.overall || 0;
    d.ms += r.durationMs || 0;
  }
  const byDay = [...byDayMap.values()]
    .sort((a, b) => (a.day < b.day ? -1 : 1))
    .map((d) => ({ day: d.day, count: d.count, avg: Math.round(d.sum / d.count), minutes: +(d.ms / 60000).toFixed(1) }));

  const today = dayKey(Date.now());
  const todayStat = byDay.find((d) => d.day === today) || { count: 0, avg: 0, minutes: 0 };

  const topN = (obj, n) =>
    Object.entries(obj)
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([key, count]) => ({ key, count }));

  // 连续练习天数
  let streak = 0;
  const daySet = new Set(byDay.map((d) => d.day));
  for (let i = 0; ; i += 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    if (daySet.has(dayKey(d.getTime()))) streak += 1;
    else break;
  }

  return {
    total,
    todayCount: todayStat.count,
    todayAvg: todayStat.avg,
    minutes: +(totalMs / 60000).toFixed(1),
    streak,
    avgOverall: Math.round(avg(recs.map((r) => r.overall || 0))),
    avgAccuracy: Math.round(avg(recs.map((r) => r.accuracy || 0))),
    avgFluency: Math.round(avg(recs.map((r) => r.fluency || 0))),
    avgCompleteness: Math.round(avg(recs.map((r) => r.completeness || 0))),
    best: recs.reduce((m, r) => Math.max(m, r.overall || 0), 0),
    byDay,
    trend: recs.slice(-40).map((r) => ({ ts: r.ts, overall: r.overall, accuracy: r.accuracy, fluency: r.fluency, completeness: r.completeness })),
    topWordErrors: topN(data.wordErrors || {}, 12),
    topPhonemeErrors: topN(data.phonemeErrors || 10),
    recent: recs.slice(-30).reverse().map((r) => ({
      id: r.id, ts: r.ts, text: r.text, level: r.level, type: r.type, engine: r.engine,
      overall: r.overall, accuracy: r.accuracy, fluency: r.fluency, completeness: r.completeness,
      badWords: r.badWords || [],
    })),
    customTexts: await listCustomTexts(),
    settings: data.settings || {},
  };
}
