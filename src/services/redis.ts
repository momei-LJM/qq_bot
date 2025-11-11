import { logger } from "@/utils/logger";
import { MemoryStorage } from "./memory-storage";

let storageClient: MemoryStorage | null = null;

export const getRedisClient = (): MemoryStorage => {
  if (!storageClient) {
    storageClient = new MemoryStorage();
    logger.success("✅ 内存存储初始化成功");
  }

  return storageClient;
};

export const closeRedis = async () => {
  if (storageClient) {
    await storageClient.quit();
    storageClient = null;
    logger.info("内存存储已关闭");
  }
};
