import { MemoryStorage } from "@/services/memory-storage";
import { MessageStorageService } from "@/services/message-storage";
import { logger } from "@/utils/logger";
import { GroupMessageEvent } from "qq-official-bot";

// 优雅关闭处理
export const gracefulShutdown = async (
  messageStorage: MessageStorageService,
  redis: MemoryStorage
) => {
  logger.info("正在优雅关闭应用...");
  try {
    // 保存最终数据状态
    await messageStorage.forceCleanup();
    logger.info("数据已保存");

    // 关闭 Redis 连接
    await redis.quit();
    logger.info("Redis 连接已关闭");

    process.exit(0);
  } catch (error) {
    logger.error("关闭时出错:", error);
    process.exit(1);
  }
};

export const saveMsgImmidiately = (
  messageStorage: MessageStorageService,
  event: GroupMessageEvent
) => {
  return messageStorage.saveMessage({
    message_id: event.message_id,
    group_id: event.group_id,
    user_id: event.sender.user_id,
    user_name: event.sender.user_name,
    raw_message: event.raw_message,
    timestamp: Date.now(),
  });
};
