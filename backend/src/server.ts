import express from 'express';
import cors from 'cors';
import { feedRouter } from './routes/feed.js';
import { createExampleConfig, migrateFromJsonIfNeeded } from './services/config.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// 初始化配置
async function initConfig() {
  await migrateFromJsonIfNeeded();
  await createExampleConfig();
}

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:8080'],
  credentials: true
}));
app.use(express.json());

// API Routes
app.use('/api/feed', feedRouter);

// 健康检查
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'rss-reader-backend' });
});

// 提供前端静态文件（开发环境用 Vite，生产环境用构建后的文件）
if (process.env.NODE_ENV !== 'production') {
  // 开发环境：提示使用 Vite 开发服务器
  app.get('/', (_req, res) => {
    res.send(`
      <h1>RSS Reader API</h1>
      <p>API 运行在 http://localhost:${PORT}</p>
      <p>前端开发服务器运行在 http://localhost:5173</p>
      <p>运行 <code>npm run start:all</code> 同时启动前后端</p>
    `);
  });
} else {
  // 生产环境：提供前端静态文件
  const frontendDist = path.join(__dirname, '../../dist');
  app.use(express.static(frontendDist));

  // SPA 路由支持
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// 启动服务器
initConfig().then(() => {
  app.listen(PORT, () => {
    console.log(`RSS Reader API running on http://localhost:${PORT}`);
    console.log(`- API: http://localhost:${PORT}/api/feed/`);
    console.log(`- Config: backend/config/feeds.yaml`);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`- 前端开发服务器: http://localhost:5173`);
      console.log(`\n提示: 运行 'npm run start:all' 同时启动前后端开发服务器`);
    }
  });
}).catch(error => {
  console.error('Failed to initialize config:', error);
});
