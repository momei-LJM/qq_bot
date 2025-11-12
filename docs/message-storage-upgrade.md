# 消息存储服务升级说明

## 功能概述

消息存储服务（`MessageStorageService`）已经升级，现在支持：

1. **数据持久化**：每次缓存消息时，自动同步保存到 `src/data/redisData.json` 文件
2. **数据恢复**：应用启动时自动从 JSON 文件加载历史数据到内存
3. **自动清理**：定期清理超过一个月的旧数据，保持存储效率

## 主要改动

### 1. 数据结构

JSON 文件使用以下结构：

```json
{
  "messages": {
    "群组ID": [
      {
        "message_id": "消息ID",
        "group_id": "群组ID",
        "user_id": "用户ID",
        "user_name": "用户名",
        "raw_message": "消息内容",
        "timestamp": 1699776000000
      }
    ]
  },
  "stats": {
    "群组ID:日期": {
      "用户ID": 消息数量
    }
  },
  "lastCleanup": 1699776000000
}
```

### 2. 新增方法

- `initialize()`: 初始化服务，从 JSON 文件加载数据
- `forceCleanup()`: 手动触发数据清理和持久化
- `getServiceInfo()`: 获取服务状态信息

### 3. 修改的方法

- `saveMessage()`: 添加了初始化检查和自动持久化
- `incrementUserMessageCount()`: 添加了初始化检查和自动持久化
- 所有查询方法都添加了初始化检查

### 4. 数据清理策略

- **触发时机**: 每天最多清理一次
- **清理范围**: 删除超过 30 天的数据
- **自动触发**: 在保存消息或统计数据时检查
- **手动触发**: 调用 `forceCleanup()` 方法

## 使用方法

### 初始化

```typescript
import { MessageStorageService } from "./services/message-storage.js";
import { MemoryStorage } from "./services/memory-storage.js";

const memoryStorage = new MemoryStorage();
const messageStorage = new MessageStorageService(memoryStorage);

// 必须调用 initialize() 来加载持久化数据
await messageStorage.initialize();
```

### 自动持久化

服务现在会在以下时机自动保存数据到文件：

- 保存新消息时
- 更新统计数据时
- 手动清理时

### 应用关闭时保存

在 `bootstrap.ts` 中已添加优雅关闭处理：

```typescript
process.on("SIGINT", async () => {
  await messageStorage.forceCleanup();
  process.exit(0);
});
```

## 测试

运行测试脚本验证功能：

```bash
npx tsx src/test-storage.ts
```

## 注意事项

1. **初始化顺序**: 必须在使用任何功能前调用 `initialize()`
2. **文件权限**: 确保应用有读写 `src/data/` 目录的权限
3. **性能影响**: 每次保存都会写入文件，对于高频消息的群组可能影响性能
4. **备份建议**: 建议定期备份 `redisData.json` 文件

## 错误处理

- 如果 JSON 文件损坏，服务会创建新的空文件
- 如果目录不存在，会自动创建
- 所有文件操作都有错误处理，不会导致应用崩溃
