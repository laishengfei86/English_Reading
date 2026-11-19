/**
 * 服务端 TTS 调度 + 磁盘缓存
 * 引擎：edge（免费真人神经语音，默认）| azure | tencent（国内网络友好）| openai 兼容
 * 说明：TTS_PROVIDER=browser 时前端直接用浏览器内置语音，不会走这里。
 */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from '../config.js';
import { tencentRequest } from '../lib/tc3.js';
import { edgeTts } from './edge.js';

const cacheDir = path.join(config.dataDir, 'tts-cache');
fs.mkdirSync(cacheDir, { recursive: true });

export const SERVER_VOICES = {
  // 免费微软神经网络真人语音（男/女声），无需 Key
  edge: [
    { id: 'en-US-AvaMultilingualNeural', name: 'Ava（女·自然·推荐）' },
    { id: 'en-US-JennyNeural', name: 'Jenny（女·亲切）' },
    { id: 'en-US-AriaNeural', name: 'Aria（女·播报）' },
    { id: 'en-US-MichelleNeural', name: 'Michelle（女·清晰）' },
    { id: 'en-US-EmmaMultilingualNeural', name: 'Emma（女·清亮）' },
    { id: 'en-US-AndrewMultilingualNeural', name: 'Andrew（男·自然·推荐）' },
    { id: 'en-US-GuyNeural', name: 'Guy（男·沉稳）' },
    { id: 'en-US-BrianMultilingualNeural', name: 'Brian（男·圆润）' },
    { id: 'en-US-ChristopherNeural', name: 'Christopher（男·浑厚）' },
    { id: 'en-US-EricNeural', name: 'Eric（男·标准）' },
  ],
  azure: [
    { id: 'en-US-AvaMultilingualNeural', name: 'Ava（女·自然）' },
    { id: 'en-US-AndrewMultilingualNeural', name: 'Andrew（男·自然）' },
    { id: 'en-US-JennyNeural', name: 'Jenny（女·亲切）' },
    { id: 'en-US-AriaNeural', name: 'Aria（女·播报）' },
    { id: 'en-US-GuyNeural', name: 'Guy（男·沉稳）' },
    { id: 'en-US-EmmaNeural', name: 'Emma（女·清亮）' },
  ],
  tencent: [
    { id: '101051', name: 'WeRose（英文女声）' },
    { id: '101050', name: 'WeJack（英文男声）' },
  ],
  openai: [
    { id: 'alloy', name: 'Alloy（中性）' },
    { id: 'nova', name: 'Nova（女）' },
    { id: 'echo', name: 'Echo（男）' },
    { id: 'shimmer', name: 'Shimmer（女·柔）' },
  ],
};

const escapeXml = (s) => String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));

async function azureTts({ text, voice, rate }) {
  const { key, region } = config.tts.azure;
  if (!key) throw Object.assign(new Error('未配置 AZURE_SPEECH_KEY'), { status: 400 });
  const v = voice || config.tts.azure.voice;
  const pct = Math.round((rate - 1) * 100);
  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/Synthesis" xml:lang="en-US">`
    + `<voice name="${escapeXml(v)}"><prosody rate="${pct >= 0 ? '+' : ''}${pct}%">${escapeXml(text)}</prosody></voice></speak>`;
  const resp = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      'User-Agent': 'am-english-reader',
    },
    body: ssml,
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw Object.assign(new Error(`Azure TTS 失败 HTTP ${resp.status}`), { status: 502, detail: t.slice(0, 300) });
  }
  return { buffer: Buffer.from(await resp.arrayBuffer()), mime: 'audio/mpeg' };
}

async function tencentTts({ text, voice, rate }) {
  const { secretId, secretKey, region } = config.tts.tencent;
  if (!secretId || !secretKey) throw Object.assign(new Error('未配置 TENCENT_SECRET_ID / KEY'), { status: 400 });
  // 腾讯云 Speed 取值 -2 ~ 6，1 倍速对应 0
  const speed = Math.max(-2, Math.min(6, (rate - 1) * 2));
  const resp = await tencentRequest({
    host: 'tts.tencentcloudapi.com',
    service: 'tts',
    action: 'TextToVoice',
    version: '2019-08-23',
    region: region || 'ap-guangzhou',
    secretId,
    secretKey,
    payload: {
      Text: text,
      SessionId: `t${Date.now()}`,
      VoiceType: Number(voice || config.tts.tencent.voice),
      Volume: 5,
      Speed: speed,
      Codec: 'mp3',
      PrimaryLanguage: 2, // 2 = 英文
      SampleRate: 16000,
    },
  });
  return { buffer: Buffer.from(resp.Audio, 'base64'), mime: 'audio/mpeg' };
}

async function openaiTts({ text, voice, rate }) {
  const { key, baseUrl, model } = config.tts.openai;
  if (!key) throw Object.assign(new Error('未配置 OPENAI_API_KEY'), { status: 400 });
  const resp = await fetch(`${baseUrl}/audio/speech`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      voice: voice || config.tts.openai.voice,
      input: text,
      speed: Math.max(0.25, Math.min(4, rate)),
      response_format: 'mp3',
      instructions: 'Read clearly in a standard American accent, like an ESL teacher demonstrating pronunciation.',
    }),
  });
  if (!resp.ok) {
    const t = await resp.text();
    throw Object.assign(new Error(`OpenAI TTS 失败 HTTP ${resp.status}`), { status: 502, detail: t.slice(0, 300) });
  }
  return { buffer: Buffer.from(await resp.arrayBuffer()), mime: 'audio/mpeg' };
}

export async function synthesize({ text, voice = '', rate = 1, provider }) {
  const t = String(text || '').trim();
  if (!t) throw Object.assign(new Error('缺少文本'), { status: 400 });

  const p = (provider || config.tts.provider || 'browser').toLowerCase();
  // Edge 真人语音支持较长文本（整段/整篇朗读），其余云端引擎保守限制
  const maxLen = p === 'edge' ? 3000 : 1200;
  if (t.length > maxLen) {
    throw Object.assign(new Error(`单次合成文本请控制在 ${maxLen} 字符内${p === 'edge' ? '，更长请改用「按段落」朗读方式' : ''}`), { status: 400 });
  }
  if (p === 'browser') throw Object.assign(new Error('当前 TTS 引擎为浏览器内置语音，无需调用服务端'), { status: 400 });

  const r = Math.max(0.5, Math.min(2, Number(rate) || 1));
  const hash = crypto.createHash('sha1').update(`${p}|${voice}|${r}|${t}`).digest('hex');
  const file = path.join(cacheDir, `${hash}.mp3`);
  try {
    const buf = await fsp.readFile(file);
    return { buffer: buf, mime: 'audio/mpeg', cached: true };
  } catch { /* miss */ }

  let out;
  if (p === 'edge') out = await edgeTts({ text: t, voice, rate: r });
  else if (p === 'azure') out = await azureTts({ text: t, voice, rate: r });
  else if (p === 'tencent') out = await tencentTts({ text: t, voice, rate: r });
  else if (p === 'openai') out = await openaiTts({ text: t, voice, rate: r });
  else throw Object.assign(new Error(`未知 TTS 引擎：${p}`), { status: 400 });

  fsp.writeFile(file, out.buffer).catch(() => {});
  return { ...out, cached: false };
}
