/**
 * ==========================================================
 * Doubao (豆包) API 客户端
 * ==========================================================
 *
 * 基于 OpenAI SDK 的兼容模式封装，连接火山引擎 ARK API。
 * Doubao-Seed-2.0-pro 模型支持 OpenAI 兼容接口，因此可以直接
 * 使用 openai npm 包，只需修改 baseURL 指向 ARK 端点。
 *
 * 提供两种调用方式：
 * - chatCompletion: 非流式，用于 Agent1 意图识别（需要完整 JSON）
 * - chatCompletionStream: 流式，用于 Agent2/Agent3（逐 token 推送）
 *
 * 环境变量：
 * - ARK_API_KEY: 火山引擎 API Key（必填）
 * - ARK_BASE_URL: API 端点（默认 https://ark.cn-beijing.volces.com/api/v3）
 * - ARK_MODEL: 模型名称（默认 doubao-seed-2.0-pro）
 */
import OpenAI from 'openai';
import type { Stream } from 'openai/streaming';
import dotenv from 'dotenv';
import path from 'path';

// 从根目录 .env 文件加载环境变量
// 尝试多个可能的路径，兼容不同的启动方式（CWD 可能是 root 或 server/）
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });

// ---------- 环境变量读取 ----------
const apiKey = process.env.ARK_API_KEY;
const baseURL = process.env.ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3';
const model = process.env.ARK_MODEL || 'doubao-seed-2.0-pro';

// 启动时打印配置信息（隐藏 API Key 敏感部分）
console.log('[DoubaoClient] 初始化配置:');
console.log(`  - baseURL: ${baseURL}`);
console.log(`  - model: ${model}`);
console.log(`  - apiKey: ${apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}` : '❌ 未配置'}`);

if (!apiKey) {
  console.error('⚠️  ARK_API_KEY 未配置，请在根目录 .env 文件中设置');
}

// 创建 OpenAI 兼容客户端实例
const client = new OpenAI({
  apiKey: apiKey || 'placeholder',
  baseURL,
  timeout: 30000 // 30 秒超时
});

/**
 * 聊天消息格式
 * 与 OpenAI ChatCompletion API 的 messages 数组元素一致
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * 非流式调用 — 用于意图识别等需要完整响应的场景
 *
 * @param messages - 消息列表
 * @param temperature - 温度参数，默认 0.3（低温度=更确定性输出）
 * @returns 模型的完整回复文本
 */
export async function chatCompletion(messages: ChatMessage[], temperature = 0.3): Promise<string> {
  console.log('[DoubaoClient] 非流式调用开始');
  console.log(`  - temperature: ${temperature}`);
  console.log(`  - messages 数量: ${messages.length}`);
  console.log(`  - 首条消息角色: ${messages[0]?.role}, 长度: ${messages[0]?.content.length} 字`);

  const startTime = Date.now();

  const response = await client.chat.completions.create({
    model,
    messages,
    temperature
  });

  const content = response.choices[0]?.message?.content || '';
  const elapsed = Date.now() - startTime;

  console.log(`[DoubaoClient] 非流式调用完成 (${elapsed}ms)`);
  console.log(`  - 响应长度: ${content.length} 字`);
  console.log(
    `  - usage: prompt_tokens=${response.usage?.prompt_tokens}, completion_tokens=${response.usage?.completion_tokens}`
  );

  return content;
}

/**
 * 流式调用选项
 */
export interface StreamOptions {
  /** 是否开启思考模式，默认 true */
  thinkingMode?: boolean;
}

/**
 * 流式调用 — 返回 AsyncIterable，用于翻译和补充 Agent
 *
 * 流式响应中每个 chunk 包含：
 * - delta.content: 正式回复内容
 * - delta.reasoning_content: 思考过程（Doubao-Seed-2.0-pro 特有字段，仅 thinkingMode=true 时返回）
 *
 * @param messages - 消息列表
 * @param temperature - 温度参数，默认 0.6（较高温度=更多创造性）
 * @param options - 流式调用选项
 * @returns OpenAI Stream 对象，支持 for-await-of 遍历
 */
export async function chatCompletionStream(
  messages: ChatMessage[],
  temperature = 0.6,
  options: StreamOptions = {}
): Promise<Stream<OpenAI.Chat.Completions.ChatCompletionChunk>> {
  const { thinkingMode = true } = options;

  console.log('[DoubaoClient] 流式调用开始');
  console.log(`  - temperature: ${temperature}`);
  console.log(`  - thinkingMode: ${thinkingMode}`);
  console.log(`  - messages 数量: ${messages.length}`);

  const requestBody: any = {
    model,
    messages,
    temperature,
    stream: true,
    // 通过 thinking 参数控制模型是否开启深度思考
    // Volcengine ARK API 兼容此参数，关闭后模型不产生 reasoning_content
    thinking: { type: thinkingMode ? 'enabled' : 'disabled' }
  };

  // 使用 as any 绕过类型校验（因为 thinking 是 ARK 扩展字段，不在 OpenAI SDK 类型中），
  // 然后将返回值断言为 Stream 类型以恢复 for-await-of 支持
  const stream = (await client.chat.completions.create(
    requestBody
  )) as unknown as Stream<OpenAI.Chat.Completions.ChatCompletionChunk>;

  console.log('[DoubaoClient] 流式连接已建立，开始接收 chunks...');

  return stream;
}

export { model };
