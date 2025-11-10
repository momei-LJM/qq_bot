import { Bot, ReceiverMode } from "qq-official-bot";
import { config } from "dotenv";

config();

const bot = new Bot({
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
});

// 监听群消息
bot.on("message.group", async (event) => {
  console.log("收到群消息:", event.raw_message);
  console.log("群 ID:", event.group_id);
  console.log("发送者:", event.sender.user_name);

  // 自动回复
  await event.reply("在座的各位都是沙雕");
});

// 监听群消息中的@机器人
bot.on("message.group", async (event) => {
  if (event.raw_message.includes(`@${bot.self_id}`)) {
    await event.reply("有人@我了!");
  }
});

// 启动机器人
bot.start();
