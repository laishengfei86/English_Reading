/** 练习页：听读 -> 跟读 -> 复读对比 -> 评分 */
import { $, $$, toast, fmtTime, esc, splitWordTokens, scoreClass, sleep, normalizeWords, wordSimilarity } from './util.js';
import { settings, saveSettings, caps } from './state.js';
import { api } from './api.js';
import { tts } from './tts.js';
import { Recorder, Asr } from './recorder.js';
import { lib, expandGroup, makeCustomGroup } from './materials.js';
import { afterPractice, sfx, confetti, hitCombo, rewardSmall } from './fun.js';

const P = {
  group: null,
  items: [],
  index: 0,
  scores: new Map(),
  recording: false,
  rec: null,
  myAudio: new Audio(),
  lastResult: null,
  playToken: 0,
  stopWave: null,
  timerId: null,
};

const recorder = new Recorder();
const asr = new Asr();

/* ================= 素材选择 ================= */
export function initPractice() {
  const levelSel = $('#levelSelect');
  levelSel.innerHTML = lib.levels.map((l) => `<option value="${l.id}">${esc(l.name)} · ${esc(l.desc)}</option>`).join('')
    + '<option value="custom">自定义素材</option>';
  levelSel.value = settings.lastLevel || lib.levels[0]?.id;
  levelSel.onchange = () => { settings.lastLevel = levelSel.value; saveSettings(); fillGroups(); };
  $('#groupSelect').onchange = () => {
    const g = lib.byId.get($('#groupSelect').value);
    if (g) loadGroup(g);
  };
  $$('#modeSwitch .seg-btn').forEach((b) => b.classList.toggle('on', b.dataset.mode === settings.mode));
  $('#modeTip').textContent = settings.mode === 'dictation'
    ? '听一句，拼一句，答错的自动进单词本'
    : '听一句，读一句，自动评分';
  fillGroups();
  bindControls();
  bindKeys();
}

function fillGroups() {
  const lvId = $('#levelSelect').value;
  const groupSel = $('#groupSelect');
  if (lvId === 'custom') {
    const customs = lib.custom || [];
    groupSel.innerHTML = customs.length
      ? customs.map((c) => `<option value="${c.id}">${esc(c.title)}</option>`).join('')
      : '<option value="">（还没有自定义素材，去「素材」页添加）</option>';
    const first = customs[0];
    if (first) loadGroup(first);
    else {
      P.items = [];
      renderList();
      $('#sentenceText').textContent = '到「素材」页粘贴一段英文即可开始';
    }
    return;
  }
  const lv = lib.levels.find((l) => l.id === lvId) || lib.levels[0];
  // 当组标题为 "版本 · 主题 · 类型" 时，按主题用 <optgroup> 分组，避免 60+ 选项扁平化
  const groups = lv?.groups || [];
  const byTheme = new Map();
  let hasTheme = false;
  for (const g of groups) {
    const parts = (g.title || '').split(' · ');
    const version = parts.length >= 3 ? parts[0].trim() : '';
    const theme = parts.length >= 3 ? parts[1].trim() : '';
    const type = parts.length >= 3 ? parts[2].trim() : g.title;
    if (theme) hasTheme = true;
    const key = theme || type;
    if (!byTheme.has(key)) byTheme.set(key, { theme, items: [] });
    // 同一主题下有多个版本，选项标签必须带版本名，否则会看起来像"核心词汇/实用句型/阅读段落"重复
    const label = version ? `${version} · ${type}` : type;
    byTheme.get(key).items.push({ id: g.id, label });
  }
  groupSel.innerHTML = hasTheme
    ? Array.from(byTheme.entries()).map(([key, { theme, items }]) =>
        `<optgroup label="${esc(theme || key)}">${items.map((it) => `<option value="${it.id}">${esc(it.label)}</option>`).join('')}</optgroup>`
      ).join('')
    : groups.map((g) => `<option value="${g.id}">${esc(g.title)}</option>`).join('');
  const want = lv.groups.find((g) => g.id === settings.lastGroup) || lv.groups[0];
  if (want) {
    groupSel.value = want.id;
    loadGroup(lib.byId.get(want.id) || want);
  }
}

export function loadGroup(group, startIndex = 0) {
  P.group = group;
  P.items = group.type === 'custom'
    ? group.items.map((it, i) => ({ ...it, type: 'custom', itemId: `${group.id}-${i}` }))
    : expandGroup(group);
  P.index = Math.min(startIndex, Math.max(0, P.items.length - 1));
  P.scores.clear();
  settings.lastGroup = group.id;
  if (group.levelId) settings.lastLevel = group.levelId;
  saveSettings();
  $('#groupDesc').textContent = group.desc || `${P.items.length} 条`;
  renderList();
  select(P.index, false);
  showCustomMode(group);
  if (settings.mode === 'dictation') $('#customModeRow').hidden = true;
  closeSide();
}

/** 自定义素材：练习时可直接切换「分句 / 段落 / 整篇」朗读方式 */
function showCustomMode(group) {
  const row = $('#customModeRow');
  if (!row) return;
  if (group && group.type === 'custom' && group.raw) {
    row.hidden = false;
    const cur = group.splitMode || 'auto';
    row.querySelectorAll('.seg-btn').forEach((b) => {
      b.classList.toggle('on', b.dataset.m === cur);
      b.onclick = async () => {
        const mode = b.dataset.m;
        if (mode === (P.group.splitMode || 'auto')) return;
        const ng = makeCustomGroup(P.group.title, P.group.raw, mode);
        ng.id = P.group.id;
        ng.splitMode = mode;
        lib.byId.set(ng.id, ng);
        // 已保存素材则回写 mode，与素材页保持一致
        const saved = (lib.custom || []).find((x) => x.id === P.group.id);
        if (saved) {
          saved.splitMode = mode;
          api.updateCustomText(settings.uid, P.group.id, { mode }).catch(() => {});
        }
        loadGroup(ng, 0);
      };
    });
  } else {
    row.hidden = true;
  }
}

function renderList() {
  const ol = $('#itemList');
  ol.innerHTML = P.items.map((it, i) => {
    const sc = P.scores.get(it.itemId);
    const cls = sc == null ? '' : scoreClass(sc);
    return `<li data-i="${i}" class="${i === P.index ? 'active' : ''}">
      <span class="idx">${i + 1}</span>
      <span class="en">${esc(it.text)}</span>
      ${sc == null ? '' : `<span class="sc" style="color:var(--${cls === 'good' ? 'good' : cls === 'warn' ? 'warn' : 'bad'})">${sc}</span>`}
    </li>`;
  }).join('');
  $$('#itemList li').forEach((li) => { li.onclick = () => select(Number(li.dataset.i)); });
}

function select(i, autoPlay = true) {
  if (!P.items.length) return;
  P.index = (i + P.items.length) % P.items.length;
  const it = P.items[P.index];
  renderList();
  $('#itemList li.active')?.scrollIntoView({ block: 'nearest' });
  $('#counter').textContent = `${P.index + 1} / ${P.items.length}`;
  $('#crumb').textContent = `${P.group?.levelName || ''} · ${P.group?.title || ''}${it.partOf ? ` · ${it.partOf}` : ''}`;

  // 句子（逐词可点）
  const tokens = splitWordTokens(it.text);
  $('#sentenceText').innerHTML = tokens.map((t, ti) => (t.space
    ? ' '
    : `${esc(t.pre)}<span class="w" data-w="${esc(t.word)}" data-ti="${ti}">${esc(t.word)}</span>${esc(t.post)}`)).join('');
  $$('#sentenceText .w').forEach((el) => {
    el.onclick = async () => {
      el.classList.add('speaking');
      await tts.speak(el.dataset.w, { rate: Math.min(1, settings.rate) });
      el.classList.remove('speaking');
      showWordHints(el.dataset.w);
    };
  });

  $('#sentenceIpa').textContent = it.ipa || '';
  const zh = $('#sentenceZh');
  zh.textContent = it.zh || '';
  zh.style.fontSize = it.zhIsParagraph ? '12.5px' : '14px';
  $('#focusRow').innerHTML = (it.focus || []).map((f) => `<span class="tag">重点 ${esc(f)}</span>`).join('');

  resetRecordingUI();
  $('#resultCard').hidden = true;
  P.lastResult = null;
  if (settings.mode === 'dictation') {
    enterDictation(it);
  } else {
    exitDictation();
    if (autoPlay) play();
  }
}

/* ================= 播放 ================= */
async function play(rateOverride) {
  if (!P.items.length) return;
  const token = ++P.playToken;
  const btn = $('#playBtn');
  btn.textContent = '⏹ 停止';
  btn.classList.add('primary');
  const text = P.items[P.index].text;
  do {
    await tts.speak(text, { rate: rateOverride || settings.rate });
    if (token !== P.playToken) return;
    if (settings.loop) await sleep(650);
  } while (settings.loop && token === P.playToken);

  btn.textContent = '▶ 播放原音';
  if (settings.autoNext && token === P.playToken) {
    await sleep(400);
    if (token === P.playToken) select(P.index + 1, true);
  }
}

function stopPlay() {
  P.playToken += 1;
  tts.stop();
  $('#playBtn').textContent = '▶ 播放原音';
}

/* ================= 录音 ================= */
function resetRecordingUI() {
  P.rec = null;
  $('#playMineBtn').disabled = true;
  $('#abBtn').disabled = true;
  $('#scoreBtn').disabled = true;
  $('#resetRecBtn').disabled = true;
  $('#dlBtn').hidden = true;
  $('#recTimer').textContent = '00:00';
  $('#recTip').textContent = settings.autoScore ? '跟读后自动评分' : '录完点「重新评分」';
}

async function toggleRecord() {
  if (P.recording) return stopRecord();
  return startRecord();
}

async function startRecord() {
  stopPlay();
  try {
    await recorder.start();
  } catch (e) {
    toast(e.message || '无法开始录音');
    return;
  }
  if (settings.useAsr && asr.available) asr.start();
  P.recording = true;
  const mic = $('#micBtn');
  mic.classList.add('rec');
  mic.querySelector('.mic-text').textContent = '点击停止';
  P.stopWave = recorder.drawTo($('#waveCanvas'));
  // 录音上限随文本长度自适应：整段/整篇不被 60s 提前截断（每词约 1.2s，上限 5 分钟）
  const words = (P.items[P.index]?.text || '').split(/\s+/).filter(Boolean).length;
  const maxMs = Math.min(300000, Math.max(60000, words * 1200));
  const t0 = Date.now();
  P.timerId = setInterval(() => {
    const ms = Date.now() - t0;
    $('#recTimer').textContent = fmtTime(ms);
    if (ms > maxMs) { toast('已到本次录音时长上限'); stopRecord(); }
  }, 200);
}

async function stopRecord() {
  if (!P.recording) return;
  P.recording = false;
  clearInterval(P.timerId);
  P.stopWave?.();
  const mic = $('#micBtn');
  mic.classList.remove('rec');
  mic.querySelector('.mic-text').textContent = '按此录音';

  const rec = await recorder.stop();
  const transcript = settings.useAsr && asr.available ? await asr.stop() : '';
  if (rec.durationMs < 350) {
    toast('录音太短了，按住说完整一句再松手');
    resetRecordingUI();
    return;
  }
  P.rec = { ...rec, transcript };
  $('#playMineBtn').disabled = false;
  $('#abBtn').disabled = false;
  $('#scoreBtn').disabled = false;
  $('#resetRecBtn').disabled = false;
  const dl = $('#dlBtn');
  dl.href = rec.url;
  dl.hidden = false;
  if (settings.autoScore) doAssess();
  else $('#recTip').textContent = '录音已就绪，点「重新评分」';
}

function playMine() {
  if (!P.rec) return;
  stopPlay();
  P.myAudio.src = P.rec.url;
  P.myAudio.playbackRate = 1;
  P.myAudio.play().catch(() => toast('播放失败，请重录一次'));
}

async function abCompare() {
  if (!P.rec) return;
  stopPlay();
  $('#recTip').textContent = '① 原音…';
  await tts.speak(P.items[P.index].text, { rate: settings.rate });
  await sleep(320);
  $('#recTip').textContent = '② 我的录音…';
  await new Promise((resolve) => {
    P.myAudio.src = P.rec.url;
    P.myAudio.onended = resolve;
    P.myAudio.onerror = resolve;
    P.myAudio.play().catch(resolve);
  });
  $('#recTip').textContent = '对比完成，可继续重录';
}

/* ================= 评分 ================= */
async function doAssess() {
  if (!P.rec) { toast('请先录音'); return; }
  const btn = $('#scoreBtn');
  const old = btn.textContent;
  btn.disabled = true;
  btn.textContent = '⏳ 评分中…';
  $('#recTip').textContent = '正在分析发音…';
  try {
    const it = P.items[P.index];
    const { result } = await api.assess({
      uid: settings.uid,
      text: it.text,
      audio: P.rec.base64,
      transcript: P.rec.transcript || '',
      engine: settings.assessProvider,
      level: P.group?.levelName || '',
      groupId: P.group?.id || '',
      itemId: it.itemId,
      type: it.type,
    });
    P.lastResult = result;
    P.scores.set(it.itemId, result.overall);
    renderList();
    renderResult(result);
    window.dispatchEvent(new CustomEvent('practice:scored', { detail: result }));
    $('#recTip').textContent = `本次 ${result.overall} 分`;
    afterPractice({ score: result.overall });
  } catch (e) {
    toast(`评分失败：${e.message}`);
    $('#recTip').textContent = '评分失败，可重试';
  } finally {
    btn.disabled = false;
    btn.textContent = old;
  }
}

function renderResult(r) {
  const card = $('#resultCard');
  card.hidden = false;

  const circ = 2 * Math.PI * 52;
  const fg = $('#ringFg');
  fg.style.strokeDasharray = String(circ);
  fg.style.strokeDashoffset = String(circ * (1 - r.overall / 100));
  fg.style.stroke = `var(--${r.overall >= 85 ? 'good' : r.overall >= 66 ? 'warn' : 'bad'})`;
  $('#overallVal').textContent = r.overall;

  const setDim = (bar, val, v) => {
    $(bar).style.width = `${v}%`;
    $(bar).style.background = `var(--${v >= 85 ? 'good' : v >= 66 ? 'warn' : 'bad'})`;
    $(val).textContent = v;
  };
  setDim('#barAcc', '#valAcc', r.accuracy);
  setDim('#barFlu', '#valFlu', r.fluency);
  setDim('#barCom', '#valCom', r.completeness);
  const proRow = $('#prosodyRow');
  if (r.prosody != null) { proRow.hidden = false; setDim('#barPro', '#valPro', r.prosody); } else proRow.hidden = true;

  $('#engineNote').textContent = `引擎：${r.engineLabel || r.engine}`
    + (r.estimated ? ' · 启发式估分，趋势参考' : ' · 音素级精确评分')
    + (r.transcript ? ` · 识别到：“${r.transcript}”` : '');

  $('#wordGrid').innerHTML = (r.words || []).map((w, i) => {
    const cls = scoreClass(w.score, w.status);
    return `<span class="word ${cls}" data-i="${i}">${esc(w.word)}<span class="sc">${w.status === 'missing' ? '漏' : w.score}</span></span>`;
  }).join('');
  $$('#wordGrid .word').forEach((el) => {
    el.onclick = () => {
      const w = r.words[Number(el.dataset.i)];
      tts.speak(w.word, { rate: 0.85 });
      showWordDetail(w);
    };
  });

  const issues = r.issues || [];
  $('#issueTitle').hidden = !issues.length;
  $('#issueList').innerHTML = issues.map((it) => `<div class="issue">
      <b>${esc(it.symbol)}</b> <span class="muted">${esc(it.label || '')} · 出现 ${it.count} 次</span>
      <p>${esc(it.advice || '')}</p>
      ${it.words?.length ? `<div class="ws">涉及词：${it.words.map(esc).join('、')}</div>` : ''}
    </div>`).join('');

  $('#adviceList').innerHTML = (r.advice || []).map((a) => `<li>${esc(a)}</li>`).join('');

  const m = r.metrics || {};
  const chips = [];
  if (m.rate) chips.push(`语速 ${m.rate} 音节/秒`);
  if (m.pauseRatio != null) chips.push(`停顿占比 ${(m.pauseRatio * 100).toFixed(0)}%`);
  if (m.longPauses != null) chips.push(`长停顿 ${m.longPauses} 处`);
  if (m.snr != null) chips.push(`信噪比 ${m.snr} dB`);
  if (m.nuclei != null) chips.push(`检出音节 ${m.nuclei}/${m.expectedSyll}`);
  if (r.durationMs) chips.push(`时长 ${(r.durationMs / 1000).toFixed(1)}s`);
  if (r.elapsedMs) chips.push(`分析耗时 ${r.elapsedMs}ms`);
  $('#metricsBox').innerHTML = chips.map((c) => `<span>${esc(c)}</span>`).join('');

  $('#wordDetail').hidden = true;
}

function showWordDetail(w) {
  const box = $('#wordDetail');
  const phon = (w.phonemes || []).map((p) => {
    const cls = p.score >= 85 ? 'good' : p.score >= 66 ? 'warn' : 'bad';
    return `<span class="ph ${cls}">/${esc(p.symbol)}/ ${p.score}${p.detected && p.detected !== p.symbol ? ` → 实读 /${esc(p.detected)}/` : ''}</span>`;
  }).join('');
  const hints = (w.hints || []).map((h) => `<div class="tip-item"><b>${esc(h.symbol)}</b>（${esc(h.label)}）：${esc(h.advice)}</div>`).join('');
  box.innerHTML = `<h5>${esc(w.word)} <span class="muted" style="font-size:12px">${w.status === 'missing' ? '漏读' : `${w.score} 分`}</span>
      <button class="btn ghost" style="margin-left:auto;padding:4px 10px" id="wdPlay">🔊 慢速跟读</button></h5>
    ${w.note ? `<p class="muted" style="margin:0 0 6px">${esc(w.note)}</p>` : ''}
    ${phon ? `<div class="phoneme-row">${phon}</div>` : ''}
    ${hints || '<div class="tip-item">这个词发音没有明显问题，保持。</div>'}`;
  box.hidden = false;
  $('#wdPlay').onclick = () => tts.speak(w.word, { rate: 0.7 });
}

async function showWordHints(word) {
  if (P.lastResult) {
    const hit = (P.lastResult.words || []).find((w) => w.word.toLowerCase() === String(word).toLowerCase());
    if (hit) { showWordDetail(hit); return; }
  }
  try {
    const { hints } = await api.hints(word);
    if (!hints?.length) return;
    showWordDetail({ word, score: 0, status: 'info', hints, phonemes: [], note: '' });
    $('#resultCard').hidden = false;
    $('#wordDetail').hidden = false;
  } catch { /* ignore */ }
}

/* ================= 模式切换（跟读 / 听写） ================= */
function setMode(mode) {
  settings.mode = mode;
  saveSettings();
  $$('#modeSwitch .seg-btn').forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
  $('#modeTip').textContent = mode === 'dictation'
    ? '听一句，拼一句，答错的自动进单词本'
    : '听一句，读一句，自动评分';
  select(P.index, false);
}

function enterDictation(it) {
  $('#readCard').hidden = true;
  $('#customModeRow').hidden = true;
  $('#resultCard').hidden = true;
  const rec = document.querySelector('.card.record');
  if (rec) rec.hidden = true;
  $('#dictationCard').hidden = false;
  $('#dictMeaning').textContent = it.zh || '（无中文释义）';
  resetDictationUI();
  dictListen(1);
}

function exitDictation() {
  $('#readCard').hidden = false;
  $('#dictationCard').hidden = true;
  const rec = document.querySelector('.card.record');
  if (rec) rec.hidden = false;
}

function resetDictationUI() {
  $('#dictInput').value = '';
  $('#dictInput').disabled = false;
  $('#dictResult').hidden = true;
  $('#dictNext').hidden = true;
  ['#dictReplay', '#dictReplaySlow', '#dictHintBtn', '#dictAnswer', '#dictSubmit'].forEach((s) => { $(s).disabled = false; });
}

async function dictListen(rate = 1) {
  if (!P.items.length) return;
  await tts.speak(P.items[P.index].text, { rate: Math.max(0.5, rate) });
}

function showDictHint() {
  const it = P.items[P.index];
  if (!it) return;
  const hint = normalizeWords(it.text)
    .map((w) => (w.length <= 1 ? w : w[0] + '·'.repeat(w.length - 1)))
    .join(' ');
  $('#dictMeaning').textContent = `${(it.zh || '')}　提示：${hint}`;
}

function showDictAnswer() {
  const it = P.items[P.index];
  if (!it) return;
  $('#dictInput').value = it.text;
  const words = normalizeWords(it.text);
  const per = words.map((e) => ({ e, a: e, s: 1, ok: true, kind: 'ok' }));
  renderDictationResult(per, 100, { correct: words.length, wrong: 0, missing: 0, extra: 0 });
  $('#dictNext').hidden = false;
}

function renderDictationResult(per, overall, stat) {
  const card = $('#dictResult');
  card.hidden = false;
  const cls = overall >= 85 ? 'good' : overall >= 60 ? 'warn' : 'bad';
  const wordsHtml = per.map((w) => {
    if (w.kind === 'ok') return `<span class="dw ok" title="${esc(w.e)}">${esc(w.e)}</span>`;
    if (w.kind === 'wrong') return `<span class="dw wrong" title="你写：${esc(w.a)}">${esc(w.e)}<i>${esc(w.a)}</i></span>`;
    if (w.kind === 'miss') return `<span class="dw miss" title="漏写">${esc(w.e)}<i>漏</i></span>`;
    return `<span class="dw extra" title="多写">${esc(w.a)}</span>`;
  }).join(' ');
  card.innerHTML = `
    <div class="dict-score"><span>听写得分</span><b class="${cls}">${overall}</b><small>/100</small></div>
    <div class="dict-diff">${wordsHtml}</div>
    <div class="dict-meta">对 ${stat.correct} · 错 ${stat.wrong} · 漏 ${stat.missing} · 多 ${stat.extra}</div>`;
}

function recordDictationMistakes(it, per) {
  for (const w of per) {
    if (w.kind === 'ok' || !w.e) continue;
    api.recordMistake(settings.uid, {
      word: w.e,
      ipa: it.ipa || '',
      zh: it.zh || '',
      sentence: it.text,
      levelId: P.group?.levelId || '',
      groupId: P.group?.id || '',
    }).catch(() => {});
  }
}

async function submitDictation() {
  const it = P.items[P.index];
  if (!it) return;
  const answer = $('#dictInput').value;
  if (!answer.trim()) { toast('先听一听，再试着拼写'); return; }
  const exp = normalizeWords(it.text);
  const ans = normalizeWords(answer);
  const n = Math.max(exp.length, ans.length);
  const per = [];
  let correct = 0, wrong = 0, missing = 0, extra = 0, simSum = 0;
  for (let i = 0; i < n; i++) {
    const e = exp[i], a = ans[i];
    if (e && a) {
      const s = wordSimilarity(e, a);
      simSum += s;
      const ok = s >= 0.6;
      per.push({ e, a, s, ok, kind: ok ? 'ok' : 'wrong' });
      ok ? correct++ : wrong++;
    } else if (e && !a) {
      missing++; per.push({ e, a: '', s: 0, ok: false, kind: 'miss' });
    } else {
      extra++; per.push({ e: '', a, s: 0, ok: false, kind: 'extra' });
    }
  }
  const overall = exp.length ? Math.round(100 * simSum / exp.length) : 0;
  renderDictationResult(per, overall, { correct, wrong, missing, extra });
  recordDictationMistakes(it, per);
  api.addRecord(settings.uid, { type: 'dictation', overall, text: it.text, ts: Date.now() }).catch(() => {});
  $('#dictNext').hidden = false;
  afterPractice({ score: overall, silent: true }); // 已有分数展示，这里只补成长反馈（音效由 below 给出）
  if (overall >= 85) { sfx('great'); confetti({ count: 80 }); toast('完美！🎉'); }
  else if (overall >= 60) { sfx('good'); toast('不错，再练几次'); }
  else { sfx('oops'); toast('有错词，已记入单词本，稍后复习'); }
  hitCombo(overall);
}

/* ================= 控件绑定 ================= */
function bindControls() {
  $('#playBtn').onclick = () => {
    if ($('#playBtn').textContent.startsWith('⏹')) stopPlay();
    else play();
  };
  $('#slowBtn').onclick = () => { stopPlay(); play(0.7); };
  $('#prevBtn').onclick = () => select(P.index - 1);
  $('#nextBtn').onclick = () => select(P.index + 1);
  $('#micBtn').onclick = toggleRecord;
  $('#playMineBtn').onclick = playMine;
  $('#abBtn').onclick = abCompare;
  $('#scoreBtn').onclick = doAssess;
  $('#resetRecBtn').onclick = () => { resetRecordingUI(); $('#resultCard').hidden = true; };

  const rate = $('#rateRange');
  rate.value = settings.rate;
  $('#rateVal').textContent = `${Number(settings.rate).toFixed(2)}×`;
  rate.oninput = () => {
    settings.rate = Number(rate.value);
    $('#rateVal').textContent = `${settings.rate.toFixed(2)}×`;
    saveSettings();
    const s = document.querySelector('#setRate');
    if (s) { s.value = settings.rate; $('#setRateVal').textContent = `${settings.rate.toFixed(2)}×`; }
  };

  const loop = $('#loopBtn');
  const auto = $('#autoNextBtn');
  const sync = () => {
    loop.classList.toggle('on', settings.loop);
    auto.classList.toggle('on', settings.autoNext);
  };
  loop.onclick = () => { settings.loop = !settings.loop; if (settings.loop) settings.autoNext = false; saveSettings(); sync(); };
  auto.onclick = () => { settings.autoNext = !settings.autoNext; if (settings.autoNext) settings.loop = false; saveSettings(); sync(); };
  sync();

  $('#sideOpen').onclick = () => { $('#sidePanel').classList.add('open'); $('#scrim').classList.add('show'); };
  $('#sideClose').onclick = closeSide;
  $('#scrim').onclick = closeSide;

  // 模式切换
  $('#modeRead').onclick = () => setMode('read');
  $('#modeDict').onclick = () => setMode('dictation');
  // 听写控制
  $('#dictReplay').onclick = () => dictListen(1);
  $('#dictReplaySlow').onclick = () => dictListen(0.8);
  $('#dictHintBtn').onclick = showDictHint;
  $('#dictAnswer').onclick = showDictAnswer;
  $('#dictSubmit').onclick = submitDictation;
  $('#dictNext').onclick = () => select(P.index + 1, true);
  $('#dictInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitDictation(); }
  });
}

function closeSide() {
  $('#sidePanel').classList.remove('open');
  $('#scrim').classList.remove('show');
}

function bindKeys() {
  document.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
    if (!$('#view-practice').classList.contains('active')) return;
    if (e.code === 'Space') {
      e.preventDefault();
      if (settings.mode === 'dictation') dictListen(1);
      else $('#playBtn').click();
    }
    else if (e.key === 'r' || e.key === 'R') { e.preventDefault(); toggleRecord(); }
    else if (e.key === 'ArrowRight') select(P.index + 1, false);
    else if (e.key === 'ArrowLeft') select(P.index - 1, false);
    else if (e.key === 'm' || e.key === 'M') playMine();
  });
}

export function practiceStop() {
  stopPlay();
  if (P.recording) stopRecord();
}

export function currentEngineText() {
  const t = settings.ttsProvider === 'browser' ? '浏览器语音' : `云端 ${settings.ttsProvider}`;
  const a = settings.assessProvider === 'offline' ? '离线评分' : `${settings.assessProvider} 评分`;
  const asrTag = settings.useAsr && asr.available ? ' + 识别' : '';
  return `${t} / ${a}${asrTag}`;
}

export { asr, recorder };
