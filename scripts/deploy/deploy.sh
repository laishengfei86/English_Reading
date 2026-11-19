#!/usr/bin/env bash
# ============================================================
#  腾讯云轻量（无域名）一键部署
#
#  前置条件：
#    1) 服务器已装 Docker（腾讯云可选「Docker CE」镜像，开箱即有）
#    2) 控制台防火墙已放行 TCP 7000
#    3) 项目代码已在服务器某目录（此脚本所在的项目根目录）
#
#  用法：
#      IP=43.138.1.2 bash scripts/deploy/deploy.sh
# ============================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

IP="${IP:-}"
if [ -z "$IP" ]; then
  read -r -p "请输入服务器公网 IP： " IP
fi
[ -z "$IP" ] && { echo "✗ 必须提供公网 IP"; exit 1; }

echo "=== ① 环境检查 ==="
if ! command -v docker >/dev/null 2>&1; then
  echo "✗ 未检测到 Docker。安装方式："
  echo "    curl -fsSL https://get.docker.com | sh && sudo usermod -aG docker \$USER && newgrp docker"
  exit 1
fi
DC="docker compose"
docker compose version >/dev/null 2>&1 || DC="docker-compose"
echo "· Docker OK；使用指令：$DC"

echo
echo "=== ② TLS 证书（自建 CA 路线，无需域名）==="
if [ ! -f certs/cert.pem ] || [ ! -f certs/ca.pem ]; then
  IP="$IP" bash scripts/deploy/gen_tls.sh
else
  echo "· 已存在 certs/cert.pem，跳过生成；若 IP 有变请手动重跑 gen_tls.sh"
fi

echo
echo "=== ③ 启动容器 ==="
$DC up -d --build

echo
echo "=== ④ 健康检查（最多等 40 秒）==="
for i in $(seq 1 20); do
  if curl -k -sf "https://127.0.0.1:7000/api/health" >/dev/null 2>&1; then
    echo "· 服务已就绪"
    break
  fi
  sleep 2
done
curl -k -s "https://127.0.0.1:7000/api/health" || echo "⚠ 服务未响应，查看日志：$DC logs -f english-reading"

echo
cat <<TIP

============================================================
 🎧 部署完成
============================================================
 访问地址：  https://${IP}:7000

 接下来必做两件事（详见 scripts/deploy/TRUST-CA.md）：
   1. 把 certs/ca.pem 弄到每台 PC / 手机上并信任它 —— 麦克风才可用
   2. 浏览器打开上面的地址，点页面顶栏 📲 把应用装到桌面

 常用运维：
   $DC logs -f english-reading     # 看日志
   docker restart english-reading   # 改了挂载内的代码/素材后重启
   docker ps                        # 看容器状态
============================================================
TIP
