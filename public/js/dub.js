/** 配音秀：原创影视场景剧本 + 角色分演 + 逐句录音评分 + 整幕合成回放
 *  剧本全部为项目原创（public/data/dub-scenes.json），零版权风险。
 *  复用既有引擎：tts 生成对手台词、Recorder 录音、api.assess 评分、fun.js 反馈。 */
import { $, $$, toast, esc, scoreClass } from './util.js';
import { settings } from './state.js';
import { api } from './api.js';
import { tts } from './tts.js';
import { Recorder, Asr } from './recorder.js';
import { afterPractice, sfx, confetti, refreshLevelChip } from './fun.js';

const D = {
  scenes: [],
  scene: null,
  lineIdx: 0,
  recording: false,
  timerId: null,
  stopWave: null,
  myAudio: new Map(), // lineIndex -> {url, base64, durationMs}
  scores: new Map(),  // lineIndex -> score
  partner: new Audio(),
  playing: false,
};

const recorder = new Recorder();
const asr = new Asr();

export async function loadScenes() {
  if (D.scenes.length) return D.scenes;
  try {
    const r = await fetch('/data/dub-scenes.json', { cache: 'no-store' });
    D.scenes = (await r.json()).scenes || [];
  } catch { D.scenes = []; }
  return D.scenes;
}

export function initDub() {
  loadScenes().then(renderSceneList);
  $('#dubBackBtn').onclick = () => { stopAll(); showStage(false); };
  $('#dubPrevBtn').onclick = () => gotoLine(D.lineIdx - 1);
  $('#dubNextBtn').onclick = () => gotoLine(D.lineIdx + 1);
  $('#dubPlayLineBtn').onclick = playPartnerLine;
  $('#dubRecBtn').onclick = toggleRecord;
  $('#dubMyBtn').onclick = playMyLine;
  $('#dubPlayAllBtn').onclick = playWholeScene;
  $('#dubResetBtn').onclick = () => { if (confirm('清空本场景所有配音成绩，重新配一遍？')) { D.myAudio.clear(); D.scores.clear(); gotoLine(0); renderScript(); } };
}

/* ================= 场景选择 ================= */
function renderSceneList() {
  const box = $('#dubSceneList');
  if (!D.scenes.length) {
    box.innerHTML = '<div class="muted" style="padding:8px 2px">剧本加载失败，请检查 public/data/dub-scenes.json</div>';
    return;
  }
  box.innerHTML = D.scenes.map((s) => {
    const mine = s.lines.filter((l) => l.speaker === s.myRole).length;
    return `<div class="dub-card" data-id="${esc(s.id)}">
      <div class="dub-poster">${s.emoji || '🎬'}</div>
      <div class="dub-meta">
        <b>${esc(s.title)}</b>
        <small class="muted">${esc(s.desc || '')}</small>
        <div class="dub-tags"><span class="tag">${esc(s.levelName || s.level)}</span><span class="tag">${s.lines.length} 句 · 你要配 ${mine} 句</span></div>
      </div>
      <button class="btn primary dub-go">开配 →</button>
    </div>`;
  }).join('');
  $$('#dubSceneList .dub-go').forEach((b) => {
    b.onclick = () => enterScene(b.closest('.dub-card').dataset.id);
  });
  $$('#dubSceneList .dub-card').forEach((c) => {
    c.onclick = (e) => { if (!e.target.closest('.dub-go')) enterScene(c.dataset.id); };
  });
}

function showStage(on) {
  $('#dubPicker').hidden = on;
  $('#dubStage').hidden = !on;
}

/* ================= 进入场景 ================= */
function enterScene(id) {
  const s = D.scenes.find((x) => x.id === id);
  if (!s) return;
  D.scene = s;
  D.lineIdx = 0;
  D.myAudio.clear();
  D.scores.clear();
  const myRole = s.roles.find((r) => r.id === s.myRole);
  $('#dubTitle').textContent = `${s.emoji || '🎬'} ${s.title}`;
  $('#dubSub').textContent = `${s.desc || ''}　·　你扮演：${myRole ? myRole.name : '主角'}　·　共 ${s.lines.length} 句`;
  showStage(true);
  renderScript();
  gotoLine(0);
}

/* ================= 剧本渲染 ================= */
function renderScript() {
  const s = D.scene;
  const roleName = (id) => (s.roles.find((r) => r.id === id) || {}).name || id;
  $('#dubScript').innerHTML = s.lines.map((l, i) => {
    const mine = l.speaker === s.myRole;
    const sc = D.scores.get(i);
    const cls = sc == null ? '' : scoreClass(sc);
    const clsName = cls === 'good' ? 'good' : cls === 'warn' ? 'warn' : cls === 'bad' ? 'bad' : '';
    return `<div class="dub-line ${mine ? 'mine' : 'them'} ${i === D.lineIdx ? 'active' : ''}" data-i="${i}">
      <div class="dl-who">${esc(roleName(l.speaker))}${mine ? ' <span class="dl-badge">你来配</span>' : ''}</div>
      <div class="dl-text">${esc(l.text)}</div>
      ${l.zh ? `<div class="dl-zh">${esc(l.zh)}</div>` : ''}
      ${sc != null ? `<div class="dl-score ${clsName}">${sc} 分</div>` : ''}
    </div>`;
  }).join('');
  $$('#dubScript .dub-line').forEach((el) => {
    el.onclick = () => gotoLine(Number(el.dataset.i));
  });
  updateProgress();
}

function updateProgress() {
  const s = D.scene;
  if (!s) return;
  const mine = s.lines.map((l, i) => (l.speaker === s.myRole ? i : -1)).filter((i) => i >= 0);
  const done = mine.filter((i) => D.scores.has(i)).length;
  const avg = mine.length && done
    ? Math.round(mine.filter((i) => D.scores.has(i)).reduce((a, i) => a + D.scores.get(i), 0) / done)
    : 0;
  $('#dubProgress').textContent = `你的台词：${done} / ${mine.length}　·　平均分 ${avg}`;
}

function gotoLine(i) {
  if (!D.scene) return;
  D.lineIdx = Math.max(0, Math.min(D.scene.lines.length - 1, i));
  const l = D.scene.lines[D.lineIdx];
  const mine = l.speaker === D.scene.myRole;
  $$('#dubScript .dub-line').forEach((el) => el.classList.toggle('active', Number(el.dataset.i) === D.lineIdx));
  $('.dub-line.active')?.scrollIntoView({ block: 'center', behavior: 'smooth' });

  const roleName = (id) => (D.scene.roles.find((r) => r.id === id) || {}).name || id;
  $('#dubCurRole').textContent = roleName(l.speaker);
  $('#dubCurText').textContent = l.text;
  $('#dubCurZh').textContent = l.zh || '';

  $('#dubPrevBtn').disabled = D.lineIdx === 0;
  $('#dubNextBtn').disabled = D.lineIdx === D.scene.lines.length - 1;
  $('#dubRecBtn').hidden = !mine;
  $('#dubMyBtn').hidden = !mine || !D.myAudio.has(D.lineIdx);
  $('#dubPlayLineBtn').hidden = mine;
  $('#dubMyTip').textContent = mine
    ? (D.scores.has(D.lineIdx) ? `这句你得了 ${D.scores.get(D.lineIdx)} 分，可以再录一次` : '按麦克风录制你的这句台词')
    : '这是对手台词，点播放听听，再录你的部分';
}

/* ================= 播放 ================= */
function stopPartner() { try { D.partner.pause(); D.partner.currentTime = 0; } catch { /* ignore */ } }

async function playPartnerLine() {
  const l = D.scene?.lines[D.lineIdx];
  if (!l || l.speaker === D.scene.myRole) return;
  stopPartner();
  try {
    D.partner.src = await tts.speakAsUrl(l.text);
    await D.partner.play();
  } catch {
    tts.speak(l.text);
  }
}

function playMyLine() {
  const a = D.myAudio.get(D.lineIdx);
  if (!a) return;
  stopPartner();
  D.partner.src = a.url;
  D.partner.play().catch(() => {});
}

async function playWholeScene() {
  if (D.playing) { D.playing = false; stopPartner(); toast('已停止回放'); return; }
  D.playing = true;
  for (let i = 0; i < D.scene.lines.length && D.playing; i += 1) {
    const l = D.scene.lines[i];
    gotoLine(i);
    try {
      if (l.speaker === D.scene.myRole) {
        const a = D.myAudio.get(i);
        if (a) { await playUrl(a.url); continue; }
        await playUrl(await tts.speakAsUrl(l.text)); // 没录过就用标准音补齐
      } else {
        await playUrl(await tts.speakAsUrl(l.text));
      }
    } catch { break; }
  }
  D.playing = false;
}

function playUrl(url) {
  return new Promise((resolve) => {
    if (!D.playing) return resolve();
    D.partner.src = url;
    D.partner.onended = resolve;
    D.partner.onerror = resolve;
    D.partner.play().catch(resolve);
  });
}

function stopAll() { D.playing = false; stopPartner(); }

/* ================= 录音 + 评分 ================= */
async function toggleRecord() { return D.recording ? stopRecord() : startRecord(); }

async function startRecord() {
  stopAll();
  try { await recorder.start(); } catch (e) { toast(e.message || '无法开始录音'); return; }
  if (settings.useAsr && asr.available) asr.start();
  D.recording = true;
  $('#dubRecBtn').classList.add('rec');
  $('#dubRecBtn').textContent = '⏹ 停止录音';
  D.stopWave = recorder.drawTo($('#dubWave'));
  const words = (D.scene.lines[D.lineIdx]?.text || '').split(/\s+/).filter(Boolean).length;
  const maxMs = Math.min(120000, Math.max(20000, words * 1500));
  const t0 = Date.now();
  D.timerId = setInterval(() => {
    const ms = Date.now() - t0;
    $('#dubMyTip').textContent = `录音中… ${(ms / 1000).toFixed(1)}s`;
    if (ms > maxMs) { toast('已到本句录音上限'); stopRecord(); }
  }, 200);
}

async function stopRecord() {
  if (!D.recording) return;
  D.recording = false;
  clearInterval(D.timerId);
  D.stopWave?.();
  const btn = $('#dubRecBtn');
  btn.classList.remove('rec');
  btn.textContent = '🎙 配这句';
  const rec = await recorder.stop();
  const transcript = settings.useAsr && asr.available ? await asr.stop() : '';
  if (rec.durationMs < 350) { toast('录音太短，把整句说完再停'); return; }

  const i = D.lineIdx;
  D.myAudio.set(i, { ...rec, transcript });
  $('#dubMyBtn').hidden = false;
  $('#dubMyTip').textContent = '评分中…';

  try {
    const { result } = await api.assess({
      uid: settings.uid,
      text: D.scene.lines[i].text,
      audio: rec.base64,
      transcript: transcript || '',
      engine: settings.assessProvider,
      level: D.scene.levelName || '',
      groupId: `dub-${D.scene.id}`,
      itemId: `${D.scene.id}-${i}`,
      type: 'dub',
    });
    D.scores.set(i, result.overall);
    renderScript();
    gotoLine(i);
    $('#dubMyTip').textContent = `这句 ${result.overall} 分`;
    // 复用趣味反馈层：音效 + 彩带 + 连击 + XP
    afterPractice({ score: result.overall });
    // 自动跳到下一句该我配的
    const next = nextMyLine(i);
    if (next >= 0) setTimeout(() => { if (!D.recording) gotoLine(next); }, 1400);
    else if (D.scores.size === countMyLines()) finishScene();
  } catch (e) {
    toast(`评分失败：${e.message}`);
    $('#dubMyTip').textContent = '评分失败，可重录';
  }
}

function countMyLines() {
  return D.scene.lines.filter((l) => l.speaker === D.scene.myRole).length;
}
function nextMyLine(from) {
  for (let i = from + 1; i < D.scene.lines.length; i += 1) {
    if (D.scene.lines[i].speaker === D.scene.myRole && !D.scores.has(i)) return i;
  }
  return -1;
}

async function finishScene() {
  const myIdx = D.scene.lines.map((l, i) => (l.speaker === D.scene.myRole ? i : -1)).filter((i) => i >= 0);
  const avg = Math.round(myIdx.reduce((a, i) => a + (D.scores.get(i) || 0), 0) / myIdx.length);
  confetti({ count: 130, power: 1.4 });
  sfx('fanfare');
  toast(`整幕配音完成！平均 ${avg} 分 🎬🎉`);
  await api.addRecord(settings.uid, {
    type: 'dub',
    overall: avg,
    text: `${D.scene.title} 🎬 配音秀`,
    level: D.scene.levelName || '',
    groupId: `dub-${D.scene.id}`,
    itemId: D.scene.id,
    ts: Date.now(),
  }).catch(() => {});
  refreshLevelChip();
}

export async function loadDub() {
  if (!D.scenes.length) await loadScenes();
  if (!D.scene) renderSceneList();
}
