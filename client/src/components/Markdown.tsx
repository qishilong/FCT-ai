/**
 * ==========================================================
 * Markdown — Markdown 渲染组件
 * ==========================================================
 *
 * 使用 react-markdown + remark-gfm 插件渲染 Markdown 内容。
 * remark-gfm 支持 GitHub Flavored Markdown（表格、删除线、Task List 等）。
 *
 * 通过 Tailwind CSS 的 prose 类应用排版样式，
 * 确保标题、段落、列表等元素有统一美观的间距和字体。
 */
'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function Markdown({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-strong:text-gray-900 prose-li:text-gray-700 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
