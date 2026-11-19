/**
 * 轻量数字信号处理：FFT / 功率谱 / Mel 滤波 / MFCC / 能量包络 / VAD / 音节核检测
 * 全部纯 JS，无第三方依赖。输入统一为 16kHz 单声道 Float32。
 */

/* ---------------- FFT（迭代基-2） ---------------- */
export function fftPower(frame, fftSize) {
  const re = new Float64Array(fftSize);
  const im = new Float64Array(fftSize);
  for (let i = 0; i < Math.min(frame.length, fftSize); i += 1) re[i] = frame[i];

  // bit reversal
  for (let i = 1, j = 0; i < fftSize; i += 1) {
    let bit = fftSize >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i]; re[i] = re[j]; re[j] = tr;
      const ti = im[i]; im[i] = im[j]; im[j] = ti;
    }
  }
  for (let len = 2; len <= fftSize; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < fftSize; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k += 1) {
        const ur = re[i + k];
        const ui = im[i + k];
        const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ur + vr;
        im[i + k] = ui + vi;
        re[i + k + len / 2] = ur - vr;
        im[i + k + len / 2] = ui - vi;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
  const bins = fftSize / 2 + 1;
  const pow = new Float64Array(bins);
  for (let i = 0; i < bins; i += 1) pow[i] = (re[i] * re[i] + im[i] * im[i]) / fftSize;
  return pow;
}

const hz2mel = (f) => 1127 * Math.log(1 + f / 700);
const mel2hz = (m) => 700 * (Math.exp(m / 1127) - 1);

export function melFilterbank(numFilters, fftSize, sampleRate, lowHz = 60, highHz = 7600) {
  const bins = fftSize / 2 + 1;
  const lo = hz2mel(lowHz);
  const hi = hz2mel(Math.min(highHz, sampleRate / 2));
  const points = new Array(numFilters + 2).fill(0).map((_, i) => {
    const mel = lo + ((hi - lo) * i) / (numFilters + 1);
    return Math.floor(((fftSize + 1) * mel2hz(mel)) / sampleRate);
  });
  const fb = [];
  for (let m = 1; m <= numFilters; m += 1) {
    const f = new Float64Array(bins);
    const l = points[m - 1];
    const c = points[m];
    const r = points[m + 1];
    for (let k = l; k < c; k += 1) if (c !== l && k < bins) f[k] = (k - l) / (c - l);
    for (let k = c; k <= r; k += 1) if (r !== c && k < bins) f[k] = (r - k) / (r - c);
    fb.push(f);
  }
  return fb;
}

function dct2(vec, numCoef) {
  const N = vec.length;
  const out = new Float64Array(numCoef);
  for (let k = 0; k < numCoef; k += 1) {
    let s = 0;
    for (let n = 0; n < N; n += 1) s += vec[n] * Math.cos((Math.PI * k * (n + 0.5)) / N);
    out[k] = s;
  }
  return out;
}

/**
 * 分帧计算特征
 * @returns {{ frames:number, hopMs:number, energyDb:Float64Array, mfcc:Float64Array[],
 *             centroid:Float64Array, zcr:Float64Array, flux:Float64Array }}
 */
export function computeFeatures(samples, sampleRate = 16000, opts = {}) {
  const winMs = opts.winMs || 25;
  const hopMs = opts.hopMs || 10;
  const win = Math.round((winMs * sampleRate) / 1000);
  const hop = Math.round((hopMs * sampleRate) / 1000);
  const fftSize = 512;
  const numFilters = 26;
  const numCoef = 13;
  const fb = melFilterbank(numFilters, fftSize, sampleRate);
  const hamming = new Float64Array(win);
  for (let i = 0; i < win; i += 1) hamming[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (win - 1));

  const nFrames = Math.max(0, Math.floor((samples.length - win) / hop) + 1);
  const energyDb = new Float64Array(nFrames);
  const centroid = new Float64Array(nFrames);
  const zcr = new Float64Array(nFrames);
  const flux = new Float64Array(nFrames);
  const mfcc = [];
  let prevPow = null;

  const frame = new Float64Array(win);
  for (let f = 0; f < nFrames; f += 1) {
    const start = f * hop;
    let sum2 = 0;
    let zc = 0;
    for (let i = 0; i < win; i += 1) {
      const s = samples[start + i] || 0;
      sum2 += s * s;
      if (i > 0 && ((s >= 0 && samples[start + i - 1] < 0) || (s < 0 && samples[start + i - 1] >= 0))) zc += 1;
      frame[i] = s * hamming[i];
    }
    const rms = Math.sqrt(sum2 / win);
    energyDb[f] = 20 * Math.log10(rms + 1e-10);
    zcr[f] = zc / win;

    const pow = fftPower(frame, fftSize);
    // 谱质心
    let num = 0;
    let den = 0;
    for (let k = 0; k < pow.length; k += 1) {
      const hz = (k * sampleRate) / fftSize;
      num += hz * pow[k];
      den += pow[k];
    }
    centroid[f] = den > 0 ? num / den : 0;

    // 谱通量（发音活跃度的粗指标）
    if (prevPow) {
      let d = 0;
      let n = 0;
      for (let k = 0; k < pow.length; k += 1) {
        const a = Math.log(pow[k] + 1e-10);
        const b = Math.log(prevPow[k] + 1e-10);
        d += Math.abs(a - b);
        n += 1;
      }
      flux[f] = d / n;
    }
    prevPow = pow;

    // Mel -> log -> DCT
    const mel = new Float64Array(numFilters);
    for (let m = 0; m < numFilters; m += 1) {
      let acc = 0;
      const filt = fb[m];
      for (let k = 0; k < pow.length; k += 1) acc += pow[k] * filt[k];
      mel[m] = Math.log(acc + 1e-10);
    }
    mfcc.push(dct2(mel, numCoef));
  }
  return { frames: nFrames, hopMs, winMs, energyDb, mfcc, centroid, zcr, flux, sampleRate };
}

export function percentile(arr, p) {
  if (!arr.length) return 0;
  const a = Array.from(arr).sort((x, y) => x - y);
  const i = Math.min(a.length - 1, Math.max(0, Math.round((p / 100) * (a.length - 1))));
  return a[i];
}

export function smooth(arr, radius = 3) {
  const n = arr.length;
  const out = new Float64Array(n);
  for (let i = 0; i < n; i += 1) {
    let s = 0;
    let c = 0;
    for (let j = Math.max(0, i - radius); j <= Math.min(n - 1, i + radius); j += 1) {
      s += arr[j];
      c += 1;
    }
    out[i] = s / c;
  }
  return out;
}

/**
 * 能量 VAD：返回语音片段（毫秒）与噪声底
 */
export function detectSpeech(energyDb, hopMs, opts = {}) {
  const noiseFloor = percentile(energyDb, 15);
  const peak = percentile(energyDb, 97);
  const dynamic = peak - noiseFloor;
  const thr = Math.max(noiseFloor + Math.max(6, dynamic * 0.28), peak - 32);
  const minSpeechMs = opts.minSpeechMs || 70;
  const minSilenceMs = opts.minSilenceMs || 140;

  const flags = new Array(energyDb.length).fill(false);
  for (let i = 0; i < energyDb.length; i += 1) flags[i] = energyDb[i] > thr;

  // 填补短静音
  const minSilFrames = Math.round(minSilenceMs / hopMs);
  let i = 0;
  while (i < flags.length) {
    if (!flags[i]) {
      let j = i;
      while (j < flags.length && !flags[j]) j += 1;
      if (i > 0 && j < flags.length && j - i < minSilFrames) for (let k = i; k < j; k += 1) flags[k] = true;
      i = j;
    } else i += 1;
  }
  // 去除过短语音
  const minSpFrames = Math.round(minSpeechMs / hopMs);
  const segments = [];
  i = 0;
  while (i < flags.length) {
    if (flags[i]) {
      const st = i;
      while (i < flags.length && flags[i]) i += 1;
      if (i - st >= minSpFrames) segments.push({ startMs: st * hopMs, endMs: i * hopMs, startFrame: st, endFrame: i });
    } else i += 1;
  }
  return { segments, noiseFloor, peak, threshold: thr, dynamic };
}

/**
 * 音节核检测（参考 De Jong & Wempe 思路的简化版）：
 * 在语音段内对平滑能量做峰值提取，峰值需高于阈值且与相邻谷值有足够落差。
 */
export function detectSyllableNuclei(energyDb, hopMs, vad) {
  const e = smooth(energyDb, 3);
  const nuclei = [];
  const minDistFrames = Math.round(90 / hopMs);
  const prominence = 2.2; // dB
  for (const seg of vad.segments) {
    const localPeak = percentile(e.slice(seg.startFrame, seg.endFrame), 95);
    const floor = Math.max(vad.threshold, localPeak - 22);
    let last = -Infinity;
    for (let i = seg.startFrame + 1; i < seg.endFrame - 1; i += 1) {
      if (e[i] <= e[i - 1] || e[i] < e[i + 1]) continue;
      if (e[i] < floor) continue;
      // 向两侧找谷
      let leftMin = e[i];
      for (let j = i; j >= Math.max(seg.startFrame, i - 25); j -= 1) leftMin = Math.min(leftMin, e[j]);
      let rightMin = e[i];
      for (let j = i; j <= Math.min(seg.endFrame - 1, i + 25); j += 1) rightMin = Math.min(rightMin, e[j]);
      const prom = e[i] - Math.max(leftMin, rightMin);
      if (prom < prominence) continue;
      if (i - last < minDistFrames) {
        if (nuclei.length && e[i] > e[last]) {
          nuclei[nuclei.length - 1] = i;
          last = i;
        }
        continue;
      }
      nuclei.push(i);
      last = i;
    }
  }
  return nuclei.map((f) => f * hopMs);
}

/** MFCC 一阶差分的平均幅度：越大说明发音器官动作越丰富（吐字清晰度代理指标） */
export function articulationActivity(mfcc, vad, hopMs) {
  if (mfcc.length < 3) return 0;
  const inSpeech = (f) => vad.segments.some((s) => f >= s.startFrame && f < s.endFrame);
  let sum = 0;
  let n = 0;
  for (let f = 1; f < mfcc.length; f += 1) {
    if (!inSpeech(f)) continue;
    let d = 0;
    for (let k = 1; k < mfcc[f].length; k += 1) d += Math.abs(mfcc[f][k] - mfcc[f - 1][k]);
    sum += d / (mfcc[f].length - 1);
    n += 1;
  }
  return n ? sum / n : 0;
}

/** DTW 距离（可用于与参考音频对比，预留） */
export function dtwDistance(a, b) {
  const n = a.length;
  const m = b.length;
  if (!n || !m) return Infinity;
  const dist = (x, y) => {
    let s = 0;
    for (let k = 1; k < Math.min(x.length, y.length); k += 1) s += (x[k] - y[k]) ** 2;
    return Math.sqrt(s);
  };
  let prev = new Float64Array(m + 1).fill(Infinity);
  let cur = new Float64Array(m + 1).fill(Infinity);
  prev[0] = 0;
  for (let i = 1; i <= n; i += 1) {
    cur.fill(Infinity);
    for (let j = 1; j <= m; j += 1) {
      const c = dist(a[i - 1], b[j - 1]);
      cur[j] = c + Math.min(prev[j], cur[j - 1], prev[j - 1]);
    }
    const t = prev;
    prev = cur;
    cur = t;
  }
  return prev[m] / (n + m);
}
