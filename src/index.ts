import {
  createOpenAPI,
  createWebsocket,
  AvailableIntentsEventsEnum,
} from "qq-guild-bot";
import { config } from "dotenv";

config();

const testConfig = {
  appID: process.env.APP_ID || "APPID", // 从环境变量读取
  token: process.env.TOKEN || "TOKEN",
  intents: [AvailableIntentsEventsEnum.PUBLIC_GUILD_MESSAGES],
  sandbox: process.env.SANDBOX === "true" || false,
};

// 创建 client
const client = createOpenAPI(testConfig);

// 创建 websocket 连接
const ws = createWebsocket(testConfig);
