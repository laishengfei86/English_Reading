/**
 * 参考文本 与 识别文本 的词级对齐（用于「有转写结果」时给出真实的读错/漏读判定）
 */

function levenshtein(a, b) {
  const n = a.length;
  const m = b.length;
  if (!n) return m;
  if (!m) return n;
  let prev = new Array(m + 1);
  let cur = new Array(m + 1);
  for (let j = 0; j <= m; j += 1) prev[j] = j;
  for (let i = 1; i <= n; i += 1) {
    cur[0] = i;
    for (let j = 1; j <= m; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    const t = prev;
    prev = cur;
    cur = t;
  }
  return prev[m];
}

/** 简化音形码：把中文学习者常混淆的音归并，便于判断“接近但不准” */
export function phoneticKey(word) {
  let w = String(word || '').toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return '';
  w = w
    .replace(/th/g, '0')
    .replace(/sh|ti(?=on)|ci(?=a)/g, 'S')
    .replace(/ch|tch/g, 'C')
    .replace(/ph/g, 'f')
    .replace(/ck|q/g, 'k')
    .replace(/ng/g, 'N')
    .replace(/[vw]/g, 'V')
    .replace(/[lr]/g, 'L')
    .replace(/[zs]/g, 'S')
    .replace(/[mn]/g, 'M')
    .replace(/[bp]/g, 'B')
    .replace(/[dt]/g, 'D')
    .replace(/[gk]/g, 'K')
    .replace(/[aeiouy]+/g, 'A')
    .replace(/(.)\1+/g, '$1');
  return w;
}

export function similarity(a, b) {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const s1 = String(a).toLowerCase();
  const s2 = String(b).toLowerCase();
  if (s1 === s2) return 1;
  const raw = 1 - levenshtein(s1, s2) / Math.max(s1.length, s2.length);
  const k1 = phoneticKey(s1);
  const k2 = phoneticKey(s2);
  const pho = k1 && k2 ? 1 - levenshtein(k1, k2) / Math.max(k1.length, k2.length) : 0;
  return Math.max(0, Math.min(1, 0.45 * raw + 0.55 * pho));
}

/**
 * DP 对齐：返回与 ref 等长的结果数组 + 插入词数
 * status: match(完全一致) | near(音近，判为不准) | wrong(读错) | missing(漏读)
 */
export function alignWords(refTokens, hypTokens) {
  const n = refTokens.length;
  const m = hypTokens.length;
  const DEL = 1;
  const INS = 1;
  const dp = Array.from({ length: n + 1 }, () => new Float64Array(m + 1));
  const bt = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(''));
  for (let i = 1; i <= n; i += 1) { dp[i][0] = i * DEL; bt[i][0] = 'd'; }
  for (let j = 1; j <= m; j += 1) { dp[0][j] = j * INS; bt[0][j] = 'i'; }
  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      const sim = similarity(refTokens[i - 1], hypTokens[j - 1]);
      const sub = dp[i - 1][j - 1] + (1 - sim);
      const del = dp[i - 1][j] + DEL;
      const ins = dp[i][j - 1] + INS;
      const min = Math.min(sub, del, ins);
      dp[i][j] = min;
      bt[i][j] = min === sub ? 's' : min === del ? 'd' : 'i';
    }
  }
  const result = new Array(n).fill(null);
  let insertions = 0;
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const op = i === 0 ? 'i' : j === 0 ? 'd' : bt[i][j];
    if (op === 's') {
      const sim = similarity(refTokens[i - 1], hypTokens[j - 1]);
      const status = sim >= 0.995 ? 'match' : sim >= 0.72 ? 'near' : 'wrong';
      result[i - 1] = { hyp: hypTokens[j - 1], sim, status };
      i -= 1; j -= 1;
    } else if (op === 'd') {
      result[i - 1] = { hyp: '', sim: 0, status: 'missing' };
      i -= 1;
    } else {
      insertions += 1;
      j -= 1;
    }
  }
  for (let k = 0; k < n; k += 1) if (!result[k]) result[k] = { hyp: '', sim: 0, status: 'missing' };
  return { result, insertions };
}
