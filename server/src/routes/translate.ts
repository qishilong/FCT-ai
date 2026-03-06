/**
 * ==========================================================
 * 翻译 API 路由 — POST /api/translate
 * ==========================================================
 *
 * 这是前端调用的唯一 API 入口点。
 *
 * 请求格式：
 * POST /api/translate
 * Content-Type: application/json
 * Body: { content: string, targetRole: Role, sourceRole?: Role }
 *
 * 响应格式：
 * Content-Type: text/event-stream (SSE)
 * 通过 SSE 事件流实时推送 Agent 链的各阶段结果
 *
 * 参数校验：
 * - content: 必填，字符串，非空，最大 5000 字
 * - targetRole: 必填，必须是 4 种有效角色之一
 * - sourceRole: 选填，如提供则必须是有效角色
 */
import { Router, Request, Response } from 'express';
import { runAgentChain } from '../agents/agentChain.js';
import { Role, TranslateRequest } from '../types/index.js';

const router = Router();

/** 有效角色白名单 */
const VALID_ROLES: Role[] = ['product_manager', 'developer', 'operations', 'management'];

router.post('/translate', async (req: Request, res: Response) => {
  const { content, sourceRole, targetRole, thinkingMode } = req.body as TranslateRequest;

  console.log('[TranslateRoute] ====== 收到翻译请求 ======');
  console.log(`[TranslateRoute] 请求参数:`);
  console.log(`  - content 长度: ${content?.length || 0} 字`);
  console.log(
    `  - content 预览: "${(content || '').slice(0, 80)}${(content || '').length > 80 ? '...' : ''}"`
  );
  console.log(`  - sourceRole: ${sourceRole || '未指定（自动识别）'}`);
  console.log(`  - targetRole: ${targetRole}`);
  console.log(`  - thinkingMode: ${thinkingMode ?? true}`);

  // ---------- 参数校验 ----------

  // 校验 content：必填、字符串、非空
  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    console.warn('[TranslateRoute] ❌ 参数校验失败: content 为空');
    res.status(400).json({ error: '请输入翻译内容' });
    return;
  }

  // 校验 content 长度上限
  if (content.length > 5000) {
    console.warn(`[TranslateRoute] ❌ 参数校验失败: content 超长 (${content.length} > 5000)`);
    res.status(400).json({ error: '内容长度不能超过5000字' });
    return;
  }

  // 校验 targetRole：必填且在白名单中
  if (!targetRole || !VALID_ROLES.includes(targetRole)) {
    console.warn(`[TranslateRoute] ❌ 参数校验失败: 无效的 targetRole "${targetRole}"`);
    res.status(400).json({ error: '请选择有效的目标角色' });
    return;
  }

  // 校验 sourceRole（选填）：如提供则需在白名单中
  if (sourceRole && !VALID_ROLES.includes(sourceRole)) {
    console.warn(`[TranslateRoute] ❌ 参数校验失败: 无效的 sourceRole "${sourceRole}"`);
    res.status(400).json({ error: '无效的源角色' });
    return;
  }

  console.log('[TranslateRoute] ✅ 参数校验通过');

  // ---------- 设置 SSE 响应头 ----------
  res.setHeader('Content-Type', 'text/event-stream'); // SSE 标准 MIME 类型
  res.setHeader('Cache-Control', 'no-cache'); // 禁止缓存流式响应
  res.setHeader('Connection', 'keep-alive'); // 保持长连接
  res.setHeader('X-Accel-Buffering', 'no'); // 禁用 nginx 缓冲（生产环境需要）
  res.flushHeaders(); // 立即发送响应头，建立 SSE 连接

  console.log('[TranslateRoute] SSE 连接已建立，响应头已发送');

  // 监听客户端断开（如用户关闭页面或取消请求）
  // 注意：不在此处调用 res.end()，由 agentChain 的 finally 块统一关闭连接
  req.on('close', () => {
    console.log('[TranslateRoute] 客户端连接断开');
  });

  // ---------- 运行 Agent 链 ----------
  console.log('[TranslateRoute] 启动 Agent 链...');
  await runAgentChain(res, content.trim(), sourceRole, targetRole, thinkingMode ?? true);
  console.log('[TranslateRoute] Agent 链执行结束');
});

export default router;
