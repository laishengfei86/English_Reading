/**
 * 录音层：采集 PCM -> 重采样 16kHz -> 编码单声道 16bit WAV
 * 为什么不用 MediaRecorder：它输出 webm/opus，服务端与云端评测接口都需要 WAV/PCM，
 * 直接采 PCM 可以省掉 ffmpeg 依赖，也方便离线引擎做声学分析。
 */
const TARGET_SR = 16000;

function downsample(buffer, from, to) {
  if (from === to) return buffer;
  const ratio = from / to;
  const n = Math.floor(buffer.length / ratio);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const start = Math.floor(i * ratio);
    const end = Math.min(buffer.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    let c = 0;
    for (let j = start; j < end; j += 1) { sum += buffer[j]; c += 1; }
    out[i] = c ? sum / c : buffer[start] || 0;
  }
  return out;
}

function encodeWav(samples, sampleRate) {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buf);
  const str = (off, s) => { for (let i = 0; i < s.length; i += 1) view.setUint8(off + i, s.charCodeAt(i)); };
  str(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  str(8, 'WAVE');
  str(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  str(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  let off = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    off += 2;
  }
  return new Blob([buf], { type: 'audio/wav' });
}

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const fr = new FileReader();
  fr.onload = () => resolve(String(fr.result).split(',')[1]);
  fr.onerror = reject;
  fr.readAsDataURL(blob);
});

export class Recorder {
  constructor() {
    this.ctx = null;
    this.stream = null;
    this.node = null;
    this.analyser = null;
    this.chunks = [];
    this.recording = false;
    this.startedAt = 0;
  }

  static supported() {
    return Boolean(navigator.mediaDevices?.getUserMedia) && Boolean(window.AudioContext || window.webkitAudioContext);
  }

  static secure() {
    return window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  }

  async ensure() {
    if (!Recorder.supported()) {
      throw new Error('当前浏览器不支持录音（缺少 mediaDevices/getUserMedia）。');
    }
    if (!Recorder.secure()) {
      throw new Error('手机/局域网录音必须使用 HTTPS：请用 https://' + location.host + ' 重新打开（首次需在浏览器里信任证书）。');
    }
    if (this.ctx && this.stream?.active) return;
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    const src = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    src.connect(this.analyser);

    let useWorklet = false;
    if (this.ctx.audioWorklet) {
      try {
        await this.ctx.audioWorklet.addModule('/js/rec-worklet.js');
        this.node = new AudioWorkletNode(this.ctx, 'rec-processor');
        this.node.port.onmessage = (e) => { if (this.recording) this.chunks.push(e.data); };
        useWorklet = true;
      } catch { useWorklet = false; }
    }
    if (!useWorklet) {
      this.node = this.ctx.createScriptProcessor(4096, 1, 1);
      this.node.onaudioprocess = (e) => {
        if (!this.recording) return;
        this.chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      };
    }
    src.connect(this.node);
    // ScriptProcessor 必须连到 destination 才会跑；用 0 增益避免回放啸叫
    const mute = this.ctx.createGain();
    mute.gain.value = 0;
    this.node.connect(mute);
    mute.connect(this.ctx.destination);
  }

  async start() {
    await this.ensure();
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this.chunks = [];
    this.recording = true;
    this.startedAt = performance.now();
  }

  /** @returns {Promise<{blob:Blob,base64:string,url:string,durationMs:number}>} */
  async stop() {
    this.recording = false;
    const durationMs = performance.now() - this.startedAt;
    const srcRate = this.ctx?.sampleRate || 48000;
    const total = this.chunks.reduce((s, c) => s + c.length, 0);
    const merged = new Float32Array(total);
    let off = 0;
    for (const c of this.chunks) { merged.set(c, off); off += c.length; }
    this.chunks = [];
    const pcm16k = downsample(merged, srcRate, TARGET_SR);
    const blob = encodeWav(pcm16k, TARGET_SR);
    return {
      blob,
      base64: await blobToBase64(blob),
      url: URL.createObjectURL(blob),
      durationMs: Math.round(durationMs),
      samples: pcm16k.length,
    };
  }

  release() {
    try { this.stream?.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ }
    try { this.ctx?.close(); } catch { /* ignore */ }
    this.ctx = null;
    this.stream = null;
  }

  /** 实时波形绘制 */
  drawTo(canvas) {
    if (!canvas || !this.analyser) return () => {};
    const ctx2d = canvas.getContext('2d');
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    let raf = 0;
    const cs = getComputedStyle(document.documentElement);
    const brand = cs.getPropertyValue('--brand').trim() || '#2563eb';
    const bg = cs.getPropertyValue('--panel-2').trim() || '#eef2f9';
    const loop = () => {
      const w = canvas.width = canvas.clientWidth * devicePixelRatio;
      const h = canvas.height = canvas.clientHeight * devicePixelRatio;
      this.analyser.getByteTimeDomainData(data);
      ctx2d.fillStyle = bg;
      ctx2d.fillRect(0, 0, w, h);
      const bars = 64;
      const step = Math.floor(data.length / bars);
      const bw = w / bars;
      for (let i = 0; i < bars; i += 1) {
        let peak = 0;
        for (let j = 0; j < step; j += 1) peak = Math.max(peak, Math.abs(data[i * step + j] - 128) / 128);
        const bh = Math.max(2 * devicePixelRatio, peak * h * 0.92);
        ctx2d.fillStyle = brand;
        ctx2d.globalAlpha = this.recording ? 0.9 : 0.35;
        ctx2d.fillRect(i * bw + bw * 0.22, (h - bh) / 2, bw * 0.56, bh);
      }
      ctx2d.globalAlpha = 1;
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }
}

/** 浏览器语音识别（可选，用于离线引擎判定具体读错的词） */
export class Asr {
  constructor() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.available = Boolean(SR);
    this.SR = SR;
    this.transcript = '';
    this.rec = null;
  }

  start() {
    if (!this.available) return false;
    try {
      this.transcript = '';
      const r = new this.SR();
      r.lang = 'en-US';
      r.continuous = true;
      r.interimResults = true;
      r.maxAlternatives = 1;
      r.onresult = (e) => {
        let finalText = '';
        for (let i = 0; i < e.results.length; i += 1) finalText += `${e.results[i][0].transcript} `;
        this.transcript = finalText.trim();
      };
      r.onerror = () => {};
      r.start();
      this.rec = r;
      return true;
    } catch {
      return false;
    }
  }

  async stop() {
    try { this.rec?.stop(); } catch { /* ignore */ }
    await new Promise((r) => setTimeout(r, 320));
    const t = this.transcript;
    this.rec = null;
    return t;
  }
}
