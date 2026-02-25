# 流式渲染 (Streaming) Demo

通过一个小型 Node + 前端 Demo 理解**流式渲染**：服务端分块发送数据，浏览器边收边渲染，无需等全部内容就绪。

## 概念简述

- **流式 (Streaming)**：数据像水流一样一段段发送，而不是一次性返回整份响应。
- **逐步渲染**：前端每收到一块就更新 DOM，用户能更早看到首屏或首字。

常见场景：AI 对话逐字输出、长列表分批加载、大文件下载、SSR 时先发壳再发内容（如 React 18 Suspense 流式 SSR）。

## 运行方式

```bash
npm install
npm start
```

浏览器打开：**http://localhost:3000**

## 两种流式技术

- **Chunked + Fetch**（Demo 1～5）：普通 HTTP 分块响应（`Transfer-Encoding: chunked`），前端用 `fetch` + `response.body.getReader()` 读流。灵活，可传任意格式（文本、NDJSON、HTML 等）。
- **SSE（Server-Sent Events）**（Demo 6）：标准协议，`Content-Type: text/event-stream`，消息格式 `data: ...\n\n`；前端用 `EventSource(url)` 订阅，自动重连、支持 `event:` 类型。适合服务端单向推送（通知、进度、日志）。

## Demo 包含的六种流式方式

| 方式 | 接口 | 说明 |
|------|------|------|
| 流式文本 | `GET /api/stream-text` | 服务端每隔一段时间写一段文本，前端用 `fetch` + `ReadableStream` 读完后追加到页面。 |
| 流式 JSON | `GET /api/stream-json` | 使用 **NDJSON**（每行一个 JSON），前端按行解析，每行渲染一条。 |
| 流式 HTML | `GET /api/stream-html` | 服务端推送多块 HTML 片段，前端用 `insertAdjacentHTML` 逐块插入，类似 SSR 流式输出。 |
| ReadableStream 逐字 | `GET /api/stream-reader` | 服务端用 `ReadableStream` 逐字推送，前端逐字显示，类似打字机效果。 |
| **混合类型流（含 meta + md）** | `GET /api/stream-mixed` | 同一流式接口内包含多种类型：每行 NDJSON 带 `type` 字段（如 `meta`、`md`、`done`），前端按类型分别处理；可流式输出并渲染 Markdown 等内容。 |
| **SSE** | `GET /api/stream-sse` | 使用 **Server-Sent Events**：服务端 `text/event-stream` + `data: ...\n\n`，前端 `EventSource` 订阅，收到即渲染。 |

## 关键代码位置

- **服务端**：`server.js`  
  - 设置 `Transfer-Encoding: chunked`，用 `res.write()` 分块写，最后 `res.end()`。
- **前端**：`public/app.js`  
  - `fetch(url)` 得到 `response`，用 `response.body.getReader()` 拿到流，循环 `reader.read()`，用 `TextDecoder` 解码后更新 DOM。

## 扩展学习

- 浏览器：[Streams API](https://developer.mozilla.org/zh-CN/docs/Web/API/Streams_API)、[fetch 与 ReadableStream](https://developer.mozilla.org/zh-CN/docs/Web/API/Fetch_API/Using_Fetch#body)。
- 框架：React 18 [Suspense 流式 SSR](https://react.dev/reference/react-dom/server)、Next.js [Streaming and Suspense](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming)。
- SSE：[Server-Sent Events - MDN](https://developer.mozilla.org/zh-CN/docs/Web/API/Server-sent_events)、[EventSource](https://developer.mozilla.org/zh-CN/docs/Web/API/EventSource)。
