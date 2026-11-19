// 在 VPS 上用临时容器运行：docker run --rm -v <卷名>:/data -v $(pwd)/scripts:/scripts am-english-reader:1.0.0 node --experimental-sqlite /scripts/_insert_custom.mjs
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';

const rows = JSON.parse(readFileSync('/scripts/_custom_export.json', 'utf8'));
const db = new DatabaseSync('/data/app.db');
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA busy_timeout = 5000;');
db.exec(`CREATE TABLE IF NOT EXISTS custom_texts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  text TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'auto',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
)`);
const ins = db.prepare('INSERT OR IGNORE INTO custom_texts(id, title, text, mode, created_at, updated_at) VALUES(?, ?, ?, ?, ?, ?)');
let n = 0;
for (const r of rows) {
  ins.run(r.id, String(r.title || '').slice(0, 60), String(r.text || ''), r.mode || 'auto', r.created_at || Date.now(), r.updated_at || Date.now());
  n += 1;
}
console.log('写入条数:', n);
