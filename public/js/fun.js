/** 趣味反馈层：音效 / 彩带 / XP 上浮 / 连击 / 成就解锁
 *  目标：让"每一次开口练习"立刻有感官回报，而不是只有后台数字变化。
 *  零素材依赖：音效用 Web Audio 实时合成，彩带用 Canvas 绘制。 */
import { $ } from './util.js';
import { settings } from './state.js';
import { api } from './api.js';
import { levelInfo, deriveXp } from './level.js';

/* ================= 音效（Web Audio 合成，无音频文件） ================= */
let ac = null;
function actx() {
  if (settings.funSound === false) return null;
  try {
    if (!ac) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ac = new C();
    }
    if (ac.state === 'suspended') ac.resume().catch(() => {});
    return ac;
  } catch { return null; }
}

function tone(a, freq, delay, dur, { type = 'sine', gain = 0.12 } = {}) {
  const t0 = a.currentTime + delay;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  // 轻微渐入渐出，避免爆音
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

const PLAY = {
  oops: (a) => { tone(a, 311.13, 0, 0.16, { type: 'triangle', gain: 0.09 }); tone(a, 233.08, 0.11, 0.22, { type: 'triangle', gain: 0.08 }); },
  good: (a) => { tone(a, 523.25, 0, 0.13); tone(a, 659.25, 0.09, 0.15); },
  great: (a) => { [523.25, 659.25, 783.99].forEach((f, i) => tone(a, f, i * 0.085, 0.16)); },
  perfect: (a) => { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(a, f, i * 0.08, 0.22, { gain: 0.13 })); },
  fanfare: (a) => { [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(a, f, i * 0.1, 0.3, { type: 'triangle', gain: 0.12 })); },
  combo: (a, n) => { tone(a, 392 * Math.pow(1.08, Math.min(12, n)), 0, 0.12, { type: 'square', gain: 0.07 }); },
  tick: (a) => tone(a, 660, 0, 0.08, { type: 'square', gain: 0.05 }),
};

export function sfx(kind, extra) {
  const a = actx();
  if (!a || !PLAY[kind]) return;
  try { PLAY[kind](a, extra); } catch { /* 音频不可用时静默 */ }
}

/* ================= 彩带（Canvas） ================= */
export function confetti({ count = 70, power = 1 } = {}) {
  if (settings.funEffect === false) return;
  const cv = document.createElement('canvas');
  cv.className = 'fun-confetti';
  document.body.appendChild(cv);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const resize = () => { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; };
  resize();
  const ctx = cv.getContext('2d');
  const colors = ['#f59e0b', '#2563eb', '#16a34a', '#dc2626', '#8b5cf6', '#06b6d4'];
  const parts = Array.from({ length: count }, () => ({
    x: Math.random() * cv.width,
    y: -Math.random() * cv.height * 0.3,
    w: (6 + Math.random() * 7) * dpr,
    h: (9 + Math.random() * 10) * dpr,
    vy: (2.2 + Math.random() * 3.4) * power * dpr,
    vx: (Math.random() - 0.5) * 2.4 * dpr,
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.24,
    c: colors[(Math.random() * colors.length) | 0],
  }));
  let raf = 0;
  const stop = () => { cancelAnimationFrame(raf); cv.remove(); };
  setTimeout(stop, 2200);
  const loop = () => {
    ctx.clearRect(0, 0, cv.width, cv.height);
    parts.forEach((p) => {
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
    if (parts[0].y * 0 + parts.every((p) => p.y > cv.height)) return stop();
    raf = requestAnimationFrame(loop);
  };
  loop();
}

/* ================= 浮动文字（+XP / 鼓励语） ================= */
export function floatText(text, { cls = '', delay = 0 } = {}) {
  const el = document.createElement('div');
  el.className = `fun-float ${cls}`;
  el.textContent = text;
  el.style.left = `${50 + (Math.random() * 16 - 8)}%`;
  el.style.animationDelay = `${delay}s`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1800 + delay * 1000);
}

/* ================= 连击 ================= */
let combo = 0;
let comboResetTimer = 0;
function ensureComboChip() {
  let chip = $('#funCombo');
  if (!chip) {
    chip = document.createElement('div');
    chip.id = 'funCombo';
    chip.className = 'fun-combo';
    chip.hidden = true;
    document.body.appendChild(chip);
  }
  return chip;
}

export function hitCombo(score) {
  const chip = ensureComboChip();
  clearTimeout(comboResetTimer);
  if (score >= 66) {
    combo += 1;
    chip.textContent = `🔥 ${combo} 连击`;
    chip.hidden = false;
    chip.classList.remove('pop');
    void chip.offsetWidth; // 重启动画
    chip.classList.add('pop');
    if (combo > 1) { sfx('combo', combo); floatText(`连击 ×${combo}`, { cls: 'xp' }); }
    comboResetTimer = setTimeout(() => { chip.hidden = true; combo = 0; }, 20000);
  } else {
    combo = 0;
    chip.hidden = true;
  }
  return combo;
}

/* ================= 成就徽章 ================= */
const BADGES = [
  { key: 'first', ic: '🎤', name: '初试啼声', desc: '完成第 1 次练习', test: (s) => (s.total || 0) >= 1 },
  { key: 'ten', ic: '🔟', name: '小试牛刀', desc: '累计练习 10 句', test: (s) => (s.total || 0) >= 10 },
  { key: 'fifty', ic: '🌱', name: '熟能生巧', desc: '累计练习 50 句', test: (s) => (s.total || 0) >= 50 },
  { key: 'hundred', ic: '💯', name: '百炼成钢', desc: '累计练习 100 句', test: (s) => (s.total || 0) >= 100 },
  { key: 'best90', ic: '⭐', name: '九十达人', desc: '单句得分达到 90', test: (s) => (s.best || 0) >= 90 },
  { key: 'best95', ic: '🏆', name: '接近完美', desc: '单句得分达到 95', test: (s) => (s.best || 0) >= 95 },
  { key: 'streak3', ic: '🔥', name: '持之以恒', desc: '连续达标 3 天', test: (s) => (s.streak || 0) >= 3 },
  { key: 'streak7', ic: '👑', name: '七日之约', desc: '连续达标 7 天', test: (s) => (s.streak || 0) >= 7 },
  { key: 'wb10', ic: '📕', name: '词汇积累', desc: '单词本收录 10 个词', test: (s, wb) => (wb || 0) >= 10 },
  { key: 'wb50', ic: '📚', name: '词海拾贝', desc: '单词本收录 50 个词', test: (s, wb) => (wb || 0) >= 50 },
  { key: 'pe10', ic: '🔤', name: '发音勘探家', desc: '积累 10 类发音难点样本', test: (s) => Object.keys(s.phonemeErrors || {}).length >= 10 },
  { key: 'we20', ic: '🎯', name: '错词猎手', desc: '积累分析 20 个错词', test: (s) => Object.keys(s.wordErrors || {}).length >= 20 },
];

const unlockKey = () => `amread.badges.${settings.uid || 'default'}`;
function unlockedSet() {
  try { return new Set(JSON.parse(localStorage.getItem(unlockKey()) || '[]')); } catch { return new Set(); }
}
function saveUnlocked(set) {
  try { localStorage.setItem(unlockKey(), JSON.stringify([...set])); } catch { /* ignore */ }
}

/** 返回本次新解锁的徽章（不在此函数里弹窗，交由调用方决定时机） */
export function diffBadges(stats, wbLen) {
  const has = unlockedSet();
  const fresh = BADGES.filter((b) => !has.has(b.key) && b.test(stats, wbLen));
  if (fresh.length) {
    const next = new Set([...has, ...fresh.map((b) => b.key)]);
    saveUnlocked(next);
  }
  return fresh;
}

export function showBadgeModal(list) {
  if (!list || !list.length) return;
  const b = list[0];
  const mask = document.createElement('div');
  mask.className = 'fun-badge-mask';
  mask.innerHTML = `
    <div class="fun-badge">
      <div class="fb-ring"><span>${b.ic}</span></div>
      <div class="fb-label">解锁新成就</div>
      <div class="fb-name">${b.name}</div>
      <div class="fb-desc">${b.desc}</div>
      ${list.length > 1 ? `<div class="fb-more">还同时解锁了 ${list.length - 1} 个成就 🎉</div>` : ''}
      <button class="btn primary fb-ok">收下</button>
    </div>`;
  document.body.appendChild(mask);
  sfx('fanfare');
  confetti({ count: 120, power: 1.3 });
  const close = () => mask.remove();
  mask.querySelector('.fb-ok').onclick = close;
  mask.addEventListener('click', (e) => { if (e.target === mask) close(); });
  setTimeout(close, 6000);
}

/* ================= 顶栏等级徽章（所有用户可见，含匿名） ================= */
const xpKey = () => `amread.xp.${settings.uid || 'default'}`;
export function updateLevelChip(xp) {
  let chip = $('#topLevelChip');
  if (!chip) {
    chip = document.createElement('span');
    chip.id = 'topLevelChip';
    chip.className = 'lv-chip fun-level-chip';
    const right = document.querySelector('.topbar-right');
    if (right) right.insertBefore(chip, right.firstChild);
    else document.body.appendChild(chip);
  }
  const lv = levelInfo(xp);
  chip.textContent = `Lv.${lv.level} ${lv.title}`;
  chip.title = `${lv.xp} XP · 距下一级还差 ${Math.max(0, lv.next - lv.xp)} XP`;
  return lv;
}

/** 拉取最新数据刷新等级，返回 {level, xpGained} */
export async function refreshLevelChip() {
  try {
    const { stats } = await api.progress(settings.uid);
    const xp = deriveXp(stats);
    const lv = updateLevelChip(xp);
    const prev = Number(localStorage.getItem(xpKey()) || 0);
    const gained = Math.max(0, xp - prev);
    if (prev !== xp) localStorage.setItem(xpKey(), String(xp));
    return { lv, gained, stats };
  } catch { return null; }
}

/* ================= 练习完成后的统一反馈入口 ================= */
/** @param {{score:number, silent?:boolean}} p */
export async function afterPractice({ score, silent = false }) {
  if (!silent) {
    if (score >= 95) { sfx('perfect'); confetti({ count: 110, power: 1.35 }); floatText('🎉 完美发音！', { cls: 'big' }); }
    else if (score >= 85) { sfx('great'); confetti({ count: 80 }); floatText('👏 很棒！'); }
    else if (score >= 66) { sfx('good'); floatText('👍 不错，继续'); }
    else { sfx('oops'); floatText('💪 再试一次', { cls: 'bad' }); }
    hitCombo(score);
  }

  try {
    const r = await refreshLevelChip();
    if (!r) return;
    if (r.gained > 0) floatText(`+${r.gained} XP`, { cls: 'xp', delay: 0.25 });
    const { words } = await api.wordbook(settings.uid).catch(() => ({ words: [] }));
    const fresh = diffBadges(r.stats, (words || []).length);
    if (fresh.length) setTimeout(() => showBadgeModal(fresh), 700);
  } catch { /* 网络异常不影响练习 */ }
}

/** 复习/听写等轻量行为的小奖励 */
export async function rewardSmall(text) {
  sfx('tick');
  floatText(text, { cls: 'xp' });
  try {
    const r = await refreshLevelChip();
    if (r && r.gained > 0) floatText(`+${r.gained} XP`, { cls: 'xp', delay: 0.2 });
  } catch { /* ignore */ }
}
