/** 评分调度：按引擎分发，云端失败自动回退离线引擎（保证功能永远可用） */
import { config } from '../config.js';
import { parseWav, resample, encodeWav, bufferFromBase64 } from '../lib/wav.js';
import { assessOffline } from './offline.js';
import { assessAzure } from './azure.js';
import { assessTencent } from './tencent.js';

const TARGET_SR = 16000;

export async function runAssessment({ text, audio, transcript = '', engine }) {
  if (!text || !String(text).trim()) throw Object.assign(new Error('缺少参考文本'), { status: 400 });
  if (!audio) throw Object.assign(new Error('缺少录音数据'), { status: 400 });

  const raw = bufferFromBase64(audio);
  if (raw.length < 1000) throw Object.assign(new Error('录音数据过短或为空'), { status: 400 });

  const parsed = parseWav(raw);
  const samples = parsed.sampleRate === TARGET_SR ? parsed.samples : resample(parsed.samples, parsed.sampleRate, TARGET_SR);
  const wav16k = parsed.sampleRate === TARGET_SR && parsed.bitsPerSample === 16 && parsed.channels === 1
    ? raw
    : encodeWav(samples, TARGET_SR);

  const durationMs = Math.round((samples.length / TARGET_SR) * 1000);
  if (durationMs < 250) throw Object.assign(new Error('录音时长不足 0.25 秒'), { status: 400 });

  const weights = config.assess.weights;
  const want = (engine || config.assess.provider || 'offline').toLowerCase();
  const fallbackNotes = [];

  let result = null;
  if (want === 'azure') {
    try {
      result = await assessAzure({ text, wavBuffer: wav16k, config: config.assess.azure, weights });
    } catch (e) {
      fallbackNotes.push(`Azure 评估不可用（${e.message}），已自动使用离线引擎。`);
    }
  } else if (want === 'tencent') {
    try {
      result = await assessTencent({ text, wavBuffer: wav16k, config: config.assess.tencent, weights });
    } catch (e) {
      fallbackNotes.push(`腾讯云评测不可用（${e.message}），已自动使用离线引擎。`);
    }
  }

  if (!result) {
    result = assessOffline({ text, samples, sampleRate: TARGET_SR, transcript, weights });
  }

  result.durationMs = result.durationMs || durationMs;
  if (fallbackNotes.length) {
    result.warnings = fallbackNotes;
    result.advice = [...fallbackNotes, ...(result.advice || [])];
  }

  // 供统计使用
  result.badWords = (result.words || [])
    .filter((w) => w.status === 'bad' || w.status === 'missing')
    .map((w) => w.word);
  result.errorPhonemes = (result.issues || []).map((i) => i.symbol);
  return result;
}
