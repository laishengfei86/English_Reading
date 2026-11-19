import { DatabaseSync } from 'node:sqlite';
import { writeFileSync } from 'node:fs';

const SRC = 'E:/Desktop/English_Reading/data/app.db';
const OUT = 'E:/Desktop/English_Reading/scripts/_custom_export.json';

const db = new DatabaseSync(SRC);
const rows = db.prepare('SELECT id, title, text, mode, created_at, updated_at FROM custom_texts').all();
writeFileSync(OUT, JSON.stringify(rows, null, 2));
console.log('导出条数:', rows.length);
for (const r of rows) console.log(' -', r.title, '| mode=' + r.mode, '| 字数=' + String(r.text || '').length);
