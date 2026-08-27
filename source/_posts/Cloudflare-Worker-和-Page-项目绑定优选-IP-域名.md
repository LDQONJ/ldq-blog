---
title: Cloudflare Worker 和 Page 项目绑定优选 IP 域名
date: 2026-06-23 19:14:57
tags: [Cloudflare]
---

## 1. 创建自定义主机名

- ### 创建一个自定义主机名，主机名为想要作为访问域名的子域名，如 `a.example.com`，回源域名随便创建一个当前域的子域名，如 `b.example.com`，验证方式选择 Http 验证。
- ### 创建一个 `a.example.com` 的 CNAME DNS 记录，内容为能解析出优选 IP 的域名，如 `cloudflare.182682.xyz`，关闭小黄云。
- ### 创建一个 `b.example.com` 的 AAAA DNS 记录，内容为 `100::`，开启小黄云。

### (回源域名 `b.example.com` 可以复用，不用创建多个)

## 2. 负责转发的 Worker

### 创建中间 Worker

- Page 项目的中间 Worker

```javascript
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    url.hostname = "xxx.pages.dev";
    const newHeaders = new Headers(request.headers);
    newHeaders.set("host", "xxx.pages.dev");
    const newRequest = new Request(url, {
      method: request.method,
      headers: newHeaders,
      body: request.body,
      redirect: "manual",
    });
    return fetch(newRequest);
  },
};
```

- Worker 项目的中间 Worker

```javascript
// Worker 项目的中间 Worker 需要额外设置服务绑定：
// 中间 Worker 详情 -> 绑定 -> 添加绑定 -> 服务绑定 -> 添加绑定，
// 变量名称：TARGET_WORKER，服务绑定：目标 Worker 项目。
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    url.hostname = "xxx.workers.dev";
    const options = {
      method: request.method,
      headers: new Headers(request.headers),
    };
    const newRequest = new Request(url, options);
    return await env.TARGET_WORKER.fetch(newRequest);
  },
};
```

## 3. 给中间 Worker 添加一条路由，内容为 `a.example.com/*`。

## 4. 访问 `a.example.com`，打开 F12 观察远程地址为优选 IP，并且成功访问到了目标 Worker 或 Page 项目。
