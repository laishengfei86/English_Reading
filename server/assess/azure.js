/**
 * Azure 语音服务 - 发音评估（REST 方式，无需 SDK）
 * 文档要点：把 Pronunciation-Assessment 参数 base64 后放进请求头，音频用 16k/16bit 单声道 WAV。
 * 返回音素级结果，是目前最贴近「课堂纠音」的方案。
 */
import { normalizePhoneme, adviceForSymbol, phonemeHintsFor } from '../lib/text.js';

const round = (v) => Math.max(0, Math.min(100, Math.round(v || 0)));

export async function assessAzure({ text, wavBuffer, config, weights }) {
  const { key, region } = config;
  if (!key) throw Object.assign(new Error('未配置 AZURE_SPEECH_KEY'), { status: 400 });

  const params = {
    ReferenceText: text,
    GradingSystem: 'HundredMark',
    Granularity: 'Phoneme',
    Dimension: 'Comprehensive',
    EnableMiscue: 'True',
    PhonemeAlphabet: 'IPA',
  };
  const paramB64 = Buffer.from(JSON.stringify(params), 'utf8').toString('base64');
  const url = `https://${region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1`
    + '?language=en-US&format=detailed';

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 30000);
  let json;
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
        'Pronunciation-Assessment': paramB64,
        Accept: 'application/json',
      },
      body: wavBuffer,
      signal: ac.signal,
    });
    const txt = await resp.text();
    if (!resp.ok) {
      throw Object.assign(new Error(`Azure 评估失败 HTTP ${resp.status}`), { status: 502, detail: txt.slice(0, 400) });
    }
    json = JSON.parse(txt);
  } finally {
    clearTimeout(timer);
  }

  if (json.RecognitionStatus && json.RecognitionStatus !== 'Success') {
    throw Object.assign(new Error(`Azure 未识别到语音（${json.RecognitionStatus}）`), { status: 422 });
  }
  const best = (json.NBest || [])[0];
  if (!best) throw Object.assign(new Error('Azure 返回结果为空'), { status: 502 });

  const pa = best.PronunciationAssessment || {};
  const accuracy = round(pa.AccuracyScore);
  const fluency = round(pa.FluencyScore);
  const completeness = round(pa.CompletenessScore);
  const prosody = pa.ProsodyScore != null ? round(pa.ProsodyScore) : null;
  const W = weights || { accuracy: 0.5, fluency: 0.3, completeness: 0.2 };
  const wSum = W.accuracy + W.fluency + W.completeness || 1;
  const overall = pa.PronScore != null
    ? round(pa.PronScore)
    : round((accuracy * W.accuracy + fluency * W.fluency + completeness * W.completeness) / wSum);

  const issueMap = new Map();
  const words = (best.Words || []).map((w) => {
    const wa = w.PronunciationAssessment || {};
    const score = round(wa.AccuracyScore);
    const errorType = wa.ErrorType || 'None';
    const status = errorType === 'Omission' ? 'missing'
      : errorType === 'Mispronunciation' ? (score >= 60 ? 'warn' : 'bad')
        : errorType === 'Insertion' ? 'extra'
          : score >= 85 ? 'good' : score >= 66 ? 'warn' : 'bad';

    const phonemes = (w.Phonemes || []).map((p) => ({
      symbol: p.Phoneme,
      score: round(p.PronunciationAssessment?.AccuracyScore),
    }));
    const badPhonemes = phonemes.filter((p) => p.score < 70);
    for (const bp of badPhonemes) {
      const sym = normalizePhoneme(bp.symbol);
      if (!issueMap.has(sym)) {
        issueMap.set(sym, { symbol: sym, label: `音素 ${bp.symbol}`, advice: adviceForSymbol(sym), count: 0, words: [] });
      }
      const it = issueMap.get(sym);
      it.count += 1;
      if (it.words.length < 5 && !it.words.includes(w.Word)) it.words.push(w.Word);
    }

    const note = errorType === 'Omission' ? '漏读'
      : errorType === 'Insertion' ? '多读'
        : badPhonemes.length ? `音素偏差：${badPhonemes.map((p) => `/${p.symbol}/`).join(' ')}` : '';

    return {
      word: w.Word,
      score,
      status,
      note,
      phonemes,
      syllables: (w.Syllables || []).map((s) => ({ syllable: s.Syllable, score: round(s.PronunciationAssessment?.AccuracyScore) })),
      hints: status === 'good' ? [] : phonemeHintsFor(w.Word),
    };
  });

  const issues = [...issueMap.values()].sort((a, b) => b.count - a.count).slice(0, 6);

  const advice = [];
  const bad = words.filter((w) => w.status === 'bad' || w.status === 'missing');
  if (bad.length) advice.push(`需重点重练的词：${bad.slice(0, 8).map((w) => w.word).join('、')}。建议逐词点读 3 遍再整句跟读。`);
  if (completeness < 90) advice.push(`完整度 ${completeness}：有内容没读到或被吞掉，先放慢速度读全，再提速。`);
  if (fluency < 80) advice.push(`流利度 ${fluency}：停顿或迟疑较多，试试 0.9 倍速影子跟读，保持气流连贯。`);
  if (prosody != null && prosody < 80) advice.push(`语调（Prosody）${prosody}：注意句重音落在实词上，功能词弱读，句尾语调按陈述/疑问变化。`);
  for (const it of issues.slice(0, 3)) advice.push(`${it.symbol}：${it.advice} 涉及词：${it.words.join('、')}。`);
  if (!advice.length) advice.push('本句发音质量良好，可以挑战更长的段落或提高语速。');

  return {
    engine: 'azure',
    engineLabel: 'Azure 发音评估（音素级）',
    estimated: false,
    overall,
    accuracy,
    fluency,
    completeness,
    prosody,
    transcript: best.Display || best.Lexical || '',
    words,
    issues,
    advice,
    metrics: { provider: 'azure', recognized: best.Display || '' },
  };
}
