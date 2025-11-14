import OpenAI from "openai";
import { SYSTEMS } from "./systems";
import type { MessageStorageService } from "../services/message-storage";
import dayjs from "dayjs";
import { BOTID } from "./bootstrap";
import { GroupMessageEvent } from "qq-official-bot";
import { saveMsgImmidiately } from "./handlers";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function chat(
  openai: OpenAI,
  message: string,
  messageStorage: MessageStorageService,
  qBotEvent: GroupMessageEvent,
  historyMessages?: ChatMessage[]
) {
  try {
    const messages: any[] = [...SYSTEMS];
    if (historyMessages?.length) {
      messages.push(...historyMessages);
    }
    // 添加当前用户消息
    messages.push({
      role: "user",
      content: message,
    });

    const aiResponse = await openai.chat.completions.create({
      model: "doubao-seed-1-6-lite-251015",
      messages,
      temperature: 0.7,
      max_tokens: 2000,
      reasoning_effort: "minimal",
    });
    const responseMessage =
      aiResponse.choices[0]?.message?.content || "抱歉,我暂时无法回复。";
    await saveMsgImmidiately(messageStorage, {
      ...qBotEvent,
      sender: {
        ...qBotEvent.sender,
        user_name: "qq机器人",
        user_id: BOTID,
      },
      raw_message: responseMessage,
    } as GroupMessageEvent);

    return responseMessage;
  } catch (error) {
    console.error("API 调用失败:", error);
    return "抱歉,我遇到了一些问题,请稍后再试。";
  }
}

/**
 * 带历史上下文的 DeepSeek 聊天函数
 * 自动从消息存储中获取最近的对话历史
 */
export async function chatWithContext(
  openai: OpenAI,
  qBotEvent: GroupMessageEvent,
  messageStorage: MessageStorageService,
  contextCount: number = 20
): Promise<string> {
  const groupId = qBotEvent.group_id;
  const message = qBotEvent.raw_message;
  try {
    // 获取最近的消息作为上下文
    const recentMessages = (
      await messageStorage.getRecentMessages(groupId, contextCount)
    ).map((i) => ({
      userId: i.user_id,
      raw_message: i.raw_message,
      userName: i.user_name,
      createTime: dayjs(i.timestamp).format("YYYY-MM-DD HH:mm:ss"),
    }));

    // 转换为对话格式，只保留相关的用户对话
    const historyMessages: ChatMessage[] = [];

    for (const msg of recentMessages.reverse()) {
      // 跳过系统消息和太长的消息
      if (msg.raw_message.length > 500) continue;
      historyMessages.push({
        role: msg.userId === BOTID ? "assistant" : "user",
        content: JSON.stringify(msg),
      });
    }

    // 限制历史消息数量
    const limitedHistory = historyMessages.slice(-contextCount);
    // 保存当前用户消息
    await saveMsgImmidiately(messageStorage, qBotEvent);
    return await chat(
      openai,
      message,
      messageStorage,
      qBotEvent,
      limitedHistory
    );
  } catch (error) {
    console.error("获取历史上下文失败，使用无上下文模式:", error);
    // 如果获取历史失败，回退到无上下文模式
    return await chat(openai, message, messageStorage, qBotEvent);
  }
}
