/**
 * 流式渲染 (Streaming) Demo - 前端
 *
 * 使用 fetch() + response.body (ReadableStream) 消费流式响应，
 * 每收到一块数据就更新 DOM，实现「逐步渲染」。
 */

const $ = (id) => document.getElementById(id);

// ---------- 1. 流式文本：逐段追加 ----------
async function runStreamText() {
  const out = $('stream-text-output');
  const btn = $('btn-stream-text');
  out.textContent = '';
  btn.disabled = true;

  try {
    const res = await fetch('/api/stream-text');
    if (!res.body) throw new Error('无 body');
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let acc = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      acc += decoder.decode(value, { stream: true });
      out.textContent = acc;
    }
  } catch (e) {
    out.textContent = '错误: ' + e.message;
  } finally {
    btn.disabled = false;
  }
}

// ---------- 2. 流式 JSON (NDJSON)：按行解析并渲染 ----------
async function runStreamJson() {
  const out = $('stream-json-output');
  const btn = $('btn-stream-json');
  out.innerHTML = '';
  btn.disabled = true;

  try {
    const res = await fetch('/api/stream-json');
    if (!res.body) throw new Error('无 body');
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const item = JSON.parse(line);
          const li = document.createElement('li');
          li.textContent = `#${item.id} ${item.name} ${item.done ? '✓' : '○'}`;
          out.appendChild(li);
        } catch (_) {}
      }
    }
  } catch (e) {
    const li = document.createElement('li');
    li.textContent = '错误: ' + e.message;
    out.appendChild(li);
  } finally {
    btn.disabled = false;
  }
}

// ---------- 3. 流式 HTML：收到一块就插入一块 ----------
async function runStreamHtml() {
  const out = $('stream-html-output');
  const btn = $('btn-stream-html');
  out.innerHTML = '';
  btn.disabled = true;

  try {
    const res = await fetch('/api/stream-html');
    if (!res.body) throw new Error('无 body');
    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      out.insertAdjacentHTML('beforeend', chunk);
    }
  } catch (e) {
    out.textContent = '错误: ' + e.message;
  } finally {
    btn.disabled = false;
  }
}

// ---------- 4. ReadableStream 逐字 ----------
async function runStreamReader() {
  const out = $('stream-reader-output');
  const btn = $('btn-stream-reader');
  out.textContent = '';
  btn.disabled = true;

  try {
    const res = await fetch('/api/stream-reader');
    if (!res.body) throw new Error('无 body');
    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      out.textContent += decoder.decode(value, { stream: true });
    }
  } catch (e) {
    out.textContent = '错误: ' + e.message;
  } finally {
    btn.disabled = false;
  }
}

// ---------- 5. 混合类型流：按 type 处理 meta / md / done ----------
function mdToHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^# (.+)$/gm, '<h4>$1</h4>')
    .replace(/\n/g, '<br>');
}

async function runStreamMixed() {
  const titleEl = $('stream-mixed-title');
  const bodyEl = $('stream-mixed-body');
  const btn = $('btn-stream-mixed');
  titleEl.textContent = '';
  bodyEl.innerHTML = '';
  btn.disabled = true;

  try {
    const res = await fetch('/api/stream-mixed');
    if (!res.body) throw new Error('无 body');
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const obj = JSON.parse(line);
          switch (obj.type) {
            case 'meta':
              if (obj.title) titleEl.textContent = obj.title;
              break;
            case 'md':
              bodyEl.insertAdjacentHTML(
                'beforeend',
                mdToHtml(obj.content || '')
              );
              break;
            case 'done':
              // 可在这里做收尾（如隐藏 loading）
              break;
            default:
              break;
          }
        } catch (_) {}
      }
    }
  } catch (e) {
    bodyEl.textContent = '错误: ' + e.message;
  } finally {
    btn.disabled = false;
  }
}

// ---------- 6. SSE：用 EventSource 订阅，收到即渲染 ----------
function runStreamSse() {
  const out = $('stream-sse-output');
  const btn = $('btn-stream-sse');
  out.textContent = '';
  btn.disabled = true;

  const url = `${window.location.origin}/api/stream-sse`;
  const es = new EventSource(url);

  es.onmessage = (e) => {
    const data = e.data;
    if (data === '{}') return; // done 事件的 data
    out.appendChild(document.createTextNode(data + '\n\n'));
  };
  es.addEventListener('done', () => {
    es.close();
    btn.disabled = false;
  });
  es.onerror = () => {
    es.close();
    btn.disabled = false;
  };
}

// ---------- 7. Fetch + SSE 格式：按 event 类型解析 data，分别渲染 meta / md / done ----------
function parseSSEEvent(raw) {
  const lines = raw.split('\n');
  let eventType = '';
  const dataLines = [];
  for (const line of lines) {
    if (line.startsWith('event: ')) eventType = line.slice(7).trim();
    else if (line.startsWith('data: ')) dataLines.push(line.slice(6));
  }
  const data = dataLines.join('\n').trim();
  return { event: eventType || 'message', data };
}

async function runStreamFetchSse() {
  const titleEl = $('stream-fetch-sse-title');
  const bodyEl = $('stream-fetch-sse-body');
  const btn = $('btn-stream-fetch-sse');
  titleEl.textContent = '';
  bodyEl.innerHTML = '';
  btn.disabled = true;

  try {
    const res = await fetch('/api/stream-sse-mixed');
    if (!res.body) throw new Error('无 body');
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      for (const raw of events) {
        debugger;
        if (!raw.trim()) continue;
        const { event: eventType, data } = parseSSEEvent(raw);
        if (eventType === 'done' || data === '{}') continue;
        if (eventType === 'meta') {
          try {
            const obj = JSON.parse(data);
            if (obj.title) titleEl.textContent = obj.title;
          } catch (_) {}
          continue;
        }
        if (eventType === 'md') {
          try {
            const obj = JSON.parse(data);
            if (obj.content)
              bodyEl.insertAdjacentHTML('beforeend', mdToHtml(obj.content));
          } catch (_) {
            bodyEl.insertAdjacentHTML('beforeend', mdToHtml(data));
          }
        }
      }
    }
  } catch (e) {
    bodyEl.textContent = '错误: ' + e.message;
  } finally {
    btn.disabled = false;
  }
}

// ---------- 清空 ----------
function clearAll() {
  $('stream-text-output').textContent = '';
  $('stream-json-output').innerHTML = '';
  $('stream-html-output').innerHTML = '';
  $('stream-reader-output').textContent = '';
  $('stream-mixed-title').textContent = '';
  $('stream-mixed-body').innerHTML = '';
  $('stream-sse-output').textContent = '';
  $('stream-fetch-sse-title').textContent = '';
  $('stream-fetch-sse-body').innerHTML = '';
}

$('btn-stream-text').addEventListener('click', runStreamText);
$('btn-stream-json').addEventListener('click', runStreamJson);
$('btn-stream-html').addEventListener('click', runStreamHtml);
$('btn-stream-reader').addEventListener('click', runStreamReader);
$('btn-stream-mixed').addEventListener('click', runStreamMixed);
$('btn-stream-sse').addEventListener('click', runStreamSse);
$('btn-stream-fetch-sse').addEventListener('click', runStreamFetchSse);
$('btn-clear').addEventListener('click', clearAll);
