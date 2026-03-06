/**
 * ==========================================================
 * FCT-AI 前端类型定义
 * ==========================================================
 *
 * 前端专用的类型定义，包含：
 * - 与 server 端镜像的基础类型（Role, SceneType, IntentResult, TranslateRequest）
 * - 前端专有的 UI 配置类型（RoleConfig 含 icon/color 等 UI 属性）
 * - 流式响应状态管理类型（StreamState）
 *
 * 注意：Role, SceneType 等基础类型与 server/src/types/index.ts 保持同步，
 * 修改时需要两端同步更新。
 */

/**
 * 系统支持的 4 种职能角色
 * 与 server 端 Role 类型镜像
 */
export type Role = 'product_manager' | 'developer' | 'operations' | 'management';

/**
 * 4 种沟通场景类型
 * 与 server 端 SceneType 类型镜像
 */
export type SceneType =
  | 'requirement_discussion'
  | 'technical_solution'
  | 'operations_strategy'
  | 'management_decision';

/**
 * 角色 UI 配置
 *
 * 扩展了 server 端的基础类型，增加了前端展示所需的属性：
 * - icon: emoji 图标
 * - color: Tailwind 文字颜色类
 * - bgColor: Tailwind 背景颜色类
 * - borderColor: Tailwind 边框颜色类
 * - description: 角色关注维度的简要描述
 */
export interface RoleConfig {
  id: Role;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}

/**
 * 4 种角色的完整 UI 配置
 * 用于 RoleSelector 组件渲染角色卡片
 */

export const ROLES: RoleConfig[] = [
  {
    id: 'product_manager',
    label: '产品经理',
    icon: '📋',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description: '用户价值 · 商业目标 · 功能设计'
  },
  {
    id: 'developer',
    label: '开发工程师',
    icon: '💻',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    description: '技术实现 · 性能指标 · 工作量'
  },
  {
    id: 'operations',
    label: '运营',
    icon: '📊',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    description: '用户增长 · 数据指标 · 转化率'
  },
  {
    id: 'management',
    label: '管理层',
    icon: '👔',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    description: 'ROI · 资源分配 · 战略对齐'
  }
];

/** 角色 ID → RoleConfig 的快速查找 Map */
export const ROLE_MAP = Object.fromEntries(ROLES.map(r => [r.id, r])) as Record<Role, RoleConfig>;

/**
 * 场景类型 → 中文标签映射
 * 用于 ResultPanel 中显示场景标签
 */
export const SCENE_LABELS: Record<SceneType, string> = {
  requirement_discussion: '需求讨论',
  technical_solution: '技术方案',
  operations_strategy: '运营策略',
  management_decision: '管理决策'
};

/**
 * Agent1 意图识别结果
 * 与 server 端 IntentResult 镜像
 *
 * 前端根据 confidence 值执行三级降级：
 * - >= 0.8: 自动确认，不显示确认 Banner
 * - 0.4 ~ 0.8: 显示 RoleConfirmBanner（推荐 top-2 候选）
 * - < 0.4: 显示 RoleConfirmBanner（手动选择所有角色）
 */
export interface IntentResult {
  sourceRole: Role;
  confidence: number;
  candidates: { role: Role; confidence: number }[];
  sceneType: SceneType;
  keyPoints: string[];
}

/**
 * 流式响应状态
 *
 * useStreamResponse hook 维护的核心状态对象。
 * 随着 SSE 事件到达，各字段被逐步填充：
 *
 * 状态流转：
 * idle → analyzing → translating → supplementing → done
 *                                                 → error (任意阶段可能)
 *
 * - idle: 初始/空闲状态
 * - analyzing: Agent1 正在识别意图
 * - translating: Agent2 正在翻译（同时填充 thinking 和 translation）
 * - supplementing: Agent3 正在补充（同时填充 supplementThinking 和 supplement）
 * - done: Agent 链执行完成
 * - error: 执行过程中发生错误
 */
export interface StreamState {
  status: 'idle' | 'analyzing' | 'translating' | 'supplementing' | 'done' | 'error';
  intent: IntentResult | null;
  thinking: string;
  translation: string;
  supplementThinking: string;
  supplement: string;
  error: string;
}

/**
 * 翻译请求
 * 发送给 POST /api/translate 的请求体
 */
export interface TranslateRequest {
  content: string;
  sourceRole?: Role;
  targetRole: Role;
  /** 是否开启思考模式，开启后会展示模型的推理过程 */
  thinkingMode?: boolean;
}
