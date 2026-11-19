/** 进度页：统计卡片 / 趋势图 / 每日练习量 / 错误排行 / 历史 */
import { $, esc, fmtDate } from './util.js';
import { settings } from './state.js';
import { api } from './api.js';
import { drawLineChart, drawBarChart } from './charts.js';
import { lib, makeCustomGroup } from './materials.js';
import { levelInfo, deriveXp } from './level.js';

let lastStats = null;

export async function loadProgress() {
  let stats;
  try {
    ({ stats } = await api.progress(settings.uid));
  } catch {
    $('#statGrid').innerHTML = '<div class="stat"><b>—</b><span>无法读取学习数据</span></div>';
    return null;
  }
  lastStats = stats;
  lib.custom = (stats.customTexts || []).map((c) => {
    const g = makeCustomGroup(c.title, c.text, c.mode || 'auto');
    // 用服务端稳定 id 覆盖随机 id，保证练习页/侧栏/删除一致
    return { ...g, id: c.id, ts: c.ts, raw: c.text, splitMode: c.mode || 'auto' };
  });
  render(stats);
  renderGrowth(stats);
  await renderSmartPlan(stats);
  window.dispatchEvent(new CustomEvent('progress:loaded', { detail: stats }));
  return stats;
}

export function getStats() { return lastStats; }

/* ============ 成长体系（等级 / XP / 称号）—— 从现有练习数据推导，零额外存储 ============ */

export function renderGrowth(s) {
  const lv = levelInfo(deriveXp(s));
  const el = $('#growthCard');
  if (!el) return;
  $('#growthLv').textContent = `Lv.${lv.level} ${lv.title}`;
  $('#growthBar').style.width = `${lv.pct}%`;
  $('#growthXp').textContent = `${lv.xp} XP · 距下一级还差 ${Math.max(0, lv.next - lv.xp)} XP`;
  $('#growthStats').innerHTML = [
    ['累计练习', `${s.total || 0} 句`],
    ['连续达标', `${s.streak || 0} 天`],
    ['攻克发音难点', `${Object.keys(s.phonemeErrors || {}).length} 个`],
    ['积累错词', `${Object.keys(s.wordErrors || {}).length} 个`],
  ].map(([k, v]) => `<div class="growth-kpi"><b>${v}</b><span>${k}</span></div>`).join('');
  // 顶栏等级徽章（登录态可见）
  const chip = $('#userLv');
  if (chip) chip.textContent = `Lv.${lv.level}`;
  return lv;
}

function render(s) {
  const cards = [
    { v: s.total, l: '累计练习句数' },
    { v: s.todayCount, l: '今日练习' },
    { v: s.avgOverall || 0, l: '平均总分' },
    { v: s.best || 0, l: '最高分' },
    { v: `${s.minutes || 0}′`, l: '累计录音时长' },
    { v: `${s.streak || 0}天`, l: '连续练习' },
  ];
  $('#statGrid').innerHTML = cards.map((c) => `<div class="stat"><b>${esc(String(c.v))}</b><span>${c.l}</span></div>`).join('');
  renderCheckin(s);

  const trend = s.trend || [];
  drawLineChart($('#trendChart'), {
    labels: trend.map((t) => fmtDate(t.ts).slice(0, 5)),
    series: [
      { name: '总分', color: '#3b82f6', data: trend.map((t) => t.overall || 0) },
      { name: '准确度', color: '#22c55e', data: trend.map((t) => t.accuracy || 0) },
      { name: '流利度', color: '#f59e0b', data: trend.map((t) => t.fluency || 0) },
      { name: '完整度', color: '#a855f7', data: trend.map((t) => t.completeness || 0) },
    ],
  });

  const days = (s.byDay || []).slice(-14);
  drawBarChart($('#dayChart'), days.map((d) => ({ label: d.day.slice(5), value: d.count })));

  const rank = (items, unit) => (items.length
    ? items.map((i) => {
      const max = items[0].count || 1;
      return `<div class="rank"><span class="k">${esc(i.key)}</span>
        <span class="b"><i style="width:${(i.count / max) * 100}%"></i></span>
        <span class="n">${i.count}${unit}</span></div>`;
    }).join('')
    : '<p class="muted">还没有统计数据，多练几句就有了。</p>');

  $('#phonemeStats').innerHTML = rank(s.topPhonemeErrors || [], '次');
  $('#wordStats').innerHTML = rank(s.topWordErrors || [], '次');

  $('#historyList').innerHTML = (s.recent || []).length
    ? s.recent.map((r) => {
      const cls = r.overall >= 85 ? 'good' : r.overall >= 66 ? 'warn' : 'bad';
      return `<div class="h-item">
        <span class="s" style="color:var(--${cls})">${r.overall}</span>
        <span class="tx" title="${esc(r.text)}">${esc(r.text)}</span>
        <span class="d">${fmtDate(r.ts)}</span></div>`;
    }).join('')
    : '<p class="muted">暂无练习记录。</p>';
}

export function redrawCharts() {
  if (lastStats) render(lastStats);
}

/* ============ 打卡（每日目标 / 连击 / 日历） ============ */
const pad = (n) => String(n).padStart(2, '0');
const dayKey = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

function renderCheckin(s) {
  const goal = settings.dailyGoal || 5;
  const map = new Map((s.byDay || []).map((d) => [d.day, d.count]));
  const today = dayKey(Date.now());
  const todayCnt = map.get(today) || 0;

  // 达标连击：今天未达标时从昨天往前算（今日进行中不算断，也不计入）
  let streak = 0;
  for (let i = 0; ; i += 1) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const k = dayKey(d.getTime());
    const cnt = map.get(k) || 0;
    const ok = cnt >= goal;
    if (i === 0 && !ok) continue;
    if (ok) streak += 1; else break;
  }

  $('#ckStreak').textContent = streak;
  const done = todayCnt >= goal;
  $('#ckTodayLabel').textContent = `今日 ${todayCnt} / ${goal}${done ? ' · 已打卡 ✅' : ''}`;
  const bar = $('#ckBar');
  bar.style.width = `${Math.min(100, Math.round((todayCnt / goal) * 100))}%`;
  bar.className = `ck-bar${done ? ' done' : ''}`;

  // 最近 6 周（42 天）日历
  let html = '';
  for (let i = 41; i >= 0; i -= 1) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const k = dayKey(d.getTime());
    const cnt = map.get(k) || 0;
    const cls = cnt === 0 ? 'none' : (cnt >= goal ? 'done' : 'partial');
    html += `<div class="ck-cell ${cls}${i === 0 ? ' today' : ''}${i % 7 === 0 ? ' wk' : ''}" title="${k}：${cnt}/${goal}"></div>`;
  }
  $('#ckCal').innerHTML = html;
  $('#ckGoPractice').onclick = () => { const t = document.querySelector('#tabs [data-view="practice"]'); if (t) t.click(); };
}

/* ============ 智能推送：基于学习情况的自适应「今日学习计划」 ============ */
async function renderSmartPlan(s) {
  const goal = settings.dailyGoal || 5;
  const todayGap = Math.max(0, goal - (s.todayCount || 0));
  const items = [];

  // ① 到期复习（SRS 间隔记忆）：拉取单词本，统计今日到期
  try {
    const { words } = await api.wordbook(settings.uid);
    const due = (words || []).filter((w) => (w.due || 0) <= Date.now()).length;
    if (due > 0) items.push({ ic: '📕', tx: `复习 ${due} 个到期单词（间隔记忆巩固，防遗忘曲线）`, btn: '去复习', go: 'wordbook' });
  } catch { /* 单词本不可用时跳过此项 */ }

  // ② 易错音素：优先突破高频错误音素
  const ph = (s.topPhonemeErrors || []).slice(0, 3).map((p) => p.key).join('、');
  if (ph) items.push({ ic: '🔤', tx: `易错音素：${ph}，建议多听多跟读含这些音的句子`, btn: '去练习', go: 'practice' });

  // ③ 高频错词：回到练习重读巩固
  const werr = (s.topWordErrors || []).slice(0, 3).map((w) => w.key).join('、');
  if (werr) items.push({ ic: '🎯', tx: `高频错词：${werr}，回到练习重读巩固`, btn: '去练习', go: 'practice' });

  // ④ 打卡缺口：今日尚未达标
  if (todayGap > 0) items.push({ ic: '📅', tx: `今日打卡还差 ${todayGap} 次练习，加油完成每日目标！`, btn: '去练习', go: 'practice' });

  if (!items.length) items.push({ ic: '🎉', tx: '今日学习任务已完成，明天见！', btn: '', go: '' });

  $('#ckPlan').innerHTML = items.map((it) =>
    `<div class="plan-item">
      <span class="plan-ic">${it.ic}</span>
      <span class="plan-tx">${esc(it.tx)}</span>
      ${it.btn ? `<button class="btn ghost plan-go" data-go="${it.go}">${it.btn} →</button>` : ''}
    </div>`).join('');

  $('#ckPlan').querySelectorAll('.plan-go').forEach((b) => {
    b.onclick = () => { const t = document.querySelector(`#tabs [data-view="${b.dataset.go}"]`); if (t) t.click(); };
  });
}
