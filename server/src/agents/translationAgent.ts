/**
 * ==========================================================
 * Agent 2 — 翻译 Agent
 * ==========================================================
 *
 * 职责：将源角色的表述翻译为目标角色能理解的语言
 *
 * 调用方式：流式（AsyncGenerator），逐 token 推送给前端
 * 温度：0.6（中等温度，允许翻译有一定灵活度和创造性）
 *
 * 输出两种类型的 chunk：
 * - thinking: 模型的思考过程（Doubao-Seed-2.0-pro 的 reasoning_content 字段）
 * - translation: 正式的翻译内容（delta.content 字段）
 *
 * 注意：reasoning_content 是豆包模型的扩展字段，不在 OpenAI 标准类型定义中，
 * 因此需要使用 (delta as any).reasoning_content 访问。
 */
import { chatCompletionStream } from '../services/doubaoClient.js';
import { buildTranslationPrompt } from '../prompts/translationPrompts.js';
import { Role } from '../types/index.js';

/**
 * 运行翻译 Agent（流式）
 *
 * @param content - 原始内容
 * @param sourceRole - 发言者角色
 * @param targetRole - 目标受众角色
 * @param keyPoints - Agent1 提取的关键要点
 * @yields {{ type: 'thinking' | 'translation', content: string }} 逐 chunk 输出
 */
export async function* runTranslationAgent(
  content: string,
  sourceRole: Role,
  targetRole: Role,
  keyPoints: string[],
  thinkingMode: boolean = true
): AsyncGenerator<{ type: 'thinking' | 'translation'; content: string }> {
  console.log('[TranslationAgent] ====== Agent2 翻译开始 ======');
  console.log(`[TranslationAgent] 源角色: ${sourceRole} → 目标角色: ${targetRole}`);
  console.log(`[TranslationAgent] keyPoints: ${JSON.stringify(keyPoints)}`);
  console.log(`[TranslationAgent] 内容长度: ${content.length} 字`);
  console.log(`[TranslationAgent] thinkingMode: ${thinkingMode}`);

  // 构建翻译 Prompt
  const prompt = buildTranslationPrompt(content, sourceRole, targetRole, keyPoints);
  console.log(`[TranslationAgent] Prompt 构建完成，总长度: ${prompt.length} 字`);

  // 发起流式调用，传入 thinkingMode 控制模型是否开启深度思考
  const stream = await chatCompletionStream([{ role: 'user', content: prompt }], 0.6, {
    thinkingMode
  });

  // 统计 chunk 数量，用于调试
  let thinkingChunks = 0;
  let translationChunks = 0;
  let totalThinkingLength = 0;
  let totalTranslationLength = 0;

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta;
    if (!delta) continue;

    // Doubao-Seed-2.0-pro 的思考内容在 reasoning_content 字段（非标准字段）
    // 仅在 thinkingMode 开启时 yield 思考内容
    const reasoningContent = (delta as any).reasoning_content;
    if (reasoningContent && thinkingMode) {
      thinkingChunks++;
      totalThinkingLength += reasoningContent.length;
      yield { type: 'thinking', content: reasoningContent };
    }

    // 正式翻译内容
    if (delta.content) {
      translationChunks++;
      totalTranslationLength += delta.content.length;
      yield { type: 'translation', content: delta.content };
    }
  }

  console.log('[TranslationAgent] ✅ 翻译流式输出完成:');
  console.log(`  - thinking chunks: ${thinkingChunks}, 总长度: ${totalThinkingLength} 字`);
  console.log(`  - translation chunks: ${translationChunks}, 总长度: ${totalTranslationLength} 字`);
}
