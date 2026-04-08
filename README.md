# FeedFlow

<div align="center">

一个简洁的自托管 RSS 阅读器，支持 YAML 配置管理和代理设置。

![FeedFlow](https://img.shields.io/badge/RSS-Reader-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)

[功能特性](#功能特性) • [快速开始](#快速开始) • [配置说明](#配置说明) • [API文档](#api文档)

</div>

## 功能特性

- 🚀 **一键启动** - 前后端一体化，一个命令启动所有服务
- 📝 **YAML 配置** - 简洁的配置文件管理订阅源
- 🌐 **代理支持** - 支持全局代理和单独订阅源代理配置
- 📄 **分页加载** - 文章列表支持下拉加载更多
- 💾 **数据持久化** - 订阅源数据本地存储，重启不丢失
- 🎨 **现代界面** - 简洁美观的暗色主题
- 🔧 **灵活部署** - 支持开发模式和生产模式

## 快速开始

### 安装

```bash
# 克隆仓库
git clone https://github.com/yourusername/feedflow.git
cd feedflow

# 安装依赖
npm install
cd backend && npm install && cd ..
```

### 启动

**开发模式（推荐）**：
```bash
npm run start:all
```

这将同时启动：
- 前端开发服务器：http://localhost:5173
- 后端 API 服务：http://localhost:3001

**生产模式**：
```bash
# 构建
npm run build
npm run build:backend

# 启动
NODE_ENV=production npm start
```

访问 http://localhost:3001 即可使用。

## 配置说明

配置文件位于 `backend/config/feeds.yaml`。

### 示例配置

```yaml
# 全局代理配置（可选）
proxy:
  enabled: false
  type: socks5  # 支持: http, https, socks4, socks5
  host: 127.0.0.1
  port: 1080
  # username: your_username
  # password: your_password

# 抓取间隔（秒）
fetch_interval: 300

# 订阅源列表
feeds:
  - url: https://sspai.com/feed
    title: 少数派
    description: 少数派致力于更好地运用数字产品或科学方法
    tags:
      - tech
      - productivity

  - url: https://www.phoronix.com/rss.php
    title: Phoronix
    description: Linux Hardware News
    # 为单个源配置代理（覆盖全局配置）
    proxy:
      enabled: false
      # type: http
      # host: 127.0.0.1
      # port: 7890
```

### 代理类型

支持以下代理类型：
- `http` - HTTP 代理
- `https` - HTTPS 代理
- `socks4` - SOCKS4 代理
- `socks5` - SOCKS5 代理

### 环境变量

也可以通过环境变量设置全局代理：

```bash
# backend/.env
HTTP_PROXY=http://127.0.0.1:7890
HTTPS_PROXY=http://127.0.0.1:7890
ALL_PROXY=socks5://127.0.0.1:1080
```

## API文档

### 获取订阅源列表
```bash
GET /api/feed/list
```

### 获取RSS内容
```bash
GET /api/feed/fetch?url=https://example.com/feed.xml
```

### 添加订阅源
```bash
POST /api/feed/add
Content-Type: application/json

{
  "url": "https://example.com/feed.xml",
  "title": "Example Feed",
  "description": "An example RSS feed",
  "proxy": {
    "enabled": false
  }
}
```

### 更新订阅源
```bash
PUT /api/feed/update
Content-Type: application/json

{
  "url": "https://example.com/feed.xml",
  "title": "Updated Title"
}
```

### 删除订阅源
```bash
DELETE /api/feed/remove
Content-Type: application/json

{
  "url": "https://example.com/feed.xml"
}
```

### 获取代理状态
```bash
GET /api/feed/proxy-status
```

## 技术栈

**前端**：
- React 18 + TypeScript
- Vite
- Zustand（状态管理）

**后端**：
- Node.js + Express
- TypeScript
- YAML 配置
- 代理支持（https-proxy-agent + socks-proxy-agent）

## 项目结构

```
feedflow/
├── src/                    # 前端源码
│   ├── components/         # React 组件
│   ├── lib/               # 工具函数
│   └── store/             # 状态管理
├── backend/               # 后端源码
│   ├── src/
│   │   ├── routes/        # API 路由
│   │   ├── services/      # 业务逻辑
│   │   │   ├── config.ts    # YAML 配置管理
│   │   │   ├── storage.ts   # 数据存储
│   │   │   └── feedFetcher.ts # RSS 获取
│   │   └── server.ts      # 服务器入口
│   ├── config/            # 配置文件目录
│   │   └── feeds.example.yaml
│   └── data/              # 数据存储（自动生成）
├── dist/                  # 构建输出
└── package.json
```

## 开发

```bash
# 安装依赖
npm install

# 开发模式（前后端同时启动）
npm run start:all

# 仅启动前端
npm run dev

# 仅启动后端
npm run start:dev

# 构建
npm run build              # 构建前端
npm run build:backend      # 构建后端
```

## 常见问题

### 如何修改端口？

编辑 `backend/src/server.ts` 中的 `PORT` 变量。

### 如何部署到生产环境？

1. 构建前后端
2. 设置 `NODE_ENV=production`
3. 运行 `npm start`

### 如何备份订阅源？

订阅源存储在 `backend/config/feeds.yaml`，直接复制该文件即可备份。

## License

[MIT](LICENSE)

## 贡献

欢迎提交 Issue 和 Pull Request！

---

**FeedFlow** - 简洁的自托管 RSS 阅读器
