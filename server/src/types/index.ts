/**
 * ==========================================================
 * FCT-AI 核心类型定义
 * ==========================================================
 *
 * 本文件定义了整个 FCT-AI 系统的核心类型，包括：
 * - 角色类型 (Role) 与场景类型 (SceneType)
 * - 角色元数据映射表（中文标签、关注维度）
 * - Agent 链中的数据结构（IntentResult, TranslateRequest）
 * - SSE 事件通信协议
 *
 * 这些类型在 server 端各 Agent 和 routes 中被广泛引用。
 * 前端 (client) 有一套镜像类型定义 (client/src/lib/types.ts)。
 */

/**
 * 系统支持的 4 种职能角色
 * - product_manager: 产品经理 — 关注用户价值和商业目标
 * - developer: 开发工程师 — 关注技术实现和性能指标
 * - operations: 运营 — 关注用户增长和数据指标
 * - management: 管理层 — 关注 ROI 和战略方向
 */
export type Role = 'product_manager' | 'developer' | 'operations' | 'management';

/**
 * 4 种沟通场景类型
 * Agent1 会识别输入内容属于哪种场景，用于翻译时的上下文理解
 * - requirement_discussion: 需求讨论
 * - technical_solution: 技术方案
 * - operations_strategy: 运营策略
 * - management_decision: 管理决策
 */
export type SceneType =
  | 'requirement_discussion'
  | 'technical_solution'
  | 'operations_strategy'
  | 'management_decision';

/**
 * 角色 → 中文标签映射
 * 用于 Prompt 构建和日志输出中的可读性展示
 */
export const ROLE_LABELS: Record<Role, string> = {
  product_manager: '产品经理',
  developer: '开发工程师',
  operations: '运营',
  management: '管理层'
};

/**
 * 角色 → 关注维度映射
 * 每个角色有 5 个核心关注维度，用于：
 * 1. 翻译 Prompt 中强调目标角色的关注点
 * 2. 补充 Agent 检查翻译是否覆盖了这些维度
 */
export const ROLE_FOCUS: Record<Role, string[]> = {
  product_manager: [
    '用户需求与痛点',
    '商业价值与指标',
    '功能定义与优先级',
    '用户体验与交互',
    '竞品分析与差异化'
  ],
  developer: [
    '技术方案与架构',
    '性能指标与约束',
    '开发工作量与排期',
    '系统稳定性与风险',
    '技术债与可维护性'
  ],
  operations: [
    '用户增长与获客',
    '数据指标与转化',
    '活动策划与执行',
    '渠道效率与ROI',
    '用户分层与生命周期'
  ],
  management: [
    '投资回报与ROI',
    '资源投入与产能',
    '项目里程碑与进度',
    '风险评估与管控',
    '战略匹配与竞争格局'
  ]
};

/**
 * 场景类型 → 中文标签映射
 * 用于前端展示和日志输出
 */
export const SCENE_LABELS: Record<SceneType, string> = {
  requirement_discussion: '需求讨论',
  technical_solution: '技术方案',
  operations_strategy: '运营策略',
  management_decision: '管理决策'
};

/**
 * Agent1（意图识别）的结构化输出
 *
 * 三级降级机制依赖 confidence 字段：
 * - confidence >= 0.8 → 自动确认，直接进入翻译
 * - 0.4 <= confidence < 0.8 → 展示 top-2 候选让用户确认
 * - confidence < 0.4 → 要求用户手动选择角色
 */
export interface IntentResult {
  /** 最可能的发言者角色 */
  sourceRole: Role;
  /** 置信度 (0-1)，用于三级降级决策 */
  confidence: number;
  /** top-2 候选角色及其置信度，按降序排列 */
  candidates: { role: Role; confidence: number }[];
  /** 识别到的沟通场景类型 */
  sceneType: SceneType;
  /** 从输入中提取的 2-5 个核心要点 */
  keyPoints: string[];
}

/**
 * 翻译请求体
 * 从前端 POST /api/translate 接收
 */
export interface TranslateRequest {
  /** 用户输入的原始内容（最大 5000 字） */
  content: string;
  /** 源角色 — 可选，不传则由 Agent1 自动识别 */
  sourceRole?: Role;
  /** 目标角色 — 必填，翻译给谁看 */
  targetRole: Role;
  /** 是否开启思考模式 — 开启后会展示模型的推理过程 */
  thinkingMode?: boolean;
}

/**
 * SSE (Server-Sent Events) 事件类型枚举
 *
 * Agent 链通过 SSE 向前端实时推送各阶段结果：
 * - intent: Agent1 意图识别完成，携带 IntentResult
 * - thinking: Agent2 翻译时的思考过程 (reasoning_content)
 * - translation: Agent2 翻译正文内容
 * - supplement_thinking: Agent3 补充时的思考过程
 * - supplement: Agent3 补充建议正文
 * - done: 整个 Agent 链执行完成
 * - error: 执行过程中发生错误
 */
export type SSEEventType =
  | 'intent'
  | 'thinking'
  | 'translation'
  | 'supplement'
  | 'supplement_thinking'
  | 'done'
  | 'error';

/**
 * SSE 事件数据结构
 * 序列化后通过 res.write() 发送给前端
 */
export interface SSEEvent {
  type: SSEEventType;
  data: string;
}
