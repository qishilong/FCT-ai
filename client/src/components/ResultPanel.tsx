/**
 * ==========================================================
 * ResultPanel — 翻译结果展示面板
 * ==========================================================
 *
 * 根据 StreamState 的不同阶段展示对应内容：
 *
 * 1. idle: 空状态占位图
 * 2. analyzing: 脉冲动画 + "正在分析..."
 * 3. translating:
 *    - Agent 流水线指示器
 *    - 意图识别 Badge（角色/场景/关键点）
 *    - 翻译思考过程 (ThinkingBlock)
 *    - 翻译结果 (Markdown)
 * 4. supplementing:
 *    - 补充思考过程 (ThinkingBlock)
 *    - 补充建议 (Markdown)
 * 5. done: 显示"翻译完成"标识
 * 6. error: 显示错误提示
 */
'use client';

import { StreamState, ROLE_MAP, SCENE_LABELS } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { ThinkingBlock } from './ThinkingBlock';
import { Markdown } from './Markdown';
import { AgentPipeline } from './AgentPipeline';

/** ResultPanel 组件 Props */
interface ResultPanelProps {
  state: StreamState;
}

export function ResultPanel({ state }: ResultPanelProps) {
  const { status, intent, thinking, translation, supplementThinking, supplement, error } = state;

  if (status === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-16 px-6">
        <div className="text-5xl mb-4">🌐</div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">翻译结果将在这里展示</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          在左侧输入内容并选择翻译方向，AI 将帮你把专业表述翻译成对方能理解的语言
        </p>
      </div>
    );
  }

  const isTranslationComplete = status === 'supplementing' || status === 'done' || status === 'error';
  const isSupplementComplete = status === 'done' || status === 'error';

  // 思考完成判定：当对应正文内容开始到达时，说明思考已结束
  const isTranslationThinkingComplete = translation.length > 0 || isTranslationComplete;
  const isSupplementThinkingComplete = supplement.length > 0 || isSupplementComplete;

  return (
    <div className="space-y-4">
      {/* Agent 流水线指示器 */}
      <AgentPipeline status={status} />

      {/* 意图识别标签 */}
      {intent && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className={`${ROLE_MAP[intent.sourceRole]?.bgColor} ${ROLE_MAP[intent.sourceRole]?.color} border ${ROLE_MAP[intent.sourceRole]?.borderColor}`}>
            {ROLE_MAP[intent.sourceRole]?.icon} {ROLE_MAP[intent.sourceRole]?.label}
          </Badge>
          <Badge variant="outline" className="text-gray-600">
            {SCENE_LABELS[intent.sceneType]}
          </Badge>
          {intent.keyPoints.slice(0, 3).map((point, i) => (
            <Badge key={i} variant="outline" className="text-xs text-gray-500 font-normal">
              {point}
            </Badge>
          ))}
        </div>
      )}

      {/* 分析中占位 */}
      {status === 'analyzing' && (
        <div className="flex items-center gap-3 py-8 justify-center">
          <div className="flex gap-1">
            <span className="h-2 w-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="h-2 w-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="h-2 w-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-sm text-muted-foreground">正在分析内容，识别角色与场景...</span>
        </div>
      )}

      {/* 翻译Agent思考过程 */}
      {thinking && (
        <ThinkingBlock
          content={thinking}
          isComplete={isTranslationThinkingComplete}
          label="翻译Agent · 思考过程"
        />
      )}

      {/* 翻译结果 */}
      {translation && (
        <div className="rounded-xl border border-blue-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">📝</span>
            <h3 className="font-semibold text-gray-800 text-sm">翻译结果</h3>
            {!isTranslationComplete && (
              <span className="flex gap-0.5 ml-1">
                <span className="h-1 w-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="h-1 w-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="h-1 w-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            )}
          </div>
          <Markdown content={translation} />
        </div>
      )}

      {/* 补充Agent思考过程 */}
      {supplementThinking && (
        <ThinkingBlock
          content={supplementThinking}
          isComplete={isSupplementThinkingComplete}
          label="补充Agent · 思考过程"
        />
      )}

      {/* 补充建议 */}
      {supplement && (
        <div className="rounded-xl border border-amber-100 bg-amber-50/30 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base">💡</span>
            <h3 className="font-semibold text-gray-800 text-sm">补充建议</h3>
            {!isSupplementComplete && (
              <span className="flex gap-0.5 ml-1">
                <span className="h-1 w-1 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="h-1 w-1 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="h-1 w-1 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            )}
          </div>
          <Markdown content={supplement} />
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2">
            <span>❌</span>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* 完成标识 */}
      {status === 'done' && (
        <div className="text-center py-2">
          <span className="text-xs text-muted-foreground">✅ 翻译完成</span>
        </div>
      )}
    </div>
  );
}
