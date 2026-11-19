/**
 * 腾讯云智聆口语评测 SOE（非流式一次性提交）
 * Action: TransmitOralProcessWithInit  Version: 2018-07-24
 * 国内网络访问稳定，返回词级 + 音素级（PhoneInfos）结果。
 */
import { tencentRequest } from '../lib/tc3.js';
import { normalizePhoneme, adviceForSymbol, phonemeHintsFor, tokenize } from '../lib/text.js';

const round = (v) => Math.max(0, Math.min(100, Math.round(v || 0)));

export async function assessTencent({ text, wavBuffer, config, weights }) {
  const { secretId, secretKey, region, appId } = config;
  if (!secretId || !secretKey) throw Object.assign(new Error('未配置 TENCENT_SECRET_ID / TENCENT_SECRET_KEY'), { status: 400 });
  if (!appId) throw Object.assign(new Error('未配置 TENCENT_SOE_APPID（需在腾讯云智聆口语评测控制台创建应用）'), { status: 400 });

  const wordCount = tokenize(text).length;
  // EvalMode: 0=单词 1=句子 2=段落
  const evalMode = wordCount <= 1 ? 0 : wordCount <= 40 ? 1 : 2;

  const payload = {
    SessionId: `s${Date.now()}${Math.floor(Math.random() * 1e6)}`,
    RefText: text,
    WorkMode: 1, // 非流式：一次性提交完整音频
    EvalMode: evalMode,
    ScoreCoeff: 1.0,
    SoeAppId: appId,
    IsLongLifeSession: 0,
    VoiceFileType: 2, // 2 = wav
    VoiceEncodeType: 1, // 1 = pcm
    SeqId: 1,
    IsEnd: 1,
    UserVoiceData: wavBuffer.toString('base64'),
    TextMode: 0,
  };

  const resp = await tencentRequest({
    host: 'soe.tencentcloudapi.com',
    service: 'soe',
    action: 'TransmitOralProcessWithInit',
    version: '2018-07-24',
    region: region || 'ap-guangzhou',
    secretId,
    secretKey,
    payload,
    timeoutMs: 30000,
  });

  const accuracy = round(resp.PronAccuracy);
  const fluency = round((resp.PronFluency || 0) * 100);
  const completeness = round((resp.PronCompletion || 0) * 100);
  const W = weights || { accuracy: 0.5, fluency: 0.3, completeness: 0.2 };
  const wSum = W.accuracy + W.fluency + W.completeness || 1;
  const overall = resp.SuggestedScore != null && resp.SuggestedScore > 0
    ? round(resp.SuggestedScore)
    : round((accuracy * W.accuracy + fluency * W.fluency + completeness * W.completeness) / wSum);

  const issueMap = new Map();
  const words = (resp.Words || []).map((w) => {
    const score = round(w.PronAccuracy);
    const matchTag = w.MatchTag; // 0=匹配 1=漏读 2=多读 3=回读 4=替换
    const status = matchTag === 1 ? 'missing'
      : matchTag === 2 || matchTag === 3 ? 'extra'
        : score >= 85 ? 'good' : score >= 66 ? 'warn' : 'bad';

    const phonemes = (w.PhoneInfos || []).map((p) => ({
      symbol: p.Phone,
      detected: p.DetectedPhone || '',
      score: round(p.PronAccuracy),
      stress: p.Stress,
      detectedStress: p.DetectedStress,
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
    const stressWrong = phonemes.some((p) => p.stress === 1 && p.detectedStress === 0);
    const note = matchTag === 1 ? '漏读'
      : matchTag === 2 ? '多读'
        : badPhonemes.length ? `音素偏差：${badPhonemes.map((p) => `/${p.symbol}/`).join(' ')}${stressWrong ? '；重音位置不对' : ''}`
          : stressWrong ? '重音位置不对' : '';

    return {
      word: w.Word,
      score,
      status,
      note,
      phonemes,
      hints: status === 'good' ? [] : phonemeHintsFor(w.Word),
    };
  });

  const issues = [...issueMap.values()].sort((a, b) => b.count - a.count).slice(0, 6);
  const advice = [];
  const bad = words.filter((w) => w.status === 'bad' || w.status === 'missing');
  if (bad.length) advice.push(`需重点重练的词：${bad.slice(0, 8).map((w) => w.word).join('、')}。`);
  if (completeness < 90) advice.push(`完整度 ${completeness}：有词没读到，先读全再提速。`);
  if (fluency < 80) advice.push(`流利度 ${fluency}：停顿偏多，尝试跟着原音做影子跟读。`);
  for (const it of issues.slice(0, 3)) advice.push(`${it.symbol}：${it.advice} 涉及词：${it.words.join('、')}。`);
  if (!advice.length) advice.push('发音质量良好，可尝试更长文本或提高语速。');

  return {
    engine: 'tencent',
    engineLabel: '腾讯云智聆口语评测（音素级）',
    estimated: false,
    overall,
    accuracy,
    fluency,
    completeness,
    prosody: null,
    transcript: '',
    words,
    issues,
    advice,
    metrics: { provider: 'tencent-soe', evalMode, audioDurationMs: resp.AudioDuration || null },
  };
}
