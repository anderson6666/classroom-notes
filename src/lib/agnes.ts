const AGNES_ENDPOINT = 'https://apihub.agnes-ai.com/v1/chat/completions';
const AGNES_MODEL = 'agnes-2.0-flash';

export interface AgnesMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class AgnesError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'AgnesError';
    this.status = status;
  }
}

export async function streamAgnes(
  apiKey: string,
  messages: AgnesMessage[],
  onDelta: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  if (!apiKey) {
    throw new AgnesError(401, '未配置 Agnes API Key，请在设置页填入。');
  }

  const res = await fetch(AGNES_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: AGNES_MODEL,
      messages,
      stream: true,
      temperature: 0.4,
    }),
    signal,
  });

  if (!res.ok) {
    let detail = '';
    try {
      detail = await res.text();
    } catch {
      /* ignore */
    }
    throw new AgnesError(
      res.status,
      `Agnes API 错误 ${res.status}：${detail.slice(0, 200) || res.statusText}`,
    );
  }

  if (!res.body) {
    throw new AgnesError(0, 'Agnes API 未返回数据流。');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data:')) continue;
      const data = trimmed.slice(5).trim();
      if (data === '[DONE]') return full;
      try {
        const json = JSON.parse(data);
        const delta: string | undefined = json.choices?.[0]?.delta?.content;
        if (delta) {
          full += delta;
          onDelta(delta);
        }
      } catch {
        /* skip malformed chunk */
      }
    }
  }
  return full;
}

export function buildSummaryMessages(
  transcript: string,
  lang: string,
  prevSummary?: string,
): AgnesMessage[] {
  const langName: Record<string, string> = {
    'zh-CN': '中文',
    'zh-TW': '中文',
    'en-US': 'English',
  };
  const l = langName[lang] || lang;
  return [
    {
      role: 'system',
      content: `你是大学课堂实时助手。根据学生提供的课堂转写文本，生成简洁的要点总结。要求：使用${l}；用 Markdown 无序列表输出 3-6 条核心知识点与关键概念；每条不超过 30 字；不要复述原文；如内容过短或无意义，输出"（内容不足，待补充）"。${
        prevSummary ? '这是上一版总结，请在它基础上增量更新：\n' + prevSummary : ''
      }`,
    },
    {
      role: 'user',
      content: transcript,
    },
  ];
}

export function buildCorrectMessages(
  text: string,
  lang: string,
): AgnesMessage[] {
  return [
    {
      role: 'system',
      content: `你是语音转写纠错助手。修正同音错字、标点缺失、专业术语错误，保持原意与口语化风格，不要增删实质内容，不要添加注释，只输出修正后的纯文本。识别语言：${lang}。`,
    },
    {
      role: 'user',
      content: text,
    },
  ];
}

export async function testAgnesConnection(apiKey: string): Promise<void> {
  if (!apiKey) {
    throw new AgnesError(401, '请先填入 API Key。');
  }
  await streamAgnes(
    apiKey,
    [
      { role: 'system', content: '回复"ok"即可。' },
      { role: 'user', content: 'test' },
    ],
    () => {},
  );
}
