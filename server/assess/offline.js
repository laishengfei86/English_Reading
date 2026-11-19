/**
 * 离线发音评分引擎（零配置可用）
 *
 * 思路：
 *  1) 声学层：能量 VAD -> 语音段 / 停顿；平滑能量峰值提取 -> 音节核个数；
 *     MFCC 一阶差分 -> 吐字活跃度；SNR -> 录音清晰度。
 *  2) 文本层：参考文本估算期望音节数、期望时长，逐词分配时间窗。
 *  3) 若前端提供了语音识别转写（浏览器 Web Speech API），则做词级对齐，
 *     得到真实的「读错 / 漏读」判定，准确度以对齐结果为主。
 *  4) 三维度打分：准确度 / 流利度 / 完整度，加权得总分；
 *     结合中文学习者易错音素规则库生成针对性建议。
 *
 * 注意：离线引擎是启发式估分，用于日常自检与趋势跟踪；
 *       需要音素级精确评分请在 .env 中接入 Azure 或腾讯云 SOE。
 */
import { computeFeatures, detectSpeech, detectSyllableNuclei, articulationActivity, percentile } from '../lib/dsp.js';
import { tokenize, countSyllables, phonemeHintsFor, adviceForSymbol } from '../lib/text.js';
import { alignWords } from '../lib/align.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const lerp = (x, x0, x1, y0, y1) => {
  if (x <= x0) return y0;
  if (x >= x1) return y1;
  return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
};
const round = (v) => Math.round(clamp(v, 0, 100));

export function assessOffline({ text, samples, sampleRate = 16000, transcript = '', weights }) {
  const durationMs = Math.round((samples.length / sampleRate) * 1000);
  const refTokens = tokenize(text);
  const expectedSyll = refTokens.reduce((s, w) => s + countSyllables(w), 0) || 1;

  const feat = computeFeatures(samples, sampleRate);
  const vad = detectSpeech(feat.energyDb, feat.hopMs);
  const nuclei = detectSyllableNuclei(feat.energyDb, feat.hopMs, vad);
  const art = articulationActivity(feat.mfcc, vad, feat.hopMs);

  const speechMs = vad.segments.reduce((s, g) => s + (g.endMs - g.startMs), 0);
  const snr = vad.peak - vad.noiseFloor;

  /* ---------- 无有效语音 ---------- */
  if (!vad.segments.length || speechMs < 220 || nuclei.length === 0) {
    return {
      engine: 'offline',
      engineLabel: '离线声学引擎（估分）',
      estimated: true,
      overall: 0,
      accuracy: 0,
      fluency: 0,
      completeness: 0,
      durationMs,
      speechMs,
      transcript: transcript || '',
      words: refTokens.map((w) => ({ word: w, score: 0, status: 'missing', hints: phonemeHintsFor(w) })),
      issues: [],
      advice: [
        '没有检测到有效人声。请检查浏览器麦克风权限，靠近麦克风 15~25cm，在安静环境下重录。',
        '若使用公网 IP 访问（http://），部分浏览器会禁用麦克风，请配置 HTTPS 或改用 localhost 测试。',
      ],
      metrics: { snr: +snr.toFixed(1), noiseFloor: +vad.noiseFloor.toFixed(1), nuclei: nuclei.length, expectedSyll },
    };
  }

  const span = vad.segments[vad.segments.length - 1].endMs - vad.segments[0].startMs;
  let internalPause = 0;
  let longPauses = 0;
  for (let i = 1; i < vad.segments.length; i += 1) {
    const gap = vad.segments[i].startMs - vad.segments[i - 1].endMs;
    internalPause += gap;
    if (gap >= 520) longPauses += 1;
  }
  const pauseRatio = span > 0 ? internalPause / span : 0;
  const rate = speechMs > 0 ? nuclei.length / (speechMs / 1000) : 0; // 音节/秒
  const syllRatio = nuclei.length / expectedSyll;

  /* ---------- 完整度 ---------- */
  let completeness;
  const hypTokens = tokenize(transcript);
  let align = null;
  if (hypTokens.length) {
    align = alignWords(refTokens, hypTokens);
    const spoken = align.result.filter((r) => r.status !== 'missing').length;
    completeness = (spoken / Math.max(1, refTokens.length)) * 100;
  } else {
    completeness = syllRatio >= 0.92 ? 100 : lerp(syllRatio, 0.35, 0.92, 35, 100);
    if (syllRatio > 1.25) completeness -= Math.min(18, (syllRatio - 1.25) * 45); // 明显多读/重复
  }

  /* ---------- 流利度 ---------- */
  let fluency = 100;
  fluency -= Math.max(0, pauseRatio - 0.16) * 165;
  fluency -= Math.min(22, longPauses * 7);
  if (rate < 2.3) fluency -= lerp(rate, 1.0, 2.3, 26, 0);
  if (rate > 5.2) fluency -= lerp(rate, 5.2, 7.2, 0, 20);
  if (nuclei.length < 3) fluency -= 12;
  fluency = clamp(fluency, 25, 100);

  /* ---------- 准确度 ---------- */
  const clarityScore = clamp(lerp(snr, 10, 32, 52, 96), 40, 96);
  const artScore = clamp(lerp(art, 0.35, 1.9, 55, 95), 45, 95);
  const syllScore = clamp(100 - Math.abs(1 - Math.min(syllRatio, 1.6)) * 105, 40, 98);

  let accuracy;
  let words = [];
  const flagged = [];

  if (align) {
    // 有转写：以词级对齐为主
    const simToScore = (sim, status) => {
      if (status === 'missing') return 0;
      if (status === 'match') return round(lerp(clarityScore, 50, 96, 88, 99));
      return round(lerp(sim, 0.45, 0.995, 42, 90));
    };
    let sum = 0;
    let wsum = 0;
    words = refTokens.map((w, i) => {
      const r = align.result[i];
      const score = simToScore(r.sim, r.status);
      const weight = countSyllables(w);
      sum += score * weight;
      wsum += weight;
      const status = r.status === 'match' ? (score >= 85 ? 'good' : 'warn')
        : r.status === 'near' ? 'warn'
          : r.status === 'wrong' ? 'bad' : 'missing';
      const note = r.status === 'missing' ? '未识别到，疑似漏读或吞音'
        : r.status === 'wrong' ? `识别为「${r.hyp}」，与目标词差异较大`
          : r.status === 'near' ? `识别为「${r.hyp}」，发音接近但不够准确` : '';
      if (status !== 'good') flagged.push({ word: w, status, note });
      return { word: w, score, status, note, heard: r.hyp || '', hints: phonemeHintsFor(w) };
    });
    const alignScore = wsum ? sum / wsum : 0;
    accuracy = 0.78 * alignScore + 0.14 * clarityScore + 0.08 * artScore;
    if (align.insertions > 0) accuracy -= Math.min(8, align.insertions * 2.5);
  } else {
    // 无转写：声学估分 + 逐词时间窗证据
    accuracy = 0.42 * clarityScore + 0.24 * artScore + 0.34 * syllScore;
    const base = round(accuracy);
    const speechMeanDb = percentile(
      feat.energyDb.filter((_, f) => vad.segments.some((s) => f >= s.startFrame && f < s.endFrame)),
      55,
    );
    // 把语音时间轴按音节权重分配给每个词
    const totalW = refTokens.reduce((s, w) => s + countSyllables(w), 0) || 1;
    let segIdx = 0;
    let cursor = vad.segments[0].startMs;
    const windows = [];
    for (const w of refTokens) {
      let need = (speechMs * countSyllables(w)) / totalW;
      const startMs = cursor;
      while (need > 0 && segIdx < vad.segments.length) {
        const seg = vad.segments[segIdx];
        if (cursor < seg.startMs) cursor = seg.startMs;
        const avail = seg.endMs - cursor;
        if (avail <= need) {
          need -= avail;
          segIdx += 1;
          cursor = segIdx < vad.segments.length ? vad.segments[segIdx].startMs : seg.endMs;
        } else {
          cursor += need;
          need = 0;
        }
      }
      windows.push({ startMs, endMs: cursor });
    }
    words = refTokens.map((w, i) => {
      const win = windows[i];
      const expSyll = countSyllables(w);
      const inWin = nuclei.filter((t) => t >= win.startMs - 40 && t <= win.endMs + 40).length;
      const f0 = Math.max(0, Math.round(win.startMs / feat.hopMs));
      const f1 = Math.min(feat.energyDb.length - 1, Math.round(win.endMs / feat.hopMs));
      let e = -120;
      let cnt = 0;
      let acc = 0;
      for (let f = f0; f <= f1; f += 1) { acc += feat.energyDb[f]; cnt += 1; }
      if (cnt) e = acc / cnt;
      const energyDiff = e - speechMeanDb;

      let score = base;
      if (inWin === 0) score -= 26;
      else if (inWin < expSyll) score -= 10 * (expSyll - inWin);
      else if (inWin > expSyll + 1) score -= 5;
      if (energyDiff < -7) score -= 12;
      else if (energyDiff < -3.5) score -= 6;
      score = round(score);
      const status = score >= 85 ? 'good' : score >= 66 ? 'warn' : 'bad';
      const note = inWin === 0 ? '该位置几乎没有音节能量，疑似漏读或一带而过'
        : energyDiff < -5 ? '音量偏弱、吐字含糊' : '';
      if (status !== 'good') flagged.push({ word: w, status, note });
      return { word: w, score, status, note, heard: '', hints: phonemeHintsFor(w), estimated: true };
    });
  }
  accuracy = clamp(accuracy, 20, align ? 99 : 93);

  /* ---------- 汇总 ---------- */
  const W = weights || { accuracy: 0.5, fluency: 0.3, completeness: 0.2 };
  const wSum = W.accuracy + W.fluency + W.completeness || 1;
  const overall = (accuracy * W.accuracy + fluency * W.fluency + completeness * W.completeness) / wSum;

  /* ---------- 易错音素归因 ---------- */
  const issueMap = new Map();
  for (const f of flagged) {
    for (const h of phonemeHintsFor(f.word)) {
      if (!issueMap.has(h.symbol)) issueMap.set(h.symbol, { symbol: h.symbol, label: h.label, advice: h.advice, count: 0, words: [] });
      const it = issueMap.get(h.symbol);
      it.count += 1;
      if (it.words.length < 5 && !it.words.includes(f.word)) it.words.push(f.word);
    }
  }
  const issues = [...issueMap.values()].sort((a, b) => b.count - a.count).slice(0, 5);

  /* ---------- 生成建议 ---------- */
  const advice = [];
  if (!align) {
    advice.push('当前为离线声学估分：能判断节奏、停顿、音量与漏读倾向；如需精确到音素的判错，请接入 Azure 或腾讯云评测（见 README）。');
  }
  const missing = words.filter((w) => w.status === 'missing').map((w) => w.word);
  if (missing.length) advice.push(`有 ${missing.length} 个词没读出来：${missing.slice(0, 6).join('、')}。放慢速度，先把每个词都读完整，再追求流利。`);
  if (pauseRatio > 0.3) advice.push(`句中停顿占比 ${(pauseRatio * 100).toFixed(0)}%，偏碎。先跟着原音做「影子跟读」，按意群断句而不是逐词停。`);
  if (longPauses >= 2) advice.push(`出现 ${longPauses} 处长停顿（>0.5 秒），通常是遇到生词卡住。建议先逐词点读拿下难词，再整句跟读。`);
  if (rate < 2.3) advice.push(`语速约 ${rate.toFixed(1)} 音节/秒，偏慢。可把播放速度调到 0.9~1.0 倍跟读，逐步贴近原音节奏。`);
  if (rate > 5.2) advice.push(`语速约 ${rate.toFixed(1)} 音节/秒，偏快，容易吞掉词尾。刻意把每个词尾辅音送出来。`);
  if (snr < 14) advice.push('录音信噪比较低，环境噪声或距离太远会影响评分，请靠近麦克风并关闭风扇/外放。');
  if (syllRatio > 1.3 && !align) advice.push('检测到的音节数明显多于文本，可能有重复、口头语或背景人声。');
  for (const it of issues.slice(0, 2)) advice.push(`重点音素 ${it.symbol}（${it.label}）：${it.advice} 涉及词：${it.words.join('、')}。`);
  if (overall >= 88 && advice.length <= 1) advice.push('整体表现不错。下一步练语调与连读：注意句子重音落在实词上，功能词弱读。');
  if (!advice.length) advice.push('继续保持，建议提升难度或加入段落连读练习。');

  return {
    engine: 'offline',
    engineLabel: align ? '离线引擎 + 浏览器识别' : '离线声学引擎（估分）',
    estimated: true,
    overall: round(overall),
    accuracy: round(accuracy),
    fluency: round(fluency),
    completeness: round(completeness),
    durationMs,
    speechMs,
    transcript: transcript || '',
    words,
    issues,
    advice,
    metrics: {
      snr: +snr.toFixed(1),
      noiseFloor: +vad.noiseFloor.toFixed(1),
      rate: +rate.toFixed(2),
      pauseRatio: +pauseRatio.toFixed(3),
      longPauses,
      nuclei: nuclei.length,
      expectedSyll,
      articulation: +art.toFixed(3),
      segments: vad.segments.length,
    },
  };
}

export { adviceForSymbol };
