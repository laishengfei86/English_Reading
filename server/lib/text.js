/**
 * 英文文本处理：分句、分词、音节估算、中文学习者易错音素规则库
 */

export function splitSentences(text) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (!t) return [];
  const parts = t
    .replace(/([.!?;])\s+(?=[A-Z"'“‘(])/g, '$1\u0001')
    .replace(/([.!?])\s*$/g, '$1\u0001')
    .split('\u0001')
    .map((s) => s.trim())
    .filter(Boolean);
  // 过长的句子按逗号再切一次（便于跟读）
  const out = [];
  for (const p of parts) {
    if (p.split(/\s+/).length <= 26) {
      out.push(p);
      continue;
    }
    let buf = [];
    for (const chunk of p.split(/,\s*/)) {
      buf.push(chunk);
      if (buf.join(', ').split(/\s+/).length >= 14) {
        out.push(buf.join(', '));
        buf = [];
      }
    }
    if (buf.length) out.push(buf.join(', '));
  }
  return out;
}

export function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[’']/g, "'")
    .match(/[a-z']+(?:-[a-z']+)*|\d+/g) || [];
}

export function words(text) {
  return String(text || '').split(/(\s+)/).filter((s) => s.trim().length);
}

/** 音节数估算（启发式，覆盖常见英文拼写规则） */
export function countSyllables(word) {
  let w = String(word || '').toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const exceptions = {
    business: 2, every: 2, different: 3, interesting: 3, comfortable: 4, chocolate: 3,
    vegetable: 4, restaurant: 3, favorite: 3, family: 3, camera: 3, several: 3,
    beautiful: 3, people: 2, science: 2, quiet: 2, area: 3, idea: 3, being: 2,
  };
  if (exceptions[w] !== undefined) return exceptions[w];
  w = w.replace(/(?:[^laeiouy]es|[^laeiouy]e)$/, '');
  w = w.replace(/^y/, '');
  const groups = w.match(/[aeiouy]{1,2}/g) || [];
  let n = groups.length;
  if (/[^aeiou]le$/.test(String(word).toLowerCase())) n += 1;
  if (/(ia|io|ua|eo|ie[ns]|ual|uet)/.test(w)) n += 1;
  if (/ism$/.test(w)) n += 1;
  return Math.max(1, n);
}

export function totalSyllables(text) {
  return tokenize(text).reduce((s, w) => s + countSyllables(w), 0) || 1;
}

/* ---------------- 中文学习者易错音素规则库 ---------------- */
export const PHONEME_RULES = [
  {
    id: 'th',
    symbol: 'θ / ð',
    label: '齿间擦音 th',
    test: (w) => /th/.test(w),
    advice: '舌尖轻触上齿边缘并送气，不要读成 /s/ 或 /d/。think=θ（清）、this=ð（浊）。',
  },
  {
    id: 'v',
    symbol: 'v',
    label: '唇齿音 v',
    test: (w) => /v/.test(w),
    advice: '上齿轻咬下唇并振动声带，不要读成 /w/。对比 very / berry、vine / wine。',
  },
  {
    id: 'w',
    symbol: 'w',
    label: '圆唇滑音 w',
    test: (w) => /^w|[aeiou]w[aeiou]/.test(w),
    advice: '双唇收圆突出，声带振动，与 /v/ 区分：舌与齿不接触。',
  },
  {
    id: 'r',
    symbol: 'ɹ / ɚ',
    label: '美式卷舌 r',
    test: (w) => /r/.test(w),
    advice: '舌尖后卷但不碰上颚，美音里词尾 r 要发出来：car、water、better。',
  },
  {
    id: 'l-dark',
    symbol: 'l (dark)',
    label: '词尾暗 l',
    test: (w) => /l$|l[bcdfgkmnpqstvz]/.test(w),
    advice: '舌尖抵上齿龈并保持，别加“喔/额”的尾音：feel、milk、school。',
  },
  {
    id: 'i-long-short',
    symbol: 'iː / ɪ',
    label: '长短音 i',
    test: (w) => /(ee|ea|ie)/.test(w) || /^[^aeiou]*i[^aeiou]+$/.test(w),
    advice: '/iː/ 拉长、嘴角展开；/ɪ/ 短而松弛。对比 sheep / ship、eat / it。',
  },
  {
    id: 'ae',
    symbol: 'æ',
    label: '前低元音 æ',
    test: (w) => /^[^aeiou]*a[^aeiou]{1,2}([aeiou]?)$/.test(w) && !/a[iy]|au|aw|ar/.test(w),
    advice: '嘴张大、舌位前低，接近“哎”但更扁：cat、bad、apple。别读成 /e/。',
  },
  {
    id: 'er',
    symbol: 'ɝ / ɚ',
    label: '中央卷舌元音',
    test: (w) => /(er|ir|ur|or|ar)$|(er|ir|ur)[^aeiou]/.test(w),
    advice: '舌位居中、舌尖微卷，全程稳定：bird、work、teacher、doctor。',
  },
  {
    id: 'ng',
    symbol: 'ŋ',
    label: '软腭鼻音 ng',
    test: (w) => /ng/.test(w),
    advice: '舌后部抵软腭，气流从鼻腔出来，不要在后面加 /g/：sing、morning。',
  },
  {
    id: 'sh-s',
    symbol: 'ʃ / s',
    label: 'sh 与 s',
    test: (w) => /sh|ti[ao]n|ci[ao]/.test(w),
    advice: '/ʃ/ 双唇略突、舌面靠后；/s/ 舌尖靠齿龈。对比 she / see。',
  },
  {
    id: 'ch-j',
    symbol: 'tʃ / dʒ',
    label: '塞擦音 ch / j',
    test: (w) => /ch|tch|^j|dge|ge$/.test(w),
    advice: '先闭塞再释放摩擦，注意 /dʒ/ 要振动声带：change、job、bridge。',
  },
  {
    id: 's-endings',
    symbol: '-s / -z / -ɪz',
    label: '词尾 s 的三种读法',
    test: (w) => /[a-z]s$/.test(w) && !/ss$|us$/.test(w),
    advice: '清音后读 /s/（books），浊音/元音后读 /z/（dogs），s/z/ʃ/tʃ 后读 /ɪz/（watches）。',
  },
  {
    id: 'ed-endings',
    symbol: '-t / -d / -ɪd',
    label: '词尾 ed 的三种读法',
    test: (w) => /ed$/.test(w) && w.length > 3,
    advice: '清音后 /t/（worked），浊音后 /d/（played），t/d 后 /ɪd/（wanted）。',
  },
  {
    id: 'cluster',
    symbol: 'CC 辅音连缀',
    label: '辅音连缀',
    test: (w) => /(str|spl|spr|scr|thr|shr|tr|dr|pl|bl|cl|fl|gl|sp|st|sk|sm|sn|tw)/.test(w),
    advice: '连缀之间不要插入元音（street 不是 si-tu-reet），一次成型送出。',
  },
  {
    id: 'final-stop',
    symbol: '词尾爆破音',
    label: '词尾 p/t/k/b/d/g',
    test: (w) => /[ptkbdg]$/.test(w),
    advice: '词尾要有清晰的成阻，可轻微不完全爆破，但不能整个吞掉或加元音。',
  },
  {
    id: 'diph',
    symbol: 'oʊ / aʊ / ɔɪ',
    label: '双元音',
    test: (w) => /(ow|ou|oa|oi|oy|oe)/.test(w),
    advice: '双元音要有滑动过程，前长后短：go、how、boy，别读成单一元音。',
  },
  {
    id: 'schwa',
    symbol: 'ə',
    label: '弱读 schwa',
    test: (w) => countSyllables(w) >= 3,
    advice: '多音节词只有一个重音，其余元音弱化为 /ə/，节奏才自然：computer /kəmˈpjuːtər/。',
  },
];

/** 取某个单词涉及的易错音素（按优先级最多 3 个） */
export function phonemeHintsFor(word) {
  const w = String(word || '').toLowerCase().replace(/[^a-z']/g, '');
  if (!w) return [];
  const hits = [];
  for (const r of PHONEME_RULES) {
    try {
      if (r.test(w)) hits.push({ id: r.id, symbol: r.symbol, label: r.label, advice: r.advice });
    } catch { /* ignore */ }
  }
  return hits.slice(0, 3);
}

/** 由 Azure/腾讯返回的音素串归一化到规则库（用于统计高频错误音素） */
export function normalizePhoneme(p) {
  const s = String(p || '').toLowerCase().replace(/[0-9]/g, '');
  const map = {
    th: 'θ / ð', dh: 'θ / ð', v: 'v', w: 'w', r: 'ɹ / ɚ', er: 'ɝ / ɚ', l: 'l (dark)',
    iy: 'iː / ɪ', ih: 'iː / ɪ', ae: 'æ', ng: 'ŋ', sh: 'ʃ / s', s: 'ʃ / s', ch: 'tʃ / dʒ',
    jh: 'tʃ / dʒ', ow: 'oʊ / aʊ / ɔɪ', aw: 'oʊ / aʊ / ɔɪ', oy: 'oʊ / aʊ / ɔɪ', ah: 'ə',
    ax: 'ə', z: '-s / -z / -ɪz', t: '词尾爆破音', d: '词尾爆破音', k: '词尾爆破音',
    p: '词尾爆破音', b: '词尾爆破音', g: '词尾爆破音',
  };
  return map[s] || s;
}

export function adviceForSymbol(symbol) {
  const r = PHONEME_RULES.find((x) => x.symbol === symbol);
  return r ? r.advice : '多听原音、慢速模仿，注意口型与舌位。';
}
