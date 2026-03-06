/**
 * ==========================================================
 * TranslationForm — 翻译输入表单组件
 * ==========================================================
 *
 * 功能：
 * 1. 文本输入区（Textarea）— 最大 5000 字，带字数计数器
 * 2. Ctrl+Enter / Cmd+Enter 快捷键提交
 * 3. 4 个预设示例按钮（分别对应 4 种角色视角）
 * 4. 加载状态禁用 + Spinner 动画
 * 5. 取消按钮（在加载中时显示）
 *
 * 示例内容设计：
 * - 产品视角: 智能推荐功能需求
 * - 开发视角: 数据库查询优化成果
 * - 运营视角: 拉新活动数据分析
 * - 管理层视角: 会员体系改造 ROI
 */
'use client';

import { useState, useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

/** TranslationForm 组件 Props */
interface TranslationFormProps {
  onSubmit: (content: string) => void;
  disabled?: boolean;
  onCancel?: () => void;
  thinkingMode: boolean;
  onThinkingModeChange: (value: boolean) => void;
}

/**
 * 4 个预设示例
 * 每个对应一种角色的典型表述，便于用户快速体验
 */
const EXAMPLES = [
  {
    label: '产品视角示例',
    icon: '📋',
    text: '我们需要一个智能推荐功能，根据用户的浏览历史和偏好，在首页展示个性化内容，提升用户停留时长和转化率。',
  },
  {
    label: '开发视角示例',
    icon: '💻',
    text: '我们优化了数据库查询，通过增加索引和优化SQL语句，将核心接口的QPS从1000提升到了1300，P99延迟从200ms降到了80ms。',
  },
  {
    label: '运营视角示例',
    icon: '📊',
    text: '上周的拉新活动带来了5万新注册用户，但7日留存只有12%，远低于自然流量的25%。我们需要优化新用户激活流程。',
  },
  {
    label: '管理层视角示例',
    icon: '👔',
    text: 'Q2投入了8人月做会员体系改造，现在已经上线2个月了。我需要看到这个项目的ROI数据和对营收的实际贡献。',
  },
];

export function TranslationForm({ onSubmit, disabled, onCancel, thinkingMode, onThinkingModeChange }: TranslationFormProps) {
  const [content, setContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    if (!content.trim() || disabled) return;
    onSubmit(content.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入需要翻译的内容...&#10;&#10;例如：我们需要一个智能推荐功能，提升用户停留时长"
          className="min-h-35 resize-none text-base leading-relaxed rounded-xl border-gray-200 focus:border-blue-300 focus:ring-blue-200 pr-4"
          maxLength={5000}
          disabled={disabled}
        />
        <span className="absolute bottom-2 right-3 text-xs text-muted-foreground">
          {content.length}/5000
        </span>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* 思考模式开关 */}
          <div className="flex items-center gap-2">
            <Switch
              id="thinking-mode"
              checked={thinkingMode}
              onCheckedChange={onThinkingModeChange}
              disabled={disabled}
            />
            <label
              htmlFor="thinking-mode"
              className="text-sm text-gray-600 cursor-pointer select-none flex items-center gap-1"
            >
              <span>🧠</span>
              <span>思考模式</span>
            </label>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {thinkingMode ? '展示推理过程' : '仅展示结果'}
            </span>
          </div>
          {disabled && onCancel && (
            <Button variant="outline" size="sm" onClick={onCancel} className="rounded-lg">
              ⏹ 取消
            </Button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'} + Enter 发送
          </span>
          <Button
            onClick={handleSubmit}
            disabled={!content.trim() || disabled}
            className="rounded-xl px-6 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-200/50 transition-all duration-200"
          >
            {disabled ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                翻译中...
              </>
            ) : (
              '开始翻译'
            )}
          </Button>
        </div>
      </div>

      {/* 快捷示例 */}
      {!disabled && !content && (
        <div className="pt-2">
          <p className="text-xs text-muted-foreground mb-2">💡 试试这些示例：</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {EXAMPLES.map((example, i) => (
              <button
                key={i}
                onClick={() => setContent(example.text)}
                className="text-left p-2.5 rounded-lg border border-gray-100 bg-gray-50/50 hover:bg-gray-100 hover:border-gray-200 transition-colors text-xs leading-relaxed group"
              >
                <span className="font-medium text-gray-700 group-hover:text-gray-900">
                  {example.icon} {example.label}
                </span>
                <p className="text-muted-foreground mt-1 line-clamp-2">{example.text}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
