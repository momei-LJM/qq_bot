import { logger } from "@/utils/logger";

/**
 * 简版内存存储实现，用于替换Redis
 * 支持常用的Redis命令接口
 */
export class MemoryStorage {
  // 有序集合存储 (Sorted Sets)
  private zsets: Map<string, Map<string, number>> = new Map();
  // 哈希表存储 (Hashes)
  private hashes: Map<string, Map<string, string>> = new Map();
  // 过期时间记录
  private expiries: Map<string, number> = new Map();
  // 清理过期数据的定时器
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // 每分钟清理一次过期数据
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredKeys();
    }, 60 * 1000);
  }

  /**
   * 清理过期的键
   */
  private cleanupExpiredKeys(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, expireTime] of this.expiries.entries()) {
      if (expireTime <= now) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.zsets.delete(key);
      this.hashes.delete(key);
      this.expiries.delete(key);
    }

    if (expiredKeys.length > 0) {
      logger.info(`清理了 ${expiredKeys.length} 个过期键`);
    }
  }

  /**
   * 检查键是否已过期
   */
  private isExpired(key: string): boolean {
    const expireTime = this.expiries.get(key);
    if (expireTime && expireTime <= Date.now()) {
      this.zsets.delete(key);
      this.hashes.delete(key);
      this.expiries.delete(key);
      return true;
    }
    return false;
  }

  /**
   * 设置键的过期时间（秒）
   */
  async expire(key: string, seconds: number): Promise<number> {
    this.expiries.set(key, Date.now() + seconds * 1000);
    return 1;
  }

  /**
   * 添加成员到有序集合
   */
  async zadd(key: string, score: number, member: string): Promise<number> {
    if (this.isExpired(key)) {
      this.zsets.delete(key);
    }

    if (!this.zsets.has(key)) {
      this.zsets.set(key, new Map());
    }

    const zset = this.zsets.get(key)!;
    const isNew = !zset.has(member);
    zset.set(member, score);

    return isNew ? 1 : 0;
  }

  /**
   * 根据分数范围获取有序集合成员
   */
  async zrangebyscore(
    key: string,
    min: number | string,
    max: number | string
  ): Promise<string[]> {
    if (this.isExpired(key)) {
      return [];
    }

    const zset = this.zsets.get(key);
    if (!zset) {
      return [];
    }

    const minScore = typeof min === "string" ? Number(min) : min;
    const maxScore = typeof max === "string" ? Number(max) : max;

    return Array.from(zset.entries())
      .filter(([_, score]) => score >= minScore && score <= maxScore)
      .sort((a, b) => a[1] - b[1])
      .map(([member]) => member);
  }

  /**
   * 按分数倒序获取有序集合成员（指定范围）
   */
  async zrevrange(key: string, start: number, stop: number): Promise<string[]> {
    if (this.isExpired(key)) {
      return [];
    }

    const zset = this.zsets.get(key);
    if (!zset) {
      return [];
    }

    const sorted = Array.from(zset.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([member]) => member);

    return sorted.slice(start, stop + 1);
  }

  /**
   * 获取有序集合的成员数量
   */
  async zcard(key: string): Promise<number> {
    if (this.isExpired(key)) {
      return 0;
    }

    const zset = this.zsets.get(key);
    return zset ? zset.size : 0;
  }

  /**
   * 删除有序集合中分数在指定范围内的成员
   */
  async zremrangebyscore(
    key: string,
    min: number | string,
    max: number | string
  ): Promise<number> {
    if (this.isExpired(key)) {
      return 0;
    }

    const zset = this.zsets.get(key);
    if (!zset) {
      return 0;
    }

    const minScore =
      typeof min === "string" && min === "-inf"
        ? -Infinity
        : typeof min === "string"
        ? Number(min)
        : min;
    const maxScore =
      typeof max === "string" && max === "+inf"
        ? Infinity
        : typeof max === "string"
        ? Number(max)
        : max;

    let removed = 0;
    for (const [member, score] of zset.entries()) {
      if (score >= minScore && score <= maxScore) {
        zset.delete(member);
        removed++;
      }
    }

    return removed;
  }

  /**
   * 哈希表字段值增加
   */
  async hincrby(
    key: string,
    field: string,
    increment: number
  ): Promise<number> {
    if (this.isExpired(key)) {
      this.hashes.delete(key);
    }

    if (!this.hashes.has(key)) {
      this.hashes.set(key, new Map());
    }

    const hash = this.hashes.get(key)!;
    const currentValue = Number(hash.get(field) || 0);
    const newValue = currentValue + increment;
    hash.set(field, String(newValue));

    return newValue;
  }

  /**
   * 获取哈希表所有字段和值
   */
  async hgetall(key: string): Promise<Record<string, string>> {
    if (this.isExpired(key)) {
      return {};
    }

    const hash = this.hashes.get(key);
    if (!hash) {
      return {};
    }

    const result: Record<string, string> = {};
    for (const [field, value] of hash.entries()) {
      result[field] = value;
    }

    return result;
  }

  /**
   * 支持pipeline模式（简化实现，立即执行所有命令）
   */
  pipeline(): PipelineExecutor {
    return new PipelineExecutor(this);
  }

  /**
   * 模拟quit方法
   */
  async quit(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    logger.info("内存存储已关闭");
  }

  /**
   * 获取存储统计信息
   */
  getStats(): { zsets: number; hashes: number; expiries: number } {
    return {
      zsets: this.zsets.size,
      hashes: this.hashes.size,
      expiries: this.expiries.size,
    };
  }
}

/**
 * Pipeline执行器（简化实现）
 */
class PipelineExecutor {
  private commands: Array<() => Promise<any>> = [];

  constructor(private storage: MemoryStorage) {}

  zadd(key: string, score: number, member: string): this {
    this.commands.push(() => this.storage.zadd(key, score, member));
    return this;
  }

  expire(key: string, seconds: number): this {
    this.commands.push(() => this.storage.expire(key, seconds));
    return this;
  }

  async exec(): Promise<Array<[Error | null, any]>> {
    const results: Array<[Error | null, any]> = [];

    for (const command of this.commands) {
      try {
        const result = await command();
        results.push([null, result]);
      } catch (error) {
        results.push([error as Error, null]);
      }
    }

    return results;
  }
}
