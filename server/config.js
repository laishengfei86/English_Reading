/**
 * 配置加载：零依赖读取 .env（不覆盖已存在的真实环境变量）
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '..');

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const raw = fs.readFileSync(file, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const s = line.trim();
    if (!s || s.startsWith('#')) continue;
    const i = s.indexOf('=');
    if (i < 0) continue;
    const k = s.slice(0, i).trim();
    let v = s.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

loadEnvFile(path.join(ROOT, '.env'));

const num = (v, d) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

export const config = {
  root: ROOT,
  publicDir: path.join(ROOT, 'public'),
  port: num(process.env.PORT, 7000),
  host: process.env.HOST || '0.0.0.0',
  dataDir: path.isAbsolute(process.env.DATA_DIR || 'data')
    ? process.env.DATA_DIR
    : path.join(ROOT, process.env.DATA_DIR || 'data'),

  ssl: {
    enabled: (process.env.SSL_ENABLED || '').toLowerCase() === 'true',
    cert: process.env.SSL_CERT || path.join(ROOT, 'certs', 'cert.pem'),
    key: process.env.SSL_KEY || path.join(ROOT, 'certs', 'key.pem'),
  },

  tts: {
    provider: (process.env.TTS_PROVIDER || 'edge').toLowerCase(),
    edge: {
      voice: process.env.EDGE_TTS_VOICE || 'en-US-AvaMultilingualNeural',
    },
    azure: {
      key: process.env.AZURE_SPEECH_KEY || '',
      region: process.env.AZURE_SPEECH_REGION || 'eastus',
      voice: process.env.AZURE_TTS_VOICE || 'en-US-AvaMultilingualNeural',
    },
    tencent: {
      secretId: process.env.TENCENT_SECRET_ID || '',
      secretKey: process.env.TENCENT_SECRET_KEY || '',
      region: process.env.TENCENT_REGION || 'ap-guangzhou',
      voice: num(process.env.TENCENT_TTS_VOICE, 101051),
    },
    openai: {
      key: process.env.OPENAI_API_KEY || '',
      baseUrl: (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, ''),
      model: process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts',
      voice: process.env.OPENAI_TTS_VOICE || 'alloy',
    },
  },

  assess: {
    provider: (process.env.ASSESS_PROVIDER || 'offline').toLowerCase(),
    weights: {
      accuracy: num(process.env.SCORE_W_ACCURACY, 0.5),
      fluency: num(process.env.SCORE_W_FLUENCY, 0.3),
      completeness: num(process.env.SCORE_W_COMPLETENESS, 0.2),
    },
    azure: {
      key: process.env.AZURE_SPEECH_KEY || '',
      region: process.env.AZURE_SPEECH_REGION || 'eastus',
    },
    tencent: {
      secretId: process.env.TENCENT_SECRET_ID || '',
      secretKey: process.env.TENCENT_SECRET_KEY || '',
      region: process.env.TENCENT_REGION || 'ap-guangzhou',
      appId: process.env.TENCENT_SOE_APPID || '',
    },
  },
};

// 持久签名密钥（用于账号 token 验签）。优先级：环境变量 APP_SECRET > 落盘 dataDir/.secret（首次启动随机生成并保存）
let _secret = (process.env.APP_SECRET || '').trim();
if (!_secret) {
  const secFile = path.join(config.dataDir, '.secret');
  try { if (fs.existsSync(secFile)) _secret = fs.readFileSync(secFile, 'utf8').trim(); } catch { /* ignore */ }
  if (!_secret) {
    _secret = crypto.randomBytes(32).toString('hex');
    try { fs.writeFileSync(secFile, _secret); } catch { /* 写失败则每次启动换签（仅影响已签发 token 失效，可接受） */ }
  }
}
config.secret = _secret;
config.authTokenTtl = num(process.env.AUTH_TOKEN_TTL_DAYS, 30) * 86400000;

/** 返回给前端的能力清单（不含任何密钥） */
export function capabilities() {
  const t = config.tts;
  const a = config.assess;
  return {
    tts: {
      provider: t.provider,
      serverAvailable: {
        edge: true, // 免费真人神经语音，无需 Key（需服务器可访问外网）
        azure: Boolean(t.azure.key),
        tencent: Boolean(t.tencent.secretId && t.tencent.secretKey),
        openai: Boolean(t.openai.key),
      },
      defaultVoice: {
        edge: t.edge.voice,
        azure: t.azure.voice,
        tencent: String(t.tencent.voice),
        openai: t.openai.voice,
      },
    },
    assess: {
      provider: a.provider,
      serverAvailable: {
        offline: true,
        azure: Boolean(a.azure.key),
        tencent: Boolean(a.tencent.secretId && a.tencent.secretKey && a.tencent.appId),
      },
      weights: a.weights,
    },
  };
}
