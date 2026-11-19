/** 词根词缀：词族树浏览 + 拆词组义答题 + 配对小游戏
 *  数据 public/data/roots.json（词根/前缀/后缀 + 同族词），看清构词逻辑，生词也能猜大意。 */
import { $, $$, toast, esc } from './util.js';
import { tts } from './tts.js';
import { sfx, confetti, floatText, afterPractice } from './fun.js';

const R = {
  data: [],
  kind: 'all',
  mode: 'tree',
  // 答题
  quiz: [],
  qIdx: 0,
  qRight: 0,
  answered: false,
  // 配对
  pairs: [],
  leftSel: null,
  rightSel: null,
  pDone: 0,
  pWrong: 0,
};

async function loadData() {
  if (R.data.length) return R.data;
  try {
    R.data = (await (await fetch('/data/roots.json', { cache: 'no-store' })).json()).entries || [];
  } catch { R.data = []; }
  return R.data;
}

export function initRoots() {
  loadData().then(() => { renderKindTabs(); renderTree(); });
  $$('.rt-mode-btn').forEach((b) => { b.onclick = () => setMode(b.dataset.mode); });
  $('#rtQuizRestart').onclick = () => startQuiz();
  $('#rtPairRestart').onclick = () => startPairs();
}

function setMode(m) {
  R.mode = m;
  $$('.rt-mode-btn').forEach((b) => b.classList.toggle('active', b.dataset.mode === m));
  $('#rtTree').hidden = m !== 'tree';
  $('#rtQuizBox').hidden = m !== 'quiz';
  $('#rtPairBox').hidden = m !== 'pair';
  if (m === 'tree') renderTree();
  if (m === 'quiz') startQuiz();
  if (m === 'pair') startPairs();
}

/* ================= ① 词族树 ================= */
function renderKindTabs() {
  const kinds = [
    { id: 'all', name: '全部', emoji: '🌳' },
    { id: 'root', name: '词根', emoji: '🪵' },
    { id: 'prefix', name: '前缀', emoji: '◀️' },
    { id: 'suffix', name: '后缀', emoji: '▶️' },
  ];
  $('#rtKinds').innerHTML = kinds.map((k) => `<button class="btn ${R.kind === k.id ? 'primary' : 'ghost'} rt-kind" data-k="${k.id}">${k.emoji} ${k.name}</button>`).join('');
  $$('#rtKinds .rt-kind').forEach((b) => {
    b.onclick = () => { R.kind = b.dataset.k; renderKindTabs(); renderTree(); };
  });
}

function renderTree() {
  const list = R.data.filter((e) => R.kind === 'all' || e.kind === R.kind);
  const kindLabel = { root: '词根', prefix: '前缀', suffix: '后缀' };
  $('#rtTree').innerHTML = list.map((e) => `
    <div class="rt-node">
      <div class="rt-head">
        <span class="rt-kind-tag">${kindLabel[e.kind] || ''}</span>
        <span class="rt-form">${esc(e.form)}</span>
        <span class="rt-mean">${esc(e.meaning)}</span>
      </div>
      <div class="rt-tip">${esc(e.tip || '')}</div>
      <div class="rt-words">${(e.words || []).map((x) => `<button class="rt-word" data-w="${esc(x.w)}" data-zh="${esc(x.zh)}">${esc(x.w)}<i>${esc(x.zh)}</i></button>`).join('')}</div>
    </div>`).join('');
  $$('#rtTree .rt-word').forEach((b) => {
    b.onclick = () => {
      tts.speak(b.dataset.w, { rate: 0.85 });
      b.classList.add('said');
      setTimeout(() => b.classList.remove('said'), 900);
    };
  });
}

/* ================= ② 拆词组义答题 ================= */
function startQuiz() {
  const pool = R.data.filter((e) => e.kind === 'root');
  const items = shuffle([...pool]).slice(0, 8).map((e) => {
    const w = e.words[(Math.random() * e.words.length) | 0];
    const others = shuffle(pool.filter((x) => x.id !== e.id)).slice(0, 3);
    return { entry: e, word: w, options: shuffle([e, ...others]) };
  });
  R.quiz = items;
  R.qIdx = 0;
  R.qRight = 0;
  renderQuizItem();
}

function shuffle(a) { return a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((x) => x[1]); }

function renderQuizItem() {
  if (R.qIdx >= R.quiz.length) return finishQuiz();
  const it = R.quiz[R.qIdx];
  R.answered = false;
  $('#rtQuizProgress').textContent = `第 ${R.qIdx + 1} / ${R.quiz.length} 题　·　已答对 ${R.qRight}`;
  $('#rtQuizWord').textContent = it.word.w;
  $('#rtQuizZh').textContent = `中文：${it.word.zh}`;
  $('#rtQuizFeedback').textContent = '';
  $('#rtQuizOptions').innerHTML = it.options.map((o, i) => `<button class="btn ghost rt-opt" data-i="${i}"><b>${esc(o.form)}</b>　<span class="muted">${esc(o.meaning)}</span></button>`).join('');
  $$('#rtQuizOptions .rt-opt').forEach((b) => { b.onclick = () => pickQuiz(Number(b.dataset.i)); });
  tts.speak(it.word.w, { rate: 0.85 });
}

function pickQuiz(i) {
  if (R.answered) return;
  const it = R.quiz[R.qIdx];
  R.answered = true;
  const picked = it.options[i];
  const ok = picked.id === it.entry.id;
  if (ok) {
    R.qRight += 1;
    sfx('good');
    $('#rtQuizFeedback').innerHTML = `<b class="good">✓ 对！</b> ${esc(it.word.w)} = <b>${esc(it.entry.form)}</b>（${esc(it.entry.meaning)}）+ 其余部分。${esc(it.entry.tip || '')}`;
  } else {
    sfx('oops');
    $('#rtQuizFeedback').innerHTML = `<b class="bad">✗ 不对</b> ${esc(it.word.w)} 的核心是 <b>${esc(it.entry.form)}</b>（${esc(it.entry.meaning)}）。`;
  }
  tts.speak(it.word.w, { rate: 0.7 });
  setTimeout(() => { R.qIdx += 1; renderQuizItem(); }, 2100);
}

function finishQuiz() {
  const pct = Math.round((R.qRight / R.quiz.length) * 100);
  $('#rtQuizWord').textContent = `拆词组义：${R.qRight} / ${R.quiz.length}（正确率 ${pct}%）`;
  $('#rtQuizZh').textContent = '';
  $('#rtQuizOptions').innerHTML = `<div class="muted">${pct >= 80 ? '构词感很好！遇到生词试试先找词根 🧬' : pct >= 50 ? '有感觉了，多在「词族树」看看同一根还能长哪些词 🌳' : '建议先逛「词族树」，记住几个高频词根再回来 💪'}</div>`;
  $('#rtQuizFeedback').textContent = '';
  $('#rtQuizProgress').textContent = '点「换一批题」再来';
  if (pct >= 60) { confetti({ count: 90 }); sfx('perfect'); } else { sfx('good'); }
  afterPractice({ score: pct, silent: true }); // 计入成长，不再叠一次彩带
}

/* ================= ③ 配对小游戏 ================= */
function startPairs() {
  const pool = shuffle([...R.data]).slice(0, 6);
  R.pairs = pool.map((e) => ({ id: e.id, meaning: e.meaning, done: false }));
  R.leftSel = null;
  R.rightSel = null;
  R.pDone = 0;
  R.pWrong = 0;
  renderPairs();
}

function renderPairs() {
  const left = shuffle([...R.pairs]);
  const right = shuffle([...R.pairs]);
  $('#rtPairLeft').innerHTML = left.map((p) => {
    const e = R.data.find((x) => x.id === p.id);
    return `<button class="rt-pl ${p.done ? 'done' : ''}" data-id="${p.id}">${esc(e.form)}</button>`;
  }).join('');
  $('#rtPairRight').innerHTML = right.map((p) => `<button class="rt-pr ${p.done ? 'done' : ''}" data-id="${p.id}">${esc(p.meaning)}</button>`).join('');
  $('#rtPairStat').textContent = `已配对 ${R.pDone} / ${R.pairs.length}　·　失误 ${R.pWrong}`;

  $$('#rtPairLeft .rt-pl').forEach((b) => { b.onclick = () => pickSide(b, 'left'); });
  $$('#rtPairRight .rt-pr').forEach((b) => { b.onclick = () => pickSide(b, 'right'); });
}

function pickSide(btn, side) {
  if (btn.classList.contains('done')) return;
  if (side === 'left') {
    clearSel('#rtPairLeft .rt-pl');
    btn.classList.add('sel');
    R.leftSel = btn.dataset.id;
  } else {
    clearSel('#rtPairRight .rt-pr');
    btn.classList.add('sel');
    R.rightSel = btn.dataset.id;
  }
  if (R.leftSel && R.rightSel) judgePair();
}

function clearSel(sel) { $$(sel).forEach((e) => e.classList.remove('sel')); }

function judgePair() {
  const ok = R.leftSel === R.rightSel;
  if (ok) {
    const p = R.pairs.find((x) => x.id === R.leftSel);
    p.done = true;
    R.pDone += 1;
    sfx('good');
    floatText('✓ 配对成功', {});
    const e = R.data.find((x) => x.id === p.id);
    $('#rtPairHint').innerHTML = `<b>${esc(e.form)}</b> = ${esc(e.meaning)}　<small class="muted">${esc(e.tip || '')}</small>`;
    tts.speak((e.words[0] || {}).w || '', { rate: 0.85 });
  } else {
    R.pWrong += 1;
    sfx('oops');
    floatText('✗ 不对哦', { cls: 'bad' });
    setTimeout(() => { clearSel('#rtPairLeft .rt-pl'); clearSel('#rtPairRight .rt-pr'); }, 400);
  }
  R.leftSel = null;
  R.rightSel = null;
  setTimeout(() => {
    renderPairs();
    if (R.pDone === R.pairs.length) {
      confetti({ count: 110, power: 1.3 });
      sfx('fanfare');
      toast(`全部配对完成！失误 ${R.pWrong} 次 🎉`);
      $('#rtPairHint').innerHTML = '<b class="good">全部配对完成！</b> 🎉';
      afterPractice({ score: Math.max(40, 100 - R.pWrong * 8), silent: true });
    }
  }, 500);
}

export async function loadRoots() {
  if (!R.data.length) await loadData();
  if (R.mode === 'tree') renderTree();
}
