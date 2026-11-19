/** 单词本视图：展示听写/练习错词，并提供 SM-2 间隔重复复习。 */
import { $, $$, toast, esc } from './util.js';
import { settings } from './state.js';
import { api } from './api.js';
import { tts } from './tts.js';
import { sfx, confetti, rewardSmall } from './fun.js';

let items = [];   // 全量单词本
let queue = [];   // 本次复习队列（到期的词）
let idx = 0;

const DAY = 86400000;

function relDue(due) {
  const d = (due || 0) - Date.now();
  if (d <= 0) return { text: '待复习', cls: 'bad' };
  const days = Math.round(d / DAY);
  if (days <= 0) return { text: '今天稍后', cls: 'warn' };
  if (days === 1) return { text: '明天', cls: 'muted' };
  return { text: `${days} 天后`, cls: 'muted' };
}

function masteryTag(w) {
  if ((w.interval || 0) >= 21) return { text: '已掌握', cls: 'good' };
  if ((w.reps || 0) === 0) return { text: '新词', cls: 'warn' };
  return { text: `第${w.reps}次`, cls: 'muted' };
}

function statCard(num, label, cls = '') {
  return `<div class="stat"><b class="${cls}">${num}</b><span>${label}</span></div>`;
}

function renderStats() {
  const now = Date.now();
  const total = items.length;
  const due = items.filter((w) => (w.due || 0) <= now).length;
  const mastered = items.filter((w) => (w.interval || 0) >= 21).length;
  $('#wbStats').innerHTML =
    statCard(total, '单词总数') +
    statCard(due, '今日待复习', due ? 'bad' : 'good') +
    statCard(mastered, '已掌握', 'good');
  $('#wbDueLabel').textContent = due ? `${due} 个词待复习` : '今天已全部复习完 🎉';
  $('#wbCountLabel').textContent = `单词本共 ${total} 词`;
  $('#wbStartBtn').disabled = due === 0;
  $('#wbStartBtn').textContent = due ? `开始复习（${due}）` : '暂无到期词';
}

function renderList() {
  const box = $('#wbList');
  if (!items.length) {
    box.innerHTML = '<div class="muted" style="padding:8px 2px">还没有单词。去「练习 → 听写」模式拼几句，错词会自动收录到这里。</div>';
    return;
  }
  box.innerHTML = items.map((w) => {
    const rd = relDue(w.due);
    const mt = masteryTag(w);
    return `<div class="wb-item" data-word="${esc(w.word)}">
      <div class="wb-item-main">
        <div class="wb-item-word">${esc(w.word)}${w.ipa ? ` <span class="wb-item-ipa">${esc(w.ipa)}</span>` : ''}</div>
        <div class="wb-item-zh">${esc(w.zh || '')}</div>
        ${w.sentence ? `<div class="wb-item-sent muted">${esc(w.sentence)}</div>` : ''}
        <div class="wb-item-tags">
          <span class="tag">错 ${w.wrong || 1} 次</span>
          <span class="tag ${rd.cls}">${rd.text}</span>
          <span class="tag ${mt.cls}">${mt.text}</span>
        </div>
      </div>
      <div class="wb-item-acts">
        <button class="icon-btn" data-act="sound" data-word="${esc(w.word)}" title="听发音">🔊</button>
        <button class="icon-btn" data-act="del" data-word="${esc(w.word)}" title="删除">🗑</button>
      </div>
    </div>`;
  }).join('');
}

async function loadWordbook() {
  try {
    const { words } = await api.wordbook(settings.uid);
    items = words || [];
  } catch (e) {
    items = [];
  }
  renderStats();
  renderList();
}

/* ============ 复习（SM-2 抽认卡） ============ */
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function enterReview() {
  $('#wbFlash').hidden = false;
  const listCard = $('#wbList').closest('.card');
  if (listCard) listCard.hidden = true;
}

function exitReview() {
  $('#wbFlash').hidden = true;
  const listCard = $('#wbList').closest('.card');
  if (listCard) listCard.hidden = false;
  loadWordbook();
}

function renderFlash() {
  const w = queue[idx];
  $('#wbFlashPos').textContent = `${idx + 1} / ${queue.length}`;
  $('#wbFlashWord').textContent = w.word;
  $('#wbFlashIpa').textContent = w.ipa || '';
  $('#wbFlashZh').textContent = w.zh || '';
  $('#wbFlashZh').hidden = true;
  $('#wbFlashSent').textContent = w.sentence || '';
  $('#wbFlashSent').hidden = true;
}

async function startReview() {
  const now = Date.now();
  queue = items.filter((w) => (w.due || 0) <= now);
  if (!queue.length) { toast('今天没有到期要复习的词 🎉'); return; }
  shuffle(queue);
  idx = 0;
  enterReview();
  renderFlash();
}

async function grade(quality) {
  const w = queue[idx];
  if (w) { await api.reviewWord(settings.uid, w.word, quality).catch(() => {}); }
  idx++;
  if (idx >= queue.length) {
    toast(`本轮复习完成！共 ${queue.length} 个词 🎉`);
    confetti({ count: 90 });
    sfx('great');
    rewardSmall(`复习达标 +${queue.length}`);
    exitReview();
  } else {
    sfx('tick');
    renderFlash();
  }
}

async function delWord(word) {
  if (!confirm(`从单词本删除「${word}」？`)) return;
  await api.deleteWord(settings.uid, word).catch(() => {});
  toast(`已删除 ${word}`);
  loadWordbook();
}

/* ============ 初始化 ============ */
export function initWordbook() {
  $('#wbStartBtn').onclick = startReview;
  $('#wbFlashSound').onclick = () => { const w = queue[idx]; if (w) tts.speak(w.word, { rate: settings.rate }); };
  $('#wbFlashReveal').onclick = () => { $('#wbFlashZh').hidden = false; $('#wbFlashSent').hidden = false; };
  $('#wbRate0').onclick = () => grade(0);
  $('#wbRate3').onclick = () => grade(3);
  $('#wbRate5').onclick = () => grade(5);
  $('#wbList').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const word = btn.dataset.word;
    if (btn.dataset.act === 'sound') tts.speak(word, { rate: settings.rate });
    else if (btn.dataset.act === 'del') delWord(word);
  });
}

export { loadWordbook };
