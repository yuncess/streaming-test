/**
 * 流式渲染 (Streaming) Demo - 服务端
 * 所有 API 直接挂在 app 上，避免 Router 导致 404
 */

import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;

// ---------- 所有 API 路由直接注册，且必须在 static 之前 ----------
app.get('/api', (req, res) => {
  res.json({
    message: '流式 Demo API',
    endpoints: [
      '/api/stream-text',
      '/api/stream-json',
      '/api/stream-html',
      '/api/stream-reader',
      '/api/stream-mixed',
      '/api/stream-sse',
      '/api/stream-sse-mixed',
    ],
  });
});

// ---------- SSE（Server-Sent Events）流式 ----------
// 与上面 chunked + fetch 的区别：SSE 使用标准协议 text/event-stream，前端用 EventSource 订阅，自动重连、事件类型等。
app.get('/api/stream-sse', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // 禁用 nginx 等代理的缓冲
  res.flushHeaders?.();

  const lines = [
    'SSE 使用 text/event-stream，每条消息格式为 data: ...\\n\\n',
    '前端用 EventSource(url) 订阅，onmessage 收到 data 内容',
    '适合服务端单向推送：通知、日志、进度等',
  ];
  let i = 0;
  const send = () => {
    if (i >= lines.length) {
      res.write('event: done\ndata: {}\n\n');
      res.end();
      return;
    }
    res.write(`data: ${lines[i]}\n\n`);
    i++;
    setTimeout(send, 350);
  };
    send();
});

// ---------- SSE 混合类型（供 Fetch+SSE demo 按 event 类型分别处理）----------
// 每条消息带 event: 类型，data 为 JSON 或文本，前端根据 event 分支：meta 渲染标题，md 渲染正文。
app.get('/api/stream-sse-mixed', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const payloads = [
    { event: 'meta', data: JSON.stringify({ title: 'Fetch + SSE 混合类型示例', lang: 'zh' }) },
    { event: 'md', data: JSON.stringify({ content: '# 说明\n\nSSE 里用 **event** 区分类型：\n\n' }) },
    { event: 'md', data: JSON.stringify({ content: '- `meta`：元信息（标题等）\n' }) },
    { event: 'md', data: JSON.stringify({ content: '- `md`：Markdown 内容块\n' }) },
    { event: 'md', data: JSON.stringify({ content: '- `done`：结束\n\n' }) },
    { event: 'md', data: JSON.stringify({ content: '前端按 **event** 解析 **data**（JSON），再分别渲染。' }) },
    { event: 'done', data: '{}' },
  ];
  let i = 0;
  const send = () => {
    if (i >= payloads.length) {
      res.end();
      return;
    }
    const { event, data } = payloads[i];
    res.write(`event: ${event}\ndata: ${data}\n\n`);
    i++;
    setTimeout(send, 280);
  };
  send();
});

// 流式文本
// 实现流式接口的关键设置：
// 1. "Transfer-Encoding: chunked" 告诉客户端，响应体会被分为一块块地发送（即分块传输），客户端可以边接收边处理数据，无需等到整体内容准备好。
// 2. "Cache-Control: no-cache" 禁止中间缓存，确保每个块都立刻传到浏览器。
// 3. "Connection: keep-alive" 保持连接不中断，保证数据能持续流动发送。
// 4. 代码实现上，需多次调用 res.write(...) 发送一块数据即可，最后不要忘记 res.end() 结束响应。
app.get('/api/stream-text', (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  const sentences = [
    '流式渲染允许服务器一边生成内容，一边向客户端发送。',
    '这样用户不用等全部数据准备好，就能先看到部分内容。',
    '常见场景：AI 对话逐字输出、长列表分批加载、大文件下载。',
  ];
  let i = 0;
  const sendNext = () => {
    if (i >= sentences.length) {
      res.end();
      return;
    }
    res.write(sentences[i] + '\n\n');
    i++;
    setTimeout(sendNext, 400);
  };
  sendNext();
});

// 流式 JSON
app.get('/api/stream-json', (req, res) => {
  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  const items = [
    { id: 1, name: '第一项', done: true },
    { id: 2, name: '第二项', done: false },
    { id: 3, name: '第三项', done: false },
  ];
  let i = 0;
  const sendNext = () => {
    if (i >= items.length) {
      res.end();
      return;
    }
    res.write(JSON.stringify(items[i]) + '\n');
    i++;
    setTimeout(sendNext, 300);
  };
  sendNext();
});

// 流式 HTML
app.get('/api/stream-html', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  const chunks = [
    '<section class="stream-block"><h3>区块 1</h3><p>这是最先到达的 HTML 片段。</p></section>',
    '<section class="stream-block"><h3>区块 2</h3><p>随后是第二块内容，无需等前面全部完成。</p></section>',
    '<section class="stream-block"><h3>区块 3</h3><p>最后一块，流式结束。</p></section>',
  ];
  let i = 0;
  const sendNext = () => {
    if (i >= chunks.length) {
      res.end();
      return;
    }
    res.write(chunks[i]);
    i++;
    setTimeout(sendNext, 500);
  };
  sendNext();
});

// 流式 Reader
app.get('/api/stream-reader', (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  const stream = new ReadableStream({
    start(controller) {
      const words = '流式渲染让我们可以逐步把数据推送到客户端。'.split('');
      let i = 0;
      const id = setInterval(() => {
        if (i >= words.length) {
          clearInterval(id);
          controller.close();
          return;
        }
        controller.enqueue(new TextEncoder().encode(words[i]));
        i++;
      }, 80);
    },
  });
  const reader = stream.getReader();
  const pump = () => {
    reader.read().then(({ done, value }) => {
      if (done) {
        res.end();
        return;
      }
      res.write(Buffer.from(value));
      pump();
    });
  };
  pump();
});

// 混合类型流
app.get('/api/stream-mixed', (req, res) => {
  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  const payloads = [
    { type: 'meta', title: '流式接口中的混合数据', lang: 'zh' },
    {
      type: 'md',
      content: '# 可以\n\n同一段流式返回里包含 **多种类型**：\n\n',
    },
    { type: 'md', content: '- `meta`：元信息（标题、语言等）\n' },
    { type: 'md', content: '- `md`：Markdown 内容块\n' },
    { type: 'md', content: '- `done`：结束标记\n\n' },
    { type: 'md', content: '这样前端按 **type** 分支，即可分别渲染。' },
    { type: 'done' },
  ];
  let i = 0;
  const sendNext = () => {
    if (i >= payloads.length) {
      res.end();
      return;
    }
    res.write(JSON.stringify(payloads[i]) + '\n');
    i++;
    setTimeout(sendNext, 280);
  };
  sendNext();
});

// 静态文件必须放在所有 API 之后
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`流式 Demo 服务已启动: http://localhost:${PORT}`);
});
