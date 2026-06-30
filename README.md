# 菁菁小画桌

一款给菁菁使用的聊天式设计工作记录 agent。它把零散需求、反馈、截止时间、交付物、修改进度和上传的设计图整理成项目详情、下一步任务和可执行建议。

## 使用方式

如果只体验本地规则整理能力，可以直接打开 `index.html`。

如果要使用千问真实对话，先复制并填写本地环境配置。`.env` 已被 Git 忽略，API Key 不会进入前端代码或版本库：

```bash
cp .env.example .env
# 打开 .env，填写 DASHSCOPE_API_KEY
npm start
```

然后访问 `http://localhost:4174`。

## 部署上线

如果要远程给菁菁体验，请部署 Node 服务，不要只部署静态文件。推荐使用阿里云轻量应用服务器或 ECS，并把千问 API Key 配到服务器环境变量里。

完整步骤见：[docs/deploy-online.md](docs/deploy-online.md)。

现在也支持微信小程序使用，并可在用户主动绑定服务号后发送项目提醒。原网页、小程序接口和服务号回调由同一个服务同时提供，迁移步骤见：[docs/wechat-deployment.md](docs/wechat-deployment.md)。

也可以临时使用启动环境变量覆盖 `.env`：

```bash
DASHSCOPE_MODEL="qwen-plus" DASHSCOPE_API_KEY="你的阿里云百炼 API Key" node server.js
```

如果要让小画桌分析上传的设计图，可以额外指定视觉模型：

```bash
DASHSCOPE_MODEL="qwen-plus" DASHSCOPE_VISION_MODEL="qwen-vl-plus" DASHSCOPE_API_KEY="你的阿里云百炼 API Key" node server.js
```

## 第一版能力

- 自然语言记录需求、反馈和进度。
- 聊天输入会自动回填项目详情，用户只需要修改不准的地方。
- 上传图片后，自动切换到视觉模型，分析版式层级、字体、色彩、可读性和修改方向。
- 填写项目详情后，自动整理工作流，并尝试调用千问补充项目分析。
- 对话提交时先调用 `/api/intent` 让千问判断用户行为，再由本地工作台更新任务、反馈、项目和风险；如果模型不可用，会自动退回本地规则。
- 自动识别项目类型、交付物、反馈人、截止时间和等待确认状态。
- 把模糊反馈翻译成具体设计动作。
- 标记缺少尺寸、交付格式、截止时间、反馈人等风险。
- 整理今日待办、等待确认、风险提醒和交付检查清单。
- 为项目整理归档草稿和面试表达。
- 数据保存在浏览器本地 `localStorage`。
- 通过本地代理接入阿里云千问模型，前端不会保存 API Key。
- 小程序端数据保存在服务器，可在微信里继续项目工作流。
- 服务号可发送临近截止、等待确认和每日计划提醒，提醒类型由用户自己开关。

## 新版本方向

下一阶段不再继续堆规则，而是按 [LLM First 新版本计划](docs/llm-first-product-plan.md) 调整：让大模型优先理解用户意图，本地规则只做状态更新和安全兜底。

在此基础上，产品方向继续从 Chat-first 走向 Context-first：让 Agent 在授权范围内理解设计版本、画面变化和选择过程，减少设计师把工作重新翻译成自然语言。完整路线见 [Context-first Agent 路线与 To-dos](docs/context-first-agent-roadmap.md)。

## 验证

```bash
npm test
npm run bench
npm run qa
```
