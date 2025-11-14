# QQ Bot

QQ 官方机器人项目，基于 TypeScript 开发，集成 OpenAI API 提供智能对话功能。

## 功能特性

- 🤖 支持群聊 @ 消息、私聊消息、群聊消息事件
- 💬 集成 OpenAI API（支持豆包等兼容接口）
- 📝 消息存储与记忆管理
- 🔄 WebSocket 连接模式
- 🛠️ TypeScript 开发，类型安全

## 环境要求

- Node.js
- pnpm 10.13.1+

## 安装

```bash
pnpm install
```

## 配置

创建 `.env` 文件并配置以下环境变量：

```env
# QQ 机器人配置
APP_ID=你的APP_ID
APP_SECRET=你的APP_SECRET
SANDBOX=false

# OpenAI API 配置
DOUBAO_API_KEY=你的API_KEY
BASE_URL=https://api.example.com/v1
```

## 运行

```bash
# 开发模式
pnpm dev

# 生产构建
pnpm build

# 启动
pnpm start
```

## 项目结构

```
src/
├── core/          # 核心模块
│   ├── ai.ts      # AI 对话
│   ├── bootstrap.ts
│   ├── config.ts  # 配置
│   ├── handlers.ts # 消息处理
│   └── systems.ts # 系统功能
├── services/      # 服务层
│   ├── memory-storage.ts
│   ├── message-storage.ts
│   └── redis.ts
└── utils/         # 工具函数
    └── logger.ts
```

## License

ISC
