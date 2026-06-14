import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const WENXIN_ENDPOINT = 'https://app-c0nph8jll8n8-api-zYkZz8qovQ1L-gateway.appmiaoda.com/v2/chat/completions';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const { messages, systemPrompt } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: '参数错误：messages 必须是数组' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('INTEGRATIONS_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API Key 未配置' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    const sysMsg = {
      role: 'system',
      content: systemPrompt ||
        '你是 AquaNote 的专业水族 AI 助手。用户使用 AquaNote 管理水族缸，包括水质检测、生物管理、维护任务、耗材库存等。请根据用户的问题提供专业、简洁的水族养护建议。回答请简洁明了，避免冗长，优先给出实用操作建议。',
    };

    // 调用文心大模型 SSE 流式接口，拼接完整回复后返回
    const upstream = await fetch(WENXIN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Gateway-Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        messages: [sysMsg, ...messages],
        enable_thinking: false,
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error('文心 API 错误:', upstream.status, errText);
      return new Response(
        JSON.stringify({ error: `API 调用失败 (${upstream.status})` }),
        { status: upstream.status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    if (!upstream.body) {
      return new Response(
        JSON.stringify({ error: '上游无响应体' }),
        { status: 502, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }

    // 解析 SSE 流，拼接完整内容
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder('utf8');
    let fullContent = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const raw = line.slice(6).trim();
        if (raw === '[DONE]') break;
        try {
          const chunk = JSON.parse(raw);
          const delta = chunk.choices?.[0]?.delta?.content ?? '';
          fullContent += delta;
        } catch {
          // 跳过无法解析的帧
        }
      }
    }

    return new Response(
      JSON.stringify({ reply: fullContent || '暂无回复' }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Edge Function 异常:', err);
    return new Response(
      JSON.stringify({ error: '服务内部错误，请稍后重试' }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }
});
