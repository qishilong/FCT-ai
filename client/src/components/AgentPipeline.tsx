/**
 * ==========================================================
 * AgentPipeline — 3 步流水线进度指示器
 * ==========================================================
 *
 * 可视化展示 Agent 链的执行进度：
 * 🔍 意图识别 → 🔄 智能翻译 → 💡 补充建议
 *
 * 每个步骤有 3 种状态：
 * - pending: 灰色，尚未开始
 * - active: 蓝色 + 脉冲动画，正在执行
 * - completed: 绿色 + 勾号，已完成
 *
 * 步骤之间用连接线表示流程方向，线色跟随进度变化。
 */
'use client';

import { StreamState } from '@/lib/types';

interface AgentPipelineProps {
  status: StreamState['status'];
}

/** 3 个 Agent 步骤的配置 */
const STEPS = [
  { id: 'analyzing', label: '意图识别', icon: '🔍', description: '分析角色与场景' },
  { id: 'translating', label: '智能翻译', icon: '🔄', description: '跨角色翻译' },
  { id: 'supplementing', label: '补充建议', icon: '💡', description: '查漏补缺' },
];

/**
 * 根据当前 status 和步骤 ID，判断步骤的视觉状态
 *
 * 逻辑：根据步骤在 order 数组中的索引与当前 status 的索引比较
 * - done/error: 所有步骤显示 completed
 * - stepIdx < currentIdx: 已完成
 * - stepIdx === currentIdx: 正在执行
 * - stepIdx > currentIdx: 等待中
 */
function getStepState(stepId: string, status: StreamState['status']) {
  const order = ['analyzing', 'translating', 'supplementing'];
  const currentIdx = order.indexOf(status);
  const stepIdx = order.indexOf(stepId);

  if (status === 'done' || status === 'error') return 'completed';
  if (stepIdx < currentIdx) return 'completed';
  if (stepIdx === currentIdx) return 'active';
  return 'pending';
}

export function AgentPipeline({ status }: AgentPipelineProps) {
  if (status === 'idle') return null;

  return (
    <div className="flex items-center justify-center gap-1 py-3">
      {STEPS.map((step, index) => {
        const state = getStepState(step.id, status);
        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`flex items-center justify-center w-9 h-9 rounded-full transition-all duration-500 ${state === 'active'
                  ? 'bg-blue-100 ring-2 ring-blue-400 ring-offset-2 scale-110'
                  : state === 'completed'
                    ? 'bg-emerald-100'
                    : 'bg-gray-100'
                  }`}
              >
                {state === 'completed' ? (
                  <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : state === 'active' ? (
                  <span className="text-base animate-pulse">{step.icon}</span>
                ) : (
                  <span className="text-base opacity-40">{step.icon}</span>
                )}
              </div>
              <span
                className={`text-xs mt-1 font-medium transition-colors ${state === 'active' ? 'text-blue-700' : state === 'completed' ? 'text-emerald-700' : 'text-gray-400'
                  }`}
              >
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={`w-12 h-0.5 mx-2 mb-5 rounded transition-colors duration-500 ${getStepState(STEPS[index + 1].id, status) !== 'pending'
                  ? 'bg-emerald-300'
                  : state === 'active'
                    ? 'bg-blue-200'
                    : 'bg-gray-200'
                  }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
