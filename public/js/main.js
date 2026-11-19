/**
 * 前端入口：初始化各视图、Tab 切换、主题、引擎徽章、设置页、部署说明。
 * 模块采用原生 ES Module，无构建步骤，浏览器直接加载。
 */
import { $, $$, toast, fmtDate, esc } from './util.js';
import { settings, saveSettings, caps, authState, setAuth } from './state.js';
import { api } from './api.js';
import { tts } from './tts.js';
import { loadMaterials } from './materials.js';
import { initPractice, loadGroup, practiceStop } from './practice.js';
import { initLibrary } from './library.js';
import { loadProgress, redrawCharts } from './progress.js';
import { initPWA } from './pwa.js';
import { initWordbook, loadWordbook } from './wordbook.js';
import { initDub, loadDub } from './dub.js';
import { initPhonics, loadPhonics } from './phonics.js';
import { initRoots, loadRoots } from './roots.js';
import { refreshLevelChip } from './fun.js';

const TTS_LABEL = { edge: '真人语音', browser: '浏览器语音', azure: 'Azure 语音', tencent: '腾讯云语音', openai: 'OpenAI 语音' };
const ASSESS_LABEL = { offline: '离线声学引擎', azure: 'Azure 发音评估', tencent: '腾讯云智聆评测' };

/* ================= 主题 ================= */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  settings.theme = theme;
  $('#themeBtn').textContent = theme === 'dark' ? '🌓' : '☀️';
}

/* ================= 引擎徽章 + 提示 ================= */
function updateEngineBadge() {
  const t = TTS_LABEL[settings.ttsProvider] || '语音';
  const a = ASSESS_LABEL[settings.assessProvider] || '评分';
  $('#engineBadge').textContent = `🔊 ${t} · 📊 ${a}`;
  const ne = $('#navEngine');
  if (ne) ne.textContent = `🔊 ${t} · 📊 ${a}`;
}

function updateProviderTips() {
  // TTS
  const tp = settings.ttsProvider;
  const tTip = $('#ttsProviderTip');
  if (tp === 'edge') {
    tTip.textContent = '微软神经网络真人语音：免费、无需 Key，提供男声/女声自然音色。需服务器可访问外网；失败时自动回退浏览器语音。';
  } else if (tp === 'browser') {
    tTip.textContent = '使用浏览器内置语音：免费、零配置，但音色偏机械，取决于访问者本机系统。';
  } else if (caps.tts?.serverAvailable?.[tp]) {
    tTip.textContent = `已检测到服务端 ${TTS_LABEL[tp]} 密钥，将调用云端神经语音，音色更自然。`;
  } else {
    tTip.textContent = `⚠️ 服务端未配置 ${TTS_LABEL[tp]} 密钥，将自动回退为真人语音/浏览器语音。请在 .env 配置对应密钥。`;
  }
  // 音色下拉的提示随引擎变化
  const vTip = $('#voiceTip');
  if (vTip) {
    vTip.textContent = tp === 'browser'
      ? '浏览器引擎下仅列出系统里的 en-US 音色；Windows 推荐 Microsoft Aria / Jenny，macOS 推荐 Samantha。'
      : '推荐：女声 Ava（自然）、Jenny（亲切）；男声 Andrew（自然）、Guy（沉稳）。';
  }
  // Assess
  const ap = settings.assessProvider;
  const aTip = $('#assessProviderTip');
  if (ap === 'offline') {
    aTip.textContent = '离线声学引擎：无需任何密钥即可运行；基于音节/信噪比/流利度启发式估分，适合趋势跟踪。';
  } else if (caps.assess?.serverAvailable?.[ap]) {
    aTip.textContent = `已检测到云端 ${ASSESS_LABEL[ap]} 密钥，将给出音素级精确评分。`;
  } else {
    aTip.textContent = `⚠️ 服务端未配置 ${ASSESS_LABEL[ap]} 所需密钥/AppId，将自动回退为离线声学引擎。`;
  }
}

/* ================= 音色下拉 ================= */
function populateVoices(provider) {
  const sel = $('#setVoice');
  // 先留住用户已保存的音色：下面的「加载中 / 无音色」分支必须直接 return，
  // 否则会把 settings.voice 清空，导致刷新后音色被悄悄重置回第一个（表现为"选不了音色"）。
  const saved = settings.voice;
  if (provider === 'browser') {
    const vs = tts.browserVoices() || [];
    if (!vs.length) {
      sel.innerHTML = '<option value="">（本机无 en-US 音色，建议使用云端 TTS）</option>';
      sel.value = '';
      return;
    }
    sel.innerHTML = vs.map((v) => `<option value="${esc(v.name)}">${esc(v.name)}（${esc(v.lang)}）</option>`).join('');
    sel.value = saved && vs.some((v) => v.name === saved) ? saved : (vs[0]?.name || '');
  } else {
    const vs = (caps.voices && caps.voices[provider]) || [];
    if (!vs.length) {
      sel.innerHTML = `<option value="">${caps.loaded ? '（该引擎无可选音色）' : '（音色加载中…）'}</option>`;
      sel.value = '';
      return;
    }
    sel.innerHTML = vs.map((v) => `<option value="${esc(v.id)}">${esc(v.name)}</option>`).join('');
    sel.value = saved && vs.some((v) => String(v.id) === String(saved)) ? saved : (vs[0]?.id || '');
  }
  settings.voice = sel.value;
}

/* ================= 视图切换 ================= */
let currentView = 'practice';
function switchView(name) {
  currentView = name;
  $$('#tabs .tab').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
  $$('#navDrawer .nav-item').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
  $$('.view').forEach((v) => v.classList.toggle('active', v.id === `view-${name}`));
  $('#sidePanel')?.classList.remove('open');
  $('#scrim')?.classList.remove('show');
  closeNav();
  if (name === 'progress') loadProgress();
  if (name === 'wordbook') loadWordbook();
  if (name === 'dub') loadDub();
  if (name === 'phonics') loadPhonics();
  if (name === 'roots') loadRoots();
  if (name === 'settings') { populateVoices(settings.ttsProvider); }
  if (name !== 'practice') practiceStop();
  if (name === 'progress') redrawCharts();
}

/* ================= 移动端汉堡菜单 ================= */
function openNav() {
  $('#navDrawer')?.classList.add('open');
  $('#navScrim')?.classList.add('show');
  $('#navDrawer')?.setAttribute('aria-hidden', 'false');
}
function closeNav() {
  $('#navDrawer')?.classList.remove('open');
  $('#navScrim')?.classList.remove('show');
  $('#navDrawer')?.setAttribute('aria-hidden', 'true');
}

/* ================= 设置页 ================= */
function fillSettingsForm() {
  $('#setTtsProvider').value = settings.ttsProvider;
  $('#setAssessProvider').value = settings.assessProvider;
  $('#setAsr').checked = !!settings.useAsr;
  $('#setAutoScore').checked = settings.autoScore !== false;
  $('#setUid').value = settings.uid || '';
  $('#setDailyGoal').value = settings.dailyGoal || 5;
  const rate = $('#setRate');
  rate.value = settings.rate;
  $('#setRateVal').textContent = `${Number(settings.rate).toFixed(2)}×`;
  populateVoices(settings.ttsProvider);
  updateProviderTips();
  updateEngineBadge();
}

function bindSettings() {
  $('#setTtsProvider').onchange = () => {
    settings.ttsProvider = $('#setTtsProvider').value;
    saveSettings();
    populateVoices(settings.ttsProvider);
    updateProviderTips();
    updateEngineBadge();
  };
  $('#setVoice').onchange = () => { settings.voice = $('#setVoice').value; saveSettings(); };
  $('#setRate').oninput = () => {
    settings.rate = Number($('#setRate').value);
    $('#setRateVal').textContent = `${settings.rate.toFixed(2)}×`;
    saveSettings();
    const pr = $('#rateRange');
    if (pr) { pr.value = settings.rate; $('#rateVal').textContent = `${settings.rate.toFixed(2)}×`; }
  };
  $('#setAssessProvider').onchange = () => {
    settings.assessProvider = $('#setAssessProvider').value;
    saveSettings();
    updateProviderTips();
    updateEngineBadge();
  };
  $('#setAsr').onchange = () => { settings.useAsr = $('#setAsr').checked; saveSettings(); };
  $('#setAutoScore').onchange = () => { settings.autoScore = $('#setAutoScore').checked; saveSettings(); };
  $('#setUid').onchange = () => { settings.uid = $('#setUid').value.trim() || settings.uid; saveSettings(); };
  $('#setFunSound').checked = settings.funSound !== false;
  $('#setFunSound').onchange = () => { settings.funSound = $('#setFunSound').checked; saveSettings(); };
  $('#setFunEffect').checked = settings.funEffect !== false;
  $('#setFunEffect').onchange = () => { settings.funEffect = $('#setFunEffect').checked; saveSettings(); };
  $('#setDailyGoal').onchange = () => {
    settings.dailyGoal = Math.max(1, Math.min(50, parseInt($('#setDailyGoal').value, 10) || 5));
    $('#setDailyGoal').value = settings.dailyGoal;
    saveSettings();
    if (currentView === 'progress') loadProgress();
  };

  $('#testVoiceBtn').onclick = async () => {
    toast('正在试听…');
    await tts.speak('This is standard American English.', { rate: settings.rate });
  };

  /**
   * 真人发音自检：逐步验证「能力接口 → 服务端合成 → 音频播放」，
   * 用于在 Chrome / Edge 等浏览器上定位到底卡在哪一步。
   */
  $('#diagVoiceBtn').onclick = async () => {
    const out = $('#diagOut');
    out.hidden = false;
    const lines = [`浏览器：${navigator.userAgent.slice(0, 90)}`];
    const log = (s) => { lines.push(s); out.textContent = lines.join('\n'); };

    // ① 能力接口
    try {
      const t0 = Date.now();
      const c = await api.capabilities();
      Object.assign(caps, c);
      caps.loaded = true;
      const age = c.time ? `${Date.now() - c.time}ms` : '未知';
      log(`① 能力接口 OK｜默认引擎=${c.tts?.provider}｜edge 可用=${!!c.tts?.serverAvailable?.edge}｜edge 音色数=${(c.voices?.edge || []).length}`);
      log(`   服务端时间=${c.time || '无'}｜客户端延迟=${age}（>5s 说明是旧缓存）`);
      if (c.tts?.provider !== 'edge' || !c.tts?.serverAvailable?.edge) {
        log('   ⚠️ 服务端配置不是 edge，或未启用 edge。若你访问的是公网服务器，请确认该服务器已拉取最新代码并重启。');
      }
    } catch (e) {
      log(`① 能力接口 失败：${e.message}`);
      return;
    }

    const prov = settings.ttsProvider;
    if (prov === 'browser') {
      const bv = tts.browserVoices().length;
      log(`② 当前引擎=浏览器内置语音（本机 en 音色数=${bv}）`);
      log('   → 想要真人发音，请把上面「合成引擎」改回「在线真人语音 · 微软神经网络」。');
      log('   注意：真人发音由服务器合成，与用 Edge 还是 Chrome 浏览器无关。');
      return;
    }
    const voice = tts.pickServerVoice(prov);
    if (!caps.tts.serverAvailable?.[prov]) {
      log(`② 引擎=${prov} 但服务端标记不可用，实际会走浏览器语音（音色数=${tts.browserVoices().length}）`);
    } else {
      log(`② 引擎=${prov}｜将使用音色=${voice || '(空)'}`);
    }

    // ② 服务端合成
    let blob;
    const t0 = Date.now();
    try {
      const resp = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'This is standard American English.', voice, rate: settings.rate, provider: prov }),
      });
      if (!resp.ok) {
        let msg = `HTTP ${resp.status}`;
        try { const j = await resp.json(); if (j?.error) msg = j.error; } catch { /* ignore */ }
        throw new Error(msg);
      }
      blob = await resp.blob();
      log(`③ 服务端合成 OK｜${blob.size} 字节｜${blob.type || '未知类型'}｜耗时 ${Date.now() - t0}ms`);
      if (!blob.size) log('   ⚠️ 返回 0 字节，服务端没能合成出音频');
    } catch (e) {
      log(`③ 服务端合成 失败：${e.message}`);
      log('   → 多为服务器无法访问外网（微软语音端点），或音色名无效。');
      return;
    }

    // ③ 音频播放
    try {
      const a = new Audio();
      a.src = URL.createObjectURL(blob);
      await a.play();
      log('④ 音频播放 OK｜现在应该能听到声音 ✅');
    } catch (e) {
      log(`④ 音频播放 被拦截：${e.name} ${e.message}`);
      log('   → 浏览器自动播放策略。请点一下页面任意处再试听；若反复被拦，检查系统音量与站点声音权限。');
    }
  };

  $('#exportBtn').onclick = async () => {
    try {
      const { data } = await api.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `english-reading-backup-${fmtDate(Date.now())}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast('已导出完整备份（含练习记录 / 单词本 / 设置）');
    } catch (e) { toast(`导出失败：${e.message}`); }
  };

  $('#importBtn').onclick = () => $('#importFile').click();
  $('#importFile').onchange = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    try {
      const text = await f.text();
      const data = JSON.parse(text);
      if (!data || typeof data !== 'object') throw new Error('文件格式不正确');
      await api.importData(data);
      toast('导入成功，正在刷新数据…');
      await loadProgress();
      if (currentView === 'wordbook') loadWordbook();
    } catch (err) { toast(`导入失败：${err.message}`); }
    e.target.value = '';
  };

  $('#clearBtn').onclick = async () => {
    if (!window.confirm('确定清空所有练习记录与统计数据？此操作不可恢复。')) return;
    try {
      await api.clearProgress(settings.uid);
      toast('已清空练习记录');
      await loadProgress();
    } catch (e) { toast(`清空失败：${e.message}`); }
  };
}

/* ================= 账号（多用户） ================= */
function refreshAuthUI() {
  const a = authState;
  if (a && a.username) {
    $('#loginBtn').hidden = true;
    $('#userBox').hidden = false;
    $('#userName').textContent = a.username;
  } else {
    $('#loginBtn').hidden = false;
    $('#userBox').hidden = true;
  }
}

function initAuth() {
  let mode = 'login'; // login | register
  const modal = $('#authModal');
  const title = $('#authTitle');
  const submit = $('#authSubmit');
  const errEl = $('#authErr');
  const setMode = (m) => {
    mode = m;
    title.textContent = m === 'login' ? '登录' : '注册账号';
    submit.textContent = m === 'login' ? '登录' : '注册';
    $('#authSwitch').textContent = m === 'login' ? '去注册' : '去登录';
    errEl.textContent = '';
  };
  const open = () => { setMode('login'); modal.hidden = false; $('#authUser').focus(); };
  const close = () => { modal.hidden = true; $('#authPass').value = ''; };

  $('#loginBtn').onclick = open;
  $('#authClose').onclick = close;
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  $('#authSwitch').onclick = () => setMode(mode === 'login' ? 'register' : 'login');
  // 密码可见开关：方便确认自己实际输入了什么（避免输入法全角字符等不可见差异）
  $('#authEye').onclick = () => {
    const el = $('#authPass');
    el.type = el.type === 'password' ? 'text' : 'password';
    $('#authEye').textContent = el.type === 'password' ? '👁' : '🙈';
  };

  submit.onclick = async () => {
    const username = $('#authUser').value.trim();
    const password = $('#authPass').value;
    if (username.length < 3 || password.length < 6) { errEl.textContent = '用户名≥3位、密码≥6位'; return; }
    submit.disabled = true;
    try {
      const fn = mode === 'login' ? api.login : api.register;
      const { token, uid, username: uname } = await fn(username, password);
      setAuth({ token, uid, username: uname });
      settings.uid = uid;
      saveSettings();
      close();
      refreshAuthUI();
      toast(`已以 ${uname} 身份登录`);
      await loadProgress();
      if (currentView === 'wordbook') loadWordbook();
    } catch (e) {
      const msg = e.message || '操作失败';
      // 登录类失败补充排查提示（密码含全角字符/输入法干扰是最常见原因）
      errEl.textContent = (mode === 'login' && /密码|登录|401/.test(msg))
        ? `${msg}（请确认输入法已切到英文；忘记密码可让管理员在 /admin 重置）`
        : msg;
    } finally {
      submit.disabled = false;
    }
  };

  $('#logoutBtn').onclick = () => {
    setAuth(null);
    // 退出后回到本地匿名身份（保留本地随机 uid，账号数据仍在服务端 acc_ 命名空间）
    refreshAuthUI();
    toast('已退出登录');
    if (currentView === 'progress' || currentView === 'wordbook') { loadProgress(); if (currentView === 'wordbook') loadWordbook(); }
  };

  refreshAuthUI();
}

/* ================= 部署 / 配置说明 ================= */
function fillHelpBox() {
  $('#helpBox').innerHTML = `
    <h4>① 本地运行</h4>
    <pre>cd 项目目录
npm start            # 等价于 node server/server.js
# 浏览器打开 http://localhost:7000</pre>
    <p class="muted">零依赖：无需 <code>npm install</code>。默认浏览器语音 + 离线评分为零配置即用。</p>

    <h4>② 局域网 / 公网访问与 HTTPS</h4>
    <ul>
      <li><b>必须 HTTPS 才能录音</b>：浏览器只在 <code>https://</code> 或 <code>localhost</code> 下允许访问麦克风。手机用局域网 IP 访问时必须走 HTTPS。</li>
      <li><b>本机已内置自签名证书</b>：项目 <code>certs/</code> 目录下有 <code>cert.pem</code> / <code>key.pem</code>，服务启动会自动启用 HTTPS。请用手机浏览器打开 <code>https://&lt;本机IP&gt;:7000</code>。</li>
      <li><b>信任证书</b>：首次访问会提示「证书风险」，请选择「高级 → 继续访问 / 信任此证书」。iOS 需到「设置 → 通用 → 关于本机 → 证书信任设置」里开启完全信任。</li>
      <li><b>端口</b>：服务默认监听 <code>7000</code>，可用环境变量 <code>PORT</code> / <code>HOST</code> 调整。</li>
      <li><b>目录可写</b>：学习数据写入 <code>DATA_DIR</code>（默认 ./data），请确保该目录可写。</li>
      <li><b>CORS / 域名</b>：纯前端直连同源部署即可；若把 API 与静态资源分离，需在服务端允许对应跨域。</li>
    </ul>

    <h4>③ 语音合成（听读原音）</h4>
    <p class="muted"><b>默认即「在线真人语音」（微软神经网络，免费、无需 Key）</b>，男声/女声自然音色开箱即用，无需任何配置。仅在服务器无法访问外网时，才会回退为浏览器内置语音。</p>
    <p>如需接入其它云端引擎，在项目根目录新建 <code>.env</code>（参考 <code>.env.example</code>）：</p>
    <pre># Azure 神经网络语音
TTS_PROVIDER=azure
AZURE_SPEECH_KEY=你的key
AZURE_SPEECH_REGION=eastus

# 或 腾讯云语音合成
TTS_PROVIDER=tencent
TENCENT_SECRET_ID=xxx
TENCENT_SECRET_KEY=xxx

# 或 OpenAI 兼容
TTS_PROVIDER=openai
OPENAI_API_KEY=sk-xxx</pre>
    <p class="muted">未配置密钥时，会在「设置」里提示并自动回退为浏览器语音。</p>

    <h4>④ 接入云端发音评分（音素级精确打分）</h4>
    <pre># Azure 发音评估（推荐，音素/单词级反馈）
ASSESS_PROVIDER=azure
AZURE_SPEECH_KEY=你的key
AZURE_SPEECH_REGION=eastus

# 或 腾讯云智聆口语评测
ASSESS_PROVIDER=tencent
TENCENT_SECRET_ID=xxx
TENCENT_SECRET_KEY=xxx
TENCENT_SOE_APPID=你的appid</pre>
    <p class="muted">未配置时回退为离线声学引擎，仍给出总分与细分维度，适合趋势跟踪。</p>

    <h4>⑤ 评分权重（可选）</h4>
    <pre>SCORE_W_ACCURACY=0.5
SCORE_W_FLUENCY=0.3
SCORE_W_COMPLETENESS=0.2</pre>`;
}

/* ================= 启动 ================= */
async function boot() {
  applyTheme(settings.theme || 'dark');
  updateEngineBadge();

  // 登录态恢复：已登录则把数据归属切到账号 uid（acc_ 命名空间）
  if (authState && authState.uid) settings.uid = authState.uid;

  // Tab 切换
  $$('#tabs .tab').forEach((b) => { b.onclick = () => switchView(b.dataset.view); });
  $('#themeBtn').onclick = () => applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');

  // 移动端汉堡菜单
  $('#menuBtn').onclick = openNav;
  $('#navClose').onclick = closeNav;
  $('#navScrim').onclick = closeNav;
  $$('#navList .nav-item').forEach((b) => { b.onclick = () => switchView(b.dataset.view); });
  $('#navThemeBtn').onclick = () => applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  // 桌面端不显示抽屉，强制复位状态
  if (window.matchMedia('(min-width: 901px)').matches) closeNav();

  // 设置页
  fillSettingsForm();
  bindSettings();
  fillHelpBox();

  // PWA（Service Worker / 安装按钮）
  initPWA();

  // 账号（登录 / 注册 / 登出）
  initAuth();

  // 数据
  try {
    await loadMaterials();
  } catch (e) {
    toast(`素材加载失败：${e.message}`);
  }
  initPractice();
  initLibrary(switchView);
  initWordbook();
  initDub();
  initPhonics();
  initRoots();
  await loadProgress();
  refreshLevelChip(); // 顶栏等级（所有用户可见，含匿名）

  // 能力（决定音色下拉 / 提示）
  try {
    const c = await api.capabilities();
    Object.assign(caps, c);
    caps.loaded = true;
    updateProviderTips();
    updateEngineBadge();
    populateVoices(settings.ttsProvider); // 能力到达后无条件刷新音色下拉
  } catch (e) {
    // 能力拉取失败不阻塞，使用 state.js 默认
  }

  // 浏览器语音可能异步加载
  window.speechSynthesis?.addEventListener?.('voiceschanged', () => {
    if (currentView === 'settings' && settings.ttsProvider === 'browser') populateVoices('browser');
  });

  // 窗口尺寸变化时重绘图表
  let rz;
  window.addEventListener('resize', () => {
    clearTimeout(rz);
    rz = setTimeout(() => { if (currentView === 'progress') redrawCharts(); }, 150);
  });

  toast('准备就绪，开始你的美语听读吧 🎧');
}

boot();
