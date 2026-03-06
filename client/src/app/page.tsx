/**
 * ==========================================================
 * FCT-AI 主页面
 * ==========================================================
 *
 * 页面布局：
 * ┌──────────────────────────────────────────────┐
 * │                  Header                       │
 * ├─────────────────────┬────────────────────────┤
 * │                     │                        │
 * │   左栏：输入区       │   右栏：输出区          │
 * │   - 源角色选择       │   - 角色确认横幅        │
 * │   - 目标角色选择     │   - Agent 流水线        │
 * │   - 文本输入         │   - 翻译结果            │
 * │   - 提交按钮         │   - 补充建议            │
 * │                     │                        │
 * ├─────────────────────┴────────────────────────┤
 * │                  Footer                       │
 * └──────────────────────────────────────────────┘
 *
 * 状态管理：
 * - sourceRole: 源角色（'auto' 表示自动识别）
 * - targetRole: 目标角色
 * - state: StreamState（来自 useStreamResponse hook）
 *
 * 角色冲突处理：
 * 当用户选择的源角色和目标角色相同时，自动切换目标角色
 */
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { RoleSelector, RoleConfirmBanner } from '@/components/RoleSelector';
import { TranslationForm } from '@/components/TranslationForm';
import { ResultPanel } from '@/components/ResultPanel';
import { useStreamResponse } from '@/hooks/useStreamResponse';
import { Role, ROLE_MAP } from '@/lib/types';

export default function Home() {
  // ---------- 状态管理 ----------
  /** 源角色，'auto' 表示由 Agent1 自动识别 */
  const [sourceRole, setSourceRole] = useState<Role | 'auto'>('auto');
  /** 目标角色，默认为开发工程师 */
  const [targetRole, setTargetRole] = useState<Role>('developer');
  /** 思考模式开关 */
  const [thinkingMode, setThinkingMode] = useState(true);
  /** 流式响应状态 + 操作方法 */
  const { state, translate, cancel, reset } = useStreamResponse();

  /** 是否有正在运行的 Agent 链 */
  const isRunning = ['analyzing', 'translating', 'supplementing'].includes(state.status);

  /**
   * 提交翻译请求
   * sourceRole 为 'auto' 时不传 sourceRole，让后端自动识别
   */
  const handleSubmit = (content: string) => {
    console.log('[Page] 提交翻译:', { sourceRole, targetRole, contentLength: content.length });
    translate({
      content,
      sourceRole: sourceRole === 'auto' ? undefined : sourceRole,
      targetRole,
      thinkingMode,
    });
  };

  /** 开始新翻译 — 重置所有状态 */
  const handleNewTranslation = () => {
    console.log('[Page] 开始新翻译');
    reset();
  };

  /**
   * 角色冲突处理：
   * 如果用户手动选择了源角色，且与目标角色相同，自动切换目标角色
   * 例如：源=developer, 目标=developer → 目标自动切换为 product_manager
   */
  const effectiveTargetRole = sourceRole !== 'auto' && sourceRole === targetRole
    ? (sourceRole === 'developer' ? 'product_manager' : 'developer')
    : targetRole;

  return (
    <main className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* 头部 */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-linear-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200/50">
                <span className="text-white text-lg">🔄</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">FCT-AI</h1>
                <p className="text-xs text-muted-foreground">职能沟通翻译助手</p>
              </div>
            </div>
            {state.status !== 'idle' && (
              <button
                onClick={handleNewTranslation}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                新翻译
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 主体双栏 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[calc(100vh-120px)]">
          {/* 左栏 — 输入区 */}
          <div className="space-y-4">
            <Card className="shadow-sm border-gray-200/80 rounded-2xl overflow-hidden">
              <CardHeader className="pb-3 bg-linear-to-r from-gray-50 to-white">
                <CardTitle className="text-base flex items-center gap-2">
                  <span>✏️</span> 输入
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* 源角色选择器（带"自动识别"选项） */}
                <RoleSelector
                  label="发言者角色（谁在说？）"
                  value={sourceRole}
                  onChange={(r) => {
                    console.log('[Page] 源角色变更:', r);
                    setSourceRole(r);
                    // 防止角色冲突：如果选了非 auto 且与目标相同，自动切换目标
                    if (r !== 'auto' && r === targetRole) {
                      const others = (['product_manager', 'developer', 'operations', 'management'] as Role[]).filter(x => x !== r);
                      setTargetRole(others[0]);
                    }
                  }}
                  showAuto
                  disabled={isRunning}
                />

                <Separator />

                {/* 目标角色选择器（排除已选的源角色） */}
                <RoleSelector
                  label="翻译给谁看？"
                  value={effectiveTargetRole}
                  onChange={(r) => {
                    console.log('[Page] 目标角色变更:', r);
                    r !== 'auto' && setTargetRole(r);
                  }}
                  disabled={isRunning}
                  excludeRole={sourceRole !== 'auto' ? sourceRole : undefined}
                />

                <Separator />

                {/* 文本输入区 + 提交按钮 */}
                <TranslationForm
                  onSubmit={handleSubmit}
                  disabled={isRunning}
                  onCancel={cancel}
                  thinkingMode={thinkingMode}
                  onThinkingModeChange={setThinkingMode}
                />
              </CardContent>
            </Card>
          </div>

          {/* 右栏 — 输出区 */}
          <div>
            <Card className="shadow-sm border-gray-200/80 rounded-2xl overflow-hidden h-full">
              <CardHeader className="pb-3 bg-linear-to-r from-gray-50 to-white">
                <CardTitle className="text-base flex items-center gap-2 justify-between">
                  <div className="flex items-center gap-2">
                    <span>📑</span> 翻译结果
                    {state.intent && state.status !== 'idle' && (
                      <span className="text-xs font-normal text-muted-foreground">
                        → {ROLE_MAP[effectiveTargetRole]?.icon} {ROLE_MAP[effectiveTargetRole]?.label}
                      </span>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/*
                  角色确认横幅（三级降级 UI）
                  仅在源角色为“自动识别”且置信度 < 0.8 时显示
                */}
                {state.intent && sourceRole === 'auto' && state.intent.confidence < 0.8 && (
                  <div className="mb-4">
                    <RoleConfirmBanner
                      candidates={state.intent.candidates}
                      confidence={state.intent.confidence}
                      onConfirm={(role) => setSourceRole(role)}
                      onManualSelect={() => { }}
                    />
                  </div>
                )}

                <ResultPanel state={state} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* 底部 */}
      <footer className="border-t bg-white/60 backdrop-blur-sm mt-8">
        <div className="max-w-7xl mx-auto px-4 py-3 text-center text-xs text-muted-foreground">
          FCT-AI · 基于多 Agent 协作链 · Doubao-Seed-2.0-pro
        </div>
      </footer>
    </main>
  );
}
