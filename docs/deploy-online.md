# 菁菁小画桌上线说明

目标：把小画桌部署到线上，让菁菁可以通过一个网址远程体验。

## 推荐方案

首选阿里云轻量应用服务器或 ECS。

原因：

- 国内访问更稳定。
- 千问接口在阿里云百炼，服务器到模型服务的链路更顺。
- 当前项目是一个 Node 服务，不需要复杂容器或数据库。

建议规格：

- 地域：华东 1、华东 2、华南 1，或者离菁菁更近的地域。
- 系统：Ubuntu 22.04 LTS。
- 配置：1 核 1G 可以体验，2 核 2G 更稳。
- 安全组：开放 `80`、`443`，临时测试可开放 `4174`。

## 服务器部署步骤

### 1. 安装 Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git
node -v
npm -v
```

### 2. 拉取代码

```bash
git clone https://github.com/singerliu226/jingjing.git
cd jingjing
```

### 3. 配置环境变量

不要把真实 API Key 写进代码或提交到 GitHub。

```bash
cp .env.example .env
nano .env
```

把 `.env` 改成：

```bash
DASHSCOPE_API_KEY=你的真实 API Key
DASHSCOPE_MODEL=qwen-plus
DASHSCOPE_VISION_MODEL=qwen-vl-plus
PORT=4174
```

### 4. 先直接启动测试

```bash
set -a
source .env
set +a
npm start
```

浏览器访问：

```text
http://服务器公网 IP:4174
```

确认能打开页面、能聊天、能上传图片分析后，再做长期运行。

### 5. 用 PM2 常驻运行

```bash
sudo npm install -g pm2
set -a
source .env
set +a
pm2 start server.js --name jingjing
pm2 save
pm2 startup
```

常用命令：

```bash
pm2 status
pm2 logs jingjing
pm2 restart jingjing
```

## 配置域名和 HTTPS

如果只是临时给菁菁看，可以先用 `http://服务器公网 IP:4174`。

如果要正式一点，建议配置域名和 HTTPS：

1. 域名解析 A 记录到服务器公网 IP。
2. 用 Nginx 把 `80/443` 转发到 `4174`。
3. 用 Certbot 配 HTTPS。

Nginx 示例：

```nginx
server {
  listen 80;
  server_name 你的域名;

  location / {
    proxy_pass http://127.0.0.1:4174;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## 上线前检查

```bash
npm test
```

如果本地已启动服务，也可以跑：

```bash
npm run qa
```

上线后检查：

```bash
curl http://服务器公网 IP:4174/api/health
```

返回里 `hasKey` 应该是 `true`。

## 注意事项

- API Key 只放在服务器 `.env`，不要放进前端文件。
- 公网部署时用 `DESIGN_DESK_ALLOWED_ORIGINS` 限定页面来源；如果链接会给多人使用，再设置 `DESIGN_DESK_API_TOKEN`，前端通过 `localStorage.design-desk-api-token` 发送代理 token。
- 如果公网链接发给多人，千问调用会产生费用，先只发给菁菁体验。
- 第一版数据保存在浏览器本地，同一个网址换设备不会自动同步项目记录。
- 上传图片会发给服务器和千问视觉模型做分析，不要上传敏感商业稿件。
