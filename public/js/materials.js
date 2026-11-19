/** 素材管理：内置分级素材 + 自定义文本 */
import { api } from './api.js';

export const lib = { levels: [], byId: new Map(), custom: [] };

export function splitSentences(text) {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (!t) return [];
  const parts = t
    .replace(/([.!?;])\s+(?=[A-Z"'“‘(])/g, '$1\u0001')
    .replace(/([.!?])\s*$/g, '$1\u0001')
    .split('\u0001')
    .map((s) => s.trim())
    .filter(Boolean);
  const out = [];
  for (const p of parts) {
    if (p.split(/\s+/).length <= 26) { out.push(p); continue; }
    let buf = [];
    for (const chunk of p.split(/,\s*/)) {
      buf.push(chunk);
      if (buf.join(', ').split(/\s+/).length >= 14) { out.push(buf.join(', ')); buf = []; }
    }
    if (buf.length) out.push(buf.join(', '));
  }
  return out;
}

export async function loadMaterials() {
  const data = await api.materials();
  lib.levels = data.levels || [];
  lib.byId.clear();
  for (const lv of lib.levels) {
    for (const g of lv.groups) {
      lib.byId.set(g.id, { ...g, levelId: lv.id, levelName: lv.name });
    }
  }
  return lib;
}

/** 把分组展开成练习条目列表 */
export function expandGroup(group) {
  if (!group) return [];
  if (group.type === 'paragraph') {
    const out = [];
    group.items.forEach((p, pi) => {
      splitSentences(p.text).forEach((s, si) => {
        out.push({
          text: s,
          zh: p.zh || '',
          zhIsParagraph: true,
          ipa: '',
          focus: p.focus || [],
          type: 'paragraph',
          itemId: `${group.id}-${pi}-${si}`,
          partOf: `段落 ${pi + 1} · 第 ${si + 1} 句`,
        });
      });
    });
    return out;
  }
  return group.items.map((it, i) => ({
    text: it.text,
    zh: it.zh || '',
    ipa: it.ipa || '',
    focus: it.focus || [],
    type: group.type,
    itemId: `${group.id}-${i}`,
  }));
}

/** 按空行把文本拆成段落（不强制分句），过滤空白段 */
export function splitParagraphs(text) {
  return String(text || '')
    .split(/\n\s*\n+|\r\n\s*\r\n+/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

/**
 * 自定义文本 -> 练习组
 * @param {string} title 标题
 * @param {string} text 原文
 * @param {'auto'|'paragraph'|'whole'} mode 朗读方式：
 *   auto      自动分句（逐句跟读，默认）
 *   paragraph 按空行分段，逐段朗读（不强制分句）
 *   whole     整篇为一条，一口气朗读
 */
export function makeCustomGroup(title, text, mode = 'auto') {
  let units;
  let unitLabel;
  if (mode === 'whole') {
    units = [String(text || '').replace(/\s+/g, ' ').trim()].filter(Boolean);
    unitLabel = '整篇';
  } else if (mode === 'paragraph') {
    units = splitParagraphs(text);
    if (!units.length) units = splitSentences(text);
    unitLabel = '段';
  } else {
    units = splitSentences(text);
    unitLabel = '句';
  }
  return {
    id: `custom-${Date.now().toString(36)}`,
    type: 'custom',
    splitMode: mode,
    title: title || '自定义文本',
    desc: `${units.length} ${unitLabel} · 自定义素材`,
    levelId: 'custom',
    levelName: '自定义',
    raw: String(text || ''),
    items: units.map((s) => ({ text: s, zh: '', ipa: '', focus: [] })),
  };
}
