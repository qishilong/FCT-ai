/**
 * ==========================================================
 * Agent 编排器 — 串联三个 Agent 的协作链
 * ==========================================================
 *
 * 这是系统的核心编排逻辑，负责：
 * 1. 按序执行 Agent1 → Agent2 → Agent3
 * 2. 在 Agent 之间传递数据（如 keyPoints, fullTranslation）
 * 3. 通过 SSE 向前端实时推送各阶段结果
 * 4. 统一错误处理和连接清理
 *
 * 执行流程（Pipeline）：
 * ┌─────────┐   intentResult   ┌─────────┐   fullTranslation   ┌─────────┐
 * │ Agent1  │ ──────────────> │ Agent2  │ ──────────────────> │ Agent3  │
 * │ 意图识别 │                 │  翻译   │                     │  补充   │
 * └─────────┘                 └─────────┘                     └─────────┘
 *      ↓                          ↓                               ↓
 *  SSE:intent              SSE:thinking              SSE:supplement_thinking
 *                          SSE:translation            SSE:supplement
 *                                                         ↓
 *                                                     SSE:done
 */
import { Response } from 'express';
import { runIntentAgent } from './intentAgent.js';
import { runTranslationAgent } from './translationAgent.js';
import { runSupplementAgent } from './supplementAgent.js';
import { Role, IntentResult, SSEEventType } from '../types/index.js';

/**
 * SSE 事件发送辅助函数
 *
 * 格式遵循 SSE 协议：
 * event: <type>\n
 * data: <JSON>\n\n
 *
 * @param res - Express Response 对象
 * @param type - 事件类型（intent/thinking/translation/supplement/done/error）
 * @param data - 事件数据，会被 JSON.stringify
 */
function sendSSE(res: Response, type: SSEEventType, data: any) {
  const payload = JSON.stringify(data);
  console.log(`[AgentChain] SSE 发送: event=${type}, data长度=${payload.length}`);
  res.write(`event: ${type}\ndata: ${payload}\n\n`);
}

/**
 * 运行完整的 Agent 链
 *
 * @param res - Express Response 对象（已设置 SSE 响应头）
 * @param content - 用户输入的原始内容
 * @param sourceRole - 用户指定的源角色（undefined 表示自动识别）
 * @param targetRole - 目标受众角色
 */
export async function runAgentChain(
  res: Response,
  content: string,
  sourceRole: Role | undefined,
  targetRole: Role,
  thinkingMode: boolean = true
) {
  console.log('[AgentChain] ====== Agent 链开始执行 ======');
  console.log(`[AgentChain] 参数:`);
  console.log(`  - content 长度: ${content.length} 字`);
  console.log(`  - sourceRole: ${sourceRole || '自动识别'}`);
  console.log(`  - targetRole: ${targetRole}`);
  console.log(`  - thinkingMode: ${thinkingMode}`);

  const chainStartTime = Date.now();

  try {
    // ========== Phase 1: 意图识别（Agent1） ==========
    console.log('[AgentChain] ▶ Phase 1: 意图识别');
    const phase1Start = Date.now();

    let intentResult: IntentResult;
    let finalSourceRole: Role;

    if (sourceRole) {
      // 用户手动指定了源角色 → 跳过 Agent1 API 调用，直接构造结果
      console.log(`[AgentChain] 用户已指定源角色: ${sourceRole}，跳过意图识别 API 调用`);
      finalSourceRole = sourceRole;
      intentResult = {
        sourceRole,
        confidence: 1.0,
        candidates: [{ role: sourceRole, confidence: 1.0 }],
        sceneType: 'requirement_discussion',
        keyPoints: []
      };
    } else {
      // 未指定源角色 → 完全依赖 Agent1 的识别结果
      console.log('[AgentChain] 未指定源角色，完全依赖 Agent1 自动识别');
      intentResult = await runIntentAgent(content);
      finalSourceRole = intentResult.sourceRole;
    }

    console.log(`[AgentChain] Phase 1 完成 (${Date.now() - phase1Start}ms)`);
    console.log(`[AgentChain] 最终源角色: ${finalSourceRole}, 置信度: ${intentResult.confidence}`);

    // 推送意图识别结果给前端
    sendSSE(res, 'intent', intentResult);

    // 三级降级说明：
    // - 前端收到 intent 事件后会根据 confidence 判断是否显示确认 UI
    // - 但不阻断翻译流程（continue with best guess）
    // - 用户可以在 UI 上修改角色选择（不影响当前翻译流）
    if (!sourceRole && intentResult.confidence < 0.8) {
      console.log(`[AgentChain] ⚡ 置信度 ${intentResult.confidence} < 0.8，前端将展示确认提示`);
      finalSourceRole = intentResult.sourceRole;
    }

    // ========== Phase 2: 翻译（Agent2） ==========
    console.log('[AgentChain] ▶ Phase 2: 翻译');
    const phase2Start = Date.now();

    // fullTranslation 累积完整翻译文本，传递给 Agent3 进行审查
    let fullTranslation = '';

    const translationStream = runTranslationAgent(
      content,
      finalSourceRole,
      targetRole,
      intentResult.keyPoints,
      thinkingMode
    );

    // 逐 chunk 转发给前端，同时累积完整翻译结果
    for await (const chunk of translationStream) {
      // thinkingMode 关闭时跳过思考过程事件
      if (!thinkingMode && chunk.type === 'thinking') continue;
      sendSSE(res, chunk.type, chunk.content);
      if (chunk.type === 'translation') {
        fullTranslation += chunk.content; // 累积翻译文本供 Agent3 使用
      }
    }

    console.log(`[AgentChain] Phase 2 完成 (${Date.now() - phase2Start}ms)`);
    console.log(`[AgentChain] 翻译总长度: ${fullTranslation.length} 字`);

    // ========== Phase 3: 补充审查（Agent3） ==========
    console.log('[AgentChain] ▶ Phase 3: 补充审查');
    const phase3Start = Date.now();

    const supplementStream = runSupplementAgent(
      content,
      fullTranslation,
      finalSourceRole,
      targetRole,
      thinkingMode
    );

    // 逐 chunk 转发给前端
    for await (const chunk of supplementStream) {
      // thinkingMode 关闭时跳过思考过程事件
      if (!thinkingMode && chunk.type === 'supplement_thinking') continue;
      sendSSE(res, chunk.type, chunk.content);
    }

    console.log(`[AgentChain] Phase 3 完成 (${Date.now() - phase3Start}ms)`);

    // ========== 完成 ==========
    const totalElapsed = Date.now() - chainStartTime;
    console.log(`[AgentChain] ====== Agent 链执行完成 (总耗时: ${totalElapsed}ms) ======`);
    sendSSE(res, 'done', { success: true });
  } catch (error: any) {
    // 统一错误处理：记录日志并推送错误事件给前端
    const totalElapsed = Date.now() - chainStartTime;
    console.error(`[AgentChain] ❌ Agent 链执行失败 (已运行 ${totalElapsed}ms):`);
    console.error(`[AgentChain] 错误类型: ${error?.constructor?.name}`);
    console.error(`[AgentChain] 错误消息: ${error?.message}`);
    console.error(`[AgentChain] 错误堆栈:`, error?.stack);

    sendSSE(res, 'error', {
      message: error?.message || '翻译过程中发生错误，请稍后重试'
    });
  } finally {
    // 确保 SSE 连接被正确关闭
    console.log('[AgentChain] 关闭 SSE 连接');
    res.end();
  }
}
