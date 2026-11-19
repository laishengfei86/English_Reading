/** 素材页：自定义文本导入 / 我的素材 / 内置素材总览 */
import { $, esc, toast } from './util.js';
import { settings } from './state.js';
import { api } from './api.js';
import { lib, splitSentences, splitParagraphs, makeCustomGroup } from './materials.js';
import { loadGroup } from './practice.js';
import { loadProgress } from './progress.js';

let switchView = () => {};

export function initLibrary(switchViewFn) {
  switchView = switchViewFn;
  const ta = $('#customText');

  const splitMode = () => ($('#customSplitMode')?.value || 'auto');

  const preview = () => {
    const mode = splitMode();
    let units; let unitLabel;
    if (mode === 'whole') { units = [ta.value.replace(/\s+/g, ' ').trim()].filter(Boolean); unitLabel = '整篇'; }
    else if (mode === 'paragraph') { units = splitParagraphs(ta.value); unitLabel = '段'; }
    else { units = splitSentences(ta.value); unitLabel = '句'; }
    $('#customPreview').innerHTML = units.length
      ? `<p class="muted">将拆成 ${units.length} ${unitLabel}：</p>${units.slice(0, 12).map((s, i) => `<div class="p-line">${i + 1}. ${esc(s.length > 160 ? s.slice(0, 160) + '…' : s)}</div>`).join('')}${units.length > 12 ? `<p class="muted">… 其余 ${units.length - 12} ${unitLabel}省略</p>` : ''}`
      : '';
  };
  ta.oninput = preview;
  $('#customSplitMode')?.addEventListener('change', preview);

  $('#fileInput').onchange = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 400 * 1024) { toast('文件太大，请控制在 400KB 内'); return; }
    ta.value = await f.text();
    if (!$('#customTitle').value) $('#customTitle').value = f.name.replace(/\.[^.]+$/, '');
    preview();
    toast(`已导入 ${f.name}`);
  };

  $('#customStart').onclick = () => {
    const text = ta.value.trim();
    if (!text) { toast('请先粘贴或导入英文文本'); return; }
    if (!/[a-zA-Z]/.test(text)) { toast('看起来不是英文文本'); return; }
    const g = makeCustomGroup($('#customTitle').value.trim() || '自定义文本', text, splitMode());
    lib.byId.set(g.id, g);
    lib.custom = [g, ...(lib.custom || [])];
    settings.lastLevel = 'custom';
    loadGroup(g);
    switchView('practice');
  };

  $('#customSave').onclick = async () => {
    const text = ta.value.trim();
    if (!text) { toast('内容为空'); return; }
    try {
      await api.saveCustomText(settings.uid, $('#customTitle').value.trim(), text, splitMode());
      toast('已保存到我的素材');
      await loadProgress();
      renderMyTexts();
    } catch (e) {
      toast(`保存失败：${e.message}`);
    }
  };

  renderTree();
  renderMyTexts();
  window.addEventListener('progress:loaded', renderMyTexts);
}

export function renderMyTexts() {
  const box = $('#myTexts');
  const items = lib.custom || [];
  if (!items.length) {
    box.innerHTML = '<p class="muted">暂无保存的素材。上面粘贴文本后点「保存到我的素材」即可。</p>';
    return;
  }
  box.innerHTML = items.map((c) => `<div class="my-item" data-id="${c.id}">
      <div class="t"><b>${esc(c.title)}</b><small>${esc((c.raw || '').slice(0, 90))}</small></div>
      <div class="my-modes">
        <span class="muted sm">朗读方式</span>
        <div class="seg">
          <button class="seg-btn" data-m="whole">整篇</button>
          <button class="seg-btn" data-m="auto">自动分句</button>
          <button class="seg-btn" data-m="paragraph">自动分段</button>
        </div>
      </div>
      <div class="my-actions">
        <button class="btn" data-act="practice">▶ 练习</button>
        <button class="btn ghost" data-act="del">🗑</button>
      </div>
    </div>`).join('');

  box.querySelectorAll('.my-item').forEach((el) => {
    const id = el.dataset.id;
    const item = items.find((x) => x.id === id);

    // 朗读方式切换（持久化到该素材）
    const seg = el.querySelector('.seg');
    const syncSeg = (cur) => seg.querySelectorAll('.seg-btn').forEach((b) => b.classList.toggle('on', b.dataset.m === cur));
    syncSeg(item.splitMode || 'auto');
    seg.querySelectorAll('.seg-btn').forEach((b) => {
      b.onclick = async () => {
        const mode = b.dataset.m;
        if (mode === (item.splitMode || 'auto')) return;
        syncSeg(mode);
        try {
          const { item: upd } = await api.updateCustomText(settings.uid, id, { mode });
          item.splitMode = upd.mode;
          const cached = lib.byId.get(id);
          if (cached) cached.splitMode = upd.mode;
        } catch (e) { toast(`切换失败：${e.message}`); syncSeg(item.splitMode || 'auto'); }
      };
    });

    el.querySelector('[data-act=practice]').onclick = () => {
      const g = makeCustomGroup(item.title, item.raw || '', item.splitMode || 'auto');
      g.id = item.id;
      lib.byId.set(g.id, g);
      settings.lastLevel = 'custom';
      loadGroup(g);
      switchView('practice');
    };
    el.querySelector('[data-act=del]').onclick = async () => {
      try {
        await api.deleteCustomText(settings.uid, id);
        lib.custom = lib.custom.filter((x) => x.id !== id);
        renderMyTexts();
        toast('已删除');
      } catch (e) { toast(`删除失败：${e.message}`); }
    };
  });
}

function renderTree() {
  $('#libTree').innerHTML = lib.levels.map((lv) => `<div class="lv">
      <b>${esc(lv.name)}</b>
      <p class="muted">${esc(lv.desc)}</p>
      <div class="lib-groups">
        ${lv.groups.map((g) => `<div class="lib-group" data-gid="${g.id}">
            <b>${esc(g.title)}</b>
            <small>${g.type === 'word' ? '单词' : g.type === 'sentence' ? '句子' : '段落'} · ${g.items.length} 条${g.desc ? ` · ${esc(g.desc)}` : ''}</small>
          </div>`).join('')}
      </div>
    </div>`).join('');

  $('#libTree').querySelectorAll('.lib-group').forEach((el) => {
    el.onclick = () => {
      const g = lib.byId.get(el.dataset.gid);
      if (!g) return;
      loadGroup(g);
      switchView('practice');
    };
  });
}
