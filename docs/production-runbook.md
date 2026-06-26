# 菁菁小画桌生产环境记录

这份记录用于下次直接部署，不再重新查服务器位置。

## 当前服务器

- 云厂商：阿里云
- 产品：轻量应用服务器
- 地域：华东 2（上海）
- 实例名：Ubuntu-nkly
- 公网 IP：47.103.122.202
- 系统：Ubuntu 24.04
- 远程入口：阿里云轻量应用服务器控制台 -> 服务器 -> Ubuntu-nkly -> 远程连接 -> Workbench 一键登录

## 当前项目位置

```bash
/opt/jingjing
```

项目来自 GitHub：

```bash
https://github.com/singerliu226/jingjing.git
```

环境变量文件在服务器：

```bash
/opt/jingjing/.env
```

不要把 `.env` 内容复制到聊天、文档或 GitHub。

## 当前线上入口

```text
http://47.103.122.202/
http://47.103.122.202/api/health
```

健康检查里 `hasKey` 应为 `true`。

## 标准更新流程

先在本地完成测试和推送：

```bash
npm test
npm run qa
git push origin main
```

然后进入服务器 `/opt/jingjing`，执行：

```bash
cp .env /tmp/jingjing-env-backup
git fetch origin main
git reset --hard origin/main
npm install --omit=dev
set -a
. ./.env
set +a
pm2 restart jingjing --update-env || pm2 start server.js --name jingjing
pm2 save
```

如果 PM2 里没有 `jingjing`，但发现有旧的 root Node 进程在跑，先停掉旧进程：

```bash
sudo pkill -f /opt/jingjing/server.js
```

再执行上面的 PM2 启动命令。

## 验证

```bash
pm2 status
curl http://127.0.0.1:4174/api/health
```

在本地再验证公网：

```bash
curl http://47.103.122.202/api/health
curl http://47.103.122.202/index.html
```

页面里应该能看到最新版本相关文本或结构，例如：

```text
progress-view
下一步任务
编辑项目详情
```

## 这次排查得到的结论

- 服务器不是 ECS 控制台里的杭州 GPU 机器，而是轻量应用服务器里的上海机器。
- 项目目录是 `/opt/jingjing`。
- 旧目录曾经在服务器里直接改过，Git 状态不干净；以后以 GitHub `main` 为唯一代码来源。
- 旧服务曾由 root 直接跑 `node /opt/jingjing/server.js`；以后统一使用 `admin` 用户的 PM2 管理。
- 本地 SSH 目前还不能直接登录，原因是服务器没有绑定当前电脑的 SSH 公钥。要做到真正本地一键部署，需要先把本机公钥加入服务器 `admin` 用户的 `authorized_keys`。
