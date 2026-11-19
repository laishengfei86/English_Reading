/** 自然拼读：字形-音素规则库 + 拼读跟读 + 耳朵考试（听音辨拼 / 最小音素对）
 *  数据来自 public/data/phonics.json，全部规则 Tips 为项目原创编写。 */
import { $, $$, toast, esc, scoreClass } from './util.js';
import { settings } from './state.js';
import { api } from './api.js';
import { tts } from './tts.js';
import { Recorder } from './recorder.js';
import { afterPractice, sfx, confetti } from './fun.js';

const Ph = {
  data: null,
  mode: 'rules',      // rules | blend | ear
  groupFilter: 'all',
  rule: null,
  recording: false,
  stopWave: null,
  myAudio: new Audio(),
  // 耳朵考试状态
  quizItems: [],
  quizIdx: 0,
  quizRight: 0,
  answered: false,
  best: 0,
};

const recorder = new Recorder();

async function loadData() {
  if (Ph.data) return Ph.data;
  try {
    Ph.data = await (await fetch('/data/phonics.json', { cache: 'no-store' })).json();
  } catch { Ph.data = { groups: [], rules: [], pairs: [] }; }
  return Ph.data;
}

export function initPhonics() {
  loadData().then(() => { renderGroups(); renderRules(); });
  $$('.ph-mode-btn').forEach((b) => {
    b.onclick = () => setMode(b.dataset.mode);
  });
  $('#phBlendPrev').onclick = () => blendMove(-1);
  $('#phBlendNext').onclick = () => blendMove(1);
  $('#phBlendPlay').onclick = () => blendPlay(0);
  $('#phBlendRec').onclick = toggleBlendRecord;
  $('#phQuizRestart').onclick = () => startQuiz();
  $('#phQuizA').onclick = () => answer(0);
  $('#phQuizB').onclick = () => answer(1);
  $('#phQuizPlay').onclick = replayQuiz;
}

function setMode(m) {
  Ph.mode = m;
  $$('.ph-mode-btn').forEach((b) => b.classList.toggle('active', b.dataset.mode === m));
  $('#phRules').hidden = m !== 'rules';
  $('#phBlend').hidden = m !== 'blend';
  $('#phEar').hidden = m !== 'ear';
  stopBlendAudio();
  if (m === 'rules') renderRules();
  if (m === 'blend') renderBlend();
  if (m === 'ear') startQuiz();
}

/* ================= ① 规则卡 ================= */
function renderGroups() {
  const box = $('#phGroups');
  const all = [{ id: 'all', name: '全部', emoji: '📖' }];
  box.innerHTML = [...all, ...(Ph.data.groups || [])]
    .map((g) => `<button class="btn ${Ph.groupFilter === g.id ? 'primary' : 'ghost'} ph-g" data-g="${esc(g.id)}">${g.emoji || ''} ${esc(g.name)}</button>`)
    .join('');
  $$('#phGroups .ph-g').forEach((b) => {
    b.onclick = () => { Ph.groupFilter = b.dataset.g; renderGroups(); renderRules(); };
  });
}

function renderRules() {
  const list = (Ph.data.rules || []).filter((r) => Ph.groupFilter === 'all' || r.group === Ph.groupFilter);
  $('#phRules').hidden = Ph.mode !== 'rules';
  $('#phRuleList').innerHTML = list.map((r) => `
    <div class="ph-card" data-id="${esc(r.id)}">
      <div class="ph-head">
        <span class="ph-pat">${esc(r.pattern)}</span>
        <span class="ph-sound">${esc(r.sound)}</span>
      </div>
      <div class="ph-tip">${esc(r.tip)}</div>
      <div class="ph-eg">${(r.examples || []).map((w) => `<button class="ph-word" data-w="${esc(w)}">🔊 ${esc(w)}</button>`).join('')}</div>
      <button class="btn ghost ph-practice" data-practice="${esc(r.id)}">🎙 我来读</button>
    </div>`).join('');

  $$('#phRuleList .ph-word').forEach((b) => {
    b.onclick = (e) => { e.stopPropagation(); tts.speak(b.dataset.w, { rate: 0.85 }); };
  });
  $$('#phRuleList .ph-practice').forEach((b) => {
    b.onclick = (e) => {
      e.stopPropagation();
      const r = list.find((x) => x.id === b.dataset.practice);
      if (r) { Ph.rule = r; setMode('blend'); }
    };
  });
}

/* ================= ② 拼读跟读 ================= */
let blendIdx = 0;
function blendWords() { return Ph.rule?.examples || []; }

function renderBlend() {
  if (!Ph.rule && blendWords().length === 0) {
    const first = (Ph.data.rules || [])[0];
    if (first) Ph.rule = first;
  }
  const words = blendWords();
  if (!words.length) { $('#phBlendWord').textContent = '暂无单词'; return; }
  blendIdx = Math.max(0, Math.min(words.length - 1, blendIdx));
  const w = words[blendIdx];
  $('#phRuleTag').textContent = `${Ph.rule.pattern} ${Ph.rule.sound} · ${Ph.rule.label}`;
  $('#phBlendWord').textContent = w;
  $('#phBlendTip').textContent = Ph.rule.tip;
  $('#phBlendScore').textContent = '';
  $('#phBlendWordSel').innerHTML = words.map((x, i) => `<button class="btn ${i === blendIdx ? 'primary' : 'ghost'} ph-wsel" data-i="${i}">${esc(x)}</button>`).join('');
  $$('#phBlendWordSel .ph-wsel').forEach((b) => { b.onclick = () => { blendIdx = Number(b.dataset.i); renderBlend(); }; });
}

function blendMove(d) {
  const words = blendWords();
  blendIdx = (blendIdx + d + words.length) % words.length;
  stopBlendAudio();
  renderBlend();
}

/** 先慢速拆音–整词读一遍，帮助建立"形→音"连接 */
async function blendPlay() {
  const w = blendWords()[blendIdx];
  if (!w) return;
  stopBlendAudio();
  try {
    await tts.speak(w, { rate: 0.6 });   // 慢
    await tts.speak(w, { rate: 0.85 });  // 常速
  } catch { /* ignore */ }
}

function stopBlendAudio() { try { Ph.myAudio.pause(); } catch { /* ignore */ } }

async function toggleBlendRecord() { return Ph.recording ? blendStop() : blendStart(); }

async function blendStart() {
  stopBlendAudio();
  tts.stop?.();
  try { await recorder.start(); } catch (e) { toast(e.message || '无法开始录音'); return; }
  Ph.recording = true;
  const btn = $('#phBlendRec');
  btn.classList.add('rec');
  btn.textContent = '⏹ 停止';
  Ph.stopWave = recorder.drawTo($('#phWave'));
  setTimeout(() => { if (Ph.recording) blendStop(); }, 6000);
}

async function blendStop() {
  if (!Ph.recording) return;
  Ph.recording = false;
  Ph.stopWave?.();
  const btn = $('#phBlendRec');
  btn.classList.remove('rec');
  btn.textContent = '🎙 跟读这句';
  const rec = await recorder.stop();
  const w = blendWords()[blendIdx];
  if (rec.durationMs < 300) { toast('录音太短'); return; }
  try {
    $('#phBlendScore').textContent = '评分中…';
    const { result } = await api.assess({
      uid: settings.uid,
      text: w,
      audio: rec.base64,
      transcript: '',
      engine: settings.assessProvider,
      level: '',
      groupId: `phonics-${Ph.rule.id}`,
      itemId: `${Ph.rule.id}-${w}`,
      type: 'phonics',
    });
    $('#phBlendScore').innerHTML = `<b class="${scoreClass(result.overall) === 'good' ? 'good' : scoreClass(result.overall) === 'warn' ? 'warn' : 'bad'}">${result.overall} 分</b>　${result.overall >= 85 ? '很到位！' : result.overall >= 66 ? '接近了，再慢练一遍' : '注意口型，先听标准音再模仿'}`;
    afterPractice({ score: result.overall });
    if (result.overall >= 85) setTimeout(() => blendMove(1), 1500);
  } catch (e) {
    toast(`评分失败：${e.message}`);
    $('#phBlendScore').textContent = '';
  }
}

/* ================= ③ 耳朵考试（听音辨拼 + 最小音素对） ================= */
function startQuiz() {
  Ph.quizItems = buildQuiz();
  Ph.quizIdx = 0;
  Ph.quizRight = 0;
  Ph.answered = false;
  renderQuiz();
}

function buildQuiz() {
  const items = [];
  const rules = Ph.data.rules || [];
  // 一半：听音辨规则（判断单词属于哪一组拼写规律）
  const shuffled = [...rules].sort(() => Math.random() - 0.5).slice(0, 6);
  shuffled.forEach((r) => {
    const word = r.examples[(Math.random() * r.examples.length) | 0];
    items.push({ kind: 'rule', word, answerRule: r, options: [r, ...pickOthers(rules, r, 2)], type: 'rule' });
  });
  // 一半：最小音素对
  const pairs = [...(Ph.data.pairs || [])].sort(() => Math.random() - 0.5).slice(0, 4);
  pairs.forEach((p) => {
    const pickA = Math.random() < 0.5;
    items.push({ kind: 'pair', word: pickA ? p.a : p.b, answerPair: pickA ? p.a : p.b, type: 'pair', a: p.a, b: p.b, ipa: p.ipa, tip: p.tip });
  });
  return items.sort(() => Math.random() - 0.5).slice(0, 8);
}

function pickOthers(rules, exclude, n) {
  return rules.filter((r) => r.id !== exclude.id && r.group !== exclude.group)
    .sort(() => Math.random() - 0.5).slice(0, n);
}

function renderQuiz() {
  if (Ph.quizIdx >= Ph.quizItems.length) return finishQuiz();
  const it = Ph.quizItems[Ph.quizIdx];
  Ph.answered = false;
  $('#phQuizProgress').textContent = `第 ${Ph.quizIdx + 1} / ${Ph.quizItems.length} 题　·　已答对 ${Ph.quizRight}`;
  $('#phQuizFeedback').textContent = '';
  $('#phQuizA').hidden = it.type !== 'pair';
  $('#phQuizB').hidden = it.type !== 'pair';
  const optionBox = $('#phQuizOptions');
  if (it.type === 'pair') {
    $('#phQuizQuestion').innerHTML = `听到的是哪个词？<small class="muted">${esc(it.ipa)}</small>`;
    $('#phQuizA').textContent = it.a;
    $('#phQuizB').textContent = it.b;
    optionBox.innerHTML = '';
  } else {
    $('#phQuizQuestion').innerHTML = `听到 <b>${esc(it.word)}</b>，它属于哪种拼读规律？`;
    $('#phQuizOptions').innerHTML = (it.options || []).map((o, i) => `<button class="btn ghost ph-opt" data-i="${i}"><b>${esc(o.pattern)}</b> <span class="muted">${esc(o.sound)}</span></button>`).join('');
    $$('#phQuizOptions .ph-opt').forEach((b) => { b.onclick = () => answer(Number(b.dataset.i)); });
  }
  setTimeout(replayQuiz, 350);
}

function replayQuiz() {
  const it = Ph.quizItems[Ph.quizIdx];
  if (!it) return;
  tts.speak(it.word, { rate: 0.85 });
}

function answer(idx) {
  if (Ph.answered || !Ph.quizItems[Ph.quizIdx]) return;
  const it = Ph.quizItems[Ph.quizIdx];
  Ph.answered = true;
  let ok = false;
  if (it.type === 'pair') {
    ok = (idx === 0 ? it.a : it.b) === it.answerPair;
  } else {
    const picked = (it.options || [])[idx];
    ok = picked && picked.id === it.answerRule.id;
  }
  if (ok) {
    Ph.quizRight += 1;
    sfx('good');
    $('#phQuizFeedback').innerHTML = `<b class="good">✓ 答对了</b>　${esc(it.tip || it.answerRule?.tip || '')}`;
  } else {
    sfx('oops');
    const correct = it.type === 'pair' ? it.answerPair : it.answerRule.pattern;
    $('#phQuizFeedback').innerHTML = `<b class="bad">✗ 是「${esc(correct)}」</b>　${esc(it.tip || it.answerRule?.tip || '')}`;
  }
  tts.speak(it.word, { rate: 0.7 });
  setTimeout(() => { Ph.quizIdx += 1; renderQuiz(); }, 1900);
}

function finishQuiz() {
  const total = Ph.quizItems.length;
  const pct = Math.round((Ph.quizRight / total) * 100);
  if (pct > Ph.best) Ph.best = pct;
  $('#phQuizQuestion').textContent = `听力小测完成：${Ph.quizRight} / ${total}　（正确率 ${pct}%）`;
  $('#phQuizOptions').innerHTML = `<div class="muted">${pct >= 90 ? '耳朵很灵！可以挑战更快语速的句子了 🏆' : pct >= 70 ? '不错，再把错题的规则卡过一遍 👍' : '建议回到「规则卡」先建立形→音的连接，再回来测 💪'}</div>`;
  $('#phQuizFeedback').textContent = `本次最佳：${Ph.best}%`;
  $('#phQuizProgress').textContent = '点下方重测可以换一批题';
  $('#phQuizA').hidden = true;
  $('#phQuizB').hidden = true;
  if (pct >= 70) { confetti({ count: 90 }); sfx('perfect'); } else { sfx('good'); }
}

export async function loadPhonics() {
  if (!Ph.data) await loadData();
  if (Ph.mode === 'rules') renderRules();
}
