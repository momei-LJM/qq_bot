import { logger } from "@/utils/logger";
import Redis from "ioredis";

let redisClient: Redis | null = null;

export const getRedisClient = (): Redis => {
  if (!redisClient) {
    redisClient = new Redis({
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: Number(process.env.REDIS_DB) || 0,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });

    redisClient.on("connect", () => {
      logger.success("✅ Redis 连接成功");
    });

    redisClient.on("error", (err) => {
      logger.error("❌ Redis 连接错误:", err);
    });
  }

  return redisClient;
};

export const closeRedis = async () => {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info("Redis 连接已关闭");
  }
};
