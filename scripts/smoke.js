/**
 * 端到端冒烟测试：启动本服务，逐一对 API 做最小可用校验。
 * 运行：npm run smoke   （或 node scripts/smoke.js）
 * 可选环境变量：SMOKE_URL=http://localhost:7000  直接对已有服务测试（不自动启停）
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import process from 'node:process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = process.env.SMOKE_PORT || '8099';
const BASE = process.env.SMOKE_URL || `http://localhost:${PORT}`;
const UID = 'smoke-' + Date.now().toString(36);

let pass = 0, fail = 0;
const fails = [];
function ok(name, cond, extra = '') {
  if (cond) { pass++; console.log(`  ✓ ${name}${extra ? ' — ' + extra : ''}`); }
  else { fail++; fails.push(name); console.log(`  ✗ ${name}${extra ? ' — ' + extra : ''}`); }
}

// 读取响应体一次：尝试解析为 JSON，失败则保留原始文本（兼容 HTML 静态资源）
async function readBody(r) {
  const txt = await r.text();
  try { return JSON.parse(txt); } catch { return { raw: txt }; }
}
async function get(url) {
  const r = await fetch(url);
  return { status: r.status, body: await readBody(r) };
}
async function post(url, body) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: r.status, body: await readBody(r) };
}

/** 生成一段“类语音”WAV（16kHz 单声道 16bit）：若干带间隔的音节脉冲，便于离线引擎检出音节核 */
function makeWav() {
  const sr = 16000;
  const samples = [];
  const syl = 7, dur = 0.16, gap = 0.09;
  for (let s = 0; s < syl; s++) {
    const f = 180 + s * 18;
    for (let i = 0; i < sr * dur; i++) samples.push(Math.sin(2 * Math.PI * f * (i / sr)) * 0.6);
    for (let i = 0; i < sr * gap; i++) samples.push(0);
  }
  const dataSize = samples.length * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + dataSize, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22); buf.writeUInt32LE(sr, 24);
  buf.writeUInt32LE(sr * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  return buf.toString('base64');
}

async function waitReady(url, tries = 50) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(`${url}/api/health`); if (r.ok) return true; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

async function run() {
  let child = null;
  if (!process.env.SMOKE_URL) {
    child = spawn(process.execPath, ['server/server.js'], {
      cwd: ROOT,
      env: { ...process.env, PORT, HOST: '127.0.0.1', SSL_ENABLED: 'false' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.on('data', () => {});
    child.stderr.on('data', (d) => process.stderr.write(`[server] ${d}`));
    const up = await waitReady(BASE);
    if (!up) { console.error('服务未能启动'); child.kill('SIGKILL'); process.exit(2); }
  }

  try {
    console.log(`\n=== 美语听读系统 冒烟测试 (${BASE}) ===\n`);

    // 1. 健康检查
    const h = await get(`${BASE}/api/health`);
    ok('GET /api/health', h.status === 200 && h.body.ok === true, `version=${h.body.version}`);

    // 2. 能力
    const c = await get(`${BASE}/api/capabilities`);
    ok('GET /api/capabilities', c.status === 200 && c.body.tts && c.body.assess,
      `tts=${c.body.tts.provider} assess=${c.body.assess.provider}`);
    ok('  capabilities 不含密钥', !JSON.stringify(c.body).includes('SECRET') && !JSON.stringify(c.body).includes('KEY'));

    // 3. 分句
    const sp = await post(`${BASE}/api/split`, { text: 'Hello world. This is a test! Do you like English?' });
    ok('POST /api/split', sp.status === 200 && Array.isArray(sp.body.sentences) && sp.body.sentences.length >= 3,
      `sentences=${sp.body.sentences?.length}`);

    // 4. 音素提示
    const hi = await get(`${BASE}/api/hints?word=through`);
    ok('GET /api/hints', hi.status === 200 && Array.isArray(hi.body.hints), `hints=${hi.body.hints?.length}`);

    // 5. 评分（离线引擎，合成 WAV）
    const audioB64 = makeWav();
    const ax = await post(`${BASE}/api/assess`, {
      uid: UID, engine: 'offline',
      text: 'This is a test of standard American English pronunciation.',
      audio: audioB64,
    });
    const r = ax.body?.result;
    ok('POST /api/assess 返回 200', ax.status === 200 && !!r, `elapsed=${r?.elapsedMs}ms`);
    ok('  含总分与三维度', r && typeof r.overall === 'number' && typeof r.accuracy === 'number'
      && typeof r.fluency === 'number' && typeof r.completeness === 'number',
      `overall=${r?.overall} acc=${r?.accuracy} flu=${r?.fluency} com=${r?.completeness}`);
    ok('  含逐词判读', r && Array.isArray(r.words) && r.words.length > 0, `words=${r?.words?.length}`);
    ok('  含建议或问题', r && (Array.isArray(r.advice) || Array.isArray(r.issues)));

    // 6. 进度（应含刚才的记录）
    const pr = await get(`${BASE}/api/progress?uid=${UID}`);
    ok('GET /api/progress', pr.status === 200 && pr.body.stats && pr.body.stats.total >= 1, `total=${pr.body.stats?.total}`);

    // 7. 保存设置
    const se = await post(`${BASE}/api/settings`, { uid: UID, settings: { ttsProvider: 'browser', rate: 1.1 } });
    ok('POST /api/settings', se.status === 200 && se.body.settings?.rate === 1.1);

    // 8. 自定义文本保存 + 进度可见
    const ct = await post(`${BASE}/api/custom-text`, { uid: UID, title: '冒烟测试文本', text: 'Practice makes perfect. Speak clearly.' });
    ok('POST /api/custom-text', ct.status === 200 && ct.body.item?.id, `id=${ct.body.item?.id}`);
    const pr2 = await get(`${BASE}/api/progress?uid=${UID}`);
    ok('  自定义文本进入进度', pr2.body.stats?.customTexts?.some((x) => x.id === ct.body.item.id));

    // 9. 删除自定义文本
    const dl = await post(`${BASE}/api/custom-text/delete`, { uid: UID, id: ct.body.item.id });
    ok('POST /api/custom-text/delete', dl.status === 200 && dl.body.ok === true);

    // 10. 清空记录
    const cl = await post(`${BASE}/api/progress/clear`, { uid: UID });
    ok('POST /api/progress/clear', cl.status === 200 && cl.body.ok === true);
    const pr3 = await get(`${BASE}/api/progress?uid=${UID}`);
    ok('  清空后 total=0', pr3.body.stats?.total === 0);

    // 11. 静态资源可达
    const idx = await get(`${BASE}/`);
    ok('静态首页可访问', idx.status === 200);
    const mjs = await get(`${BASE}/js/main.js`);
    ok('前端入口 main.js 可访问', mjs.status === 200 && (mjs.body.raw || '').length > 100);

  } finally {
    if (child) child.kill('SIGKILL');
  }

  console.log(`\n=== 结果：${pass} 通过 / ${fail} 失败 ===`);
  if (fail) { console.log('失败项：', fails.join(', ')); process.exit(1); }
  console.log('全部通过 ✅');
}

run().catch((e) => { console.error('测试异常：', e); process.exit(2); });
