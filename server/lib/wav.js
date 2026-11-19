/** WAV 解析 / 生成（仅支持 PCM 16bit 与 32bit float，单声道优先） */

export function parseWav(buffer) {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  if (buf.length < 44 || buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') {
    throw Object.assign(new Error('不是合法的 WAV 音频'), { status: 400 });
  }
  let pos = 12;
  let fmt = null;
  let dataStart = -1;
  let dataLen = 0;
  while (pos + 8 <= buf.length) {
    const id = buf.toString('ascii', pos, pos + 4);
    const size = buf.readUInt32LE(pos + 4);
    const body = pos + 8;
    if (id === 'fmt ') {
      fmt = {
        audioFormat: buf.readUInt16LE(body),
        channels: buf.readUInt16LE(body + 2),
        sampleRate: buf.readUInt32LE(body + 4),
        bitsPerSample: buf.readUInt16LE(body + 14),
      };
    } else if (id === 'data') {
      dataStart = body;
      dataLen = Math.min(size, buf.length - body);
    }
    pos = body + size + (size % 2);
  }
  if (!fmt || dataStart < 0) throw Object.assign(new Error('WAV 缺少 fmt/data 块'), { status: 400 });

  const { channels, sampleRate, bitsPerSample, audioFormat } = fmt;
  const bytes = bitsPerSample / 8;
  const frames = Math.floor(dataLen / (bytes * channels));
  const out = new Float32Array(frames);
  for (let i = 0; i < frames; i += 1) {
    let sum = 0;
    for (let c = 0; c < channels; c += 1) {
      const off = dataStart + (i * channels + c) * bytes;
      let v = 0;
      if (audioFormat === 3 && bitsPerSample === 32) v = buf.readFloatLE(off);
      else if (bitsPerSample === 16) v = buf.readInt16LE(off) / 32768;
      else if (bitsPerSample === 8) v = (buf.readUInt8(off) - 128) / 128;
      else if (bitsPerSample === 32) v = buf.readInt32LE(off) / 2147483648;
      else throw Object.assign(new Error(`不支持的位深 ${bitsPerSample}`), { status: 400 });
      sum += v;
    }
    out[i] = sum / channels;
  }
  return { samples: out, sampleRate, channels, bitsPerSample };
}

/** 线性重采样到目标采样率 */
export function resample(samples, from, to) {
  if (from === to) return samples;
  const ratio = from / to;
  const n = Math.floor(samples.length / ratio);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const x = i * ratio;
    const i0 = Math.floor(x);
    const i1 = Math.min(i0 + 1, samples.length - 1);
    const t = x - i0;
    out[i] = samples[i0] * (1 - t) + samples[i1] * t;
  }
  return out;
}

/** Float32 -> 16bit PCM WAV Buffer */
export function encodeWav(samples, sampleRate = 16000) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVE', 8, 'ascii');
  buf.write('fmt ', 12, 'ascii');
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36, 'ascii');
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i += 1) {
    let v = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  return buf;
}

/** 从 base64（可带 dataURL 前缀）取出 Buffer */
export function bufferFromBase64(b64) {
  const s = String(b64 || '');
  const comma = s.indexOf(',');
  const body = s.startsWith('data:') && comma > 0 ? s.slice(comma + 1) : s;
  return Buffer.from(body, 'base64');
}
