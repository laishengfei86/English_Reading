/**
 * 标准美式发音英语听读系统 - 服务端入口（零依赖）
 * 启动：node server/server.js
 */
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { config, capabilities } from './config.js';
import { readJson, sendJson, sendError, sendBuffer, serveStatic } from './lib/http.js';
import { runAssessment } from './assess/index.js';
import { synthesize, SERVER_VOICES } from './tts/index.js';
import { splitSentences, totalSyllables, phonemeHintsFor } from './lib/text.js';
import * as store from './lib/store.js';
import { recordWordMistake, listWordbook, reviewWordbook, deleteWord } from './lib/store.js';
import * as auth from './lib/auth.js';
import { createAccount, verifyAccount, exportData, importData } from './lib/store.js';

fs.mkdirSync(config.dataDir, { recursive: true });

/** 解析请求归属的用户 uid：
 *  1) 优先 Bearer token（登录态，且 token.uid 强制生效，防越权访问他人数据桶）；
 *  2) 回退到 URL/body 里的 uid（兼容未登录的本地随机 uid 单机模式）。 */
function authUid(req, url, body) {
  const h = req.headers['authorization'] || '';
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (m) {
    const p = auth.verifyToken(m[1].trim());
    if (p && p.uid) return p.uid;
  }
  const fromUrl = url && url.searchParams ? url.searchParams.get('uid') : null;
  const uid = (body && body.uid) || fromUrl || 'default';
  // 账号命名空间 acc_* 必须携带合法 token，否则拒绝（防匿名越权访问他人账号桶 / IDOR）
  if (/^acc_/i.test(uid)) throw Object.assign(new Error('请先登录'), { status: 401 });
  return uid;
}

/** 管理界面守卫：
 *  1) 配置了 ADMIN_TOKEN 时，要求请求头 X-Admin-Token 匹配（Docker NAT / 局域网场景下
 *     来源 IP 会被改写，回环判定失效，令牌是可靠方案）；
 *  2) 未配置时，退回"仅允许本机回环地址"（裸 node 直跑的自托管单机场景）。 */
function adminOk(req) {
  const token = (process.env.ADMIN_TOKEN || '').trim();
  if (token) {
    const given = String(req.headers['x-admin-token'] || '');
    return given.length === token.length
      ? crypto.timingSafeEqual(Buffer.from(given), Buffer.from(token))
      : false;
  }
  const a = req.socket?.remoteAddress || '';
  return a === '127.0.0.1' || a === '::1' || a === '::ffff:127.0.0.1';
}

const routes = {
  'GET /api/health': async (req, res) => sendJson(res, { ok: true, time: Date.now(), version: '1.0.0' }),

  'GET /api/capabilities': async (req, res) => sendJson(res, { ok: true, time: Date.now(), ...capabilities(), voices: SERVER_VOICES }),

  // 用 POST 读取能力，彻底绕过中间代理对 GET /api/capabilities 的缓存
  'POST /api/capabilities': async (req, res) => sendJson(res, { ok: true, time: Date.now(), ...capabilities(), voices: SERVER_VOICES }),

  // ---------- 账号（多用户） ----------
  'POST /api/auth/register': async (req, res, url) => {
    const body = await readJson(req);
    const acc = await store.createAccount(body.username, body.password);
    const token = auth.signToken({ uid: acc.uid, username: acc.username, exp: Date.now() + config.authTokenTtl });
    sendJson(res, { ok: true, token, uid: acc.uid, username: acc.username });
  },

  'POST /api/auth/login': async (req, res, url) => {
    const body = await readJson(req);
    const acc = await store.verifyAccount(body.username, body.password);
    if (!acc) throw Object.assign(new Error('用户名或密码错误'), { status: 401 });
    const token = auth.signToken({ uid: acc.uid, username: acc.username, exp: Date.now() + config.authTokenTtl });
    sendJson(res, { ok: true, token, uid: acc.uid, username: acc.username });
  },

  'GET /api/auth/me': async (req, res, url) => {
    const h = req.headers['authorization'] || '';
    const m = h.match(/^Bearer\s+(.+)$/i);
    if (!m) return sendJson(res, { ok: true, user: null });
    const p = auth.verifyToken(m[1].trim());
    sendJson(res, { ok: true, user: p ? { uid: p.uid, username: p.username } : null });
  },

  // ---------- 管理界面（仅限本机访问，无独立登录；自托管单机场景） ----------
  'GET /api/admin/accounts': async (req, res) => {
    if (!adminOk(req)) throw Object.assign(new Error('管理令牌缺失或不正确'), { status: 403 });
    sendJson(res, { ok: true, accounts: await store.listAccounts() });
  },

  'POST /api/admin/account/delete': async (req, res) => {
    if (!adminOk(req)) throw Object.assign(new Error('管理令牌缺失或不正确'), { status: 403 });
    const body = await readJson(req);
    sendJson(res, await store.adminDeleteAccount(body.id));
  },

  'POST /api/admin/account/resetpass': async (req, res) => {
    if (!adminOk(req)) throw Object.assign(new Error('管理令牌缺失或不正确'), { status: 403 });
    const body = await readJson(req);
    sendJson(res, await store.adminResetPassword(body.id, body.password));
  },

  // ---------- 数据导入 / 导出（完整备份） ----------
  'GET /api/export': async (req, res, url) => {
    const uid = authUid(req, url);
    sendJson(res, { ok: true, data: await store.exportData(uid) });
  },

  'POST /api/import': async (req, res, url) => {
    const body = await readJson(req);
    const uid = authUid(req, url, body);
    await store.importData(uid, body.data);
    sendJson(res, { ok: true });
  },

  'POST /api/tts': async (req, res, url) => {
    const body = await readJson(req);
    const out = await synthesize({
      text: body.text,
      voice: body.voice,
      rate: body.rate,
      provider: body.provider,
    });
    sendBuffer(res, out.buffer, out.mime, { cache: 'public, max-age=604800' });
  },

  'POST /api/assess': async (req, res, url) => {
    const body = await readJson(req);
    const t0 = Date.now();
    const result = await runAssessment({
      text: body.text,
      audio: body.audio,
      transcript: body.transcript || '',
      engine: body.engine,
    });
    result.elapsedMs = Date.now() - t0;

    if (body.uid && body.save !== false) {
      const uid = authUid(req, url, body);
      await store.addRecord(uid, {
        level: body.level || '', groupId: body.groupId || '', itemId: body.itemId || '',
        text: String(body.text).slice(0, 400), type: body.type || 'sentence',
        engine: result.engine,
        overall: result.overall, accuracy: result.accuracy,
        fluency: result.fluency, completeness: result.completeness,
        durationMs: result.durationMs,
        badWords: result.badWords, phonemes: result.errorPhonemes,
      }).catch((e) => console.error('[assess] 记录保存失败', e));
    }
    sendJson(res, { ok: true, result });
  },

  'POST /api/split': async (req, res, url) => {
    const body = await readJson(req);
    const sentences = splitSentences(body.text).map((s) => ({
      text: s,
      syllables: totalSyllables(s),
      words: s.split(/\s+/).length,
    }));
    sendJson(res, { ok: true, sentences });
  },

  'GET /api/hints': async (req, res, url) => {
    const w = url.searchParams.get('word') || '';
    sendJson(res, { ok: true, word: w, hints: phonemeHintsFor(w) });
  },

  'GET /api/progress': async (req, res, url) => {
    const uid = authUid(req, url);
    sendJson(res, { ok: true, stats: await store.getStats(uid) });
  },

  'POST /api/progress': async (req, res, url) => {
    const body = await readJson(req);
    const uid = authUid(req, url, body);
    const rec = await store.addRecord(uid, body.record || {});
    sendJson(res, { ok: true, record: rec });
  },

  'POST /api/progress/clear': async (req, res, url) => {
    const body = await readJson(req);
    const uid = authUid(req, url, body);
    await store.clearAll(uid);
    sendJson(res, { ok: true });
  },

  'POST /api/settings': async (req, res, url) => {
    const body = await readJson(req);
    const uid = authUid(req, url, body);
    const s = await store.saveSettings(uid, body.settings || {});
    sendJson(res, { ok: true, settings: s });
  },

  'POST /api/custom-text': async (req, res, url) => {
    const body = await readJson(req);
    const uid = authUid(req, url, body);
    const text = String(body.text || '').trim();
    if (!text) throw Object.assign(new Error('文本为空'), { status: 400 });
    if (text.length > 20000) throw Object.assign(new Error('文本过长（上限 2 万字符）'), { status: 400 });
    const item = await store.saveCustomText(uid, {
      title: String(body.title || text.slice(0, 24)).slice(0, 60),
      text,
      mode: ['auto', 'paragraph', 'whole'].includes(body.mode) ? body.mode : 'auto',
    });
    sendJson(res, { ok: true, item, sentences: splitSentences(text) });
  },

  'POST /api/custom-text/delete': async (req, res, url) => {
    const body = await readJson(req);
    const uid = authUid(req, url, body);
    await store.deleteCustomText(uid, body.id);
    sendJson(res, { ok: true });
  },

  'POST /api/custom-text/update': async (req, res, url) => {
    const body = await readJson(req);
    const uid = authUid(req, url, body);
    if (!body.id) throw Object.assign(new Error('缺少素材 id'), { status: 400 });
    const item = await store.updateCustomText(uid, body.id, {
      mode: ['auto', 'paragraph', 'whole'].includes(body.mode) ? body.mode : undefined,
      title: typeof body.title === 'string' ? body.title : undefined,
      text: typeof body.text === 'string' ? body.text : undefined,
    });
    sendJson(res, { ok: true, item });
  },

  // 听写/练习错词入库（为单词本与 SRS 复习预热）
  'POST /api/wordbook': async (req, res, url) => {
    const body = await readJson(req);
    const uid = authUid(req, url, body);
    const r = await store.recordWordMistake(uid, {
      word: body.word, ipa: body.ipa, zh: body.zh, sentence: body.sentence,
      levelId: body.levelId, groupId: body.groupId,
    });
    sendJson(res, { ok: true, item: r });
  },

  'GET /api/wordbook': async (req, res, url) => {
    const uid = authUid(req, url);
    sendJson(res, { ok: true, words: await store.listWordbook(uid) });
  },

  'POST /api/wordbook/review': async (req, res, url) => {
    const body = await readJson(req);
    const uid = authUid(req, url, body);
    const r = await reviewWordbook(uid, body.word, Number(body.quality));
    sendJson(res, { ok: true, item: r });
  },

  'POST /api/wordbook/delete': async (req, res, url) => {
    const body = await readJson(req);
    const uid = authUid(req, url, body);
    const r = await deleteWord(uid, body.word);
    sendJson(res, { ok: true, item: r });
  },
};

async function handle(req, res, url) {
  const key = `${req.method} ${url.pathname}`;
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { Allow: 'GET,POST,OPTIONS' });
    res.end();
    return;
  }
  const handler = routes[key];
  if (handler) {
    await handler(req, res, url);
    return;
  }
  if (url.pathname.startsWith('/api/')) {
    sendJson(res, { ok: false, error: `接口不存在：${key}` }, 404);
    return;
  }
  // 管理页：配置了 ADMIN_TOKEN 时页面放行（页面本身无敏感数据，数据由 API 令牌把守）；
  // 未配置令牌时退回"仅本机回环"，对外一律 404 不暴露存在性
  if (url.pathname === '/admin' || url.pathname === '/admin.html') {
    if (!(process.env.ADMIN_TOKEN || '').trim() && !adminOk(req)) {
      return sendJson(res, { ok: false, error: '资源不存在' }, 404);
    }
    await serveStatic(res, config.publicDir, '/admin.html');
    return;
  }
  await serveStatic(res, config.publicDir, url.pathname);
}

let useHttps = false;
let tlsOpts = null;
const sslEnv = (process.env.SSL_ENABLED || '').toLowerCase();
const sslAuto = fs.existsSync(config.ssl.cert) && fs.existsSync(config.ssl.key);
if (sslEnv === 'true' || (sslEnv !== 'false' && sslAuto)) {
  try {
    tlsOpts = { cert: fs.readFileSync(config.ssl.cert), key: fs.readFileSync(config.ssl.key) };
    useHttps = true;
  } catch (e) {
    console.warn('[ssl] 证书读取失败，继续使用 HTTP：', e.message);
  }
}

const protocol = useHttps ? 'https' : 'http';
const create = useHttps ? https.createServer.bind(https, tlsOpts) : http.createServer.bind(http);

const server = create(async (req, res) => {
  const proto = req.headers['x-forwarded-proto'] || protocol;
  const url = new URL(req.url, `${proto}://${req.headers.host || 'localhost'}`);
  try {
    await handle(req, res, url);
  } catch (err) {
    sendError(res, err);
  }
});

server.listen(config.port, config.host, () => {
  const caps = capabilities();
  console.log('────────────────────────────────────────────');
  console.log('  标准美式发音英语听读系统 已启动');
  console.log(`  本机访问：${protocol}://localhost:${config.port}`);
  console.log(`  监听地址：${config.host}:${config.port}`);
  console.log(`  安全协议：${useHttps ? 'HTTPS（自签名证书）' : 'HTTP'}`);
  console.log(`  TTS 引擎：${caps.tts.provider}   评分引擎：${caps.assess.provider}`);
  console.log(`  数据目录：${config.dataDir}`);
  if (caps.tts.provider === 'browser') console.log('  提示：当前使用浏览器内置语音（免费零配置）。接入云端 TTS 见 README。');
  if (caps.assess.provider === 'offline') console.log('  提示：当前使用离线评分引擎（估分）。接入音素级评分见 README。');
  console.log('────────────────────────────────────────────');
});
