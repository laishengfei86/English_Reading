/** AudioWorklet：把麦克风 PCM 帧发回主线程（避免主线程卡顿导致丢帧） */
class RecProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const ch = inputs[0] && inputs[0][0];
    if (ch && ch.length) this.port.postMessage(new Float32Array(ch));
    return true;
  }
}
registerProcessor('rec-processor', RecProcessor);
