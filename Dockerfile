# ============================================================
#  标准美式发音英语听读系统 - 容器镜像
#  零依赖 Node 服务：无需 npm install（dependencies 为空），
#  只需 Node 运行时 + 项目源码。
# ============================================================

# 用 debian-slim 而非 alpine：自带 ca-certificates，微软 Edge TTS 的
# TLS 握手不会因缺根证书失败；且 DNS/时区更省心。
FROM node:22-slim

# 工作目录
WORKDIR /app

# 复制依赖清单（虽为空，保持 Docker 惯例；后续如需加依赖再 npm ci）
COPY package.json ./

# 复制全部源码。运行态数据 data/ 与自定义证书 certs/ 由 .dockerignore 排除，
# 运行时以卷挂载，不进镜像（避免把本地练习记录/私钥打进镜像）。
COPY server ./server
COPY public ./public
COPY scripts ./scripts

# 预创建数据与证书目录，并归 node 用户所有。
# 用 named volume 挂 data 时，Docker 会以该 owner 初始化卷，进程可写，
# 从根上避免 Windows 上那种 EPERM 写盘失败。
RUN mkdir -p /app/data /app/certs \
  && chown -R node:node /app

# 非 root 运行（镜像内 node 用户 uid=1000）
USER node

# 服务端口（与 config.port 默认一致）
EXPOSE 7000

# 端口存活探测：只查 7000 是否在监听，不关心 http/https。
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "const net=require('net');const s=net.connect(7000,'127.0.0.1');s.on('connect',()=>{s.destroy();process.exit(0)});s.on('error',()=>process.exit(1))"

# 启动（与 npm start 一致；--experimental-sqlite 启用内置 SQLite 存储层）
CMD ["node", "--experimental-sqlite", "server/server.js"]
