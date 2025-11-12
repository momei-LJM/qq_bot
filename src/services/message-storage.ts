import type { MemoryStorage } from "./memory-storage";
import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";

export interface GroupMessage {
  message_id: string;
  group_id: string;
  user_id: string;
  user_name: string;
  raw_message: string;
  timestamp: number;
}

interface PersistentData {
  messages: Record<string, GroupMessage[]>; // groupId -> messages
  stats: Record<string, Record<string, number>>; // groupId:date -> userId:count
  lastCleanup: number; // 最后清理时间戳
}

export class MessageStorageService {
  private redis: MemoryStorage;
  private readonly MESSAGE_KEY_PREFIX = "qq:group:messages:";
  private readonly STATS_KEY_PREFIX = "qq:group:stats:";
  private readonly MESSAGE_EXPIRY = 60 * 60 * 24 * 7; // 7天过期
  DATA_FILE_PATH: string;

  private readonly ONE_MONTH_MS = 30 * 24 * 60 * 60 * 1000; // 一个月的毫秒数
  private isInitialized = false;

  constructor(
    redis: MemoryStorage,
    storagePath: string = path.join(process.cwd(), "./data/redisData.json")
  ) {
    this.redis = redis;
    this.DATA_FILE_PATH = storagePath;
  }

  /**
   * 初始化服务，从 JSON 文件加载数据
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.ensureDataFileExists();
      const data = await this.loadDataFromFile();
      await this.loadDataToRedis(data);

      // 执行初始清理
      await this.cleanOldData();

      this.isInitialized = true;
      console.log("MessageStorageService initialized successfully");
    } catch (error) {
      console.error("Failed to initialize MessageStorageService:", error);
      throw error;
    }
  }

  /**
   * 确保数据文件存在
   */
  private async ensureDataFileExists(): Promise<void> {
    try {
      await fs.access(this.DATA_FILE_PATH);
    } catch {
      // 文件不存在，创建空的数据结构
      const emptyData: PersistentData = {
        messages: {},
        stats: {},
        lastCleanup: Date.now(),
      };
      await fs.mkdir(path.dirname(this.DATA_FILE_PATH), { recursive: true });
      await fs.writeFile(
        this.DATA_FILE_PATH,
        JSON.stringify(emptyData, null, 2),
        "utf8"
      );
    }
  }

  /**
   * 从文件加载数据
   */
  private async loadDataFromFile(): Promise<PersistentData> {
    try {
      const fileContent = await fs.readFile(this.DATA_FILE_PATH, "utf8");
      if (!fileContent.trim()) {
        return {
          messages: {},
          stats: {},
          lastCleanup: Date.now(),
        };
      }
      return JSON.parse(fileContent) as PersistentData;
    } catch (error) {
      console.error("Error loading data from file:", error);
      return {
        messages: {},
        stats: {},
        lastCleanup: Date.now(),
      };
    }
  }

  /**
   * 将数据加载到 Redis
   */
  private async loadDataToRedis(data: PersistentData): Promise<void> {
    const pipeline = this.redis.pipeline();

    // 加载消息数据
    for (const [groupId, messages] of Object.entries(data.messages)) {
      const key = this.createMessageKey(groupId);
      for (const message of messages) {
        pipeline.zadd(key, message.timestamp, JSON.stringify(message));
      }
      pipeline.expire(key, this.MESSAGE_EXPIRY);
    }

    // 加载统计数据
    for (const [groupDateKey, userStats] of Object.entries(data.stats)) {
      const statsKey = `${this.STATS_KEY_PREFIX}${groupDateKey}`;
      for (const [userId, count] of Object.entries(userStats)) {
        pipeline.hset(statsKey, userId, count.toString());
      }
      pipeline.expire(statsKey, 60 * 60 * 24 * 30);
    }

    await pipeline.exec();
  }

  /**
   * 将当前 Redis 数据持久化到文件
   */
  private async persistDataToFile(): Promise<void> {
    try {
      const data = await this.collectAllData();
      await fs.writeFile(
        this.DATA_FILE_PATH,
        JSON.stringify(data, null, 2),
        "utf8"
      );
    } catch (error) {
      console.error("Error persisting data to file:", error);
    }
  }

  /**
   * 收集所有数据从 Redis
   */
  private async collectAllData(): Promise<PersistentData> {
    const data: PersistentData = {
      messages: {},
      stats: {},
      lastCleanup: Date.now(),
    };

    // 获取所有消息 key
    const messageKeys = await this.redis.keys(`${this.MESSAGE_KEY_PREFIX}*`);
    for (const key of messageKeys) {
      const groupId = key.replace(this.MESSAGE_KEY_PREFIX, "");
      const messagesData = await this.redis.zrange(key, 0, -1);
      data.messages[groupId] = messagesData.map(
        (msg: string) => JSON.parse(msg) as GroupMessage
      );
    }

    // 获取所有统计 key
    const statsKeys = await this.redis.keys(`${this.STATS_KEY_PREFIX}*`);
    for (const key of statsKeys) {
      const groupDateKey = key.replace(this.STATS_KEY_PREFIX, "");
      const statsData = await this.redis.hgetall(key);
      const numericStats: Record<string, number> = {};
      for (const [userId, count] of Object.entries(statsData)) {
        numericStats[userId] = Number(count);
      }
      data.stats[groupDateKey] = numericStats;
    }

    return data;
  }

  /**
   * 清理超过一个月的数据
   */
  private async cleanOldData(): Promise<void> {
    const oneMonthAgo = Date.now() - this.ONE_MONTH_MS;

    // 清理消息数据
    const messageKeys = await this.redis.keys(`${this.MESSAGE_KEY_PREFIX}*`);
    for (const key of messageKeys) {
      await this.redis.zremrangebyscore(key, "-inf", oneMonthAgo);
    }

    // 清理统计数据
    const statsKeys = await this.redis.keys(`${this.STATS_KEY_PREFIX}*`);
    const oneMonthAgoDate = new Date(oneMonthAgo).toISOString().split("T")[0];

    for (const key of statsKeys) {
      const groupDateKey = key.replace(this.STATS_KEY_PREFIX, "");
      const [, dateStr] = groupDateKey.split(":");
      if (dateStr && dateStr < oneMonthAgoDate) {
        await this.redis.del(key);
      }
    }

    console.log(
      `Cleaned data older than ${new Date(oneMonthAgo).toISOString()}`
    );
  }

  /**
   * 检查是否需要清理旧数据（每天最多清理一次）
   */
  private async checkAndCleanOldData(): Promise<void> {
    try {
      const data = await this.loadDataFromFile();
      const lastCleanup = data.lastCleanup || 0;
      const oneDayMs = 24 * 60 * 60 * 1000;

      if (Date.now() - lastCleanup > oneDayMs) {
        await this.cleanOldData();
        // 更新最后清理时间
        const updatedData = await this.collectAllData();
        updatedData.lastCleanup = Date.now();
        await fs.writeFile(
          this.DATA_FILE_PATH,
          JSON.stringify(updatedData, null, 2),
          "utf8"
        );
      }
    } catch (error) {
      console.error("Error during cleanup check:", error);
    }
  }

  /**
   * 同步持久化数据并检查清理
   */
  private async persistAndMaintain(): Promise<void> {
    await this.persistDataToFile();
    await this.checkAndCleanOldData();
  }

  private createMessageKey(groupId: string): string {
    return `${this.MESSAGE_KEY_PREFIX}${groupId}`;
  }
  /**
   * 存储群聊消息
   */
  async saveMessage(message: GroupMessage): Promise<void> {
    // 确保服务已初始化
    if (!this.isInitialized) {
      await this.initialize();
    }

    const key = this.createMessageKey(message.group_id);
    const score = message.timestamp; // 使用时间戳作为分数，便于时间范围查询

    await this.redis
      .pipeline()
      .zadd(key, score, JSON.stringify(message))
      .expire(key, this.MESSAGE_EXPIRY)
      .exec();

    // 同步持久化到文件并维护数据
    await this.persistAndMaintain();
  }

  /**
   * 获取指定时间范围的群聊消息
   */
  async getMessagesByTimeRange(
    groupId: string,
    startTime: number,
    endTime: number
  ): Promise<GroupMessage[]> {
    // 确保服务已初始化
    if (!this.isInitialized) {
      await this.initialize();
    }

    const key = this.createMessageKey(groupId);
    const messages = await this.redis.zrangebyscore(key, startTime, endTime);

    return messages.map((msg) => JSON.parse(msg) as GroupMessage);
  }

  /**
   * 获取最近N条消息
   */
  async getRecentMessages(
    groupId: string,
    count: number = 100
  ): Promise<GroupMessage[]> {
    // 确保服务已初始化
    if (!this.isInitialized) {
      await this.initialize();
    }

    const key = this.createMessageKey(groupId);
    const messages = await this.redis.zrevrange(key, 0, count - 1);

    return messages.map((msg) => JSON.parse(msg) as GroupMessage);
  }

  /**
   * 增加用户消息计数（每日统计）
   */
  async incrementUserMessageCount(
    groupId: string,
    userId: string,
    date: string = new Date().toISOString().split("T")[0]
  ): Promise<void> {
    // 确保服务已初始化
    if (!this.isInitialized) {
      await this.initialize();
    }

    const key = `${this.STATS_KEY_PREFIX}${groupId}:${date}`;
    await this.redis.hincrby(key, userId, 1);
    await this.redis.expire(key, 60 * 60 * 24 * 30); // 30天过期

    // 同步持久化到文件并维护数据
    await this.persistAndMaintain();
  }

  /**
   * 获取指定日期的用户消息统计
   */
  async getUserMessageStats(
    groupId: string,
    date: string = new Date().toISOString().split("T")[0]
  ): Promise<Record<string, number>> {
    // 确保服务已初始化
    if (!this.isInitialized) {
      await this.initialize();
    }

    const key = `${this.STATS_KEY_PREFIX}${groupId}:${date}`;
    const stats = await this.redis.hgetall(key);

    // 将字符串值转换为数字
    const result: Record<string, number> = {};
    for (const [userId, count] of Object.entries(stats)) {
      result[userId] = Number(count);
    }

    return result;
  }

  /**
   * 获取群聊总消息数
   */
  async getGroupMessageCount(groupId: string): Promise<number> {
    // 确保服务已初始化
    if (!this.isInitialized) {
      await this.initialize();
    }

    const key = this.createMessageKey(groupId);
    return await this.redis.zcard(key);
  }

  /**
   * 清理过期消息（手动清理）
   */
  async cleanExpiredMessages(
    groupId: string,
    beforeTimestamp: number
  ): Promise<number> {
    // 确保服务已初始化
    if (!this.isInitialized) {
      await this.initialize();
    }

    const key = this.createMessageKey(groupId);
    const removed = await this.redis.zremrangebyscore(
      key,
      "-inf",
      beforeTimestamp
    );

    // 持久化更改
    await this.persistDataToFile();

    return removed;
  }

  /**
   * 手动触发数据清理和持久化
   */
  async forceCleanup(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    await this.cleanOldData();
    await this.persistDataToFile();
  }

  /**
   * 获取服务状态信息
   */
  getServiceInfo(): { initialized: boolean; dataFilePath: string } {
    return {
      initialized: this.isInitialized,
      dataFilePath: this.DATA_FILE_PATH,
    };
  }
}
