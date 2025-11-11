import cron from "node-cron";
import type { AnalyticsService } from "../services/analytics";
import type { Bot } from "qq-official-bot";

export class WeeklyStatsJob {
  private analytics: AnalyticsService;
  private bot: Bot;
  private groupIds: string[];

  constructor(analytics: AnalyticsService, bot: Bot, groupIds: string[] = []) {
    this.analytics = analytics;
    this.bot = bot;
    this.groupIds = groupIds;
  }

  /**
   * 启动定时任务 - 每周一早上 9:00 发送周报
   */
  start() {
    // Cron 表达式: 0 0 9 * * 1 = 每周一 09:00:00
    cron.schedule("0 0 9 * * 1", async () => {
      console.log("⏰ 开始生成每周群聊统计...");
      await this.runWeeklyStats();
    });

    console.log("✅ 每周群聊统计任务已启动 (每周一 09:00)");
  }

  /**
   * 手动触发周报
   */
  async runWeeklyStats() {
    // 获取上周一的日期
    const now = new Date();
    const lastMonday = new Date(now);
    lastMonday.setDate(now.getDate() - now.getDay() - 6);
    const weekStartDate = lastMonday.toISOString().split("T")[0];

    for (const groupId of this.groupIds) {
      try {
        const stats = await this.analytics.generateWeeklySummary(
          groupId,
          weekStartDate
        );
        const report = this.formatWeeklyReport(stats, weekStartDate);

        await this.bot.sendGroupMessage(groupId, report);
        console.log(`✅ 已发送周报到群组: ${groupId}`);
      } catch (error) {
        console.error(`❌ 生成/发送周报失败 (群组: ${groupId}):`, error);
      }
    }
  }

  /**
   * 格式化周报
   */
  private formatWeeklyReport(
    stats: {
      totalMessages: number;
      dailyMessages: Record<string, number>;
      topUsers: Array<{ userId: string; messageCount: number }>;
    },
    weekStartDate: string
  ): string {
    const weekEnd = new Date(weekStartDate);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEndDate = weekEnd.toISOString().split("T")[0];

    let report = `📈 群聊周报 - ${weekStartDate} 至 ${weekEndDate}\n\n`;
    report += `📊 本周总消息数: ${stats.totalMessages}\n\n`;

    report += `📅 每日消息统计:\n`;
    for (const [date, count] of Object.entries(stats.dailyMessages)) {
      const day = new Date(date).toLocaleDateString("zh-CN", {
        weekday: "short",
      });
      report += `${day} ${date}: ${count} 条\n`;
    }
    report += `\n`;

    if (stats.topUsers.length > 0) {
      report += `🏆 本周发言排行榜:\n`;
      stats.topUsers.forEach((user, index) => {
        report += `${index + 1}. ${user.userId}: ${user.messageCount} 条\n`;
      });
    }

    return report;
  }

  addGroup(groupId: string) {
    if (!this.groupIds.includes(groupId)) {
      this.groupIds.push(groupId);
    }
  }

  removeGroup(groupId: string) {
    this.groupIds = this.groupIds.filter((id) => id !== groupId);
  }
}
