# HubQueue

## 概述

HubQueue 是一个与 [ClassIsland Hub](https://github.com/ClassIsland/classisland-hub) 配套的，用于统一小规模上传图片途径，以及帮助不便于发起 PR 的用户的无服务器的基于 NextJS Web 项目。

本项目的早期开发基于 Google Firebase Studio AI。

本项目的实例部署可以在 <https://hubqueue.netlify.app> 查看，基于 Netlify 托管。

## 部署

要部署这个项目，最简单的方式是把它部署到 Netlify。Fork 这个仓库，然后在 Netlify 中选择即可，Netlify 会自动识别需要的部署方式。

当然，你也可以在本地部署。

```shell
git clone https://github.com/Pulsar33550336/HubQueue
npm install
npm run build
npm run start
```

无论以哪一种方式部署，都需要配置环境变量。

```env
ABLY_API_KEY="xxxxxx.xxxxxx:xxxxxxxx-xxxx-xxxxxxxxxxxxxxxxxxxxxxxxx-xxx"
SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxx-xxxxxxxxxxx_xx
WEBDAV_URL=https://xxxxx.xxxx:1234/dav
WEBDAV_USERNAME=pulsar2021@163.com
WEBDAV_PASSWORD=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> `SUPABASE_SERVICE_ROLE_KEY` 实际上是匿名令牌

在 Netlify 中，请把 `SUPABASE_URL` 与 `SUPABASE_SERVICE_ROLE_KEY` 之外的内容设置为私密变量。

在本地中，把这些放到 `.env` 中，它不会被 Git 跟踪，也不会被上传。

## 开发

```shell
npm run dev
```
