# 美语听读 · 标准美式发音跟读评分系统

面向中文用户的标准美式发音英语学习 Web 应用：**听读 → 跟读 → 复读对比 → 发音评分**。
零依赖（无需 `npm install`），原生前端（无构建步骤），开箱即用。

---

## 功能一览

| 模块 | 说明 |
|------|------|
| **听读** | 标准美式发音朗读内置/自定义单词、句子、段落；逐句播放、循环播放、连读、慢放（0.7×）、语速 0.5×–1.5× 可调 |
| **跟读复读** | 录音跟读（AudioWorklet 采集 + 重采样 16kHz + 编码 WAV），可反复重录、原音回放、AB 对比（原音→我的录音）、下载录音 |
| **听写** | 练习页切换「✍️ 听写」模式：隐藏原文，听标准发音后拼写整句；逐词比对（Levenshtein 相似度）高亮**错词 / 漏词 / 多词**并给得分；答错的词自动进「单词本」，为后续间隔复习（SRS）预热。支持重听、0.8× 慢放、首字母提示、看答案 |
| **单词本 + SRS** | 「📕 单词本」视图收录听写/练习错词；抽认卡式**间隔重复复习**（SM-2 算法：忘了 / 模糊 / 记得 → 自动拉长或重置复习间隔），听发音、看释义、可删除。零依赖，服务端 SQLite 持久化 |
| **打卡** | 进度页打卡卡片：设置**每日目标**（跟读+听写次数），自动生成📅 6 周日历热力（达标绿 / 部分黄 / 未做灰）、🔥 连续达标天数、今日进度条。数据复用练习记录，无需额外维护 |
| **智能推送（今日学习计划）** | 进度页「🤖 今日学习计划」基于你的实时学习情况**主动推送**内容：SRS 到期单词复习、易错音素突破、高频错词重练、打卡缺口提醒，每条可一键跳转对应视图（零依赖自适应推荐引擎） |
| **成长体系（等级 / XP）** | 进度页「成长」卡片 + 顶栏等级徽章：从你的练习量、连续达标、攻克发音难点、积累错词自动推导 **XP 与 10 级称号**（萌新 → 传奇阅者）。等级随账号跨设备保留，让进步看得见、越练越上头 |
| **多用户账号** | 顶栏👤登录/注册/登出（零依赖：scrypt 密码 + HMAC 签名 token）。登录后练习记录、单词本、打卡数据归入个人账号，可在任意设备同步；账号数据独立命名空间并强制鉴权，他人无法越权访问 |
| **数据导入 / 导出** | 设置页「导出完整备份 / 导入备份」：一键下载含练习记录、单词本、设置、自定义素材的 JSON，换设备/重装后可完整恢复（导入按 id/word 去重合并） |
| **发音评分** | 自动打分，输出**总分 + 三维度（准确度 / 流利度 / 完整度）**；用颜色标出读错/漏读的单词与音素，给出针对性改进建议与高频易错音素统计 |
| **素材** | 内置分级素材（初级 / 中级 / 高级）+ 工程·模具专业专题 + 最小对立训练；支持粘贴 / 导入 `.txt` 文本，**朗读方式可选：自动分句 / 按段落（不强制分句）/ 整篇** |
| **进度** | 练习历史、得分趋势、每日练习量、高频易错音素/单词排行、连续练习天数；可导出 JSON、一键清空 |
| **多端适配** | 响应式布局，桌面与手机浏览器均可使用 |

---

## 快速开始

```bash
# 需要 Node.js >= 22（用内置 node:sqlite，无需 npm install）
cd 项目目录
npm start              # 等价于 node server/server.js
# 本机浏览器打开 http://localhost:7000
# 手机/局域网录音请用 https://<本机IP>:7000
```

> **手机录音必须 HTTPS**：浏览器仅在 `https://` 或 `localhost` 下允许访问麦克风。项目已在 `certs/` 内置自签名证书，服务检测到证书会自动启用 HTTPS。首次访问会提示证书风险，请在浏览器里选择「继续访问 / 信任此证书」；iOS 需到「设置 → 通用 → 关于本机 → 证书信任设置」开启完全信任。

开发模式（文件改动自动重启）：

```bash
npm run dev
```

端到端冒烟测试（会自动启动服务并逐项校验 API）：

```bash
npm run smoke
```

默认配置即为**零配置可用**：**在线真人语音**（微软神经网络，免费、无需 Key，男/女声自然音色）+ 离线声学引擎（评分），不需要任何 API Key。仅当服务器无法访问外网时，才回退为浏览器内置语音。

---

## 安装为 APP（PWA）

应用支持安装到手机桌面 / 电脑桌面，像原生 APP 一样全屏独立窗口运行（无浏览器地址栏）：

- **Android（Chrome/Edge）**：页面顶栏出现 📲 按钮，点击 →「安装」；或浏览器菜单「安装应用 / 添加到主屏幕」。
- **iOS（Safari）**：点底部「分享」→「添加到主屏幕」。
- **桌面（Chrome/Edge）**：地址栏右侧「安装」图标，或顶栏 📲 按钮。

安装后从桌面图标直接进入，支持**离线打开**（已缓存的页面与素材可继续浏览，评分/录音等需联网的功能离线时明确提示）。

> ⚠️ 安装前提是**受信任的 HTTPS**（`localhost` 也可以）。
> - **有域名**：Nginx 反代 + Let's Encrypt（见下方「反向代理」），设备无需任何设置。
> - **只有公网 IP（如腾讯云轻量，无域名）**：走自建根 CA —— 服务器上跑一次 `IP=<公网IP> bash scripts/deploy/gen_tls.sh`，把生成的 `certs/ca.pem` 在每台 PC/手机上安装信任（一次性），之后即绿锁、麦克风可用、APP 可安装。详见 `scripts/deploy/TRUST-CA.md`。

---

## 目录结构

```
.
├── server/
│   ├── server.js            # HTTP 入口与路由表（零依赖）
│   ├── config.js            # 读取 .env，导出 capabilities()（不含密钥）
│   ├── tts/                 # 语音合成：browser / azure / tencent / openai + 磁盘缓存
│   ├── assess/              # 发音评分：offline（声学）/ azure / tencent，云端失败自动回退
│   └── lib/                 # dsp(FFT/MFCC/VAD/音节核)、wav、text、align、store、http
├── public/
│   ├── index.html           # 四视图 SPA（练习 / 素材 / 进度 / 设置）
│   ├── manifest.webmanifest # PWA 清单（可安装到桌面/主屏）
│   ├── sw.js                # Service Worker（离线缓存，network-first 防旧代码）
│   ├── offline.html         # 离线兜底页
│   ├── icons/               # 应用图标（scripts/gen_icons.mjs 生成）
│   ├── data/materials.json  # 内置分级素材
│   ├── css/style.css        # 主题变量 + 响应式
│   └── js/                  # util/state/api/tts/recorder/materials/practice/progress/library/pwa/main
├── scripts/                 # 工具脚本（详见 scripts/README.md）
│   ├── smoke.js             # 端到端冒烟测试
│   ├── gen_icons.mjs        # PWA 图标生成（零依赖 PNG 编码）
│   ├── build_curriculum_phase1.mjs  # 小学段素材重构（当前生效）
│   ├── build_curriculum_phase2.mjs  # 初中/高中/考试段素材重构（当前生效）
│   ├── expand_paragraphs.mjs        # 段落语篇厚度扩充
│   ├── archive/             # 历史脚本（gen_curriculum.mjs，勿再用）
│   └── migration/           # 跨环境自定义素材迁移
├── Dockerfile / docker-compose.yml / .dockerignore  # 容器化部署
├── DEVELOPMENT.md           # 开发过程技术档案（架构/里程碑/踩坑/迁移）
├── .env.example             # 配置示例
└── data/                    # 运行时生成：SQLite app.db 学习档案
```

---

## 部署到公网

> ⚠️ **必须使用 HTTPS**：浏览器仅在 `https://` 或 `localhost` 下允许访问麦克风。纯 `http://公网IP` 会无法录音。

### 0. Docker 部署（推荐生产）

项目已提供 `Dockerfile` + `docker-compose.yml`，默认**绑定挂载** `./public` 与 `./server`（改代码/素材后 `docker restart` 即生效）、数据卷 `er_data`（练习记录与自定义素材）、证书挂载 `./certs`（自签名 HTTPS）。

```bash
# 构建镜像并启动（需联网拉取 node:22-slim；离线时请用已构建镜像 + 绑定挂载）
docker compose up -d --build

# 之后迭代：改了挂载内的文件后只需
docker restart english-reading

# 常用
docker compose up -d              # 按现有镜像启动/重建容器
docker compose down               # 停容器，数据不丢
docker ps / docker logs -f english-reading
```

> ⚠️ 离线环境 `docker compose build` 会因需联网查基础镜像清单而失败；此时改用已存在的镜像 `am-english-reader:1.0.0` + 绑定挂载即可，无需重建。
>
> 公网访问：云厂商防火墙须放行 **TCP 7000**。
>
> **无域名一键部署（推荐腾讯云轻量）**：把项目传到服务器后
> ```bash
> IP=<公网IP> bash scripts/deploy/deploy.sh
> ```
> 脚本会自动建好证书（自建根 CA）并启动容器。然后按 `scripts/deploy/TRUST-CA.md` 在各设备信任 CA，即可 HTTPS 绿锁 + 安装成 APP。
>
> **有域名时**：可改用「域名 + Nginx 反代 + Let's Encrypt 证书」（注意国内服务器绑域名涉及备案）。

### 1. 直接运行（进程托管）

```bash
# 建议用 pm2 / systemd / nohup 托管，避免断线退出
PORT=7000 HOST=0.0.0.0 npm start
```

- `PORT` / `HOST`：监听端口与地址（默认 `7000` / `0.0.0.0`）。
- `DATA_DIR`：学习数据存放目录（默认 `./data`），请确保可写。

### 2. 局域网自签名 HTTPS（手机录音测试）

项目已内置 `certs/cert.pem` 与 `certs/key.pem`，启动服务时若检测到证书则自动启用 HTTPS，无需额外配置。

```bash
# 手机浏览器访问（把 192.168.0.8 换成你本机实际局域网 IP）
https://192.168.0.8:7000
```

首次访问会提示「证书不受信任」：
- **Android Chrome**：点「高级 → 继续访问」即可。
- **iOS Safari**：先点「显示详细信息 → 访问网站」，然后到「设置 → 通用 → 关于本机 → 证书信任设置」里开启对该证书的信任，重新打开页面即可录音。

如需重新生成证书：

```bash
cd certs
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 -keyout key.pem -out cert.pem -subj "/CN=192.168.0.8" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:192.168.0.8"
```

### 3. 反向代理（推荐公网部署，Nginx 示例）

```nginx
server {
    listen 443 ssl;
    server_name your.domain.com;

    ssl_certificate     /path/fullchain.pem;
    ssl_certificate_key /path/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:7000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 接入云端能力（可选）

复制 `.env.example` 为 `.env` 并填写对应密钥。未配置时系统会在「设置」页提示，并自动回退到浏览器语音 / 离线评分，**功能不中断**。

### 语音合成 TTS

| 引擎 | 关键配置 | 备注 |
|------|----------|------|
| **在线真人语音（Edge 神经语音，默认）** | 无需配置 | 免费、无需 Key，男/女声自然音色（Ava/Jenny/Andrew/Guy 等）。需服务器可访问外网；支持长文本（≤3000 字符），适合整段/整篇朗读 |
| Azure 神经网络语音 | `TTS_PROVIDER=azure`<br>`AZURE_SPEECH_KEY=`<br>`AZURE_SPEECH_REGION=` | 音色如 `en-US-AvaMultilingualNeural` |
| 腾讯云语音合成 | `TTS_PROVIDER=tencent`<br>`TENCENT_SECRET_ID=`<br>`TENCENT_SECRET_KEY=` | 英文音色 `101051`(女)/`101050`(男) |
| OpenAI 兼容 | `TTS_PROVIDER=openai`<br>`OPENAI_API_KEY=`<br>`OPENAI_BASE_URL=`（可选） | 模型 `gpt-4o-mini-tts` |
| 浏览器内置语音 | `TTS_PROVIDER=browser` | 免费零配置但音色偏机械，作为断网兜底 |

> 说明：Edge 真人语音走的是微软 Edge「大声朗读」同款在线神经语音端点（非官方公开接口），默认音色可用 `EDGE_TTS_VOICE` 覆盖。稳定性取决于微软侧策略，失败时前端自动回退浏览器语音。

服务端合成结果带磁盘缓存（`data/tts-cache/`），相同文本不重复请求。

### 发音评分（音素级精确打分）

| 引擎 | 关键配置 | 备注 |
|------|----------|------|
| Azure 发音评估 | `ASSESS_PROVIDER=azure`<br>`AZURE_SPEECH_KEY=`<br>`AZURE_SPEECH_REGION=` | 返回单词/音素级反馈，推荐 |
| 腾讯云智聆口语评测 | `ASSESS_PROVIDER=tencent`<br>`TENCENT_SECRET_ID=`<br>`TENCENT_SECRET_KEY=`<br>`TENCENT_SOE_APPID=` | 国内延迟低，需 AppId |

离线声学引擎（`offline`）无需密钥：基于能量 VAD、音节核检测、SNR、流利度（停顿/语速）等声学特征启发式估分，适合趋势跟踪；若开启「浏览器语音识别辅助」，可进一步判定具体读错的词。

### 评分权重（可选）

```
SCORE_W_ACCURACY=0.5
SCORE_W_FLUENCY=0.3
SCORE_W_COMPLETENESS=0.2
```

---

## 内置素材格式

`public/data/materials.json` 结构：

```json
{
  "levels": [
    {
      "id": "beginner",
      "name": "初级",
      "desc": "…",
      "groups": [
        {
          "id": "b-w1",
          "title": "基础单词",
          "type": "word",            // word | sentence | paragraph
          "items": [
            { "text": "think", "ipa": "/θɪŋk/", "zh": "思考", "focus": ["th 咬舌"] }
          ]
        }
      ]
    }
  ]
}
```

- `paragraph` 类型会自动按句拆分，逐句跟读。
- 自定义文本（粘贴 / 导入 `.txt`）支持三种「朗读方式」：
  - **自动分句**（默认）：逐句跟读；
  - **按段落**：按空行分段，逐段朗读，不强制分句；
  - **整篇**：整段为一条，一口气读完再评分。
  - 长文本录音上限会随文本长度自适应（最长 5 分钟），不会被 60 秒提前截断。

---

## HTTP 接口一览

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| GET | `/api/capabilities` | 服务端能力（不含密钥） |
| POST | `/api/tts` | 语音合成，返回音频（服务端引擎时） |
| POST | `/api/assess` | 发音评分，返回总分/维度/逐词/音素 |
| POST | `/api/split` | 文本分句 |
| GET | `/api/hints?word=` | 单词音素提示 |
| GET | `/api/progress?uid=` | 学习统计 |
| POST | `/api/progress/clear` | 清空记录 |
| POST | `/api/settings` | 保存设置 |
| POST | `/api/custom-text` | 保存自定义文本 |
| POST | `/api/custom-text/delete` | 删除自定义文本 |

---

## 技术说明

- **零依赖**：服务端仅用 Node 内置模块（`http`/`fs`/`crypto` 等），`fetch` 用 Node 18+ 全局实现。
- **录音格式**：直接采集 PCM 并编码为 16kHz 单声道 16bit WAV，既满足离线 DSP 分析，也兼容 Azure / 腾讯云评测接口，无需 ffmpeg。
- **离线评分 DSP**：迭代基-2 FFT、Mel 滤波器组、MFCC、能量 VAD、音节核检测、DTW——纯 JS 实现。
- **隐私**：学习数据保存在服务端 `data/` 目录，按 `uid` 区分不同使用者；切换设备不影响。

## 许可证

MIT
