/**
 * 语音播放层：浏览器内置语音 与 服务端云端 TTS 统一接口
 * - browser: SpeechSynthesis，零配置、免费，自动优选美式音色
 * - server : /api/tts 返回 mp3，音色更自然（edge / azure / tencent / openai）
 *
 * 关于「桌面端无声」：服务端合成(server)返回的音频通过 <audio> 播放，浏览器
 * 自动播放策略在「点击 → 异步 fetch → 再 play()」的链路里可能拦截 play()。
 * 这里在首次用户手势时预热音频（AudioContext resume + 静音预热），并在被拦截时
 * 等待下一次手势重试，确保 PC 也能稳定出声。
 */
import { api } from './api.js';
import { settings, caps } from './state.js';
import { toast } from './util.js';

const AMERICAN_PREFERRED = [
  'Microsoft Ava', 'Microsoft Emma', 'Microsoft Andrew', 'Microsoft Aria', 'Microsoft Jenny', 'Microsoft Guy',
  'Google US English', 'Samantha', 'Alex', 'Karen', 'Nicky', 'Aaron', 'Fred',
];

// 一段极短静音 WAV，用于在首次用户手势时「预热」音频元素，解锁自动播放限制
const SILENT_WAV = 'data:audio/wav;base64,UklGRmQGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YUAGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

class Tts {
  constructor() {
    // 复用同一个 <audio> 元素：被「激活」过一次后，后续异步 play() 更稳
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.urlCache = new Map();
    this.voices = [];
    this.current = null;
    this.stopped = false;
    this._unlocked = false;
    this._initBrowserVoices();
    this._initUnlock();
  }

  /** 首次任意用户手势时解锁音频（解决桌面端服务端语音无声） */
  _initUnlock() {
    const unlock = () => {
      if (this._unlocked) return;
      this._unlocked = true;
      // 1) 让 AudioContext 进入 running（Chrome 自动播放策略关键）
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) {
          const ctx = new Ctx();
          if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        }
      } catch { /* ignore */ }
      // 2) 用静音预热 <audio> 元素
      try {
        this.audio.src = SILENT_WAV;
        const p = this.audio.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch { /* ignore */ }
    };
    const events = ['pointerdown', 'touchstart', 'keydown', 'click'];
    const handler = () => {
      unlock();
      events.forEach((e) => window.removeEventListener(e, handler));
    };
    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
  }

  _initBrowserVoices() {
    if (!('speechSynthesis' in window)) return;
    const load = () => {
      this.voices = speechSynthesis.getVoices().filter((v) => /^en([-_]US)?/i.test(v.lang) || /en-US/i.test(v.voiceURI));
      if (!this.voices.length) this.voices = speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang));
    };
    load();
    speechSynthesis.addEventListener('voiceschanged', load);
    // Safari / Chrome 首次可能延迟返回
    setTimeout(load, 400);
    setTimeout(load, 1500);
  }

  browserVoices() { return this.voices; }

  pickBrowserVoice() {
    if (!this.voices.length) return null;
    if (settings.voice) {
      const hit = this.voices.find((v) => v.name === settings.voice);
      if (hit) return hit;
    }
    for (const p of AMERICAN_PREFERRED) {
      const hit = this.voices.find((v) => v.name.includes(p));
      if (hit) return hit;
    }
    return this.voices.find((v) => /en[-_]US/i.test(v.lang)) || this.voices[0];
  }

  /**
   * 服务端引擎的音色：若当前保存的音色不属于该引擎（例如残留的浏览器音色名），
   * 会自动改用服务端默认音色，避免把无效音色名发给服务端导致合成失败。
   */
  pickServerVoice(provider) {
    const list = (caps.voices && caps.voices[provider]) || [];
    if (!list.length) return settings.voice || '';
    const has = (id) => id && list.some((v) => String(v.id) === String(id));
    if (has(settings.voice)) return settings.voice;
    const def = caps.tts?.defaultVoice?.[provider];
    if (has(def)) return def;
    return list[0]?.id || '';
  }

  get provider() {
    const p = settings.ttsProvider || 'browser';
    if (p !== 'browser' && !caps.tts.serverAvailable?.[p]) return 'browser';
    return p;
  }

  stop() {
    this.stopped = true;
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    try { this.audio.pause(); this.audio.currentTime = 0; } catch { /* ignore */ }
  }

  /** 播放一段文本，返回 Promise（播放结束或被中断后 resolve） */
  async speak(text, { rate = settings.rate, voice = settings.voice, onWord } = {}) {
    const t = String(text || '').trim();
    if (!t) return;
    this.stop();
    this.stopped = false;
    if (this.provider === 'browser') return this._speakBrowser(t, rate, onWord);
    // 服务端引擎：先校正音色，防止把浏览器音色名发过去
    return this._speakServer(t, rate, voice || this.pickServerVoice(this.provider));
  }

  /** 只合成并返回音频 URL，不立即播放。配音秀用它把"对手台词"按句拼接成整幕回放。
   *  浏览器内置语音无法产出 URL，返回空串由调用方降级为直接朗读。 */
  async speakAsUrl(text, { rate = settings.rate, voice = settings.voice } = {}) {
    const t = String(text || '').trim();
    if (!t) return '';
    if (this.provider === 'browser') { this._speakBrowser(t, rate); return ''; }
    const v = voice || this.pickServerVoice(this.provider);
    const key = `${this.provider}|${v}|${rate}|${t}`;
    const cached = this.urlCache.get(key);
    if (cached) return cached;
    let url = '';
    try {
      url = await api.tts({ text: t, voice: v, rate, provider: this.provider });
    } catch {
      try { url = await api.tts({ text: t, voice: v, rate, provider: this.provider }); } catch { return ''; }
    }
    if (this.urlCache.size > 60) {
      const first = this.urlCache.keys().next().value;
      URL.revokeObjectURL(this.urlCache.get(first));
      this.urlCache.delete(first);
    }
    this.urlCache.set(key, url);
    return url;
  }

  _speakBrowser(text, rate, onWord) {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) {
        toast('当前浏览器不支持内置语音，请在设置里改用服务端 TTS');
        resolve();
        return;
      }
      const u = new SpeechSynthesisUtterance(text);
      const v = this.pickBrowserVoice();
      if (v) u.voice = v;
      u.lang = 'en-US';
      u.rate = Math.max(0.4, Math.min(2, rate));
      u.pitch = 1;
      let done = false;
      const finish = () => { if (!done) { done = true; resolve(); } };
      u.onend = finish;
      u.onerror = finish;
      if (onWord) {
        u.onboundary = (e) => { if (e.name === 'word' || e.charIndex != null) onWord(e.charIndex, e.charLength); };
      }
      this.current = u;
      speechSynthesis.speak(u);
      // 兜底：部分浏览器 onend 不触发
      const est = (text.length / 12) * 1000 * (1 / u.rate) + 2500;
      setTimeout(finish, Math.min(60000, est));
    });
  }

  async _speakServer(text, rate, voice) {
    const key = `${this.provider}|${voice}|${rate}|${text}`;
    let url = this.urlCache.get(key);
    if (!url) {
      const req = () => api.tts({ text, voice, rate, provider: this.provider });
      try {
        url = await req();
      } catch {
        // 网络抖动很常见，这里重试一次再判定失败
        try {
          url = await req();
        } catch (e2) {
          // 重要：绝不能改写 settings.ttsProvider。
          // 一旦改成 'browser' 并被后续 saveSettings() 落盘，该浏览器就会永久退回机械的
          // 浏览器语音（Chrome 自带英文音色少且机械，表现为"不支持真人发音"）。
          // 这里只在「本次」回退，用户选择的引擎保持不变。
          toast(`云端合成失败：${e2.message}；本次已回退浏览器语音（引擎设置保持不变）`);
          return this._speakBrowser(text, rate);
        }
      }
      if (this.urlCache.size > 60) {
        const first = this.urlCache.keys().next().value;
        URL.revokeObjectURL(this.urlCache.get(first));
        this.urlCache.delete(first);
      }
      this.urlCache.set(key, url);
    }
    if (this.stopped) return undefined;
    return new Promise((resolve) => {
      const a = this.audio;
      a.src = url;
      a.playbackRate = 1;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        a.removeEventListener('ended', finish);
        a.removeEventListener('error', onErr);
        resolve();
      };
      const onErr = () => {
        console.warn('[tts] 音频播放出错', a.error);
        toast('音频播放失败，请确认浏览器允许该网页播放声音');
        finish();
      };
      a.addEventListener('ended', finish);
      a.addEventListener('error', onErr);
      const p = a.play();
      if (p && typeof p.catch === 'function') {
        p.catch((err) => {
          console.warn('[tts] play() 被自动播放策略拦截', err);
          // 等到下一次用户手势再放（已在首次手势时解锁，这里属于兜底）
          toast('浏览器拦截了自动播放：点一下页面任意处即可出声');
          const retry = () => {
            document.removeEventListener('pointerdown', retry);
            document.removeEventListener('click', retry);
            try { a.play().catch(() => {}); } catch { /* ignore */ }
          };
          document.addEventListener('pointerdown', retry, { once: true });
          document.addEventListener('click', retry, { once: true });
          finish();
        });
      }
    });
  }
}

export const tts = new Tts();
