/** 与服务端交互（失败时抛出带中文消息的错误） */
function authToken() {
  try { return JSON.parse(localStorage.getItem('amread.auth.v1') || 'null')?.token || null; } catch { return null; }
}

async function jsonFetch(url, opts = {}) {
  const token = authToken();
  const resp = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(opts.headers || {}) },
  });
  const text = await resp.text();
  let data = null;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { error: text.slice(0, 200) }; }
  if (!resp.ok || data?.ok === false) {
    throw new Error(data?.error || `请求失败 HTTP ${resp.status}`);
  }
  return data;
}

export const api = {
  // 能力接口必须绝对新鲜：浏览器/代理可能错误缓存旧 GET 响应，导致音色列表/引擎可用性错误。
  // 优先用 POST + no-store（彻底绕过缓存）；旧服务端不支持 POST 时回退到带时间戳的 GET。
  capabilities: async () => {
    const parse = async (r) => {
      const text = await r.text();
      let j = {};
      try { j = text ? JSON.parse(text) : {}; } catch { j = { ok: false, error: text.slice(0, 200) }; }
      if (!r.ok || j?.ok === false) throw new Error(j?.error || `capabilities HTTP ${r.status}`);
      return j;
    };
    const post = await fetch('/api/capabilities', { method: 'POST', body: '{}', cache: 'no-store' });
    if (post.status === 404) {
      // 旧服务端，回退 GET 并带时间戳穿透缓存
      const get = await fetch(`/api/capabilities?t=${Date.now()}`, { cache: 'no-store' });
      return parse(get);
    }
    return parse(post);
  },

  // 素材数据经常更新，必须 no-store，否则浏览器会长期缓存旧版本（看不到新增的学历段/考试段）
  materials: () => fetch('/data/materials.json', { cache: 'no-store' }).then((r) => r.json()),

  split: (text) => jsonFetch('/api/split', { method: 'POST', body: JSON.stringify({ text }) }),

  hints: (word) => jsonFetch(`/api/hints?word=${encodeURIComponent(word)}`),

  assess: (payload) => jsonFetch('/api/assess', { method: 'POST', body: JSON.stringify(payload) }),

  progress: (uid) => jsonFetch(`/api/progress?uid=${encodeURIComponent(uid)}`),

  clearProgress: (uid) => jsonFetch('/api/progress/clear', { method: 'POST', body: JSON.stringify({ uid }) }),

  addRecord: (uid, record) => jsonFetch('/api/progress', { method: 'POST', body: JSON.stringify({ uid, record }) }),

  saveSettings: (uid, settings) => jsonFetch('/api/settings', { method: 'POST', body: JSON.stringify({ uid, settings }) }),

  saveCustomText: (uid, title, text, mode) => jsonFetch('/api/custom-text', { method: 'POST', body: JSON.stringify({ uid, title, text, mode }) }),

  deleteCustomText: (uid, id) => jsonFetch('/api/custom-text/delete', { method: 'POST', body: JSON.stringify({ uid, id }) }),

  updateCustomText: (uid, id, patch) => jsonFetch('/api/custom-text/update', { method: 'POST', body: JSON.stringify({ uid, id, ...patch }) }),

  /** 听写错词入库（单词本 / SRS 预热） */
  recordMistake: (uid, m) => jsonFetch('/api/wordbook', { method: 'POST', body: JSON.stringify({ uid, ...m }) }),

  wordbook: (uid) => jsonFetch(`/api/wordbook?uid=${encodeURIComponent(uid)}`),

  reviewWord: (uid, word, quality) => jsonFetch('/api/wordbook/review', { method: 'POST', body: JSON.stringify({ uid, word, quality }) }),

  deleteWord: (uid, word) => jsonFetch('/api/wordbook/delete', { method: 'POST', body: JSON.stringify({ uid, word }) }),

  // ---------- 账号（多用户） ----------
  register: (username, password) => jsonFetch('/api/auth/register', { method: 'POST', body: JSON.stringify({ username, password }) }),
  login: (username, password) => jsonFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),

  // ---------- 数据导入 / 导出（完整备份） ----------
  exportData: () => jsonFetch('/api/export'),
  importData: (data) => jsonFetch('/api/import', { method: 'POST', body: JSON.stringify({ data }) }),

  /** 服务端 TTS：返回可播放的 Blob URL */
  async tts({ text, voice, rate, provider }) {
    const resp = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice, rate, provider }),
    });
    if (!resp.ok) {
      let msg = `语音合成失败 HTTP ${resp.status}`;
      try { const j = await resp.json(); if (j?.error) msg = j.error; } catch { /* ignore */ }
      throw new Error(msg);
    }
    return URL.createObjectURL(await resp.blob());
  },
};
