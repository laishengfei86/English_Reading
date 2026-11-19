# scripts/ 脚本说明

按用途分类。所有脚本均为**一次性 / 可复现工具**，手动运行，不被运行时依赖。

## 测试 / 运维（常备核心）
- `smoke.js` — 端到端冒烟测试，`npm run smoke` 调用。自动启停服务并逐项校验 18 项 API。回归基准。
- `gen_icons.mjs` — PWA 应用图标生成（零依赖：node:zlib 手写 PNG 编码 + SDF 绘制麦克风图形）。输出 `public/icons/` 各尺寸。仅在需要改图标时运行。

## 素材生成（可复现，写入 public/data/materials.json）
- `build_curriculum_phase1.mjs` — **当前生效**。小学段（level 4）重构：4 教材版本 × 5 主题 × 3 类（词汇/句型/段落），每版本用独立差异化主题词表。
- `build_curriculum_phase2.mjs` — **当前生效**。初中（level 5）/ 高中（level 6）/ 考试（CET·IELTS·TOEFL，level 7-9）重构。注意按 `key` 取值，避免多分支共用全表。
- `expand_paragraphs.mjs` — **当前生效**。给 level 0-3 的 `-p` 段落组各补 3 条连贯短文（语篇厚度）。

> 重建素材标准流程：`node scripts/build_curriculum_phase1.mjs && node scripts/build_curriculum_phase2.mjs`（如需段落厚度再加 `expand_paragraphs.mjs`）。

## archive/（历史参考，勿再用）
- `gen_curriculum.mjs` — 第一版生成脚本（共用模板 + 末尾改词），导致各版本 92% 词汇雷同。已废弃，仅作历史参考，**不要再运行**。

## deploy/（公网部署）
面向「腾讯云轻量 / 只有公网 IP 没有域名」的场景，详见 `deploy/TRUST-CA.md`。
- `deploy.sh` — 一键部署：环境检查 → 生成证书 → `docker compose up -d` → 健康检查 → 输出访问地址。
- `gen_tls.sh` — 自建根 CA + 签发服务器证书（SAN 含公网 IP）。叶子证书 365 天（iOS 要求 ≤398 天），根 CA 10 年。

## migration/（跨环境数据迁移）
用于将自定义素材在「裸跑 `./data/app.db`」与「Docker 卷 `er_data`」之间迁移。
- `_custom_export.json` — 从 Windows 裸跑 `app.db` 导出的 16 条自定义素材（备份，**勿删**，VPS 迁移尚未完成）。
- `_export_custom.mjs` — 导出：从 `E:/Desktop/English_Reading/data/app.db` 读 `custom_texts` 全行 → `_custom_export.json`。
- `_insert_custom.mjs` — 写入：在目标环境用应用镜像起临时容器 `docker run --rm -v <卷>:/data -v <本目录>:/scripts am-english-reader:1.0.0 node --experimental-sqlite /scripts/_insert_custom.mjs` 写入卷内 `app.db`。
