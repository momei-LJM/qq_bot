import OpenAI from "openai";
import { Bot } from "qq-official-bot";
import { chatWithContext } from "./ai";
import { getRedisClient } from "../services/redis.js";
import { MessageStorageService } from "../services/message-storage.js";
import { logger } from "@/utils/logger";
import { gracefulShutdown, saveMsgImmidiately } from "./handlers";
import { openAiConfig, qBotConfig } from "./config";
export const BOTID = "qqBot";

export const bootstrap = async () => {
  logger.debug(JSON.stringify(process.env.DEEPSEEK_API_KEY));
  const openai = new OpenAI(openAiConfig);
  const bot = new Bot(qBotConfig);

  const redis = getRedisClient();
  const messageStorage = new MessageStorageService(redis);

  // 初始化消息存储服务（从 JSON 文件加载数据）
  await messageStorage.initialize();
  logger.info("Message storage service initialized");
  // 监听群消息
  bot.on("message.group", async (event) => {
    logger.table({
      "群 ID": event.group_id,
      消息内容: event.raw_message,
      发送者: event.sender.user_id,
    });

    const aiResponse = await chatWithContext(
      openai,
      event,
      messageStorage,
      10 // 获取最近10条相关消息作为上下文
    );
    await event.reply({
      type: "text",
      data: {
        text: aiResponse,
      },
    });
  });

  // 启动机器人
  bot.start();

  // 监听关闭信号
  const shutdownHandler = () => gracefulShutdown(messageStorage, redis);
  process.on("SIGINT", shutdownHandler);
  process.on("SIGTERM", shutdownHandler);
  process.on("SIGQUIT", shutdownHandler);
};
