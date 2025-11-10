import { Bot, ReceiverMode } from "qq-official-bot";
import { config } from "dotenv";

//#region src/index.ts
config();
const bot = new Bot({
	appid: process.env.APP_ID,
	secret: process.env.APP_SECRET,
	sandbox: process.env.SANDBOX === "true",
	removeAt: true,
	logLevel: "info",
	maxRetry: 10,
	intents: [
		"GUILD_MESSAGES",
		"GUILD_MESSAGE_REACTIONS",
		"DIRECT_MESSAGE",
		"GROUP_AT_MESSAGE_CREATE",
		"C2C_MESSAGE_CREATE"
	],
	mode: ReceiverMode.WEBSOCKET
});
bot.on("message.group", async (event) => {
	console.log("收到群消息:", event.raw_message);
	console.log("群 ID:", event.group_id);
	console.log("发送者:", event.sender.user_name);
	await event.reply("在座的各位都是沙雕");
});
bot.on("message.group", async (event) => {
	if (event.raw_message.includes(`@${bot.self_id}`)) await event.reply("有人@我了!");
});
bot.start();

//#endregion
export {  };