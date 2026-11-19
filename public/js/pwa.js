/**
 * PWA 接线：Service Worker 注册、安装按钮、iOS 添加到主屏引导、版本更新提示。
 * 由 main.js 在 boot 时调用 initPWA()。
 */
import { toast } from './util.js';

let deferredPrompt = null;   // Chrome/Edge 的安装事件
let installBtn = null;

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches
  || window.matchMedia('(display-mode: minimal-ui)').matches
  || window.navigator.standalone === true;

const isIOS = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOS 桌面 UA

function showInstallButton(mode) {
  if (!installBtn) return;
  installBtn.hidden = false;
  installBtn.dataset.mode = mode; // 'prompt' | 'ios'
  installBtn.title = mode === 'ios' ? '分享 → 添加到主屏幕' : '安装到桌面';
}

function hideInstallButton() {
  if (installBtn) installBtn.hidden = true;
}

async function onInstallClick() {
  const mode = installBtn?.dataset.mode;
  if (mode === 'prompt' && deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice.catch(() => ({ outcome: 'dismissed' }));
    deferredPrompt = null;
    if (outcome === 'accepted') hideInstallButton();
    return;
  }
  if (mode === 'ios') {
    toast('iOS 安装：点底部 Safari 的「分享」→ 选「添加到主屏幕」');
  }
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then((reg) => {
      // 新版本就绪时提示（用户下次刷新生效，避免打断正在进行的练习）
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw?.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            toast('发现新版本，刷新页面即可更新 ✨');
          }
        });
      });
      // 收到 SW 的 SKIP_WAITING 通知时自动刷新
      navigator.serviceWorker.addEventListener('message', (e) => {
        if (e.data === 'SW_WAITING_ACTIVATE') location.reload();
      });
    }).catch(() => { /* SW 注册失败不影响功能（如非安全上下文） */ });
  });
}

export function initPWA() {
  installBtn = document.getElementById('installBtn');

  registerServiceWorker();

  // 已是安装形态（从桌面图标打开）则不展示安装按钮
  if (isStandalone()) {
    document.documentElement.classList.add('pwa-standalone');
    return;
  }

  if (installBtn) {
    installBtn.onclick = onInstallClick;
    // Chrome/Edge：先到先得；iOS 没有该事件，直接给引导
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      showInstallButton('prompt');
    });
    window.addEventListener('appinstalled', () => {
      hideInstallButton();
      toast('已安装到桌面，下次从图标直接进入 🎧');
    });
    if (isIOS()) setTimeout(() => showInstallButton('ios'), 1200);
  }
}
