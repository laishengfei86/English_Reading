/**
 * 微软 Edge 同款在线神经网络语音（免费、无需 API Key）
 * 协议：WSS + Sec-MS-GEC 签名 + SSML，返回 24kHz MP3
 * 注意：属于非官方端点，稳定性取决于微软侧策略；失败时前端会自动回退浏览器语音。
 */
import crypto from 'node:crypto';
import { WsClient } from '../lib/ws.js';

const TRUSTED_CLIENT_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const WIN_EPOCH = 11644473600; // 1601-01-01 -> 1970-01-01 秒
// 微软端点会校验 Client Hints 与较新的 Chromium 版本，版本过旧会被 403
const CHROMIUM_FULL_VERSION = '138.0.3351.95';
const CHROMIUM_MAJOR = CHROMIUM_FULL_VERSION.split('.')[0];
const WSS_ORIGIN = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1';

/** Sec-MS-GEC：SHA256(向下取整到5分钟的tick + token) 大写十六进制；用 BigInt 精确计算避免浮点误差 */
function secMsGec() {
  let ticks = BigInt(Date.now()) * 10000n + BigInt(WIN_EPOCH) * 10000000n;
  ticks -= ticks % 3000000000n; // 3,000,000,000 tick = 5 分钟
  return crypto.createHash('sha256').update(`${ticks}${TRUSTED_CLIENT_TOKEN}`, 'ascii').digest('hex').toUpperCase();
}

const rand32 = () => crypto.randomBytes(16).toString('hex'); // 32 hex
const nowStamp = () => new Date().toISOString();

const escapeXml = (s) => String(s).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));

function configMessage() {
  return `X-Timestamp:${nowStamp()}\r\n`
    + `Content-Type:application/json; charset=utf-8\r\n`
    + `Path:speech.config\r\n\r\n`
    + JSON.stringify({
      context: {
        synthesis: {
          audio: {
            metadataoptions: { sentenceBoundaryEnabled: 'false', wordBoundaryEnabled: 'true' },
            outputFormat: 'audio-24khz-48kbitrate-mono-mp3',
          },
        },
      },
    });
}

function ssmlMessage(text, voice, rate) {
  const pct = Math.round((rate - 1) * 100);
  const rateStr = `${pct >= 0 ? '+' : ''}${pct}%`;
  const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>`
    + `<voice name='${voice}'><prosody pitch='+0Hz' rate='${rateStr}' volume='+0%'>${escapeXml(text)}</prosody></voice></speak>`;
  return `X-RequestId:${rand32()}\r\n`
    + `Content-Type:application/ssml+xml\r\n`
    + `X-Timestamp:${nowStamp()}Z\r\n`
    + `Path:ssml\r\n\r\n${ssml}`;
}

/**
 * 合成一段文本为 MP3。
 * @param {{text:string, voice:string, rate:number}} opts
 * @returns {Promise<{buffer:Buffer, mime:string}>}
 */
export async function edgeTts({ text, voice, rate }) {
  const v = voice || 'en-US-AvaMultilingualNeural';
  const r = Math.max(0.5, Math.min(2, Number(rate) || 1));
  const url = `${WSS_ORIGIN}?TrustedClientToken=${TRUSTED_CLIENT_TOKEN}`
    + `&Sec-MS-GEC=${secMsGec()}`
    + `&Sec-MS-GEC-Version=1-${CHROMIUM_FULL_VERSION}`
    + `&ConnectionId=${rand32()}`;

  const ws = new WsClient(url, {
    Pragma: 'no-cache',
    'Cache-Control': 'no-cache',
    Origin: 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9',
    'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROMIUM_MAJOR}.0.0.0 Safari/537.36 Edg/${CHROMIUM_MAJOR}.0.0.0`,
    'Sec-CH-UA': `"Microsoft Edge";v="${CHROMIUM_MAJOR}", "Chromium";v="${CHROMIUM_MAJOR}", "Not_A Brand";v="24"`,
    'Sec-CH-UA-Mobile': '?0',
    'Sec-CH-UA-Platform': '"Windows"',
    'Sec-CH-UA-Full-Version': `"${CHROMIUM_FULL_VERSION}"`,
    'Sec-CH-UA-Full-Version-List': `"Microsoft Edge";v="${CHROMIUM_FULL_VERSION}", "Chromium";v="${CHROMIUM_FULL_VERSION}", "Not_A Brand";v="24.0.0.0"`,
    'Sec-CH-UA-Arch': '"x86"',
    'Sec-CH-UA-Bitness': '"64"',
    'Sec-CH-UA-Model': '""',
    'Sec-CH-UA-Platform-Version': '"15.0.0"',
  });

  const audioChunks = [];
  let done = false;
  let failed = null;

  await ws.connect(15000);

  ws.on('message', ({ binary, data }) => {
    if (binary) {
      if (data.length < 2) return;
      const hlen = data.readUInt16BE(0);
      const header = data.slice(2, 2 + hlen).toString('utf8');
      if (header.includes('Path:audio')) audioChunks.push(data.slice(2 + hlen));
      return;
    }
    const s = data.toString('utf8');
    if (s.includes('Path:turn.end')) { done = true; ws.close(); }
  });
  ws.on('error', (e) => { failed = e; ws.close(); });
  ws.on('close', () => { if (!done && !audioChunks.length && !failed) failed = new Error('连接被关闭且未收到音频'); });

  ws.sendText(configMessage());
  ws.sendText(ssmlMessage(text, v, r));

  await new Promise((resolve) => {
    const iv = setInterval(() => { if (done || failed) { clearInterval(iv); resolve(); } }, 40);
    setTimeout(() => { clearInterval(iv); if (!done && !failed) failed = new Error('Edge TTS 等待音频超时'); resolve(); }, 25000);
  });
  ws.close();

  if (failed) throw failed;
  const buffer = Buffer.concat(audioChunks);
  if (!buffer.length) throw new Error('Edge TTS 未返回音频数据');
  return { buffer, mime: 'audio/mpeg' };
}
