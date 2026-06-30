# 微信小程序与服务号部署

这套改造不会替换现有网页。网页、小程序接口和服务号回调共用同一个 Node 服务，原来的访问地址可以继续使用。

## 1. 准备微信主体

需要准备：

- 一个已认证的小程序。
- 一个已认证的服务号。
- 一个已经启用 HTTPS 的正式域名。
- 小程序和服务号最好绑定到同一个微信开放平台账号，便于后续统一用户身份。

服务号通知只用于用户主动开启的项目提醒，例如临近截止、等待反馈和每日计划，不用于营销群发。

## 2. 配置服务器

参考 `.env.example`，把以下变量加入服务器的 `.env`：

```bash
WECHAT_MINI_APP_ID=
WECHAT_MINI_APP_SECRET=
WECHAT_SESSION_SECRET=
WECHAT_OA_APP_ID=
WECHAT_OA_APP_SECRET=
WECHAT_OA_TEMPLATE_ID=
WECHAT_OA_TEMPLATE_FIELDS={"title":"thing1","time":"time2","action":"thing3"}
WECHAT_PUBLIC_BASE_URL=https://你的正式域名
WECHAT_NOTIFICATION_ADMIN_TOKEN=
WECHAT_STORE_FILE=/opt/jingjing/data/wechat-store.json
```

`WECHAT_SESSION_SECRET` 和 `WECHAT_NOTIFICATION_ADMIN_TOKEN` 应使用不同的长随机字符串。`WECHAT_OA_TEMPLATE_FIELDS` 要与服务号模板实际字段一致。

发布后检查：

```bash
curl https://你的正式域名/api/health
curl https://你的正式域名/api/wechat/health
```

第二个接口中的三个配置状态都应为 `true`。

## 3. 配置微信后台

小程序后台：

- 将正式域名加入 `request` 合法域名。
- 将正式域名加入 `web-view` 业务域名。
- 配置隐私说明，并声明图片选择用途。

服务号后台：

- 网页授权域名填写同一个正式域名。
- 新建服务提醒模板，并把模板 ID 写入服务器配置。
- 回调地址由系统自动使用：`https://你的正式域名/wechat/oa/oauth/callback`。

## 4. 上传小程序

打开 `miniapp/config.js`，把 `https://YOUR_DOMAIN` 改成正式域名。再用微信开发者工具导入仓库中的 `miniapp` 目录，填写真实小程序 AppID，完成预览、真机调试和上传审核。

当前小程序包含：

- 工作台：查看当前一步、记录进度、上传设计稿并获得反馈。
- 项目：创建、切换和维护项目。
- 服务提醒：绑定服务号，控制截止、等待确认和每日计划提醒。

## 5. 启动定时通知

服务器每 10 分钟调用一次通知处理接口即可：

```cron
*/10 * * * * curl -fsS -X POST -H "x-wechat-admin-token: 你的令牌" https://你的正式域名/api/wechat/notifications/process >/dev/null
```

通知任务使用确定性 ID 去重；失败任务最多重试三次。用户未绑定服务号时不会发送。

## 6. 上线前验收

依次完成以下真机流程：

1. 小程序首次打开并登录。
2. 新建一个项目，关闭后重新打开，确认数据仍在。
3. 上传一张设计图，确认 AI 能返回可执行建议。
4. 在设置页绑定服务号。
5. 点击“发送测试提醒”，确认微信收到消息且能返回对应小程序页面。
6. 确认原网页仍可正常打开、聊天和上传图片。

本地可先运行 `npm test` 做兼容性和接口回归。服务号真实发送仍必须使用正式 AppID、密钥、模板和微信真机验证。
