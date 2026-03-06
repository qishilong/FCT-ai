/**
 * ==========================================================
 * SSE 客户端 — 前端与后端的通信层
 * ==========================================================
 *
 * 使用 Fetch API + ReadableStream 实现 SSE 客户端。
 * 不使用 EventSource API 是因为 EventSource 不支持 POST 请求。
 *
 * 工作流程：
 * 1. 发起 POST /api/translate 请求
 * 2. 持续读取响应 body 的字节流
 * 3. 将字节流解码为文本，按 SSE 协议解析事件
 * 4. 根据事件类型分发到对应的 handler
 *
 * SSE 协议格式：
 * event: <type>\n
 * data: <JSON>\n
 * \n               ← 空行分隔事件
 */
import { TranslateRequest, IntentResult } from './types';

/** API 基地址，可通过环境变量 NEXT_PUBLIC_API_URL 覆盖 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * SSE 事件类型枚举
 * 与 server 端 SSEEventType 保持一致
 */
export type SSEEventType =
  | 'intent'
  | 'thinking'
  | 'translation'
  | 'supplement_thinking'
  | 'supplement'
  | 'done'
  | 'error';

/**
 * SSE 事件处理器接口
 * 每种事件类型对应一个回调函数
 */
export interface SSEHandler {
  /** Agent1 意图识别完成 */
  onIntent: (data: IntentResult) => void;
  /** Agent2 思考过程（逐 chunk 追加） */
  onThinking: (data: string) => void;
  /** Agent2 翻译内容（逐 chunk 追加） */
  onTranslation: (data: string) => void;
  /** Agent3 思考过程（逐 chunk 追加） */
  onSupplementThinking: (data: string) => void;
  /** Agent3 补充内容（逐 chunk 追加） */
  onSupplement: (data: string) => void;
  /** Agent 链全部完成 */
  onDone: () => void;
  /** 任意阶段发生错误 */
  onError: (error: string) => void;
}

/**
 * 发起翻译请求，通过 SSE 接收流式响应
 *
 * @param request - 翻译请求参数
 * @param handlers - SSE 事件处理器
 * @returns AbortController — 调用 .abort() 可取消请求
 *
 * 使用示例：
 * ```ts
 * const controller = startTranslation(
 *   { content: '...', targetRole: 'developer' },
 *   { onIntent: ..., onThinking: ..., ... }
 * );
 * // 取消: controller.abort();
 * ```
 */
export function startTranslation(request: TranslateRequest, handlers: SSEHandler): AbortController {
  const controller = new AbortController();

  console.log('[API] 发起翻译请求:', {
    contentLength: request.content.length,
    sourceRole: request.sourceRole || '自动识别',
    targetRole: request.targetRole
  });

  // 使用 IIFE 包裹 async 逻辑（startTranslation 本身同步返回 controller）
  (async () => {
    try {
      // Step 1: 发起 POST 请求
      const url = `${API_BASE}/api/translate`;
      console.log(`[API] POST ${url}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: controller.signal // 支持通过 AbortController 取消
      });

      // Step 2: 检查 HTTP 状态码
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: '请求失败' }));
        console.error(`[API] ❌ HTTP 错误: ${response.status}`, err);
        handlers.onError(err.error || `HTTP ${response.status}`);
        return;
      }

      console.log('[API] ✅ HTTP 200，开始读取 SSE 流');

      // Step 3: 获取 ReadableStream reader
      const reader = response.body?.getReader();
      if (!reader) {
        console.error('[API] ❌ 无法获取 response body reader');
        handlers.onError('无法读取响应流');
        return;
      }

      const decoder = new TextDecoder();
      let buffer = ''; // 字节流 → 文本的缓冲区
      let eventCount = 0; // 调试计数器

      // Step 4: 持续读取字节流
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log(`[API] 流读取完成，共处理 ${eventCount} 个 SSE 事件`);
          break;
        }

        // 将字节解码为文本，追加到缓冲区
        buffer += decoder.decode(value, { stream: true });

        // Step 5: 按 SSE 协议解析事件（事件以 \n\n 分隔）
        const events = buffer.split('\n\n');
        buffer = events.pop() || ''; // 最后一段可能是不完整的事件，保留在缓冲区

        for (const eventStr of events) {
          if (!eventStr.trim()) continue;

          // 解析单个 SSE 事件
          const lines = eventStr.split('\n');
          let eventType = '';
          let eventData = '';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7); // "event: " 长度为 7
            } else if (line.startsWith('data: ')) {
              eventData = line.slice(6); // "data: " 长度为 6
            }
          }

          if (!eventType || !eventData) continue;

          eventCount++;

          try {
            const parsed = JSON.parse(eventData);

            // Step 6: 根据事件类型分发到对应 handler
            switch (eventType as SSEEventType) {
              case 'intent':
                console.log('[API] SSE 事件: intent', {
                  sourceRole: parsed.sourceRole,
                  confidence: parsed.confidence
                });
                handlers.onIntent(parsed);
                break;
              case 'thinking':
                handlers.onThinking(parsed);
                break;
              case 'translation':
                handlers.onTranslation(parsed);
                break;
              case 'supplement_thinking':
                handlers.onSupplementThinking(parsed);
                break;
              case 'supplement':
                handlers.onSupplement(parsed);
                break;
              case 'done':
                console.log('[API] SSE 事件: done — Agent 链完成');
                handlers.onDone();
                break;
              case 'error':
                console.error('[API] SSE 事件: error', parsed);
                handlers.onError(parsed.message || '未知错误');
                break;
            }
          } catch {
            // JSON 解析失败，跳过该事件
            console.warn(
              `[API] ⚠️ SSE 事件 JSON 解析失败: eventType=${eventType}, data=${eventData.slice(0, 100)}`
            );
          }
        }
      }
    } catch (err: unknown) {
      // 网络错误处理（排除用户主动取消的 AbortError）
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('[API] ❌ 网络错误:', err.message);
        handlers.onError(err.message || '网络错误');
      } else if (err instanceof Error && err.name === 'AbortError') {
        console.log('[API] 请求已被用户取消 (AbortError)');
      } else if (!(err instanceof Error)) {
        console.error('[API] ❌ 未知错误类型:', err);
        handlers.onError('网络错误');
      }
    }
  })();

  return controller;
}
