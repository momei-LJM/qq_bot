import cron from "node-cron";
import type { AnalyticsService } from "../services/analytics";
import type { Bot } from "qq-official-bot";

export class DailySummaryJob {
  private analytics: AnalyticsService;
  private bot: Bot;
  private groupIds: string[]; // 需要统计的群组ID列表

  constructor(analytics: AnalyticsService, bot: Bot, groupIds: string[] = []) {
    this.analytics = analytics;
    this.bot = bot;
    this.groupIds = groupIds;
  }

  /**
   * 启动定时任务 - 每天晚上 21:00 发送日报
   */
  start() {
    // Cron 表达式: 秒 分 时 日 月 周
    // 0 0 17 * * * = 每天 17:00:00
    cron.schedule("0 0 17 * * *", async () => {
      console.log("⏰ 开始生成每日群聊总结...");
      await this.runDailySummary();
    });

    console.log("✅ 每日群聊总结任务已启动 (每天 17:00)");
  }

  /**
   * 手动触发每日总结
   */
  async runDailySummary() {
    const today = new Date().toISOString().split("T")[0];

    for (const groupId of this.groupIds) {
      try {
        // 生成总结
        const summary = await this.analytics.generateDailySummary(
          groupId,
          today
        );
        const report = this.analytics.formatSummaryReport(summary);

        // 发送到群聊
        await this.bot.sendGroupMessage(groupId, report);
        console.log(`✅ 已发送日报到群组: ${groupId}`);
      } catch (error) {
        console.error(`❌ 生成/发送日报失败 (群组: ${groupId}):`, error);
      }
    }
  }

  /**
   * 添加群组到统计列表
   */
  addGroup(groupId: string) {
    if (!this.groupIds.includes(groupId)) {
      this.groupIds.push(groupId);
    }
  }

  /**
   * 移除群组
   */
  removeGroup(groupId: string) {
    this.groupIds = this.groupIds.filter((id) => id !== groupId);
  }
}
