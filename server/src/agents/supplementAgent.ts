/**
 * ==========================================================
 * Agent 3 — 补充 Agent
 * ==========================================================
 *
 * 职责：审查 Agent2 的翻译结果，补充缺失信息和建议
 *
 * 调用方式：流式（AsyncGenerator），逐 token 推送给前端
 * 温度：0.5（稍低温度，保持审查建议的质量和准确性）
 *
 * 输入：
 * - 原始内容（用户输入）
 * - 翻译结果（Agent2 的完整输出，在 agentChain 中累积）
 * - 源/目标角色
 *
 * 输出两种类型的 chunk：
 * - supplement_thinking: 模型的思考过程（reasoning_content）
 * - supplement: 正式的补充建议内容（delta.content）
 */
import { chatCompletionStream } from '../services/doubaoClient.js';
import { buildSupplementPrompt } from '../prompts/supplementPrompt.js';
import { Role } from '../types/index.js';

/**
 * 运行补充 Agent（流式）
 *
 * @param originalContent - 用户的原始输入
 * @param translatedContent - Agent2 的完整翻译文本
 * @param sourceRole - 发言者角色
 * @param targetRole - 目标受众角色
 * @yields {{ type: 'supplement_thinking' | 'supplement', content: string }} 逐 chunk 输出
 */
export async function* runSupplementAgent(
  originalContent: string,
  translatedContent: string,
  sourceRole: Role,
  targetRole: Role,
  thinkingMode: boolean = true
): AsyncGenerator<{ type: 'supplement_thinking' | 'supplement'; content: string }> {
  console.log('[SupplementAgent] ====== Agent3 补充审查开始 ======');
  console.log(`[SupplementAgent] 源角色: ${sourceRole} → 目标角色: ${targetRole}`);
  console.log(`[SupplementAgent] 原始内容长度: ${originalContent.length} 字`);
  console.log(`[SupplementAgent] 翻译结果长度: ${translatedContent.length} 字`);
  console.log(`[SupplementAgent] thinkingMode: ${thinkingMode}`);

  // 构建补充审查 Prompt
  const prompt = buildSupplementPrompt(originalContent, translatedContent, sourceRole, targetRole);
  console.log(`[SupplementAgent] Prompt 构建完成，总长度: ${prompt.length} 字`);

  // 发起流式调用，传入 thinkingMode 控制模型是否开启深度思考
  const stream = await chatCompletionStream([{ role: 'user', content: prompt }], 0.5, {
    thinkingMode
  });

  // 统计 chunk 数量
  let thinkingChunks = 0;
  let supplementChunks = 0;
  let totalThinkingLength = 0;
  let totalSupplementLength = 0;

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta;
    if (!delta) continue;

    // Doubao-Seed-2.0-pro 的思考内容（非标准字段）
    // 仅在 thinkingMode 开启时 yield 思考内容
    const reasoningContent = (delta as any).reasoning_content;
    if (reasoningContent && thinkingMode) {
      thinkingChunks++;
      totalThinkingLength += reasoningContent.length;
      yield { type: 'supplement_thinking', content: reasoningContent };
    }

    // 正式的补充建议内容
    if (delta.content) {
      supplementChunks++;
      totalSupplementLength += delta.content.length;
      yield { type: 'supplement', content: delta.content };
    }
  }

  console.log('[SupplementAgent] ✅ 补充审查流式输出完成:');
  console.log(`  - thinking chunks: ${thinkingChunks}, 总长度: ${totalThinkingLength} 字`);
  console.log(`  - supplement chunks: ${supplementChunks}, 总长度: ${totalSupplementLength} 字`);
}
