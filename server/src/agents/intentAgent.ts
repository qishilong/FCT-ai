/**
 * ==========================================================
 * Agent 1 — 意图识别 Agent
 * ==========================================================
 *
 * 职责：分析用户输入的职场沟通内容，识别：
 * 1. 发言者角色 (sourceRole) — 产品经理/开发/运营/管理层
 * 2. 沟通场景 (sceneType) — 需求讨论/技术方案/运营策略/管理决策
 * 3. 核心要点 (keyPoints) — 传递给 Agent2 辅助翻译
 * 4. 置信度 (confidence) — 驱动三级降级机制
 *
 * 调用方式：非流式（需要完整 JSON 响应）
 * 温度：0.2（低温度确保分类稳定性）
 * 容错策略：JSON 解析失败时返回低置信度默认值，触发手动选择
 */
import { chatCompletion } from '../services/doubaoClient.js';
import { buildIntentPrompt } from '../prompts/intentPrompt.js';
import { IntentResult, Role, SceneType } from '../types/index.js';

/**
 * 运行意图识别 Agent
 *
 * @param content - 用户输入的原始内容
 * @returns IntentResult — 包含角色、置信度、场景、关键点的结构化结果
 *
 * 执行流程：
 * 1. 构建意图识别 Prompt
 * 2. 非流式调用 Doubao API (temperature=0.2)
 * 3. 从响应中提取 JSON（兼容 markdown 代码块包裹）
 * 4. 验证各字段有效性，必要时修正
 * 5. 解析失败时返回低置信度默认结果
 */
export async function runIntentAgent(content: string): Promise<IntentResult> {
  console.log('[IntentAgent] ====== Agent1 意图识别开始 ======');
  console.log(
    `[IntentAgent] 输入内容预览: "${content.slice(0, 100)}${content.length > 100 ? '...' : ''}"`
  );
  console.log(`[IntentAgent] 输入长度: ${content.length} 字`);

  // Step 1: 构建 Prompt
  const prompt = buildIntentPrompt(content);
  console.log(`[IntentAgent] Prompt 构建完成，总长度: ${prompt.length} 字`);

  // Step 2: 调用 Doubao API（非流式，低温度）
  const startTime = Date.now();
  const response = await chatCompletion(
    [{ role: 'user', content: prompt }],
    0.2 // 低温度确保输出稳定
  );
  const elapsed = Date.now() - startTime;

  console.log(`[IntentAgent] API 响应完成 (${elapsed}ms)`);
  console.log(
    `[IntentAgent] 原始响应: ${response.slice(0, 200)}${response.length > 200 ? '...' : ''}`
  );

  try {
    // Step 3: 提取 JSON 块（兼容 markdown ```json ... ``` 包裹格式）
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, response];
    const jsonStr = (jsonMatch[1] || response).trim();
    console.log(`[IntentAgent] 提取的 JSON 字符串: ${jsonStr.slice(0, 150)}...`);

    const result = JSON.parse(jsonStr) as IntentResult;

    // Step 4: 字段有效性验证 — 确保角色和场景值在预定义范围内
    const validRoles: Role[] = ['product_manager', 'developer', 'operations', 'management'];
    const validScenes: SceneType[] = [
      'requirement_discussion',
      'technical_solution',
      'operations_strategy',
      'management_decision'
    ];

    // 验证 sourceRole
    if (!validRoles.includes(result.sourceRole)) {
      console.warn(
        `[IntentAgent] ⚠️ 无效的 sourceRole: "${result.sourceRole}"，回退为 product_manager`
      );
      result.sourceRole = 'product_manager';
      result.confidence = 0.3; // 降低置信度，触发用户确认
    }

    // 验证 sceneType
    if (!validScenes.includes(result.sceneType)) {
      console.warn(
        `[IntentAgent] ⚠️ 无效的 sceneType: "${result.sceneType}"，回退为 requirement_discussion`
      );
      result.sceneType = 'requirement_discussion';
    }

    // 验证 candidates 数组
    if (!Array.isArray(result.candidates) || result.candidates.length === 0) {
      console.warn('[IntentAgent] ⚠️ candidates 为空，使用 sourceRole 构建默认 candidates');
      result.candidates = [{ role: result.sourceRole, confidence: result.confidence }];
    }

    // 验证 keyPoints 数组
    if (!Array.isArray(result.keyPoints)) {
      console.warn('[IntentAgent] ⚠️ keyPoints 不是数组，设为空数组');
      result.keyPoints = [];
    }

    console.log('[IntentAgent] ✅ 意图识别成功:');
    console.log(`  - sourceRole: ${result.sourceRole}`);
    console.log(`  - confidence: ${result.confidence}`);
    console.log(`  - sceneType: ${result.sceneType}`);
    console.log(`  - candidates: ${JSON.stringify(result.candidates)}`);
    console.log(`  - keyPoints: ${JSON.stringify(result.keyPoints)}`);

    // 三级降级决策日志
    if (result.confidence >= 0.8) {
      console.log('[IntentAgent] 🟢 置信度 >= 0.8 → 自动确认角色');
    } else if (result.confidence >= 0.4) {
      console.log('[IntentAgent] 🟡 0.4 <= 置信度 < 0.8 → 展示 top-2 候选待确认');
    } else {
      console.log('[IntentAgent] 🔴 置信度 < 0.4 → 需要用户手动选择角色');
    }

    return result;
  } catch (parseError) {
    // Step 5: JSON 解析失败 → 返回低置信度默认结果，触发三级降级中的"手动选择"
    console.error('[IntentAgent] ❌ JSON 解析失败:', parseError);
    console.error(`[IntentAgent] 失败的原始响应: ${response}`);

    const fallbackResult: IntentResult = {
      sourceRole: 'product_manager',
      confidence: 0.1, // 极低置信度 → 触发手动选择
      candidates: [
        { role: 'product_manager', confidence: 0.25 },
        { role: 'developer', confidence: 0.25 }
      ],
      sceneType: 'requirement_discussion',
      keyPoints: []
    };

    console.log('[IntentAgent] 🔴 使用 fallback 默认结果:', JSON.stringify(fallbackResult));
    return fallbackResult;
  }
}
