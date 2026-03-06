/**
 * ==========================================================
 * 补充 Agent 提示词 (Agent3 专用)
 * ==========================================================
 *
 * 设计思路：
 * 1. 审查翻译结果是否完整覆盖了目标角色关注的维度
 * 2. 对比原始内容，检测翻译中是否有信息遗漏或理解偏差
 * 3. 预判目标角色收到翻译后通常会追问的问题，主动给出建议
 * 4. 提供"你可能还需要关注"的建议列表，帮助双方沟通更高效
 *
 * Prompt 工程要点：
 * - 同时输入原始内容和翻译结果，让模型进行对比分析
 * - 注入目标角色的典型追问模式，提升补充建议的针对性
 * - 注入目标角色的关注维度列表作为检查 checklist
 * - 较低温度 (0.5) 保持输出质量稳定
 */
import { Role, ROLE_LABELS, ROLE_FOCUS } from '../types/index.js';

/**
 * 目标角色的典型追问模式 — 预判对方收到翻译后最可能问的问题
 *
 * 这帮助 Agent3 输出的补充建议真正回答目标角色的关切，
 * 而不是泛泛而谈。
 */
const TARGET_TYPICAL_QUESTIONS: Record<Role, string> = {
  product_manager: `产品经理收到翻译后通常会追问：
- 这个方案对用户体验有没有负面影响？会不会增加用户操作成本？
- 有没有更轻量的方案能先验证核心假设？MVP可以先做什么？
- 这和我们正在做的其他功能有没有冲突或依赖关系？
- 用户验收标准是什么？怎么定义"做完了"和"做好了"？`,

  developer: `开发工程师收到翻译后通常会追问：
- 具体的技术指标要求是什么？（QPS/延迟/可用性SLA）
- 有没有现有接口或模块可以复用？需要新建还是改造？
- 需要兼容哪些客户端版本和历史数据？向前/向后兼容要求？
- 异常情况和边界 case 怎么处理？需要什么降级和兜底方案？`,

  operations: `运营收到翻译后通常会追问：
- 预计影响多少用户？建议在哪些城市/渠道/用户群先灰度？
- 上线时间能不能配合近期的运营活动或营销节点？
- 需要提前准备什么运营物料、用户引导或客服话术？
- 核心看哪几个数据指标？多久能看到效果？效果不达预期怎么办？`,

  management: `管理层收到翻译后通常会追问：
- 不做的话会怎样？机会成本和竞争风险是什么？
- 有没有更省资源的替代方案？能不能分阶段投入？
- 最坏情况下的损失是多少？有没有止损方案和退出机制？
- 谁来负责？OKR怎么定？怎么衡量阶段性成果？`
};

/**
 * 构建补充审查 Prompt
 *
 * @param originalContent - 用户的原始输入内容
 * @param translatedContent - Agent2 输出的翻译结果（累积完整文本）
 * @param sourceRole - 发言者角色
 * @param targetRole - 目标受众角色
 * @returns 完整的补充审查 Prompt
 *
 * 输出结构（Markdown 格式）：
 * - 📋 信息完整性检查
 * - 💡 补充建议（2-4 条）
 * - ⚠️ 潜在风险提醒（1-2 条，可选）
 */
export function buildSupplementPrompt(
  originalContent: string,
  translatedContent: string,
  sourceRole: Role,
  targetRole: Role
): string {
  const sourceLabel = ROLE_LABELS[sourceRole];
  const targetLabel = ROLE_LABELS[targetRole];
  const targetFocus = ROLE_FOCUS[targetRole];
  const typicalQuestions = TARGET_TYPICAL_QUESTIONS[targetRole];

  return `你是一位跨职能沟通顾问，在产品、技术、运营和管理领域都有深厚经验。你擅长站在不同角色的立场发现沟通中的信息缺口和潜在误解。

## 你的任务

审查从**${sourceLabel}**到**${targetLabel}**的翻译结果，找出不足之处并补充建议。

## ${targetLabel}通常关注的维度
${targetFocus.map(f => `- ${f}`).join('\n')}

## ${targetLabel}的典型追问模式
${typicalQuestions}

## 原始内容（${sourceLabel}的表述）

${originalContent}

## 翻译结果

${translatedContent}

## 请完成以下分析

### 📋 信息完整性检查
对照${targetLabel}关注的维度逐项检查翻译结果。如果有维度未被覆盖或信息不够具体，明确指出缺了什么。

### 💡 补充建议
预判${targetLabel}读完翻译后最可能追问的 2-4 个问题，并直接给出建议答案或需要确认的事项。以"建议补充..."或"建议确认..."开头。

### ⚠️ 潜在风险提醒
如果存在${sourceLabel}和${targetLabel}之间容易产生的理解偏差、遗漏的关键约束、或需要特别对齐的事项，在这里指出（1-2条，没有则省略此节）。

请使用 Markdown 格式输出，保持简洁务实。`;
}
