# QQ Bot 群聊统计功能

这是一个具备群聊统计和定时任务功能的 QQ 机器人项目。

## 功能特性

✨ **核心功能**

- 💬 群聊消息存储（基于 Redis）
- 📊 每日群聊统计
- 📈 每周数据报表
- 🤖 AI 智能总结（使用 DeepSeek）
- ⏰ 自动定时任务

## 技术栈

- **运行时**: Node.js + TypeScript
- **QQ SDK**: qq-official-bot
- **AI**: DeepSeek API
- **数据存储**: Redis (ioredis)
- **定时任务**: node-cron

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

复制 `.env.example` 到 `.env`，并填写你的配置：

```bash
cp .env.example .env
```

配置项说明：

- `APP_ID`: QQ 机器人应用 ID
- `APP_SECRET`: QQ 机器人应用密钥
- `DEEPSEEK_API_KEY`: DeepSeek API 密钥
- `REDIS_HOST`: Redis 服务器地址
- `REDIS_PORT`: Redis 端口
- `TRACK_GROUP_IDS`: 需要统计的群组 ID（逗号分隔）

### 3. 启动 Redis

确保 Redis 服务已启动：

```bash
# macOS (使用 Homebrew)
brew services start redis

# 或使用 Docker
docker run -d -p 6379:6379 redis:alpine
```

### 4. 运行机器人

```bash
# 开发模式
pnpm dev

# 生产模式
pnpm build
pnpm start
```

## 功能说明

### 自动定时任务

- **每日总结**: 每天 21:00 自动发送群聊日报
- **每周统计**: 每周一 09:00 自动发送周报

### 手动命令

在群聊中发送以下命令：

- `/日报` 或 `/summary` - 立即生成今日群聊总结
- `/统计` 或 `/stats` - 查看今日群聊统计数据

### 数据存储

- 群聊消息保存 7 天
- 统计数据保存 30 天
- 使用 Redis Sorted Set 存储，支持时间范围查询

## 项目结构

```
src/
├── core/
│   ├── ai.ts              # AI 调用逻辑
│   ├── bootstrap.ts       # 机器人启动和初始化
│   └── systems.ts         # 系统配置
├── services/
│   ├── redis.ts           # Redis 连接管理
│   ├── message-storage.ts # 消息存储服务
│   └── analytics.ts       # 数据分析服务
├── jobs/
│   ├── daily-summary.ts   # 每日总结定时任务
│   └── weekly-stats.ts    # 每周统计定时任务
└── index.ts               # 入口文件
```

## 开发指南

### 添加新的统计维度

在 `services/analytics.ts` 中添加新的分析方法。

### 自定义定时任务

修改 `jobs/` 目录下的文件，调整 cron 表达式：

```typescript
// 每天 21:00
cron.schedule("0 0 21 * * *", callback);

// 每周一 09:00
cron.schedule("0 0 9 * * 1", callback);
```

### 扩展命令

在 `bootstrap.ts` 中添加新的消息监听器。

## License

ISC
