/**
 * ==========================================================
 * FCT-AI Express 服务器入口
 * ==========================================================
 *
 * 启动一个 Express HTTP 服务器，提供：
 * - POST /api/translate — 翻译 API（SSE 流式响应）
 * - GET /api/health — 健康检查
 *
 * CORS 配置仅允许前端开发服务器 (localhost:3000) 访问。
 * 默认端口 3001，可通过 PORT 环境变量覆盖。
 */
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import translateRouter from './routes/translate.js';

// 从根目录 .env 文件加载环境变量
// 尝试多个可能的路径，兼容不同的启动方式
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });

console.log(`[Server] CWD: ${process.cwd()}`);
console.log(
  `[Server] .env 已加载，ARK_API_KEY=${process.env.ARK_API_KEY ? '✅ 已配置' : '❌ 未配置'}`
);

const app = express();
const PORT = process.env.PORT || 3001;

// ---------- 中间件配置 ----------

// CORS 跨域配置 — 仅允许前端开发服务器访问
app.use(
  cors({
    origin: ['http://localhost:3000'],
    credentials: true
  })
);
console.log('[Server] CORS 已配置，允许来源: http://localhost:3000');

// JSON 请求体解析
app.use(express.json());

// ---------- 路由注册 ----------

// 翻译 API 路由（包含 POST /api/translate）
app.use('/api', translateRouter);
console.log('[Server] 已注册路由: /api/translate (POST)');

// 健康检查端点 — 用于监控和部署验证
app.get('/api/health', (_req, res) => {
  console.log('[Server] 健康检查请求');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
console.log('[Server] 已注册路由: /api/health (GET)');

// ---------- 启动服务器 ----------
app.listen(PORT, () => {
  console.log('');
  console.log('='.repeat(50));
  console.log('🚀 FCT-AI Server 已启动');
  console.log('='.repeat(50));
  console.log(`📍 地址: http://localhost:${PORT}`);
  console.log(`📡 API:  http://localhost:${PORT}/api/translate`);
  console.log(`💚 Health: http://localhost:${PORT}/api/health`);
  console.log(`🔧 环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🤖 模型: ${process.env.ARK_MODEL || 'doubao-seed-2.0-pro'}`);
  console.log('='.repeat(50));
  console.log('');
});
