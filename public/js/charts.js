/** Canvas 手绘图表（折线 / 柱状），无第三方依赖，自动适配主题与 DPR */

function prep(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth || 600;
  const h = Number(canvas.getAttribute('height')) || 220;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  const cs = getComputedStyle(document.documentElement);
  return {
    ctx,
    w,
    h,
    colors: {
      line: cs.getPropertyValue('--line').trim() || '#e5e7eb',
      text: cs.getPropertyValue('--muted').trim() || '#9ca3af',
      brand: cs.getPropertyValue('--brand').trim() || '#2563eb',
    },
  };
}

/**
 * 折线图
 * @param {HTMLCanvasElement} canvas
 * @param {{labels:string[], series:{name:string,color:string,data:number[]}[]}} data
 */
export function drawLineChart(canvas, data) {
  const { ctx, w, h, colors } = prep(canvas);
  const pad = { l: 34, r: 12, t: 12, b: 24 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  const n = data.labels.length;

  ctx.font = '11px system-ui, sans-serif';
  ctx.strokeStyle = colors.line;
  ctx.fillStyle = colors.text;
  ctx.lineWidth = 1;
  for (let v = 0; v <= 100; v += 25) {
    const y = pad.t + ih - (v / 100) * ih;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(pad.l + iw, y);
    ctx.stroke();
    ctx.fillText(String(v), 8, y + 3.5);
  }
  if (!n) {
    ctx.fillText('暂无数据，先去练习几句吧', pad.l + 10, pad.t + ih / 2);
    return;
  }
  const x = (i) => (n === 1 ? pad.l + iw / 2 : pad.l + (i / (n - 1)) * iw);
  const y = (v) => pad.t + ih - (Math.max(0, Math.min(100, v)) / 100) * ih;

  for (const s of data.series) {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.name === '总分' ? 2.4 : 1.3;
    ctx.globalAlpha = s.name === '总分' ? 1 : 0.62;
    ctx.beginPath();
    s.data.forEach((v, i) => (i ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v))));
    ctx.stroke();
    if (s.name === '总分') {
      ctx.fillStyle = s.color;
      s.data.forEach((v, i) => {
        ctx.beginPath();
        ctx.arc(x(i), y(v), 2.6, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = colors.text;
  const showEvery = Math.ceil(n / 6);
  data.labels.forEach((l, i) => {
    if (i % showEvery === 0 || i === n - 1) ctx.fillText(l, x(i) - 14, h - 7);
  });
}

/** 柱状图 */
export function drawBarChart(canvas, items) {
  const { ctx, w, h, colors } = prep(canvas);
  const pad = { l: 30, r: 10, t: 12, b: 26 };
  const iw = w - pad.l - pad.r;
  const ih = h - pad.t - pad.b;
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillStyle = colors.text;
  if (!items.length) {
    ctx.fillText('暂无数据', pad.l + 10, pad.t + ih / 2);
    return;
  }
  const max = Math.max(...items.map((i) => i.value), 1);
  const bw = iw / items.length;
  items.forEach((it, i) => {
    const bh = (it.value / max) * ih;
    const x = pad.l + i * bw;
    ctx.fillStyle = it.color || colors.brand;
    ctx.globalAlpha = 0.85;
    const rw = Math.max(6, bw * 0.56);
    ctx.beginPath();
    const rx = x + (bw - rw) / 2;
    const ry = pad.t + ih - bh;
    const r = Math.min(4, rw / 2);
    ctx.moveTo(rx, ry + bh);
    ctx.lineTo(rx, ry + r);
    ctx.quadraticCurveTo(rx, ry, rx + r, ry);
    ctx.lineTo(rx + rw - r, ry);
    ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + r);
    ctx.lineTo(rx + rw, ry + bh);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = colors.text;
    ctx.fillText(String(it.value), rx + rw / 2 - 4, ry - 4);
    if (items.length <= 10 || i % 2 === 0) ctx.fillText(it.label, x + bw / 2 - 14, h - 8);
  });
}
