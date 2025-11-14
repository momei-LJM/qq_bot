import type { GroupMessage, MessageStorageService } from "./message-storage";
import { ConfigurableModel } from "langchain/chat_models/universal";

export interface UserStats {
  userId: string;
  userName?: string;
  messageCount: number;
}

export interface DailySummary {
  groupId: string;
  date: string;
  totalMessages: number;
  activeUsers: number;
  topUsers: UserStats[];
  summary: string; // AI 生成的总结
}

export class AnalyticsService {
  private storage: MessageStorageService;
  private model: ConfigurableModel;

  constructor(storage: MessageStorageService, model: ConfigurableModel) {
    this.storage = storage;
    this.model = model;
  }

  /**
   * 生成每日群聊总结
   */
  async generateDailySummary(
    groupId: string,
    date: string = new Date().toISOString().split("T")[0]
  ): Promise<DailySummary> {
    // 获取当日消息统计
    const stats = await this.storage.getUserMessageStats(groupId, date);
    const totalMessages = Object.values(stats).reduce(
      (sum, count) => sum + count,
      0
    );
    const activeUsers = Object.keys(stats).length;

    // 排序获取最活跃用户
    const topUsers: UserStats[] = Object.entries(stats)
      .map(([userId, count]) => ({
        userId,
        messageCount: count,
      }))
      .sort((a, b) => b.messageCount - a.messageCount)
      .slice(0, 10);

    // 获取当日消息内容用于AI总结
    const startTime = new Date(date).getTime();
    const endTime = startTime + 24 * 60 * 60 * 1000;
    const messages = await this.storage.getMessagesByTimeRange(
      groupId,
      startTime,
      endTime
    );

    // 生成 AI 总结
    const summary = await this.generateAISummary(messages);

    return {
      groupId,
      date,
      totalMessages,
      activeUsers,
      topUsers,
      summary,
    };
  }

  /**
   * 使用 AI 生成群聊内容总结
   */
  private async generateAISummary(messages: GroupMessage[]): Promise<string> {
    if (messages.length === 0) {
      return "今日暂无消息";
    }

    // 限制消息数量，避免 token 过多
    const limitedMessages = messages.slice(-100);
    const messageText = limitedMessages
      .map((msg) => `${msg.user_name}: ${msg.raw_message}`)
      .join("\n");

    try {
      const response = await this.model.invoke(
        [
          {
            role: "system",
            content:
              "你是一个群聊助手，负责总结今天的群聊内容。请用简洁、友好的语言概括主要话题、有趣的讨论点和整体氛围。不超过200字。",
          },
          {
            role: "user",
            content: `请总结以下群聊内容：\n\n${messageText}`,
          },
        ],
        {}
      );

      return (response.content as string) || "总结生成失败";
    } catch (error) {
      console.error("AI 总结生成失败:", error);
      return "AI 总结生成失败，请稍后重试";
    }
  }

  /**
   * 格式化统计报告为文本
   */
  formatSummaryReport(summary: DailySummary): string {
    const {
      date,
      totalMessages,
      activeUsers,
      topUsers,
      summary: aiSummary,
    } = summary;

    let report = `📊 群聊日报 - ${date}\n\n`;
    report += `📨 总消息数: ${totalMessages}\n`;
    report += `👥 活跃用户: ${activeUsers}\n\n`;

    if (topUsers.length > 0) {
      report += `🏆 发言排行榜:\n`;
      topUsers.forEach((user, index) => {
        report += `${index + 1}. ${user.userName || user.userId}: ${
          user.messageCount
        } 条\n`;
      });
      report += `\n`;
    }

    report += `💡 今日总结:\n${aiSummary}`;

    return report;
  }

  /**
   * 获取周报数据
   */
  async generateWeeklySummary(
    groupId: string,
    weekStartDate: string
  ): Promise<{
    totalMessages: number;
    dailyMessages: Record<string, number>;
    topUsers: UserStats[];
  }> {
    const dailyMessages: Record<string, number> = {};
    const userTotalMessages: Record<string, number> = {};

    // 统计7天数据
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStartDate);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];

      const stats = await this.storage.getUserMessageStats(groupId, dateStr);
      const dayTotal = Object.values(stats).reduce(
        (sum, count) => sum + count,
        0
      );

      dailyMessages[dateStr] = dayTotal;

      // 累计用户消息数
      for (const [userId, count] of Object.entries(stats)) {
        userTotalMessages[userId] = (userTotalMessages[userId] || 0) + count;
      }
    }

    const totalMessages = Object.values(dailyMessages).reduce(
      (sum, count) => sum + count,
      0
    );

    const topUsers: UserStats[] = Object.entries(userTotalMessages)
      .map(([userId, count]) => ({
        userId,
        messageCount: count,
      }))
      .sort((a, b) => b.messageCount - a.messageCount)
      .slice(0, 10);

    return {
      totalMessages,
      dailyMessages,
      topUsers,
    };
  }
}
