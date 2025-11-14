import { config } from "dotenv";
import { ClientOptions } from "openai";
import { Client, ReceiverMode } from "qq-official-bot";

config();
export const openAiConfig: ClientOptions = {
  apiKey: process.env.DOUBAO_API_KEY,
  baseURL: process.env.BASE_URL,
  maxRetries: 5,
};

export const qBotConfig: Client.Config = {
  appid: process.env.APP_ID!, // QQ 机器人的 App ID
  secret: process.env.APP_SECRET!, // QQ 机器人的 App Secret
  sandbox: process.env.SANDBOX === "true", // 是否为沙箱环境
  removeAt: true, // 自动移除消息中的 @机器人
  logLevel: "info", // 日志级别
  maxRetry: 10, // 最大重连次数
  intents: [
    "GROUP_AT_MESSAGE_CREATE", // 群聊@消息事件
    "C2C_MESSAGE_CREATE", // 私聊消息事件
    "GROUP_MESSAGE_CREATE", // 群聊消息事件
  ],
  mode: ReceiverMode.WEBSOCKET, // WebSocket 连接模式
};
