import type { MemoryStorage } from "./memory-storage";

export interface GroupMessage {
  message_id: string;
  group_id: string;
  user_id: string;
  user_name: string;
  raw_message: string;
  timestamp: number;
}

export class MessageStorageService {
  private redis: MemoryStorage;
  private readonly MESSAGE_KEY_PREFIX = "qq:group:messages:";
  private readonly STATS_KEY_PREFIX = "qq:group:stats:";
  private readonly MESSAGE_EXPIRY = 60 * 60 * 24 * 7; // 7天过期

  constructor(redis: MemoryStorage) {
    this.redis = redis;
  }

  private createMessageKey(groupId: string): string {
    return `${this.MESSAGE_KEY_PREFIX}${groupId}`;
  }
  /**
   * 存储群聊消息
   */
  async saveMessage(message: GroupMessage): Promise<void> {
    const key = this.createMessageKey(message.group_id);
    const score = message.timestamp; // 使用时间戳作为分数，便于时间范围查询

    await this.redis
      .pipeline()
      .zadd(key, score, JSON.stringify(message))
      .expire(key, this.MESSAGE_EXPIRY)
      .exec();
  }

  /**
   * 获取指定时间范围的群聊消息
   */
  async getMessagesByTimeRange(
    groupId: string,
    startTime: number,
    endTime: number
  ): Promise<GroupMessage[]> {
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
    const key = `${this.STATS_KEY_PREFIX}${groupId}:${date}`;
    await this.redis.hincrby(key, userId, 1);
    await this.redis.expire(key, 60 * 60 * 24 * 30); // 30天过期
  }

  /**
   * 获取指定日期的用户消息统计
   */
  async getUserMessageStats(
    groupId: string,
    date: string = new Date().toISOString().split("T")[0]
  ): Promise<Record<string, number>> {
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
    const key = this.createMessageKey(groupId);
    return await this.redis.zremrangebyscore(key, "-inf", beforeTimestamp);
  }
}
