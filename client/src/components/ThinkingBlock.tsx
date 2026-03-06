/**
 * ==========================================================
 * ThinkingBlock — 可折叠的思考过程面板
 * ==========================================================
 *
 * 展示 AI 模型的思考过程（reasoning_content），特性：
 * 1. 流式追加内容，实时展示思考过程
 * 2. 自动滚动到最新内容
 * 3. 思考完成后自动折叠（800ms 延迟）
 * 4. 未完成时显示弹跳动画 (bounce)
 * 5. 完成后显示字数统计
 * 6. 支持手动展开/折叠
 *
 * 用于两处：
 * - 翻译 Agent 的思考过程（label="翻译Agent · 思考过程"）
 * - 补充 Agent 的思考过程（label="补充Agent · 思考过程"）
 */
'use client';

import { useState, useEffect, useRef } from 'react';

interface ThinkingBlockProps {
  content: string;
  isComplete: boolean;
  label?: string;
}

export function ThinkingBlock({ content, isComplete, label = '思考过程' }: ThinkingBlockProps) {
  const [collapsed, setCollapsed] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const autoCollapsedRef = useRef(false);

  // 思考完成后自动折叠
  useEffect(() => {
    if (isComplete && !autoCollapsedRef.current && content.length > 0) {
      const timer = setTimeout(() => {
        setCollapsed(true);
        autoCollapsedRef.current = true;
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isComplete, content.length]);

  // 自动滚动到底部
  useEffect(() => {
    if (!collapsed && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [content, collapsed]);

  if (!content) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-linear-to-b from-gray-50 to-gray-50/50 overflow-hidden transition-all duration-300">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-between w-full px-4 py-2.5 text-left hover:bg-gray-100/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">💭</span>
          <span className="text-xs font-medium text-gray-500">{label}</span>
          {!isComplete && (
            <span className="flex gap-0.5">
              <span className="h-1 w-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="h-1 w-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="h-1 w-1 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          )}
          {isComplete && (
            <span className="text-xs text-gray-400">
              ({content.length} 字)
            </span>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`transition-all duration-300 ease-in-out ${collapsed ? 'max-h-0 opacity-0' : 'max-h-75 opacity-100'
          }`}
      >
        <div
          ref={contentRef}
          className="px-4 pb-3 max-h-70 overflow-y-auto"
        >
          <p className="text-sm text-gray-500 italic leading-relaxed whitespace-pre-wrap">
            {content}
          </p>
        </div>
      </div>
    </div>
  );
}
