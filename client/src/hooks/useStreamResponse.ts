/**
 * ==========================================================
 * useStreamResponse — 流式响应状态管理 Hook
 * ==========================================================
 *
 * 核心职责：
 * 1. 管理 StreamState 状态（status, intent, thinking, translation 等）
 * 2. 封装 startTranslation API 调用
 * 3. 提供 translate / cancel / reset 操作方法
 * 4. 通过 SSE handler 回调逐步更新状态
 *
 * 状态流转：
 * idle → analyzing（调用 translate）
 * analyzing → translating（收到 intent 事件）
 * translating → supplementing（收到 supplement_thinking/supplement 事件）
 * supplementing → done（收到 done 事件）
 * 任意状态 → error（收到 error 事件）
 *
 * AbortController 生命周期：
 * - translate() 时创建新的 controller
 * - cancel() / reset() 时调用 controller.abort()
 * - done/error 回调时清除 controller 引用
 */
'use client';

import { useCallback, useRef, useState } from 'react';
import { startTranslation } from '@/lib/api';
import { StreamState, TranslateRequest, IntentResult } from '@/lib/types';

/** 初始状态 — 所有字段清空 */
const initialState: StreamState = {
  status: 'idle',
  intent: null,
  thinking: '',
  translation: '',
  supplementThinking: '',
  supplement: '',
  error: ''
};

export function useStreamResponse() {
  const [state, setState] = useState<StreamState>(initialState);
  /** AbortController 引用，用于取消正在进行的请求 */
  const controllerRef = useRef<AbortController | null>(null);

  /**
   * 重置状态 — 回到初始空闲状态
   * 如果有正在进行的请求，会先取消
   */
  const reset = useCallback(() => {
    console.log('[useStreamResponse] reset() 调用，重置为初始状态');
    controllerRef.current?.abort();
    controllerRef.current = null;
    setState(initialState);
  }, []);

  /**
   * 发起翻译请求
   *
   * @param request - 翻译请求参数
   *
   * 执行流程：
   * 1. 取消之前可能存在的请求
   * 2. 状态设为 analyzing
   * 3. 调用 startTranslation，注册各事件 handler
   * 4. 保存 AbortController 引用
   */
  const translate = useCallback((request: TranslateRequest) => {
    console.log('[useStreamResponse] translate() 调用:', {
      contentLength: request.content.length,
      sourceRole: request.sourceRole || '自动识别',
      targetRole: request.targetRole
    });

    // 取消之前的请求（如果有）
    controllerRef.current?.abort();
    // 重置状态为 analyzing
    setState({ ...initialState, status: 'analyzing' });

    const controller = startTranslation(request, {
      // Agent1 意图识别完成 → 状态切换为 translating
      onIntent: (data: IntentResult) => {
        console.log('[useStreamResponse] 收到 intent 事件:', {
          sourceRole: data.sourceRole,
          confidence: data.confidence,
          sceneType: data.sceneType
        });
        setState(prev => ({
          ...prev,
          status: 'translating',
          intent: data
        }));
      },

      // Agent2 思考过程 → 追加到 thinking 字段
      onThinking: (content: string) => {
        setState(prev => ({
          ...prev,
          status: 'translating',
          thinking: prev.thinking + content
        }));
      },

      // Agent2 翻译内容 → 追加到 translation 字段
      onTranslation: (content: string) => {
        setState(prev => ({
          ...prev,
          status: 'translating',
          translation: prev.translation + content
        }));
      },

      // Agent3 思考过程 → 状态切换为 supplementing，追加到 supplementThinking
      onSupplementThinking: (content: string) => {
        setState(prev => ({
          ...prev,
          status: 'supplementing',
          supplementThinking: prev.supplementThinking + content
        }));
      },

      // Agent3 补充内容 → 追加到 supplement 字段
      onSupplement: (content: string) => {
        setState(prev => ({
          ...prev,
          status: 'supplementing',
          supplement: prev.supplement + content
        }));
      },

      // Agent 链全部完成
      onDone: () => {
        console.log('[useStreamResponse] Agent 链完成 → status: done');
        setState(prev => ({ ...prev, status: 'done' }));
        controllerRef.current = null; // 释放 controller 引用
      },

      // 错误处理
      onError: (error: string) => {
        console.error('[useStreamResponse] 收到错误:', error);
        setState(prev => ({ ...prev, status: 'error', error }));
        controllerRef.current = null; // 释放 controller 引用
      }
    });

    controllerRef.current = controller;
  }, []);

  /**
   * 取消当前翻译
   *
   * 行为：
   * - 如果已有翻译内容 → 保留结果，状态设为 done
   * - 如果还没有翻译结果 → 状态回到 idle
   */
  const cancel = useCallback(() => {
    console.log('[useStreamResponse] cancel() 调用');
    controllerRef.current?.abort();
    controllerRef.current = null;
    setState(prev => {
      const newStatus = prev.translation ? 'done' : 'idle';
      console.log(
        `[useStreamResponse] cancel → status: ${newStatus} (translation length: ${prev.translation.length})`
      );
      return { ...prev, status: newStatus };
    });
  }, []);

  return { state, translate, cancel, reset };
}
