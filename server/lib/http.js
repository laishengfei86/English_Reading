/** HTTP 小工具：body 读取、JSON 响应、静态文件 */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

const MAX_BODY = 24 * 1024 * 1024; // 24MB，足够放 60s 的 16k/16bit 录音 base64

export function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('请求体过大'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export async function readJson(req) {
  const buf = await readBody(req);
  if (!buf.length) return {};
  try {
    return JSON.parse(buf.toString('utf8'));
  } catch {
    throw Object.assign(new Error('JSON 解析失败'), { status: 400 });
  }
}

export function sendJson(res, data, status = 200) {
  const body = Buffer.from(JSON.stringify(data), 'utf8');
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

export function sendError(res, err) {
  const status = err?.status || 500;
  const message = err?.message || '服务器内部错误';
  if (status >= 500) console.error('[error]', err);
  sendJson(res, { ok: false, error: message, detail: err?.detail || null }, status);
}

export function sendBuffer(res, buf, type, { cache = 'public, max-age=86400' } = {}) {
  res.writeHead(200, {
    'Content-Type': type,
    'Content-Length': buf.length,
    'Cache-Control': cache,
  });
  res.end(buf);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.webmanifest': 'application/manifest+json',
  '.txt': 'text/plain; charset=utf-8',
};

export async function serveStatic(res, rootDir, urlPath) {
  let rel = decodeURIComponent(urlPath.split('?')[0]);
  if (rel === '/' || rel === '') rel = '/index.html';
  const safe = path.normalize(rel).replace(/^([/\\])+/, '');
  const file = path.join(rootDir, safe);
  if (!file.startsWith(rootDir)) {
    sendJson(res, { ok: false, error: '非法路径' }, 403);
    return;
  }
  try {
    const st = await fsp.stat(file);
    if (st.isDirectory()) return serveStatic(res, rootDir, path.posix.join(rel, 'index.html'));
    const ext = path.extname(file).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    // JS/CSS/HTML/JSON 不缓存，避免浏览器长期持有旧版本（曾导致切换引擎后异常、素材更新不可见）
    const cache = (ext === '.html' || ext === '.js' || ext === '.css' || ext === '.json') ? 'no-cache' : 'public, max-age=3600';
    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': st.size,
      'Cache-Control': cache,
    });
    fs.createReadStream(file).pipe(res);
  } catch {
    // 单页应用：未知路径回落到 index.html
    if (!path.extname(safe)) {
      try {
        const html = await fsp.readFile(path.join(rootDir, 'index.html'));
        sendBuffer(res, html, MIME['.html'], { cache: 'no-cache' });
        return;
      } catch { /* ignore */ }
    }
    sendJson(res, { ok: false, error: '资源不存在' }, 404);
  }
}
