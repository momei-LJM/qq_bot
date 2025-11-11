import OpenAI, { ClientOptions } from "openai";
import { Bot, Client, ReceiverMode } from "qq-official-bot";
import { chatWithDeepSeek } from "./ai";
import { getRedisClient } from "../services/redis.js";
import { MessageStorageService } from "../services/message-storage.js";
import { AnalyticsService } from "../services/analytics.js";
import { DailySummaryJob } from "../jobs/daily-summary.js";
import { WeeklyStatsJob } from "../jobs/weekly-stats.js";
import { logger } from "@/utils/logger";
import { config } from "dotenv";
config();
const openAiConfig: ClientOptions = {
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
  maxRetries: 5,
};

const qBotConfig: Client.Config = {
  appid: process.env.APP_ID!, // QQ 机器人的 App ID
  secret: process.env.APP_SECRET!, // QQ 机器人的 App Secret
  sandbox: process.env.SANDBOX === "true", // 是否为沙箱环境
  removeAt: true, // 自动移除消息中的 @机器人
  logLevel: "info", // 日志级别
  maxRetry: 10, // 最大重连次数
  intents: [
    "GUILD_MESSAGES", // 频道消息事件
    "GUILD_MESSAGE_REACTIONS", // 频道消息表态事件
    "DIRECT_MESSAGE", // 频道私信事件
    "GROUP_AT_MESSAGE_CREATE", // 群聊@消息事件
    "C2C_MESSAGE_CREATE", // 私聊消息事件
  ],
  mode: ReceiverMode.WEBSOCKET, // WebSocket 连接模式
};

export const bootstrap = () => {
  logger.debug(JSON.stringify(process.env.DEEPSEEK_API_KEY));
  const openai = new OpenAI(openAiConfig);
  const bot = new Bot(qBotConfig);
  // 初始化 Redis 和服务
  const redis = getRedisClient();
  const messageStorage = new MessageStorageService(redis);
  const analytics = new AnalyticsService(messageStorage, openai);

  // 配置需要统计的群组（从环境变量读取）
  const trackGroupIds = process.env.TRACK_GROUP_IDS?.split(",") || [];

  // 启动定时任务
  const dailySummaryJob = new DailySummaryJob(analytics, bot, trackGroupIds);
  dailySummaryJob.start();

  const weeklyStatsJob = new WeeklyStatsJob(analytics, bot, trackGroupIds);
  weeklyStatsJob.start();

  // 监听群消息
  bot.on("message.group", async (event) => {
    console.log("收到群消息:", event.raw_message);
    console.log("群 ID:", event.group_id);
    console.log("发送者:", event.sender.user_id);

    // 存储消息到 Redis
    await messageStorage.saveMessage({
      message_id: event.message_id,
      group_id: event.group_id,
      user_id: event.sender.user_id,
      user_name: event.sender.user_name,
      raw_message: event.raw_message,
      timestamp: Date.now(),
    });

    // 增加用户消息计数
    await messageStorage.incrementUserMessageCount(
      event.group_id,
      event.sender.user_id
    );

    // 调用 DeepSeek AI 生成回复
    const aiResponse = await chatWithDeepSeek(openai, event.raw_message);
    await event.reply(aiResponse);
  });

  // 监听群消息中的@机器人（已合并到上面的消息处理中）

  // 添加命令：手动触发日报
  bot.on("message.group", async (event) => {
    if (
      event.raw_message.trim() === "/日报" ||
      event.raw_message.trim() === "/summary"
    ) {
      try {
        const today = new Date().toISOString().split("T")[0];
        const summary = await analytics.generateDailySummary(
          event.group_id,
          today
        );
        const report = analytics.formatSummaryReport(summary);
        await event.reply(report);
      } catch (error) {
        console.error("生成日报失败:", error);
        await event.reply("生成日报失败，请稍后重试");
      }
    }
  });

  // 添加命令：查看群聊统计
  bot.on("message.group", async (event) => {
    if (
      event.raw_message.trim() === "/统计" ||
      event.raw_message.trim() === "/stats"
    ) {
      try {
        const today = new Date().toISOString().split("T")[0];
        const stats = await messageStorage.getUserMessageStats(
          event.group_id,
          today
        );
        const totalMessages = Object.values(stats).reduce(
          (sum, count) => sum + count,
          0
        );

        let reply = `📊 今日群聊统计\n\n`;
        reply += `总消息数: ${totalMessages}\n`;
        reply += `活跃用户: ${Object.keys(stats).length}\n`;

        await event.reply(reply);
      } catch (error) {
        console.error("获取统计失败:", error);
        await event.reply("获取统计失败，请稍后重试");
      }
    }
  });

  // 启动机器人
  bot.start();
};
