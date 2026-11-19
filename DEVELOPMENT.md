# 开发档案：美语听读发音评分系统

> 维护人：飞哥 · 小微（AI 助手）协建
> 最后更新：2026-09-29
> 关联文档：README.md（用户手册）、.workbuddy/memory/（运行期记忆）

---

## 0. 一句话定位

面向中文用户的标准美式发音英语学习 Web 应用：**听读 → 跟读 → 复读对比 → 发音评分**。
零依赖 Node 服务 + 原生前端，飞哥自用，部署于公网 VPS。

---

## 1. 硬约束（改代码前必读，违反即踩坑）

- **零依赖**：`server/` 只用 Node 内置模块；前端原生 ESM，无构建步骤；`package.json` 的 `dependencies` 为空。**不要引入任何新依赖。**
- **默认零配置可用**：`TTS_PROVIDER=edge`（免费微软神经真人语音，无需 Key，男/女声自然音色）+ `ASSESS_PROVIDER=offline`（自研 DSP 离线声学引擎）。
  断网时前端自动回退浏览器语音；云端 azure/tencent/openai 是可插拔适配器，缺密钥时**自动回退**并前端提示，功能不中断。
- **Edge 真人语音**：`server/tts/edge.js` + 零依赖手写 WS 客户端 `server/lib/ws.js`。
  端点要求 Client Hints 头 + Chromium 版本 ≥138（否则握手 403）；GEC 用 BigInt 精确算。音色在 `SERVER_VOICES.edge`（10 个 en-US）。支持长文本（synthesize 上限 3000 字符）。
- **默认端口 7000**（曾定 8080→7070，7070 被旧进程占用遂定 7000）。
- **录音格式**：AudioWorklet 采 PCM → 重采样 16kHz → 编码单声道 16bit WAV（兼容离线 DSP 与云端评测，不依赖 ffmpeg）。
- **数据**：SQLite `data/app.db`（`custom_texts` 表）+ 旧格式 `data/custom-texts.json`，均在 `config.dataDir`。
- **HTTPS 必须**：浏览器只在 `https://` 或 `localhost` 允许麦克风。公网部署需反代 + TLS；局域网测试已内置自签名证书（`certs/`，服务检测到即启用）。可用 `SSL_ENABLED=false` 关闭。
- **移动端 H5**：`≤900px` 显示汉堡菜单抽屉（左侧滑出），桌面端保持顶部 tabs。

---

## 2. 技术架构

| 层 | 实现 |
|----|------|
| 后端 | Node `http` 零依赖；路由表 `server/server.js`；`config.js` 读 `.env` + `capabilities()`（不含密钥） |
| 语音合成 | `server/tts/`：browser / azure / tencent / openai + 磁盘缓存；`edge.js` 手写 WS 客户端 `ws.js` |
| 发音评分 | `server/assess/offline.js` + `server/lib/dsp.js`（迭代基-2 FFT、Mel 滤波器组、MFCC、能量 VAD、音节核检测、DTW） |
| 前端 | 四视图 SPA（练习 / 素材 / 进度 / 设置），`main.js` 入口，原生 ESM 模块 |
| 存储 | SQLite（`node:sqlite`）`app.db` |
| 部署 | Docker（`Dockerfile` + `docker-compose.yml`），绑定挂载 `./public` `./server`，数据卷 `er_data`，证书挂载 `./certs` |

**自定义素材朗读方式**：`makeCustomGroup(title,text,mode)`，mode ∈ `auto`(自动分句)/`paragraph`(按空行分段)/`whole`(整篇)；`splitParagraphs` 按空行拆。录音上限随文本长度自适应（≤5min）。

---

## 3. 开发里程碑

> 来源：工作日志 2026-08-30.md / 2026-08-31.md

- **2026-08-30 首次完整交付**：后端全模块 + 前端四视图 + `main.js` + smoke 18/18 + README。
- **2026-08-30 下午**：Edge 真人语音设默认（男女声）、自定义素材整段/整篇朗读、默认端口 7000、移动端汉堡菜单。
- **2026-08-30 晚**：局域网自签名 HTTPS（`certs/`），手机可录音。
- **2026-08-30 晚**：内容方向核对（美音 IPA 准确、分级合理、版权安全）+ 语篇厚度扩充（15 个 `-p` 组各补 3 段，559→604，version 2）。
- **2026-08-30 更晚**：按主题单元重构小学段，604→805，version 4。
- **2026-08-30 关键坑**：小学版本词汇 92% 雷同（共用模板）→ 改为每版本独立差异化主题，重合降至 2–12%。
- **2026-08-31**：铺开初中/高中/考试段，805→1402，version 7，smoke 18/18。
- **2026-08-31 关键坑**：考试段 CET/IELTS/TOEFL 100% 雷同 → 改为按 `key` 取值 `buildExamLevel`。
- **2026-08-31 修复**：新增素材页面不显示（Docker 绑定挂载 + 缓存 `no-cache` 双修复）。
- **2026-08-31 修复**：自定义素材"消失"（裸跑 `./data` 与 Docker 卷 `er_data` 不互通）→ 迁移恢复 16 条。
- **2026-09-29**：开发文件整理（scripts 归档分类 + 本开发档案 + README 补全）。公网 VPS 部署落地（见 §6.2）。
- **2026-09-29（PWA 升级一期）**：可安装 APP 化。新增 `public/manifest.webmanifest` + `public/sw.js`（network-first HTML/JS，防旧代码；materials.json 走 stale-while-revalidate 支持离线练）+ `public/offline.html` + `public/js/pwa.js`（SW 注册 / beforeinstallprompt 安装按钮 / iOS 添加到主屏引导 / 新版本提示）。图标由 `scripts/gen_icons.mjs` **零依赖生成**（node:zlib 手写 PNG 编码 + SDF 画麦克风，无需 sharp/canvas）。`http.js` 早已支持 `.webmanifest` MIME，服务端零改动。
- **2026-09-30（升级二期 · 听写）**：练习页新增 **跟读 / 听写** 模式切换。`public/index.html` 加 `mode-switch` + `dictationCard`；`practice.js` 实现听写流程（隐藏原文、听音、拼写、逐词 Levenshtein 相似度比对、错/漏/多词高亮、得分、重听/慢放/首字母提示/看答案）；`util.js` 加 `normalizeWords/levenshtein/wordSimilarity`；答对/答错记入 `type:dictation` 练习记录（计入打卡）。后端 `store` 新增 `wordbook` 表（含 SRS 字段 due/ease/interval/reps 预留）+ `recordWordMistake/listWordbook`，`server.js` 加 `POST/GET /api/wordbook`，`api.js` 加 `recordMistake/wordbook/addRecord`。smoke 18/18，`/api/wordbook` 实测入库+查询正常。
- **2026-09-30（升级三期 · 单词本 + SRS）**：新增「📕 单词本」视图（桌面/移动端 tab 各一），`public/js/wordbook.js` + `index.html#view-wordbook` + `main.js` 切换接入。展示错词统计（总数/今日待复习/已掌握）、抽认卡复习（**SM-2 间隔重复**：忘了/模糊/记得 → quality 0/3/5，更新 ease/interval/reps/due，忘了则重置）；可听发音、看释义、删除单词。后端 `store` 加 `reviewWordbook`(SM-2) + `deleteWord`，`server.js` 加 `POST /api/wordbook/review` + `POST /api/wordbook/delete`，`api.js` 加 `reviewWord`/`deleteWord`。听写错词自动入 `wordbook` 即成为复习来源。smoke 18/18，SRS 调度（quality=5→interval1/reps1；quality=0→重置）与删除实测 OK。

---

## 4. 内置素材体系

**结构**：
```json
{ "version": 7, "updatedAt": "...",
  "levels": [
    { "id": "primary", "name": "小学", "desc": "...",
      "groups": [
        { "id": "pep-greet-word", "type": "word", "title": "PEP · 问候与自我介绍 · 核心词汇",
          "items": [ { "text": "hello", "ipa": "/həˈloʊ/", "zh": "你好", "focus": ["h 送气"] } ] }
      ] }
  ] }
```

**当前规模**：version 7，10 个 level，250 组，1402 条。

**level 顺序**：
`beginner` / `intermediate` / `advanced` / `drills`（发音专项 + 工程·模具·外贸）
→ `primary`(小学 4 版) / `junior`(初中 4 版) / `senior`(高中 4 版)
→ `cet` / `ielts` / `toefl`

- 小学/初中/高中：各 **4 教材版本 × 5 主题 × 3 类**（词汇/句型/段落）= 60 组；每主题 12 词（带美音 IPA）+ 3 句 + 1 段。
- 考试：CET/IELTS/TOEFL 各 **5 话题 × 3 类** = 15 组；各 60 词。
- **段落组** id 以 `-p` 结尾，每条 `{text,zh}` 无 ipa。
- **group title 固定格式** `"版本名 · 主题名 · 类型名"`，`practice.js` 靠它做 `<optgroup>` 分组与"版本名 · 类型"标签。
- **版权安全**：内容按版本/话题原创生成，未照搬原版课文。
- **版本差异化**：各版本用独立特色主题，两两重合度控制在 0–15%（考试 0–3%）。

**版本特色主题（差异化关键）**：
- 小学：PEP=问候/学习用品/家庭/饮食/动物；外研=天气季节/颜色数字/生日节日/身体/学校日常；译林=形状/水果/学校生活/宠物/家庭房间；沪教=动物身体/家庭朋友/教室/健康/天气活动。
- 初中：人教=兴趣爱好/作息/购物/就医/过去经历；外研=社团/旅行交通/饮食/科技/名人；译林=人与自然/节日/音乐艺术/社交媒体/志愿；北师大=代沟/学习方法/城乡/安全急救/梦想职业。
- 高中：人教=文化交流/科技未来/环境/榜样/艺术审美；外研=社会问题/健康/探险/文学/媒体；北师大=科学创新/人生选择/全球议题/心理/传统现代；译林=自然奇观/语言学习/历史/体育精神/太空探索。

---

## 5. 踩坑与修复录（最重要）

### 5.1 Docker 容器 ≠ 宿主机文件（"改了不生效"）
- **现象**：硬刷页面仍看不到 version-7 内容。
- **根因**：应用跑在 Docker 容器，`Dockerfile` 在 `build` 时把 `public/` COPY 进镜像，宿主机改动不进容器。
- **修复**：`docker-compose.yml` 把 `./public` 与 `./server` 改为**绑定挂载**，重建容器。验证返回 version 7、1402 条、`Cache-Control: no-cache`。
- **教训**：离线 `docker compose build` 会因需联网查 `node:22-slim` 清单失败；离线迭代只能靠**绑定挂载 + `docker restart`**，不能重建镜像。

### 5.2 静态文件缓存导致"改了不显示"
- **根因**：`server/lib/http.js` 给 `.json` 标 `max-age=3600`，前端 `api.js` fetch 漏 `no-store`。
- **修复**：`http.js` 把 `.json` 纳入 `no-cache`；`api.js` 加 `cache:'no-store'`。

### 5.3 自定义素材"消失"（数据不互通）
- **现象**：用户裸跑 `npm start` 加的 16 个素材，切 Docker 后不见了。
- **根因**：自定义素材存 `data/app.db` 的 `custom_texts` 表；裸跑在宿主机 `./data`，Docker 读卷 `er_data`，**两者不互通**。
- **修复**：从宿主机 `app.db` 导出 → 停容器 → 用应用镜像 `am-english-reader:1.0.0` 起临时容器写入卷内 `app.db` → 重启；API 返回 `customTexts=16`。
- **注意**：离线不可用 `node:22-slim` 临时容器（本地无缓存），必须用已存在的 `am-english-reader:1.0.0`。

### 5.4 版本词汇雷同（内容质量坑）
- **现象**：小学各版本核心词汇 92% 相同。
- **根因**：共用主题模板 + 末尾只改 1–3 词。
- **修复**：每个版本用各自特色主题与差异化词表（`VERSION_THEMES` 每版本独立）。

### 5.5 考试段三 level 100% 雷同
- **根因**：`buildLevel` 遍历 `Object.keys(EXAM)` 全表 15 话题，装进每个 level。
- **修复**：改用 `buildExamLevel(id,name,desc,key)` 按 `key` 取值。
- **原则**：凡是"多分支共用一份数据"的生成脚本，构建时必须按 key 取值，不能遍历全表。

### 5.6 工具坑
- Bash heredoc（`<< 'EOF'`）含 JS 模板字符串 `${...}` 报 `Bad substitution` → 改用 Write 工具写临时文件。
- Write 写 `.tmp` 文件曾内容重复追加 → 拼接后 `grep -c` 校验关键标识符出现次数。

### 5.7 VPS Docker 权限
- **现象**：`docker compose` 报 `permission denied`（用户不在 docker 组）。
- **修复**：命令加 `sudo`；或 `sudo usermod -aG docker $USER` 后 `newgrp docker`。

---

## 6. 部署与运维

### 6.1 三种运行方式
- **Docker（生产推荐）**：`docker compose up -d`（绑定挂载 `./public` `./server`，卷 `er_data`，证书 `./certs`）。
- **裸跑（非 Docker）**：`npm start`（= `node --experimental-sqlite server/server.js`）。
- **开发**：`npm run dev`（文件改动自动重启）。

### 6.2 公网部署（当前方案：腾讯云轻量 + 无域名）
- 形态：腾讯云轻量服务器，**有公网 IP、无域名**，Docker 容器 `english-reading`（镜像 `am-english-reader:1.0.0`），端口 `7000`。
- **旧 VPS `1.14.145.104:7000` 已于 2026-09-30 起停用**，文档不再指向它。
- **HTTPS 走自建根 CA**（`scripts/deploy/gen_tls.sh`）：因为 Let's Encrypt 只签域名，无域名场景用它 + 设备信任 CA 换取「受信任 HTTPS」——这是 **PWA 可安装**与**手机可用麦克风**的前提。详见 `scripts/deploy/TRUST-CA.md`。
- 一键部署：`IP=<公网IP> bash scripts/deploy/deploy.sh`。
- **防火墙须放行 TCP 7000**（这是"打不开"最常见原因，腾讯云轻量 → 控制台防火墙加规则）。
- 远程自检：`Test-NetConnection -ComputerName <公网IP> -Port 7000` 看 `TcpTestSucceeded`；或服务器内 `curl -k https://127.0.0.1:7000/api/health`。
- 证书**每年重签一次**（叶子证书刻意只签 365 天，Apple 只接受 ≤398 天）；根 CA 10 年有效，重签后设备无需 reinstall。
- **若将来买了域名**：在 Nginx 反代后面换 Let's Encrypt 证书即可，应用代码零改动。注意国内服务器绑域名涉及备案，故当前用 IP + 7000 端口规避。

### 6.3 常用命令
```bash
docker compose up -d          # 按现有镜像启动/重建容器
docker restart english-reading # 改了挂载内的代码/素材后重启即生效
docker compose down           # 停容器，数据不丢
docker ps / docker logs -f english-reading
npm run smoke                 # 18 项 API 回归校验（SMOKE_PORT / SMOKE_URL 可调）
```

---

## 7. 跨环境数据迁移标准流程（自定义素材）

适用：换服务器 / 裸跑↔Docker / Windows↔VPS。

1. **源环境导出**：`node scripts/migration/_export_custom.mjs`（读源 `data/app.db` 的 `custom_texts` → `scripts/migration/_custom_export.json`）。
2. **传文件到目标机** `scripts/migration/`（含 `_export_custom.mjs` / `_insert_custom.mjs` / `_custom_export.json`）。
3. **目标机写入**（停容器 → 临时容器写卷 → 重启）：
   ```bash
   sudo docker stop english-reading
   sudo docker run --rm \
     -v $(sudo docker inspect -f '{{range .Mounts}}{{if eq .Destination "/app/data"}}{{.Name}}{{end}}{{end}}' english-reading):/data \
     -v ~/scripts/migration:/scripts \
     am-english-reader:1.0.0 node --experimental-sqlite /scripts/_insert_custom.mjs
   sudo docker start english-reading
   ```
4. **验证**：`GET /api/progress?uid=demo` 应返回 `customTexts` 条数。

> 当前 `_custom_export.json` 是从 Windows 裸跑导出的 16 条备份（VPS 迁移尚未完成，勿删）。

---

- **2026-09-30（升级四期 · 打卡 + 智能推送）**：进度页新增**打卡**功能与**今日学习计划（智能推送）**。打卡卡片含连续达标天数（🔥）、今日进度条（达标点亮）、最近 6 周日历热力（done/partial/none 三态着色，今天描边）；每日目标存 `settings.dailyGoal`（默认 5，设置页可调）。数据复用 `/api/progress` 的 `byDay`+`todayCount`（无需新表，连续达标前端按"当天 count≥goal"计算，今天未达标不计入但不断连击）。**智能推送 = 零依赖自适应推荐引擎** `renderSmartPlan`：拉 `wordbook` 算 SRS 到期数 →「去复习」；读 `topPhonemeErrors`/`topWordErrors` 给易错音素/高频错词突破建议；结合 `dailyGoal` 给打卡缺口提醒；全部可一键跳视图。smoke 18/18，语法校验通过。

- **2026-09-30（升级五期 · 多用户账号 + 数据导入导出）**：新增账号体系与完整备份。**零依赖鉴权**（`server/lib/auth.js`：密码 scrypt 加盐 + HMAC 签名无状态 token）。`store` 加 `accounts` 表 + `createAccount/verifyAccount/exportData/importData/importWordbook/importCustomText`；`server.js` 加 `POST /api/auth/register|login`、`GET /api/auth/me`、`GET /api/export`、`POST /api/import`，并新增 `authUid()` 统一解析归属（优先 Bearer token，回退本地随机 uid 兼容单机匿名）。**安全**：账号命名空间用 `acc_<id>`，`authUid` 对 `acc_` 前缀强制要求合法 token，否则 401——杜绝匿名越权访问他人账号桶（IDOR）。前端 `state.js` 加 `authState/setAuth`（独立 localStorage 键），`api.js` 的 `jsonFetch` 自动带 `Authorization`，`main.js` 加登录/注册/登出弹层与顶栏用户区；设置页「导出完整备份 / 导入备份」（下载/上传含 records+wordbook+settings+customTexts 的 JSON）。**导入去重**：record 按 id、wordbook 按 word、customTexts 按 id。smoke 18/18；注册/登录/导出/导入去重/错误密码/IDOR 拦截均实测通过。
- **2026-09-30（升级六期 · 成长体系：等级 / XP / 称号）**：为强化"越用越爱用"的黏性，进度页新增「成长」卡片 + 顶栏等级徽章。**纯前端推导、零额外存储**：`progress.js` 的 `levelInfo/deriveXp/renderGrowth` 从 `/api/progress` 现有 `total/streak/wordErrors/phonemeErrors` 推导 XP（练习×10 + 连续达标×30 + 发音难点×8 + 错词×5），按 `level=floor(√(xp/50))+1` 分 10 级（萌新→传奇阅者），进度条显示距下一级差距。等级随账号 uid 跨设备保留，匿名用户也可见（激励注册）。smoke 18/18。

- **2026-09-30（升级七期 · 中文用户名 + 管理控制台）**：① 注册用户名改为 Unicode 校验 `/^[\p{L}\p{N}_.-]{3,30}$/u`（原 `[a-z0-9_.-]` 拒绝中文导致 400，是"注册后登录不了"的根因之一），登录弹窗提示同步更新。② 新增**管理控制台 `/admin`**（`public/admin.html` 自包含页）：账号列表（注册时间/最近活跃/练习数/错词数/单词本数）、重置密码、删除账号（连带清理 `users` 数据桶 + `wordbook`，双 confirm）。守卫 `adminOk(req)`：配置 `ADMIN_TOKEN` 时要求 `X-Admin-Token` 头（恒时比较，兼容 Docker NAT——发布端口下容器看到的来源 IP 是网关而非 127.0.0.1，回环判定失效）；未配置则退回仅回环。页面无敏感数据在有令牌时放行，数据由 API 令牌把守。`store` 加 `listAccounts/adminDeleteAccount/adminResetPassword`。端到端实测：中文用户名"李九五"注册+登录 OK、无令牌 403、重置密码后新密码登录 OK、删除账号 OK。smoke 18/18。

- **2026-09-30（BUGFIX · 登录"能注册却进不去"）**：两个真 bug（用 playwright 真实浏览器复现定位，接口层 curl 测不出来）。①**遮罩关不掉**：`.modal-mask{display:flex}` 覆盖了 HTML `hidden` 属性（作者样式 > UA 样式），导致登录弹窗黑罩**常驻挡住整页**——注册/登录成功后 `close()` 无效，用户卡在弹窗里以为"登录不了"。修复：全局 `[hidden]{display:none !important}`（同时修好 `.user-box`/`.wb-flash` 等同类隐患）。②**登录后顶栏不更新**：`state.js` 的 `authState` 是模块加载时的一次性快照，`setAuth` 只写 localStorage，已 import 的引用永远是旧值 → 登录成功但顶栏仍显示"登录"按钮。修复：`authState` 改为稳定对象引用、`setAuth` **原地改写**，并导出 `getAuth()`。③顺带加密码👁可见开关 + 输入法（全角字符）提示 + 登录失败补充排查提示。验证：浏览器实测 遮罩默认隐藏/点击可开/登录后关闭、顶栏即时显示"赖盛飞"、登录按钮隐藏、无报错。smoke 18/18。

- **2026-09-30（升级八期 · 趣味反馈层 fun.js）**：回应"功能有了但没感到快乐"——把奖励从"数据层"搬到"感官层"，**每次开口练习立刻有回报**。新增 `public/js/level.js`（等级/XP 共享模块）+ `public/js/fun.js`（零素材：Web Audio 实时合成音效、Canvas 彩带）：①评分即时反馈：跟读/听写完成后按分数分层（≥95 完美音效+大彩带+🎉、≥85 欢快音效+彩带、≥66 轻音效、否则"再试一次"）；②连击：连续 ≥66 分累积 🔥N 连击（右上角徽章，音高随连击升高，20s 无达标重置）；③XP 上浮：练习后拉最新 stats 算 XP 增量，"+N XP"上浮（增量按 uid 存 localStorage）；④成就徽章：12 枚（首练/10句/50句/100句/90分/95分/连击3天/7天/词本10/词本50/发音样本10/错词20），解锁时全屏庆祝弹窗（发光圆环+彩带+号角），记录存 `amread.badges.<uid>`；⑤顶栏常驻等级徽章（所有用户含匿名，`#topLevelChip`，练习后即时刷新）；⑥单词复习 tick 音效、完成一轮大彩带。设置页加 🔊音效 / 🎉动效开关（`settings.funSound/funEffect`）。playwright 实测：彩带 canvas、浮层文字、连击徽章、成就弹窗渲染（截图确认视觉）。smoke 18/18。

- **2026-09-30（升级九期 · 配音秀 dub）**：新增「🎬 配音秀」视图（`public/js/dub.js` + `index.html#view-dub` + `main.js` 接入）。剧本库 `public/data/dub-scenes.json` **全部为项目原创写作**（8 个场景：咖啡馆点单/机场值机/工作面试/街头问路/看医生/屋顶夜戏/客服投诉/餐厅生日，覆盖初/中/高级，每幕 9-10 句、约 5 句归练习者配），**零版权风险**。玩法：选剧本 → 进入舞台（左侧剧本目录含角色+中译+逐句得分，右侧是当前句面板）→ 对手台词用 **TTS 自动演绎**、自己的台词录音并用既有 `api.assess` 评分 → 自动跳下一句 → 全部配完自动存 `type:'dub'` 记录（计入练习统计/XP/打卡）并显示整幕平均分；支持🎞整幕连放（你的真实录音 + TTS 对手音无缝拼接）、↺重配、逐句重录。`tts.js` 新增 `speakAsUrl()`（只合成 URL 不播放，用于按句拼接回放）。评分后复用 `fun.js` 的音效/彩带/连击/XP 反馈。踩坑：`updateProgress` 引用了不存在的 `#dubFinishBtn` 抛 TypeError，导致 `gotoLine` 未执行、当前句空白——**新增 DOM 引用必须在 HTML 中核实存在**。浏览器实测：8 幕列表、进入舞台、角色/当前句/中译/录音按钮联动全部正常；`/api/tts` 实测返回音频。smoke 18/18。

- **2026-09-30（升级十期 · 自然拼读 phonics）**：新增「🔤 自然拼读」视图（`public/js/phonics.js` + `public/data/phonics.json` + `index.html#view-phonics`）。数据集原创编写：**30 条拼读规则**（6 组：短元音 CVC / 魔法 e / 辅音字母组合 / 元音组合 / r 控音 / 词尾规律 -ed 与 -s），每条含字形、音标、口型 Tip、示例词；另有 **10 组最小音素对**（ship-sheep / think-sink 等含 IPA 与辨音要诀）。三种玩法：①**规则卡**（按组筛选，点词🔊发音 + 「我来读」跳进跟读）；②**拼读跟读**（先慢速后常速示范，录音后走 `api.assess` 评分，≥85 自动下一词）；③**耳朵考试**（听音辨拼 + 最小音素对 8 题，自动发音、即时纠错并讲 Tip，70%+ 放彩带）。`type:'phonics'` 记录计入统计。实测：30 卡渲染、分组过滤、听力题与选项联动正常。smoke 18/18。
- **2026-09-30（升级十一期 · 词根词缀 roots）**：新增「🧬 词根词缀」视图（`public/js/roots.js` + `public/data/roots.json`）。数据集：**46 条词条**（词根 24 / 前缀 12 / 后缀 10），每条含形态、含义、记忆 Tip、3-4 个同族词带中文，共 141 个单词。三种玩法：①**词族树**（按「全部/词根/前缀/后缀」筛选，点单词发音并显示中文）；②**拆词组义**（给单词 + 中文，从 4 个候选里选它属于哪个词根，答后讲构词逻辑）；③**配对挑战**（6 组词根 vs 含义点击配对，含失误计数，全配对放彩带+号角）。完成度计入 XP。实测：46 节点/141 词、后缀筛选 10 条、配对 6vs6 且点击判定正确（1/6 成功、失误 0）、答题 4 选项正常。smoke 18/18。

- **2026-09-30（升级十二期 · 内容自建扩容）**：延续"资源自建"路线补内容短板。①**高级段长难句**：`public/data/materials.json` 的 advanced 段原本只有 2 组 9 条（全库 10 个分级里最薄弱），新增 5 组共 27 条**原创长难句/段落**（a-s2 从句嵌套 / a-s3 插入语与破折号 / a-s4 倒装与强调 / a-s5 学术与新闻语体 / a-p2 演讲与播报段落），**9 → 36 条**。踩坑：新增段落组原用 id `a-p1` 与已有组撞车被去重静默跳过，**批量导入素材必须校验 id 唯一性**（脚本已按 id 去重）。②**配音剧本库扩容**：`dub-scenes.json` 8 幕 → **14 幕 139 句**，新增租房看房 / 健身私教课 / 课堂自我介绍 / 会议上的反对意见 / 药店求助 / 侦探剧：最后的推理，难度分布初级 6 / 中级 5 / 高级 3。全部原创。浏览器实测：14 幕列表正常、高级段 7 组可选且句子加载正常。smoke 18/18。

## 8. 待办与后续

- [x] **听写 Dictation 模式**（听音 → 拼写 → 逐词 Levenshtein 比对高亮错/漏/多词；错词自动进 wordbook）— 已完成（2026-09-30）
- [x] **单词本 + SRS 间隔重复复习**：「📕 单词本」视图，错词自动收录；SM-2 抽认卡复习（忘了/模糊/记得 → quality 0/3/5，调度 ease/interval/reps/due），支持听发音/看释义/删除 — 已完成（2026-09-30）
- [x] **跟读打卡**：进度页打卡卡片（每日目标 / 6 周日历热力 / 连续达标连击 🔥），目标存 `settings.dailyGoal`，数据复用 `/api/progress` — 已完成（2026-09-30）
- [x] **智能推送（规则自适应版）**：进度页「🤖 今日学习计划」，基于 SRS 到期词 + 易错音素 + 高频错词 + 打卡缺口自动生成可跳转的学习建议 — 已完成（2026-09-30）
- [x] **多用户账号**：零依赖注册/登录（`accounts` 表 + scrypt 密码 + HMAC 签名 token），顶栏登录/注册/登出，账号数据存 `acc_<id>` 命名空间且强制 token 鉴权（防 IDOR） — 已完成（2026-09-30）
- [x] **数据导入/导出**：设置页「导出完整备份 / 导入备份」，含练习记录 + 单词本 + 设置 + 自定义素材，导入按 id/word 去重合并 — 已完成（2026-09-30）
- [ ] **智能推送进阶（真·LLM）**：在规则推荐基础上，调用已配置的 LLM（OpenAI/Azure 兼容）生成**个性化错题讲解 / 针对性例句 / 学习诊断**，需新增服务端代理端点（不暴露 key）。前提是 `.env` 配置 `OPENAI_API_KEY`（或 Azure）。待用户确认是否做。
- [ ] **多用户账号 + 数据导入导出**
- [ ] 生产证书：域名 + Let's Encrypt（替代自签名）——**PWA 可安装的硬前提**（见 §8.1）
- [ ] Nginx 反代配置落地
- [ ] IPA 字面斜杠清理（部分字段带 `/.../`，用户要求先按现状用着）
- [ ] 高级段加长难句、`focus` 易错音回补
- [ ] 考试题型化
- [ ] 更多教材版本
- [ ] 跨环境迁移脚本可固化为一条命令（已具备 `scripts/migration/` 组件）

### 8.1 PWA 注意事项（2026-09-29）

- **可安装前提**：`https://` 且**证书受信任**（或 localhost）。当前 VPS 自签名证书下 Chrome 不弹安装入口；iOS Safari 可「添加到主屏幕」但需先信任证书。根治 = 域名 + Let's Encrypt。
- **缓存策略刻意保守**：HTML/JS/CSS 走 network-first，永远优先取新代码（历史上"改了不生效"踩坑多次，不能让 SW 重演）；离线才回落缓存。materials.json 走 stale-while-revalidate（体积大、离线可练）。`/api/*` 一律不缓存。
- **改了 SW / manifest / 前端代码后**：浏览器可能持有旧 SW —— 硬刷新即可；SW 内 `CACHE` 常量带版本号 `v1`，改 SW 行为时必须升版本触发 activate 清理。
- **图标再生成**：`node scripts/gen_icons.mjs`（零依赖，勿引入 sharp/canvas）。
- **验证 PWA**：Chrome DevTools → Application → Manifest（安装性检查）；Service Workers 面板看缓存命中。
