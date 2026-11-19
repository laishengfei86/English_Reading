#!/usr/bin/env bash
# ============================================================
#  无域名 HTTPS 方案：自建根 CA + 签发服务器证书
#
#  为什么需要它：
#    PWA「安装成 APP」要求站点是 *受信任的* HTTPS。没有域名就拿不到
#    Let's Encrypt 证书（它只签域名），而 IP + 自签证书默认不被浏览器信任。
#    解法：自建一根 CA，让每台 PC/手机信任这根 CA（一次性），之后
#    https://<公网IP>:7000 就是绿锁站点 —— 麦克风可用、APP 可安装。
#
#  用法（服务器上，项目根目录执行）：
#      IP=43.138.1.2 bash scripts/deploy/gen_tls.sh
#
#  产物：
#      certs/ca.pem    —— 根证书公钥，分发给每台设备安装信任（一次性）
#      certs/ca.key    —— 根证书私钥，**留在服务器，绝不外传**
#      certs/cert.pem  —— 服务器证书（应用读这个）
#      certs/key.pem   —— 服务器私钥（应用读这个）
#
#  坑位备忘：
#    - 叶子证书有效期必须 ≤398 天，否则 iOS/macOS 直接拒绝（这里取 365 天）。
#    - SAN 里必须写 IP:<公网IP>，现代浏览器早已不认 CN。
#    - 用临时 ext 文件而不是命令行 -addext/进程替换，避免各版本 openssl 差异。
# ============================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

if ! command -v openssl >/dev/null 2>&1; then
  echo "✗ 未找到 openssl，请先安装：apt update && apt install -y openssl"
  exit 1
fi

if [ -z "${IP:-}" ]; then
  echo "请提供服务器公网 IP，例如："
  echo "    IP=43.138.1.2 bash scripts/deploy/gen_tls.sh"
  exit 1
fi

CERT_DIR="$ROOT/certs"
mkdir -p "$CERT_DIR"

# 旧证书先备份，避免覆盖后无法回滚
if [ -f "$CERT_DIR/cert.pem" ] && [ ! -d "$CERT_DIR/backup-$(date +%Y%m%d-%H%M%S)" ]; then
  BK="$CERT_DIR/backup-$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$BK"
  for f in cert.pem key.pem ca.pem ca.key; do
    [ -f "$CERT_DIR/$f" ] && cp "$CERT_DIR/$f" "$BK/" || true
  done
  echo "· 旧证书已备份到 $BK"
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "① 生成根 CA（有效期 10 年）…"
cat > "$TMP/ca.cnf" <<CNF
[req]
distinguished_name = dn
x509_extensions    = v3_ca
prompt             = no
[dn]
O  = AM English Reader
CN = AM English Reader Root CA
[v3_ca]
basicConstraints       = critical,CA:TRUE
keyUsage               = critical,keyCertSign,cRLSign
subjectKeyIdentifier   = hash
CNF
openssl req -x509 -newkey rsa:2048 -nodes -sha256 -days 3650 \
  -keyout "$TMP/ca.key" -out "$TMP/ca.pem" -config "$TMP/ca.cnf" 2>/dev/null

echo "② 生成服务器私钥与 CSR…"
openssl req -new -newkey rsa:2048 -nodes -sha256 \
  -keyout "$TMP/server.key" -out "$TMP/server.csr" \
  -subj "/O=AM English Reader/CN=english-reader" 2>/dev/null

echo "③ 用根 CA 签发服务器证书（SAN 含公网 IP，有效期 365 天）…"
cat > "$TMP/server-ext.cnf" <<CNF
basicConstraints       = CA:FALSE
keyUsage               = critical,digitalSignature,keyEncipherment
extendedKeyUsage       = serverAuth
subjectKeyIdentifier   = hash
authorityKeyIdentifier = keyid,issuer
subjectAltName         = @alt
[alt]
DNS.1 = localhost
IP.1  = 127.0.0.1
IP.2  = ${IP}
CNF
openssl x509 -req -in "$TMP/server.csr" -sha256 -days 365 \
  -CA "$TMP/ca.pem" -CAkey "$TMP/ca.key" -CAcreateserial \
  -out "$TMP/server.crt" -extfile "$TMP/server-ext.cnf" 2>/dev/null

cp "$TMP/ca.pem"        "$CERT_DIR/ca.pem"
cp "$TMP/ca.key"        "$CERT_DIR/ca.key"
cp "$TMP/server.crt"    "$CERT_DIR/cert.pem"
cp "$TMP/server.key"    "$CERT_DIR/key.pem"

# 容器内进程以 uid=1000 运行，私钥必须可读
chmod 644 "$CERT_DIR/ca.pem" "$CERT_DIR/cert.pem" "$CERT_DIR/key.pem"
chmod 600 "$CERT_DIR/ca.key"

echo
echo "✓ 证书已生成：$CERT_DIR"
echo "   服务器证书 SAN： DNS:localhost, IP:127.0.0.1, IP:${IP}"
echo "   有效期：$(openssl x509 -in "$CERT_DIR/cert.pem" -noout -enddate)"
echo
echo "下一步：把 certs/ca.pem 弄到每台设备上并信任它（见 scripts/deploy/TRUST-CA.md），"
echo "        然后 docker compose up -d 启动，浏览器访问 https://${IP}:7000 应为绿锁。"
