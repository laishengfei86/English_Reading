/**
 * 极简零依赖 WebSocket 客户端（仅够 Edge 神经语音合成使用）
 * - 握手：HTTP/1.1 Upgrade，校验 Sec-WebSocket-Accept
 * - 发送：客户端帧强制掩码（RFC6455）
 * - 接收：解析 text/binary/continuation/ping/close 帧，支持分片重组
 */
import crypto from 'node:crypto';
import https from 'node:https';
import { EventEmitter } from 'node:events';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

export class WsClient extends EventEmitter {
  constructor(url, headers = {}) {
    super();
    this.url = new URL(url);
    this.headers = headers;
    this.buffer = Buffer.alloc(0);
    this.fragOpcode = 0;
    this.fragChunks = [];
    this.closed = false;
    this.socket = null;
  }

  connect(timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const key = crypto.randomBytes(16).toString('base64');
      const timer = setTimeout(() => { try { req.destroy(); } catch { /* ignore */ } reject(new Error('WS 连接超时')); }, timeoutMs);
      const req = https.request({
        hostname: this.url.hostname,
        port: this.url.port ? Number(this.url.port) : 443,
        path: this.url.pathname + this.url.search,
        method: 'GET',
        headers: {
          Connection: 'Upgrade',
          Upgrade: 'websocket',
          'Sec-WebSocket-Key': key,
          'Sec-WebSocket-Version': '13',
          ...this.headers,
        },
      });
      req.on('upgrade', (res, socket) => {
        clearTimeout(timer);
        const accept = res.headers['sec-websocket-accept'];
        const expect = crypto.createHash('sha1').update(key + GUID).digest('base64');
        if (accept !== expect) { socket.destroy(); return reject(new Error('WS 握手校验失败')); }
        this.socket = socket;
        socket.on('data', (d) => this._onData(d));
        socket.on('error', (e) => this.emit('error', e));
        socket.on('close', () => { this.closed = true; this.emit('close'); });
        resolve();
      });
      req.on('response', (res) => {
        clearTimeout(timer);
        let body = '';
        res.on('data', (c) => { body += c; });
        res.on('end', () => reject(new Error(`WS 升级被拒绝 HTTP ${res.statusCode}`)));
      });
      req.on('error', (e) => { clearTimeout(timer); reject(e); });
      req.end();
    });
  }

  _onData(d) {
    this.buffer = Buffer.concat([this.buffer, d]);
    for (;;) {
      const frame = this._parseFrame();
      if (!frame) break;
      this._handleFrame(frame);
    }
  }

  _parseFrame() {
    const b = this.buffer;
    if (b.length < 2) return null;
    const fin = (b[0] & 0x80) !== 0;
    const opcode = b[0] & 0x0f;
    const masked = (b[1] & 0x80) !== 0;
    let len = b[1] & 0x7f;
    let offset = 2;
    if (len === 126) { if (b.length < 4) return null; len = b.readUInt16BE(2); offset = 4; }
    else if (len === 127) { if (b.length < 10) return null; len = Number(b.readBigUInt64BE(2)); offset = 10; }
    let maskKey = null;
    if (masked) {
      if (b.length < offset + 4) return null;
      maskKey = b.slice(offset, offset + 4); offset += 4;
    }
    if (b.length < offset + len) return null;
    let payload = b.slice(offset, offset + len);
    if (maskKey) {
      payload = Buffer.from(payload);
      for (let i = 0; i < payload.length; i++) payload[i] ^= maskKey[i % 4];
    }
    this.buffer = b.slice(offset + len);
    return { fin, opcode, payload };
  }

  _handleFrame(frame) {
    const { fin, opcode, payload } = frame;
    if (opcode === 0x8) { this.closed = true; this.emit('close'); return; }
    if (opcode === 0x9) { this._send(0xA, payload); return; }
    if (opcode === 0xA) return;
    if (opcode === 0x1 || opcode === 0x2) {
      if (fin) this.emit('message', { binary: opcode === 0x2, data: payload });
      else { this.fragOpcode = opcode; this.fragChunks = [payload]; }
    } else if (opcode === 0x0) {
      this.fragChunks.push(payload);
      if (fin) {
        this.emit('message', { binary: this.fragOpcode === 0x2, data: Buffer.concat(this.fragChunks) });
        this.fragChunks = [];
      }
    }
  }

  sendText(str) { this._send(0x1, Buffer.from(str, 'utf8')); }
  sendBinary(buf) { this._send(0x2, buf); }

  _send(opcode, payload) {
    if (!this.socket || this.closed) return;
    const len = payload.length;
    let header;
    const maskBit = 0x80;
    if (len < 126) {
      header = Buffer.from([0x80 | opcode, maskBit | len]);
    } else if (len < 65536) {
      header = Buffer.alloc(4);
      header[0] = 0x80 | opcode; header[1] = maskBit | 126; header.writeUInt16BE(len, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x80 | opcode; header[1] = maskBit | 127; header.writeBigUInt64BE(BigInt(len), 2);
    }
    const mask = crypto.randomBytes(4);
    const masked = Buffer.from(payload);
    for (let i = 0; i < masked.length; i++) masked[i] ^= mask[i % 4];
    this.socket.write(Buffer.concat([header, mask, masked]));
  }

  close() {
    try { this._send(0x8, Buffer.alloc(0)); this.socket?.end(); } catch { /* ignore */ }
    this.closed = true;
  }
}
