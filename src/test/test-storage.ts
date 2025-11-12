import { MessageStorageService } from "../services/message-storage.js";
import { MemoryStorage } from "../services/memory-storage.js";
import path from "path";
import { fileURLToPath } from "url";

/**
 * 测试脚本：验证消息存储服务的持久化功能
 */
async function testMessageStorage() {
  console.log("🧪 开始测试消息存储服务...");

  try {
    // 创建服务实例
    const memoryStorage = new MemoryStorage();
    const messageStorage = new MessageStorageService(
      memoryStorage,
      path.join(process.cwd(), "./data/redisData_test.json")
    );

    // 测试初始化
    console.log("1. 测试初始化...");
    await messageStorage.initialize();
    console.log("✅ 初始化成功");

    // 测试保存消息
    console.log("2. 测试保存消息...");
    const testMessage = {
      message_id: "test_001",
      group_id: "test_group_123",
      user_id: "test_user_456",
      user_name: "测试用户",
      raw_message: "这是一条测试消息",
      timestamp: Date.now(),
    };

    await messageStorage.saveMessage(testMessage);
    console.log("✅ 消息保存成功");

    // 测试统计功能
    console.log("3. 测试统计功能...");
    await messageStorage.incrementUserMessageCount(
      testMessage.group_id,
      testMessage.user_id
    );
    console.log("✅ 统计更新成功");

    // 测试查询功能
    console.log("4. 测试查询功能...");
    const recentMessages = await messageStorage.getRecentMessages(
      testMessage.group_id,
      10
    );
    const stats = await messageStorage.getUserMessageStats(
      testMessage.group_id
    );

    console.log(`📊 查询到 ${recentMessages.length} 条消息`);
    console.log(`📈 统计数据:`, stats);

    // 测试服务信息
    const serviceInfo = messageStorage.getServiceInfo();
    console.log("📍 服务信息:", serviceInfo);

    // 手动触发清理
    console.log("5. 测试清理功能...");
    await messageStorage.forceCleanup();
    console.log("✅ 清理完成");

    // 关闭
    await memoryStorage.quit();
    console.log("🎉 测试完成！");
  } catch (error) {
    console.error("❌ 测试失败:", error);
  }
}

// 如果直接运行这个脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  testMessageStorage();
}

export { testMessageStorage };
