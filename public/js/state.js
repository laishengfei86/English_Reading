/** 本地设置与用户标识（localStorage） */
const KEY = 'amread.settings.v1';

const defaults = {
  uid: '',
  theme: 'dark',
  ttsProvider: 'edge',
  voice: '',
  rate: 1,
  loop: false,
  autoNext: false,
  assessProvider: 'offline',
  useAsr: false,
  autoScore: true,
  lastLevel: 'beginner',
  lastGroup: '',
  mode: 'read', // 练习模式：read=跟读评分 / dictation=听写拼写
  dailyGoal: 5, // 每日打卡目标（跟读/听写练习次数）
  funSound: true, // 练习反馈音效（Web Audio 合成，无音频文件）
  funEffect: true, // 庆祝动效（Canvas 彩带 / 成就弹窗）
};

function randomUid() {
  return `u${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

export const settings = (() => {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { /* ignore */ }
  const s = { ...defaults, ...saved };
  if (!s.uid) s.uid = randomUid();
  return s;
})();

export function saveSettings() {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* ignore */ }
}

// 登录态（独立键，含 token / uid / username），刷新后据此恢复账号身份
const AUTH_KEY = 'amread.auth.v1';
function loadAuth() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null'); } catch { return null; }
}
// 关键：导出的是**稳定对象引用**，setAuth 原地改写它。
// 若改成每次赋新对象，已经 import 的 authState 会永远停在初次加载的快照，
// 导致登录成功后顶栏不刷新（看起来像"登录没生效"）。
export const authState = loadAuth() || {};
export const getAuth = loadAuth;
export function setAuth(a) {
  try { if (a) localStorage.setItem(AUTH_KEY, JSON.stringify(a)); else localStorage.removeItem(AUTH_KEY); } catch { /* ignore */ }
  const next = a || {};
  Object.keys(authState).forEach((k) => { delete authState[k]; });
  Object.assign(authState, next);
}

/** 服务端能力（启动时拉取） */
export const caps = {
  tts: { provider: 'edge', serverAvailable: { edge: true }, defaultVoice: {} },
  assess: { provider: 'offline', serverAvailable: { offline: true } },
  voices: {},
  loaded: false,
};
