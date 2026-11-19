/**
 * 账号鉴权工具（零依赖，仅用 node:crypto）。
 * - 密码：scrypt 加盐哈希 + timingSafeEqual 校验
 * - Token：HMAC-SHA256 签名的无状态 JWT 风格令牌（base64url 载荷.签名），服务端用 config.secret 验签
 */
import crypto from 'node:crypto';
import { config } from '../config.js';

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return { salt, hash };
}

export function verifyPassword(password, salt, hash) {
  const a = crypto.scryptSync(String(password), salt, 64);
  let b;
  try { b = Buffer.from(String(hash), 'hex'); } catch { return false; }
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function signToken(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', config.secret).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyToken(token) {
  if (!token) return null;
  const [body, sig] = String(token).split('.');
  if (!body || !sig) return null;
  const expected = crypto.createHmac('sha256', config.secret).update(body).digest('base64url');
  if (expected !== sig) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (p.exp && p.exp < Date.now()) return null;
    return p;
  } catch {
    return null;
  }
}
